from fastapi import APIRouter, Depends, HTTPException, status
from app.core.db import get_database
from app.models.project import ProjectCreate, ProjectResponse, ProjectInDB
from app.api.deps import get_current_user, check_manager_role
from bson import ObjectId
from typing import List, Optional
from datetime import datetime
import random
import string

from app.services.activity_log import log_activity
from app.services.agents.workflow_service import reassign_project_tasks
from app.services.email_service import send_project_assignment_email
import asyncio

router = APIRouter()

async def populate_project_info(project: dict, db):
    # Populate lead info
    if project.get("lead_id") and ObjectId.is_valid(project["lead_id"]):
        lead = await db["users"].find_one({"_id": ObjectId(project["lead_id"])})
        if lead:
            lead["id"] = str(lead.pop("_id"))
            lead.pop("hashed_password", None)
            project["lead_info"] = lead
            
    # Populate team members info
    members_info = []
    if project.get("team_members"):
        member_ids = [ObjectId(m_id) for m_id in project["team_members"] if ObjectId.is_valid(m_id)]
        if member_ids:
            members_cursor = db["users"].find({"_id": {"$in": member_ids}})
            async for member in members_cursor:
                member["id"] = str(member.pop("_id"))
                member.pop("hashed_password", None)
                members_info.append(member)
    project["team_members_info"] = members_info
    
    # Populate latest specification
    spec = await db["specifications"].find_one(
        {"project_id": project["id"]},
        sort=[("created_at", -1)]
    )
    if spec:
        spec["id"] = str(spec.pop("_id"))
        project["specification"] = spec
        
    # Populate tasks info
    tasks_cursor = db["tasks"].find({"project_id": project["id"]})
    tasks = await tasks_cursor.to_list(length=None)
    
    total_tasks = len(tasks)
    done_tasks = len([t for t in tasks if t.get("status") == "DONE"])
    
    project["stats"] = {
        "total_tasks": total_tasks,
        "done_tasks": done_tasks
    }
        
    return project

@router.post("/", response_model=ProjectResponse)
async def create_project(project: ProjectCreate, current_user: dict = Depends(check_manager_role)):
    db = get_database()
    project_dict = project.model_dump()
    project_dict["created_at"] = datetime.utcnow()
    if "team_members" not in project_dict:
        project_dict["team_members"] = []
    
    if "readable_id" not in project_dict or not project_dict["readable_id"]:
        project_dict["readable_id"] = "PRJ-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
        
    if not project_dict.get("lead_id") and current_user:
        project_dict["lead_id"] = str(current_user.get("_id") or current_user.get("id"))
        
    result = await db["projects"].insert_one(project_dict)
    
    created_project = await db["projects"].find_one({"_id": result.inserted_id})
    created_project["id"] = str(created_project.pop("_id"))
    
    # Log activity
    await log_activity(db, "PROJECT_CREATED", created_project["id"], created_project["name"], current_user)

    # ── Notify all assigned team members by email (non-blocking) ──
    team_members = created_project.get("team_members", [])
    if team_members:
        manager_name = current_user.get("full_name") or current_user.get("email") or "Le Manager"
        proj_name = created_project.get("name", "Nouveau Projet")
        proj_desc = created_project.get("description", "")
        proj_deadline = str(created_project.get("timeline_end") or created_project.get("deadline") or "")

        async def _notify_members():
            from app.api.endpoints.auth import push_notification
            for member_id in team_members:
                try:
                    if not ObjectId.is_valid(member_id):
                        continue
                        
                    # 1. In-app Notification
                    await push_notification(
                        db=db,
                        user_id=member_id,
                        title="Nouveau Projet",
                        message=f"Vous avez été assigné au projet : {proj_name}",
                        urgency="HIGH"
                    )
                    
                    # 2. Email Notification
                    member = await db["users"].find_one({"_id": ObjectId(member_id)})
                    if member and member.get("email"):
                        send_project_assignment_email(
                            to_email=member["email"],
                            member_name=member.get("full_name") or member.get("email"),
                            project_name=proj_name,
                            project_description=proj_desc,
                            deadline=proj_deadline,
                            manager_name=manager_name,
                        )
                except Exception as e:
                    print(f"[NOTIFY] Error notifying member {member_id}: {e}")

        asyncio.create_task(_notify_members())

    return await populate_project_info(created_project, db)

@router.get("/", response_model=List[ProjectResponse])
async def list_projects(current_user: dict = Depends(get_current_user)):
    db = get_database()
    query = {}
    if current_user.get("role") != "PROJECT_MANAGER":
        query = {"$or": [{"team_members": str(current_user["_id"])}, {"lead_id": str(current_user["_id"])}]}
    projects_cursor = db["projects"].find(query)
    projects = await projects_cursor.to_list(length=100)
    for p in projects:
        p["id"] = str(p.pop("_id"))
        if "created_at" not in p:
            p["created_at"] = datetime.utcnow()
        await populate_project_info(p, db)
    return projects

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    project = await db["projects"].find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if current_user.get("role") != "PROJECT_MANAGER":
        member_id = str(current_user["_id"])
        if member_id not in project.get("team_members", []) and member_id != project.get("lead_id"):
            raise HTTPException(status_code=403, detail="Not authorized to view this project")
            
    project["id"] = str(project.pop("_id"))
    if "created_at" not in project:
        project["created_at"] = datetime.utcnow()
    return await populate_project_info(project, db)

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, project_update: dict, current_user: dict = Depends(check_manager_role)):
    db = get_database()
    # Remove fields that shouldn't be updated directly via this endpoint if needed
    update_data = {k: v for k, v in project_update.items() if k in ["name", "description", "status", "lead_id", "team_members", "progress_percentage", "timeline_end", "archived"]}
    
    result = await db["projects"].update_one(
        {"_id": ObjectId(project_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
        
    updated_project = await db["projects"].find_one({"_id": ObjectId(project_id)})
    updated_project["id"] = str(updated_project.pop("_id"))
    return await populate_project_info(updated_project, db)

@router.post("/{project_id}/members", response_model=ProjectResponse)
async def add_project_member(project_id: str, member_data: dict, current_user: dict = Depends(check_manager_role)):
    db = get_database()
    member_id = member_data.get("user_id")
    if not member_id:
        raise HTTPException(status_code=400, detail="user_id is required")
        
    result = await db["projects"].update_one(
        {"_id": ObjectId(project_id)},
        {"$addToSet": {"team_members": member_id}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
        
    updated_project = await db["projects"].find_one({"_id": ObjectId(project_id)})
    
    # Notify new member
    from app.api.endpoints.auth import push_notification
    if updated_project and ObjectId.is_valid(member_id):
        await push_notification(
            db=db,
            user_id=member_id,
            title="Nouveau Projet",
            message=f"Vous avez été ajouté au projet : {updated_project.get('name', 'Inconnu')}",
            urgency="HIGH"
        )
        
    updated_project["id"] = str(updated_project.pop("_id"))
    return await populate_project_info(updated_project, db)

@router.delete("/{project_id}/members/{user_id}", response_model=ProjectResponse)
async def delete_project_member(project_id: str, user_id: str, current_user: dict = Depends(check_manager_role)):
    db = get_database()
    
    result = await db["projects"].update_one(
        {"_id": ObjectId(project_id)},
        {"$pull": {"team_members": user_id}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
        
    updated_project = await db["projects"].find_one({"_id": ObjectId(project_id)})
    updated_project["id"] = str(updated_project.pop("_id"))
    return await populate_project_info(updated_project, db)

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: str, current_user: dict = Depends(check_manager_role)):
    db = get_database()
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
        
    # Get project name before deletion
    project = await db["projects"].find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    p_name = project["name"]
    
    # Delete the project
    result = await db["projects"].delete_one({"_id": ObjectId(project_id)})
    
    # Log activity
    await log_activity(db, "PROJECT_DELETED", project_id, p_name, current_user)
    
    # Delete associated tasks
    await db["tasks"].delete_many({"project_id": project_id})
    
    # Delete associated specifications
    await db["specifications"].delete_many({"project_id": project_id})
    
    return None

@router.post("/{project_id}/reassign", response_model=dict)
async def trigger_reassign_tasks(project_id: str, current_user: dict = Depends(check_manager_role)):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    result_msg = await reassign_project_tasks(project_id)
    
    # Log activity
    db = get_database()
    project = await db["projects"].find_one({"_id": ObjectId(project_id)})
    if project:
        await log_activity(db, "PROJECT_UPDATED", project_id, project["name"], current_user, details=result_msg)
        
    return {"message": result_msg}

@router.post("/{project_id}/archive", response_model=ProjectResponse)
async def archive_project(project_id: str, current_user: dict = Depends(check_manager_role)):
    db = get_database()
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    result = await db["projects"].update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"archived": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project = await db["projects"].find_one({"_id": ObjectId(project_id)})
    project["id"] = str(project.pop("_id"))
    await log_activity(db, "PROJECT_ARCHIVED", project_id, project["name"], current_user)
    return await populate_project_info(project, db)

@router.post("/{project_id}/unarchive", response_model=ProjectResponse)
async def unarchive_project(project_id: str, current_user: dict = Depends(check_manager_role)):
    db = get_database()
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    result = await db["projects"].update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"archived": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project = await db["projects"].find_one({"_id": ObjectId(project_id)})
    project["id"] = str(project.pop("_id"))
    await log_activity(db, "PROJECT_UNARCHIVED", project_id, project["name"], current_user)
    return await populate_project_info(project, db)

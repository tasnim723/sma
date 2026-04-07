from fastapi import APIRouter, Depends, HTTPException, status
from app.core.db import get_database
from app.models.task import TaskCreate, TaskResponse, TaskInDB
from app.api.deps import get_current_user, check_manager_role
from bson import ObjectId
from typing import List, Optional
from app.services.activity_log import log_activity
from datetime import datetime

router = APIRouter()

@router.post("/", response_model=TaskResponse)
async def create_task(task: TaskCreate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    task_dict = task.model_dump()
    
    # User requirement: Default is BACKLOG, BACKLOG -> TODO if assigned
    if task_dict.get("status") == "BACKLOG" and any(aid for aid in task_dict.get("assignee_ids", [])):
        task_dict["status"] = "TODO"

    result = await db["tasks"].insert_one(task_dict)
    
    created_task = await db["tasks"].find_one({"_id": result.inserted_id})
    created_task["_id"] = str(created_task["_id"])
    
    # Log activity
    await log_activity(db, "TASK_CREATED", created_task["_id"], created_task["title"], current_user, details=f"Project: {created_task['project_id']}")
    
    return created_task

@router.get("/project/{project_id}", response_model=List[TaskResponse])
async def list_tasks_by_project(project_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    # Added is_valid check for project_id
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    tasks_cursor = db["tasks"].find({"project_id": project_id})
    tasks = await tasks_cursor.to_list(length=100)
    for t in tasks:
        t["_id"] = str(t["_id"])
    return tasks

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, task_update: dict, current_user: dict = Depends(get_current_user)):
    db = get_database()
    from datetime import datetime
    
    # Remove id if present in update
    task_update.pop("id", None)
    task_update.pop("_id", None)
    task_update["updated_at"] = datetime.utcnow()
    
    if not ObjectId.is_valid(task_id):
        raise HTTPException(status_code=400, detail="Invalid task ID")
        
    current_task = await db["tasks"].find_one({"_id": ObjectId(task_id)})
    if not current_task:
        raise HTTPException(status_code=404, detail="Task not found")
        
        
    if "attachments" in task_update and task_update["attachments"] != current_task.get("attachments", []):
        if str(current_user["_id"]) not in current_task.get("assignee_ids", []):
            raise HTTPException(status_code=403, detail="Vous ne pouvez pas ajouter de livrables à une tâche pour laquelle vous n'êtes pas assigné.")

    if current_user.get("role") != "PROJECT_MANAGER":
        if str(current_user["_id"]) not in current_task.get("assignee_ids", []):
            raise HTTPException(status_code=403, detail="Not authorized to modify this task")
        allowed_keys = {"attachments", "status"}
        for k in list(task_update.keys()):
            if k not in allowed_keys:
                task_update.pop(k, None)
        
    result = await db["tasks"].update_one(
        {"_id": ObjectId(task_id)},
        {"$set": task_update}
    )
    
    updated_task = await db["tasks"].find_one({"_id": ObjectId(task_id)})
    updated_task["_id"] = str(updated_task["_id"])
    
    # Log activity if assignees changed
    if "assignee_ids" in task_update:
        # User requirement: BACKLOG -> TODO if assigned
        current_task = await db["tasks"].find_one({"_id": ObjectId(task_id)})
        if current_task and current_task.get("status") == "BACKLOG" and any(aid for aid in task_update.get("assignee_ids", [])):
            await db["tasks"].update_one({"_id": ObjectId(task_id)}, {"$set": {"status": "TODO"}})
            updated_task["status"] = "TODO"
            
        await log_activity(db, "TASK_ASSIGNED", updated_task["_id"], updated_task["title"], current_user, details="Assignees updated")
        
    if "attachments" in task_update:
        current_task = await db["tasks"].find_one({"_id": ObjectId(task_id)})
        current_attachments = current_task.get("attachments", []) if current_task else []
        new_attachments = task_update.get("attachments", [])
        if len(new_attachments) > len(current_attachments) and updated_task.get("status") != "REVIEW":
            # Auto-trigger review when new attachments are added
            updated_task = await handle_task_review(db, task_id, new_attachments, current_user)
            
    if "assignee_ids" not in task_update and "attachments" not in task_update:
        await log_activity(db, "TASK_UPDATED", updated_task["_id"], updated_task["title"], current_user)
        
    return updated_task

@router.delete("/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(check_manager_role)):
    db = get_database()
    if not ObjectId.is_valid(task_id):
        raise HTTPException(status_code=400, detail="Invalid task ID")
    result = await db["tasks"].delete_one({"_id": ObjectId(task_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}

@router.patch("/{task_id}/status")
async def update_task_status(task_id: str, new_status: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    from datetime import datetime
    if not ObjectId.is_valid(task_id):
        raise HTTPException(status_code=400, detail="Invalid task ID")
        
    current_task = await db["tasks"].find_one({"_id": ObjectId(task_id)})
    if not current_task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if current_user.get("role") != "PROJECT_MANAGER":
        if str(current_user["_id"]) not in current_task.get("assignee_ids", []):
            raise HTTPException(status_code=403, detail="Not authorized to modify this task")
        if current_task.get("status") == "TODO" and new_status == "IN_PROGRESS":
            pass # allowed
        else:
            raise HTTPException(status_code=403, detail="Members can only move tasks from TODO to IN_PROGRESS")
            
    result = await db["tasks"].update_one(
        {"_id": ObjectId(task_id)},
        {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
    )
    return {"message": "Status updated successfully", "new_status": new_status}

@router.get("/me/all", response_model=List[TaskResponse])
async def list_my_tasks(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id_str = str(current_user["_id"])
    tasks_cursor = db["tasks"].find({"assignee_ids": user_id_str})
    tasks = await tasks_cursor.to_list(length=1000)
    for t in tasks:
        t["_id"] = str(t["_id"])
    return tasks

async def handle_task_review(db, task_id, attachments, current_user):
    """Helper to run AI review and update task status."""
    task = await db["tasks"].find_one({"_id": ObjectId(task_id)})
    if not task:
        return None
        
    await db["tasks"].update_one({"_id": ObjectId(task_id)}, {"$set": {"status": "REVIEW"}})
    task["status"] = "REVIEW"
    await log_activity(db, "TASK_REVIEW", str(task["_id"]), task["title"], current_user, details="Deliverable added, ready for review")
    
    # --- REVIEW AGENT LOGIC ---
    from app.services.agents.review_agent import review_node
    state = {
        "task_description": task.get("description", ""),
        "deliverables": str(attachments)
    }
    review_result = await review_node(state)
    
    decision = review_result["decision"]
    feedback = review_result["feedback"]
    
    if decision == "VALID":
        await db["tasks"].update_one({"_id": ObjectId(task_id)}, {"$set": {"status": "DONE", "review_feedback": feedback, "updated_at": datetime.utcnow()}})
        task["status"] = "DONE"
        task["review_feedback"] = feedback
        await log_activity(db, "TASK_UPDATED", str(task["_id"]), task["title"], current_user, details=f"Review passed: {feedback}")
    else:
        await db["tasks"].update_one({"_id": ObjectId(task_id)}, {"$set": {"status": "IN_PROGRESS", "review_feedback": feedback, "updated_at": datetime.utcnow()}})
        task["status"] = "IN_PROGRESS"
        task["review_feedback"] = feedback
        await log_activity(db, "TASK_UPDATED", str(task["_id"]), task["title"], current_user, details=f"Review failed: {feedback}")
    
    task["_id"] = str(task["_id"])
    return task

@router.post("/{task_id}/ai-review", response_model=TaskResponse)
async def trigger_manual_ai_review(task_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    if not ObjectId.is_valid(task_id):
        raise HTTPException(status_code=400, detail="Invalid task ID")
        
    task = await db["tasks"].find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    # Standardize transition: Manual review is for tasks in REVIEW or IN_PROGRESS with deliverables
    attachments = task.get("attachments", [])
    if not attachments:
        raise HTTPException(status_code= status.HTTP_400_BAD_REQUEST, detail="No deliverables found to review")
        
    updated_task = await handle_task_review(db, task_id, attachments, current_user)
    return updated_task

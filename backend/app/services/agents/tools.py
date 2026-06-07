from typing import List, Optional
from datetime import datetime
from langchain.tools import tool
from app.core.db import get_database
from bson import ObjectId
import asyncio
from app.services.notification_service import orchestrate_multi_channel_notification

async def create_specification_book_func(project_title: str, project_summary: str, markdown_content: str, methodology: str = "SCRUM", project_id: Optional[str] = None) -> str:
    """Saves a generated specification book to the database."""
    db = get_database()
    spec = {
        "project_title": project_title,
        "project_summary": project_summary,
        "markdown_content": markdown_content,
        "methodology": methodology,
        "project_id": project_id,
        "created_at": datetime.utcnow()
    }
    result = await db["specifications"].insert_one(spec)
    return f"Specification book created with ID: {result.inserted_id}"

@tool
async def create_specification_book(project_title: str, project_summary: str, markdown_content: str, methodology: str = "SCRUM", project_id: Optional[str] = None) -> str:
    """Save specification book."""
    return await create_specification_book_func(project_title, project_summary, markdown_content, methodology, project_id)

async def list_team_members_func() -> str:
    """Returns a list of all team members and their skills for assignment."""
    db = get_database()
    members = await db["users"].find({"role": {"$ne": "PROJECT_MANAGER"}}).to_list(100)
    report = "Available Team Members:\n"
    for m in members:
        name = m.get("full_name", m.get("name", "Unknown Member"))
        role = m.get("role", "TEAM_MEMBER")
        pos = m.get("position", "Staff")
        skills = ", ".join(m.get("skills", []))
        report += f"- {name} (ID: {str(m['_id'])}, Position: {pos}, Role: {role}, Skills: {skills})\n"
    return report

@tool
async def list_team_members() -> str:
    """Lists team and skills."""
    return await list_team_members_func()

async def create_project_tasks_func(project_id: str, tasks: List[dict]) -> str:
    """Creates multiple tasks for a project."""
    db = get_database()
    
    # 1. Resolve Project ID
    query = {}
    if ObjectId.is_valid(project_id):
        query["_id"] = ObjectId(project_id)
    elif project_id.startswith("PRJ-"):
        query["readable_id"] = project_id
    else:
        query["name"] = {"$regex": project_id, "$options": "i"}
        
    project = await db["projects"].find_one(query)
    if not project:
        return f"Failed to create tasks. Project '{project_id}' not found."
    
    real_project_id = str(project["_id"])
    
    for task in tasks:
        # Normalize fields to guarantee strict validation doesn't crash on frontend reads
        clean_task = {
            "title": task.get("title", task.get("name", "Untitled Task")),
            "description": task.get("description", task.get("details", "")),
            "status": task.get("status", "TODO"),  # Respect provided status, default to TODO
            "priority": str(task.get("priority", "MEDIUM")).upper(),
            "project_id": real_project_id,
            "created_at": datetime.utcnow(),
            "deadline": task.get("deadline", None),
            "assignee_ids": [],
            "attachments": []
        }
            
        # 2. Resolve Assignee IDs
        real_assignees = []
        for assignee in task.get("assignee_ids", []):
            if ObjectId.is_valid(assignee):
                real_assignees.append(assignee)
            else:
                user = await db["users"].find_one({"full_name": {"$regex": assignee, "$options": "i"}})
                if user:
                    real_assignees.append(str(user["_id"]))
                else:
                    user_by_email = await db["users"].find_one({"email": {"$regex": assignee, "$options": "i"}})
                    if user_by_email:
                        real_assignees.append(str(user_by_email["_id"]))
        
        clean_task["assignee_ids"] = real_assignees if real_assignees else []
            
        await db["tasks"].insert_one(clean_task)
    return f"Successfully created {len(tasks)} tasks."

@tool
async def create_project_tasks(project_id: str, tasks: List[dict]) -> str:
    """Adds tasks to project."""
    return await create_project_tasks_func(project_id, tasks)

async def send_notification_func(user_id: str, message: str) -> str:
    """Sends a notification/alert to a specific team member."""
    db = get_database()
    alert = {
        "user_id": user_id,
        "message": message,
        "type": "TASK_ASSIGNMENT",
        "read": False,
        "created_at": datetime.utcnow()
    }
    await db["alerts"].insert_one(alert)
    
    # NEW: Trigger External Notifications (Email + WhatsApp)
    try:
        # Fire and forget externally to avoid blocking the main tool loop
        # But we use await to ensure it starts before returning
        await orchestrate_multi_channel_notification(user_id, message)
        return f"Notification sent to {user_id} via DB, Email & WhatsApp"
    except Exception as e:
        print(f"Warning: Social Notification failed: {str(e)}")
        return f"Notification sent to {user_id} (DB only due to social error)"

@tool
async def send_notification(user_id: str, message: str) -> str:
    """Sends user alert."""
    return await send_notification_func(user_id, message)

async def get_system_stats_func() -> str:
    """Returns a high-level summary of all projects, total tasks, and team member count."""
    db = get_database()
    projects_count = await db["projects"].count_documents({})
    users_count = await db["users"].count_documents({})
    tasks_count = await db["tasks"].count_documents({})
    
    # Get active projects
    projects_cursor = db["projects"].find({}, {"name": 1, "status": 1, "progress_percentage": 1})
    projects_list = []
    async for p in projects_cursor:
        projects_list.append(f"- {p['name']} ({p['status']}, {p.get('progress_percentage', 0)}%)")
    
    report = f"System Stats:\n- Total Projects: {projects_count}\n- Total Team Members: {users_count}\n- Total Tasks: {tasks_count}\n"
    if projects_list:
        report += "\nActive Projects:\n" + "\n".join(projects_list)
    return report

@tool
async def get_system_stats() -> str:
    """Gets project stats."""
    return await get_system_stats_func()

async def get_project_details_func(project_identifier: str) -> str:
    """Returns detailed information about a specific project by name or ID.
    Includes status, progress, and a summary of tasks."""
    db = get_database()
    query = {}
    if ObjectId.is_valid(project_identifier):
        query["_id"] = ObjectId(project_identifier)
    elif project_identifier.startswith("PRJ-"):
        query["readable_id"] = project_identifier
    else:
        query["name"] = {"$regex": project_identifier, "$options": "i"}
    
    project = await db["projects"].find_one(query)
    if not project:
        return f"Project '{project_identifier}' not found."
    
    tasks_cursor = db["tasks"].find({"project_id": str(project["_id"])})
    tasks_count = await db["tasks"].count_documents({"project_id": str(project["_id"])})
    todo_count = await db["tasks"].count_documents({"project_id": str(project["_id"]), "status": "TODO"})
    done_count = await db["tasks"].count_documents({"project_id": str(project["_id"]), "status": "DONE"})
    
    report = f"Project: {project['name']}"
    if project.get('readable_id'):
        report += f" (ID: {project['readable_id']})"
    report += "\n"
    report += f"- Status: {project['status']}\n"
    if project.get('current_risk'):
        report += f"- Current Risk: {project['current_risk']}\n"
    report += f"- Progress: {project.get('progress_percentage', 0)}%\n"
    report += f"- Tasks: {tasks_count} total ({todo_count} TODO, {done_count} DONE)\n"
    report += f"- Description: {project.get('description', 'N/A')}\n"
    return report

@tool
async def get_project_details(project_identifier: str) -> str:
    """Gets project details."""
    return await get_project_details_func(project_identifier)

async def create_user_func(full_name: str, position: str, phone_number: str, role: str = "TEAM_MEMBER", skills: List[str] = []) -> str:
    """Adds a new team member to the system."""
    db = get_database()
    user = {
        "full_name": full_name,
        "position": position,
        "phone_number": phone_number,
        "role": role,
        "skills": skills,
        "email": f"{full_name.lower().replace(' ', '.')}@example.com", # Auto-generated email if not provided
        "hashed_password": "password123_not_secure", # Standard placeholder
        "created_at": datetime.utcnow()
    }
    result = await db["users"].insert_one(user)
    return f"Member {full_name} ({position}) added with ID: {result.inserted_id}"

@tool
async def create_user(full_name: str, position: str, phone_number: str, role: str = "TEAM_MEMBER", skills: List[str] = []) -> str:
    """Adds a new team member to the system. 
    Required: full_name, position (title), phone_number. 
    Optional: role (PROJECT_MANAGER, TEAM_LEAD, TEAM_MEMBER), skills (list)."""
    return await create_user_func(full_name, position, phone_number, role, skills)

async def delete_project_func(project_identifier: str) -> str:
    """Deletes a project and all its associated tasks."""
    db = get_database()
    query = {}
    if ObjectId.is_valid(project_identifier):
        query["_id"] = ObjectId(project_identifier)
    elif project_identifier.startswith("PRJ-"):
        query["readable_id"] = project_identifier
    else:
        query["name"] = project_identifier
    
    project = await db["projects"].find_one(query)
    if not project:
        return f"Project '{project_identifier}' not found."
    
    pid = str(project["_id"])
    await db["projects"].delete_one({"_id": project["_id"]})
    await db["tasks"].delete_many({"project_id": pid})
    return f"Project '{project['name']}' and all its tasks have been deleted."

@tool
async def delete_project(project_identifier: str) -> str:
    """Deletes a specific project by name or ID. WARNING: This also deletes all associated tasks."""
    return await delete_project_func(project_identifier)

async def delete_task_func(task_id: str) -> str:
    """Deletes a specific task by ID."""
    db = get_database()
    if not ObjectId.is_valid(task_id):
        return f"Invalid task ID: {task_id}"
    
    result = await db["tasks"].delete_one({"_id": ObjectId(task_id)})
    if result.deleted_count == 0:
        return f"Task with ID {task_id} not found."
    return f"Task {task_id} deleted successfully."

@tool
async def delete_task(task_id: str) -> str:
    """Deletes a specific task using its database ID."""
    return await delete_task_func(task_id)

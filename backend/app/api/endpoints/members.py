from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.models.user import UserResponse, UserCreate, UserUpdate
from app.api.deps import get_current_user, check_manager_role
from app.core.db import get_database
from app.core.auth import get_password_hash
from bson import ObjectId
from app.services.activity_log import log_activity

router = APIRouter()

@router.patch("/me")
async def update_my_profile(member_in: UserUpdate, current_user: dict = Depends(get_current_user)):
    """Permet à l'utilisateur connecté de mettre à jour son propre profil."""
    db = get_database()
    update_data = {k: v for k, v in member_in.model_dump().items() if v is not None}
    if not update_data:
        return {"message": "Rien à mettre à jour"}
    await db["users"].update_one(
        {"_id": current_user["_id"]},
        {"$set": update_data}
    )
    updated_user = await db["users"].find_one({"_id": current_user["_id"]})
    if updated_user:
        updated_user["id"] = str(updated_user.pop("_id"))
        updated_user.pop("hashed_password", None)
        return updated_user
    return {"message": "Profil mis à jour"}

@router.get("/", response_model=List[UserResponse])
async def list_members(current_user: dict = Depends(get_current_user)):
    db = get_database()
    users = await db["users"].find().to_list(100)
    for user in users:
        user["id"] = str(user.pop("_id"))
        # Strip password hash just in case
        user.pop("hashed_password", None)
    return users

@router.post("/", response_model=UserResponse)
async def create_member(member_in: UserCreate, current_user: dict = Depends(check_manager_role)):
    db = get_database()
    user = await db["users"].find_one({"email": member_in.email})
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    user_data = member_in.model_dump()
    user_data["hashed_password"] = get_password_hash(user_data.pop("password"))
    
    result = await db["users"].insert_one(user_data)
    user_data["id"] = str(result.inserted_id)
    user_data.pop("hashed_password", None)
    
    # Log activity
    await log_activity(db, "MEMBER_CREATED", user_data["id"], user_data["full_name"], current_user)
    
    return user_data

@router.get("/{member_id}/details")
async def get_member_details(member_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user = await db["users"].find_one({"_id": ObjectId(member_id)})
    if not user:
        raise HTTPException(status_code=404, detail="Member not found")
        
    user["id"] = str(user.pop("_id"))
    user.pop("hashed_password", None)
    
    # Fetch tasks
    tasks_cursor = db["tasks"].find({"assignee_ids": member_id})
    tasks = await tasks_cursor.to_list(length=50)
    for t in tasks:
        t["_id"] = str(t["_id"])
        
    return {
        "user": user,
        "tasks": tasks
    }

@router.put("/{member_id}")
async def update_member(member_id: str, member_in: UserUpdate, current_user: dict = Depends(check_manager_role)):
    db = get_database()
    update_data = {k: v for k, v in member_in.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data provided to update")
        
    result = await db["users"].update_one(
        {"_id": ObjectId(member_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
        
    await log_activity(db, "MEMBER_UPDATED", member_id, f"Updated member info", current_user)
    
    updated_user = await db["users"].find_one({"_id": ObjectId(member_id)})
    if updated_user:
        updated_user["id"] = str(updated_user.pop("_id"))
        updated_user.pop("hashed_password", None)
        return updated_user
    return {"message": "Success"}

@router.delete("/{member_id}")
async def delete_member(member_id: str, current_user: dict = Depends(check_manager_role)):
    db = get_database()
    
    # 1. Remove from all projects' team_members
    await db["projects"].update_many(
        {"team_members": member_id},
        {"$pull": {"team_members": member_id}}
    )

    # 2. Also check lead_id
    await db["projects"].update_many(
        {"lead_id": member_id},
        {"$set": {"lead_id": None}}
    )
    
    # 3. Remove from all tasks' assignee_ids
    await db["tasks"].update_many(
        {"assignee_ids": member_id},
        {"$pull": {"assignee_ids": member_id}}
    )
    
    # 4. Delete the user
    result = await db["users"].delete_one({"_id": ObjectId(member_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
        
    # Log activity
    await log_activity(db, "MEMBER_DELETED", member_id, "Deleted Member", current_user)
    
    return {"message": "Member removed successfully and all associations cleaned up"}

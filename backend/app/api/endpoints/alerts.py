from fastapi import APIRouter, Depends, HTTPException
from app.core.db import get_database
from app.models.alert import AlertCreate, AlertResponse
from app.api.deps import get_current_user
from bson import ObjectId
from typing import List
from datetime import datetime

router = APIRouter()

@router.get("/")
async def list_alerts(current_user: dict = Depends(get_current_user)):
    db = get_database()
    alerts_cursor = db["alerts"].find(
        {"user_id": str(current_user["_id"])}
    ).sort("created_at", -1).limit(50)  # newest first, max 50

    alerts = await alerts_cursor.to_list(length=50)
    result = []
    for a in alerts:
        result.append({
            "_id": str(a["_id"]),
            "user_id": a.get("user_id", ""),
            "title": a.get("title", ""),
            "message": a.get("message", ""),
            "urgency": a.get("urgency", "LOW"),
            "is_read": a.get("is_read", False),
            "project_id": a.get("project_id"),
            "task_id": a.get("task_id"),
            "created_at": a["created_at"].isoformat() if isinstance(a.get("created_at"), datetime) else str(a.get("created_at", "")),
        })
    return result


@router.patch("/{alert_id}/read")
async def mark_alert_read(alert_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    result = await db["alerts"].update_one(
        {"_id": ObjectId(alert_id), "user_id": str(current_user["_id"])},
        {"$set": {"is_read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert marked as read"}


@router.patch("/read-all")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    db = get_database()
    await db["alerts"].update_many(
        {"user_id": str(current_user["_id"]), "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "All alerts marked as read"}


@router.delete("/{alert_id}")
async def delete_alert(alert_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    result = await db["alerts"].delete_one(
        {"_id": ObjectId(alert_id), "user_id": str(current_user["_id"])}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert deleted"}


@router.delete("/clear/all")
async def delete_all_alerts(current_user: dict = Depends(get_current_user)):
    db = get_database()
    await db["alerts"].delete_many({"user_id": str(current_user["_id"])})
    return {"message": "All alerts deleted"}


@router.post("/send")
async def send_alert_to_user(
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
    """Manager sends a custom notification to a specific team member."""
    # Only managers can send alerts
    if current_user.get("role") != "PROJECT_MANAGER":
        raise HTTPException(status_code=403, detail="Only managers can send alerts")
    
    target_user_id = payload.get("target_user_id")
    title = payload.get("title", "📢 Message du Chef de Projet")
    message = payload.get("message", "")
    urgency = payload.get("urgency", "ORANGE")
    
    if not target_user_id or not message:
        raise HTTPException(status_code=400, detail="target_user_id and message are required")
    
    db = get_database()
    
    # Verify target user exists
    target = await db["users"].find_one({"_id": ObjectId(target_user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found")
    
    await db["alerts"].insert_one({
        "user_id": target_user_id,
        "title": title,
        "message": message,
        "urgency": urgency,
        "is_read": False,
        "created_at": datetime.utcnow(),
        "sent_by": str(current_user["_id"])
    })
    
    return {"message": f"Notification envoyée à {target.get('full_name', target.get('email', 'utilisateur'))}"}


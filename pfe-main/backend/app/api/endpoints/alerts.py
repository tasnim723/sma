from fastapi import APIRouter, Depends, HTTPException
from app.core.db import get_database
from app.models.alert import AlertCreate, AlertResponse
from app.api.deps import get_current_user
from bson import ObjectId
from typing import List

router = APIRouter()

@router.get("/", response_model=List[AlertResponse])
async def list_alerts(current_user: dict = Depends(get_current_user)):
    db = get_database()
    alerts_cursor = db["alerts"].find({"user_id": str(current_user["_id"])})
    alerts = await alerts_cursor.to_list(length=100)
    for a in alerts:
        a["_id"] = str(a["_id"])
    return alerts

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

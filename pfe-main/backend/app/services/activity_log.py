from datetime import datetime
from typing import Optional

async def log_activity(db, type: str, entity_id: str, entity_name: str, user: dict, details: Optional[str] = None):
    activity = {
        "type": type,
        "entity_id": entity_id,
        "entity_name": entity_name,
        "user_id": str(user["_id"]) if "_id" in user else str(user.get("id")),
        "user_name": user.get("full_name", user.get("name", "Unknown")),
        "details": details,
        "created_at": datetime.utcnow()
    }
    await db["activities"].insert_one(activity)

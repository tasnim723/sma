from app.core.db import get_database
from bson import ObjectId

async def award_xp(user_id: str, amount: int):
    db = get_database()
    
    # Get current user state
    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        return
        
    current_xp = user.get("xp", 0)
    current_weekly_xp = user.get("weekly_xp", 0)
    current_level = user.get("level", 1)
    
    new_xp = current_xp + amount
    new_weekly_xp = current_weekly_xp + amount
    
    # Level logic: each level takes Level * 1000 XP
    # e.g. Lvl 1 -> 2 needs 1000 XP. Lvl 2 -> 3 needs 2000 more? 
    # Let's keep it simple: Level = (Total XP // 1000) + 1
    new_level = (new_xp // 1000) + 1
    
    update_data = {
        "xp": new_xp,
        "weekly_xp": new_weekly_xp,
        "level": new_level
    }
    
    await db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    return {
        "leveled_up": new_level > current_level,
        "new_level": new_level,
        "earned": amount
    }

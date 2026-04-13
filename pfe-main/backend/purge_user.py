import asyncio
import os
import sys
from bson import ObjectId

# Add the current directory to sys.path to find 'app'
sys.path.append(os.getcwd())

from app.core.db import get_database

async def delete_user():
    db = get_database()
    user_id = "69c5bfcfdcd0e1cf50e5654c"
    
    # 1. Remove from all projects' team_members
    res1 = await db["projects"].update_many(
        {"team_members": user_id},
        {"$pull": {"team_members": user_id}}
    )
    print(f"Removed from {res1.modified_count} projects' team_members.")

    # 2. Also check lead_id
    res2 = await db["projects"].update_many(
        {"lead_id": user_id},
        {"$set": {"lead_id": None}}
    )
    print(f"Cleared from {res2.modified_count} projects' lead_id.")
    
    # 3. Remove from all tasks' assignee_ids
    res3 = await db["tasks"].update_many(
        {"assignee_ids": user_id},
        {"$pull": {"assignee_ids": user_id}}
    )
    print(f"Removed from {res3.modified_count} tasks' assignee_ids.")
    
    # 4. Delete the user
    res4 = await db["users"].delete_one({"_id": ObjectId(user_id)})
    if res4.deleted_count > 0:
        print(f"User {user_id} deleted successfully from users collection.")
    else:
        print(f"User {user_id} not found in users collection.")

if __name__ == "__main__":
    asyncio.run(delete_user())

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def fix_roles():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client["project_manager_db"]
    
    # Fix manager@pfe.com role: MANAGER -> PROJECT_MANAGER
    result = await db["users"].update_one(
        {"email": "manager@pfe.com"},
        {"$set": {"role": "PROJECT_MANAGER"}}
    )
    print(f"Fixed manager@pfe.com: matched={result.matched_count}, modified={result.modified_count}")
    
    # Show all users now
    users = await db["users"].find({}, {"email": 1, "role": 1, "full_name": 1, "_id": 0}).to_list(20)
    print("\nAll users in DB:")
    for u in users:
        print(f"  {u['email']} | {u['role']} | {u.get('full_name','?')}")

asyncio.run(fix_roles())

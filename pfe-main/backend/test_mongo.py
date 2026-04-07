import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def test():
    try:
        client = AsyncIOMotorClient('mongodb://localhost:27017', serverSelectionTimeoutMS=3000)
        await client.admin.command('ping')
        print("MongoDB OK - Connected!")
        db = client["project_manager_db"]
        count = await db["users"].count_documents({})
        print(f"Users in DB: {count}")
        if count > 0:
            users = await db["users"].find({}, {"email": 1, "role": 1, "_id": 0}).to_list(10)
            for u in users:
                print(f"  - {u}")
    except Exception as e:
        print(f"MongoDB ERROR: {e}")

asyncio.run(test())

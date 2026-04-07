import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check():
    MONGO_URI = "mongodb://localhost:27017"
    DB_NAME = "project_manager_db"
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    # List all activities
    activities = await db["activities"].find().sort("created_at", -1).limit(20).to_list(100)
    print("\nRECENT ACTIVITIES:")
    for a in activities:
        print(f"[{a['created_at']}] {a['type']}: {a.get('entity_name', 'N/A')} - {a.get('details', 'N/A')}")

if __name__ == "__main__":
    asyncio.run(check())

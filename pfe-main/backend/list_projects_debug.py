import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check():
    MONGO_URI = "mongodb://localhost:27017"
    DB_NAME = "project_manager_db"
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    # List all collections
    cols = await db.list_collection_names()
    print(f"Collections: {cols}")
    
    # List all projects
    projects = await db["projects"].find().to_list(100)
    print("\nPROJECTS:")
    for p in projects:
        print(f"- {p['name']} (ID: {p.get('readable_id', 'N/A')}, _id: {p['_id']})")
        
    # List all tasks for one of them if any
    if projects:
        tasks_count = await db["tasks"].count_documents({"project_id": str(projects[0]["_id"])})
        print(f"\nTasks for {projects[0]['name']}: {tasks_count}")

if __name__ == "__main__":
    asyncio.run(check())

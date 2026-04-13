import motor.motor_asyncio
import asyncio
from bson import ObjectId

async def check():
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["sma_project"]
    
    # 1. Look for 'conception' task
    print("--- Searching for tasks matching 'conception' ---")
    tasks = await db["tasks"].find({"title": {"$regex": "conception", "$options": "i"}}).to_list(10)
    print(f"Found {len(tasks)} tasks.")
    for t in tasks:
        print(f"ID: {str(t['_id'])}, Title: {t['title']}, Status: {t['status']}, Project: {t.get('project_id', 'N/A')}")
        
    # 2. Look for projects to confirm 'VR Chat Connect'
    print("\n--- Searching for 'VR Chat Connect' project ---")
    projects = await db["projects"].find({"name": {"$regex": "VR Chat Connect", "$options": "i"}}).to_list(10)
    for p in projects:
        print(f"ID: {str(p['_id'])}, Name: {p['name']}, ID: {p.get('readable_id', 'N/A')}")
        
    await client.close()

if __name__ == "__main__":
    asyncio.run(check())

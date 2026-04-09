import motor.motor_asyncio
import asyncio
from datetime import datetime, timedelta
from bson import ObjectId

async def add_task():
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["project_manager_db"]
    
    project_id = "69cad4988f5710dc3806ddfe"
    charlie_id = "69bfc6818e18299e275ad0e8"
    
    task = {
        "title": "Conception and BMC model",
        "description": "Create the initial conception and Business Model Canvas for the VR Chat Connect project.",
        "status": "TODO",
        "priority": "HIGH",
        "project_id": project_id,
        "assignee_ids": [charlie_id],
        "created_at": datetime.utcnow(),
        "deadline": (datetime.utcnow() + timedelta(days=7)).isoformat(),
        "attachments": []
    }
    
    result = await db["tasks"].insert_one(task)
    print(f"Task inserted with ID: {result.inserted_id}")
    
    # Also update the project team if Charlie isn't already in it
    await db["projects"].update_one(
        {"_id": ObjectId(project_id)},
        {"$addToSet": {"team_members": charlie_id}}
    )
    print("Project team updated.")
    
    await client.close()

if __name__ == "__main__":
    asyncio.run(add_task())

import motor.motor_asyncio
import asyncio
import json
from bson import ObjectId

async def dump():
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb://localhost:27017")
    # Correct DB name from backend/app/core/db.py
    db = client["project_manager_db"]
    
    projects = await db["projects"].find().to_list(100)
    tasks = await db["tasks"].find().to_list(100)
    
    p_data = [{"id": str(p["_id"]), "name": p["name"]} for p in projects]
    t_data = [{"id": str(t["_id"]), "title": t["title"], "project_id": t.get("project_id", "N/A"), "status": t.get("status")} for t in tasks]
    
    with open("c:/Users/MediaHelp/Documents/yosr/work/pfeproject/tmp/db_dump.json", "w") as f:
        json.dump({"projects": p_data, "tasks": t_data}, f, indent=2)
    
    print("Dumped to tmp/db_dump.json")
    await client.close()

if __name__ == "__main__":
    asyncio.run(dump())

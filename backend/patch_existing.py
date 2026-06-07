import asyncio
import os
import sys
from bson import ObjectId

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.db import get_database

async def main():
    db = get_database()
    tasks = db["tasks"].find({"assignee_ids": {"$size": 0}})
    async for t in tasks:
        try:
            proj = await db["projects"].find_one({"_id": ObjectId(t["project_id"])})
            if proj and proj.get("lead_id"):
                await db["tasks"].update_one({"_id": t["_id"]}, {"$set": {"assignee_ids": [proj["lead_id"]]}})
                print(f"Patched task {t['_id']} with lead_id {proj['lead_id']}")
        except:
            pass

if __name__ == "__main__":
    asyncio.run(main())

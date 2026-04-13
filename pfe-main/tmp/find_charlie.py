import motor.motor_asyncio
import asyncio
import json

async def find_charlie():
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["project_manager_db"]
    user = await db["users"].find_one({"full_name": {"$regex": "Charlie", "$options": "i"}})
    if user:
        print(json.dumps({"id": str(user["_id"]), "full_name": user["full_name"]}))
    else:
        print("NOT FOUND")
    await client.close()

if __name__ == "__main__":
    asyncio.run(find_charlie())

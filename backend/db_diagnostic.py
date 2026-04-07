import asyncio
import os
from dotenv import load_dotenv
load_dotenv()

from motor.motor_asyncio import AsyncIOMotorClient

async def check_env_and_write():
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    DB_NAME = os.getenv("DB_NAME", "project_manager_db")
    print(f"DEBUG: MONGO_URI={MONGO_URI}")
    print(f"DEBUG: DB_NAME={DB_NAME}")
    
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    # Test Write
    test_proj = {"name": "TEST_CREATION_DIAGNOSTIC", "created_at": "now"}
    res = await db["projects"].insert_one(test_proj)
    print(f"DEBUG: Inserted test project with _id: {res.inserted_id}")
    
    # Verify Write
    found = await db["projects"].find_one({"name": "TEST_CREATION_DIAGNOSTIC"})
    if found:
        print("DEBUG: Test project found in DB!")
        await db["projects"].delete_one({"name": "TEST_CREATION_DIAGNOSTIC"})
        print("DEBUG: Test project cleaned up.")
    else:
        print("DEBUG: Test project NOT found after write!")

if __name__ == "__main__":
    asyncio.run(check_env_and_write())

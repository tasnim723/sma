
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check_users():
    MONGO_URI = "mongodb://localhost:27017"
    DB_NAME = "project_manager_db"
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    users = await db["users"].find({}).to_list(length=100)
    print(f"Found {len(users)} users")
    for u in users:
        creds = u.get("biometric_credentials", [])
        print(f"Email: {u['email']}, Biometrics: {len(creds)} credentials")

if __name__ == "__main__":
    asyncio.run(check_users())

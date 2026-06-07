import bcrypt
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(r"c:\Users\LENOVO\Downloads\PROJET_SMA (2)\PROJET_SMA\pfe-main (2)\pfe-main\pfe-main\backend\.env")

async def test_verify():
    uri = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
    db_name = os.getenv("DB_NAME", "project_manager_db")
    client = AsyncIOMotorClient(uri)
    db = client[db_name]
    
    user = await db["users"].find_one({"email": "manager@project.com"})
    if not user:
        print("User not found")
        return
        
    hashed = user.get("hashed_password")
    print(f"Hashed password in DB: {hashed}")
    
    password = "password123"
    try:
        is_correct = bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
        print(f"Verification of 'password123': {is_correct}")
    except Exception as e:
        print(f"Error during verification: {e}")

if __name__ == "__main__":
    asyncio.run(test_verify())

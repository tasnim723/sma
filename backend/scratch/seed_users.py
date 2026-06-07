import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

async def seed_users():
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.getenv("MONGO_DB", "sma_engine")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Check if we should clear
    # await db["users"].delete_many({})
    
    demo_users = [
        {
            "email": "manager@project.com",
            "full_name": "Alice Manager",
            "hashed_password": get_password_hash("password123"),
            "role": "PROJECT_MANAGER",
            "created_at": None, # Will be set below
            "phone_number": "+216 22 333 444",
            "position": "Senior Innovation Architect",
            "skills": ["Strategic Management", "Systemic Thinking", "FastAPI"],
            "cv_url": "",
            "linkedin_url": "https://linkedin.com/in/alicemanager",
            "github_url": "https://github.com/alicemanager",
        },
        {
            "email": "team@project.com",
            "full_name": "Bob Developer",
            "hashed_password": get_password_hash("password123"),
            "role": "TEAM_MEMBER",
            "created_at": None,
            "phone_number": "+216 55 666 777",
            "position": "Full-Stack Sorcerer",
            "skills": ["React", "Python", "Docker", "NLP"],
            "cv_url": "",
            "linkedin_url": "https://linkedin.com/in/bobdev",
            "github_url": "https://github.com/bobdev",
        }
    ]
    
    from datetime import datetime
    for u in demo_users:
        u["created_at"] = datetime.utcnow()
        existing = await db["users"].find_one({"email": u["email"]})
        if not existing:
            await db["users"].insert_one(u)
            print(f"Created user: {u['email']}")
        else:
            print(f"User {u['email']} already exists.")
            
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_users())

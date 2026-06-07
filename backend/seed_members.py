import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt

def hash_password(password: str):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def seed_members():
    client = AsyncIOMotorClient('mongodb://127.0.0.1:27017')
    db = client['project_manager_db']

    members = [
        {
            "email": "lead@project.com",
            "full_name": "Assistant Lead",
            "hashed_password": hash_password("password123"),
            "role": "TEAM_LEAD",
            "phone_number": "111111111",
            "position": "Team Lead",
            "skills": ["Leadership", "Management"],
            "xp": 400,
            "weekly_xp": 80,
            "level": 2,
            "auth_provider": "local",
            "status": "ACTIVE"
        },
        {
            "email": "alpha@project.com",
            "full_name": "Membre Alpha",
            "hashed_password": hash_password("password123"),
            "role": "TEAM_MEMBER",
            "phone_number": "222222222",
            "position": "Backend Developer",
            "skills": ["Python", "FastAPI"],
            "xp": 200,
            "weekly_xp": 40,
            "level": 1,
            "auth_provider": "local",
            "status": "ACTIVE"
        },
        {
            "email": "beta@project.com",
            "full_name": "Membre Beta",
            "hashed_password": hash_password("password123"),
            "role": "TEAM_MEMBER",
            "phone_number": "333333333",
            "position": "Frontend Developer",
            "skills": ["React", "TypeScript"],
            "xp": 150,
            "weekly_xp": 30,
            "level": 1,
            "auth_provider": "local",
            "status": "ACTIVE"
        },
        {
            "email": "gamma@project.com",
            "full_name": "Membre Gamma",
            "hashed_password": hash_password("password123"),
            "role": "TEAM_MEMBER",
            "phone_number": "444444444",
            "position": "DevOps Engineer",
            "skills": ["Docker", "CI/CD"],
            "xp": 180,
            "weekly_xp": 35,
            "level": 1,
            "auth_provider": "local",
            "status": "ACTIVE"
        },
    ]

    for m in members:
        existing = await db["users"].find_one({"email": m["email"]})
        if existing:
            print(f"Already exists: {m['email']} - skipping")
        else:
            await db["users"].insert_one(m)
            print(f"Created: {m['full_name']} ({m['email']})")

    print("\nDone! All members have been seeded.")

asyncio.run(seed_members())

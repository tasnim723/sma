import asyncio
from app.core.db import db
from app.core.auth import get_password_hash

async def seed_data():
    print("Seeding database...")
    # Seed users
    from datetime import datetime
    users = [
        {
            "email": "manager@project.com",
            "full_name": "Alice Manager",
            "phone_number": "+216 11 222 333",
            "position": "CEO / Project Manager",
            "role": "PROJECT_MANAGER",
            "hashed_password": get_password_hash("password123"),
            "skills": ["Management", "Agile"],
            "created_at": datetime.utcnow()
        },
        {
            "email": "lead@project.com",
            "full_name": "Bob Lead",
            "phone_number": "+216 22 333 444",
            "position": "Tech Lead",
            "role": "TEAM_LEAD",
            "hashed_password": get_password_hash("password123"),
            "skills": ["Development", "Review"],
            "created_at": datetime.utcnow()
        },
        {
            "email": "member@project.com",
            "full_name": "Charlie Member",
            "phone_number": "+216 33 444 555",
            "position": "Developer",
            "role": "TEAM_MEMBER",
            "hashed_password": get_password_hash("password123"),
            "skills": ["Development"],
            "created_at": datetime.utcnow()
        }
    ]
    
    # Check if users already exist
    existing_count = await db["users"].count_documents({})
    if existing_count > 0:
        print(f"Database already has {existing_count} users. Skipping seeding to prevent data loss.")
        return

    # Seed users
    await db["users"].insert_many(users)
    print("Users seeded successfully.")
    
if __name__ == "__main__":
    asyncio.run(seed_data())

import motor.motor_asyncio
import asyncio
import bcrypt

def get_password_hash(password: str):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def seed():
    client = motor.motor_asyncio.AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['project_manager_db']
    
    # Manager user
    manager = {
        "email": "manager@project.com",
        "full_name": "Project Manager",
        "hashed_password": get_password_hash("password123"),
        "role": "PROJECT_MANAGER",
        "phone_number": "123456789",
        "position": "Lead Manager",
        "skills": ["Management", "Planning"],
        "xp": 500,
        "weekly_xp": 100,
        "level": 3,
        "auth_provider": "local"
    }
    
    # Member user
    member = {
        "email": "team@project.com",
        "full_name": "Team Member",
        "hashed_password": get_password_hash("password123"),
        "role": "TEAM_MEMBER",
        "phone_number": "987654321",
        "position": "Frontend Developer",
        "skills": ["React", "TypeScript"],
        "xp": 250,
        "weekly_xp": 50,
        "level": 1,
        "auth_provider": "local"
    }
    
    await db["users"].delete_many({})
    await db["users"].insert_many([manager, member])
    print("Database 'project_manager_db' seeded successfully.")

if __name__ == "__main__":
    asyncio.run(seed())

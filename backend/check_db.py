import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient('mongodb://127.0.0.1:27017')
    db = client['project_manager_db']
    projects = await db.projects.count_documents({})
    tasks = await db.tasks.count_documents({})
    users = await db.users.count_documents({})
    print(f"Users: {users}, Projects: {projects}, Tasks: {tasks}")

if __name__ == "__main__":
    asyncio.run(main())

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

async def fetch():
    load_dotenv()
    c = AsyncIOMotorClient(os.getenv('MONGO_URI', 'mongodb://localhost:27017'))
    db = c[os.getenv('DB_NAME', 'project_manager_db')]
    users = await db['users'].find({}).to_list(100)
    for u in users:
        print(f"Email: {u.get('email', '')}, Role: {u.get('role', '')}, Pwd: {u.get('password', u.get('hashed_password', ''))}")

if __name__ == "__main__":
    asyncio.run(fetch())

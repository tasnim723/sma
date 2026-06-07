import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def list_users():
    client = AsyncIOMotorClient('mongodb://127.0.0.1:27017')
    db = client['project_manager_db']
    users = await db['users'].find({}).to_list(100)
    for u in users:
        email = u.get('email', 'N/A')
        role = u.get('role', 'N/A')
        name = u.get('full_name', 'N/A')
        status = u.get('status', 'N/A')
        auth = u.get('auth_provider', 'local')
        print(f"Name: {name} | Email: {email} | Role: {role} | Status: {status} | Auth: {auth}")
    print(f"\nTotal users: {len(users)}")

asyncio.run(list_users())

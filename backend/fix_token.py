import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def fix_token():
    client = AsyncIOMotorClient('mongodb://127.0.0.1:27017')
    db = client['project_manager_db']
    
    # We must make sure it's a dict update
    result = await db.users.update_one(
        {"email": "hajritasnim7@gmail.com"},
        {"$set": {"confirm_token": "5b854a66-70e0-47b2-bd79-a764d8dbd71d"}}
    )
    print(f'Modified {result.modified_count} user(s).')

asyncio.run(fix_token())

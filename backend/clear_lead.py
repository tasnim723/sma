import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def fix():
    db = AsyncIOMotorClient('mongodb://127.0.0.1:27017')['project_manager_db']
    r = await db['projects'].update_many({}, {'$unset': {'lead_id': ''}})
    print(f'Cleared lead_id from {r.modified_count} projects')

asyncio.run(fix())

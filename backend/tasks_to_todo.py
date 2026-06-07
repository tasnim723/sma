import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def fix():
    db = AsyncIOMotorClient('mongodb://127.0.0.1:27017')['project_manager_db']
    r = await db['tasks'].update_many(
        {'status': 'BACKLOG'},
        {'$set': {'status': 'TODO'}}
    )
    print(f'Moved {r.modified_count} tasks from BACKLOG to TODO')

asyncio.run(fix())

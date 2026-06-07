import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    db = AsyncIOMotorClient('mongodb://127.0.0.1:27017')['project_manager_db']
    todo = await db['tasks'].count_documents({'status': 'TODO'})
    backlog = await db['tasks'].count_documents({'status': 'BACKLOG'})
    total = await db['tasks'].count_documents({})
    print(f'TODO: {todo}, BACKLOG: {backlog}, TOTAL: {total}')
    tasks = await db['tasks'].find({}).to_list(5)
    for t in tasks:
        title = t.get('title', '?')
        status = t.get('status', '?')
        pid = t.get('project_id', '?')
        print(f'  - {title[:40]} | status={status} | project_id={pid}')

asyncio.run(check())

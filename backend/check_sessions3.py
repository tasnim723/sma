import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    client = AsyncIOMotorClient('mongodb://127.0.0.1:27017')
    db = client['project_manager_db']
    sessions = await db['brainstorming_sessions'].find({'is_wizard': {'$ne': True}}).to_list(100)
    print(f"Standalone sessions: {len(sessions)}")
    for s in sessions:
        step = s.get('conversationStep')
        status = s.get('status')
        ranking = s.get('ranking')
        ideas = s.get('ideas', [])
        topic = s.get('topic', '')[:40]
        print(f"  status={status} step={step!r:25} ranking={'YES('+str(len(ranking))+')' if ranking else 'NO':8} ideas={len(ideas)} | {topic}")

asyncio.run(check())

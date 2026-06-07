import asyncio, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, '.')
from app.core.db import get_database

async def check():
    db = get_database()
    tasks = await db['tasks'].find({}).to_list(200)
    veille_tasks = [t for t in tasks if 'veille' in t.get('title','').lower() or 'veille' in t.get('description','').lower()[:100]]
    if not veille_tasks:
        print("NO VEILLE TASKS FOUND IN DB")
    for t in veille_tasks:
        print("TITLE:", t.get('title'))
        print("CATEGORY:", t.get('category'))
        print("IS_VEILLE:", t.get('is_veille_task'))
        desc = t.get('description','')
        print("DESC_START:", repr(desc[:600]))
        print()

asyncio.run(check())

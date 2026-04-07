import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()
MONGO_URL = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'project_manager_db')

async def check():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print('=== USERS IN DB ===')
    users = await db['users'].find({}).to_list(100)
    for u in users:
        uid = str(u['_id'])
        name = str(u.get('full_name', u.get('name', '?')))
        role = str(u.get('role', '?'))
        skills = str(u.get('skills', []))
        line = "ID=" + uid + " Name=" + name + " Role=" + role + " Skills=" + skills
        print(line)
    
    print('Total users: ' + str(len(users)))
    
    print('')
    print('=== SAMPLE TASKS (first 10) ===')
    tasks = await db['tasks'].find({}).to_list(10)
    for t in tasks:
        title = str(t.get('title', '?'))
        assignees = str(t.get('assignee_ids', []))
        line = "Task=" + title + " | Assignees=" + assignees
        print(line)

asyncio.run(check())

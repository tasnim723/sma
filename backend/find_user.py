import asyncio
import os
import sys

# Add the current directory to sys.path to find 'app'
sys.path.append(os.getcwd())

from app.core.db import get_database

async def check_user():
    db = get_database()
    users = await db['users'].find({"full_name": "create presentation"}).to_list(10)
    for u in users:
        print(f"ID: {u['_id']}, Name: {u['full_name']}, Email: {u['email']}, Created: {u.get('created_at')}")

if __name__ == "__main__":
    asyncio.run(check_user())

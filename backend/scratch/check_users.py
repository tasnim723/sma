import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.getcwd())

from app.core.db import get_database

async def check():
    db = get_database()
    users = await db['users'].find({}).to_list(100)
    print("--- USERS IN DB ---")
    for u in users:
        print(f"Name: {u.get('full_name')}, Status: {u.get('status')}, ID: {str(u['_id'])}")

if __name__ == "__main__":
    asyncio.run(check())

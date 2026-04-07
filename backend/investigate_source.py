import asyncio
import os
import sys
from datetime import datetime, timedelta

# Add the current directory to sys.path to find 'app'
sys.path.append(os.getcwd())

from app.core.db import get_database

async def investigate_source():
    db = get_database()
    
    # Target time: 2026-03-26 23:22:55
    target_time = datetime(2026, 3, 26, 23, 22, 55)
    start_time = target_time - timedelta(minutes=10)
    end_time = target_time + timedelta(minutes=10)
    
    print(f"Searching chat history between {start_time} and {end_time}...")
    
    # Check chat_history collection
    chats = await db["chat_history"].find({
        # "created_at": {"$gte": start_time, "$lte": end_time}
    }).to_list(100) # Get last 100 chats if time filtering is tricky with stored formats
    
    print(f"Found {len(chats)} recent chat entries.")
    for chat in chats:
        # Check if 'presentation' or 'create' is in the message
        msg = str(chat.get("message", "")).lower()
        if "presentation" in msg or "create" in msg:
            print(f"[{chat.get('created_at')}] User: {chat.get('user_id')} -> {chat.get('message')}")
            if chat.get("response"):
                print(f"   Response: {chat.get('response')[:200]}...")

if __name__ == "__main__":
    asyncio.run(investigate_source())

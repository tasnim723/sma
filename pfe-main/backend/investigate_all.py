import asyncio
import os
import sys
from datetime import datetime, timedelta

# Add the current directory to sys.path to find 'app'
sys.path.append(os.getcwd())

from app.core.db import get_database

async def investigate_all():
    db = get_database()
    collections = await db.list_collection_names()
    print(f"Collections: {collections}")
    
    target_text = "presentation"
    
    for col_name in collections:
        try:
            print(f"-- Searching collection: {col_name} --")
            cursor = db[col_name].find({
                "$or": [
                    {"message": {"$regex": target_text, "$options": "i"}},
                    {"full_name": {"$regex": target_text, "$options": "i"}},
                    {"description": {"$regex": target_text, "$options": "i"}},
                    {"content": {"$regex": target_text, "$options": "i"}}
                ]
            })
            entries = await cursor.to_list(10)
            if entries:
                for e in entries:
                    print(f"Found in {col_name}: {e}")
        except Exception:
            # Skip if fields don't exist
            continue

if __name__ == "__main__":
    asyncio.run(investigate_all())

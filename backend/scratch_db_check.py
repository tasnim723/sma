import asyncio
from app.core.db import get_database

async def check_db():
    db = get_database()
    collections = await db.list_collection_names()
    print(f"Collections: {collections}")
    for coll in collections:
        # Check for any field containing 'gamifier'
        cursor = db[coll].find({})
        async for doc in cursor:
            str_doc = str(doc)
            if 'gamifier' in str_doc.lower():
                print(f"FOUND in {coll}: {doc['_id']}")

if __name__ == "__main__":
    asyncio.run(check_db())

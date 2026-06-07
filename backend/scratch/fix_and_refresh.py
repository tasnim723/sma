import asyncio
from app.core.db import get_database
from app.services.veille_scraper import fetch_and_store_articles

async def fix_and_refresh():
    db = get_database()
    print("Clearing tech_articles...")
    await db.tech_articles.delete_many({})
    
    print("Starting fresh sync for projects...")
    count = await fetch_and_store_articles()
    print(f"Sync complete. {count} articles stored.")
    
    articles = await db.tech_articles.find().to_list(length=100)
    for index, a in enumerate(articles):
        print(f"[{index}] Project: {a.get('project_context')} | Title: {a.get('title')} | Category: {a.get('category')}")

if __name__ == "__main__":
    asyncio.run(fix_and_refresh())

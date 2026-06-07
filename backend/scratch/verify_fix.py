import asyncio
from app.core.db import get_database

async def verify():
    db = get_database()
    articles = await db.tech_articles.find().to_list(length=100)
    print(f"Total articles: {len(articles)}")
    for a in articles:
        print(f"Project: {a.get('project_context')} | Title: {a.get('title')} | Category: {a.get('category')}")

if __name__ == "__main__":
    asyncio.run(verify())

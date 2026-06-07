import asyncio
from app.services.veille_scraper import fetch_and_store_articles
from app.core.db import get_database

async def run():
    print("=== Running fresh Veille Tech sync ===\n")
    count = await fetch_and_store_articles()
    print(f"\n=== Done: {count} articles stored ===\n")

    db = get_database()
    articles = await db.tech_articles.find().to_list(length=100)
    print(f"{'PROJECT':<35} {'TYPE':<8} {'TECH TAG':<25} {'TITLE'}")
    print("-" * 120)
    for a in articles:
        print(
            f"{a.get('project_context','?')[:34]:<35} "
            f"{a.get('type',''):<8} "
            f"{a.get('tech_tag','')[:24]:<25} "
            f"{a.get('title','')[:60]}"
        )

if __name__ == "__main__":
    asyncio.run(run())

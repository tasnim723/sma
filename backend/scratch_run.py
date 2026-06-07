import asyncio
import sys
import os

# Add current dir to sys path to import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.veille_scraper import fetch_and_store_articles

async def main():
    await fetch_and_store_articles()

if __name__ == "__main__":
    asyncio.run(main())

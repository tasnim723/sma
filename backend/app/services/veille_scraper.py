import httpx
import os
import xml.etree.ElementTree as ET
from datetime import datetime
from app.core.db import get_database

DEV_TO_API_URL = "https://dev.to/api/articles"
# Official Unreal Engine channel ID
YT_UNREAL_ENGINE_FEED = "https://www.youtube.com/feeds/videos.xml?channel_id=UCBobmJyzsJ6Ll7UbfhI4iwQ"

async def fetch_youtube_videos(client: httpx.AsyncClient, db):
    count = 0
    try:
        response = await client.get(YT_UNREAL_ENGINE_FEED)
        response.raise_for_status()
        
        # Parse XML
        root = ET.fromstring(response.content)
        # XML namespace for youtube RSS
        ns = {'ns': 'http://www.w3.org/2005/Atom', 'yt': 'http://www.youtube.com/xml/schemas/2015', 'media': 'http://search.yahoo.com/mrss/'}
        
        for entry in root.findall('ns:entry', ns)[:3]: # Get only top 3 latest videos
            title = entry.find('ns:title', ns).text
            link = entry.find('ns:link', ns).attrib['href']
            video_id = entry.find('yt:videoId', ns).text
            
            # Use highres thumbnail
            image = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
            
            article_dict = {
                "title": title,
                "description": "Nouvelle vidéo de la chaîne officielle Unreal Engine.",
                "category": "Gaming & Unreal Engine",
                "type": "VIDEO",
                "priority": "Haute priorité",
                "image": image,
                "link": link,
                "created_at": datetime.utcnow()
            }
            
            await db.tech_articles.insert_one(article_dict)
            count += 1
            
            # Also add a general 3D category for variety
            if count % 2 == 0:
                article_dict["category"] = "3D & Unreal Engine"
                await db.tech_articles.insert_one(article_dict)
                count += 1

    except Exception as e:
        print(f"Failed to fetch YouTube videos: {e}")
    return count

async def fetch_and_store_articles():
    db = get_database()
    
    # Map our internal categories to Dev.to search tags
    category_tags = {
        "Dev Web & Mobile": "webdev,mobile,react,nextjs",
        "IT Management": "management,leadership,productivity",
        "3D & Unreal Engine": "3d,rendering,graphics",
        "IA Générative (LLMs)": "ai,llm,gpt",
        "Serverless Functions": "serverless,aws-lambda",
        "Vector Databases": "vectordatabase,database",
        "GraphQL & Apollo": "graphql,apollo",
        "Tailwind CSS v4": "tailwind,css"
    }

    new_articles_count = 0

    async with httpx.AsyncClient() as client:
        # Clear collection for immediate fresh test
        await db.tech_articles.delete_many({})

        # 1. Fetch Articles
        for category, tags in category_tags.items():
            try:
                # Top articles from the last 7 days for more reliable 'Important' trends
                response = await client.get(
                    DEV_TO_API_URL, 
                    params={"tag": tags.split(",")[0], "top": 7, "per_page": 5}
                )
                response.raise_for_status()
                articles_data = response.json()

                for data in articles_data:
                    reactions = data.get("public_reactions_count", 0)
                    # Balanced thresholds: Elite is rare, Priority is common, Vanguard is default
                    priority = "Vanguard"
                    if reactions > 30:
                        priority = "Haute priorité"
                    elif reactions > 10:
                        priority = "Priorité"
                    
                    # No more skipping, we want a rich dashboard
                    article_dict = {
                        "title": data.get("title", ""),
                        "description": data.get("description", ""),
                        "category": category,
                        "type": "ARTICLE",  
                        "priority": priority,
                        "image": data.get("cover_image") or data.get("social_image") or "",
                        "link": data.get("url", ""),
                        "created_at": datetime.utcnow()
                    }
                    
                    await db.tech_articles.insert_one(article_dict)
                    new_articles_count += 1
            except Exception as e:
                print(f"Failed to fetch {category}: {e}")

        # 2. Fetch Videos
        yt_count = await fetch_youtube_videos(client, db)
        new_articles_count += yt_count

        # 3. Mark last sync time
        await db.system_config.update_one(
            {"key": "last_veille_tech_sync"},
            {"$set": {"value": datetime.utcnow()}},
            upsert=True
        )

    return new_articles_count

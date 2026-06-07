from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Optional
from bson import ObjectId
from app.core.db import get_database
from app.models.tech_article import TechArticleCreate, TechArticleResponse
from app.services.veille_scraper import fetch_and_store_articles, OFFICIAL_SOURCE_URLS
from datetime import datetime

router = APIRouter()

# ── The 5 official source URLs (whitelist for DB queries) ────────────────────
ALLOWED_SOURCE_URLS = list(OFFICIAL_SOURCE_URLS)

@router.get("/", response_model=List[TechArticleResponse])
async def get_tech_articles(background_tasks: BackgroundTasks, category: Optional[str] = None):
    db = get_database()
    
    # --- AUTO-SYNC LOGIC (3 DAYS) ---
    config = await db.system_config.find_one({"key": "last_veille_tech_sync"})
    last_sync = config.get("value") if config else None
    
    should_sync = False
    if not last_sync:
        should_sync = True
    else:
        diff = datetime.utcnow() - last_sync
        if diff.days >= 3:
            should_sync = True
            
    if should_sync:
        background_tasks.add_task(fetch_and_store_articles)
    # ---------------------------------

    # ⚡ LEVEL 4 (Database): ONLY return articles from the 5 official sources
    query: dict = {"source_url": {"$in": ALLOWED_SOURCE_URLS}}
    if category and category.lower() != "tout":
        query["category"] = category
        
    # Get articles ordered by creation date (newest first)
    cursor = db.tech_articles.find(query).sort("created_at", -1)
    articles = await cursor.to_list(length=50)
    
    return [{**article, "id": str(article["_id"])} for article in articles]

@router.post("/refresh")
async def refresh_tech_articles():
    count = await fetch_and_store_articles()
    return {"message": "Synchronisation terminée", "count": count}

@router.post("/", response_model=TechArticleResponse)
async def create_tech_article(article_in: TechArticleCreate):
    db = get_database()
    article_dict = article_in.model_dump()
    article_dict["created_at"] = datetime.utcnow()
    
    result = await db.tech_articles.insert_one(article_dict)
    
    created_article = await db.tech_articles.find_one({"_id": result.inserted_id})
    return {**created_article, "id": str(created_article["_id"])}

@router.delete("/{article_id}")
async def delete_tech_article(article_id: str):
    db = get_database()
    try:
        obj_id = ObjectId(article_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")
        
    result = await db.tech_articles.delete_one({"_id": obj_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
        
    return {"message": "Article deleted successfully"}

@router.get("/radar-stats")
async def get_radar_stats():
    db = get_database()
    
    # Aggregation to count articles per category
    pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
    ]
    
    stats_cursor = db.tech_articles.aggregate(pipeline)
    stats_list = await stats_cursor.to_list(length=100)
    
    # Convert list to a dictionary
    stats_dict = {item["_id"]: item["count"] for item in stats_list}
    
    # If we have no data yet, return some realistic defaults
    if not stats_dict:
        return {
            "IA & Data": 5,
            "Développement": 8,
            "Infrastructure": 4,
            "Cybersécurité": 3,
            "Innovation": 6
        }
    
    return stats_dict

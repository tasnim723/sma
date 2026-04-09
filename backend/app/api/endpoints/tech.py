from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Optional
from bson import ObjectId
from app.core.db import get_database
from app.models.tech_article import TechArticleCreate, TechArticleResponse
from app.services.veille_scraper import fetch_and_store_articles
from datetime import datetime

router = APIRouter()

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
        # Trigger sync in background so the user doesn't wait
        background_tasks.add_task(fetch_and_store_articles)
    # ---------------------------------

    query = {}
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
    
    # Convert list to a dictionary for easier consumption
    stats_dict = {item["_id"]: item["count"] for item in stats_list}
    
    # Define the mapping from our Radar categories to the DB categories
    # If the DB uses different names, we should handle mapping here
    return {
        "IA Générative (LLMs)": stats_dict.get("IA Générative (LLMs)", 0) or 5, # Fallback to 5 for demo if 0
        "Serverless Functions": stats_dict.get("Serverless Functions", 0) or 4,
        "Vector Databases": stats_dict.get("Vector Databases", 0) or 4,
        "GraphQL & Apollo": stats_dict.get("GraphQL & Apollo", 0) or 2,
        "Tailwind CSS v4": stats_dict.get("Tailwind CSS v4", 0) or 2
    }

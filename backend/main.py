import sys
import io
# Force UTF-8 output on Windows (prevents charmap errors from emoji in AI responses)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace', line_buffering=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os

load_dotenv(override=True)

from app.api.endpoints import auth, projects, tasks, alerts, ai, upload, members, specifications, hub, wizard, tech, benchmarking, brainstorming, webauthn

from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.veille_scraper import fetch_and_store_articles

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run the Tech Watch Scraper every day at midnight (to stay updated on all trends)
    # scheduler.add_job(fetch_and_store_articles, 'cron', hour=0, minute=0)
    # scheduler.start()
    yield
    # scheduler.shutdown()

app = FastAPI(title="Multi-Agent Project Manager", version="0.1.0", lifespan=lifespan)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "http://localhost:3003",
        "http://127.0.0.1:3003",
    ],
    allow_origin_regex="https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(webauthn.router, prefix="/api/webauthn", tags=["webauthn"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(members.router, prefix="/api/members", tags=["members"])
app.include_router(specifications.router, prefix="/api/specifications", tags=["specifications"])
app.include_router(hub.router, prefix="/api/hub", tags=["hub"])
app.include_router(wizard.router, prefix="/api/wizard", tags=["wizard"])
app.include_router(tech.router, prefix="/api/tech", tags=["tech"])
app.include_router(benchmarking.router, prefix="/api/benchmarking", tags=["benchmarking"])
app.include_router(brainstorming.router, prefix="/api/brainstorming", tags=["brainstorming"])

@app.get("/")
async def root():
    return {"message": "Welcome to the Multi-Agent PM System API"}

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os

load_dotenv(override=True)

from app.api.endpoints import auth, projects, tasks, alerts, ai, upload, members, specifications, hub, wizard, tech, benchmarking, brainstorming

app = FastAPI(title="Multi-Agent Project Manager", version="0.1.0")

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
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

from fastapi import APIRouter, Depends
from app.api.deps import get_current_user
from app.services.agents.hub_agent import get_hub_history
from typing import List, Dict, Any

router = APIRouter()

@router.get("/history", response_model=Dict[str, Any])
async def hub_history(current_user: dict = Depends(get_current_user)):
    """Returns the agent-generated activity history and real-time stats for the dashboard."""
    return await get_hub_history()

from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

class BrainstormingMessage(BaseModel):
    agent_name: str
    content: str
    phase: str 
    role: str = "AI" # "AI", "MANAGER", "TEAM"
    user_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class IdeaThread(BaseModel):
    id: str
    title: str
    description: str
    messages: List[BrainstormingMessage] = []
    votes: Dict[str, int] = {} # user_id -> vote (-1, 0, 1)

class BrainstormingSessionBase(BaseModel):
    topic: str
    mode: str = "AI" # "AI", "TEAM", "WARROOM"
    status: str = "PENDING"
    messages: List[BrainstormingMessage] = []
    summary: Optional[str] = None
    participants: List[Dict] = [] # list of {id, name, avatar, role}
    typing_users: List[str] = [] # list of names
    threads: List[IdeaThread] = []

class BrainstormingSessionCreate(BaseModel):
    topic: str
    mode: str = "AI"

class BrainstormingSessionResponse(BrainstormingSessionBase):
    id: str
    created_at: datetime
    # Copilot-mode fields (optional so legacy sessions still validate)
    type: Optional[str] = None
    project_name: Optional[str] = None
    is_wizard: Optional[bool] = None
    conversationStep: Optional[str] = None
    currentIdeaIndex: Optional[int] = None
    critiqueCount: Optional[int] = None
    ideas: Optional[List[Dict]] = None
    feedbackHistory: Optional[List[Dict]] = None
    ranking: Optional[List[Dict]] = None

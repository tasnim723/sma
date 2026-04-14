from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

class BrainstormingMessage(BaseModel):
    agent_name: str
    content: str
    phase: str # "Divergence", "Pivot", "Convergence"
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class BrainstormingSessionBase(BaseModel):
    topic: str
    status: str = "PENDING" # "PENDING", "RUNNING", "COMPLETED"
    messages: List[BrainstormingMessage] = []
    summary: Optional[str] = None

class BrainstormingSessionCreate(BrainstormingSessionBase):
    pass

class BrainstormingSessionResponse(BrainstormingSessionBase):
    id: str
    created_at: datetime

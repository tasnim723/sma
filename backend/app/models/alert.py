from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class AlertBase(BaseModel):
    user_id: str
    project_id: Optional[str] = None
    task_id: Optional[str] = None
    title: str
    message: str
    urgency: str = "LOW" # LOW, YELLOW, ORANGE, RED_CRITICAL
    is_read: bool = False

class AlertCreate(AlertBase):
    pass

class AlertInDB(AlertBase):
    id: str = Field(alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
class AlertResponse(AlertInDB):
    pass

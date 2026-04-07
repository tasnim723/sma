from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Any

class ActivityBase(BaseModel):
    type: str # PROJECT_CREATED, PROJECT_DELETED, MEMBER_ADDED, MEMBER_REMOVED, etc.
    entity_id: str
    entity_name: str
    user_id: str # Who performed the action
    user_name: str
    details: Optional[str] = None

class ActivityCreate(ActivityBase):
    pass

class ActivityInDB(ActivityBase):
    id: str = Field(alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ActivityResponse(ActivityInDB):
    pass

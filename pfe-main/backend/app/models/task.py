from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime

class TaskBase(BaseModel):
    title: str
    description: str
    project_id: str
    assignee_ids: List[str] = []
    status: str = "BACKLOG" # BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE
    priority: str = "MEDIUM" # LOW, MEDIUM, HIGH, URGENT
    deadline: Optional[datetime] = None
    story_points: int = 0
    is_deliverable: bool = False
    attachments: List[str] = []
    review_feedback: Optional[str] = None

class TaskCreate(TaskBase):
    pass

class TaskInDB(TaskBase):
    id: str = Field(alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
class TaskResponse(TaskInDB):
    @field_validator("assignee_ids", mode="before")
    @classmethod
    def filter_none_assignees(cls, v):
        if isinstance(v, list):
            return [x for x in v if x is not None]
        return v or []

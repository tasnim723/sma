from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime

class TaskBase(BaseModel):
    title: str
    description: str
    project_id: str
    assignee_ids: List[str] = []
    status: str = "SPARK" # SPARK (Ideation), VALIDATION (Market Fit), INCUBATION (MVP/Prototype)
    priority: str = "MEDIUM" # LOW, MEDIUM, HIGH, URGENT
    deadline: Optional[datetime] = None
    story_points: int = 0
    is_deliverable: bool = False
    attachments: List[str] = []
    review_feedback: Optional[str] = None
    votes: List[str] = [] # List of User IDs who sparkled (voted) this idea
    audacity_score: int = 0 # 0-100 score of how disruptive/innovative the idea is
    parent_idea_id: Optional[str] = None # For ramifications (Idea Tree)
    variant_count: int = 0 # Number of AI-generated variants

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

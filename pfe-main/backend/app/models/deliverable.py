from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class DeliverableBase(BaseModel):
    task_id: str
    project_id: str
    submitter_id: str
    file_name: str
    file_path: str
    status: str = "PENDING_REVIEW" # PENDING_REVIEW, APPROVED, REJECTED
    feedback: Optional[str] = None

class DeliverableCreate(DeliverableBase):
    pass

class DeliverableInDB(DeliverableBase):
    id: str = Field(alias="_id")
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    
class DeliverableResponse(DeliverableInDB):
    pass

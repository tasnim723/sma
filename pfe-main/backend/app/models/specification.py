from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class SpecificationBase(BaseModel):
    project_title: str
    project_summary: str
    markdown_content: str
    methodology: str = "SCRUM" # SCRUM or KANBAN
    project_id: Optional[str] = None

class SpecificationCreate(SpecificationBase):
    pass

class SpecificationInDB(SpecificationBase):
    id: str = Field(alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SpecificationResponse(SpecificationBase):
    id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

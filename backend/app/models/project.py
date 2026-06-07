from pydantic import BaseModel, Field  # type: ignore
from typing import Optional, List, Any
from datetime import datetime

class ProjectBase(BaseModel):
    name: str
    description: str
    timeline_start: Optional[datetime] = None
    timeline_end: datetime
    status: str = "ON_TRACK" # ON_TRACK, AT_RISK, DELAYED, DONE
    progress_percentage: int = 0
    lead_id: Optional[str] = None
    milestones: List[dict] = [] # List of {title: str, date: datetime}
    backup_plan: Optional[str] = None
    readable_id: Optional[str] = None
    current_risk: Optional[str] = None
    archived: bool = False

class ProjectCreate(ProjectBase):
    team_members: List[str] = [] # ObjectIDs of users

class ProjectInDB(ProjectBase):
    id: str = Field(alias="_id")
    team_members: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
class ProjectResponse(ProjectBase):
    id: str
    team_members: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    lead_id: Optional[str] = None
    milestones: List[dict] = [] # List of {title: str, date: datetime}
    backup_plan: Optional[str] = None
    # For populated info
    lead_info: Optional[Any] = None
    team_members_info: List[Any] = []
    specification: Optional[Any] = None
    stats: Optional[Any] = None

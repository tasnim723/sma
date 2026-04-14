from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone_number: Optional[str] = ""
    position: Optional[str] = ""
    role: str = "TEAM_MEMBER" # ROLE: PROJECT_MANAGER, TEAM_LEAD, TEAM_MEMBER
    skills: List[str] = []
    cv_url: Optional[str] = ""
    linkedin_url: Optional[str] = ""
    github_url: Optional[str] = ""
    google_id: Optional[str] = None
    auth_provider: str = "local"  # "local" ou "google"
    avatar_url: Optional[str] = ""
    grade: Optional[str] = ""  # Junior, Senior, Expert
    experience: Optional[str] = ""  # Description expérience
    xp: int = 0
    weekly_xp: int = 0
    level: int = 1

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    id: str = Field(alias="_id")
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
class UserResponse(UserBase):
    id: str
    xp: int = 0
    weekly_xp: int = 0
    level: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    position: Optional[str] = None
    skills: Optional[List[str]] = None
    grade: Optional[str] = None
    experience: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    cv_url: Optional[str] = None
    phone_number: Optional[str] = None

class GoogleLoginRequest(BaseModel):
    token: str

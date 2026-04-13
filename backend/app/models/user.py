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

class UserCreate(UserBase):
    password: str

class GoogleLoginRequest(BaseModel):
    credential: str  # id_token envoyé par Google

class UserInDB(UserBase):
    id: str = Field(alias="_id")
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
class UserResponse(UserBase):
    id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    position: Optional[str] = None
    skills: Optional[List[str]] = None

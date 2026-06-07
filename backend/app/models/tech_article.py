from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class TechArticleBase(BaseModel):
    title: str
    description: str
    category: str
    type: str  # "ARTICLE" or "VIDEO"
    priority: Optional[str] = None  # Legacy, making it optional
    score: int = Field(default=80, ge=0, le=100) # New scoring system
    image: str
    link: str

class TechArticleCreate(TechArticleBase):
    pass

class TechArticleInDB(TechArticleBase):
    id: str = Field(alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    tech_tag: Optional[str] = None

class TechArticleResponse(TechArticleBase):
    id: str
    created_at: datetime
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    tech_tag: Optional[str] = None

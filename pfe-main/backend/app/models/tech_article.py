from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class TechArticleBase(BaseModel):
    title: str
    description: str
    category: str
    type: str  # "ARTICLE" or "VIDEO"
    priority: str # "Haute priorité", "Priorité", "Vanguard"
    image: str
    link: str

class TechArticleCreate(TechArticleBase):
    pass

class TechArticleInDB(TechArticleBase):
    id: str = Field(alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TechArticleResponse(TechArticleBase):
    id: str
    created_at: datetime

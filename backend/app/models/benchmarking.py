from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

class CompetitorFeature(BaseModel):
    name: str
    status: str # "Present", "Partial", "Missing"
    notes: Optional[str] = None

class Competitor(BaseModel):
    name: str
    logo: Optional[str] = None
    market_share: Optional[float] = None
    strengths: List[str] = []
    weaknesses: List[str] = []
    features: List[CompetitorFeature] = []

class BenchmarkingReportBase(BaseModel):
    project_id: str
    title: str
    category: str # "Technical", "UI/UX", "Market"
    competitors: List[Competitor]
    summary: str
    kpis: Dict[str, float] = {} # e.g. {"Performance": 8.5, "Usability": 7.0}
    recommendations: List[str] = []

class BenchmarkingReportCreate(BenchmarkingReportBase):
    pass

class BenchmarkingReportResponse(BenchmarkingReportBase):
    id: str
    created_at: datetime

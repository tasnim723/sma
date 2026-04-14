from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from bson import ObjectId
from app.core.db import get_database
from app.models.benchmarking import BenchmarkingReportCreate, BenchmarkingReportResponse
from datetime import datetime

router = APIRouter()

@router.get("/", response_model=List[BenchmarkingReportResponse])
async def get_benchmarking_reports(project_id: Optional[str] = None):
    db = get_database()
    query = {}
    if project_id:
        query["project_id"] = project_id
        
    cursor = db.benchmarking_reports.find(query).sort("created_at", -1)
    reports = await cursor.to_list(length=50)
    
    return [{**report, "id": str(report["_id"])} for report in reports]

@router.post("/", response_model=BenchmarkingReportResponse)
async def create_benchmarking_report(report_in: BenchmarkingReportCreate):
    db = get_database()
    report_dict = report_in.model_dump()
    report_dict["created_at"] = datetime.utcnow()
    
    result = await db.benchmarking_reports.insert_one(report_dict)
    
    created_report = await db.benchmarking_reports.find_one({"_id": result.inserted_id})
    return {**created_report, "id": str(created_report["_id"])}

@router.get("/industry-trends")
async def get_industry_trends():
    # Mock data for innovation dashboard
    return [
        {"trend": "IA Générative", "growth": "+45%", "impact": "High"},
        {"trend": "Web3 & Decentralization", "growth": "+12%", "impact": "Medium"},
        {"trend": "Edge Computing", "growth": "+25%", "impact": "High"},
        {"trend": "Sustainable Tech", "growth": "+30%", "impact": "Critical"}
    ]

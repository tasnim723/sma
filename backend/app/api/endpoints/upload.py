import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from app.core.db import get_database
from app.models.deliverable import DeliverableCreate, DeliverableResponse
from app.api.deps import get_current_user

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=DeliverableResponse)
async def upload_deliverable(
    task_id: str = Form(...),
    project_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    db = get_database()
    deliverable = {
        "task_id": task_id,
        "project_id": project_id,
        "submitter_id": str(current_user["_id"]),
        "file_name": file.filename,
        "file_path": file_path,
        "status": "PENDING_REVIEW"
    }
    
    result = await db["deliverables"].insert_one(deliverable)
    
    # User requirement: Task -> REVIEW once deliverable is imported
    from bson import ObjectId
    await db["tasks"].update_one(
        {"_id": ObjectId(task_id)},
        {"$set": {"status": "REVIEW"}, "$push": {"attachments": file.filename}}
    )
    
    created_deliv = await db["deliverables"].find_one({"_id": result.inserted_id})
    created_deliv["_id"] = str(created_deliv["_id"])
    
    return created_deliv

@router.post("/cv")
async def upload_cv(
    file: UploadFile = File(...)
):
    import uuid
    # Use uuid to prevent file name collisions
    extension = os.path.splitext(file.filename)[1]
    unique_filename = f"cv_{uuid.uuid4().hex}{extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Return the relative URL to access this file via the mounted StaticFiles
    return {"url": f"/uploads/{unique_filename}", "filename": file.filename}

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import Response
from app.core.db import get_database
from app.models.specification import SpecificationResponse
from app.api.deps import get_current_user, check_manager_role
from bson import ObjectId
from datetime import datetime
import markdown
from xhtml2pdf import pisa
from io import BytesIO
from app.services.agents.workflow_service import generate_and_assign_tasks
from typing import List

router = APIRouter()

@router.get("/", response_model=List[SpecificationResponse])
async def list_specifications(current_user: dict = Depends(get_current_user)):
    db = get_database()
    specs_cursor = db["specifications"].find()
    specs = await specs_cursor.to_list(length=100)
    for s in specs:
        s["id"] = str(s.pop("_id"))
    return specs

@router.get("/{spec_id}/pdf")
async def download_specification_pdf(spec_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    if not ObjectId.is_valid(spec_id):
        raise HTTPException(status_code=400, detail="Invalid specification ID")
    
    spec = await db["specifications"].find_one({"_id": ObjectId(spec_id)})
    if not spec:
        raise HTTPException(status_code=404, detail="Specification not found")
    
    # Convert markdown to HTML
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: sans-serif; padding: 20px; }}
            h1 {{ color: #1e3a8a; }}
            h2 {{ color: #1e40af; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }}
            code {{ background-color: #f1f5f9; padding: 2px 4px; border-radius: 4px; }}
            pre {{ background-color: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; }}
            .mermaid {{ display: none; }} /* Mermaid diagrams don't render in simple PDF converters easily */
        </style>
    </head>
    <body>
        <h1>{spec['project_title']}</h1>
        <p><i>{spec['project_summary']}</i></p>
        <hr/>
        {markdown.markdown(spec['markdown_content'], extensions=['extra', 'codehilite'])}
    </body>
    </html>
    """
    
    # Generate PDF
    result = BytesIO()
    pisa_status = pisa.CreatePDF(BytesIO(html_content.encode("utf-8")), dest=result)
    
    if pisa_status.err:
        raise HTTPException(status_code=500, detail="Failed to generate PDF")
    
    pdf_content = result.getvalue()
    result.close()
    
    filename = f"specification_{spec['project_title'].replace(' ', '_')}.pdf"
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.delete("/{spec_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_specification(spec_id: str, current_user: dict = Depends(check_manager_role)):
    db = get_database()
    if not ObjectId.is_valid(spec_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    result = await db["specifications"].delete_one({"_id": ObjectId(spec_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Specification not found")
    
    return None

@router.post("/import", response_model=SpecificationResponse)
async def import_specification(
    project_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(check_manager_role)
):
    db = get_database()
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    # Read file content
    content = await file.read()
    markdown_text = content.decode("utf-8")
    
    # Get project info for context
    project = await db["projects"].find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # 1. Delete existing specifications for this project (One spec rule)
    await db["specifications"].delete_many({"project_id": project_id})
    
    # 2. Create new specification
    new_spec = {
        "project_id": project_id,
        "project_title": project["name"],
        "project_summary": project["description"][:200],
        "markdown_content": markdown_text,
        "methodology": "SCRUM",
        "created_at": datetime.utcnow()
    }
    
    result = await db["specifications"].insert_one(new_spec)
    created_spec = await db["specifications"].find_one({"_id": result.inserted_id})
    created_spec["id"] = str(created_spec.pop("_id"))
    
    # 3. Trigger Task Regeneration (Automatically update tasks)
    # We run this in the background (or wait for it)
    try:
        await generate_and_assign_tasks(project_id, project["name"], markdown_text)
    except Exception as e:
        print(f"Error during task regeneration after import: {str(e)}")
        # We don't fail the whole request because the spec was saved
        
    return created_spec

import json
import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from app.api.deps import get_current_user, check_manager_role
from app.services.wizard_service import parse_file_content, analyze_project_with_ai

router = APIRouter()

@router.post("/wizard")
async def project_wizard(
    mode: str = Form(...),
    project_name: str = Form(...),
    description: Optional[str] = Form(None),
    deadline: Optional[str] = Form(None),
    team_size: Optional[str] = Form(None),
    files: List[UploadFile] = File([]),
    current_user: dict = Depends(check_manager_role)
):
    """
    Unified wizard endpoint that orchestrates project creation via AI.
    Streams progress updates using Server-Sent Events (SSE).
    """

    # 1. Parse Files (if any and in import mode)
    files_content = ""
    if mode == "import" and files:
        for file in files:
            content_bytes = await file.read()
            text = await parse_file_content(content_bytes, file.filename)
            files_content += f"--- FILE: {file.filename} ---\n{text}\n\n"

    async def event_generator():
        try:
            async for update in analyze_project_with_ai(
                mode=mode,
                project_name=project_name,
                description=description,
                files_content=files_content,
                deadline=deadline,
                team_size=team_size
            ):
                yield f"data: {json.dumps(update)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'phase': 'ERROR', 'message': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

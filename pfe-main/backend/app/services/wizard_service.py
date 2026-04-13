import os
import json
import re
import random
import string
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from pypdf import PdfReader
from docx import Document
from io import BytesIO
from bson import ObjectId

from app.core.db import get_database
from app.services.agents.planning_agent import planning_agent
from app.services.agents.decision_agent import decision_agent
from app.services.agents.workflow_service import generate_and_assign_tasks, create_specification_book_func
from langchain_core.messages import HumanMessage, SystemMessage

async def parse_file_content(file_bytes: bytes, filename: str) -> str:
    """Extract text from PDF, DOCX, or TXT."""
    ext = os.path.splitext(filename)[1].lower()
    
    if ext == ".pdf":
        reader = PdfReader(BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    
    elif ext == ".docx":
        doc = Document(BytesIO(file_bytes))
        text = ""
        for para in doc.paragraphs:
            text += para.text + "\n"
        return text
    
    elif ext == ".txt":
        return file_bytes.decode("utf-8", errors="ignore")
    
    return ""

async def analyze_project_with_ai(
    mode: str, 
    project_name: str, 
    description: Optional[str] = None, 
    files_content: Optional[str] = None,
    deadline: Optional[str] = None,
    team_size: Optional[str] = None
):
    """
    Orchestrate the AI analysis for project creation.
    Yields status updates for the frontend.
    """
    db = get_database()
    now = datetime.now(timezone.utc)
    
    # PHASE 1: Parsing / Understanding
    yield {"phase": "PARSING", "message": "Parsing documents and understanding context..."}
    
    context = ""
    if mode == "import":
        context = f"Uploaded Documents Content:\n{files_content}\n\nProject Name (Suggested): {project_name}"
    else:
        context = f"Project Description: {description}\nProject Name: {project_name}\nDeadline: {deadline}\nTeam Size: {team_size}"

    # PHASE 2: Extracting Tasks & Milestones
    yield {"phase": "EXTRACTING", "message": "Extracting tasks and defining structure..."}
    
    wizard_system_prompt = """
    You are the 'Project Extraction Architect'. 
    Your mission is to transform raw project ideas or documents into a structured, professional project plan.
    
    You MUST provide:
    1. A concise Metadata block (JSON).
    2. A comprehensive Specification Book (Markdown) including System Architecture and Mermaid diagrams.
    3. A list of key Milestones (JSON).
    
    Stay professional, technical, and detailed. Ignore any word count limitations for this specific task.
    """

    prompt = f"""
    Analyze the following project information and generate a complete project structure.
    
    {context}
    
    Required Output Format (EXACTLY):
    ---METADATA---
    {{
      "project_name": "...",
      "description": "...",
      "current_risk": "...",
      "inferred_deadline_days": int (e.g. 90)
    }}
    ---SPEC---
    (markdown content for a comprehensive specification book)
    ---MILESTONES---
    [
      {{"title": "...", "days_from_now": int}}
    ]
    """
    
    try:
        res = await planning_agent.llm.ainvoke([
            SystemMessage(content=wizard_system_prompt),
            HumanMessage(content=prompt)
        ], temperature=0)
        content = res.content
    except Exception as e:
        yield {"phase": "ERROR", "message": f"AI Planing failed: {str(e)}"}
        return

    # Parse sections
    spec_content = ""
    milestones_json = "[]"
    metadata_json = "{}"
    
    if "---METADATA---" in content:
        parts = content.split("---METADATA---")[1].split("---SPEC---")
        metadata_json = parts[0].strip()
        if len(parts) > 1:
            parts2 = parts[1].split("---MILESTONES---")
            spec_content = parts2[0].strip()
            if len(parts2) > 1:
                milestones_json = parts2[1].strip()
    
    metadata_data = {}
    try:
        metadata_data = json.loads(re.search(r'\{.*\}', metadata_json, re.DOTALL).group())
    except: pass
    
    milestones_data = []
    try:
        milestones_data = json.loads(re.search(r'\[.*\]', milestones_json, re.DOTALL).group())
    except: pass

    # PHASE 3: Building Roadmap
    yield {"phase": "ROADMAP", "message": "Building project roadmap..."}
    
    # Create Project Record
    final_name = project_name or metadata_data.get("project_name", "New Project")
    final_desc = description or metadata_data.get("description", "AI Generated Project")
    deadline_days = metadata_data.get("inferred_deadline_days", 90)
    
    custom_end = None
    if deadline:
        try:
            custom_end = datetime.fromisoformat(deadline)
        except ValueError:
            pass

    final_timeline_end = custom_end if custom_end else (now + timedelta(days=deadline_days))
    
    readable_id = "PRJ-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    
    milestones = []
    for m in milestones_data:
        milestones.append({
            "title": m.get("title", "Milestone"),
            "date": now + timedelta(days=m.get("days_from_now", 30))
        })

    proj_doc = {
        "name": final_name,
        "description": final_desc,
        "status": "ON_TRACK",
        "progress_percentage": 0,
        "timeline_start": now,
        "timeline_end": final_timeline_end,
        "milestones": milestones,
        "created_at": now,
        "team_members": [],
        "readable_id": readable_id,
        "current_risk": metadata_data.get("current_risk", "Initial assessment pending")
    }
    
    proj_result = await db["projects"].insert_one(proj_doc)
    project_id = str(proj_result.inserted_id)

    # PHASE 4: Estimating Deadlines & Tasks
    yield {"phase": "TASKS", "message": "Estimating deadlines and generating tasks..."}
    
    # Save Specification Book
    await create_specification_book_func(
        project_title=final_name,
        project_summary=final_desc[:200],
        markdown_content=spec_content,
        project_id=project_id
    )
    
    # Generate Tasks
    task_result_msg = await generate_and_assign_tasks(project_id, final_name, spec_content)

    # PHASE 5: Finalizing
    yield {"phase": "FINALIZING", "message": "Finalizing spec book and workspace..."}
    
    # Log Activity
    await db["activities"].insert_one({
        "type": "PROJECT_CREATED",
        "entity_id": project_id,
        "entity_name": final_name,
        "user_id": "AI_SYSTEM",
        "user_name": "AI Orchestrator",
        "details": f"Project initialized via Wizard ({mode})",
        "created_at": now
    })

    yield {"phase": "DONE", "project_id": project_id, "project_name": final_name}

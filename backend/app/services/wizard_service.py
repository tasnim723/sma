import os
import json
import re
import random
import string
import asyncio
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from pypdf import PdfReader
from docx import Document
from io import BytesIO
from bson import ObjectId
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

from app.core.db import get_database
from app.services.agents.planning_agent import planning_agent
from app.services.agents.decision_agent import decision_agent
from app.services.agents.workflow_service import generate_and_assign_tasks, create_specification_book_func
from langchain_core.messages import HumanMessage, SystemMessage
from app.core.keys import get_rotated_groq_key

load_dotenv()

def get_wizard_llm():
    """Dedicated LLM for the wizard — using local Ollama instance or fallback to Groq."""
    import requests
    use_local = str(os.getenv("USE_LOCAL_AI", "false")).lower() == "true"
    
    if use_local:
        ollama_url = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
        model_name = os.getenv("OLLAMA_MODEL", "llama3.2")
        
        try:
            res = requests.get(f"{ollama_url}/api/tags", timeout=2)
            if res.status_code == 200:
                return ChatOpenAI(
                    temperature=0,
                    model=model_name,
                    max_tokens=8192,
                    base_url=f"{ollama_url}/v1",
                    api_key="ollama-local",
                    max_retries=3,
                    timeout=120
                )
        except Exception:
            pass
        
    api_key = get_rotated_groq_key()
    return ChatOpenAI(
        temperature=0, 
        model="llama-3.1-8b-instant",
        max_tokens=4096,
        base_url="https://api.groq.com/openai/v1",
        api_key=api_key,
        max_retries=3,
        timeout=120
    )

async def parse_file_content(file_bytes: bytes, filename: str) -> str:
    """Extract text from PDF, DOCX, or TXT. Returns empty string on failure."""
    ext = os.path.splitext(filename)[1].lower()

    if ext == ".pdf":
        try:
            reader = PdfReader(BytesIO(file_bytes))
            text = ""
            for page in reader.pages:
                try:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                except Exception:
                    continue
            return text.strip()
        except Exception as e:
            print(f"[parse_file_content] PDF error: {e}")
            return ""

    elif ext == ".docx":
        try:
            doc = Document(BytesIO(file_bytes))
            text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
            return text.strip()
        except Exception as e:
            print(f"[parse_file_content] DOCX error: {e}")
            return ""

    elif ext in (".txt", ".md", ".rst"):
        try:
            return file_bytes.decode("utf-8", errors="ignore").strip()
        except Exception:
            return ""

    # Unknown extension — try raw UTF-8 decode as last resort
    try:
        return file_bytes.decode("utf-8", errors="ignore").strip()
    except Exception:
        return ""

async def analyze_project_with_ai(
    mode: str, 
    project_name: str, 
    description: Optional[str] = None, 
    files_content: Optional[str] = None,
    deadline: Optional[str] = None,
    start_date: Optional[str] = None,
    team_size: Optional[str] = None,
    lead_id: Optional[str] = None,
    team_members: Optional[list] = None,
    validated_tasks: Optional[str] = None,
    veille_articles: Optional[str] = None
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
        if description:
            context += f"\n\nTech Watch Integration Details:\n{description}"
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
        wizard_llm = get_wizard_llm()
        res = None
        last_error = None
        for attempt in range(3):
            try:
                res = await wizard_llm.ainvoke([
                    SystemMessage(content=wizard_system_prompt),
                    HumanMessage(content=prompt)
                ])
                break
            except Exception as loop_e:
                print(f"DEBUG wizard: AI call attempt {attempt+1} failed: {str(loop_e)}")
                last_error = loop_e
                if attempt < 2:
                    await asyncio.sleep(2)
        if res is None:
            raise last_error
            
        content = res.content
        print(f"DEBUG wizard: AI responded, content length={len(content)}")
    except Exception as e:
        print(f"ERROR wizard LLM call: {str(e)}")
        yield {"phase": "ERROR", "message": f"AI Planning failed: {str(e)}"}
        return

    # Parse sections robustly
    metadata_data = {}
    spec_content = ""
    milestones_data = []
    
    # 1. Extract METADATA JSON
    metadata_json = "{}"
    metadata_match = re.search(r'(?:---|###|\*\*|#)*\s*METADATA\s*(?:---|###|\*\*|#)*\s*(\{.*?\})', content, re.DOTALL | re.IGNORECASE)
    if metadata_match:
        metadata_json = metadata_match.group(1).strip()
    else:
        # Fallback: find the first JSON object in the entire response
        first_obj_match = re.search(r'\{.*?\}', content, re.DOTALL)
        if first_obj_match:
            metadata_json = first_obj_match.group(0).strip()
            
    try:
        metadata_data = json.loads(re.search(r'\{.*\}', metadata_json, re.DOTALL).group())
    except:
        metadata_data = {}

    # 2. Extract MILESTONES JSON
    milestones_json = "[]"
    milestones_match = re.search(r'(?:---|###|\*\*|#)*\s*MILESTONES\s*(?:---|###|\*\*|#)*\s*(\[.*?\])', content, re.DOTALL | re.IGNORECASE)
    if milestones_match:
        milestones_json = milestones_match.group(1).strip()
    else:
        # Fallback: find the first JSON array in the response
        first_arr_match = re.search(r'\[.*?\]', content, re.DOTALL)
        if first_arr_match:
            milestones_json = first_arr_match.group(0).strip()
            
    try:
        milestones_data = json.loads(re.search(r'\[.*\]', milestones_json, re.DOTALL).group())
    except:
        milestones_data = []

    # 3. Extract SPEC Content
    spec_section_match = re.search(r'(?:---|###|\*\*|#)*\s*(?:SPECIFICATION|SPEC|CAHIER DES CHARGES)\s*(?:---|###|\*\*|#)*\n(.*)\n(?:---|###|\*\*|#)*\s*MILESTONES', content, re.DOTALL | re.IGNORECASE)
    if spec_section_match:
        spec_content = spec_section_match.group(1).strip()
    else:
        # Try splitting on SPECIFICATION/SPEC/CAHIER DES CHARGES
        spec_split = re.split(r'(?:---|###|\*\*|#)*\s*(?:SPECIFICATION|SPEC|CAHIER DES CHARGES)\s*(?:---|###|\*\*|#)*', content, flags=re.IGNORECASE)
        if len(spec_split) > 1:
            spec_body = spec_split[1]
            milestones_split = re.split(r'(?:---|###|\*\*|#)*\s*MILESTONES\s*(?:---|###|\*\*|#)*', spec_body, flags=re.IGNORECASE)
            spec_content = milestones_split[0].strip()
        else:
            # Absolute fallback
            spec_content = content.strip()
            
    # Cleanup markdown wrapper block if present in spec_content
    spec_content = spec_content.strip()
    spec_content = re.sub(r'^(?:BOOK)?\s*```(?:markdown)?\s*', '', spec_content, flags=re.IGNORECASE)
    spec_content = re.sub(r'\s*```$', '', spec_content)
    # Strip any residual AI section markers that bled into spec content
    spec_content = re.sub(r'---MILESTONES---[\s\S]*', '', spec_content, flags=re.IGNORECASE)
    spec_content = re.sub(r'---METADATA---[\s\S]*?(?=##|$)', '', spec_content, flags=re.IGNORECASE)
    spec_content = re.sub(r'---BACKUP---[\s\S]*?(?=##|$)', '', spec_content, flags=re.IGNORECASE)
    # Remove trailing JSON arrays (milestone bleed-through)
    spec_content = re.sub(r'\n\s*\[[\s\S]*?\]\s*$', '', spec_content)
    spec_content = spec_content.strip()

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
            if custom_end.tzinfo is None:
                custom_end = custom_end.replace(tzinfo=timezone.utc)
        except ValueError:
            pass

    custom_start = now
    if start_date:
        try:
            custom_start = datetime.fromisoformat(start_date)
            if custom_start.tzinfo is None:
                custom_start = custom_start.replace(tzinfo=timezone.utc)
        except ValueError:
            pass

    final_timeline_end = custom_end if custom_end else (now + timedelta(days=deadline_days))
    
    readable_id = "PRJ-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    
    milestones = []
    for m in milestones_data:
        milestones.append({
            "title": m.get("title", "Milestone"),
            "date": custom_start + timedelta(days=m.get("days_from_now", 30))
        })

    proj_doc = {
        "name": final_name,
        "description": final_desc,
        "status": "ON_TRACK",
        "progress_percentage": 0,
        "timeline_start": custom_start,
        "timeline_end": final_timeline_end,
        "milestones": milestones,
        "created_at": now,
        "team_members": team_members or [],
        "readable_id": readable_id,
        "current_risk": metadata_data.get("current_risk", "Initial assessment pending")
    }
    if lead_id:
        proj_doc["lead_id"] = lead_id
    
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
    
    # Use validated tasks from frontend if provided, otherwise generate via AI
    if validated_tasks:
        try:
            tasks_list = json.loads(validated_tasks)
            if isinstance(tasks_list, list) and len(tasks_list) > 0:
                # Sort by AI-suggested priority: HIGH first, then MEDIUM, then LOW
                priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
                tasks_list.sort(key=lambda t: priority_order.get(str(t.get("priority", "MEDIUM")).upper(), 1))

                formatted_tasks = []
                for t in tasks_list:
                    # Read assignees list (used by veille task) or fallback to single assigned_member_id
                    assignee_ids = t.get("assignees", [])
                    if not assignee_ids and t.get("assigned_member_id"):
                        assignee_ids = [t["assigned_member_id"]]
                        
                    formatted_task = {
                        "title": t.get("title", "Tâche"),
                        "description": t.get("description", ""),
                        "assignee_ids": assignee_ids,
                        "priority": t.get("priority", "MEDIUM").upper() if t.get("priority") else "MEDIUM",
                        "story_points": int(t.get("story_points", t.get("duration_hours", 3))),
                        "is_deliverable": t.get("is_deliverable", False),
                        "deadline": custom_start + timedelta(days=int(t.get("days_to_deadline", 14))),
                        "project_id": project_id,
                        "status": "TODO",  # All wizard tasks start in TODO
                        "is_veille_task": t.get("is_veille_task", False),
                        "category": t.get("category", "")
                    }
                    formatted_tasks.append(formatted_task)
                if formatted_tasks:
                    await db["tasks"].delete_many({"project_id": project_id})
                    from app.services.agents.tools import create_project_tasks_func
                    await create_project_tasks_func(project_id=project_id, tasks=formatted_tasks)
                    print(f"DEBUG wizard: Inserted {len(formatted_tasks)} validated tasks from frontend.")
            else:
                # Empty list — fall back to AI generation
                await generate_and_assign_tasks(project_id, final_name, spec_content)
        except Exception as e:
            print(f"DEBUG wizard: Failed to use validated_tasks ({e}), falling back to AI generation.")
            await generate_and_assign_tasks(project_id, final_name, spec_content)
    else:
        # No validated tasks provided — generate via AI
        await generate_and_assign_tasks(project_id, final_name, spec_content)

    # PHASE 5: Finalizing
    yield {"phase": "FINALIZING", "message": "Finalizing spec book and workspace..."}

    # ── VEILLE TECHNOLOGIQUE TASK IS NOW HANDLED IN FRONTEND BACKLOG ──
    # The frontend injects the task locally so the user can review/edit it, 
    # and it is saved via validated_tasks. No backend-side injection needed here.

    # ── SEND IN-APP & EMAIL NOTIFICATIONS TO TEAM MEMBERS ──────────────────────────────
    try:
        from app.api.endpoints.auth import push_notification
        from app.services.email_service import send_project_assignment_email
        import asyncio as _asyncio
        members_to_notify = team_members or []
        if members_to_notify:
            member_docs = await db["users"].find(
                {"_id": {"$in": [ObjectId(m) for m in members_to_notify if ObjectId.is_valid(m)]}}
            ).to_list(length=100)
            for member in member_docs:
                member_id_str = str(member["_id"])
                
                # 1. In-app Notification for project assignment
                try:
                    await push_notification(
                        db=db,
                        user_id=member_id_str,
                        title="Nouveau Projet",
                        message=f"Vous avez été assigné au projet : {final_name}",
                        urgency="HIGH"
                    )
                except Exception as notif_err:
                    print(f"DEBUG wizard: In-app notification failed for {member_id_str}: {notif_err}")
                
                # 2. Email Notification
                email = member.get("email")
                name = member.get("full_name", "Membre")
                if email:
                    try:
                        deadline_str = final_timeline_end.strftime("%d/%m/%Y") if final_timeline_end else ""
                        await _asyncio.to_thread(
                            send_project_assignment_email,
                            email, name, final_name, final_desc[:200], deadline_str
                        )
                    except Exception as email_err:
                        print(f"DEBUG wizard: Email failed for {email}: {email_err}")

        # 3. Notify assignees about their tasks in this project
        try:
            tasks_cursor = db["tasks"].find({"project_id": project_id})
            project_tasks = await tasks_cursor.to_list(length=200)
            for task in project_tasks:
                task_assignees = task.get("assignee_ids", [])
                for assignee_id in task_assignees:
                    if assignee_id:
                        await push_notification(
                            db=db,
                            user_id=str(assignee_id),
                            title="Nouvelle Tâche",
                            message=f"Vous avez été assigné à la tâche : {task.get('title')} dans le projet : {final_name}",
                            urgency="MEDIUM"
                        )
        except Exception as task_notif_err:
            print(f"DEBUG wizard: Task assignment notifications failed: {task_notif_err}")

    except Exception as e:
        print(f"DEBUG wizard: Notifications failed: {e}")

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


# ── ÉTAPE 2 : COMPRÉHENSION SÉPARÉE ──────────────────────────────────────────

async def comprehend_project(
    manager_input: str,
    project_name: str,
    clarification_answers: Optional[str] = None,
) -> Dict[str, Any]:
    """
    ÉTAPE 2 & 3 : Analyse la demande du manager et retourne la compréhension.
    Retourne directement (non-SSE) pour permettre une pause UX.
    """
    wizard_llm = get_wizard_llm()
    comprehension_prompt = f"""Analyse cette demande de projet (contexte Netinfo).
Demande: {manager_input}
Nom du projet: {project_name}
{"Réponses complémentaires: " + clarification_answers if clarification_answers else ""}

Réponds UNIQUEMENT en JSON valide:
{{
  "project_type": "type court du projet (ex: Jeu 3D, AI SaaS, Marketplace, Application Mobile, ERP, VR, Formation...)",
  "pedagogical_objective": "objectif principal en 1 phrase courte",
  "estimated_duration": "durée (ex: 2-3 mois, 4-6 mois, 6-12 mois)",
  "complexity_level": "LOW|MEDIUM|HIGH",
  "target_team": "équipe cible",
  "is_custom_mode": false,
  "custom_category": "",
  "needs_clarification": false,
  "questions": []
}}
RÈGLE CRITIQUE — CUSTOM MODE: Si le projet NE correspond PAS à un type standard Netinfo (Jeu vidéo, VR/XR, Formation pédagogique, Hackathon, Événement, Simulation 3D), alors:
- is_custom_mode: true
- custom_category: le vrai type court (ex: \"AI SaaS\", \"Marketplace B2C\", \"ERP\", \"Application Mobile\", \"Fintech\", \"API Platform\", \"CRM\")
Si le type est ambigu, needs_clarification: true avec 1-2 questions courtes."""

    comprehension: Dict[str, Any] = {
        "project_type": "Projet technique", "pedagogical_objective": "Apprentissage pratique",
        "estimated_duration": "3 mois", "complexity_level": "MEDIUM",
        "target_team": "Équipe technique", "is_custom_mode": False,
        "custom_category": "", "needs_clarification": False, "questions": []
    }
    try:
        res = await asyncio.wait_for(
            wizard_llm.ainvoke([
                SystemMessage(content="Expert PM. Réponds UNIQUEMENT en JSON valide."),
                HumanMessage(content=comprehension_prompt)
            ]), timeout=30.0
        )
        raw = re.sub(r'```(?:json)?', '', res.content.strip()).replace('```', '').strip()
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        if m:
            comprehension = json.loads(m.group())
    except Exception as e:
        print(f"Comprehension error: {e}")
    # ── Python fallback: enforce custom mode via detect_project_category ──────
    if not comprehension.get("is_custom_mode"):
        if detect_project_category(comprehension.get("project_type", ""), project_name, manager_input) == "custom":
            comprehension["is_custom_mode"] = True
            if not comprehension.get("custom_category"):
                comprehension["custom_category"] = comprehension.get("project_type", "Projet Personnalisé")
    # Enforce needs_clarification to always be False, as requested by the user
    comprehension["needs_clarification"] = False
    comprehension["questions"] = []
    return comprehension


# ── ÉTAPE 12 : AMÉLIORATION CONTINUE ─────────────────────────────────────────

async def save_manager_preferences(
    user_id: str,
    validated_project: Dict[str, Any],
    comprehension: Dict[str, Any],
    scenario: str
) -> None:
    """ÉTAPE 12 — Sauvegarde les préférences du manager pour amélioration continue."""
    db = get_database()
    now = datetime.now(timezone.utc)
    entry = {
        "title": validated_project.get("title", ""),
        "complexity": validated_project.get("complexity", "MEDIUM"),
        "stack": validated_project.get("stack", []),
        "scenario": scenario,
        "project_type": comprehension.get("project_type", ""),
        "innovation_score": validated_project.get("innovation_score", 0),
        "timestamp": now
    }
    await db["manager_preferences"].update_one(
        {"user_id": user_id},
        {"$push": {"validated_projects": entry}, "$set": {"last_updated": now}},
        upsert=True
    )


async def get_manager_insights(user_id: str) -> Dict[str, Any]:
    """ÉTAPE 12 — Récupère les préférences apprises du manager."""
    db = get_database()
    prefs = await db["manager_preferences"].find_one({"user_id": user_id})
    if not prefs:
        return {"validated_projects": [], "insights": None}
    projects = prefs.get("validated_projects", [])
    if not projects:
        return {"validated_projects": [], "insights": None}
    from collections import Counter
    complexities = Counter(p.get("complexity") for p in projects)
    stacks_flat: list = []
    for p in projects:
        stacks_flat.extend(p.get("stack", []))
    top_stacks = [s[0] for s in Counter(stacks_flat).most_common(3)]
    scenarios = Counter(p.get("scenario") for p in projects)
    insights = {
        "total_validated": len(projects),
        "preferred_complexity": complexities.most_common(1)[0][0] if complexities else "MEDIUM",
        "top_stacks": top_stacks,
        "preferred_scenario": scenarios.most_common(1)[0][0] if scenarios else "balanced",
        "last_project_title": projects[-1].get("title") if projects else None,
    }
    return {"validated_projects": projects[-5:], "insights": insights}


# ── MULTI-PROJECT GENERATION (12 ÉTAPES) ──────────────────────────────────────

async def generate_multi_projects(
    manager_input: str,
    project_name: str,
    tech_context: Optional[str] = None,
    clarification_answers: Optional[str] = None,
    feedback: Optional[str] = None,
    comprehension_data: Optional[str] = None,
    comprehension_only: bool = False
):
    """
    Génère 3 projets complets pour le manager via le pipeline 12 étapes.
    Yields SSE events avec phases: COMPREHENSION, COMPREHENSION_DONE,
    CLARIFICATION_NEEDED, IDEATION, IDEATION_DONE, DONE.
    """
    # No need to call manually here if get_wizard_llm is used, 
    # but let's ensure it's robust if we were to use api_key directly.
    wizard_llm = get_wizard_llm()

    if comprehension_data:
        try:
            comprehension = json.loads(comprehension_data)
        except Exception:
            comprehension = {
                "project_type": "Projet technique", "pedagogical_objective": "Apprentissage pratique",
                "estimated_duration": "3 mois", "complexity_level": "MEDIUM",
                "target_team": "Équipe technique", "needs_clarification": False, "questions": []
            }
    else:
        # ── ÉTAPE 2 : COMPRÉHENSION ───────────────────────────────────────────────
        yield {"phase": "COMPREHENSION", "message": "Analyse du type de projet et des objectifs pédagogiques..."}
        await asyncio.sleep(0.3)

        comprehension_prompt = f"""Analyse cette demande de projet pédagogique/professionnel (contexte Netinfo).
Demande: {manager_input}
Nom du projet: {project_name}
{"Réponses complémentaires: " + clarification_answers if clarification_answers else ""}

Réponds UNIQUEMENT en JSON valide:
{{
  "project_type": "type court (ex: Jeu 3D temps réel, Simulation VR, Application mobile, Site web 3D...)",
  "pedagogical_objective": "objectif pédagogique principal en 1 phrase courte",
  "estimated_duration": "durée (ex: 2-3 mois, 4-6 mois, 6-12 mois)",
  "complexity_level": "LOW|MEDIUM|HIGH",
  "target_team": "équipe cible (ex: Étudiants InfoGraph 3ème année, Dev junior...)",
  "needs_clarification": false,
  "questions": []
}}
Si le type de projet ou le niveau de l'équipe sont vraiment ambigus, mets needs_clarification: true et donne 1-2 questions courtes."""

        comprehension: Dict[str, Any] = {
            "project_type": "Projet technique", "pedagogical_objective": "Apprentissage pratique",
            "estimated_duration": "3 mois", "complexity_level": "MEDIUM",
            "target_team": "Équipe technique", "needs_clarification": False, "questions": []
        }
        try:
            res = await asyncio.wait_for(
                wizard_llm.ainvoke([
                    SystemMessage(content="Expert en gestion de projets pédagogiques Netinfo. Réponds UNIQUEMENT en JSON valide."),
                    HumanMessage(content=comprehension_prompt)
                ]), timeout=30.0
            )
            raw = re.sub(r'```(?:json)?', '', res.content.strip()).replace('```', '').strip()
            m = re.search(r'\{.*\}', raw, re.DOTALL)
            if m:
                comprehension = json.loads(m.group())
        except Exception as e:
            print(f"Comprehension error: {e}")

        # Enforce needs_clarification to always be False, as requested by the user
        comprehension["needs_clarification"] = False
        comprehension["questions"] = []
        yield {"phase": "COMPREHENSION_DONE", "data": comprehension}

    # ── ÉTAPE 3 : CLARIFICATION (si nécessaire) ───────────────────────────────
    if comprehension.get("needs_clarification") and not clarification_answers:
        yield {"phase": "CLARIFICATION_NEEDED", "questions": comprehension.get("questions", [])}
        return

    if comprehension_only:
        return

    # ── ÉTAPES 5-10 : IDÉATION COMPLÈTE ──────────────────────────────────────
    yield {"phase": "IDEATION", "message": "Génération de 3 projets distincts (complexité variée)..."}
    await asyncio.sleep(0.3)

    is_custom = comprehension.get("is_custom_mode", False)
    domain_label = comprehension.get("custom_category", comprehension.get("project_type", "Projet technique"))

    if is_custom:
        tech_section = f"\nTendances technologiques/Approche technique:\n{tech_context}" if tech_context else ""
        system_role = f"Expert création projets {domain_label}."
        ideation_intro = f"Tu es un expert Senior Project Manager spécialisé en {domain_label}. Tu ne forces pas un contexte 3D/Game si ce n'est pas demandé."
        fallback_projects = [
            {"id":1,"title":f"{project_name} MVP","complexity":"LOW","innovation_score":72,"description":f"Version MVP (Minimum Viable Product) de '{manager_input}'. Fonctionnalités essentielles pour une mise sur le marché rapide.","visual_style":"Minimaliste et fonctionnel","artistic_direction":"UI épurée, focus sur l'UX et l'efficacité","ambiance":"Professionnelle et claire","stack":["React / Vue","Node.js / Python","PostgreSQL"],"modules":["Authentification","Core Features","Dashboard basique"],"team_distribution":{"Développeurs Full-Stack":50,"Designers UX/UI":25,"DevOps & QA":25},"deliverables":["MVP Fonctionnel","Code source","Documentation de base"],"scenarios":{"fast":{"duration_weeks":4,"description":"MVP avec features essentielles","timeline":[{"phase":"🔍 Specs & Maquettes","duration_weeks":1,"percentage_start":0},{"phase":"⚙️ Développement Core","duration_weeks":2,"percentage_start":25},{"phase":"🚀 Tests & Livraison","duration_weeks":1,"percentage_start":75}]},"balanced":{"duration_weeks":8,"description":"Version complète avec tests","timeline":[{"phase":"🔍 Specs & Architecture","duration_weeks":1,"percentage_start":0},{"phase":"⚙️ Développement Backend & API","duration_weeks":3,"percentage_start":12},{"phase":"🎨 Intégration Frontend","duration_weeks":2,"percentage_start":50},{"phase":"🧪 Tests & QA","duration_weeks":1,"percentage_start":75},{"phase":"🚀 Déploiement","duration_weeks":1,"percentage_start":87}]},"advanced":{"duration_weeks":14,"description":"Version optimisée","timeline":[{"phase":"🔍 Recherche & UX Design","duration_weeks":2,"percentage_start":0},{"phase":"⚙️ Développement Core","duration_weeks":5,"percentage_start":14},{"phase":"🎨 UI & Animations","duration_weeks":3,"percentage_start":50},{"phase":"🧪 Tests & Optimisation","duration_weeks":2,"percentage_start":71},{"phase":"🚀 Déploiement & Monitoring","duration_weeks":2,"percentage_start":86}]}},"versions":{"v1":"Prototype fonctionnel","v2":"MVP complet","v3":"Version stable polish"},"comparison_score":68},
            {"id":2,"title":f"{project_name} V1","complexity":"MEDIUM","innovation_score":86,"description":f"Version professionnelle de '{manager_input}'. Architecture robuste, design soigné et fonctionnalités avancées.","visual_style":"Modern Corporate","artistic_direction":"Design System complet, micro-interactions","ambiance":"Engageante et premium","stack":["Next.js / Nuxt","API Microservices","Cloud Native"],"modules":["Fonctionnalités avancées","UI/UX premium","Analytics","Intégrations tierces"],"team_distribution":{"Développeurs Frontend":30,"Ingénieurs Backend & API":30,"Designers UX/UI":25,"DevOps & QA":15},"deliverables":["Application complète","Design System","Doc technique et API"],"scenarios":{"fast":{"duration_weeks":8,"description":"Core features","timeline":[{"phase":"🔍 Architecture & Specs","duration_weeks":1,"percentage_start":0},{"phase":"⚙️ Backend & API","duration_weeks":3,"percentage_start":12},{"phase":"🎨 Frontend & Design System","duration_weeks":2,"percentage_start":50},{"phase":"🧪 Tests & QA","duration_weeks":1,"percentage_start":75},{"phase":"🚀 Livraison","duration_weeks":1,"percentage_start":87}]},"balanced":{"duration_weeks":16,"description":"Version complète","timeline":[{"phase":"🔍 UX Research & Architecture","duration_weeks":2,"percentage_start":0},{"phase":"⚙️ Développement Backend","duration_weeks":5,"percentage_start":12},{"phase":"🎨 Frontend & Intégration","duration_weeks":4,"percentage_start":44},{"phase":"🧪 Tests & Performance","duration_weeks":3,"percentage_start":69},{"phase":"🚀 Déploiement Cloud","duration_weeks":2,"percentage_start":87}]},"advanced":{"duration_weeks":24,"description":"Version évolutive","timeline":[{"phase":"🔍 Discovery & Design Sprint","duration_weeks":3,"percentage_start":0},{"phase":"⚙️ Microservices & Core Dev","duration_weeks":8,"percentage_start":12},{"phase":"🎨 UI Premium & Animations","duration_weeks":5,"percentage_start":46},{"phase":"🧪 QA & Audit Sécurité","duration_weeks":4,"percentage_start":67},{"phase":"🚀 Déploiement & Scaling","duration_weeks":4,"percentage_start":83}]}},"versions":{"v1":"Prototype et architecture","v2":"Features complètes","v3":"Version production"},"comparison_score":85},
            {"id":3,"title":f"{project_name} NextGen","complexity":"HIGH","innovation_score":96,"description":f"Version ambitieuse de '{manager_input}' intégrant des technologies de pointe (IA générative, data avancée).","visual_style":"Futuriste / Clean Tech","artistic_direction":"Glassmorphism, animations fluides, dark mode premium","ambiance":"Innovante, technologique","stack":["Frameworks modernes","LLM Integration","Real-time Sync","Cloud Scalable"],"modules":["Moteur IA","Real-time Features","Tableaux de bord avancés","Automatisation"],"team_distribution":{"Ingénieurs IA & ML":30,"Développeurs Full-Stack":25,"Designers UX/UI":20,"Architectes Cloud & DevOps":15,"QA & Data Engineers":10},"deliverables":["Plateforme innovante","Modèles IA configurés","Architecture scalable"],"scenarios":{"fast":{"duration_weeks":12,"description":"Prototype innovant","timeline":[{"phase":"🔍 Research & IA Design","duration_weeks":2,"percentage_start":0},{"phase":"🤖 Entraînement Modèles IA","duration_weeks":3,"percentage_start":17},{"phase":"⚙️ Développement Core","duration_weeks":4,"percentage_start":42},{"phase":"🧪 Tests & Validation","duration_weeks":2,"percentage_start":75},{"phase":"🚀 Déploiement","duration_weeks":1,"percentage_start":92}]},"balanced":{"duration_weeks":24,"description":"Version release","timeline":[{"phase":"🔍 Discovery & Architecture IA","duration_weeks":3,"percentage_start":0},{"phase":"🤖 Pipeline ML & Data","duration_weeks":6,"percentage_start":12},{"phase":"⚙️ Développement Platform","duration_weeks":7,"percentage_start":37},{"phase":"🎨 Interface & Visualisation","duration_weeks":4,"percentage_start":67},{"phase":"🧪 QA & Optimisation","duration_weeks":2,"percentage_start":83},{"phase":"🚀 Production & Monitoring","duration_weeks":2,"percentage_start":92}]},"advanced":{"duration_weeks":36,"description":"Version Enterprise","timeline":[{"phase":"🔍 Research Phase","duration_weeks":4,"percentage_start":0},{"phase":"🤖 IA Models & Training","duration_weeks":8,"percentage_start":11},{"phase":"⚙️ Core Platform Dev","duration_weeks":10,"percentage_start":33},{"phase":"🎨 Premium UI & Dashboards","duration_weeks":6,"percentage_start":61},{"phase":"🧪 Audit Sécurité & Performance","duration_weeks":4,"percentage_start":78},{"phase":"🚀 Scaling & Go-to-Market","duration_weeks":4,"percentage_start":89}]}},"versions":{"v1":"Architecture + Prototype IA","v2":"Features complètes","v3":"Version finale scalable"},"comparison_score":95}
        ]
    else:
        tech_section = f"\nTendances technologiques intégrées:\n{tech_context}" if tech_context else \
            "\nTechnologies Netinfo disponibles: Unreal Engine 5, Unity 2024, Blender 4.x, NVIDIA DLSS/RTX, Autodesk Maya 2025, Adobe Substance 3D, Houdini FX, CGS 3D VFX"
        system_role = "Expert création projets 3D/VFX/GameDev Netinfo."
        ideation_intro = "Tu es un système multi-agents de création de projets pour Netinfo (3D, VFX, GameDev, effets visuels)."
        fallback_projects = [
            {"id":1,"title":f"{project_name} Prototype","complexity":"LOW","innovation_score":72,"description":f"Projet d'initiation basé sur '{manager_input}'. Version accessible avec mécaniques simples et assets low-poly. Idéal pour débuter en production 3D temps réel.","visual_style":"Low-poly stylisé","artistic_direction":"Palette pastel, formes géométriques, rendu flat","ambiance":"Légère, colorée, accessible","stack":["Unity 2024 LTS","Blender 4.x","Adobe Photoshop"],"modules":["Core Gameplay","UI simple","Assets 3D basiques","Audio"],"team_distribution":{"Développeurs Gameplay":45,"Artistes 3D & Assets":30,"Game Designers":15,"QA & Audio":10},"deliverables":["Build PC jouable","Pack assets 3D","Documentation technique"],"scenarios":{"fast":{"duration_weeks":4,"description":"MVP fonctionnel","timeline":[{"phase":"🎮 Game Design & Prototypage","duration_weeks":1,"percentage_start":0},{"phase":"⚙️ Mécanique & Gameplay","duration_weeks":2,"percentage_start":25},{"phase":"🚀 Build & Packaging","duration_weeks":1,"percentage_start":75}]},"balanced":{"duration_weeks":8,"description":"Version complète","timeline":[{"phase":"🎮 Concept & Game Design","duration_weeks":1,"percentage_start":0},{"phase":"🎨 Modélisation 3D & Assets","duration_weeks":2,"percentage_start":12},{"phase":"⚙️ Développement Gameplay","duration_weeks":3,"percentage_start":37},{"phase":"🧪 Playtests & Debug","duration_weeks":1,"percentage_start":75},{"phase":"🚀 Build Final","duration_weeks":1,"percentage_start":87}]},"advanced":{"duration_weeks":14,"description":"Version optimisée","timeline":[{"phase":"🎮 GDD & Prototypage","duration_weeks":2,"percentage_start":0},{"phase":"🎨 Assets 3D & Animation","duration_weeks":3,"percentage_start":14},{"phase":"⚙️ Gameplay & IA Ennemis","duration_weeks":4,"percentage_start":36},{"phase":"🎵 Audio & VFX","duration_weeks":2,"percentage_start":64},{"phase":"🧪 QA & Optimisation","duration_weeks":2,"percentage_start":79},{"phase":"🚀 Polish & Release","duration_weeks":1,"percentage_start":93}]}},"versions":{"v1":"Prototype jouable","v2":"Content complet","v3":"Version finale polish"},"comparison_score":68},
            {"id":2,"title":f"{project_name} V1","complexity":"MEDIUM","innovation_score":86,"description":f"Projet professionnel basé sur '{manager_input}'. Intègre Unreal Engine 5 avec Lumen et mécaniques avancées. Direction artistique semi-réaliste avec textures PBR.","visual_style":"Semi-réaliste PBR","artistic_direction":"Lighting Lumen, textures PBR, post-process cinématique","ambiance":"Immersive, dynamique, professionnelle","stack":["Unreal Engine 5.4","Blender 4.x","Adobe Substance 3D","Houdini FX"],"modules":["Gameplay avancé","UI/UX premium","VFX Particles","Audio dynamique","Cinématiques"],"team_distribution":{"Développeurs UE5":30,"Artistes 3D & Animateurs":30,"VFX & Technical Artists":20,"Game Designers & QA":20},"deliverables":["Build complet","Assets PBR","Cinématique intro","Doc technique"],"scenarios":{"fast":{"duration_weeks":8,"description":"Core features","timeline":[{"phase":"🎮 Pré-production & GDD","duration_weeks":1,"percentage_start":0},{"phase":"🎨 Blockout & Assets PBR","duration_weeks":2,"percentage_start":12},{"phase":"⚙️ Gameplay & Blueprint","duration_weeks":3,"percentage_start":37},{"phase":"🧪 Playtests","duration_weeks":1,"percentage_start":75},{"phase":"🚀 Build & Polish","duration_weeks":1,"percentage_start":87}]},"balanced":{"duration_weeks":16,"description":"Version complète","timeline":[{"phase":"🎮 Pré-production Complète","duration_weeks":2,"percentage_start":0},{"phase":"🎨 Modélisation & Texturing PBR","duration_weeks":4,"percentage_start":12},{"phase":"⚙️ Gameplay & Systèmes","duration_weeks":4,"percentage_start":37},{"phase":"✨ VFX & Cinématiques","duration_weeks":3,"percentage_start":62},{"phase":"🧪 QA & Optimisation","duration_weeks":2,"percentage_start":81},{"phase":"🚀 Gold Master","duration_weeks":1,"percentage_start":94}]},"advanced":{"duration_weeks":24,"description":"Version AAA","timeline":[{"phase":"🎮 Design Sprint & Prototypage","duration_weeks":3,"percentage_start":0},{"phase":"🎨 Art Pipeline & Assets AAA","duration_weeks":6,"percentage_start":12},{"phase":"⚙️ Core Systems & IA","duration_weeks":6,"percentage_start":37},{"phase":"✨ VFX & Post-Process","duration_weeks":4,"percentage_start":62},{"phase":"🧪 QA Intensive","duration_weeks":3,"percentage_start":79},{"phase":"🚀 Release Candidate","duration_weeks":2,"percentage_start":92}]}},"versions":{"v1":"Prototype + mécaniques","v2":"Features + VFX","v3":"Version complète + IA"},"comparison_score":85},
            {"id":3,"title":f"{project_name} NextGen","complexity":"HIGH","innovation_score":96,"description":f"Projet AAA next-gen basé sur '{manager_input}'. Pipeline CGS niveau studio avec ray-tracing NVIDIA, IA intégrée et effets visuels hollywoodiens sous Unreal Engine 5.","visual_style":"Photoréaliste / Ray-tracing","artistic_direction":"Pipeline CGS studio, NVIDIA RTX, effets VFX Hollywood","ambiance":"Épique, photoréaliste, immersive","stack":["Unreal Engine 5.4 + Lumen","NVIDIA DLSS 3","Adobe Substance 3D","Houdini FX","Autodesk Maya 2025"],"modules":["Système IA","Ray-tracing temps réel","VFX CGS","Multiplayer","Cinematics AAA"],"team_distribution":{"Programmeurs Engine & IA":25,"Artistes 3D & Rigging":25,"VFX & Lighting Artists":20,"Game Designers":15,"Audio & QA":15},"deliverables":["Expérience AAA","Pipeline CGS","Assets photoréalistes","Trailer cinématique"],"scenarios":{"fast":{"duration_weeks":12,"description":"Prototype AAA","timeline":[{"phase":"🎮 Concept & Direction Artistique","duration_weeks":2,"percentage_start":0},{"phase":"🎨 Pipeline CGS & Assets","duration_weeks":3,"percentage_start":17},{"phase":"⚙️ Core Engine & Gameplay","duration_weeks":4,"percentage_start":42},{"phase":"🧪 Tests & Performance","duration_weeks":2,"percentage_start":75},{"phase":"🚀 Build Alpha","duration_weeks":1,"percentage_start":92}]},"balanced":{"duration_weeks":24,"description":"Version release","timeline":[{"phase":"🎮 Pré-production AAA","duration_weeks":3,"percentage_start":0},{"phase":"🎨 Art Direction & World Building","duration_weeks":5,"percentage_start":12},{"phase":"⚙️ Systèmes Gameplay & IA","duration_weeks":6,"percentage_start":33},{"phase":"✨ VFX & Ray-tracing","duration_weeks":4,"percentage_start":58},{"phase":"🧪 QA & Optimisation GPU","duration_weeks":3,"percentage_start":75},{"phase":"🚀 Gold Master","duration_weeks":3,"percentage_start":87}]},"advanced":{"duration_weeks":36,"description":"Version Gold Master","timeline":[{"phase":"🎮 Concept & R&D","duration_weeks":4,"percentage_start":0},{"phase":"🎨 Full Art Pipeline","duration_weeks":8,"percentage_start":11},{"phase":"⚙️ Engine Features & Multiplayer","duration_weeks":10,"percentage_start":33},{"phase":"✨ VFX Hollywoodien & Audio","duration_weeks":6,"percentage_start":61},{"phase":"🧪 QA & Certification","duration_weeks":4,"percentage_start":78},{"phase":"🚀 Launch & DLC Prep","duration_weeks":4,"percentage_start":89}]}},"versions":{"v1":"Architecture + Prototype","v2":"Features + VFX complets","v3":"Version finale Gold"},"comparison_score":95}
        ]

    ideation_prompt = f"""{ideation_intro}

Demande manager: "{manager_input}"
Nom du projet: "{project_name}"
Type: {domain_label}
Équipe: {comprehension.get('target_team','Équipe technique')}
Durée: {comprehension.get('estimated_duration','3 mois')}
{tech_section}
{('Feedback manager: ' + feedback) if feedback else ''}

Génère EXACTEMENT 3 projets distincts et comparables. Projet 1=simple, 2=intermédiaire, 3=avancé/innovant.
Adapte les stacks, l'approche visuelle (UI/UX ou Art Direction) et la complexité au type de projet ({domain_label}).
IMPORTANT CRITIQUE: La durée estimée par le manager est "{comprehension.get('estimated_duration','3 mois')}". Tu DOIS adapter le champ 'duration_weeks' de TOUS les scénarios (fast, balanced, advanced) pour les 3 projets afin qu'ils soient cohérents avec cette durée (convertie en semaines). La durée de chaque projet doit être réaliste par rapport à cette contrainte globale. Ne copie pas l'exemple JSON tel quel.
IMPORTANT CRITIQUE: N'ajoute AUCUN suffixe indiquant le niveau de complexité dans le titre du projet (ex: NE PAS écrire "Mon Projet - Simple", "Mon Projet - Avancé", "Mon Projet - Intermédiaire"). Le titre doit rester très professionnel, immersif et propre, sans révéler sa nature de "proposition n°1 ou 2".

RÈGLE CRITIQUE TIMELINE : Chaque scénario (fast, balanced, advanced) DOIT contenir un champ "timeline" : un tableau de phases de développement. Chaque phase a un nom (avec émoji), une durée en semaines, et un pourcentage de début. La somme des durées des phases DOIT être égale à duration_weeks du scénario. Les phases doivent être SPÉCIFIQUES au type de projet ({domain_label}), pas génériques.

RÈGLE CRITIQUE TEAM_DISTRIBUTION : Le champ "team_distribution" DOIT utiliser des noms de rôles RÉELS et SPÉCIFIQUES au type de projet ({domain_label}). Par exemple, pour un projet Web : {{"Développeurs Frontend": 35, "Ingénieurs Backend & API": 30, "Designers UX/UI": 20, "DevOps & QA": 15}}. Pour un jeu vidéo : {{"Développeurs Gameplay": 30, "Artistes 3D & Animateurs": 35, "Game Designers": 15, "Sound & QA": 20}}. Les pourcentages doivent totaliser 100.

Réponds UNIQUEMENT en JSON valide strict (PAS de texte avant/après):
{{
  "projects": [
    {{
      "id": 1,
      "title": "Titre accrocheur du projet",
      "complexity": "LOW",
      "innovation_score": 72,
      "description": "Description complète du projet en 3 phrases concrètes.",
      "visual_style": "Ex: Low-poly stylisé / Clean minimaliste / Material Design",
      "artistic_direction": "Ex: Palette pastel / Corporate premium / Flat design",
      "ambiance": "Ambiance ou feeling global",
      "stack": ["Techno 1", "Techno 2", "Techno 3"],
      "modules": ["Module 1", "Module 2", "Module 3", "Module 4"],
      "team_distribution": {{"Rôle spécifique 1": 40, "Rôle spécifique 2": 30, "Rôle spécifique 3": 20, "Rôle spécifique 4": 10}},
      "deliverables": ["Livrable 1", "Livrable 2", "Livrable 3"],
      "scenarios": {{
        "fast": {{
          "duration_weeks": 4,
          "description": "MVP / Version rapide",
          "timeline": [
            {{"phase": "🔍 Phase spécifique 1", "duration_weeks": 1, "percentage_start": 0}},
            {{"phase": "⚙️ Phase spécifique 2", "duration_weeks": 2, "percentage_start": 25}},
            {{"phase": "🚀 Phase spécifique 3", "duration_weeks": 1, "percentage_start": 75}}
          ]
        }},
        "balanced": {{
          "duration_weeks": 8,
          "description": "Version complète équilibrée",
          "timeline": [
            {{"phase": "🔍 Phase spécifique 1", "duration_weeks": 2, "percentage_start": 0}},
            {{"phase": "⚙️ Phase spécifique 2", "duration_weeks": 3, "percentage_start": 25}},
            {{"phase": "🎨 Phase spécifique 3", "duration_weeks": 2, "percentage_start": 62}},
            {{"phase": "🚀 Phase spécifique 4", "duration_weeks": 1, "percentage_start": 87}}
          ]
        }},
        "advanced": {{
          "duration_weeks": 14,
          "description": "Version finale avec bonus",
          "timeline": [
            {{"phase": "🔍 Phase spécifique 1", "duration_weeks": 2, "percentage_start": 0}},
            {{"phase": "⚙️ Phase spécifique 2", "duration_weeks": 5, "percentage_start": 14}},
            {{"phase": "🎨 Phase spécifique 3", "duration_weeks": 4, "percentage_start": 50}},
            {{"phase": "🧪 Phase spécifique 4", "duration_weeks": 2, "percentage_start": 78}},
            {{"phase": "🚀 Phase spécifique 5", "duration_weeks": 1, "percentage_start": 93}}
          ]
        }}
      }},
      "versions": {{
        "v1": "Prototype fonctionnel",
        "v2": "Ajout du contenu complet",
        "v3": "Version finale polish"
      }},
      "comparison_score": 68
    }},
    {{...projet 2 MEDIUM...}},
    {{...projet 3 HIGH...}}
  ]
}}"""

    projects = fallback_projects
    try:
        res = await asyncio.wait_for(
            wizard_llm.ainvoke([
                SystemMessage(content=f"{system_role} Réponds UNIQUEMENT en JSON valide."),
                HumanMessage(content=ideation_prompt)
            ]), timeout=45.0
        )
        raw = re.sub(r'```(?:json)?', '', res.content.strip()).replace('```', '').strip()
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        if m:
            data = json.loads(m.group())
            if data.get("projects") and len(data["projects"]) >= 2:
                projects = data["projects"]
    except Exception as e:
        print(f"Ideation error: {e}")

    yield {"phase": "IDEATION_DONE", "projects": projects}
    yield {"phase": "DONE", "projects": projects, "comprehension": comprehension}


async def suggest_alternative_task(project_title: str, project_description: str, rejected_task_title: str, existing_tasks: List[str]) -> Dict[str, Any]:
    """Suggère une tâche alternative suite à un rejet du manager."""
    from langchain_core.messages import HumanMessage, SystemMessage
    llm = get_wizard_llm()
    
    prompt = f"""Le manager a REJETÉ la tâche : "{rejected_task_title}" pour le projet {project_title}.
Contexte : {project_description}
Tâches déjà approuvées : {", ".join(existing_tasks)}

Propose une SEULE nouvelle tâche alternative pertinente qui n'est pas déjà dans la liste.
Réponds UNIQUEMENT avec un objet JSON :
{{
  "id": "new-task-uuid",
  "title": "Titre",
  "description": "...",
  "reasoning": "Pourquoi cette alternative est meilleure ?",
  "priority": "High" | "Medium" | "Low",
  "duration_hours": nombre,
  "role": "...",
  "dependencies": [],
  "tools": [],
  "risk_level": "Low",
  "category": "...",
  "sprint": 1,
  "status": "pending"
}}"""

    try:
        res = await llm.ainvoke([
            SystemMessage(content="Tu es un assistant PM créatif. Réponds uniquement en JSON."),
            HumanMessage(content=prompt)
        ])
        raw = re.sub(r'```(?:json)?', '', res.content.strip()).replace('```', '').strip()
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        if m:
            return json.loads(m.group())
        return {}
    except Exception as e:
        print(f"Alternative task error: {e}")
        return {}

# ── DÉTECTION DU TYPE DE PROJET ─────────────────────────────────────────────

def detect_project_category(project_type: str, project_title: str = "", description: str = "") -> str:
    """
    ÉTAPE 1 — Détecte automatiquement la catégorie du projet.
    Retourne : 'game', 'vr', 'simulation3d', 'hackathon', 'event', 'formation', ou 'general'
    """
    text = (project_type + " " + project_title + " " + description).lower()

    # VR / XR / Réalité virtuelle (priorité haute car overlap avec jeu)
    if any(k in text for k in [
        "vr", "réalité virtuelle", "realite virtuelle", "virtual reality",
        "oculus", "metaverse", "casque vr", "immersif", "xr", "ar",
        "mixed reality", "expérience immersive", "immersive"
    ]):
        return "vr"

    # Jeu vidéo / GameDev
    if any(k in text for k in [
        "jeu", "game", "gaming", "gameplay", "joueur", "rpg", "fps", "mmo",
        "arcade", "level design", "niveau", "mécaniques de jeu", "game design",
        "platformer", "indie", "aaa", "esport", "multijoueur", "unreal engine", "unity"
    ]):
        return "game"

    # Hackathon
    if any(k in text for k in [
        "hackathon", "hack", "challenge technique", "marathon de code",
        "compétition dev", "concours de développement", "sprint créatif"
    ]):
        return "hackathon"

    # Événement
    if any(k in text for k in [
        "événement", "event", "conférence", "conference", "salon", "expo",
        "exposition", "meetup", "séminaire", "gala", "cérémonie", "forum",
        "festival", "concert", "journée portes ouvertes"
    ]):
        return "event"

    # Formation / Éducation
    if any(k in text for k in [
        "formation", "éducation", "education", "apprentissage", "pédagogique",
        "cours", "enseigner", "etudiant", "élève", "apprenant",
        "certification", "e-learning", "lms", "scorm", "quiz", "module de cours",
        "objectif pédagogique", "training"
    ]):
        return "formation"

    # Simulation 3D / VFX / CGS
    if any(k in text for k in [
        "simulation 3d", "simulation", "modélisation", "modeling", "rendu",
        "blender", "maya", "houdini", "cgs", "vfx", "effets visuels",
        "3d", "visualisation 3d", "archviz", "animation 3d"
    ]):
        return "simulation3d"

    return "custom"


def get_project_steps_and_tasks_context(category: str) -> Dict[str, Any]:
    """
    ÉTAPE 2 — Retourne les étapes et le contexte de tâches adapté à chaque type de projet.
    Ces informations sont injectées dans le prompt IA pour guider la génération.
    """
    contexts = {
        "game": {
            "steps": [
                "1. Concept du jeu & mécaniques",
                "2. Conception du gameplay",
                "3. Design des niveaux (Level Design)",
                "4. Art & animation",
                "5. Développement du jeu",
                "6. Tests & équilibrage"
            ],
            "task_types": [
                "Prototypage des mécaniques de jeu (mouvement, collisions, interactions)",
                "Game Design Document (GDD) complet",
                "Conception et blocage des niveaux (greyboxing)",
                "Système de scoring et progression du joueur",
                "Création ou intégration des assets 3D / sprites",
                "Animation des personnages (rigging, keyframe)",
                "Implémentation IA des ennemis ou PNJ",
                "Développement de l'interface utilisateur (HUD, menus)",
                "Intégration du son et de la musique dynamique",
                "Optimisation des performances (batching, LOD, draw calls)",
                "Tests de jouabilité (playtests) et équilibrage",
                "Build & packaging final pour la plateforme cible"
            ],
            "roles": ["Game Designer", "Développeur Unity/Unreal", "Artiste 3D", "Animateur", "QA Tester"],
            "tools": ["Unity / Unreal Engine", "Blender", "Adobe Substance 3D", "Perforce / Git LFS"]
        },
        "formation": {
            "steps": [
                "1. Définition des objectifs pédagogiques",
                "2. Conception pédagogique (instructional design)",
                "3. Structuration du contenu",
                "4. Design de l'expérience d'apprentissage",
                "5. Système d'évaluation",
                "6. Déploiement et suivi"
            ],
            "task_types": [
                "Rédaction des objectifs pédagogiques SMART",
                "Analyse des apprenants cibles (persona)",
                "Architecture du parcours de formation (plan de cours)",
                "Création des modules de contenu (slides, vidéos, fiches)",
                "Développement des activités interactives et exercices",
                "Création des quiz et évaluations formatives",
                "Intégration sur la plateforme LMS (Moodle, Canvas, etc.)",
                "Développement de simulations ou cas pratiques",
                "Enregistrement et montage des vidéos pédagogiques",
                "Tests utilisateur avec apprenants pilotes",
                "Mise en production et suivi des indicateurs d'apprentissage"
            ],
            "roles": ["Ingénieur Pédagogique", "Expert Contenu", "Développeur E-Learning", "UX Designer"],
            "tools": ["Moodle / Canvas / Docebo", "Articulate Storyline", "Adobe Captivate", "Notion / Confluence"]
        },
        "event": {
            "steps": [
                "1. Concept & objectifs de l'événement",
                "2. Conception du programme & agenda",
                "3. Logistique & installation",
                "4. Communication & marketing",
                "5. Gestion des participants",
                "6. Exécution de l'événement",
                "7. Analyse post-événement"
            ],
            "task_types": [
                "Définition du concept, thème et objectifs de l'événement",
                "Sélection et réservation du lieu",
                "Élaboration du programme et des sessions",
                "Recherche et confirmation des intervenants / speakers",
                "Création de l'identité visuelle (logo, affiches, supports)",
                "Développement du site web ou page de l'événement",
                "Mise en place du système d'inscription et de billetterie",
                "Planification logistique (catering, technique AV, sécurité)",
                "Campagne de communication digitale (réseaux sociaux, email)",
                "Coordination le jour J (équipe, timing, imprévus)",
                "Collecte des retours et analyse post-événement"
            ],
            "roles": ["Event Manager", "Chargé de Communication", "Logisticien", "Webmaster", "Community Manager"],
            "tools": ["Eventbrite / Weezevent", "Canva / Adobe Express", "Mailchimp", "Google Workspace"]
        },
        "hackathon": {
            "steps": [
                "1. Définition des challenges",
                "2. Conception du programme",
                "3. Partenariats & sponsors",
                "4. Logistique & configuration des outils",
                "5. Mise en place des mentors & jury",
                "6. Intégration des participants (onboarding)",
                "7. Exécution du hackathon",
                "8. Évaluation & récompenses"
            ],
            "task_types": [
                "Définition des thèmes et problématiques des challenges",
                "Élaboration des règles et critères d'évaluation",
                "Démarchage et onboarding des sponsors",
                "Mise en place des plateformes (Devpost, Discord, GitHub)",
                "Recrutement et briefing des mentors techniques",
                "Composition et briefing du jury",
                "Système d'inscription et de formation des équipes",
                "Préparation des ressources techniques pour les participants",
                "Organisation de la session de lancement (kickoff)",
                "Animation et suivi pendant l'événement",
                "Organisation des pitchs finaux et délibération du jury",
                "Cérémonie de remise des prix et communication des résultats"
            ],
            "roles": ["Organisateur", "Mentor Technique", "Jury Expert", "Community Manager", "Sponsor Manager"],
            "tools": ["Devpost", "Discord / Slack", "GitHub / GitLab", "Notion", "Hopin / StreamYard"]
        },
        "vr": {
            "steps": [
                "1. Conception de l'expérience immersive",
                "2. Design des interactions VR",
                "3. Création de l'environnement 3D",
                "4. Optimisation des performances XR",
                "5. Intégration du matériel VR",
                "6. Tests en réalité virtuelle"
            ],
            "task_types": [
                "Conception du storyboard et du flux d'expérience immersive",
                "Choix et configuration du hardware VR (Meta Quest, PSVR, HTC Vive)",
                "Design des interactions : teleportation, grab, gaze, hand tracking",
                "Modélisation et habillage de l'environnement 3D immersif",
                "Implémentation du world building et des éléments interactifs",
                "Configuration du système de locomotion (teleport, smooth, roomscale)",
                "Intégration des effets haptiques et du son spatialisé",
                "Optimisation pour le rendu stéréoscopique (draw calls, batching, Fixed Foveated Rendering)",
                "Gestion du confort utilisateur (anti-motion sickness)",
                "Tests QA en conditions réelles (casque VR, espace physique)",
                "Calibration et tests multi-profils utilisateurs"
            ],
            "roles": ["XR Developer", "UX Designer VR", "Artiste 3D", "Technical Artist", "QA Tester XR"],
            "tools": ["Unreal Engine / Unity XR", "OpenXR / Meta SDK", "Blender", "Wwise (audio spatial)", "SteamVR"]
        },
        "simulation3d": {
            "steps": [
                "1. Définition des objectifs de simulation",
                "2. Modélisation du système",
                "3. Conception de l'environnement 3D",
                "4. Logique des interactions",
                "5. Développement technique",
                "6. Tests & validation"
            ],
            "task_types": [
                "Définition des paramètres et règles de simulation",
                "Modélisation 3D des éléments du système (assets haute fidélité)",
                "Mise en place du pipeline de rendu (shaders, matériaux PBR)",
                "Développement du moteur physique et des collisions",
                "Implémentation du système de LOD (Level of Detail)",
                "Création du shader graph pour les effets visuels temps réel",
                "Intégration du système de particules et d'effets VFX",
                "Développement des scénarios et modes de simulation",
                "Optimisation du rendu (GPU instancing, occlusion culling)",
                "Tests de performance et benchmarks sur les plateformes cibles",
                "Validation de la fidélité de la simulation par les experts métier"
            ],
            "roles": ["Développeur 3D", "Technical Artist", "Ingénieur Simulation", "Artiste VFX", "QA Engineer"],
            "tools": ["Blender / Maya / Houdini", "Unreal Engine", "Adobe Substance 3D", "NVIDIA Omniverse", "RenderDoc"]
        },
        "general": {
            "steps": [
                "1. Analyse & cadrage",
                "2. Conception",
                "3. Développement",
                "4. Tests",
                "5. Déploiement"
            ],
            "task_types": [
                "Analyse des besoins et rédaction du cahier des charges",
                "Architecture technique et choix technologiques",
                "Mise en place de l'environnement de développement",
                "Développement des fonctionnalités principales",
                "Tests unitaires et d'intégration",
                "Documentation technique",
                "Déploiement et mise en production"
            ],
            "roles": ["Chef de Projet", "Développeur", "Designer", "QA Engineer"],
            "tools": ["Git", "Jira", "Figma", "Docker"]
        }
    }
    return contexts.get(category, contexts["general"])


# ── MODE CUSTOM : Analyse IA pour projets hors catégorie ─────────────────────

async def analyze_custom_project_type(
    project_title: str,
    project_description: str,
    project_type: str
) -> Dict[str, Any]:
    """
    CUSTOM MODE — Analyse IA approfondie pour projets hors catégorie prédéfinie.
    Génère des étapes et tâches 100% adaptées à la logique réelle du projet.
    Ne force jamais un template existant sur un projet non reconnu.
    """
    llm = get_wizard_llm()

    prompt = f"""Tu es un expert Senior Project Manager. Ce projet ne correspond à aucune catégorie standard
(Game, VR, Formation, Hackathon, Événement, Simulation 3D).

PROJET : {project_title}
DESCRIPTION : {project_description}
TYPE DÉCLARÉ : {project_type}

Analyse profondément ce projet et réponds UNIQUEMENT en JSON valide :
{{
  "custom_category": "Label court du type réel (ex: AI SaaS, Marketplace, ERP, Application Mobile, Fintech, API Platform, CRM...)",
  "what_is_built": "Ce qui est concrètement construit en 1 phrase",
  "target_users": "Utilisateurs cibles principaux",
  "main_components": ["composant 1", "composant 2", "composant 3"],
  "disciplines": ["Discipline 1", "Discipline 2"],
  "steps": [
    "1. Étape spécifique issue de la logique du projet",
    "2. Étape spécifique issue de la logique du projet",
    "3. Étape spécifique issue de la logique du projet",
    "4. Étape spécifique issue de la logique du projet",
    "5. Étape spécifique issue de la logique du projet",
    "6. Étape spécifique issue de la logique du projet"
  ],
  "task_types": [
    "Tâche concrète et actionnable spécifique au projet",
    "Tâche concrète et actionnable spécifique au projet",
    "Tâche concrète et actionnable spécifique au projet",
    "Tâche concrète et actionnable spécifique au projet",
    "Tâche concrète et actionnable spécifique au projet",
    "Tâche concrète et actionnable spécifique au projet",
    "Tâche concrète et actionnable spécifique au projet",
    "Tâche concrète et actionnable spécifique au projet"
  ],
  "roles": ["Rôle 1", "Rôle 2", "Rôle 3", "Rôle 4"],
  "tools": ["Outil 1", "Outil 2", "Outil 3", "Outil 4"],
  "needs_clarification": false,
  "clarification_question": ""
}}

EXEMPLES d'étapes attendues selon le type :
- AI SaaS → Définition Produit, Feature Design, Intégration Modèle IA, Backend Dev, Tests & Déploiement
- Marketplace → Design Plateforme, Flux Utilisateurs, Intégration Paiement, Gestion Vendeurs, Stratégie Lancement
- ERP → Recueil Besoins, Design Modules, Architecture Données, Intégration, UAT, Déploiement
- App Mobile → UX Research, Wireframing, UI Design, Dev Natif, Publication App Store

RÈGLES STRICTES :
- Les étapes doivent émerger UNIQUEMENT de la logique de CE projet, jamais d'un template générique
- JAMAIS de tâches génériques comme "Analyse des besoins" ou "Développement général"
- JAMAIS de tâches d'un autre domaine (pas de "Level Design" pour un SaaS, pas de "Inscription participants" pour une app)
- Si le projet est vraiment trop ambigu, mets needs_clarification: true et formule une question précise
- Pertinence absolue > Complétude"""

    fallback: Dict[str, Any] = {
        "custom_category": "Projet Technique Personnalisé",
        "what_is_built": (project_description or project_title)[:120],
        "target_users": "Équipe technique & utilisateurs finaux",
        "main_components": ["Frontend", "Backend", "Base de données"],
        "disciplines": ["Développement", "Design", "DevOps"],
        "steps": [
            "1. Définition du périmètre & spécifications fonctionnelles",
            "2. Architecture technique & choix technologiques",
            "3. Mise en place de l'environnement & CI/CD",
            "4. Développement des fonctionnalités core",
            "5. Tests d'intégration & assurance qualité",
            "6. Déploiement, monitoring & mise en production"
        ],
        "task_types": [
            f"Rédaction des spécifications fonctionnelles de {project_title}",
            "Conception de l'architecture technique et choix de stack",
            "Configuration de l'environnement CI/CD et pipeline de déploiement",
            "Développement des fonctionnalités principales et API",
            "Mise en place des tests unitaires et d'intégration",
            "Revue de sécurité et audit de performance",
            "Documentation technique et guide utilisateur",
            "Déploiement en production et configuration du monitoring"
        ],
        "roles": ["Chef de Projet", "Développeur Full-Stack", "DevOps Engineer", "QA Engineer"],
        "tools": ["Git / GitHub", "Docker / Kubernetes", "Jira / Linear", "Figma"],
        "needs_clarification": False,
        "clarification_question": ""
    }

    try:
        res = await asyncio.wait_for(
            llm.ainvoke([
                SystemMessage(content="Expert Senior PM. Génère UNIQUEMENT du JSON valide, sans markdown ni texte avant/après."),
                HumanMessage(content=prompt)
            ]), timeout=35.0
        )
        raw = re.sub(r'```(?:json)?', '', res.content.strip()).replace('```', '').strip()
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        if m:
            result = json.loads(m.group())
            if result.get("steps") and result.get("task_types"):
                return result
    except Exception as e:
        print(f"[Custom Mode] analyze_custom_project_type error: {e}")

    return fallback


async def generate_detailed_tasks(
    project_title: str,
    project_description: str,
    project_stack: List[str],
    scenario_name: str,
    weeks: int,
    team_members: List[Dict[str, Any]] = None,
    project_type: str = "",
    start_date: Optional[str] = None,
    deadline: Optional[str] = None
) -> List[Dict[str, Any]]:
    """ÉTAPE 10: Génère une liste de tâches hautement détaillées avec métadonnées PM et assignation d'équipe.
    Adapte dynamiquement les étapes et tâches selon le type de projet détecté."""
    from langchain_core.messages import HumanMessage, SystemMessage
    llm = get_wizard_llm()

    # ── ÉTAPE 1 : Détection automatique du type de projet ────────────────────
    category = detect_project_category(project_type, project_title, project_description)
    print(f"[Task Gen] Catégorie détectée: {category} (project_type='{project_type}')")

    # ── ÉTAPE 2 : Récupération du contexte adapté au domaine ─────────────────
    if category == "custom":
        # 🎯 MODE CUSTOM — analyse IA approfondie pour projet hors catégorie
        print(f"[Task Gen] 🎯 MODE CUSTOM activé — analyse IA en cours...")
        domain_ctx = await analyze_custom_project_type(project_title, project_description, project_type)
        category_label = domain_ctx.get("custom_category", "Projet Personnalisé")
        print(f"[Task Gen] ✅ Type personnalisé identifié : {category_label}")
        if domain_ctx.get("needs_clarification"):
            print(f"[Task Gen] ⚠️ Clarification suggérée : {domain_ctx.get('clarification_question')}")
    else:
        # Catégorie prédéfinie — utiliser le contexte du domaine
        domain_ctx = get_project_steps_and_tasks_context(category)
        category_label = category.upper()

    steps_block = "\n".join(domain_ctx["steps"])
    tasks_examples = "\n".join([f"  - {t}" for t in domain_ctx["task_types"]])
    roles_block = ", ".join(domain_ctx["roles"])
    tools_block = ", ".join(domain_ctx["tools"])

    # ── Contexte équipe ───────────────────────────────────────────────────────
    # Members are listed for context only — assignment is done manually by the manager
    team_context = ""
    if team_members:
        team_list = "\n".join([
            f"- {m.get('full_name')} (ID: {m.get('id')}, Rôle: {m.get('position')}, "
            f"Skills: {', '.join(m.get('skills', []))}, Grade: {m.get('grade')})"
            for m in team_members
        ])
        team_context = (
            f"\nÉQUIPE DISPONIBLE (pour référence uniquement) :\n{team_list}\n\n"
            f"CONSIGNE : N'assigne PAS les tâches aux membres. "
            f"Laisse 'assigned_member_id' et 'assigned_member_name' vides (null). "
            f"Le manager assignera manuellement chaque tâche."
        )

    time_context = ""
    if start_date and deadline:
        time_context = f"\nCONTRAINTES DE TEMPS IMPÉRATIVES :\n- Date de début : {start_date}\n- Deadline stricte : {deadline}\nLes sprints et tâches doivent obligatoirement s'inscrire dans cette période exacte."

    # ── ÉTAPE 3-4 : Prompt enrichi avec le contexte domaine + filtre intelligent ──
    prompt = f"""Tu es un Senior Project Manager expert en projets de type : {category_label}.

PROJET : {project_title}
DESCRIPTION : {project_description}
STACK TECHNIQUE : {", ".join(project_stack)}
SCÉNARIO : {scenario_name} ({weeks} semaines)
CATÉGORIE : {category_label}
{team_context}
{time_context}


━━━ ÉTAPES SPÉCIFIQUES POUR CE PROJET ━━━
{steps_block}

━━━ TYPES DE TÂCHES ATTENDUES ━━━
{tasks_examples}

━━━ RÔLES IMPLIQUÉS ━━━
{roles_block}

━━━ OUTILS DU DOMAINE ━━━
{tools_block}

━━━ RÈGLES STRICTES — FILTRE INTELLIGENT ━━━
1. Génère UNIQUEMENT des tâches pertinentes pour un projet de type "{category_label}".
2. INTERDIT d'inclure des tâches hors domaine :
   - Si c'est un jeu vidéo → pas de "gestion d'inscriptions" ou "onboarding participants"
   - Si c'est un SaaS → pas de "Level Design" ou "assets 3D"
   - Si c'est un hackathon → pas de "modélisation 3D" ou "intégration SDK VR"
3. Chaque tâche DOIT être spécifique, exploitable et directement liée au projet décrit.
4. Les tâches doivent COUVRIR toutes les étapes listées ci-dessus, de façon équilibrée.
5. Validation obligatoire avant chaque tâche : "Cette tâche est-elle directement utile pour CE projet ?" → NON → supprimer.

━━━ RÈGLE CRITIQUE — OUTILS & STACK ━━━
Le champ "tools" DOIT contenir des VRAIS noms d'outils/technologies spécifiques et reconnus dans l'industrie.
- UTILISE EN PRIORITÉ les technologies de la stack du projet : {", ".join(project_stack)}
- Exemples de BONS outils : "Unity 3D", "Unreal Engine 5", "Blender", "Figma", "VS Code", "Git", "Docker", "PostgreSQL", "React", "Node.js", "Jest", "Cypress", "Jira", "Postman", "MongoDB Compass", "Oculus SDK", "SteamVR", "XR Interaction Toolkit", "Photoshop", "Maya", "Substance Painter"
- INTERDIT les descriptions vagues comme "Interaction design software", "3D modeling tool", "Game engine", "IDE", "Testing framework". Remplace-les TOUJOURS par le vrai nom du logiciel.
- Chaque tâche doit avoir entre 1 et 4 outils spécifiques correspondant réellement à ce qui sera utilisé pour cette tâche.

Génère une liste exhaustive et détaillée de tâches (entre 10 et 25 tâches selon la complexité et la durée de {weeks} semaines) pour couvrir l'intégralité du projet.
Pour chaque tâche, fournis cet objet JSON précis :
{{
  "id": "task-uuid",
  "title": "Titre court et spécifique au domaine",
  "description": "Description détaillée et contextualisée",
  "reasoning": "Pourquoi cette tâche est cruciale pour CE projet de type {category_label} ?",
  "priority": "High" | "Medium" | "Low",
  "duration_hours": nombre,
  "role": "Rôle parmi ceux du domaine",
  "assigned_member_id": null,
  "assigned_member_name": null,
  "dependencies": ["id_tâche_précédente"],
  "tools": ["Vrai nom d'outil 1", "Vrai nom d'outil 2"],
  "risk_level": "High" | "Medium" | "Low",
  "mitigation": "Solution concrète pour mitiger ce risque dans le contexte {category_label}",
  "category": "Setup" | "Design" | "Development" | "Testing" | "Deployment",
  "sprint": nombre,
  "days_to_deadline": nombre,
  "status": "pending"
}}

Réponds UNIQUEMENT avec un tableau JSON [{{...}}, {{...}}].
Vérification finale obligatoire : 100% des tâches doivent être pertinentes pour un projet "{category_label}" et chaque champ "tools" doit contenir des VRAIS noms d'outils."""

    def _repair_json_array(raw_text: str) -> list:
        """Multi-strategy JSON array parser — survives common LLM formatting errors."""
        # Strategy 1: Direct parse
        text = re.sub(r'```(?:json)?', '', raw_text.strip()).replace('```', '').strip()
        m = re.search(r'\[.*\]', text, re.DOTALL)
        if m:
            candidate = m.group()
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                pass
            # Strategy 2: Fix trailing commas  ,] or ,}
            fixed = re.sub(r',\s*([}\]])', r'\1', candidate)
            try:
                return json.loads(fixed)
            except json.JSONDecodeError:
                pass
            # Strategy 3: Fix missing commas between objects  }\n{  →  },\n{
            fixed2 = re.sub(r'\}\s*\{', '},{', fixed)
            try:
                return json.loads(fixed2)
            except json.JSONDecodeError:
                pass

        # Strategy 4: Truncated output — find all complete {...} objects
        objects = []
        depth = 0
        start = None
        for i, ch in enumerate(text):
            if ch == '{':
                if depth == 0:
                    start = i
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0 and start is not None:
                    obj_str = text[start:i+1]
                    # Fix trailing commas inside object
                    obj_str = re.sub(r',\s*\}', '}', obj_str)
                    try:
                        objects.append(json.loads(obj_str))
                    except json.JSONDecodeError:
                        pass
                    start = None
        return objects

    max_attempts = 2
    for attempt in range(max_attempts):
        try:
            sys_msg = f"Tu es un assistant PM expert en projets {category.upper()}. Réponds UNIQUEMENT en JSON valide. Pas de markdown, pas de commentaires."
            if attempt > 0:
                sys_msg += " ATTENTION: Ta réponse précédente contenait du JSON invalide. Vérifie chaque virgule et accolade."
            res = await llm.ainvoke([
                SystemMessage(content=sys_msg),
                HumanMessage(content=prompt)
            ])
            tasks_parsed = _repair_json_array(res.content)
            if tasks_parsed:
                print(f"[Task Gen] ✅ {len(tasks_parsed)} tâches générées (attempt {attempt+1})")
                return tasks_parsed
            print(f"[Task Gen] ⚠️ Attempt {attempt+1}: 0 tasks parsed from LLM response")
        except Exception as e:
            print(f"[Task Gen] ❌ Attempt {attempt+1} error: {e}")

    print("[Task Gen] ❌ All attempts failed — returning empty list")
    return []

async def analyze_task_workflow(tasks: List[Dict[str, Any]], project_context: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Analyse intelligente de la collaboration AI-Manager pour détecter les problèmes de planning."""
    llm = get_wizard_llm()
    
    prompt = f"""Analyse cette liste de tâches de projet et propose des améliorations intelligentes (Smart Suggestions).
Contexte : {project_context.get('title')} - {project_context.get('description')}

Tâches actuelles :
{json.dumps(tasks, indent=2)}

Détecte :
1. Dépendances manquantes ou illogiques.
2. Tâches trop volumineuses qui devraient être divisées.
3. Déséquilibre de charge de travail entre les rôles.
4. Délais irréalistes ou risques techniques non gérés.
5. Opportunités d'optimisation (tâches parallélisables).

Pour chaque problème détecté, tu DOIS proposer une solution concrète (mitigation).
Réponds UNIQUEMENT avec un tableau JSON de suggestions :
[
  {{ 
    "type": "warning" | "info" | "success", 
    "message": "Description du problème", 
    "impact": "High" | "Medium" | "Low",
    "mitigation": "Solution concrète pour résoudre ce problème"
  }}
]"""

    try:
        res = await llm.ainvoke([
            SystemMessage(content="Tu es un auditeur de projet expert. Réponds uniquement en JSON."),
            HumanMessage(content=prompt)
        ])
        raw = re.sub(r'```(?:json)?', '', res.content.strip()).replace('```', '').strip()
        m = re.search(r'\[.*\]', raw, re.DOTALL)
        if m:
            return json.loads(m.group())
        return []
    except Exception as e:
        print(f"Workflow analysis error: {e}")
        return []


async def generate_feasibility_analysis(
    project_title: str,
    project_description: str,
    project_type: str,
    stack: List[str],
    team_size: str,
    scenario_name: str,
    weeks: int,
    start_date: Optional[str] = None,
    deadline: Optional[str] = None
) -> Dict[str, Any]:
    """
    Analyse la faisabilité d'un projet et retourne un rapport complet.
    Coûts estimés en Dinars Tunisiens (DT).
    """
    llm = get_wizard_llm()

    deadline_context = ""
    if deadline:
        deadline_context = f"\nATTENTION : Le manager a imposé une deadline stricte ({deadline})"
        if start_date:
            deadline_context += f" et une date de début ({start_date})"
        deadline_context += ".\nTa recommandation de durée (optimistic_weeks, realistic_weeks, pessimistic_weeks) DOIT être centrée autour de cette deadline (+/- 1 semaine max pour optimisation de faisabilité)."

    prompt = f"""Tu es un expert en estimation de projets {project_type} / jeux vidéo / VR.
Analyse la faisabilité de ce projet et réponds UNIQUEMENT en JSON.

PROJET : {project_title}
DESCRIPTION : {project_description}
STACK : {", ".join(stack)}
ÉQUIPE : {team_size} personnes
SCÉNARIO : {scenario_name} ({weeks} semaines)
{deadline_context}

CONTEXTE MARCHÉ TUNISIEN : Les salaires dev/3D en Tunisie sont entre 1 500 DT/mois (Junior) et 4 500 DT/mois (Senior).

Réponds UNIQUEMENT avec ce JSON :
{{
  "feasibility_score": <0-100>,
  "level": "Indie" | "Startup" | "AAA",
  "summary": "Résumé de faisabilité en 1 phrase",
  "complexity": {{
    "label": "Faible" | "Modérée" | "Élevée" | "Très Élevée",
    "score": <0-100>,
    "details": "Explication technique courte"
  }},
  "duration": {{
    "optimistic_weeks": <nombre>,
    "realistic_weeks": <nombre>,
    "pessimistic_weeks": <nombre>,
    "recommendation": "Phrase courte sur la durée recommandée"
  }},
  "cost_dt": {{
    "min": <montant en DT>,
    "max": <montant en DT>,
    "breakdown": {{
      "development": <pourcentage>,
      "design_3d": <pourcentage>,
      "tools_licenses": <pourcentage>,
      "testing_qa": <pourcentage>,
      "management": <pourcentage>
    }},
    "recommendation": "Phrase courte sur le budget"
  }},
  "risk": {{
    "global": "Faible" | "Modéré" | "Élevé" | "Critique",
    "score": <0-100>,
    "main_risks": ["risque 1", "risque 2", "risque 3"]
  }},
  "team_required": {{
    "level": "Junior" | "Mixed" | "Senior" | "Expert",
    "min_size": <nombre>,
    "recommended_size": <nombre>,
    "key_roles": ["rôle 1", "rôle 2", "rôle 3"]
  }},
  "recommendation": "success" | "warning" | "danger",
  "recommendation_text": "Conseil principal pour réussir ce projet"
}}"""

    try:
        res = await llm.ainvoke([
            SystemMessage(content="Tu es un expert en estimation de projets. Réponds UNIQUEMENT en JSON valide, sans markdown."),
            HumanMessage(content=prompt)
        ])
        raw = re.sub(r'```(?:json)?', '', res.content.strip()).replace('```', '').strip()
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        if m:
            return json.loads(m.group())
        return {}
    except Exception as e:
        print(f"Feasibility analysis error: {e}")
        return {}


async def extract_cdc_fields(file_content: str) -> dict:
    """
    Analyse un cahier des charges et extrait les champs clés
    avec un score de confiance et une évaluation des risques.
    """
    llm = get_wizard_llm()
    # Truncate to avoid token limits while keeping the most useful content
    truncated = file_content[:6000]

    prompt = f"""Tu es un expert en gestion de projet. Analyse ce cahier des charges et extrais les informations suivantes.
Pour chaque champ, indique :
- "value" : la valeur extraite (null si introuvable)
- "confidence" : score entre 0 et 100 représentant ta certitude
- "risk" : null si OK, "uncertain" si valeur vague/incomplète, "critical" si absent ou contradictoire
- "risk_reason" : explication courte du risque (uniquement si risk != null)
- "suggestion" : recommandation IA pour corriger ou compléter le champ (uniquement si risk != null)

Cahier des charges :
\"\"\"
{truncated}
\"\"\"

Réponds UNIQUEMENT en JSON valide strict (PAS de texte avant/après) :
{{
  "project_name": {{"value": "...", "confidence": 95, "risk": null, "risk_reason": null, "suggestion": null}},
  "description":  {{"value": "...", "confidence": 85, "risk": null, "risk_reason": null, "suggestion": null}},
  "stack":        {{"value": ["Tech1", "Tech2"], "confidence": 70, "risk": null, "risk_reason": null, "suggestion": null}},
  "deadline":     {{"value": null, "confidence": 0, "risk": "critical", "risk_reason": "Aucune deadline trouvée", "suggestion": "Définir une date limite réaliste selon la taille de l'équipe"}},
  "team_size":    {{"value": "5", "confidence": 60, "risk": "uncertain", "risk_reason": "Taille mentionnée mais rôles non définis", "suggestion": "Préciser les rôles : développeurs, designers, chefs de projet"}},
  "constraints":  {{"value": ["Contrainte1", "Contrainte2"], "confidence": 80, "risk": null, "risk_reason": null, "suggestion": null}}
}}"""

    try:
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        raw = response.content.strip()
        # Clean markdown fences if present
        raw = re.sub(r'^```json\s*|^```\s*|```$', '', raw, flags=re.MULTILINE).strip()
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        if m:
            result = json.loads(m.group())
            # Validate expected keys
            required_keys = ["project_name", "description", "stack", "deadline", "team_size", "constraints"]
            for key in required_keys:
                if key not in result:
                    result[key] = {"value": None, "confidence": 0, "risk": "critical",
                                   "risk_reason": "Non trouvé dans le CDC", "suggestion": "À compléter manuellement"}
            return result
        return _cdc_fallback()
    except Exception as e:
        print(f"CDC extraction error: {e}")
        return _cdc_fallback()


def _cdc_fallback() -> dict:
    """Fallback CDC extraction result when LLM fails."""
    fields = ["project_name", "description", "stack", "deadline", "team_size", "constraints"]
    return {
        k: {"value": None, "confidence": 0, "risk": "critical",
            "risk_reason": "Extraction automatique échouée",
            "suggestion": "Veuillez remplir ce champ manuellement"}
        for k in fields
    }

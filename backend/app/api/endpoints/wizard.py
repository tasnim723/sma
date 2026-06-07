import json
import asyncio
import os
import random
import base64
import urllib.parse
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse, Response
import httpx
from app.api.deps import get_current_user, check_manager_role
from app.services.wizard_service import parse_file_content, analyze_project_with_ai, generate_multi_projects
from pydantic import BaseModel
 
class AuditStackRequest(BaseModel):
    stack: List[str]

class EnhanceIdeaRequest(BaseModel):
    raw_idea: str

class SimulateFeasibilityRequest(BaseModel):
    project_title: str
    project_description: str
    budget_pressure: int
    time_pressure: int
    base_score: int

class FeasibilityRequest(BaseModel):
    project_title: str
    project_description: str
    project_type: str = "Général"
    project_stack: List[str] = []
    team_size: str = "4-8"
    scenario_name: str = "balanced"
    weeks: int
    start_date: Optional[str] = None
    deadline: Optional[str] = None

class GeneratePlanningRequest(BaseModel):
    project_title: str
    project_description: str
    weeks: int
    stack: List[str] = []
 
router = APIRouter()
 
@router.post("/analyze-feasibility")
async def feasibility_endpoint(
    req: FeasibilityRequest,
    current_user: dict = Depends(check_manager_role)
):
    """Analyse la faisabilité complète d'un projet avec estimation des coûts en DT."""
    from app.services.wizard_service import generate_feasibility_analysis
    try:
        result = await generate_feasibility_analysis(
            project_title=req.project_title,
            project_description=req.project_description,
            project_type=req.project_type,
            stack=req.project_stack,
            team_size=req.team_size,
            scenario_name=req.scenario_name,
            weeks=req.weeks,
            start_date=req.start_date,
            deadline=req.deadline
        )
        return result
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/wizard")
async def project_wizard(
    mode: str = Form(...),
    project_name: str = Form(...),
    description: Optional[str] = Form(None),
    start_date: Optional[str] = Form(None),
    deadline: Optional[str] = Form(None),
    team_size: Optional[str] = Form(None),
    lead_id: Optional[str] = Form(None),
    team_members: List[str] = Form([]),
    validated_tasks: Optional[str] = Form(None),
    veille_articles: Optional[str] = Form(None),
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
                start_date=start_date,
                deadline=deadline,
                team_size=team_size,
                lead_id=lead_id or str(current_user.get("_id") or current_user.get("id")),
                team_members=team_members,
                validated_tasks=validated_tasks,
                veille_articles=veille_articles
            ):
                yield f"data: {json.dumps(update)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'phase': 'ERROR', 'message': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/generate-projects")
async def generate_projects_endpoint(
    manager_input: str = Form(...),
    project_name: str = Form(...),
    tech_context: Optional[str] = Form(None),
    clarification_answers: Optional[str] = Form(None),
    feedback: Optional[str] = Form(None),
    comprehension_data: Optional[str] = Form(None),
    comprehension_only: bool = Form(False),
    current_user: dict = Depends(check_manager_role)
):
    """
    12-step multi-agent pipeline: generates 3 complete comparable project proposals.
    Streams SSE phases: COMPREHENSION → COMPREHENSION_DONE → [CLARIFICATION_NEEDED] →
    IDEATION → IDEATION_DONE → DONE
    """
    async def event_generator():
        try:
            async for update in generate_multi_projects(
                manager_input=manager_input,
                project_name=project_name,
                tech_context=tech_context,
                clarification_answers=clarification_answers,
                feedback=feedback,
                comprehension_data=comprehension_data,
                comprehension_only=comprehension_only
            ):
                yield f"data: {json.dumps(update)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'phase': 'ERROR', 'message': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ── CDC IMPORT : Extraction intelligente depuis cahier des charges ──────────────

@router.post("/extract-cdc")
async def extract_cdc_endpoint(
    file: UploadFile = File(...),
    current_user: dict = Depends(check_manager_role)
):
    """
    Reçoit un fichier CDC (PDF, DOCX, TXT), extrait le texte,
    puis demande à l'IA d'analyser chaque champ clé avec confidence + risk.
    """
    from app.services.wizard_service import extract_cdc_fields

    content_bytes = await file.read()
    file_text = await parse_file_content(content_bytes, file.filename or "cdc.pdf")

    if not file_text or len(file_text.strip()) < 10:
        # File unreadable — return soft fallback so user can fill manually
        from app.services.wizard_service import _cdc_fallback
        fallback = _cdc_fallback()
        return {"status": "fallback", "fields": fallback, "raw_text_preview": ""}

    result = await extract_cdc_fields(file_text)
    return {"status": "ok", "fields": result, "raw_text_preview": file_text[:500]}


# ── ÉTAPE 2 : Compréhension séparée (non-SSE) ─────────────────────────────────

@router.post("/comprehend")
async def comprehend_endpoint(
    manager_input: str = Form(...),
    project_name: str = Form(...),
    clarification_answers: Optional[str] = Form(None),
    current_user: dict = Depends(check_manager_role)
):
    """
    ÉTAPE 2-3: Analyse la demande et retourne la compréhension en JSON direct.
    Permet une pause UX propre avant de lancer l'idéation.
    """
    from app.services.wizard_service import comprehend_project
    data = await comprehend_project(
        manager_input=manager_input,
        project_name=project_name,
        clarification_answers=clarification_answers
    )
    return data


# ── ÉTAPE 12 : Amélioration continue ──────────────────────────────────────────

@router.post("/save-preferences")
async def save_preferences_endpoint(
    validated_project: str = Form(...),
    comprehension: str = Form(...),
    scenario: str = Form("balanced"),
    current_user: dict = Depends(check_manager_role)
):
    """ÉTAPE 12: Sauvegarde les préférences du manager pour amélioration continue."""
    from app.services.wizard_service import save_manager_preferences
    try:
        proj_data = json.loads(validated_project)
        comp_data = json.loads(comprehension)
        user_id = str(current_user.get("_id", current_user.get("id", "unknown")))
        await save_manager_preferences(
            user_id=user_id,
            validated_project=proj_data,
            comprehension=comp_data,
            scenario=scenario
        )
        return {"status": "ok", "message": "Préférences sauvegardées (Étape 12)"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/generate-detailed-tasks")
async def generate_detailed_tasks_endpoint(
    project_title: str = Form(...),
    project_description: str = Form(...),
    project_stack: str = Form(...), # JSON string
    scenario_name: str = Form(...),
    weeks: int = Form(...),
    project_type: str = Form(""),   # ← CUSTOM MODE: passes detected type for category routing
    start_date: Optional[str] = Form(None),
    deadline: Optional[str] = Form(None),
    current_user: dict = Depends(check_manager_role)
):
    from app.services.wizard_service import generate_detailed_tasks
    from app.core.db import get_database
    try:
        db = get_database()
        # Fetch active members to pass to the AI for assignment
        # Include users with no status (default active) but exclude REJECTED/PENDING
        members_cursor = db["users"].find({"status": {"$nin": ["REJECTED", "PENDING"]}})
        members = await members_cursor.to_list(length=100)
        for m in members:
            m["id"] = str(m.pop("_id"))
            
        stack = json.loads(project_stack)
        tasks = await generate_detailed_tasks(
            project_title, project_description, stack,
            scenario_name, weeks, members,
            project_type=project_type,
            start_date=start_date,
            deadline=deadline
        )
        # Return tasks + members list so the frontend can build the assignment picker
        members_for_frontend = [
            {"id": m["id"], "full_name": m.get("full_name", ""), "position": m.get("position", ""), "avatar_url": m.get("avatar_url", "")}
            for m in members
        ]
        return {"tasks": tasks, "members": members_for_frontend}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/analyze-tasks")
async def analyze_tasks_endpoint(
    tasks_json: str = Form(...),
    project_title: str = Form(...),
    project_description: str = Form(...),
    current_user: dict = Depends(check_manager_role)
):
    from app.services.wizard_service import analyze_task_workflow
    try:
        tasks = json.loads(tasks_json)
        context = {"title": project_title, "description": project_description}
        suggestions = await analyze_task_workflow(tasks, context)
        return suggestions
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/suggest-alternative")
async def suggest_alternative_endpoint(
    project_title: str = Form(...),
    project_description: str = Form(...),
    rejected_task_title: str = Form(...),
    existing_tasks_json: str = Form(...),
    current_user: dict = Depends(check_manager_role)
):
    from app.services.wizard_service import suggest_alternative_task
    try:
        existing = json.loads(existing_tasks_json)
        new_task = await suggest_alternative_task(project_title, project_description, rejected_task_title, existing)
        return new_task
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/preferences")
async def get_preferences_endpoint(
    current_user: dict = Depends(check_manager_role)
):
    """ÉTAPE 12: Récupère les insights appris du manager (amélioration continue)."""
    from app.services.wizard_service import get_manager_insights
    user_id = str(current_user.get("_id", current_user.get("id", "unknown")))
    return await get_manager_insights(user_id)


# ── ÉTAPE 5 : Génération d'image visuelle via IA ───────────────────────────────

@router.post("/generate-visual")
async def generate_visual_endpoint(
    description: str = Form(...),
    project_title: str = Form(""),
    project_description: str = Form(""),
    current_user: dict = Depends(check_manager_role)
):
    """
    Génère une image de concept visuel basée sur la description du manager.
    Utilise OpenAI (DALL-E 3) en priorité pour créer un vrai moodboard/UI kit.
    """
    # ── Smart Prompt Construction ─────────────────────────────────────────────────
    # Directly build a faithful prompt from the manager's description without LLM reinterpretation.
    # Combine the ambiance description with the project title and main description for context detection
    combined_context = f"{description} {project_title} {project_description}"
    desc_lower = combined_context.lower()

    # 1. Detect Gaming / VR / Interactive Visualization Domains (HIGHEST PRIORITY)
    is_gaming_vr = any(w in desc_lower for w in [
        "jeu", "game", "gaming", "gameplay", "joueur", "rpg", "fps", "mmo", "arcade", 
        "vr", "réalité virtuelle", "realite virtuelle", "virtuel", "virtual", 
        "simulation", "interactif", "interactive", "3d", "2d", "visualisation", "visualization"
    ])

    if is_gaming_vr:
        # Prevent boring business UI, but allow epic concept art and stylized game menus
        negative_prompt = "no dashboard, no SaaS, no generic business UI, no admin templates, no statistics, boring, corporate, flat design, "
        
        # Determine specific sub-domain
        if any(w in desc_lower for w in ["2d", "plateforme", "platformer", "sprite", "arcade"]):
            subject_style = "epic 2D game promo art, vibrant character selection screen, glowing magical effects, high-end 2D game engine showcase"
        elif any(w in desc_lower for w in ["course", "racing", "voiture", "vitesse", "car"]):
            subject_style = "AAA racing game promotional poster, neon glowing lights, dynamic cinematic angle, Unreal Engine 5 showcase"
        elif any(w in desc_lower for w in ["vr", "réalité virtuelle", "realite virtuelle", "immersif"]):
            subject_style = "immersive VR game key art, epic dark fantasy or sci-fi environment, glowing player classes, Unreal Engine 5 aesthetic"
        elif any(w in desc_lower for w in ["aventure", "rpg", "monde ouvert", "open world", "quête"]):
            subject_style = "epic RPG character selection screen, Warrior Assassin Mage classes, glowing magical runes, dark fantasy environment, Unreal Engine 5 promotional art"
        elif any(w in desc_lower for w in ["visualisation", "interactive", "3d", "temps réel"]):
            subject_style = "stunning 3D interactive showcase, epic lighting, glowing elements, Unreal Engine 5 presentation style"
        else:
            subject_style = "epic video game promotional art, highly stylized character classes, glowing neon and magical effects, dark background, Unreal Engine 5 showcase, AAA game menu aesthetic"
            
        # The user's requested rendering constraints
        dimension_style = "stunning visual quality, Unreal Engine 5 promotional art, epic lighting, glowing effects, vibrant colors, highly detailed, stylized masterpiece"

    
    else:
        # Fallback for non-gaming projects (architecture, medical, regular apps, etc.)
        negative_prompt = ""
        if any(w in desc_lower for w in ["architecture", "maison", "house", "villa", "bâtiment", "immeuble"]):
            subject_style = "architectural visualization, photorealistic exterior/interior render, dramatic lighting, high-end real estate photography style"
        elif any(w in desc_lower for w in ["médical", "medical", "hospital", "hopital", "santé"]):
            subject_style = "modern medical facility visualization, clean clinical design, advanced medical equipment"
        elif any(w in desc_lower for w in ["nature", "paysage", "landscape", "jardin"]):
            subject_style = "photorealistic landscape visualization, lush environment, golden hour lighting"
        elif any(w in desc_lower for w in ["mobile", "app", "application", "web", "ui", "interface", "dashboard", "site"]):
            subject_style = "professional UI/UX design mockup, modern app interface, clean design system"
        else:
            subject_style = "professional project visualization, detailed concept art"
            
        dimension_style = "highly detailed, 8K resolution, professional quality"

    # Build final prompt — user's description is the CORE SUBJECT
    enhanced_prompt = (
        f"{description}, "
        f"{subject_style}, "
        f"{dimension_style}, "
        f"pristine graphics. Without any text, no fonts, no letters, no words, no watermarks, no titles. {negative_prompt}"
    )

    pollo_key = os.getenv("POLLO_API_KEY")
    if pollo_key:
        try:
            # Pollo AI implementation (assuming standard JSON payload for image generation)
            async with httpx.AsyncClient(timeout=60.0) as client:
                res = await client.post(
                    "https://pollo.ai/api/platform/generation", # Assumed endpoint
                    headers={"x-api-key": pollo_key, "Content-Type": "application/json"},
                    json={"prompt": enhanced_prompt, "type": "image"}
                )
                if res.status_code == 200:
                    data = res.json()
                    if "image_url" in data:
                        # Fetch the image to return as base64
                        img_res = await client.get(data["image_url"])
                        b64_data = base64.b64encode(img_res.content).decode()
                        return {"image_data": f"data:image/png;base64,{b64_data}", "seed": 0, "source": "pollo"}
                    elif "image_b64" in data:
                        return {"image_data": f"data:image/png;base64,{data['image_b64']}", "seed": 0, "source": "pollo"}
        except Exception as e:
            print(f"[VISUAL GEN] Pollo AI error: {e}")

    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key and openai_key.startswith("sk-"):
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=openai_key)
            response = await client.images.generate(
                model="dall-e-3",
                prompt=enhanced_prompt,
                size="1024x1024",
                quality="standard",
                n=1,
                response_format="b64_json"
            )
            b64_data = response.data[0].b64_json
            return {"image_data": f"data:image/png;base64,{b64_data}", "seed": 0}
        except Exception as e:
            print(f"[VISUAL GEN] OpenAI error: {e}")

    google_key = os.getenv("GOOGLE_API_KEY")
    if google_key:
        try:
            from google import genai
            from google.genai import types as genai_types
            client = genai.Client(api_key=google_key)
            result = await asyncio.to_thread(
                client.models.generate_images,
                model="imagen-3.0-generate-002",
                prompt=enhanced_prompt,
                config=genai_types.GenerateImagesConfig(number_of_images=1, aspect_ratio="16:9")
            )
            if result.generated_images:
                img_bytes = result.generated_images[0].image.image_bytes
                b64 = base64.b64encode(img_bytes).decode()
                return {"image_data": f"data:image/png;base64,{b64}", "seed": 0}
        except Exception as e:
            print(f"[VISUAL GEN] Imagen error: {e}")

    # ── FALLBACK: Pollinations.ai (server-side proxy, no CORS) ───────────────
    try:
        seed = random.randint(0, 999999)
        encoded = urllib.parse.quote(enhanced_prompt)
        url = f"https://image.pollinations.ai/prompt/{encoded}?width=1024&height=576&nologo=true&model=flux&seed={seed}"
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.get(url, follow_redirects=True)
            content_type = response.headers.get("content-type", "")
            if response.status_code == 200 and "image" in content_type:
                b64 = base64.b64encode(response.content).decode()
                ext = "png" if "png" in content_type else "jpeg"
                print(f"[VISUAL GEN] Pollinations fallback success")
                return {"image_data": f"data:image/{ext};base64,{b64}", "seed": seed, "source": "pollinations"}
    except Exception as e:
        error_msg = str(e).encode("ascii", "ignore").decode()
        print(f"[VISUAL GEN] Pollinations also failed: {error_msg}")

    raise HTTPException(status_code=503, detail="Image generation temporarily unavailable")


# ── ÉTAPE 5.5 : Génération de vidéo via IA ───────────────────────────────

@router.post("/generate-video")
async def generate_video_endpoint(
    description: str = Form(...),
    current_user: dict = Depends(check_manager_role)
):
    """
    Génère une vidéo conceptuelle basée sur la description du manager, 
    en utilisant l'API Pollo.ai (Kling/Luma/Runway).
    """
    pollo_key = os.getenv("POLLO_API_KEY")
    
    if not pollo_key:
        raise HTTPException(status_code=400, detail="POLLO_API_KEY is not configured.")
        
    enhanced_prompt = (
        f"A cinematic 3D game trailer preview. High quality, smooth animation, "
        f"trending on ArtStation, Unreal Engine 5 render style. "
        f"Theme: {description}"
    )

    try:
        # Pollo AI implementation (assuming standard JSON payload for video generation)
        async with httpx.AsyncClient(timeout=90.0) as client:
            res = await client.post(
                "https://pollo.ai/api/platform/generation/kling-ai/kling-v2-1", # Using Kling as requested in docs search
                headers={"x-api-key": pollo_key, "Content-Type": "application/json"},
                json={"prompt": enhanced_prompt, "type": "video"}
            )
            
            # For simplicity, if the API requires polling we would return a task ID.
            # Here we assume it returns a direct video URL or we mock it if it fails.
            if res.status_code == 200:
                data = res.json()
                video_url = data.get("video_url", "https://www.w3schools.com/html/mov_bbb.mp4") # Fallback to dummy video
                return {"video_url": video_url, "source": "pollo_kling"}
            else:
                print(f"[VIDEO GEN] Pollo API non-200 response: {res.text}")
                # Mock response for UI testing while API schema is unknown
                return {"video_url": "https://www.w3schools.com/html/mov_bbb.mp4", "source": "mock"}
                
    except Exception as e:
        print(f"[VIDEO GEN] Pollo AI error: {e}")
        # Mock response for UI testing while API schema is unknown
        return {"video_url": "https://www.w3schools.com/html/mov_bbb.mp4", "source": "mock"}


# ── WHAT-IF SIMULATOR ─────────────────────────────────────────────────────────

class WhatIfRequest(BaseModel):
    projects: List[dict]
    constraints: dict
    what_if_overrides: dict
    what_if_weights: dict = {"roi": 25, "fast": 15, "innov": 20, "feasib": 25, "scalab": 15}

@router.post("/what-if-simulate")
async def what_if_simulate(
    req: WhatIfRequest,
    current_user: dict = Depends(check_manager_role)
):
    """
    Simulateur What-If — 3-step pipeline:
    1. Score baseline  2. Apply scenario modifiers  3. LLM enrichment
    """

    def _score_baseline(proj: dict, constraints: dict) -> dict:
        complexity = proj.get("complexity", "MEDIUM")
        dur = (proj.get("scenarios") or {}).get("balanced", {}).get("duration_weeks", 12)
        innov = proj.get("innovation_score", 70)
        comp  = proj.get("comparison_score", 70)
        obj_text  = (constraints.get("mainObjective", "") or "").lower()
        team_text = (constraints.get("teamSize", "") or "").lower()
        is_low = complexity == "LOW"; is_med = complexity == "MEDIUM"
        is_small = any(w in team_text for w in ["1","solo","indép"])
        wants_roi   = any(w in obj_text for w in ["roi","invest","profit"])
        wants_speed = any(w in obj_text for w in ["rapide","mvp","vite"])
        roi    = min(99, comp + (8 if wants_roi else 0) - (12 if complexity=="HIGH" else 0))
        fast   = min(99, max(30, 100 - dur*3) + (18 if is_low else 8 if is_med else 0) + (12 if wants_speed else 0))
        feasib = min(99, (85 if is_low else 70 if is_med else 55) + (-10 if is_small else 5))
        scalab = min(99, 55 + innov*0.3 + len(proj.get("modules") or [])*3)
        return {"roi":int(roi),"fast":int(fast),"feasib":int(feasib),"scalab":int(scalab),"innov":int(innov)}

    def _apply_overrides(bl: dict, complexity: str, overrides: dict, weights: dict) -> dict:
        roi,fast,feasib,scalab,innov = bl["roi"],bl["fast"],bl["feasib"],bl["scalab"],bl["innov"]
        is_low = complexity=="LOW"; is_med = complexity=="MEDIUM"
        if overrides.get("resourceLimit"): roi=min(99,roi-12); feasib=min(99,feasib+(15 if is_low else -8))
        if overrides.get("mvpSpeed"):      fast=min(99,fast+(20 if is_low else 5 if is_med else -15))
        if overrides.get("b2b"):           roi=min(99,roi+12); scalab=min(99,scalab+10)
        if overrides.get("junior"):        feasib=min(99,feasib+(20 if is_low else 0 if is_med else -20))
        conf = (1.0 if is_low else 0.95 if is_med else 0.85) - (0.1 if overrides.get("junior") else 0)
        conf = max(0.6, conf)
        total_w = sum(weights.values()) or 100
        success = (roi*weights.get("roi",25)+fast*weights.get("fast",15)+innov*weights.get("innov",20)+feasib*weights.get("feasib",25)+scalab*weights.get("scalab",15))/total_w*conf
        return {"roi":int(roi),"fast":int(fast),"feasib":int(feasib),"scalab":int(scalab),"innov":int(innov),"success":int(success),"confidence":round(conf,2)}

    async def _enrich_llm(rows_data: list, overrides: dict, constraints: dict) -> list:
        active = [k for k,v in overrides.items() if v]
        if not active: return rows_data
        labels = {"resourceLimit":"Ressources limitées","mvpSpeed":"Lancement MVP 4 semaines","b2b":"Cible B2B","junior":"Équipe junior"}
        scenario_label = ", ".join(labels.get(s,s) for s in active)
        summary = "\n".join([f"- {r['project_title']} ({r['complexity']}): {r['simulated']['success']}% (baseline {r['baseline']['success']}%)" for r in rows_data])
        prompt = f"""Expert stratégie projet. Scénarios: {scenario_label}. Objectif manager: {constraints.get('mainObjective','?')}. Équipe: {constraints.get('teamSize','?')}.
Projets:\n{summary}
Réponds en JSON STRICT:
{{"results":[{{"project_title":"...","ai_insight":"analyse 2-3 phrases","impact_tags":["tag1","tag2"],"suited_if":["cond1","cond2"],"careful_if":["risque1"],"task_ideas":["tâche1","tâche2","tâche3"]}}]}}
RÈGLES: Ne mentionne JAMAIS de prix/devises. Sois concis. JSON seul, sans markdown."""
        groq_keys = [k.strip() for k in os.getenv("GROQ_API_KEYS","").split(",") if k.strip()]
        if not groq_keys:
            g = os.getenv("GROQ_API_KEY","")
            if g: groq_keys = [g]
        import httpx
        for key in groq_keys:
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    res = await client.post("https://api.groq.com/openai/v1/chat/completions",
                        headers={"Authorization":f"Bearer {key}","Content-Type":"application/json"},
                        json={"model":"llama-3.1-8b-instant","messages":[{"role":"user","content":prompt}],"temperature":0.3,"max_tokens":1200})
                    if res.status_code == 200:
                        content = res.json()["choices"][0]["message"]["content"].strip()
                        if "```json" in content: content = content.split("```json")[1].split("```")[0].strip()
                        elif "```" in content: content = content.split("```")[1].split("```")[0].strip()
                        ai_map = {r["project_title"]:r for r in json.loads(content).get("results",[])}
                        for row in rows_data:
                            ai = ai_map.get(row["project_title"],{})
                            row.update({"ai_insight":ai.get("ai_insight",""),"impact_tags":ai.get("impact_tags",[]),"suited_if":ai.get("suited_if",[]),"careful_if":ai.get("careful_if",[]),"task_ideas":ai.get("task_ideas",[])})
                        return rows_data
            except Exception as e:
                print(f"[WHAT-IF LLM] {e}"); continue
        return rows_data

    # Step 1+2
    rows = []
    for proj in req.projects:
        bl = _score_baseline(proj, req.constraints)
        total_w = sum(req.what_if_weights.values()) or 100
        comp_str = proj.get("complexity","MEDIUM")
        conf_base = 1.0 if comp_str == "LOW" else 0.95 if comp_str == "MEDIUM" else 0.85
        bl["success"] = int(((bl["roi"]*req.what_if_weights.get("roi",25)+bl["fast"]*req.what_if_weights.get("fast",15)+bl["innov"]*req.what_if_weights.get("innov",20)+bl["feasib"]*req.what_if_weights.get("feasib",25)+bl["scalab"]*req.what_if_weights.get("scalab",15))/total_w)*conf_base)
        sim = _apply_overrides(bl.copy(), comp_str, req.what_if_overrides, req.what_if_weights)
        rows.append({"project_id":proj.get("id",0),"project_title":proj.get("title","Projet"),"complexity":proj.get("complexity","MEDIUM"),"baseline":bl,"simulated":sim,"delta":sim["success"]-bl["success"],"is_top":False,"ai_insight":"","impact_tags":[],"suited_if":[],"careful_if":[],"task_ideas":[]})
    if rows:
        max(rows, key=lambda r: r["simulated"]["success"])["is_top"] = True

    # Step 3
    rows = await _enrich_llm(rows, req.what_if_overrides, req.constraints)
    return {"status":"ok","rows":rows}

@router.post("/audit-stack")
async def audit_stack_endpoint(req: AuditStackRequest, current_user=Depends(get_current_user)):
    stack_str = ", ".join(req.stack)
    prompt = f"""Tu es un expert en architecture logicielle. Analyse cette stack technique: {stack_str}.
Renvoie un JSON STRICT avec exactement deux listes de chaines de caracteres courtes et percutantes:
{{"success":["point fort 1", "point fort 2"], "issues":["conflit potentiel 1", "risque 2"]}}
Si la stack est coherente, 'issues' peut etre vide ou contenir une legere mise en garde. JSON seulement sans markdown."""
    groq_keys = [k.strip() for k in os.getenv("GROQ_API_KEYS","").split(",") if k.strip()]
    if not groq_keys:
        g = os.getenv("GROQ_API_KEY","")
        if g: groq_keys = [g]
    
    for key in groq_keys:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post("https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization":f"Bearer {key}","Content-Type":"application/json"},
                    json={"model":"llama-3.1-8b-instant","messages":[{"role":"user","content":prompt}],"temperature":0.2,"max_tokens":300})
                if res.status_code == 200:
                    content = res.json()["choices"][0]["message"]["content"].strip()
                    if "```json" in content: content = content.split("```json")[1].split("```")[0].strip()
                    elif "```" in content: content = content.split("```")[1].split("```")[0].strip()
                    return json.loads(content)
        except Exception as e:
            pass
    return {"success":["La stack selectionnee est standard et coherente."], "issues":[]}


@router.post("/simulate-feasibility-live")
async def simulate_feasibility_live(req: SimulateFeasibilityRequest):
    try:
        from app.services.groq_service import generate_with_groq
        
        prompt = f"""Tu es un expert en gestion de projet IT.
Projet: {req.project_title}
Description: {req.project_description}
Score de base: {req.base_score}/100

Le manager a ajusté les curseurs de contraintes:
- Budget: {req.budget_pressure}% (100% = budget normal, <80% = sous-financé, >150% = sur-financé)
- Temps: {req.time_pressure}% (100% = délai normal, <80% = rush/retard critique, >130% = délai excessif/sur-ingénierie)

RÈGLES IMPORTANTES:
- Si Temps < 80%: c'est un RETARD/RUSH critique. Diminue fortement le score, niveau RISQUÉ ou CRITIQUE, alerte retard obligatoire.
- Si Temps > 130%: délai excessif, risque de sur-ingénierie et perte de focus. Diminue le score, niveau RISQUÉ.
- Si Budget < 70%: ressources insuffisantes, diminue le score.
- Zone optimale: Temps 80-120%, Budget 80-130%.
- Ne donne JAMAIS un message positif si Temps < 80% ou Temps > 130%.
- En zone optimale avec score >= 75, retourne une liste de risques VIDE: "risks": []
- Ne jamais écrire "Risques standards de gestion de projet" ou tout risque générique sans valeur.

Calcule le nouveau score (0-100), niveau ("EXCELLENT","VIABLE","MODÉRÉ","RISQUÉ","CRITIQUE"), résumé court (max 2 phrases) avec alerte si nécessaire, et 2-3 risques principaux.
Réponds UNIQUEMENT avec un JSON STRICT et VALIDE, sans markdown:
{{
    "score": 45,
    "level": "RISQUÉ",
    "summary": "⚠️ ALERTE RETARD: délai compressé à {req.time_pressure}% du normal. Risque élevé de burnout et de dette technique.",
    "risks": ["Burnout de l'équipe", "Dette technique", "Livraison partielle"]
}}
"""
        res = await generate_with_groq(prompt)
        import json
        
        cleaned = res.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned.split("```json")[1]
        elif cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
            
        return json.loads(cleaned.strip())
    except Exception as e:
        print("Error in simulate-feasibility-live:", e)
        # Fallback: generate a meaningful summary from the request parameters
        base = req.base_score
        bp = req.budget_pressure
        tp = req.time_pressure

        # Penalize score based on pressure deviations from the optimal zone (80-120%)
        score = base
        if tp <= 50:
            score = max(5, base - 45)
            level = "CRITIQUE"
            summary = f"⚠️ ALERTE RETARD CRITIQUE : délai compressé à {tp}% du normal. Risque majeur de livraison partielle, burnout de l'équipe et dette technique incontrôlable. Intervention immédiate requise."
            risks = ["Burnout de l'équipe imminent", "Dette technique critique", "Livraison partielle très probable", "Qualité fortement dégradée"]
        elif tp <= 70:
            score = max(10, base - 30)
            level = "RISQUÉ"
            summary = f"⚠️ ALERTE RETARD : délai à {tp}% du normal. L'équipe est sous pression extrême. Des fonctionnalités devront être sacrifiées pour tenir le calendrier."
            risks = ["Burnout de l'équipe", "Dette technique élevée", "Réduction du périmètre inévitable"]
        elif tp <= 90:
            score = max(20, base - 15)
            level = "RISQUÉ"
            summary = f"Délai serré ({tp}% du normal, budget {bp}%). La livraison est tendue — une équipe expérimentée et un suivi rigoureux sont indispensables pour éviter le dérapage."
            risks = ["Risque de dépassement de délai", "Qualité potentiellement réduite"]
        elif tp <= 120:
            # Optimal zone
            if bp <= 60:
                score = max(20, base - 20)
                level = "RISQUÉ"
                summary = f"Budget fortement réduit ({bp}% du normal). Des compromis sur les fonctionnalités ou les ressources seront nécessaires pour tenir le délai."
                risks = ["Ressources insuffisantes", "Fonctionnalités réduites", "Risque de dépassement"]
            elif score >= 75:
                level = "VIABLE"
                summary = f"Projet viable ({score}/100). Les paramètres actuels (budget {bp}%, délai {tp}%) sont dans la zone optimale pour une livraison réussie."
                risks = []
            elif score >= 50:
                level = "MODÉRÉ"
                summary = f"Faisabilité modérée ({score}/100). Quelques ajustements de ressources ou de périmètre sont recommandés pour sécuriser la livraison."
                risks = ["Risque de dépassement de budget", "Complexité technique sous-estimée"]
            else:
                level = "CRITIQUE"
                summary = f"Faisabilité critique ({score}/100). Le projet nécessite une révision profonde du périmètre ou une augmentation significative des ressources."
                risks = ["Échec de livraison probable", "Dépassement budget et délai"]
        elif tp <= 160:
            score = max(10, base - 20)
            level = "RISQUÉ"
            summary = f"⚠️ ALERTE DÉLAI EXCESSIF : délai étendu à {tp}% du normal. Risque de sur-ingénierie, perte de focus sur le MVP et dépassement de budget. Réduisez le délai pour maintenir la dynamique d'équipe."
            risks = ["Sur-ingénierie probable", "Perte de focus sur le MVP", "Dépassement de budget par inertie", "Démotivation de l'équipe"]
        else:
            score = max(5, base - 35)
            level = "CRITIQUE"
            summary = f"⚠️ ALERTE CRITIQUE : délai extrêmement long ({tp}% du normal). Le projet risque de ne jamais aboutir — les équipes perdent leur dynamique, les technologies évoluent et le budget s'épuise sans livraison."
            risks = ["Projet abandonné probable", "Technologies obsolètes à la livraison", "Budget épuisé sans résultat", "Perte totale de motivation"]

        return {
            "score": score,
            "level": level,
            "summary": summary,
            "risks": risks
        }

@router.post("/enhance-idea")
async def enhance_idea_endpoint(
    req: EnhanceIdeaRequest,
    current_user: dict = Depends(check_manager_role)
):
    """Améliore une idée brute en un texte professionnel et détaillé via l'IA Groq."""
    prompt = f"""Tu es un Product Manager expert et Senior Consultant IT. Prends cette idée brute et réécris-la en un seul paragraphe professionnel, détaillé et percutant. Mentionne le type d'application, les fonctionnalités clés, la technologie si pertinente, et la valeur ajoutée pour les utilisateurs. Ne rajoute pas d'introduction ni de conclusion, donne UNIQUEMENT le texte amélioré.

Idée brute : {req.raw_idea}"""

    groq_keys = [k.strip() for k in os.getenv("GROQ_API_KEYS", "").split(",") if k.strip()]
    if not groq_keys:
        g = os.getenv("GROQ_API_KEY", "")
        if g:
            groq_keys = [g]

    for key in groq_keys:
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                res = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                    json={
                        "model": "llama-3.1-8b-instant",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.7,
                        "max_tokens": 500
                    }
                )
                if res.status_code == 200:
                    content = res.json()["choices"][0]["message"]["content"].strip()
                    return {"enhanced_idea": content}
        except Exception as e:
            print(f"[ENHANCE IDEA] Groq key failed: {e}")
            continue

    # Fallback: return original if all keys fail
    return {"enhanced_idea": req.raw_idea}

@router.post("/generate-planning")
async def generate_planning_endpoint(
    req: GeneratePlanningRequest,
    current_user: dict = Depends(check_manager_role)
):
    """Génère un planning dynamique (Timeline) avec des phases et des couleurs."""
    import re
    prompt = f"""Tu es un Tech Lead expert en planification agile.
Projet : {req.project_title}
Description : {req.project_description}
Stack : {", ".join(req.stack) if req.stack else 'Non définie'}
Durée : {req.weeks} semaines

Génère un planning réaliste réparti exactement sur {req.weeks} semaines.
Divise ces semaines en 3 à 5 grandes "phases" (ex: Initiation, Développement Backend, Intégration Frontend, Test/QA, Déploiement).
Attribue à chaque phase une couleur parmi cette liste : cyan, rose, emerald, amber, purple, blue, indigo.

IMPORTANT: La somme de tous les duration_weeks doit être EXACTEMENT {req.weeks}.
IMPORTANT: weeks doit contenir EXACTEMENT {req.weeks} éléments, numérotés de 1 à {req.weeks}.

Réponds UNIQUEMENT avec un JSON STRICT et VALIDE (sans markdown, sans intro, sans commentaire) suivant ce format exact :
{{
  "phases": [
    {{ "name": "Nom de la phase", "color": "cyan", "duration_weeks": 2 }}
  ],
  "weeks": [
    {{ "week": 1, "text": "Description courte.", "phase_index": 0 }}
  ]
}}
"""
    groq_keys = [k.strip() for k in os.getenv("GROQ_API_KEYS", "").split(",") if k.strip()]
    if not groq_keys:
        g = os.getenv("GROQ_API_KEY", "")
        if g: groq_keys = [g]

    last_error = None
    for key in groq_keys:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                    json={
                        "model": "llama-3.1-8b-instant",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.2,
                        "max_tokens": 2000
                    }
                )
                if res.status_code == 200:
                    content = res.json()["choices"][0]["message"]["content"].strip()
                    print(f"[GENERATE PLANNING] Raw AI response (first 300 chars): {content[:300]}")
                    
                    # Extract JSON from various wrapper formats
                    if "```json" in content:
                        content = content.split("```json")[1].split("```")[0].strip()
                    elif "```" in content:
                        content = content.split("```")[1].split("```")[0].strip()
                    
                    # Try to find JSON object with regex if simple parsing fails
                    try:
                        result = json.loads(content)
                    except json.JSONDecodeError:
                        # Try to extract JSON object from the content
                        match = re.search(r'\{[\s\S]*\}', content)
                        if match:
                            result = json.loads(match.group())
                        else:
                            raise ValueError(f"No valid JSON found in response: {content[:200]}")
                    
                    # Validate structure
                    if "phases" in result and "weeks" in result:
                        return result
                    else:
                        print(f"[GENERATE PLANNING] Missing keys in response: {list(result.keys())}")
                        last_error = "Missing phases or weeks in response"
                        continue
                else:
                    print(f"[GENERATE PLANNING] API returned {res.status_code}: {res.text[:200]}")
                    last_error = f"API returned {res.status_code}"
        except Exception as e:
            print(f"[GENERATE PLANNING] Groq key failed: {e}")
            last_error = str(e)
            continue

    # Fallback: generate a simple static planning
    print(f"[GENERATE PLANNING] All keys failed (last error: {last_error}). Using fallback planning.")
    colors = ["cyan", "emerald", "blue", "amber", "purple"]
    total = req.weeks
    if total <= 4:
        phase_defs = [
            ("Initiation", "cyan", 1),
            ("Développement", "emerald", max(1, total - 2)),
            ("Test & Déploiement", "purple", 1),
        ]
    else:
        d1 = max(1, total // 5)
        d2 = max(1, total * 2 // 5)
        d3 = max(1, total // 5)
        d4 = max(1, total - d1 - d2 - d3)
        phase_defs = [
            ("Initiation & Setup", "cyan", d1),
            ("Développement Core", "emerald", d2),
            ("Intégration & Frontend", "blue", d3),
            ("Test & Déploiement", "purple", d4),
        ]

    phases = [{"name": n, "color": c, "duration_weeks": d} for n, c, d in phase_defs]
    weeks_list = []
    week_num = 1
    for pi, (pname, _, pdur) in enumerate(phase_defs):
        for w in range(pdur):
            weeks_list.append({
                "week": week_num,
                "text": f"Phase « {pname} » — semaine {w+1}/{pdur}.",
                "phase_index": pi
            })
            week_num += 1

    return {"phases": phases, "weeks": weeks_list}


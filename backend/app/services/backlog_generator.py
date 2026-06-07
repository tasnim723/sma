"""
AI Backlog Generator Service
Generates a structured, coherent Kanban backlog from project metadata.
Rules:
  - NEVER invent or auto-assign team members
  - NEVER limit task count artificially
  - ALWAYS explain priority reasoning per task
  - Manager validates before any DB write
"""
import json
import re
import uuid
import os
from typing import List, Optional
import httpx

# ── Project type contexts ──────────────────────────────────────────────────────
PROJECT_CONTEXTS = {
    "web": {
        "steps": ["Setup & Architecture", "UI/UX Design", "Frontend Development",
                  "Backend API", "Database", "Authentication", "Testing", "Deployment"],
        "tools": ["React", "Next.js", "Node.js", "PostgreSQL", "Docker", "Jest", "Figma"],
        "risks": ["scalability", "security vulnerabilities", "browser compatibility", "SEO"],
        "architecture": "MVC / REST API / SPA",
    },
    "mobile": {
        "steps": ["Setup", "UI Design", "Navigation", "State Management",
                  "API Integration", "Push Notifications", "Testing", "Store Submission"],
        "tools": ["React Native", "Flutter", "Firebase", "Expo", "Jest", "Figma"],
        "risks": ["device fragmentation", "offline mode", "battery usage", "store rejection"],
        "architecture": "MVVM / Clean Architecture",
    },
    "game": {
        "steps": ["Game Design Document", "Engine Setup", "Core Mechanics",
                  "Level Design", "Assets & Audio", "Physics", "UI/HUD", "QA", "Release"],
        "tools": ["Unity", "Unreal Engine", "Blender", "FMOD", "Photon", "Git LFS"],
        "risks": ["performance on low-end devices", "game balance", "monetization ethics"],
        "architecture": "Entity-Component-System (ECS)",
    },
    "vr": {
        "steps": ["Concept & Storyboard", "Engine Setup", "3D Modeling",
                  "Interaction Design", "Performance Optimization", "Testing on Device", "Release"],
        "tools": ["Unity XR", "Unreal VR", "Blender", "OpenXR", "SteamVR SDK"],
        "risks": ["motion sickness", "hardware requirements", "latency", "asset size"],
        "architecture": "Scene Graph / XR Toolkit",
    },
    "ecommerce": {
        "steps": ["Product Catalog", "Cart & Checkout", "Payment Integration",
                  "User Accounts", "Admin Dashboard", "SEO", "Analytics", "Deployment"],
        "tools": ["Stripe", "Shopify API", "Next.js", "PostgreSQL", "Redis", "Algolia"],
        "risks": ["PCI compliance", "cart abandonment", "inventory sync", "fraud"],
        "architecture": "Headless Commerce / Microservices",
    },
    "saas": {
        "steps": ["Multi-tenancy Setup", "Auth & Billing", "Core Feature",
                  "Dashboard", "API & Webhooks", "Onboarding", "Analytics", "Scaling"],
        "tools": ["Stripe", "Auth0", "PostgreSQL", "Redis", "Kubernetes", "Prometheus"],
        "risks": ["data isolation", "billing edge cases", "churn", "SLA compliance"],
        "architecture": "Multi-tenant SaaS / Event-Driven",
    },
}

DETECTION_KEYWORDS = {
    "web":       ["web", "site", "webapp", "frontend", "backend", "api", "react", "next", "django", "flask"],
    "mobile":    ["mobile", "app", "ios", "android", "flutter", "react native", "expo"],
    "game":      ["jeu", "game", "gaming", "3d", "unity", "unreal", "pubg", "duolingo", "educatif"],
    "vr":        ["vr", "ar", "xr", "virtual reality", "augmented", "immersif", "metaverse"],
    "ecommerce": ["ecommerce", "boutique", "shop", "store", "panier", "checkout", "produit"],
    "saas":      ["saas", "subscription", "abonnement", "multi-tenant", "dashboard", "analytics"],
}


def detect_project_type(title: str, description: str) -> str:
    text = (title + " " + description).lower()
    scores = {ptype: 0 for ptype in DETECTION_KEYWORDS}
    for ptype, keywords in DETECTION_KEYWORDS.items():
        for kw in keywords:
            if kw in text:
                scores[ptype] += 1
    best = max(scores, key=lambda k: scores[k])
    return best if scores[best] > 0 else "custom"


async def _call_gemini(system_prompt: str, user_prompt: str, temperature: float = 0.3) -> str:
    """Call Gemini with native JSON response mode and high token limit."""
    import google.generativeai as genai
    import os
    import asyncio
    from dotenv import load_dotenv
    
    load_dotenv(override=True)
    api_key = os.getenv("GOOGLE_API_KEY") or "AIzaSyBxfH9d6hE-Ui4KiAoB94u4uVQY_XOsiFY"
    genai.configure(api_key=api_key, transport="rest")

    last_err = None
    loop = asyncio.get_running_loop()
    
    # Try modern models in sequence to prevent 404 version compatibility issues
    model_names = ["gemini-2.5-flash", "gemini-3.1-flash", "gemini-1.5-flash"]
    
    for mname in model_names:
        try:
            model = genai.GenerativeModel(
                model_name=mname,
                system_instruction=system_prompt
            )
            # Run sync call in executor with REST transport (extremely reliable, never hangs on Windows)
            response = await loop.run_in_executor(
                None,
                lambda: model.generate_content(
                    user_prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=temperature,
                        response_mime_type="application/json"
                    )
                )
            )
            print(f"[Gemini] Successfully generated backlog using model: {mname}")
            return response.text.strip()
        except Exception as e:
            last_err = e
            print(f"[Gemini] Model {mname} failed: {e}. Trying next...")
            continue
                
    raise last_err


async def _call_groq(system_prompt: str, user_prompt: str, temperature: float = 0.3) -> str:
    """Call Groq with automatic retry on 429 using a different key, then fall back to OpenAI."""
    from dotenv import load_dotenv
    load_dotenv(override=True)

    keys_str = os.getenv("GROQ_API_KEYS", "")
    keys = [k.strip() for k in keys_str.split(",") if k.strip()]
    if not keys:
        single = os.getenv("GROQ_API_KEY", "")
        if single:
            keys = [single]

    # Try each Groq key
    for attempt, api_key in enumerate(keys):
        try:
            async with httpx.AsyncClient(timeout=90) as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": "llama-3.1-8b-instant",
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "temperature": temperature,
                        "max_tokens": 3000,
                    },
                )
                if response.status_code == 429:
                    print(f"[BacklogGen] Groq key {attempt+1} rate-limited, trying next...")
                    continue
                response.raise_for_status()
                return response.json()["choices"][0]["message"]["content"].strip()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                continue
            raise
        except Exception as e:
            print(f"[BacklogGen] Groq key {attempt+1} error: {e}")
            continue

    # All Groq keys exhausted — fall back to OpenAI
    print("[BacklogGen] All Groq keys rate-limited, falling back to OpenAI...")
    openai_key = os.getenv("OPENAI_API_KEY", "")
    if not openai_key:
        raise RuntimeError("All Groq keys rate-limited and no OpenAI key configured")

    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
            json={
                "model": "gpt-3.5-turbo",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": temperature,
                "max_tokens": 3000,
            },
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()


async def _get_custom_context(title: str, description: str) -> dict:
    """For unknown project types, ask the LLM to generate the context dynamically."""
    prompt = f"""Analyse ce projet et génère un contexte de développement structuré.

Titre : {title}
Description : {description}

Réponds STRICTEMENT en JSON valide :
{{
  "steps": ["étape1", "étape2", ...],
  "tools": ["outil1", "outil2", ...],
  "risks": ["risque1", "risque2", ...],
  "architecture": "description architecture"
}}"""
    try:
        # Try Gemini first for custom context
        try:
            raw = await _call_gemini(
                "Tu es un expert en architecture logicielle. Réponds uniquement en JSON valide.",
                prompt,
                temperature=0.2,
            )
        except Exception:
            raw = await _call_groq(
                "Tu es un expert en architecture logicielle. Réponds uniquement en JSON valide.",
                prompt,
                temperature=0.2,
            )
        raw_clean = re.sub(r"```(?:json)?", "", raw).replace("```", "").strip()
        match = re.search(r"(\{.*\})", raw_clean, re.DOTALL)
        if match:
            return json.loads(match.group(1))
    except Exception as e:
        print(f"[BacklogGen] custom context error: {e}")
    return {
        "steps": ["Analyse", "Conception", "Développement", "Tests", "Déploiement"],
        "tools": ["Git", "Docker", "CI/CD"],
        "risks": ["scope creep", "technical debt"],
        "architecture": "À définir selon les besoins",
    }


def extract_json_objects(text: str) -> List[dict]:
    """
    Extrêmement robuste : extrait tous les objets JSON valides d'une chaîne, 
    même si elle est tronquée, contient des virgules en trop ou est mal formée.
    """
    objs = []
    
    # Nettoyage des balises Markdown de codeblock
    text_clean = re.sub(r"```(?:json)?", "", text).replace("```", "").strip()
    
    # Tentative de parsing global direct
    try:
        data = json.loads(text_clean)
        if isinstance(data, list):
            return [t for t in data if isinstance(t, dict) and "title" in t]
        elif isinstance(data, dict):
            if "tasks" in data and isinstance(data["tasks"], list):
                return [t for t in data["tasks"] if isinstance(t, dict) and "title" in t]
            elif "title" in data:
                return [data]
    except Exception:
        pass
        
    # Analyse par bloc pour extraire les objets valides un par un (robuste à la troncature)
    start_indices = [i for i, char in enumerate(text_clean) if char == '{']
    for start in start_indices:
        depth = 0
        for end in range(start, len(text_clean)):
            if text_clean[end] == '{':
                depth += 1
            elif text_clean[end] == '}':
                depth -= 1
                if depth == 0:
                    candidate = text_clean[start:end+1]
                    try:
                        obj = json.loads(candidate)
                        if isinstance(obj, dict) and "title" in obj:
                            # Évite les doublons exacts par titre
                            if not any(o.get("title") == obj["title"] for o in objs):
                                objs.append(obj)
                    except Exception:
                        pass
                    break
    return objs


async def generate_detailed_tasks(
    title: str,
    description: str,
    stack: str,
    duration_weeks: int,
    team_members: List[dict],
) -> List[dict]:
    """
    Main entry point. Returns a list of task dicts matching the required JSON schema.
    NEVER assigns members. NEVER limits task count artificially.
    """
    # Step A — detect project type
    project_type = detect_project_type(title, description)

    # Step B — load context
    if project_type == "custom":
        try:
            context = await _get_custom_context(title, description)
        except Exception:
            # If context generation fails (rate limit etc.), use a generic fallback
            context = {
                "steps": ["Analyse", "Conception", "Développement", "Tests", "Déploiement"],
                "tools": ["Git", "Docker", "CI/CD"],
                "risks": ["scope creep", "dette technique"],
                "architecture": "À définir selon les besoins",
            }
    else:
        context = PROJECT_CONTEXTS[project_type]

    # Build team info string (roles + skills only, NO assignment)
    team_info = "\n".join(
        f"- {m.get('full_name', 'Membre')} | Poste: {m.get('position', 'N/A')} | Compétences: {', '.join(m.get('skills', []))}"
        for m in team_members
    ) or "Aucun membre défini pour l'instant."

    # Step C — main prompt
    system_prompt = """Tu es un expert en gestion de projet agile. Tu génères des backlogs Kanban complets et réalistes.
LANGUE OBLIGATOIRE: Tout le contenu textuel (title, description, reasoning, category, mitigation, suggested_role, required_skills, tools, etc.) doit être EXCLUSIVEMENT EN FRANÇAIS. Aucun mot anglais autorisé dans les champs textuels.
ASSIGNATION: Ne jamais inclure assigned_member_id ni assigned_member_name. Ces champs sont interdits.
FORMAT: Réponds uniquement avec un tableau JSON valide, sans texte avant ou après."""

    user_prompt = f"""Génère une liste COMPLÈTE des tâches nécessaires pour ce projet. TOUT EN FRANÇAIS UNIQUEMENT.

PROJET: {title}
DESCRIPTION: {description[:300]}
STACK: {stack or 'À définir'}
DURÉE: {duration_weeks} semaines
TYPE: {project_type}
ÉTAPES: {', '.join(context['steps'][:6])}
OUTILS: {', '.join(context['tools'][:6])}
RISQUES: {', '.join(context['risks'][:4])}

RÈGLES STRICTES:
- TOUT le texte en FRANÇAIS (titres, descriptions, catégories, rôles, compétences, outils)
- NE PAS inclure assigned_member_id ni assigned_member_name (assignation manuelle par le manager)
- Génère autant de tâches que nécessaire selon la complexité réelle
- Chaque tâche doit expliquer son importance

Format JSON strict (tableau) :
[
  {{
    "id": "uuid",
    "title": "Titre explicite de la tâche EN FRANÇAIS",
    "description": "Description détaillée EN FRANÇAIS de ce qui doit être accompli",
    "reasoning": "Raisonnement EN FRANÇAIS sur l'importance de cette tâche",
    "priority": "High|Medium|Low",
    "priority_reasoning": "Explication EN FRANÇAIS de cette priorité",
    "priority_criteria": ["Critère 1 en français", "Critère 2 en français"],
    "negotiation_badge": "Prioritaire|Critique|Standard",
    "negotiation_justification": "Justification EN FRANÇAIS",
    "duration_hours": 8,
    "suggested_role": "Rôle suggéré EN FRANÇAIS (ex: Développeur Frontend, Tech Lead)",
    "required_skills": ["Compétence 1 en français", "Compétence 2 en français"],
    "dependencies": [],
    "tools": ["Outil 1", "Outil 2"],
    "risk_level": "High|Medium|Low",
    "mitigation": "Comment atténuer les risques EN FRANÇAIS",
    "category": "Configuration|Conception|Développement|Tests|Déploiement|Documentation",
    "sprint": 1,
    "status": "pending"
  }}
]"""

    raw = ""
    # Try Gemini first for robust structured task generation
    try:
        print("[BacklogGen] Querying Gemini model first...")
        raw = await _call_gemini(system_prompt, user_prompt, temperature=0.25)
        print(f"[BacklogGen] Gemini response length: {len(raw)} chars")
    except Exception as gemini_err:
        print(f"[BacklogGen] Gemini failed: {gemini_err}. Falling back to Groq...")
        try:
            raw = await _call_groq(system_prompt, user_prompt, temperature=0.25)
            print(f"[BacklogGen] Groq response length: {len(raw)} chars")
        except Exception as groq_err:
            print(f"[BacklogGen] Groq also failed: {groq_err}.")
            raw = ""

    if raw:
        tasks = extract_json_objects(raw)
        if tasks:
            cleaned = []
            for t in tasks:
                # Strip all assignment fields — manager assigns manually in Kanban
                t.pop("assigned_member_id", None)
                t.pop("assigned_member_name", None)
                t.pop("assignee_ids", None)
                t.pop("assignee", None)
                t.pop("assigned_to", None)
                if not t.get("id"):
                    t["id"] = str(uuid.uuid4())
                t["status"] = "pending"
                cleaned.append(t)
            print(f"[BacklogGen] Parsed {len(cleaned)} tasks successfully")
            return cleaned
        else:
            print(f"[BacklogGen] Could not extract any valid tasks from response: {raw[:300]}")

    return []

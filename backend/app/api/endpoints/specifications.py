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
    
    # Convert markdown to HTML with tables extension!
    # Extra includes tables, but let's be explicit
    md_html = markdown.markdown(spec['markdown_content'], extensions=['extra', 'tables', 'codehilite'])
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{
                size: A4;
                margin: 2cm;
                @frame footer_frame {{
                    -pdf-frame-content: footer_content;
                    left: 2cm; width: 17cm; top: 27.5cm; height: 1cm;
                }}
            }}
            body {{ 
                font-family: Helvetica, Arial, sans-serif; 
                color: #334155; 
                font-size: 11pt; 
                line-height: 1.5;
            }}
            .header-box {{
                background-color: #0f172a;
                color: #ffffff;
                padding: 25px;
                border-radius: 8px;
                margin-bottom: 25px;
            }}
            .header-box h1 {{
                color: #ffffff;
                font-size: 24pt;
                margin: 0 0 10px 0;
            }}
            .header-box p {{
                color: #00BCD4;
                font-size: 12pt;
                margin: 0;
            }}
            h2 {{ 
                color: #0f172a; 
                font-size: 16pt; 
                border-bottom: 2px solid #00BCD4; 
                padding-bottom: 5px; 
                margin-top: 30px;
                margin-bottom: 15px;
            }}
            h3 {{
                color: #00BCD4;
                font-size: 13pt;
                margin-top: 20px;
                margin-bottom: 10px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
                margin-bottom: 15px;
            }}
            th {{
                background-color: #f1f5f9;
                color: #0f172a;
                font-weight: bold;
                text-align: left;
                padding: 10px;
                border-bottom: 2px solid #00BCD4;
            }}
            td {{
                padding: 10px;
                border-bottom: 1px solid #e2e8f0;
            }}
            tr:nth-child(even) {{
                background-color: #f8fafc;
            }}
            code {{ 
                background-color: #f1f5f9; 
                color: #ef4444;
                padding: 2px 4px; 
                border-radius: 4px;
                font-family: "Courier New", Courier, monospace;
            }}
            pre {{ 
                background-color: #0f172a; 
                color: #e2e8f0;
                padding: 15px; 
                border-radius: 8px; 
            }}
            .mermaid {{ display: none; }}
            #footer_content {{
                text-align: center;
                color: #94a3b8;
                font-size: 9pt;
                border-top: 1px solid #e2e8f0;
                padding-top: 5px;
            }}
        </style>
    </head>
    <body>
        <div id="footer_content">
            Cahier des Charges — {spec['project_title']} | Généré par SMA Netinfo | Page <pdf:pagenumber>
        </div>

        <div class="header-box">
            <h1>{spec['project_title']}</h1>
            <p>Documentation Technique Officielle</p>
        </div>
        
        {md_html}
    </body>
    </html>
    """
    
    # Generate PDF
    result = BytesIO()
    # UTF-8 encoding explicit handling
    pisa_status = pisa.CreatePDF(BytesIO(html_content.encode("UTF-8")), dest=result, encoding='UTF-8')
    
    if pisa_status.err:
        raise HTTPException(status_code=500, detail="Failed to generate PDF")
    
    pdf_content = result.getvalue()
    result.close()
    
    import urllib.parse
    filename = f"specification_{spec['project_title'].replace(' ', '_')}.pdf"
    safe_filename = urllib.parse.quote(filename)
    ascii_filename = filename.encode("ascii", "ignore").decode("ascii")
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{safe_filename}"
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
    
    # 3. Trigger Task Regeneration only if no tasks exist yet
    try:
        existing_tasks_count = await db["tasks"].count_documents({"project_id": project_id})
        if existing_tasks_count == 0:
            await generate_and_assign_tasks(project_id, project["name"], markdown_text)
    except Exception as e:
        print(f"Error during task regeneration after import: {str(e)}")
        # We don't fail the whole request because the spec was saved
        
    return created_spec


@router.post("/generate/{project_id}", response_model=SpecificationResponse)
async def auto_generate_specification(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Auto-generate a Cahier des Charges using AI from the project data.
    Called automatically when the Spécification tab is opened and no spec exists.
    """
    import httpx, os
    from app.core.keys import get_rotated_groq_key

    db = get_database()
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

    project = await db["projects"].find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # If spec already exists AND has real PROFESSIONAL content, return it
    existing = await db["specifications"].find_one({"project_id": project_id})
    needs_regeneration = False
    if existing:
        md = existing.get("markdown_content", "")
        # Detect rescue/placeholder specs
        is_rescue_mode = ("Mode Secours" in md or "hors-ligne/secours" in md or "À définir" in md)
        # Detect low-quality wizard-generated specs (missing the professional 18-section structure)
        professional_sections = [
            "Présentation du Projet", "Vision du Produit", "Objectifs du Projet",
            "Parties Prenantes", "Public Cible", "Périmètre du Projet",
            "Fonctionnalités Principales", "Modules Fonctionnels",
            "Exigences Non Fonctionnelles", "Parcours Utilisateur",
            "Product Backlog", "Planning Prévisionnel", "Analyse des Risques",
            "Critères de Succès", "Livrables", "Hypothèses", "Recommandation", "Conclusion"
        ]
        section_count = sum(1 for s in professional_sections if s.lower() in md.lower())
        is_low_quality = len(md) < 2000 or section_count < 5
        needs_regeneration = is_rescue_mode or is_low_quality or len(md) < 50
    
    if existing and not needs_regeneration:
        existing["id"] = str(existing.pop("_id"))
        return existing
    # If exists but low-quality/rescue, delete it so we regenerate below
    if existing:
        print(f"[AutoSpec] Existing spec is low-quality (sections={section_count}, len={len(md)}). Regenerating...")
        await db["specifications"].delete_many({"project_id": project_id})


    # Build context from project fields
    name = project.get("name", "Projet")
    description = project.get("description", "")
    stack = project.get("stack", [])
    modules = project.get("modules", [])
    milestones = project.get("milestones", [])
    tasks_cursor = db["tasks"].find({"project_id": project_id})
    tasks = await tasks_cursor.to_list(length=50)
    task_titles = [t.get("title", "") for t in tasks]

    stack_str = ", ".join(stack) if stack else "Non spécifiée"
    modules_str = ", ".join(modules) if modules else "Non spécifiés"
    milestones_str = "\n".join([f"- {m.get('title','')}: {m.get('date','')}" for m in milestones]) if milestones else "Non définis"
    tasks_str = "\n".join([f"- {t}" for t in task_titles[:20]]) if task_titles else "Non définies"

    # Domain detection
    project_text = f"{name} {description} {stack_str} {modules_str}".lower()
    domain_rules = ""
    if any(k in project_text for k in ["3d", "game", "jeu", "unity", "unreal", "vr", "xr", "gameplay"]):
        domain_rules = """
RÈGLES SPÉCIALES (Jeu 3D/VR) : 
Utiliser des concepts comme Unreal Engine / Unity, Gameplay Systems, Rendering, Physics, Animation, XR/VR, optimisation GPU/CPU. Si applicable, détailler le HUD, immersion, menus et expérience de gameplay.
"""
    elif any(k in project_text for k in ["ia", "ai", "machine learning", "tensorflow", "pytorch", "llm", "intelligence artificielle", "agent"]):
        domain_rules = """
RÈGLES SPÉCIALES (Projet IA) : 
Intégrer l'utilisation de modèles IA, inference, vector database, pipelines IA et agents IA. Décrire l'architecture d'intégration IA, la gestion de la mémoire et de l'entraînement ou du prompting.
"""
    elif any(k in project_text for k in ["saas", "dashboard", "b2b", "api", "cloud", "plateforme", "web", "react"]):
        domain_rules = """
RÈGLES SPÉCIALES (SaaS / Web App) :
Mettre l'accent sur les APIs REST/GraphQL, l'infrastructure cloud, dashboards, gestion des utilisateurs, auth (OAuth/SAML) et analytics. Détailler l'architecture scalable.
"""
    elif any(k in project_text for k in ["mobile", "android", "ios", "flutter", "react native", "app"]):
        domain_rules = """
RÈGLES SPÉCIALES (Mobile) :
Mettre l'accent sur iOS/Android, Flutter/React Native, le système de notifications push, la gestion du mode hors-ligne, et l'optimisation batterie/réseau.
"""

    system_prompt = """Tu es un Business Analyst Senior, Product Owner et Chef de Projet Agile expérimenté.

# MISSION
Générer un cahier des charges professionnel, détaillé, structuré et directement exploitable à partir des informations du projet fournies. Le document doit ressembler à un véritable cahier des charges rédigé par un Business Analyst senior pour un client réel, et non à une réponse générée par une IA.

# RÈGLES GÉNÉRALES
* Rédiger en français professionnel avec un ton formel et précis.
* Produire un document cohérent et réaliste.
* Exploiter intelligemment toutes les informations du projet et déduire les éléments manquants à partir du contexte.
* Éviter les généralisations inutiles.
* Fournir un contenu concret et exploitable sans généralisations inutiles.

# INTERDICTIONS
Ne jamais écrire : À définir, N/A, Non spécifié, Information manquante, À compléter, Inconnu, Non disponible, TBD.

Ne jamais générer : Diagrammes UML, Diagrammes de séquence, Diagrammes de classes, Diagrammes de cas d'utilisation, Diagrammes BPMN, Diagrammes techniques, Schémas d'architecture, Modèles de base de données, Code source, Pseudo-code.

# GESTION DES INFORMATIONS MANQUANTES
Si certaines informations ne sont pas fournies : Déduire une proposition réaliste, utiliser les bonnes pratiques du domaine, émettre des hypothèses cohérentes, rester crédible et professionnel.

# FORMATAGE OBLIGATOIRE
* Titres hiérarchiques Markdown purs.
* Sous-sections claires, listes à puces.
* Utilisation OBLIGATOIRE des tableaux Markdown (bien alignés, sans cellules vides) pour les objectifs, acteurs, rôles, fonctionnalités, modules, exigences, user stories, risques, livrables, KPIs, planning, sprints.
* OBLIGATOIRE : Nommer les Sprints sous la forme "Sprint 1", "Sprint 2", "Sprint 3", etc. Ne pas inventer de noms de phases pour les sprints.
* OBLIGATOIRE : Nommer les Epics sous la forme "Epic 1", "Epic 2", "Epic 3", etc.

# STRUCTURE OBLIGATOIRE (Respecte cet ordre exact)
# 1. Présentation du Projet
Présenter : Le contexte, le besoin, le problème à résoudre, la valeur du projet.
# 2. Vision du Produit
Décrire : La vision globale, les bénéfices attendus, les résultats recherchés.
# 3. Objectifs du Projet
Créer un tableau : | Objectif | Description | Priorité | (Inclure métier, utilisateurs, organisationnels)
# 4. Parties Prenantes
Créer un tableau : | Acteur | Rôle | Responsabilités |
# 5. Public Cible
Décrire les catégories d'utilisateurs concernées.
# 6. Périmètre du Projet
Créer deux sections : ## Inclus / ## Exclus
# 7. Fonctionnalités Principales
Créer un tableau : | Fonctionnalité | Description | Valeur Métier | Priorité |
# 8. Modules Fonctionnels
Pour chaque module : Objectif, Description, Fonctionnalités incluses, Résultat attendu (sous forme de tableau si pertinent)
# 9. Exigences Non Fonctionnelles
Créer un tableau : | Exigence | Description | (Performance, Disponibilité, Fiabilité, Sécurité, Ergonomie, Compatibilité, Accessibilité, Maintenabilité)
# 10. Parcours Utilisateurs
Décrire les principaux scénarios d'utilisation (Connexion, Quotidien, Tâches, Déconnexion)
# 11. Product Backlog
Tableau : | Epic | User Story | Priorité | (Format US: En tant que [acteur] Je veux [fonction] Afin de [bénéfice])
# 12. Planning Prévisionnel
Tableau : | Phase / Sprint | Objectif | Durée Estimée | Livrables |
# 13. Analyse des Risques
Tableau : | Risque | Impact | Probabilité | Mesure Préventive |
# 14. Critères de Succès
Tableau : | Indicateur | Objectif | (Indicateurs mesurables)
# 15. Livrables
Tableau : | Livrable | Description |
# 16. Hypothèses et Contraintes
Présenter : Contraintes métier, organisationnelles, temporelles, hypothèses retenues.
# 17. Recommandations
Fournir des recommandations pertinentes.
# 18. Conclusion
Résumer objectifs, bénéfices, valeur ajoutée.
"""

    user_prompt = f"""Génère le cahier des charges complet et professionnel pour le projet suivant.

**Projet :** {name}
**Description :** {description}
**Stack technique :** {stack_str}
**Modules :** {modules_str}
**Jalons :**
{milestones_str}
**Tâches principales :**
{tasks_str}
{domain_rules}

Ne mets que le code Markdown en réponse, rien avant ou après. N'ajoute PAS de balises ```markdown au début de ta réponse."""

    api_key = get_rotated_groq_key()
    markdown_content = ""
    success = False

    import asyncio
    max_retries = 3
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": "llama-3.1-8b-instant",
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "temperature": 0.2,
                        "max_tokens": 4000,
                    }
                )
                
                if response.status_code != 200:
                    print(f"[AutoSpec] Groq API returned {response.status_code}: {response.text}")
                    
                if response.status_code == 413:
                    user_prompt = user_prompt.replace(tasks_str, "Trop de tâches pour l'API. Utilise la description principale.")
                    continue
                    
                response.raise_for_status()
                markdown_content = response.json()["choices"][0]["message"]["content"].strip()
                
                if markdown_content.startswith("```markdown"):
                    markdown_content = markdown_content[11:].strip()
                elif markdown_content.startswith("```"):
                    markdown_content = markdown_content[3:].strip()
                if markdown_content.endswith("```"):
                    markdown_content = markdown_content[:-3].strip()
                
                success = True
                break
                
        except Exception as e:
            print(f"[AutoSpec] Groq error on attempt {attempt+1}: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"[AutoSpec] Response text: {e.response.text}")
            if "429" in str(e) or "rate" in str(e).lower():
                await asyncio.sleep(5)
            else:
                break
                
    if not success:
        print("[AutoSpec] All attempts failed, falling back to Mode Secours.")
        # Fallback: generate a basic spec from project data
        markdown_content = f"""# Cahier des Charges
## Documentation Technique Officielle
Version : 1.0
Statut : IA Approuvée (Mode Secours)
Méthodologie : Agile Scrum

## 1. Présentation du Projet
**{name}** — {description}

## 2. Objectifs & Périmètre
À définir.

## 3. Architecture Technique
**Stack :** {stack_str}

## 4. Fonctionnalités Principales
{tasks_str}

## 5. Modules & Composants
{chr(10).join([f'- {m}' for m in modules]) if modules else '- À définir'}

## 6. UX/UI & Expérience Utilisateur
À définir.

## 7. Sécurité & Performance
À définir.

## 8. Méthodologie Agile Scrum
Scrum standard.

## 9. Planning & Jalons
{milestones_str}

## 10. Équipe & Rôles
À définir.

## 11. Risques & Mitigation
À définir.

## 12. Critères de Succès
À définir.

## 13. Livrables
Code source, builds, documentation.

## 14. Recommandations IA
Document généré en mode hors-ligne/secours suite à une erreur réseau."""

    # Save to DB
    await db["specifications"].delete_many({"project_id": project_id})
    new_spec = {
        "project_id": project_id,
        "project_title": name,
        "project_summary": description[:200],
        "markdown_content": markdown_content,
        "methodology": "SCRUM",
        "created_at": datetime.utcnow()
    }
    result = await db["specifications"].insert_one(new_spec)
    created_spec = await db["specifications"].find_one({"_id": result.inserted_id})
    created_spec["id"] = str(created_spec.pop("_id"))

    # Also generate tasks if none exist yet
    existing_tasks_count = await db["tasks"].count_documents({"project_id": project_id})
    if existing_tasks_count == 0 and markdown_content:
        try:
            await generate_and_assign_tasks(project_id, name, markdown_content)
        except Exception as e:
            print(f"[AutoSpec] Task generation error: {e}")

    return created_spec


@router.post("/generate-milestones/{project_id}")
async def auto_generate_milestones(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Auto-generate milestones for a project using AI from its description and spec.
    Called automatically when the Roadmap tab is opened and no milestones exist.
    """
    import httpx, os
    from app.core.keys import get_rotated_groq_key
    from datetime import timedelta
    import json, re

    db = get_database()
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail="Invalid project ID")

    project = await db["projects"].find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Return early if milestones already exist
    existing_milestones = project.get("milestones", [])
    if existing_milestones:
        return {"milestones": existing_milestones, "generated": False}

    name = project.get("name", "Projet")
    description = project.get("description", "")
    spec = await db["specifications"].find_one({"project_id": project_id})
    spec_context = (spec.get("markdown_content", "")[:1500] if spec else "")

    prompt = f"""Tu es un expert en gestion de projet. Génère 4 à 6 jalons clés (milestones) pour ce projet.

Projet : {name}
Description : {description}
{f"Contexte technique : {spec_context}" if spec_context else ""}

Réponds UNIQUEMENT avec un tableau JSON valide:
[
  {{"title": "Nom du jalon", "days_from_now": 14}},
  {{"title": "Nom du jalon 2", "days_from_now": 30}}
]
Les jalons doivent couvrir tout le cycle de vie du projet (démarrage, développement, tests, livraison).
Réponds UNIQUEMENT avec le JSON, sans texte avant ou après."""

    milestones_data = []
    try:
        api_key = get_rotated_groq_key()
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [
                        {"role": "system", "content": "Tu es un expert PM. Réponds uniquement avec du JSON valide."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.2,
                    "max_tokens": 500,
                }
            )
            response.raise_for_status()
            raw = response.json()["choices"][0]["message"]["content"].strip()
            m = re.search(r'\[.*\]', raw, re.DOTALL)
            if m:
                milestones_data = json.loads(m.group())
    except Exception as e:
        print(f"[AutoMilestones] Groq error: {e}")
        # Fallback milestones
        milestones_data = [
            {"title": "Démarrage du projet", "days_from_now": 7},
            {"title": "Prototype fonctionnel", "days_from_now": 30},
            {"title": "Version Beta", "days_from_now": 60},
            {"title": "Livraison finale", "days_from_now": 90},
        ]

    now = datetime.utcnow()
    milestones = [
        {"title": m.get("title", "Milestone"), "date": now + timedelta(days=m.get("days_from_now", 30))}
        for m in milestones_data
    ]

    # Save to project document
    await db["projects"].update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"milestones": milestones}}
    )

    return {"milestones": milestones, "generated": True}


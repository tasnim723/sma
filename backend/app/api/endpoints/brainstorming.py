from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Optional
from bson import ObjectId
from app.core.db import get_database
from app.models.brainstorming import BrainstormingSessionCreate, BrainstormingSessionResponse
from app.api.deps import get_current_user, check_manager_role
from app.services.agents.orchestrator import ideateur_agent, critique_agent, synthetiseur_agent
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import asyncio
import json
import re
import os
import httpx
import random
import xml.etree.ElementTree as ET
from ddgs import DDGS
from app.core.keys import get_rotated_groq_key

router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# CO-PILOT MODE — Turn-based, manager-driven brainstorming
# ─────────────────────────────────────────────────────────────────────────────

class CopilotStartRequest(BaseModel):
    topic: str
    project_name: Optional[str] = ""
    mode: str = "creative"  # "creative" | "critical"

class CopilotFeedbackRequest(BaseModel):
    feedback: str
    user_name: str = "Manager"

class CopilotNextRequest(BaseModel):
    user_name: str = "Manager"


async def _call_ai(system_prompt: str, user_prompt: str) -> str:
    """
    Call Groq directly via httpx with a fresh rotated key per call.
    Falls back to the ideateur_agent LLM if httpx fails.
    """
    api_key = get_rotated_groq_key()
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user",   "content": user_prompt},
                    ],
                    "temperature": 0.7,
                    "max_tokens": 1024,
                },
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"[CoPilot _call_ai] httpx error: {e}, falling back to agent LLM")
        # Fallback to agent LLM
        res = await ideateur_agent.llm.ainvoke([
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ])
        return res.content.strip()


async def _generate_one_idea(
    topic: str, project_name: str, mode: str, index: int,
    history: list[str], excluded_titles: list[str] = []
) -> dict:
    """Ask the AI to generate exactly one idea with the full innovation format."""
    mode_instruction = (
        "Sois audacieux, original et très créatif. Explore des angles inattendus et disruptifs."
        if mode == "creative"
        else "Sois rigoureux, pragmatique et axé sur la faisabilité réelle et les contraintes concrètes."
    )
    history_block = "\n".join(history[-6:]) if history else "Aucun historique."
    exclusions = ", ".join(excluded_titles) if excluded_titles else "Aucune"

    prompt = f"""Tu es un co-pilote IA expert en innovation stratégique. Niveau d'innovation requis : MAXIMUM.
Projet : {project_name or topic}
Sujet : {topic}
{mode_instruction}
Idées déjà discutées (À ÉVITER ABSOLUMENT) : {exclusions}
Historique échanges récents :
{history_block}

Génère UNIQUEMENT l'idée #{index}. Elle doit être RADICALEMENT différente des précédentes.
Réponds STRICTEMENT en JSON valide :
{{"title": "Titre innovant (5 mots max)", "description": "Description claire et concrète en 1-2 phrases.", "why_innovative": "Pourquoi c'est innovant en 1 phrase percutante.", "feasibility": "Élevé", "confidence": 87, "opening_question": "Une question courte et percutante pour lancer le débat."}}
La valeur de 'feasibility' doit être exactement 'Élevé', 'Moyen' ou 'Challenge'."""

    try:
        raw = await _call_ai(ideateur_agent.system_prompt, prompt)
        raw_clean = re.sub(r"```(?:json)?", "", raw).replace("```", "").strip()
        match = re.search(r"(\{.*\})", raw_clean, re.DOTALL)
        if match:
            data = json.loads(match.group(1))
            data.setdefault("why_innovative", "Approche innovante sur ce marché.")
            data.setdefault("feasibility", "Moyen")
            return data
    except Exception as e:
        print(f"[CoPilot] _generate_one_idea error: {e}")

    return {
        "title": f"Idée #{index}",
        "description": "Approche innovante pour ce projet.",
        "why_innovative": "Concept original dans ce domaine.",
        "feasibility": "Moyen",
        "confidence": 75,
        "opening_question": "Qu'en pensez-vous ?"
    }



def _detect_feedback_intent(feedback: str) -> str:
    """
    Classify the manager's message into one of 4 intents:
    QUESTION   — manager is asking something
    REJECTION  — manager clearly rejects / dislikes the idea
    APPROVAL   — manager likes / validates the idea
    SUGGESTION — manager proposes a change or adds context
    """
    f = feedback.strip().lower()

    # QUESTION: ends with ? or starts with interrogative words
    question_starters = ["comment", "pourquoi", "quoi", "qu'", "quel", "quelle", "est-ce", "peut-on",
                         "peut on", "c'est quoi", "c est quoi", "what", "how", "why", "which", "who"]
    if f.endswith("?") or any(f.startswith(w) for w in question_starters):
        return "QUESTION"

    # REJECTION: short negative words or explicit rejection phrases
    rejection_keywords = ["non", "no", "nul", "nope", "pas bon", "mauvais", "bof", "pas intéressant",
                          "pas convaincu", "je n'aime pas", "j'aime pas", "pas du tout", "rien",
                          "changer", "autre chose", "autre idée", "pas ça", "pas ce", "refus",
                          "pas satisfait", "insuffisant", "trop vague", "trop générique"]
    if any(kw in f for kw in rejection_keywords) and len(f.split()) <= 8:
        return "REJECTION"

    # APPROVAL: positive signals
    approval_keywords = ["oui", "yes", "parfait", "excellent", "super", "j'aime", "j adore",
                         "très bien", "bonne idée", "c'est bien", "c est bien", "ok", "d'accord",
                         "validé", "on garde", "on continue", "intéressant", "j'approuve"]
    if any(kw in f for kw in approval_keywords):
        return "APPROVAL"

    # Default: treat as SUGGESTION / elaboration
    return "SUGGESTION"


async def _ai_critique(topic: str, idea: dict, manager_feedback: str, mode: str, cycle: int,
                       is_final: bool = False, full_history: list = None) -> str:
    """
    AI co-pilot responds dynamically based on the manager's actual intent.
    - QUESTION   → answers the question directly and precisely
    - REJECTION  → acknowledges, does NOT change the idea (that's /next), asks what specifically is wrong
    - APPROVAL   → builds on the enthusiasm, deepens the angle
    - SUGGESTION → integrates the suggestion, enriches the idea, asks a follow-up
    """
    intent = _detect_feedback_intent(manager_feedback)

    mode_instruction = (
        "Tu es en mode CRÉATIF : encourage, amplifie, explore des angles audacieux."
        if mode == "creative"
        else "Tu es en mode CRITIQUE : challenge les hypothèses, identifie les failles, sois rigoureux."
    )

    # Build a compact conversation history for context
    history_block = ""
    if full_history:
        recent = [m for m in full_history[-8:] if m.get("role") in ("MANAGER", "AI_CRITIQUE")]
        history_block = "\n".join(
            f"{'Manager' if m['role'] == 'MANAGER' else 'IA'}: {m['content'][:200]}"
            for m in recent
        )

    closing = (
        "Termine par une réflexion conclusive courte. NE POSE PAS DE QUESTION — c'est la fin du débat sur cette idée."
        if is_final
        else "Termine par UNE seule question courte et précise."
    )

    # Intent-specific instructions
    if intent == "QUESTION":
        task = f"""Le manager pose une QUESTION : "{manager_feedback}"
Réponds DIRECTEMENT et PRÉCISÉMENT à cette question en 2-3 phrases.
Appuie-toi sur l'idée en cours et le contexte du projet.
{closing}"""

    elif intent == "REJECTION":
        task = f"""Le manager dit NON ou rejette l'idée : "{manager_feedback}"
INTERDIT : Ne défends pas l'idée. Ne la reformule pas. Ne dis pas "cependant" ou "mais".
Fais exactement ceci en 2 phrases maximum :
1. Accepte le rejet simplement ("D'accord, cette idée ne vous convient pas.")
2. Pose UNE question fermée et précise pour comprendre pourquoi : est-ce la complexité technique, le manque d'innovation, le coût, ou la pertinence par rapport au projet ?
{closing}"""

    elif intent == "APPROVAL":
        task = f"""Le manager APPROUVE ou montre de l'enthousiasme : "{manager_feedback}"
Réponds en :
1. Validant son enthousiasme et en précisant pourquoi c'est un bon signal (1 phrase)
2. Approfondissant un angle concret ou un risque à anticiper pour aller plus loin (1-2 phrases)
{closing}"""

    else:  # SUGGESTION
        task = f"""Le manager fait une SUGGESTION ou ajoute du contexte : "{manager_feedback}"
Réponds en :
1. Intégrant sa suggestion dans la réflexion (1 phrase)
2. Enrichissant l'idée avec cet angle nouveau — propose une implication concrète (1-2 phrases)
{closing}"""

    prompt = f"""Tu es un co-pilote IA expert en innovation stratégique. Cycle #{cycle}.
{mode_instruction}

Projet : {topic}
Idée en discussion : "{idea.get('title', '')}" — {idea.get('description', '')}

Historique récent :
{history_block or "Début de la conversation."}

{task}

RÈGLES ABSOLUES :
- Réponds en français, de façon directe et percutante
- Maximum 4 phrases au total
- Pas de listes, pas de titres, pas de markdown
- Adapte-toi EXACTEMENT à l'intention du manager ci-dessus"""

    try:
        return await _call_ai(critique_agent.system_prompt, prompt)
    except Exception as e:
        print(f"[CoPilot] _ai_critique error: {e}")
        # Intent-aware fallback
        if intent == "QUESTION":
            return "Bonne question. Pouvez-vous préciser quel aspect vous intéresse le plus ?"
        elif intent == "REJECTION":
            return "Je comprends que cette idée ne vous convainc pas. Qu'est-ce qui vous dérange précisément — la complexité, le manque d'innovation, ou la pertinence par rapport au projet ?"
        elif intent == "APPROVAL":
            return "Excellent signal. Pour aller plus loin, quel aspect souhaitez-vous approfondir en priorité ?"
        return "Intéressant. Comment envisagez-vous concrètement cette direction ?"


async def _analyze_rejection_cause(topic: str, manager_feedback: str) -> str:
    """Classify the rejection reason from manager feedback (or detect if vague)."""
    if not manager_feedback or len(manager_feedback.strip()) < 5:
        return "VAGUE"
    vague_keywords = ["non", "pas bon", "nul", "mauvais", "no", "rien", "bof"]
    if manager_feedback.strip().lower() in vague_keywords:
        return "VAGUE"
    prompt = f"""Le manager a rejeté des idées pour un projet sur : "{topic}".
Son feedback : "{manager_feedback}"
Classifie la raison principale du rejet parmi :
INNOVATION, FAISABILITE, CLARTE, HORS_SUJET, COUT, COMPLEXITE, INSATISFACTION_GENERALE
Réponds avec un seul mot de la liste."""
    try:
        result = await _call_ai(critique_agent.system_prompt, prompt)
        result = result.strip().upper()
        valid = {"INNOVATION", "FAISABILITE", "CLARTE", "HORS_SUJET", "COUT", "COMPLEXITE", "INSATISFACTION_GENERALE"}
        return result if result in valid else "INSATISFACTION_GENERALE"
    except:
        return "INSATISFACTION_GENERALE"


async def _recovery_generate_3_axes(topic: str, project_name: str, mode: str, excluded_titles: list[str]) -> list:
    """Generate exactly 3 ideas on 3 innovation axes for Recovery Mode."""
    axes = [
        ("conceptuelle", "innovation radicalement nouvelle dans le CONCEPT — remettre en question les fondements même du projet"),
        ("technique",    "nouvelle APPROCHE TECHNOLOGIQUE ou méthode inédite — pas de la tech pour la tech, mais une vraie rupture"),
        ("usage",        "nouvelle MANIÈRE D'UTILISER ou d'appliquer le projet — un public inattendu, un contexte nouveau, un angle d'usage disruptif"),
    ]
    exclusions = ", ".join(excluded_titles) if excluded_titles else "Aucune"
    ideas = []
    for i, (axe_name, axe_desc) in enumerate(axes):
        prompt = f"""Tu es un co-pilote IA en mode RECOVERY INNOVATION. Niveau créativité : MAXIMUM.
Projet : {project_name or topic} | Sujet : {topic}
Idées précédentes à ÉVITER ABSOLUMENT : {exclusions}

Axe imposé : Innovation {axe_name} — {axe_desc}

Génère 1 idée unique sur cet axe, radicalement différente de tout ce qui précède.
Réponds STRICTEMENT en JSON valide :
{{"title": "Titre court percutant", "description": "Description concrète en 1-2 phrases.", "why_innovative": "Pourquoi c'est innovant sur l'axe {axe_name} en 1 phrase.", "feasibility": "Moyen", "confidence": 85, "axis": "{axe_name}", "opening_question": "Question d'ouverture pour le manager."}}
La valeur de 'feasibility' doit être 'Élevé', 'Moyen' ou 'Challenge'."""
        try:
            raw = await _call_ai(ideateur_agent.system_prompt, prompt)
            raw_clean = re.sub(r"```(?:json)?", "", raw).replace("```", "").strip()
            match = re.search(r"(\{.*\})", raw_clean, re.DOTALL)
            if match:
                data = json.loads(match.group(1))
                data.setdefault("axis", axe_name)
                data.setdefault("why_innovative", f"Innovation d'axe {axe_name}.")
                data.setdefault("feasibility", "Moyen")
                ideas.append(data)
                continue
        except Exception as e:
            print(f"[Recovery] axis {axe_name} error: {e}")
        ideas.append({
            "title": f"Idée Recovery #{i+1}",
            "description": f"Approche innovante sur l'axe {axe_name}.",
            "why_innovative": f"Innovation d'axe {axe_name}.",
            "feasibility": "Moyen",
            "confidence": 75,
            "axis": axe_name,
            "opening_question": "Qu'en pensez-vous ?"
        })
    return ideas


def _chat_msg(role: str, content: str, idea_index: Optional[int] = None) -> dict:
    return {
        "id": str(ObjectId()),
        "role": role,
        "content": content,
        "ideaRef": idea_index,
        "timestamp": datetime.utcnow().isoformat()
    }





class ScoreFormulaRequest(BaseModel):
    idea_title: str
    idea_description: str = ""
    confidence: float  # accept int or float from frontend
    feasibility: str = "Moyen"
    verdict: Optional[str] = ""

@router.post("/copilot/score-formula")
async def get_score_formula(req: ScoreFormulaRequest):
    """
    Call Groq directly via httpx to generate a real AI-powered score breakdown.
    Returns innovation, feasibility, impact, coherence scores + formula + summary.
    """
    from app.core.keys import get_rotated_groq_key

    api_key = get_rotated_groq_key()

    system_prompt = (
        "Tu es un expert en évaluation d'innovation stratégique. "
        "Tu analyses des idées selon des critères précis et tu calcules des scores objectifs. "
        "Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après."
    )

    user_prompt = f"""Évalue cette idée selon 4 critères précis et calcule un score détaillé.

IDÉE : "{req.idea_title}"
DESCRIPTION : {req.idea_description or 'Non fournie'}
FAISABILITÉ DÉCLARÉE : {req.feasibility}
VERDICT IA : {req.verdict or "Non fourni"}

━━━ CRITÈRES D'ÉVALUATION ━━━

1. INNOVATION (poids 30%) — Mesure :
   - Degré de nouveauté et d'originalité de l'idée
   - Rupture avec les approches existantes
   - Potentiel disruptif sur le marché ou le secteur
   → Score élevé si l'idée est radicalement nouvelle ; faible si c'est une amélioration marginale

2. FAISABILITÉ (poids 25%) — Mesure :
   - Réalisabilité technique avec les ressources disponibles
   - Complexité d'implémentation (délai, coût, compétences requises)
   - Niveau de risque opérationnel
   → Score élevé si réalisable rapidement ; faible si nécessite des ressources rares ou une R&D longue
   → Faisabilité déclarée par l'IA : {req.feasibility}

3. IMPACT (poids 25%) — Mesure :
   - Valeur ajoutée pour les utilisateurs ou l'organisation
   - Portée et ampleur des bénéfices attendus
   - Potentiel de croissance ou de différenciation compétitive
   → Score élevé si l'impact est large et mesurable ; faible si l'effet est limité ou incertain

4. COHÉRENCE (poids 20%) — Mesure :
   - Alignement avec les objectifs stratégiques du projet
   - Pertinence par rapport au contexte et au sujet traité
   - Complémentarité avec les autres initiatives
   → Score élevé si l'idée s'intègre parfaitement dans la vision ; faible si elle est hors sujet

━━━ CALCUL ━━━
Formule : f(S) = (Innovation × 0.30) + (Faisabilité × 0.25) + (Impact × 0.25) + (Cohérence × 0.20)
Score global de référence : {int(req.confidence)}%

Génère des scores RÉELS basés sur les critères ci-dessus, cohérents avec le score global de {int(req.confidence)}%.

Réponds STRICTEMENT en JSON valide :
{{
  "formula": "f(S) = (Inno × 0.30) + (Fais × 0.25) + (Imp × 0.25) + (Coh × 0.20)",
  "breakdown": [
    {{
      "criterion": "Innovation",
      "weight": "30%",
      "score": <entier 50-100 basé sur nouveauté/disruption>,
      "justification": "<évaluation spécifique de la nouveauté de CETTE idée en 1 phrase>"
    }},
    {{
      "criterion": "Faisabilité",
      "weight": "25%",
      "score": <entier 50-100 basé sur réalisabilité/complexité>,
      "justification": "<évaluation spécifique de la faisabilité de CETTE idée en 1 phrase>"
    }},
    {{
      "criterion": "Impact",
      "weight": "25%",
      "score": <entier 50-100 basé sur valeur ajoutée/portée>,
      "justification": "<évaluation spécifique de l'impact de CETTE idée en 1 phrase>"
    }},
    {{
      "criterion": "Cohérence",
      "weight": "20%",
      "score": <entier 50-100 basé sur alignement stratégique>,
      "justification": "<évaluation spécifique de la cohérence de CETTE idée en 1 phrase>"
    }}
  ],
  "final_score": <calcul exact : round(Innovation*0.30 + Faisabilité*0.25 + Impact*0.25 + Cohérence*0.20)>,
  "summary": "<synthèse de 2 phrases sur les forces et limites de cette idée>"
}}"""

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": 0.4,
                    "max_tokens": 800,
                },
            )
            response.raise_for_status()
            raw = response.json()["choices"][0]["message"]["content"].strip()

        # Clean and parse JSON
        raw_clean = re.sub(r"```(?:json)?", "", raw).replace("```", "").strip()
        match = re.search(r"(\{.*\})", raw_clean, re.DOTALL)
        if match:
            data = json.loads(match.group(1))
            # Validate structure and recompute final_score from breakdown to guarantee consistency
            if "breakdown" in data and len(data["breakdown"]) >= 4:
                weights = [0.30, 0.25, 0.25, 0.20]
                computed = round(sum(
                    float(data["breakdown"][i].get("score", 0)) * weights[i]
                    for i in range(4)
                ))
                data["final_score"] = computed
                return data

    except Exception as e:
        print(f"[ScoreFormula] Groq API error: {e}")

    # Deterministic fallback — compute scores from confidence so they're always coherent
    c = req.confidence
    inno  = min(100, max(50, c + random.randint(-8,  12)))
    fais  = min(100, max(50, c + random.randint(-15,  5)))
    imp   = min(100, max(50, c + random.randint(-5,  15)))
    coh   = min(100, max(50, c + random.randint(-10,  8)))
    # Recompute final to match formula
    computed = round(inno * 0.30 + fais * 0.25 + imp * 0.25 + coh * 0.20)

    return {
        "formula": "f(S) = (Inno × 0.30) + (Fais × 0.25) + (Imp × 0.25) + (Coh × 0.20)",
        "breakdown": [
            {"criterion": "Innovation",  "weight": "30%", "score": round(inno), "justification": "Évalué sur la nouveauté et le potentiel disruptif de l'idée."},
            {"criterion": "Faisabilité", "weight": "25%", "score": round(fais), "justification": f"Évalué sur la réalisabilité technique — niveau déclaré : {req.feasibility}."},
            {"criterion": "Impact",      "weight": "25%", "score": round(imp),  "justification": "Évalué sur la valeur ajoutée et la portée des bénéfices attendus."},
            {"criterion": "Cohérence",   "weight": "20%", "score": round(coh),  "justification": "Évalué sur l'alignement avec les objectifs stratégiques du projet."},
        ],
        "final_score": computed,
        "summary": f"Score global de {computed}% — reflète le potentiel stratégique et la faisabilité estimée de cette idée.",
    }


@router.post("/copilot/start")
async def copilot_start(req: CopilotStartRequest):
    """
    Start a new co-pilot brainstorming session.
    Generates idea #1 immediately and returns the full initial state.
    """
    db = get_database()

    # Generate idea #1
    idea = await _generate_one_idea(req.topic, req.project_name, req.mode, 1, [])

    # Build initial chat feed
    idea_msg = _chat_msg("AI_IDEA", f"**{idea['title']}**\n\n{idea['description']}", idea_index=1)
    question_msg = _chat_msg("AI_CRITIQUE", idea["opening_question"], idea_index=1)

    session_doc = {
        "topic": req.topic,
        "project_name": req.project_name,
        "mode": req.mode,
        "type": "COPILOT",
        "status": "RUNNING",
        "currentIdeaIndex": 1,
        "conversationStep": "WAITING_FEEDBACK",
        "critiqueCount": 0,
        "ideas": [idea],
        "feedbackHistory": [idea_msg, question_msg],
        "ranking": None,
        "created_at": datetime.utcnow(),
    }

    result = await db.brainstorming_sessions.insert_one(session_doc)
    session_doc["id"] = str(result.inserted_id)
    session_doc.pop("_id", None)
    return session_doc


@router.post("/copilot/{session_id}/feedback")
async def copilot_feedback(session_id: str, req: CopilotFeedbackRequest):
    """
    Submit manager feedback for the current idea.
    AI critiques, challenges, and asks a follow-up (max 2 cycles per idea).
    """
    db = get_database()
    try:
        oid = ObjectId(session_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID")

    session = await db.brainstorming_sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    current_idx = session.get("currentIdeaIndex", 1)
    ideas = session.get("ideas", [])
    mode = session.get("mode", "creative")
    critique_count = session.get("critiqueCount", 0)
    topic = session.get("topic", "")
    history = session.get("feedbackHistory", [])

    if not ideas:
        raise HTTPException(status_code=400, detail="No idea to give feedback on")

    current_idea = ideas[current_idx - 1]

    # Append manager message
    manager_msg = _chat_msg("MANAGER", req.feedback, idea_index=current_idx)
    history.append(manager_msg)

    # AI critique — pass full history for context-aware response
    critique_count += 1
    is_final_turn = critique_count >= 2
    ai_response = await _ai_critique(
        topic, current_idea, req.feedback, mode, critique_count,
        is_final=is_final_turn, full_history=history
    )
    ai_msg = _chat_msg("AI_CRITIQUE", ai_response, idea_index=current_idx)
    history.append(ai_msg)

    # Determine next step
    if critique_count >= 2:
        step = "WAITING_CONTINUE_OR_NEXT"
        system_text = (
            "Prêt à passer à l'**idée suivante** ?" if current_idx < 3 
            else "Débat terminé. Prêt à voir le **classement final** ?"
        )
        nav_msg = _chat_msg(
            "SYSTEM",
            system_text,
            idea_index=current_idx
        )
        history.append(nav_msg)
    else:
        step = "WAITING_FEEDBACK"

    await db.brainstorming_sessions.update_one(
        {"_id": oid},
        {"$set": {
            "feedbackHistory": history,
            "critiqueCount": critique_count,
            "conversationStep": step,
        }}
    )

    session["id"] = str(session.pop("_id"))
    session["feedbackHistory"] = history
    session["critiqueCount"] = critique_count
    session["conversationStep"] = step
    return session


@router.post("/copilot/{session_id}/next")
async def copilot_next(req: CopilotNextRequest, session_id: str):
    """
    Move to the next idea or trigger final synthesis after idea #3.
    """
    db = get_database()
    try:
        oid = ObjectId(session_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID")

    session = await db.brainstorming_sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    current_idx = session.get("currentIdeaIndex", 1)
    ideas = session.get("ideas", [])
    mode = session.get("mode", "creative")
    topic = session.get("topic", "")
    project_name = session.get("project_name", "")
    history = session.get("feedbackHistory", [])

    next_idx = current_idx + 1

    if next_idx > 3:
        raise HTTPException(status_code=400, detail="Already at final idea")

    # History summary for context
    idea_titles = [f"Idée {i+1}: {idea['title']}" for i, idea in enumerate(ideas)]
    history_summary = "\n".join(idea_titles)

    if next_idx <= 3:
        # Transition message
        transition_msg = _chat_msg(
            "SYSTEM",
            f"Idée {current_idx} terminée. Génération de l'idée {next_idx}/3...",
            idea_index=next_idx
        )
        history.append(transition_msg)

        # Generate next idea
        new_idea = await _generate_one_idea(topic, project_name, mode, next_idx, [history_summary])
        idea_msg = _chat_msg("AI_IDEA", f"**{new_idea['title']}**\n\n{new_idea['description']}", idea_index=next_idx)
        question_msg = _chat_msg("AI_CRITIQUE", new_idea["opening_question"], idea_index=next_idx)
        history.extend([idea_msg, question_msg])
        ideas.append(new_idea)

        update_data: dict = {
            "feedbackHistory": history,
            "ideas": ideas,
            "currentIdeaIndex": next_idx,
            "critiqueCount": 0,
            "conversationStep": "WAITING_FEEDBACK",
        }

        # If this was idea #3, also synthesize
        if next_idx == 3:
            update_data["conversationStep"] = "WAITING_FEEDBACK"

        await db.brainstorming_sessions.update_one({"_id": oid}, {"$set": update_data})
        session["id"] = str(session.pop("_id"))
        session.update(update_data)
        return session

    raise HTTPException(status_code=400, detail="Unexpected state")


async def _synthesize_final(topic: str, ideas: list) -> list:
    """Rank the 3 co-pilot ideas and return a sorted list with rank/verdict/confidence."""
    ideas_block = "\n".join(
        [f"Idée {i+1}: {idea.get('title','?')} — {idea.get('description','')}" for i, idea in enumerate(ideas)]
    )
    prompt = f"""Tu es un expert en stratégie d'innovation. Voici 3 idées générées lors d'une session de co-pilotage sur le sujet : "{topic}".

{ideas_block}

Classe ces 3 idées du meilleur au moins bon selon : innovation, faisabilité, impact business.
IMPORTANT : Calcule et attribue un pourcentage de 'confidence' RÉEL (entre 0 et 100) pour chaque idée. Ne te contente pas de recopier un exemple, évalue la vraie pertinence du projet !
Réponds STRICTEMENT en JSON valide (tableau de 3 objets) en suivant ce format :
[
  {{"rank": 1, "title": "Titre exact", "confidence": 95, "verdict": "Idée la plus prometteuse car..."}},
  {{"rank": 2, "title": "Titre exact", "confidence": 82, "verdict": "Bonne idée mais..."}},
  {{"rank": 3, "title": "Titre exact", "confidence": 65, "verdict": "Intéressante mais risquée car..."}}
]
(Remplace 95, 82, 65 par tes propres scores réels)"""
    try:
        raw = await _call_ai(synthetiseur_agent.system_prompt, prompt)
        raw_clean = re.sub(r"```(?:json)?", "", raw).replace("```", "").strip()
        match = re.search(r"(\[.*\])", raw_clean, re.DOTALL)
        if match:
            ranking = json.loads(match.group(1))
            # Ensure all 3 ideas are ranked even if AI returned fewer
            ranked_titles = {r.get("title", "") for r in ranking}
            for i, idea in enumerate(ideas):
                if idea.get("title") not in ranked_titles:
                    ranking.append({
                        "rank": len(ranking) + 1,
                        "title": idea.get("title", f"Idée {i+1}"),
                        "confidence": 65,
                        "verdict": "Idée complémentaire à explorer."
                    })
            ranking.sort(key=lambda x: x.get("rank", 99))
            return ranking[:3]
    except Exception as e:
        print(f"[CoPilot] _synthesize_final error: {e}")

    # Fallback: return ideas in original order
    return [
        {"rank": i+1, "title": idea.get("title", f"Idée {i+1}"), "confidence": 80 - i*8, "verdict": "Idée générée lors de la session."}
        for i, idea in enumerate(ideas[:3])
    ]


@router.post("/copilot/{session_id}/finalize")
async def copilot_finalize(session_id: str):
    """
    Triggered after the 3rd idea's feedback cycle is complete.
    Synthesizes and ranks all 3 ideas. Manager then picks the winner.
    """
    db = get_database()
    try:
        oid = ObjectId(session_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID")

    session = await db.brainstorming_sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    ideas = session.get("ideas", [])
    topic = session.get("topic", "")
    history = session.get("feedbackHistory", [])

    # Synthesize
    ranking = await _synthesize_final(topic, ideas)

    # Build final summary message
    top = ranking[0] if ranking else {}
    summary_lines = [
        "**Classement final des 3 idées :**",
        *[f"{'🥇' if r['rank']==1 else '🥈' if r['rank']==2 else '🥉'} **{r['title']}** — {r['confidence']}% — {r['verdict']}"
          for r in ranking],
        "\n*La décision finale vous appartient. Quelle idée choisissez-vous ?*"
    ]
    summary_msg = _chat_msg("SYSTEM", "\n".join(summary_lines))
    history.append(summary_msg)

    await db.brainstorming_sessions.update_one(
        {"_id": oid},
        {"$set": {
            "status": "COMPLETED",
            "conversationStep": "FINAL_RANKING",
            "ranking": ranking,
            "feedbackHistory": history,
            "summary": f"Top idée recommandée : {top.get('title', '')} ({top.get('confidence', 0)}%)"
        }}
    )

    session["id"] = str(session.pop("_id"))
    session["ranking"] = ranking
    session["conversationStep"] = "FINAL_RANKING"
    session["feedbackHistory"] = history
    return session


@router.get("/copilot/{session_id}")
async def copilot_get(session_id: str):
    """Fetch current state of a co-pilot session."""
    db = get_database()
    try:
        oid = ObjectId(session_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID")

    session = await db.brainstorming_sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session["id"] = str(session.pop("_id"))
    return session


class WarRoomRequest(BaseModel):
    idea: str
    project_name: str

class JoinRequest(BaseModel):
    user_id: str
    name: str
    avatar: Optional[str] = None
    gender: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str = "TEAM"

class MessageRequest(BaseModel):
    content: str
    phase: str = "Live"
    role: str = "TEAM"
    user_id: str
    agent_name: str

class TypingRequest(BaseModel):
    user_name: str
    is_typing: bool

class ThreadCreate(BaseModel):
    title: str
    description: str

@router.get("/", response_model=List[BrainstormingSessionResponse])
async def get_brainstorming_sessions(current_user: dict = Depends(get_current_user)):
    db = get_database()
    query = {}
    if current_user.get("role") != "PROJECT_MANAGER":
        query["mode"] = "TEAM"
    cursor = db.brainstorming_sessions.find(query).sort("created_at", -1)
    sessions = await cursor.to_list(length=50)
    for session in sessions:
        session["id"] = str(session.pop("_id"))
    return sessions

@router.get("/team/sessions", response_model=List[BrainstormingSessionResponse])
async def get_team_brainstorming_sessions(current_user: dict = Depends(get_current_user)):
    """Sessions d'équipe (sans agents IA) — pour les membres et leads."""
    db = get_database()
    cursor = db.brainstorming_sessions.find({"mode": "TEAM"}).sort("created_at", -1)
    sessions = await cursor.to_list(length=50)
    for session in sessions:
        session["id"] = str(session.pop("_id"))
    return sessions

async def init_session(
    topic: str,
    mode: str = "AI",
    type: str = "GENERAL",
    participants: List[dict] = None,
    created_by: Optional[str] = None,
):
    db = get_database()
    session_doc = {
        "topic": topic,
        "mode": mode,
        "type": type,
        "status": "PENDING",
        "created_at": datetime.utcnow(),
        "messages": [],
        "summary": None,
        "participants": participants or [],
        "typing_users": [],
        "threads": [],
        "created_by": created_by,
    }
    result = await db.brainstorming_sessions.insert_one(session_doc)
    return str(result.inserted_id)

async def notify_team_members(session_id: str, topic: str, manager_name: str = "Le manager"):
    db = get_database()
    users_cursor = db.users.find({"role": {"$in": ["TEAM_MEMBER", "TEAM_LEAD"]}})
    users = await users_cursor.to_list(length=100)

    for user in users:
        alert = {
            "user_id": str(user["_id"]),
            "title": "Session brainstorming équipe",
            "message": f"{manager_name} vous invite à rejoindre : {topic}",
            "urgency": "ORANGE",
            "is_read": False,
            "session_id": session_id,
            "created_at": datetime.utcnow(),
        }
        await db.alerts.insert_one(alert)
        print(f"DEBUG: Notification brainstorming → {user.get('email')} — {topic}")

async def add_session_message(session_id: str, name: str, content: str, phase: str, role: str = "AI", user_id: str = None):
    db = get_database()
    msg = {
        "agent_name": name,
        "content": content,
        "phase": phase,
        "role": role,
        "user_id": user_id,
        "timestamp": datetime.utcnow()
    }
    await db.brainstorming_sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$push": {"messages": msg}}
    )

@router.post("/", response_model=BrainstormingSessionResponse)
async def create_brainstorming_session(
    session_in: BrainstormingSessionCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(check_manager_role),
):
    db = get_database()
    manager_id = str(current_user["_id"])
    manager_name = current_user.get("full_name") or "Le manager"
    session_id = await init_session(
        session_in.topic,
        session_in.mode,
        "GENERAL",
        created_by=manager_id,
    )

    if session_in.mode == "AI":
        background_tasks.add_task(run_automated_brainstorming, session_id, session_in.topic)
    elif session_in.mode == "TEAM":
        await db.brainstorming_sessions.update_one(
            {"_id": ObjectId(session_id)},
            {
                "$set": {
                    "status": "RUNNING",
                    "participants": [
                        {
                            "id": manager_id,
                            "name": manager_name,
                            "role": "MANAGER",
                            "gender": current_user.get("gender", ""),
                            "avatar_url": current_user.get("avatar_url", ""),
                        }
                    ],
                }
            },
        )
        background_tasks.add_task(
            notify_team_members, session_id, session_in.topic, manager_name
        )

    created_session = await db.brainstorming_sessions.find_one({"_id": ObjectId(session_id)})
    created_session["id"] = str(created_session.pop("_id"))
    return created_session

@router.get("/team/{session_id}")
async def get_team_session(session_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    try:
        oid = ObjectId(session_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID")
    session = await db.brainstorming_sessions.find_one({"_id": oid, "mode": "TEAM"})
    if not session:
        raise HTTPException(status_code=404, detail="Session équipe introuvable")
    session["id"] = str(session.pop("_id"))
    return session

@router.post("/{session_id}/join")
async def join_session(
    session_id: str,
    req: JoinRequest,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    try:
        oid = ObjectId(session_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID")
    session = await db.brainstorming_sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.get("mode") == "TEAM" and req.role == "AI":
        raise HTTPException(status_code=403, detail="Les agents IA ne peuvent pas rejoindre une session équipe")

    participant = {
        "id": req.user_id,
        "name": req.name,
        "avatar": req.avatar,
        "role": req.role,
        "gender": req.gender or "",
        "avatar_url": req.avatar_url or "",
    }
    await db.brainstorming_sessions.update_one(
        {"_id": oid},
        {"$addToSet": {"participants": participant}},
    )
    return {"status": "joined"}

@router.post("/{session_id}/message")
async def send_message(
    session_id: str,
    req: MessageRequest,
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    try:
        oid = ObjectId(session_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID")
    session = await db.brainstorming_sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.get("mode") == "TEAM":
        if req.role == "AI":
            raise HTTPException(
                status_code=403,
                detail="Les messages IA ne sont pas autorisés en session équipe",
            )
        if current_user.get("role") != "PROJECT_MANAGER" and req.role != "TEAM":
            raise HTTPException(status_code=403, detail="Rôle de message non autorisé")

    await add_session_message(
        session_id,
        req.agent_name,
        req.content,
        req.phase,
        req.role,
        req.user_id,
    )
    return {"status": "sent"}

@router.post("/{session_id}/typing")
async def update_typing(session_id: str, req: TypingRequest):
    db = get_database()
    if req.is_typing:
        await db.brainstorming_sessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$addToSet": {"typing_users": req.user_name}}
        )
    else:
        await db.brainstorming_sessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$pull": {"typing_users": req.user_name}}
        )
    return {"status": "updated"}

@router.post("/{session_id}/threads")
async def create_thread(session_id: str, req: ThreadCreate):
    db = get_database()
    thread = {
        "id": str(ObjectId()),
        "title": req.title,
        "description": req.description,
        "messages": [],
        "votes": {}
    }
    await db.brainstorming_sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$push": {"threads": thread}}
    )
    return thread

async def run_automated_brainstorming(session_id: str, topic: str):
    db = get_database()
    oid = ObjectId(session_id)
    
    await db.brainstorming_sessions.update_one({"_id": oid}, {"$set": {"status": "RUNNING"}})

    history = []
    
    # [PHASE 1 & 2: DIVERGENCE ITERATIVE]
    for i in range(1, 11):
        # L'Idéateur propose une idée
        ideateur_prompt = f"""Projet / Sujet : {topic}
Historique de la réunion : {chr(10).join(history[-4:])}

Génère UNIQUEMENT l'idée #{i} (un titre accrocheur et une description très courte).
Format strict: {i}. [Titre] : [Description]
L'idée doit être créative, nouvelle et différente des précédentes.
"""
        try:
            res_i = await ideateur_agent.llm.ainvoke([
                {"role": "system", "content": ideateur_agent.system_prompt},
                {"role": "user", "content": ideateur_prompt}
            ])
            idea_text = res_i.content.strip()
            await add_session_message(session_id, "L'Idéateur", idea_text, f"Idée {i}/10")
            history.append(f"Idéateur: {idea_text}")
            await asyncio.sleep(1.5)
        except Exception as e:
            print(f"Error Gen Ideateur {i}: {e}")
            break

        # Le Critique analyse l'idée
        critique_prompt = f"""Analyse spécifiquement cette idée pour le sujet '{topic}':
{idea_text}

Fais une analyse constructive très rapide (1 ou 2 phrases max) selon la méthode 'Oui, et...'.
"""
        try:
            res_c = await critique_agent.llm.ainvoke([
                {"role": "system", "content": critique_agent.system_prompt},
                {"role": "user", "content": critique_prompt}
            ])
            critique_text = res_c.content.strip()
            await add_session_message(session_id, "Le Critique", critique_text, f"Critique {i}/10")
            history.append(f"Critique: {critique_text}")
            await asyncio.sleep(1.5)
        except Exception as e:
            print(f"Error Gen Critique {i}: {e}")
            break

    # [PHASE 3: SYNTHÈSE]
    await add_session_message(session_id, "Le Synthétiseur", "Analyse finale des 10 échanges en cours...", "Synthèse")
    
    compact_history = "\n".join(history)
    synthetiseur_prompt = f"""Sujet: {topic}
Historique complet:
{compact_history}

Analyse toutes les propositions et réponses. Sélectionne les 3 MEILLEURES idées parmi les 10 discutées.
Rédige une belle synthèse finale motivant ce choix final du top 3.
"""
    try:
        synthetiseur_res = await synthetiseur_agent.llm.ainvoke([
            {"role": "system", "content": synthetiseur_agent.system_prompt},
            {"role": "user", "content": synthetiseur_prompt}
        ])
        final_summary = synthetiseur_res.content.strip()
        await add_session_message(session_id, "Le Synthétiseur", final_summary, "Final")
    except Exception as e:
        print(f"Error Synth: {e}")
        final_summary = "Synthèse générée automatiquement."
        await add_session_message(session_id, "Le Synthétiseur", final_summary, "Final")

    await db.brainstorming_sessions.update_one(
        {"_id": oid}, 
        {"$set": {"status": "COMPLETED", "summary": final_summary}}
    )

@router.get("/warroom/{session_id}")
async def get_warroom_session(session_id: str):
    db = get_database()
    try:
        oid = ObjectId(session_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid session ID")
        
    session = await db.brainstorming_sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session["id"] = str(session.pop("_id"))
    return session

@router.post("/warroom")
async def war_room_brainstorming(req: WarRoomRequest, background_tasks: BackgroundTasks):
    """
    Starts an iterative 10-step War Room brainstorming session.
    Returns session_id for polling.
    """
    session_id = await init_session(f"War Room: {req.project_name} - {req.idea}", "WARROOM")
    
    background_tasks.add_task(
        run_iterative_warroom, 
        session_id, 
        req.project_name, 
        req.idea
    )
    
    return {"session_id": session_id}

async def run_iterative_warroom(session_id: str, project_name: str, idea: str):
    db = get_database()
    oid = ObjectId(session_id)
    
    await db.brainstorming_sessions.update_one({"_id": oid}, {"$set": {"status": "RUNNING"}})
    
    history = []
    
    for i in range(1, 11):
        # 1. Ideateur: Propose Idea i
        ideateur_prompt = f"""Projet : {project_name}
        Idée de départ: {idea}
        Historique de discussion: {chr(10).join(history)}
        
        Génère uniquement l'IDÉE #{i} (titre et 1-2 phrases courtes). 
        Format: {i}. [Titre] : [Description]
        Sois créatif et différent des idées précédentes.
        """
        try:
            res_i = await ideateur_agent.llm.ainvoke([
                {"role": "system", "content": ideateur_agent.system_prompt},
                {"role": "user", "content": ideateur_prompt}
            ])
            idea_text = res_i.content.strip()
            await add_session_message(session_id, "L'Idéateur", idea_text, f"Idée {i}/10")
            history.append(f"Idéateur: {idea_text}")
            await asyncio.sleep(1.5) # Delay for step-by-step feel
        except Exception as e:
            print(f"Error in Iteration {i} Ideateur: {e}")
            break

        # 2. Critique: Critique Idea i
        critique_prompt = f"""Analyse cette idée spécifique pour le projet '{project_name}':
        {idea_text}
        
        Applique la méthode 'Yes, and...' très brièvement (1 phrase max).
        """
        try:
            res_c = await critique_agent.llm.ainvoke([
                {"role": "system", "content": critique_agent.system_prompt},
                {"role": "user", "content": critique_prompt}
            ])
            critique_text = res_c.content.strip()
            await add_session_message(session_id, "Le Critique", critique_text, f"Critique {i}/10")
            history.append(f"Critique: {critique_text}")
            if i < 10: await asyncio.sleep(1.5) # Delay for step-by-step feel
        except Exception as e:
            print(f"Error in Iteration {i} Critique: {e}")
            break

    # 3. Synthetiseur: Final Top 3
    await add_session_message(session_id, "Le Synthétiseur", "Analyse finale des 10 échanges en cours...", "Synthèse")
    
    compact_history = "\n".join([h.replace("Idéateur: ", "I: ").replace("Critique: ", "C: ") for h in history])
    
    synthetiseur_prompt = f"""Projet: {project_name}
    Discussion:
    {compact_history}
    
    Sélectionne les 3 meilleures orientations.
    Format JSON strict : [{{"id":1,"title":"...","description":"...","score":94}}, {{"id":2,...}}, {{"id":3,...}}]
    """
    try:
        res_s = await asyncio.wait_for(
            synthetiseur_agent.llm.ainvoke([
                {"role": "system", "content": synthetiseur_agent.system_prompt},
                {"role": "user", "content": synthetiseur_prompt}
            ]),
            timeout=35.0
        )
        
        raw = res_s.content.strip()
        json_match = re.search(r"(\[.*\])", raw, re.DOTALL)
        if json_match:
            clean_json = json_match.group(1)
            top_ideas = json.loads(clean_json)
        else:
            raw_clean = re.sub(r"```(?:json)?", "", raw).replace("```", "").strip()
            top_ideas = json.loads(raw_clean)
        
        await db.brainstorming_sessions.update_one(
            {"_id": oid}, 
            {"$set": {
                "status": "COMPLETED", 
                "top_ideas": top_ideas,
                "summary": "Après l'analyse des itérations, voici les 3 orientations sélectionnées."
            }}
        )
        await add_session_message(session_id, "Le Synthétiseur", "Synthèse terminée. Les 3 meilleures options sont prêtes.", "Final")

    except Exception as e:
        print(f"Synthesis failed or timed out: {e}")
        await db.brainstorming_sessions.update_one(
            {"_id": oid}, 
            {"$set": {
                "status": "COMPLETED", 
                "summary": "Synthèse rapide générée suite à un délai de réponse de l'IA."
            }}
        )
        await add_session_message(session_id, "Le Synthétiseur", "Synthèse rapide terminée (Mode Fallback).", "Final")

# ── TECH WATCH ENDPOINT ──────────────────────────────────────────────────────
class VeilleTechRequest(BaseModel):
    project_name: str
    description: str
    category: Optional[str] = None
    target_users: Optional[str] = None
    technologies: Optional[List[str]] = None
    business_goals: Optional[str] = None
    timestamp: Optional[int] = None

class AnalyzeTrendRequest(BaseModel):
    project_name: str
    project_description: str
    trend_title: str
    trend_category: str
    trend_snippet: str

# ── DOMAIN KEYWORD → CONCRETE TECH QUERIES MAP ──────────────────────────────
# Maps known project domains to specific real software/framework searches.
# RESTRICTED TO OFFICIAL SOURCES ONLY: Autodesk, Unreal Engine, CGS3D, Epic Games, NVIDIA

DOMAIN_TECH_MAP = {
    "architecture": [
        {"tech": "Autodesk Revit", "query": "Autodesk Revit BIM architecture 2025 site:autodesk.com", "category": "Design"},
        {"tech": "Unreal Engine 5 ArchViz", "query": "Unreal Engine 5 architectural visualization 2025 site:unrealengine.com", "category": "Unreal Engine"},
        {"tech": "NVIDIA Omniverse", "query": "NVIDIA Omniverse digital twin architecture 2025 site:nvidia.com", "category": "Simulation"},
        {"tech": "Autodesk 3ds Max", "query": "Autodesk 3ds Max 2025 architectural rendering site:autodesk.com", "category": "Rendering"},
    ],
    "maison": [
        {"tech": "Autodesk Revit", "query": "Autodesk Revit BIM architecture 2025 site:autodesk.com", "category": "Design"},
        {"tech": "Unreal Engine 5 ArchViz", "query": "Unreal Engine 5 architectural visualization 2025 site:unrealengine.com", "category": "Unreal Engine"},
        {"tech": "NVIDIA Omniverse", "query": "NVIDIA Omniverse digital twin architecture 2025 site:nvidia.com", "category": "Simulation"},
    ],
    "3d": [
        {"tech": "Autodesk Maya 2025", "query": "Autodesk Maya 2025 new features 3D site:autodesk.com", "category": "CGI / Animation"},
        {"tech": "UE5 MetaHuman", "query": "Unreal Engine MetaHuman Creator 2025 site:unrealengine.com", "category": "3D"},
        {"tech": "Fab Marketplace", "query": "Epic Games Fab marketplace 3D assets site:epicgames.com", "category": "3D"},
        {"tech": "NVIDIA DLSS 4", "query": "NVIDIA DLSS 4 3D rendering site:nvidia.com", "category": "GPU"},
    ],
    "jeu": [
        {"tech": "Unreal Engine 5.4", "query": "Unreal Engine 5.4 new features game dev site:unrealengine.com", "category": "Unreal Engine"},
        {"tech": "Epic Online Services", "query": "Epic Online Services multiplayer SDK site:epicgames.com", "category": "Game Development"},
        {"tech": "NVIDIA ACE AI", "query": "NVIDIA ACE AI NPC avatar game character site:nvidia.com", "category": "IA"},
        {"tech": "Epic Games Store", "query": "Epic Games Store publishing features site:epicgames.com", "category": "Game Development"},
    ],
    "animation": [
        {"tech": "Animation 3D VFX", "query": "animation 3D VFX production pipeline site:cgs3d.com", "category": "CGI / Animation"},
        {"tech": "Motion Capture", "query": "motion capture animation 3D workflow site:cgs3d.com", "category": "CGI / Animation"},
        {"tech": "Autodesk Maya", "query": "Autodesk Maya animation tools 2025 site:autodesk.com", "category": "CGI / Animation"},
    ],
    "ia": [
        {"tech": "NVIDIA RTX Blackwell", "query": "NVIDIA RTX Blackwell architecture GPU AI 2025 site:nvidia.com", "category": "GPU"},
        {"tech": "NVIDIA DLSS 4", "query": "NVIDIA DLSS 4 neural rendering site:nvidia.com", "category": "IA"},
        {"tech": "NVIDIA ACE AI", "query": "NVIDIA ACE AI NPC avatar site:nvidia.com", "category": "IA"},
        {"tech": "Autodesk Generative Design", "query": "Autodesk AI generative design 2025 site:autodesk.com", "category": "Design"},
    ],
    "simulation": [
        {"tech": "NVIDIA Omniverse", "query": "NVIDIA Omniverse simulation 2025 site:nvidia.com", "category": "Simulation"},
        {"tech": "UE5 Procedural Generation", "query": "Unreal Engine 5 procedural content generation PCG site:unrealengine.com", "category": "Game Development"},
    ],
    "vfx": [
        {"tech": "UE5 Real-Time VFX", "query": "Unreal Engine 5 real-time VFX Niagara site:unrealengine.com", "category": "Virtual Production"},
        {"tech": "Compositing VFX", "query": "compositing VFX pipeline site:cgs3d.com", "category": "CGI / Animation"},
        {"tech": "Autodesk Arnold", "query": "Autodesk Arnold VFX rendering site:autodesk.com", "category": "Rendering"},
    ],
    "museum": [
        {"tech": "Unreal Engine 5 ArchViz", "query": "Unreal Engine 5 architectural visualization museum 2025 site:unrealengine.com", "category": "Unreal Engine"},
        {"tech": "NVIDIA Omniverse", "query": "NVIDIA Omniverse digital twin museum 2025 site:nvidia.com", "category": "Simulation"},
    ]
}

# Mapping of tech names to their official base URLs to enforce sources
TECH_URL_MAP = {
    "Autodesk": "https://www.autodesk.com/fr",
    "Unreal Engine": "https://www.unrealengine.com",
    "Epic": "https://store.epicgames.com/fr",
    "NVIDIA": "https://www.nvidia.com/fr-fr/",
    "CGS3D": "https://www.cgs3d.com/site/fr/",
    "Fab": "https://store.epicgames.com/fr",
    "Animation": "https://www.cgs3d.com/site/fr/",
    "Motion": "https://www.cgs3d.com/site/fr/",
    "Compositing": "https://www.cgs3d.com/site/fr/"
}

def get_official_url_for_tech(tech_name: str) -> str:
    for key, url in TECH_URL_MAP.items():
        if key.lower() in tech_name.lower():
            return url
    return "https://www.unrealengine.com" # Safe default

OFFICIAL_YOUTUBE_VIDEOS = {
    "Autodesk": {"url": "https://www.youtube.com/watch?v=CTUkmDfIOUM", "author": "Autodesk", "thumb": "https://img.youtube.com/vi/CTUkmDfIOUM/hqdefault.jpg", "date": "2026-04-15"},
    "Unreal Engine": {"url": "https://www.youtube.com/watch?v=qC5KtatMcUw", "author": "Unreal Engine", "thumb": "https://img.youtube.com/vi/qC5KtatMcUw/hqdefault.jpg", "date": "2026-03-20"},
    "Epic": {"url": "https://www.youtube.com/watch?v=bPn_PGuYesw", "author": "Epic Games", "thumb": "https://img.youtube.com/vi/bPn_PGuYesw/hqdefault.jpg", "date": "2026-04-10"},
    "NVIDIA": {"url": "https://www.youtube.com/watch?v=u5TNCt45Q90", "author": "NVIDIA", "thumb": "https://img.youtube.com/vi/u5TNCt45Q90/hqdefault.jpg", "date": "2026-04-05"},
    "CGS3D": {"url": "https://www.youtube.com/watch?v=VzBwhvNbG3k", "author": "CGS3D", "thumb": "https://img.youtube.com/vi/VzBwhvNbG3k/hqdefault.jpg", "date": "2026-03-25"}
}

def get_official_youtube_info(tech_name: str) -> dict:
    for key, info in OFFICIAL_YOUTUBE_VIDEOS.items():
        if key.lower() in tech_name.lower():
            return info
    return OFFICIAL_YOUTUBE_VIDEOS["Unreal Engine"]

OFFICIAL_IMAGES = {
    "Autodesk": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Autodesk_logo.svg/800px-Autodesk_logo.svg.png",
    "Unreal Engine": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Unreal_Engine_4_logo.png/800px-Unreal_Engine_4_logo.png",
    "Epic": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Epic_Games_logo.svg/800px-Epic_Games_logo.svg.png",
    "NVIDIA": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/NVIDIA_logo.svg/800px-NVIDIA_logo.svg.png",
    "CGS3D": "https://picsum.photos/seed/cgs3d/800/400.jpg"
}

def get_official_image_for_tech(tech_name: str) -> str:
    for key, img in OFFICIAL_IMAGES.items():
        if key.lower() in tech_name.lower():
            return img
    return "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Unreal_Engine_4_logo.png/800px-Unreal_Engine_4_logo.png"

YOUTUBE_SUFFIXES = [" tutorial 2025", " explained 2025", " crash course 2024", " guide 2025"]

def match_project_to_techs(project_name: str, description: str, n: int = 3) -> list[dict]:
    """
    Match the combined project text to domain keywords and return
    the top-n most relevant tech query specs.
    """
    text = (project_name + " " + description).lower()
    matched = []
    seen = set()

    priority_order = ["architecture", "maison", "museum", "jeu", "game", "animation", "vfx", "simulation", "ia", "3d"]

    for kw in priority_order:
        if kw in text:
            for item in DOMAIN_TECH_MAP.get(kw, []):
                if item["tech"] not in seen:
                    matched.append(item)
                    seen.add(item["tech"])

    # Fallback: general 3d + ia if no specific keywords match
    if not matched:
        matched = DOMAIN_TECH_MAP["3d"] + DOMAIN_TECH_MAP["ia"]

    return matched[:n]


def _ddg_text_search(query: str, count: int) -> list[dict]:
    ddgs = DDGS()
    try:
        # timelimit='m' ensures we only get the latest innovations (past month)
        return list(ddgs.text(query, max_results=count, timelimit='m'))
    except:
        return []

async def search_tech_real(query: str, count: int = 3) -> list[dict]:
    try:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _ddg_text_search, query, count)
    except Exception as e:
        print(f"[DDG text error] '{query}': {e}")
        return []

def _ddg_video_search(query: str, count: int) -> list[dict]:
    ddgs = DDGS()
    try:
        # Use DDGS videos to get real title, date, publisher
        results = list(ddgs.videos(query, max_results=count, timelimit='m'))
        if not results:
            results = list(ddgs.videos(query, max_results=count))
        return results
    except Exception as e:
        print("DDG Video Search error:", e)
    return []

async def search_video_real(query: str, count: int = 3) -> list[dict]:
    try:
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(None, _ddg_video_search, query, count)
        return results
    except Exception as e:
        print(f"[DDG Video error] '{query}': {e}")
        return []

async def get_dynamic_tech_queries(project_name: str, description: str) -> list[dict]:
    prompt = f"""Tu es un expert en veille technologique pour l'industrie 3D/Jeux vidéo/Simulation.
Projet: "{project_name}"
Description: "{description}"

Choisis les 4 technologies les plus pertinentes et précises à surveiller pour CE projet (sois très spécifique, ex: "MetaHuman Animator", "Nanite", "DLSS 3", "Revit 2025").
TU DOIS utiliser STRICTEMENT les 5 sources officielles suivantes:
- site:unrealengine.com
- site:autodesk.com
- site:nvidia.com
- site:epicgames.com
- site:cgs3d.com

Réponds UNIQUEMENT en JSON valide:
[
  {{"tech": "Nom de la tech", "query": "mots clés site:domaine.com", "category": "Catégorie", "domain": "domaine.com"}}
]"""
    try:
        groq_key = get_rotated_groq_key()
        if groq_key:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                    json={
                        "model": "llama-3.1-8b-instant",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.3,
                        "max_tokens": 500,
                    }
                )
            if resp.status_code == 200:
                raw = resp.json()["choices"][0]["message"]["content"].strip()
                if not raw:
                    raise ValueError("Empty response from LLM")
                match = re.search(r"(\[.*\])", raw, re.DOTALL)
                if match:
                    raw = match.group(1)
                else:
                    raw = re.sub(r"```(?:json)?", "", raw).replace("```", "").strip()
                return json.loads(raw)
    except Exception as e:
        print(f"Dynamic queries error: {e}")
    
    # Fallback to hardcoded mapping
    return match_project_to_techs(project_name, description, n=4)

import urllib.parse

ALLOWED_DOMAINS = [
    "unrealengine.com",
    "epicgames.com",
    "nvidia.com",
    "developer.nvidia.com",
    "autodesk.com",
    "youtube.com",
    "cgs3d.com"
]

def is_valid_official_url(url: str) -> bool:
    if not url: return False
    try:
        parsed = urllib.parse.urlparse(url)
        hostname = parsed.hostname or ""
        valid_domain = any(d in hostname.lower() for d in ALLOWED_DOMAINS)
        
        # reject homepage paths
        path = parsed.path.strip("/")
        is_homepage = path in ["", "fr", "en", "site/fr", "fr-fr", "store"]
        
        # prevent random non-video youtube links if youtube domain
        if "youtube.com" in hostname.lower() or "youtu.be" in hostname.lower():
            if "watch?v=" not in url and "youtu.be/" not in url:
                return False
                
        return valid_domain and not is_homepage
    except Exception:
        return False

@router.post("/veille-tech")
async def veille_tech(req: VeilleTechRequest):
    """
    REAL tech watch: official RSS feeds + official YouTube channel RSS.
    NO LLM used as source of truth for URLs. Hard domain whitelist enforced.
    """
    from app.services.veille_real import fetch_veille_tech
    groq_key = get_rotated_groq_key()
    
    # Combine extra context into a rich description for the search service
    rich_context = f"{req.description}\n"
    if req.category: rich_context += f"Catégorie: {req.category}\n"
    if req.target_users: rich_context += f"Cible: {req.target_users}\n"
    if req.business_goals: rich_context += f"Objectifs: {req.business_goals}\n"
    if req.technologies: rich_context += f"Stack: {', '.join(req.technologies)}\n"
    
    return await fetch_veille_tech(
        project_name=req.project_name.strip(),
        description=rich_context.strip(),
        groq_key=groq_key,
        seed=req.timestamp,
    )


@router.post("/analyze-trend")
async def analyze_trend(req: AnalyzeTrendRequest):
    """
    Analyzes how a selected tech trend integrates into the project idea.
    Returns a structured innovation plan with concrete features.
    """
    prompt = f"""
Tu es un architecte de systèmes innovants de classe mondiale. Analyse comment intégrer cette tendance dans ce projet spécifique.

PROJET: "{req.project_name}"
DESCRIPTION: {req.project_description}

TENDANCE CHOISIE: {req.trend_title}
CATÉGORIE: {req.trend_category}
RÉSUMÉ: {req.trend_snippet}

Génère un plan d'intégration concret. RÉPONDS UNIQUEMENT en JSON valide:
{{
  "impact_score": 94,
  "integration_title": "Titre court et percutant de cette intégration (ex: 'Recommandations IA Temps Réel')",
  "one_liner": "Une seule phrase choc qui résume comment cette tendance transforme radicalement ce projet",
  "innovations": [
    {{"icon": "🧠", "label": "Feature 1 (3 mots max)", "detail": "Description concrète (1 phrase courte)"}},
    {{"icon": "⚡", "label": "Feature 2 (3 mots max)", "detail": "Description concrète (1 phrase courte)"}},
    {{"icon": "🔗", "label": "Feature 3 (3 mots max)", "detail": "Description concrète (1 phrase courte)"}}
  ],
  "enriched_description": "Description complète du projet enrichi par cette tendance (3-4 phrases très concrètes et spécifiques au projet)"
}}
"""
    try:
        res = await synthetiseur_agent.llm.ainvoke([
            {"role": "system", "content": "Expert en innovation technologique. Tu réponds UNIQUEMENT en JSON valide."},
            {"role": "user", "content": prompt}
        ])
        raw = re.sub(r"```(?:json)?", "", res.content.strip()).replace("```", "").strip()
        json_match = re.search(r"(\{.*\})", raw, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(1))
    except Exception as e:
        print("Analyze trend error:", e)

    raise HTTPException(status_code=500, detail="Failed to analyze trend")





@router.delete("/{session_id}")
async def delete_brainstorming_session(session_id: str):
    """Permanently delete a brainstorming session by ID."""
    db = get_database()
    try:
        oid = ObjectId(session_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID")
    result = await db.brainstorming_sessions.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "deleted", "session_id": session_id}



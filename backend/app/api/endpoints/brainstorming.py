from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Optional
from bson import ObjectId
from app.core.db import get_database
from app.models.brainstorming import BrainstormingSessionCreate, BrainstormingSessionResponse
from app.services.agents.orchestrator import ideateur_agent, critique_agent, synthetiseur_agent
from datetime import datetime
import asyncio

router = APIRouter()

@router.get("/", response_model=List[BrainstormingSessionResponse])
async def get_brainstorming_sessions():
    db = get_database()
    cursor = db.brainstorming_sessions.find().sort("created_at", -1)
    sessions = await cursor.to_list(length=50)
    return [{**session, "id": str(session["_id"])} for session in sessions]

@router.post("/", response_model=BrainstormingSessionResponse)
async def create_brainstorming_session(session_in: BrainstormingSessionCreate, background_tasks: BackgroundTasks):
    db = get_database()
    session_dict = session_in.model_dump()
    session_dict["created_at"] = datetime.utcnow()
    session_dict["messages"] = []
    
    result = await db.brainstorming_sessions.insert_one(session_dict)
    session_id = str(result.inserted_id)
    
    # Start the automated brainstorming process in the background
    background_tasks.add_task(run_automated_brainstorming, session_id, session_in.topic)
    
    created_session = await db.brainstorming_sessions.find_one({"_id": result.inserted_id})
    return {**created_session, "id": session_id}

async def run_automated_brainstorming(session_id: str, topic: str):
    db = get_database()
    oid = ObjectId(session_id)
    
    # helper to update session messages
    async def add_message(name: str, content: str, phase: str):
        msg = {
            "agent_name": name,
            "content": content,
            "phase": phase,
            "timestamp": datetime.utcnow()
        }
        await db.brainstorming_sessions.update_one(
            {"_id": oid},
            {"$push": {"messages": msg}}
        )

    await db.brainstorming_sessions.update_one({"_id": oid}, {"$set": {"status": "RUNNING"}})

    # [PHASE 1: DIVERGENCE]
    ideateur_res = await ideateur_agent.llm.ainvoke([
        {"role": "system", "content": ideateur_agent.system_prompt},
        {"role": "user", "content": f"Sujet : {topic}\nLance 5 idées explosives."}
    ])
    await add_message("L'Idéateur", ideateur_res.content, "Divergence")
    await asyncio.sleep(2) # simulate "thinking" for UI

    # [PHASE 2: REBOND]
    critique_res = await critique_agent.llm.ainvoke([
        {"role": "system", "content": critique_agent.system_prompt},
        {"role": "user", "content": f"Rebondis sur ces idées :\n{ideateur_res.content}"}
    ])
    await add_message("Le Critique", critique_res.content, "Rebond")
    await asyncio.sleep(2)

    # [PHASE 3: SYNTHÈSE]
    synthetiseur_res = await synthetiseur_agent.llm.ainvoke([
        {"role": "system", "content": synthetiseur_agent.system_prompt},
        {"role": "user", "content": f"Synthétise :\n{ideateur_res.content}\n{critique_res.content}"}
    ])
    await add_message("Le Synthétiseur", synthetiseur_res.content, "Synthèse")
    
    await db.brainstorming_sessions.update_one(
        {"_id": oid}, 
        {"$set": {"status": "COMPLETED", "summary": synthetiseur_res.content}}
    )

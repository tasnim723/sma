from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import asyncio
import httpx
import os
from app.api.deps import get_current_user
from app.services.agents.orchestrator import gatekeeper_system
from langchain_core.messages import HumanMessage, AIMessage

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, str]] = []
    file: Optional[Dict[str, str]] = None

@router.post("/voice")
async def transcribe_voice(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    api_key = os.getenv("GROQ_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {api_key}"},
            files={"file": (file.filename, await file.read(), file.content_type)},
            data={
                "model": "whisper-large-v3",
                "response_format": "json"
            }
        )
        data = response.json()
        return {"text": data.get("text", "")}

@router.post("/chat")
async def chat_with_multi_agent(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    messages = []
    for h in request.history:
        if h["role"] == "user":
            messages.append(HumanMessage(content=h["content"]))
        else:
            messages.append(AIMessage(content=h["content"]))
            
    content = []
    if request.message:
        content.append({"type": "text", "text": request.message})
    
    if request.file:
        from app.services.file_processor import process_file_data
        
        # If it's an image and we have a vision model enabled (later), 
        # but for now, we also extract info/text.
        extracted_content = process_file_data(
            request.file["name"], 
            request.file["type"], 
            request.file["base64"]
        )
        
        if "image" in request.file["type"]:
            # Note: Groq text-only models (8b/70b) will return 400 if an image_url is present.
            # We provide image metadata as text context instead until vision is re-enabled.
            content.append({
                "type": "text",
                "text": f"\n\n[USER ATTACHED IMAGE: {request.file['name']}]\n{extracted_content}"
            })
        else:
            # For documents/text, we append the actual extracted text
            content.append({
                "type": "text", 
                "text": f"\n\n[USER ATTACHED FILE: {request.file['name']}]\nContent:\n{extracted_content}"
            })

    messages.append(HumanMessage(content=content))
    state = {"messages": messages}

    async def event_generator():
        try:
            async for chunk in gatekeeper_system.astream(state, stream_mode="updates"):
                if "stubborn" in chunk:
                    last_msg = chunk["stubborn"]["messages"][-1]
                    if getattr(last_msg, "tool_calls", None):
                        for t in last_msg.tool_calls:
                            yield f"data: {json.dumps({'type': 'tool_start', 'tool': t['name'], 'input': t.get('args', {})})}\n\n"
                    else:
                        content = getattr(last_msg, "content", "")
                        # Simulate stream for UI while preserving formatting
                        # Instead of splitting by space (which loses \n), we stream chunks
                        chunk_size = 5
                        for i in range(0, len(content), chunk_size):
                            token = content[i:i+chunk_size]
                            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
                            await asyncio.sleep(0.01)
                elif "tools" in chunk:
                    last_msg = chunk["tools"]["messages"][-1]
                    name = getattr(last_msg, "name", "unknown_tool")
                    yield f"data: {json.dumps({'type': 'tool_end', 'tool': name, 'output': 'Success'})}\n\n"
                    
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

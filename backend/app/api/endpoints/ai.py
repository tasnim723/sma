from fastapi import APIRouter, Depends, File, UploadFile, HTTPException  # type: ignore
from fastapi.responses import StreamingResponse  # type: ignore
from pydantic import BaseModel  # type: ignore
from typing import List, Dict, Any, Optional
import json
import asyncio
import time
import httpx  # type: ignore
import os
from app.api.deps import get_current_user
from app.services.agents.orchestrator import gatekeeper_system
from app.services.file_processor import process_file_data
import base64
from google import genai  # type: ignore
from google.genai import types as genai_types  # type: ignore
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage  # type: ignore
from app.core.keys import get_rotated_groq_key

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, str]] = []
    file: Optional[Dict[str, str]] = None

@router.post("/voice")
async def transcribe_voice(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    api_key = get_rotated_groq_key()
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {api_key}"},
            files={"file": (file.filename, await file.read(), file.content_type)},
            data={
                "model": "whisper-large-v3",
                "response_format": "json",
                "language": "fr",
                "prompt": "Bonjour, voici ma demande."
            }
        )
        if response.status_code != 200:
            print(f"Groq API Error: {response.text}")
            from fastapi import HTTPException  # type: ignore
            raise HTTPException(status_code=response.status_code, detail=f"Transcription Failed: {response.text}")
            
        data = response.json()
        return {"text": data.get("text", "")}

@router.post("/chat")
async def chat_with_multi_agent(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    messages = []
    # Keep only the last 4 messages to avoid token limit errors (Groq 6000 TPM)
    history_to_send = request.history[-4:] if len(request.history) > 4 else request.history
    
    for h in history_to_send:
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
    
    # Inject current user info into the very beginning of the context
    # so the agent knows who it is talking to (e.g. for notifications)
    user_context = f"[CONTEXT] L'utilisateur actuel est: {current_user.get('full_name', 'User')} (ID: {str(current_user.get('_id', 'unknown'))})"
    
    state = {"messages": [SystemMessage(content=user_context)] + messages}

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
                        # Sanitize: strip raw function call syntax that small models sometimes hallucinate
                        import re
                        content = re.sub(r'<function=\w+>.*?</function>', '', content, flags=re.DOTALL)
                        content = re.sub(r'</?function\w*>', '', content)
                        content = re.sub(r'function\.\w+\([^)]*\)', '', content)
                        # Also strip JSON blobs that the model sometimes dumps
                        content = re.sub(r'\{["\']type["\']:\s*["\']function["\'].*?\}', '', content, flags=re.DOTALL)
                        content = content.strip()
                        
                        if not content:
                            continue
                        
                        # Stream chunks for smooth UI rendering
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
            error_msg = "Désolé, je rencontre un problème temporaire. Veuillez réessayer dans quelques secondes."
            print(f"AI Chat Error: {type(e).__name__}: {e}")
            yield f"data: {json.dumps({'type': 'token', 'content': error_msg})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/analyze-cv")
async def analyze_cv(file: UploadFile = File(...)):
    """Analyze a CV file and extract structured information using AI."""
    content = await file.read()
    filename = file.filename or "cv.pdf"
    file_type = file.content_type or "application/octet-stream"
    
    print(f"\n[CV ANALYSIS] File: {filename} | Type: {file_type} | Size: {len(content)} bytes")
    
    # ── Extract text from PDF ──────────────────────────────────────────────────
    from app.services.file_processor import extract_text_from_pdf_bytes, is_pdf_bytes, process_file_data
    import re
    
    # Try direct PDF bytes extraction first (most reliable)
    if is_pdf_bytes(content) or "pdf" in file_type.lower() or filename.lower().endswith(".pdf"):
        text_content = extract_text_from_pdf_bytes(content)
    else:
        # Fallback to base64 path for other types
        b64 = base64.b64encode(content).decode('utf-8')
        text_content = process_file_data(filename, file_type, b64)
    
    print(f"[CV ANALYSIS] Extracted text length: {len(text_content)} chars")
    print(f"[CV ANALYSIS] Text preview (first 500 chars):\n{text_content[:500]}")
    
    if not text_content or len(text_content.strip()) < 30:
        from fastapi import HTTPException  # type: ignore
        raise HTTPException(
            status_code=400,
            detail="Impossible d'extraire le texte du CV. Assurez-vous que le fichier est un PDF valide avec du texte (pas une image scannée)."
        )
    
    if "[ERROR" in text_content or "[PDF_ERROR" in text_content:
        from fastapi import HTTPException  # type: ignore
        raise HTTPException(status_code=400, detail=f"Erreur d'extraction : {text_content}")

    # ── Call Gemini ──────────────────────────────────────────────────────────
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY not configured")
        
    client = genai.Client(api_key=api_key)
    model_id = 'gemini-2.5-flash'
    
    prompt = f"""You are an expert multilingual HR recruiter and CV parser.
The CV text below may be written in ENGLISH, FRENCH, ARABIC, or a mix of languages.
Your task is to extract structured information EXACTLY as it appears in the CV.

=== CRITICAL EXTRACTION RULES — READ CAREFULLY ===

LANGUAGE: Detect the CV language automatically. Parse correctly regardless of language.

FULL NAME ("prenom" + "nom"):
- Split into first name (prenom) and last name (nom)
- Arabic names: transliterate to Latin (e.g. محمد -> Mohamed)
- If only one name word found, put it in "prenom", leave "nom" empty
- Ignore titles: "Mr", "Dr", "Ing", "M."

EMAIL — CRITICAL:
- Search the ENTIRE text for any pattern matching: word@word.word
- Extract it CHARACTER-BY-CHARACTER exactly as written. Do NOT alter it.
- If multiple emails found, pick the most prominent one (usually at the top)
- If no email found, return ""

TELEPHONE — CRITICAL:
- Extract the phone number EXACTLY as written in the CV. Do NOT reformat or normalize it.
- Keep the exact spacing, dashes, parentheses, and country code prefix as-is.
- Examples of exact extraction: "+216 55 123 456", "06-12-34-56-78", "(+33) 6 12 34 56 78"
- If multiple phone numbers found, pick the first/most prominent one.
- If no phone found, return ""

LINKEDIN URL — CRITICAL:
- Search for any URL containing "linkedin.com" anywhere in the text
- Extract the FULL URL exactly as written (e.g. "https://www.linkedin.com/in/firstname-lastname")
- Also look for text like "linkedin.com/in/...", "/in/...", or "LinkedIn: ..."
- If not found, return ""

GITHUB URL — CRITICAL:
- Search for any URL containing "github.com" anywhere in the text
- Extract the FULL URL exactly as written (e.g. "https://github.com/username")
- Also look for text like "github.com/...", "GitHub: ..."
- If not found, return ""

ROLE (job title):
- Use the EXACT title or closest English/French equivalent from the CV header/summary
- Examples: "Développeur Full Stack", "Ingénieur Logiciel", "Data Scientist", "DevOps Engineer"

GRADE — CRITICAL: READ FROM CV, DO NOT INFER:
- First look in the CV for explicit keywords: "Stagiaire", "Junior", "Intermédiaire" / "Intermediate", "Senior", "Expert", "Lead", "Intern", "Stage", "PFE"
- If the CV says "Stagiaire", "Stage", "PFE", "Intern", "Internship" → output "Stagiaire"
- If the CV says "Junior" → output "Junior"
- If the CV says "Sénior" / "Senior" → output "Senior"
- ONLY if no explicit grade/seniority is written in the CV, THEN estimate:
  - 0 years = "Stagiaire" or "Junior"
  - 1-2 years = "Junior"
  - 2-5 years = "Intermédiaire"
  - 5-10 years = "Senior"
  - 10+ years = "Expert"
  - Team lead/architect role = "Lead"
- Output MUST be exactly one of: "Stagiaire", "Junior", "Intermédiaire", "Senior", "Expert", "Lead"

COMPETENCES (skills list) — CRITICAL:
- Extract ALL technical skills EXACTLY as mentioned in the CV
- Include: programming languages, frameworks, libraries, tools, platforms, cloud services, databases, methodologies, dev practices
- Keep skill names in their canonical form: Python, JavaScript, React, Node.js, Docker, etc.
- Do NOT include soft skills (communication, teamwork, leadership, etc.)
- Be EXHAUSTIVE — include every technical term you see

EXPERIENCE:
- Total YEARS of professional work experience (integer, 0 if student/intern)
- Do NOT count school projects or internships as professional experience

NOTES:
- 1-sentence summary of the candidate's profile IN FRENCH

POSITION:
- Specific position title from the CV (more specific than "role")

=== OUTPUT FORMAT — RETURN ONLY THIS JSON, NO OTHER TEXT ===

{{
  "prenom": "First name exactly from CV",
  "nom": "Last name exactly from CV",
  "email": "exact@email.from.cv",
  "telephone": "exact phone as written in CV",
  "linkedin_url": "https://linkedin.com/in/profile or empty string",
  "github_url": "https://github.com/username or empty string",
  "role": "Job role",
  "position": "Specific position title",
  "grade": "One of: Stagiaire|Junior|Intermédiaire|Senior|Expert|Lead",
  "competences": ["Skill1", "Skill2", "Skill3"],
  "experience": 0,
  "notes": "Résumé du profil en français."
}}

=== CV TEXT TO ANALYZE ===
---
{text_content[:10000]}
---

REMINDER: Return ONLY the JSON object. No markdown fences, no explanation, no text before or after."""

    try:
        print("[CV ANALYSIS] Calling Gemini API...")
        # Retry up to 3 times on 429 quota errors, respecting the retry_delay from the API
        import re as _re
        response = None
        last_error = None
        for attempt in range(3):
            try:
                response = await asyncio.to_thread(
                    client.models.generate_content,
                    model=model_id,
                    contents=prompt
                )
                break
            except Exception as api_err:
                last_error = api_err
                err_str = str(api_err)
                if "429" in err_str or "quota" in err_str.lower() or "rate" in err_str.lower() or "503" in err_str or "unavailable" in err_str.lower() or "500" in err_str:
                    # Try to extract the recommended retry delay from the error message
                    delay_match = _re.search(r'retry[_\s]delay\s*\{\s*seconds:\s*(\d+)', err_str)
                    if delay_match:
                        wait_secs = int(delay_match.group(1)) + 2  # add 2s buffer
                    else:
                        wait_secs = (attempt + 1) * 10  # fallback: 10s, 20s, 30s
                    print(f"[CV ANALYSIS] API busy/quota (attempt {attempt+1}/3), retrying in {wait_secs}s...")
                    await asyncio.sleep(wait_secs)
                else:
                    raise api_err
        if response is None:
            print("[CV ANALYSIS] Gemini failed after retries. Falling back to Groq...")
            groq_key = get_rotated_groq_key()
            if groq_key:
                try:
                    # Truncate prompt to fit within LLaMA3-8b's 8192 token limit
                    groq_prompt = prompt[:6000] if len(prompt) > 6000 else prompt
                    async with httpx.AsyncClient() as hc:
                        groq_res = await hc.post(
                            "https://api.groq.com/openai/v1/chat/completions",
                            headers={"Authorization": f"Bearer {groq_key}"},
                            json={
                                "model": "llama-3.1-8b-instant",
                                "messages": [{"role": "user", "content": groq_prompt}],
                                "temperature": 0.1,
                                "response_format": {"type": "json_object"}
                            },
                            timeout=60.0
                        )
                        print(f"[CV ANALYSIS] Groq status: {groq_res.status_code}")
                        if groq_res.status_code == 200:
                            groq_content = groq_res.json()["choices"][0]["message"]["content"]
                            print(f"[CV ANALYSIS] Groq succeeded! Preview: {groq_content[:200]}")
                            return json.loads(groq_content)
                        else:
                            print(f"[CV ANALYSIS] Groq error body: {groq_res.text[:300]}")
                except Exception as groq_err:
                    print(f"[CV ANALYSIS] Groq exception: {type(groq_err).__name__}: {groq_err}")

            raise HTTPException(
                status_code=429,
                detail="Le service IA est temporairement surchargé. Veuillez patienter une minute et réessayer."
            )
        res_text = response.text.strip()
        print(f"[CV ANALYSIS] Gemini response (first 600 chars):\n{res_text[:600]}")

        # Strip markdown code fences if present
        if "```json" in res_text:
            res_text = res_text.split("```json")[1].split("```")[0].strip()
        elif "```" in res_text:
            res_text = res_text.split("```")[1].split("```")[0].strip()

        # Find JSON object using regex (handles surrounding text)
        import re
        json_match = re.search(r'\{[\s\S]*\}', res_text)
        if json_match:
            res_text = json_match.group(0)

        data = json.loads(res_text)

        # Ensure competences is a list of non-empty strings
        if not isinstance(data.get("competences"), list):
            data["competences"] = []
        data["competences"] = [str(c).strip() for c in data["competences"] if c and str(c).strip()]

        # Ensure experience is an integer
        try:
            data["experience"] = int(data.get("experience", 0) or 0)
        except (ValueError, TypeError):
            data["experience"] = 0

        # Validate grade against allowed values
        allowed_grades = {"Stagiaire", "Junior", "Intermédiaire", "Senior", "Expert", "Lead"}
        if data.get("grade") not in allowed_grades:
            # Try case-insensitive match
            grade_lower = str(data.get("grade", "")).strip().lower()
            grade_map = {
                "stagiaire": "Stagiaire", "intern": "Stagiaire", "stage": "Stagiaire", "pfe": "Stagiaire",
                "junior": "Junior",
                "intermédiaire": "Intermédiaire", "intermediaire": "Intermédiaire", "intermediate": "Intermédiaire", "mid": "Intermédiaire",
                "senior": "Senior", "sénior": "Senior",
                "expert": "Expert",
                "lead": "Lead"
            }
            data["grade"] = grade_map.get(grade_lower, "Junior")

        # Ensure LinkedIn and GitHub URLs are present
        for url_field in ["linkedin_url", "github_url"]:
            data.setdefault(url_field, "")
            data[url_field] = str(data[url_field]).strip()
            # Sanitize: must start with http if non-empty
            if data[url_field] and not data[url_field].startswith("http"):
                data[url_field] = "https://" + data[url_field]

        # Clean all string fields
        for field in ["prenom", "nom", "email", "telephone", "role", "grade", "notes", "position"]:
            data.setdefault(field, "")
            data[field] = str(data[field]).strip()

        # Store the filename for reference
        data["cv_filename"] = filename

        print(f"[CV ANALYSIS] [SUCCESS]: {data.get('prenom')} {data.get('nom')} | email={data.get('email')} | phone={data.get('telephone')} | linkedin={data.get('linkedin_url')} | grade={data.get('grade')} | {len(data.get('competences', []))} skills")
        return data

    except json.JSONDecodeError as e:
        print(f"[CV ANALYSIS] [ERROR] JSON error: {str(e)} | raw: {res_text[:300]}")
        return {
            "prenom": "", "nom": "", "email": "", "telephone": "",
            "linkedin_url": "", "github_url": "",
            "role": "", "grade": "Junior", "competences": [],
            "experience": 0, "notes": "Erreur de parsing. Réessayez ou remplissez manuellement.", "position": "",
            "cv_filename": filename
        }
    except HTTPException as http_e:
        raise http_e
    except Exception as e:
        print(f"[CV ANALYSIS] [ERROR]: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur IA : {str(e)}")


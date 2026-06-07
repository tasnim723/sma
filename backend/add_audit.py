import sys

with open('app/api/endpoints/wizard.py', 'r', encoding='utf-8') as f:
    c = f.read()

model_code = '''
class AuditStackRequest(BaseModel):
    stack: List[str]
'''
c = c.replace('class FeasibilityRequest', model_code + '\nclass FeasibilityRequest')

endpoint_code = '''
@router.post("/audit-stack")
async def audit_stack_endpoint(req: AuditStackRequest, current_user=Depends(get_current_user)):
    stack_str = ", ".join(req.stack)
    prompt = f"""Tu es un expert en architecture logicielle. Analyse cette stack technique: {stack_str}.
Renvoie un JSON STRICT avec exactement deux listes de chaînes de caractères courtes et percutantes:
{{"success":["point fort 1", "point fort 2"], "issues":["conflit potentiel 1", "risque 2"]}}
Si la stack est cohérente, 'issues' peut être vide ou contenir une légère mise en garde. JSON seulement."""
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
                    if "`json" in content: content = content.split("`json")[1].split("`")[0].strip()
                    elif "`" in content: content = content.split("`")[1].split("`")[0].strip()
                    return json.loads(content)
        except Exception as e:
            pass
    return {"success":["La stack sélectionnée est standard et cohérente."], "issues":[]}
'''

with open('app/api/endpoints/wizard.py', 'w', encoding='utf-8') as f:
    f.write(c + '\n' + endpoint_code)

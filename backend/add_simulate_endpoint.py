# -*- coding: utf-8 -*-
import codecs
import re

with codecs.open('app/api/endpoints/wizard.py', 'r', 'utf-8') as f:
    content = f.read()

# Add schema
schema = '''class AuditStackRequest(BaseModel):
    stack: list[str]

class SimulateFeasibilityRequest(BaseModel):
    project_title: str
    project_description: str
    budget_pressure: int
    time_pressure: int
    base_score: int'''

content = content.replace('''class AuditStackRequest(BaseModel):
    stack: list[str]''', schema)


# Add endpoint
endpoint = '''@router.post("/simulate-feasibility-live")
async def simulate_feasibility_live(req: SimulateFeasibilityRequest):
    try:
        from app.services.groq_service import generate_with_groq
        
        prompt = f\"\"\"Tu es un expert en gestion de projet IT. 
Projet: {req.project_title}
Description: {req.project_description}
Score de base: {req.base_score}/100

Le manager a ajusté les curseurs de contraintes:
- Budget: {req.budget_pressure}% (100% = budget normal)
- Temps: {req.time_pressure}% (100% = délai normal)

Calcule le nouveau score de faisabilité (0-100), donne un niveau ("EXCELLENT", "VIABLE", "MODÉRÉ", "RISQUÉ", "CRITIQUE"), un court résumé (max 2 phrases) holographique de la situation, et liste 2 ou 3 risques principaux.
Tu dois répondre UNIQUEMENT avec un JSON STRICT et VALIDE, sans markdown, avec ces clés :
{{
    "score": 67,
    "level": "VIABLE",
    "summary": "Avec un délai très court, l'équipe risque d'accumuler de la dette technique.",
    "risks": ["Risque de burnout", "Dette technique"]
}}
\"\"\"
        res = await generate_with_groq(prompt)
        import json
        return json.loads(res.strip('`json').strip('`').strip())
    except Exception as e:
        print("Error in simulate-feasibility-live:", e)
        # Fallback
        return {
            "score": req.base_score,
            "level": "MODÉRÉ",
            "summary": "Analyse dynamique indisponible.",
            "risks": ["Inconnu"]
        }
'''

content = content + "\n\n" + endpoint

with codecs.open('app/api/endpoints/wizard.py', 'w', 'utf-8') as f:
    f.write(content)

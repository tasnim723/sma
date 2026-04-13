import sys
import os
import json
from langchain_core.messages import SystemMessage, HumanMessage
from app.services.agents.base_agent import get_llm

SYSTEM_PROMPT = """
Tu es l'Agent Disruptif de l'Innovation. Ton but est d'utiliser des méthodes de créativité (SCAMPER, Six Chapeaux, Inversion) 
pour transformer une idée classique en un concept révolutionnaire.

Pour chaque idée fournie, tu dois générer 3 variantes distinctes et extrêmement audacieuses.
Chaque variante doit inclure :
- Un titre accrocheur.
- Une description qui explique le pivot disruptif.
- Un score d'audace (audacity_score) entre 1 et 100.

Réponds UNIQUEMENT au format JSON comme ceci :
[
  {"title": "Variante 1", "description": "...", "audacity_score": 85},
  {"title": "Variante 2", "description": "...", "audacity_score": 92},
  {"title": "Variante 3", "description": "...", "audacity_score": 78}
]
"""

async def generate_disruptive_variants(title: str, description: str):
    llm = get_llm(use_mini=False) # Use a more powerful model for creativity if possible
    
    prompt = f"Idée Initiale : {title}\nDescription : {description}\n\nGénère 3 variantes disruptives maintenant."
    
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=prompt)
    ]
    
    try:
        response = await llm.ainvoke(messages)
        # Handle potential markdown formatting in response
        content = response.content.strip()
        if content.startswith("```json"):
            content = content.replace("```json", "").replace("```", "").strip()
        
        return json.loads(content)
    except Exception as e:
        print(f"Error generating variants: {e}")
        # Fallback variants
        return [
            {"title": f"Pivot Technologique: {title}", "description": "Intégration d'IA générative pour automatiser le processus.", "audacity_score": 75},
            {"title": f"Modèle Décentralisé: {title}", "description": "Passage sur une structure web3 sans autorité centrale.", "audacity_score": 88},
            {"title": f"Expérience Immersive: {title}", "description": "Transposition du concept dans le métavers.", "audacity_score": 82}
        ]

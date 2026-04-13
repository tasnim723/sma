from .base_agent import BaseAgent
import json
import re

review_prompt = """Tu es l'Agent Challengeur de Concepts. Ton rôle n'est pas seulement de vérifier si le travail est fait, mais de pousser l'idée le plus loin possible.

Utilise des méthodes comme :
- LES SIX CHAPEAUX (Chapeau Noir pour les failles, Chapeau Jaune pour l'optimisme).
- SCAMPER (Substituer, Combiner, Adapter, Modifier).

Ton évaluation doit être :
1. CRITIQUE : Identifie les failles de l'idée (Chapeau Noir).
2. CONSTRUCTIVE : Propose une amélioration immédiate (SCAMPER).
3. TRANCHANTE : Dis si l'idée est prête pour l'Incubation (VALID) ou encore trop fragile (INVALID).

Format de réponse attendu :
Decision: [VALID|INVALID]
Feedback: [Une critique courte et directe + une piste de boost SCAMPER]
"""

review_agent = BaseAgent(name="Review Agent", system_prompt=review_prompt, use_mini=False)

async def review_node(state: dict):
    '''
    State is expected to have:
    - task_description
    - deliverables (as a string or list of attachments)
    '''
    messages = state.get("messages", [])
    
    # We parse out the text response directly
    response = await review_agent.ainvoke(state)
    content = response["messages"][0].content
    
    # Parse Decision and Feedback from the output
    decision_match = re.search(r'Decision:\s*(VALID|INVALID)', content, re.IGNORECASE)
    feedback_match = re.search(r'Feedback:\s*(.*)', content, re.IGNORECASE)
    
    decision = decision_match.group(1).upper() if decision_match else "INVALID"
    feedback = feedback_match.group(1).strip() if feedback_match else "Could not parse feedback."
    
    return {
        "decision": decision,
        "feedback": feedback
    }

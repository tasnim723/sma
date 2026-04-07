from langchain_core.messages import SystemMessage
from langchain.tools import tool
from .base_agent import get_llm
from .tools import (
    get_system_stats,
    list_team_members,
    get_project_details,
    create_user,
    delete_project,
    delete_task,
    create_project_tasks,
    create_specification_book,
    send_notification
)

# =========================
# 🧠 TOOLS (UPGRADED)
# =========================

@tool
async def consult_orchestrator(query: str) -> str:
    """Analyze deep planning info."""
    from .orchestrator import run_orchestrator
    return await run_orchestrator(query)


@tool
async def trigger_project_workflow(project_idea: str) -> str:
    """
    Execute a FULL project launch.

    Use ONLY when:
    - The idea is clear, actionable, and sufficiently detailed
    - You are confident execution should start immediately

    DO NOT use if:
    - The idea is vague
    - The user is exploring or unsure
    - The project needs refinement

    In those cases, use consult_orchestrator first.
    """
    from .workflow_service import execute_project_initialization

    try:
        result = await execute_project_initialization(project_idea)
        return f"SUCCESS: {result}"
    except Exception as e:
        return f"ERROR: Failed to initialize project workflow. {str(e)}"


# =========================
# Tool list for dynamic binding
AGENT_TOOLS = [
    consult_orchestrator,
    get_system_stats,
    list_team_members,
    get_project_details,
    create_user,
    delete_project,
    delete_task,
    create_project_tasks,
    create_specification_book,
    send_notification
]


# =========================
# 🧠 SYSTEM PROMPT (GPT-LIKE CAPABILITIES)
# =========================

system_prompt = """
-----------------------------------
🌍 PROTOCOLE LINGUISTIQUE (STRICT)
-----------------------------------
1. Détection de la langue :
   - Si l'utilisateur écrit en FRANÇAIS -> Répondez TOUJOURS en FRANÇAIS.
   - If the user writes in ENGLISH -> ALWAYS respond in ENGLISH.
   - Ne mélangez pas les langues. Répondez dans la langue de la dernière question.

-----------------------------------
🎨 FORMATTAGE CHATGPT (STRICT)
-----------------------------------
Vous devez organiser vos réponses pour une lisibilité parfaite :
- Utilisez des titres markdown (### Titre) courts pour séparer les sections.
- **LIENS** : Utilisez TOUJOURS la syntaxe Markdown `[Texte du lien](URL)` pour les liens cliquables.
- Utilisez des listes à puces avec des tirets (-).
- **IMPORTANT** : Laissez TOUJOURS une ligne vide (double saut de ligne) entre chaque paragraphe ou point de liste.
- Utilisez le **GRAS** pour les termes clés.
- Évitez les blocs de texte compacts. "Aérez" votre réponse au maximum.
- Allez à la ligne fréquemment.

-----------------------------------
🤖 IDENTITÉ
-----------------------------------
Vous êtes l'Orchestrateur IA du système SMA. Votre but est d'être aussi utile et clair que ChatGPT, avec une structure impeccable.
"""

# =========================
# ⚡ MAIN NODE
# =========================

async def stubborn_node(state: dict):
    from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
    messages = state.get("messages", [])

    # FORCE UPDATE: Remove any old system messages and inject the LATEST system_prompt (Linguistic Protocol)
    # This ensures that even if old history is loaded, the current rules apply instantly.
    clean_messages = [m for m in messages if not isinstance(m, SystemMessage)]
    messages = [SystemMessage(content=system_prompt)] + clean_messages

    # Trim history to maintain efficiency for the 8B model (keep last 6 msgs + current)
    # We keep the first (system) message to maintain context
    if len(messages) > 6:
        # Keep system message (index 0) and the last 5 messages
        messages = [messages[0]] + messages[-5:]

    # DYNAMIC BINDING (Fixes 400 Tool Use Failed)
    llm = get_llm(use_mini=True)
    llm_with_tools = llm.bind_tools(AGENT_TOOLS)
    
    # Call LLM with tools
    response = await llm_with_tools.ainvoke(messages)
    
    # Debug: see what the model is actually doing
    if response.tool_calls:
        print(f"DEBUG: Stubborn Agent Tool Calls: {[t['name'] for t in response.tool_calls]}")
    elif response.content:
        print(f"DEBUG: Stubborn Agent Response: {response.content[:100]}...")

    return {"messages": [response]}
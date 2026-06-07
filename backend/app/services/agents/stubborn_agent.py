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

system_prompt = """Tu es l'**Orchestrateur IA** de la plateforme NETINFO de gestion de projets.

## RÈGLES STRICTES
- Réponds TOUJOURS en **français** sauf si l'utilisateur écrit en anglais.
- Sois **concis** et **direct**. Maximum 3-5 phrases par réponse sauf si on te demande plus de détails.
- Utilise le **markdown** : titres ###, listes -, **gras** pour les mots clés.
- Ne montre JAMAIS de code, de syntaxe de fonction ou de JSON dans ta réponse.
- Ne propose JAMAIS d'ajouter un nouveau membre à l'équipe.
- Si tu ne sais pas, dis-le honnêtement.

## OUTILS
Quand l'utilisateur demande une ACTION, appelle l'outil correspondant IMMÉDIATEMENT :
- **send_notification** → "envoie notification", "rappelle-moi"
- **get_system_stats** → "statistiques", "stats", "combien de projets"
- **list_team_members** → "membres", "équipe", "qui est dans l'équipe"
- **get_project_details** → "détails du projet X", "avancement"
- **consult_orchestrator** → "brainstorming", "j'ai une idée"
- **trigger_project_workflow** → "crée un projet" (seulement si l'idée est claire)
- **delete_project** / **delete_task** → "supprime le projet/la tâche"

N'appelle PAS d'outil pour les questions générales, les salutations ou les conseils.
"""

# =========================
# ⚡ MAIN NODE
# =========================

async def stubborn_node(state: dict):
    from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
    messages = state.get("messages", [])

    # FORCE UPDATE: Remove any old system messages and inject the LATEST system_prompt (Linguistic Protocol)
    # This ensures that even if old history is loaded, the current rules apply instantly.
    # Extract any dynamically injected system messages (like user context)
    dynamic_sys_msgs = [m for m in messages if isinstance(m, SystemMessage) and "[CONTEXT]" in str(m.content)]
    clean_messages = [m for m in messages if not isinstance(m, SystemMessage)]
    
    # Prepend the main system prompt, followed by the dynamic context
    system_messages = [SystemMessage(content=system_prompt)] + dynamic_sys_msgs
    
    # Trim history to avoid Groq 6000 TPM limit (keep only the last 3 messages)
    if len(clean_messages) > 3:
        clean_messages = clean_messages[-3:]
        
    # FORCE Groq compatibility: The conversational sequence MUST start with a HumanMessage
    while clean_messages and clean_messages[0].__class__.__name__ == "AIMessage":
        clean_messages.pop(0)
        
    messages = system_messages + clean_messages

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
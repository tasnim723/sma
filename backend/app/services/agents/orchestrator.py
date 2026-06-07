from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated, Sequence
import operator
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage

from .ideateur_agent import ideateur_agent
from .critique_agent import critique_agent
from .synthetiseur_agent import synthetiseur_agent

async def run_orchestrator(query: str) -> str:
    """Async Innovation Facilitator: Orchestrates a Diamond Model Brainstorming (Divergence then Convergence)."""
    
    # [PHASE 1: DIVERGENCE] - Generate wild ideas
    # The Idéateur generates initial raw concepts
    ideateur_res = await ideateur_agent.llm.ainvoke([
        {"role": "system", "content": ideateur_agent.system_prompt},
        {"role": "user", "content": f"Sujet de brainstorming : {query}\nGénère exactement 10 idées radicales et distinctes, numérotées de 1 à 10. Sois audacieux mais TRÈS CONCIS (1 seule phrase courte par idée pour être rapide)."}
    ])
    
    # The Critique Constructif pivot-rebounds on these ideas (Yes, and...)
    critique_res = await critique_agent.llm.ainvoke([
        {"role": "system", "content": critique_agent.system_prompt},
        {"role": "user", "content": f"L'idéateur a généré 10 idées. Pour chacune des 10 idées, applique la méthode 'Yes, and...' de manière EXTRÊMEMENT RAPIDE ET COURTE (1 phrase par idée maximum). :\n{ideateur_res.content}"}
    ])
    
    # [PHASE 2: CONVERGENCE] - Summarize and structure
    # The Synthétiseur selects and structures the final output
    synthetiseur_res = await synthetiseur_agent.llm.ainvoke([
        {"role": "system", "content": synthetiseur_agent.system_prompt},
        {"role": "user", "content": f"L'idéateur a proposé 10 idées et le critique les a évaluées. Parmi ces 10 idées, SÉLECTIONNE et CLASSE les 3 meilleures. Justifie de manière très concise (1 ou 2 lignes par idée) et ajoute une courte phrase expliquant pourquoi les autres sont écartées.\n\n--- 10 IDÉES ---\n{ideateur_res.content}\n\n--- ÉVALUATION CRITIQUE ---\n{critique_res.content}"}
    ])
    
    return f"[RAPPORT D'INNOVATION SMA]\n\n🧠 PHASE DE DIVERGENCE — 10 Idées Générées :\n{ideateur_res.content}\n\n🛠️ PHASE D'ÉVALUATION — Critique Constructif (Yes, and...) :\n{critique_res.content}\n\n🏆 SÉLECTION FINALE — Les 3 Meilleures Idées (choisies parmi 10) :\n{synthetiseur_res.content}"

class GatewayState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]

# We need the ToolNode from langgraph to execute the tools
from langgraph.prebuilt import ToolNode
from .stubborn_agent import (
    stubborn_node, consult_orchestrator, trigger_project_workflow,
    get_system_stats, list_team_members, get_project_details,
    create_user, delete_project, delete_task
)

tools = [
    consult_orchestrator, 
    trigger_project_workflow, 
    get_system_stats, 
    list_team_members, 
    get_project_details, 
    create_user, 
    delete_project, 
    delete_task
]
tool_node = ToolNode(tools)

def should_continue(state: GatewayState):
    messages = state['messages']
    last_message = messages[-1]
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        return "tools"
    return END

def build_gateway_graph():
    graph = StateGraph(GatewayState)
    graph.add_node("stubborn", stubborn_node)
    graph.add_node("tools", tool_node)
    
    graph.set_entry_point("stubborn")
    graph.add_conditional_edges("stubborn", should_continue, {"tools": "tools", END: END})
    graph.add_edge("tools", "stubborn")
    return graph.compile()

gatekeeper_system = build_gateway_graph()

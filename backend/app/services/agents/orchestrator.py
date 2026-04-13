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
        {"role": "user", "content": f"Sujet de brainstorming : {query}\nLance 3 idées radicales maintenant."}
    ])
    
    # The Critique Constructif pivot-rebounds on these ideas (Yes, and...)
    critique_res = await critique_agent.llm.ainvoke([
        {"role": "system", "content": critique_agent.system_prompt},
        {"role": "user", "content": f"Rebondis sur ces idées de l'idéateur avec la méthode 'Yes, and...':\n{ideateur_res.content}"}
    ])
    
    # [PHASE 2: CONVERGENCE] - Summarize and structure
    # The Synthétiseur selects and structures the final output
    synthetiseur_res = await synthetiseur_agent.llm.ainvoke([
        {"role": "system", "content": synthetiseur_agent.system_prompt},
        {"role": "user", "content": f"Discussion de divergence :\nIdéateur : {ideateur_res.content}\nCritique : {critique_res.content}\n\nSynthétise le tout en extrayant les 3 concepts les plus prometteurs pour le futur."}
    ])
    
    return f"[RAPPORT D'INNOVATION SMA]\n\n🚀 PHASE DE DIVERGENCE (Idéation) :\n{ideateur_res.content}\n\n🛠️ PHASE DE REBOND (Critique Constructif) :\n{critique_res.content}\n\n✨ SYNTHÈSE FINALE (Concepts retenus) :\n{synthetiseur_res.content}"

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

from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated, Sequence
import operator
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage

from .planning_agent import planning_agent
from .kpi_agent import kpi_agent
from .innovation_agent import innovation_agent
from .risk_agent import risk_agent
from .communication_agent import communication_agent
from .decision_agent import decision_agent
from .tools import get_system_stats_func, list_team_members_func

async def run_orchestrator(query: str) -> str:
    """Async wrapper to run the specialized agents and return a report with real-time data grounding."""
    # Fetch real data for context
    try:
        stats = await get_system_stats_func()
        members = await list_team_members_func()
    except Exception as e:
        stats = f"Error fetching stats: {str(e)}"
        members = f"Error fetching members: {str(e)}"
        
    data_context = f"\n\n[REAL-TIME SYSTEM DATA]\n{stats}\n{members}\n"
    
    # Querying Risk and Planning agents with real context
    # We use ainvoke here for non-blocking execution
    risk_res = await risk_agent.llm.ainvoke([
        {"role": "system", "content": risk_agent.system_prompt},
        {"role": "user", "content": f"{data_context}\nAnalyze this from a risk perspective: {query}"}
    ])
    plan_res = await planning_agent.llm.ainvoke([
        {"role": "system", "content": planning_agent.system_prompt},
        {"role": "user", "content": f"{data_context}\nAnalyze this from a planning perspective: {query}"}
    ])
    
    return f"[ORCHESTRATOR REPORT (Real-Time Aware)]\nRisk Analysis: {risk_res.content}\n\nPlanning Analysis: {plan_res.content}"

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

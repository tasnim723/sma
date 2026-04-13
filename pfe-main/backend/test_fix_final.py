import asyncio
import os
from dotenv import load_dotenv

# MUST LOAD DOTENV BEFORE IMPORTS IF THEY USE THE KEY AT MODULE LEVEL
load_dotenv()

from app.services.agents.orchestrator import gatekeeper_system
from langchain_core.messages import HumanMessage

async def test_tool_call():
    # Test project creation
    state = {"messages": [HumanMessage(content="create a new project application that contains vr courses to college students in physics aand science")]}
    print("Testing Project Creation Tool Call...")
    
    found_tool = False
    async for event in gatekeeper_system.astream_events(state, version="v2"):
        kind = event["event"]
        if kind == "on_tool_start":
            print(f"DEBUG: TOOL START: {event['name']}")
            found_tool = True
        elif kind == "on_chat_model_end":
            node = event.get("metadata", {}).get("langgraph_node")
            if node == "stubborn":
                msg = event["data"]["output"]
                if hasattr(msg, "tool_calls") and msg.tool_calls:
                    print(f"DEBUG: TOOL CALLS: {[t['name'] for t in msg.tool_calls]}")
                else:
                    print(f"DEBUG: CONTENT: {msg.content}")

    if not found_tool:
        print("FAIL: No tool was called.")
    else:
        print("SUCCESS: Tool was called!")

if __name__ == "__main__":
    asyncio.run(test_tool_call())

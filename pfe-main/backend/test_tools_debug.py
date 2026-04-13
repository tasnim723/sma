import asyncio
from app.services.agents.orchestrator import gatekeeper_system
from langchain_core.messages import HumanMessage

async def test_tool_call():
    state = {"messages": [HumanMessage(content="Give me the system stats")]}
    print("Sending message: Give me the system stats")
    
    async for event in gatekeeper_system.astream_events(state, version="v2"):
        kind = event["event"]
        if kind == "on_tool_start":
            print(f"TOOL START: {event['name']}")
        elif kind == "on_chat_model_end":
            msg = event["data"]["output"]
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                print(f"TOOL CALLS: {msg.tool_calls}")
            else:
                print(f"CONTENT: {msg.content}")

if __name__ == "__main__":
    asyncio.run(test_tool_call())

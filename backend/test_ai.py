import asyncio
import sys
from dotenv import load_dotenv
load_dotenv(override=True)
from app.services.agents.orchestrator import gatekeeper_system
from langchain_core.messages import HumanMessage

async def main():
    sys.stdout = open('test_ai_out.txt', 'w', encoding='utf-8')
    messages = [HumanMessage(content="Hello, what is the project status?")]
    state = {"messages": messages}
    
    print("Testing gatekeeper_system with astream...")
    try:
        async for chunk in gatekeeper_system.astream(state, stream_mode="updates"):
            print("UPDATE:", list(chunk.keys()))
            for node, content in chunk.items():
                print(f"Node {node} returned messages: {len(content.get('messages', []))}")
                for msg in content.get('messages', []):
                    print(f"  -> {msg.__class__.__name__}: tool_calls={getattr(msg, 'tool_calls', None)}")
    except Exception as e:
        import traceback
        print(f"ERROR: {traceback.format_exc()}")
    
    sys.stdout.close()

if __name__ == "__main__":
    asyncio.run(main())

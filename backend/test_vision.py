import asyncio
from dotenv import load_dotenv
load_dotenv(override=True)
from app.services.agents.base_agent import get_llm
from langchain_core.messages import HumanMessage

async def main():
    try:
        # LLM without tools
        llm = get_llm()
        msg = HumanMessage(content="Hello")
        
        print("Testing Vision Model without tools...")
        res = await llm.ainvoke([msg])
        print("SUCCESS:", res.content[:50])
        
        # LLM with tools
        print("\nTesting Vision Model with dummy tool...")
        from langchain.tools import tool
        @tool
        def dummy_tool(x: str) -> str:
            """Does nothing."""
            return x
            
        llm_with_tools = get_llm().bind_tools([dummy_tool])
        res_tools = await llm_with_tools.ainvoke([msg])
        print("SUCCESS WITH TOOLS")
    except Exception as e:
        import traceback
        print("ERROR:", traceback.format_exc())

if __name__ == "__main__":
    asyncio.run(main())

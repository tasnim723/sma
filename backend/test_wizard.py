import os
import asyncio
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

load_dotenv()

def get_wizard_llm():
    import requests
    ollama_url = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
    model_name = os.getenv("OLLAMA_MODEL", "llama3.2")
    print("Testing ollama url:", ollama_url)
    try:
        res = requests.get(f"{ollama_url}/api/tags", timeout=2)
        if res.status_code == 200:
            print("Using ollama")
            return ChatOpenAI(
                temperature=0,
                model=model_name,
                max_tokens=8192,
                base_url=f"{ollama_url}/v1",
                api_key="ollama-local"
            )
    except Exception as e:
        print("Ollama failed:", str(e))
        pass
        
    api_key = os.getenv("GROQ_API_KEY") or os.getenv("OPENAI_API_KEY")
    print("Fallback to groq")
    return ChatOpenAI(
        temperature=0, 
        model="llama-3.1-8b-instant",
        max_tokens=4096,
        base_url="https://api.groq.com/openai/v1",
        api_key=api_key
    )

async def test():
    try:
        wizard_llm = get_wizard_llm()
        res = await wizard_llm.ainvoke([
            SystemMessage(content="You are a helper"),
            HumanMessage(content="Hi!")
        ])
        print("Success!", res.content)
    except Exception as e:
        print(f"Error type: {type(e)}")
        print(f"Error string: {str(e)}")

asyncio.run(test())

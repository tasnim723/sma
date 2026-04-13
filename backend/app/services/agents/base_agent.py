from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI

def get_llm(use_mini: bool = True):
    import os
    from dotenv import load_dotenv
    load_dotenv()
    
def get_llm(use_mini: bool = True, temperature: float = 0):
    import os
    from dotenv import load_dotenv
    import requests
    load_dotenv()
    
    # 🏠 LOCAL OLLAMA FIRST (Mistral for tools support)
    env_url = os.getenv("OLLAMA_URL")
    ollama_url = env_url if env_url and env_url.strip() else "http://127.0.0.1:11434"
    
    # Check if we have Mistral or Llama3 ready locally
    try:
        res = requests.get(f"{ollama_url}/api/tags", timeout=2)
        models = [m['name'] for m in res.json().get('models', [])]
        # Mistral is much better for tools in certain Ollama versions
        final_model = None
        if "mistral:latest" in models or "mistral" in models:
            final_model = "mistral"
        elif "llama3:latest" in models or "llama3" in models:
            final_model = "llama3"
            
        if final_model:
            print(f"DEBUG: SMA ENGINE -> LOCAL-AI (Model: {final_model}, Temp: {temperature})")
            return ChatOpenAI(temperature=temperature, model=final_model, base_url=f"{ollama_url}/v1", api_key="ollama")
    except:
        pass

    # 🌩️ HYBRID CLOUD FALLBACK (Active until Mistral download finishes)
    # Using llama-3.1-8b-instant for zero-error stability.
    print(f"DEBUG: SMA ENGINE -> HYBRID-CLOUD (Groq 8B) for stability (Temp: {temperature})...")
    api_key = os.getenv("GROQ_API_KEY") or os.getenv("OPENAI_API_KEY")
    return ChatOpenAI(
        temperature=temperature, 
        model="llama-3.1-8b-instant",
        max_tokens=1024,
        base_url="https://api.groq.com/openai/v1",
        api_key=api_key
    )

class BaseAgent:
    def __init__(self, name: str, system_prompt: str, use_mini: bool = True, temperature: float = 0):
        self.name = name
        self.system_prompt = system_prompt
        self.llm = get_llm(use_mini=use_mini, temperature=temperature)

    async def ainvoke(self, state: dict):
        messages = state.get("messages", [])
        if not messages or not isinstance(messages[0], SystemMessage):
            messages = [SystemMessage(content=self.system_prompt)] + messages
            
        try:
            response = await self.llm.ainvoke(messages)
            return {"messages": [response]}
        except Exception as e:
            print(f"ERROR in {self.name}: {str(e)}")
            # Friendly Fallback Message
            from langchain_core.messages import AIMessage
            fallback = AIMessage(content="Desole, je rencontre des difficultes de connexion avec mes cerveaux IA (Ollama/Groq). Veuillez verifier votre connexion ou le statut d'Ollama.")
            return {"messages": [fallback]}

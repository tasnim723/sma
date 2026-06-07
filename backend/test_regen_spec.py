import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import httpx
from bson import ObjectId
from dotenv import load_dotenv
load_dotenv()

async def run():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["project_manager_db"]
    
    project = await db["projects"].find_one()
    if not project:
        print("No project found")
        return
        
    project_id = str(project["_id"])
    print(f"Testing generation for project {project_id} - {project['name']}")
    
    # Simulate the endpoint logic
    from app.core.keys import get_rotated_groq_key
    api_key = get_rotated_groq_key()
    
    system_prompt = "Tu es un Business Analyst..."
    user_prompt = f"Génère le cahier des charges complet et professionnel pour le projet suivant.\n\n**Projet :** {project['name']}\n**Description :** {project['description']}"
    
    try:
        async with httpx.AsyncClient(timeout=60) as http_client:
            response = await http_client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.2,
                    "max_tokens": 4500,
                }
            )
            response.raise_for_status()
            print("Groq success! Content length:", len(response.json()["choices"][0]["message"]["content"]))
    except Exception as e:
        print(f"Groq error: {e}")

if __name__ == "__main__":
    asyncio.run(run())

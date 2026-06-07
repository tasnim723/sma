import httpx
import asyncio
import json

async def test_veille():
    url = "http://127.0.0.1:8000/api/brainstorming/veille-tech"
    data = {
        "project_name": "SafeMap",
        "description": "Une application de voyage de type Tinder qui privilégie la sécurité pour les voyageurs solo."
    }
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=data, timeout=30.0)
            print(f"Status: {res.status_code}")
            print(json.dumps(res.json(), indent=2))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_veille())

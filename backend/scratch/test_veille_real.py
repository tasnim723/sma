import asyncio
import httpx

async def test():
    async with httpx.AsyncClient(timeout=90.0) as client:
        login = await client.post(
            "http://127.0.0.1:8000/api/auth/login",
            data={"username": "manager@project.com", "password": "password123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        if login.status_code != 200:
            print("Login failed:", login.text[:200])
            return
        token = login.json().get("access_token")
        print("Login OK")

        res = await client.post(
            "http://127.0.0.1:8000/api/brainstorming/veille-tech",
            json={"project_name": "Plateforme RH", "description": "Gestionnaire RH avec IA et suivi des performances"},
            headers={"Authorization": f"Bearer {token}"}
        )
        print("Status:", res.status_code)
        data = res.json()
        print("Global score:", data.get("global_score"))
        articles = data.get("articles", [])
        print("Total articles:", len(articles))
        for i, a in enumerate(articles):
            url = a.get("url", "")
            is_real = "dev.to/" in url or "youtube.com/" in url or "youtu.be/" in url
            tag = "[REAL]" if is_real else "[FALLBACK]"
            print(f"\n  {tag} [{a.get('type')}] {a.get('title', '')[:65]}")
            print(f"  URL:    {url[:90]}")
            print(f"  Author: {a.get('author', '')} | {a.get('date', '')}")
            print(f"  Score:  {a.get('innovation_score')} | Cat: {a.get('category')}")

asyncio.run(test())

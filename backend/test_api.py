import asyncio
import httpx
import json

async def test_api():
    base = "http://localhost:8000"
    results = []
    
    # Test root
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{base}/")
        results.append(f"[ROOT] {r.status_code}: {r.json()}")
    
    # Test login with all known credentials
    credentials = [
        ("manager@project.com", "password123"),
        ("manager@pfe.com", "password123"),
        ("lead@project.com", "password123"),
        ("member@project.com", "password123"),
    ]
    
    token = None
    for email, pwd in credentials:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(f"{base}/api/auth/login", data={
                "username": email,
                "password": pwd
            })
            status = r.status_code
            if status == 200:
                token = r.json().get("access_token")
                user_info = r.json()
                results.append(f"[LOGIN OK] {email} -> role: {user_info.get('role', 'N/A')} | token: {token[:20]}...")
            else:
                results.append(f"[LOGIN FAIL] {email} -> {status}: {r.text[:100]}")
    
    # Test members endpoint with valid token
    if token:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"{base}/api/members/", headers={"Authorization": f"Bearer {token}"})
            results.append(f"\n[GET /api/members/] {r.status_code}")
            if r.status_code == 200:
                members = r.json()
                results.append(f"  Count: {len(members)} members")
                for m in members:
                    results.append(f"  -> {m.get('full_name','?')} | {m.get('email','?')} | role:{m.get('role','?')} | position:{m.get('position','?')}")
            else:
                results.append(f"  Error: {r.text}")
        
        # Test POST a new member
        async with httpx.AsyncClient(timeout=10) as client:
            payload = {
                "full_name": "Test User API",
                "email": "testapi@project.com",
                "role": "TEAM_MEMBER",
                "position": "Backend Dev - Junior",
                "phone_number": "+33 6 00 00 00 00",
                "password": "password123",
                "skills": ["Python", "FastAPI"]
            }
            r = await client.post(f"{base}/api/members/", json=payload, headers={"Authorization": f"Bearer {token}"})
            results.append(f"\n[POST /api/members/] {r.status_code}")
            if r.status_code == 200:
                results.append(f"  Created: {r.json()}")
            else:
                results.append(f"  Error: {r.text}")
    
    # Write results to file
    with open("api_test_results.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(results))
    
    print("\n".join(results))

asyncio.run(test_api())

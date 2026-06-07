import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

async def check():
    client = AsyncIOMotorClient('mongodb://127.0.0.1:27017')
    db = client['project_manager_db']
    
    print("=== APPROVED users (have token, waiting confirmation) ===")
    approved = await db['users'].find({'status': 'APPROVED'}).to_list(10)
    for u in approved:
        token = u.get('confirm_token', 'NONE')
        expires = u.get('confirm_token_expires')
        expired = expires and datetime.utcnow() > expires
        print(f"  Name: {u.get('full_name')} | Email: {u.get('email')}")
        print(f"  Token: {str(token)[:30] if token else 'NONE'}")
        print(f"  Expires: {expires} | EXPIRED: {expired}")
        print()
    
    print("=== PENDING users ===")
    pending = await db['users'].find({'status': 'PENDING'}).to_list(10)
    for u in pending:
        print(f"  Name: {u.get('full_name')} | Email: {u.get('email')}")
    
    print(f"\nTotal APPROVED: {len(approved)}, Total PENDING: {len(pending)}")

asyncio.run(check())

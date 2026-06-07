import asyncio
import time
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.auth import verify_password, get_password_hash

async def test_performance():
    print("--- Diagnostic Performance ---")
    
    # 1. Test DB Access
    start = time.time()
    client = AsyncIOMotorClient('mongodb://127.0.0.1:27017', serverSelectionTimeoutMS=2000)
    db = client["project_manager_db"]
    try:
        count = await db["users"].count_documents({})
        print(f"DB Access: OK ({count} users found) in {time.time() - start:.3f}s")
    except Exception as e:
        print(f"DB Access: FAILED - {e}")
    
    # 2. Test Password Hashing (BCrypt)
    start = time.time()
    password = "password123"
    hashed = get_password_hash(password)
    valid = verify_password(password, hashed)
    print(f"Password Check: OK ({valid}) in {time.time() - start:.3f}s")

if __name__ == "__main__":
    asyncio.run(test_performance())

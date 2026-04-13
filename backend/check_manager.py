import motor.motor_asyncio
import asyncio

async def check():
    client = motor.motor_asyncio.AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['pfe_db']
    users = await db['users'].find().to_list(100)
    if users:
        print(f"Total users found: {len(users)}")
        for u in users:
            print(f"- {u['email']} ({u.get('role', 'no role')})")
    else:
        print("No users found in database")

if __name__ == "__main__":
    asyncio.run(check())

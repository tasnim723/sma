import motor.motor_asyncio
import asyncio

async def check():
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["sma_project"]
    project = await db["projects"].find_one({"name": {"$regex": "VR Chat Connect", "$options": "i"}})
    if project:
        print(f"FOUND: {project['name']} (ID: {str(project['_id'])})")
    else:
        print("NOT FOUND")
    await client.close()

if __name__ == "__main__":
    asyncio.run(check())

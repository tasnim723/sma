import asyncio
from app.services.agents.workflow_service import execute_project_initialization
from app.core.db import get_database

async def test_creation():
    idea = "A new VR application for teaching physics to college students."
    print(f"Triggering workflow for: {idea}")
    try:
        result = await execute_project_initialization(idea)
        print(f"RESULT: {result}")
    except Exception as e:
        print(f"FAILED: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_creation())

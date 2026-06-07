import asyncio
import os
import sys

# Add parent dir to path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.backlog_generator import generate_detailed_tasks

async def test():
    print("Testing generate_detailed_tasks...")
    title = "Site E-Commerce Premium"
    description = "Un site e-commerce de luxe avec panier, paiement stripe, design minimaliste et espace administrateur."
    stack = "Next.js, TailwindCSS, Node.js, PostgreSQL"
    duration_weeks = 6
    team_members = [
        {"full_name": "Alice Manager", "position": "Project Manager", "skills": ["Management", "Agile"]},
        {"full_name": "Bob Dev", "position": "Fullstack Developer", "skills": ["React", "Node.js", "PostgreSQL"]}
    ]
    
    tasks = await generate_detailed_tasks(title, description, stack, duration_weeks, team_members)
    print(f"Generated {len(tasks)} tasks!")
    for i, t in enumerate(tasks[:3]):
        print(f"\nTask {i+1}: {t.get('title')}")
        print(f"Description: {t.get('description')}")
        print(f"Suggested Role: {t.get('suggested_role')}")
        print(f"Priority: {t.get('priority')}")

if __name__ == "__main__":
    asyncio.run(test())

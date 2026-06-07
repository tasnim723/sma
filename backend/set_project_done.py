"""
Script rapide pour lister tous les projets et marquer le premier comme DONE
afin de tester la fonctionnalite d'archives.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = "mongodb://127.0.0.1:27017"
DB_NAME = "project_manager_db"

async def main():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]

    # Lister tous les projets
    projects = await db.projects.find({}, {"_id": 1, "name": 1, "status": 1}).to_list(100)

    if not projects:
        print("[ERREUR] Aucun projet trouve dans la base de donnees.")
        return

    print("\n[PROJETS DISPONIBLES]")
    print("-" * 60)
    for i, p in enumerate(projects):
        print(f"  [{i}] ID: {p['_id']}  |  Nom: {p.get('name', '?')}  |  Statut: {p.get('status', '?')}")
    print("-" * 60)

    # Choisir le premier projet qui n'est pas deja DONE
    target = next((p for p in projects if p.get("status") != "DONE"), None)

    if not target:
        print("\n[OK] Tous les projets sont deja en statut DONE ! Les archives devraient fonctionner.")
        return

    print(f"\n[MISE A JOUR] Projet : \"{target.get('name')}\" => DONE")

    result = await db.projects.update_one(
        {"_id": target["_id"]},
        {"$set": {"status": "DONE"}}
    )

    if result.modified_count == 1:
        print(f"[SUCCES] Le projet \"{target.get('name')}\" est maintenant archive (DONE).")
        print("\n[INFO] Vous pouvez maintenant cliquer sur le bouton 'Archives' dans le dashboard Projets.")
    else:
        print("[ERREUR] La mise a jour a echoue. Verifiez la connexion MongoDB.")

    client.close()

if __name__ == "__main__":
    asyncio.run(main())

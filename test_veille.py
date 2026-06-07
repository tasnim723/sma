import asyncio, sys
sys.path.insert(0, '.')
from backend.app.services.veille_real import fetch_veille_tech

async def test():
    tests = [
        ("Simulation VR Medicale", "Application de simulation VR avec Unreal Engine pour la formation chirurgicale en realite virtuelle"),
        ("IA Reconnaissance Image", "Systeme de deep learning avec GPU NVIDIA CUDA pour la detection objets avec intelligence artificielle"),
        ("Visualisation Architecture BIM", "Application Autodesk Revit BIM pour la modelisation de batiments et gestion de construction"),
    ]
    for name, desc in tests:
        print(f"\n{'='*60}")
        print(f"PROJECT: {name}")
        result = await fetch_veille_tech(name, desc)
        print(f"Score global: {result['global_score']}")
        for a in result["articles"]:
            print(f"  [{a['type']}] {a['author']} -> {a['title'][:70]}")

asyncio.run(test())

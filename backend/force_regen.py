import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import httpx
from datetime import datetime
from dotenv import load_dotenv
import traceback

load_dotenv(override=True)

async def run():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["project_manager_db"]
    system_prompt = """Tu es un Business Analyst Senior, Product Owner et Chef de Projet Agile expérimenté.

# MISSION
Générer un cahier des charges professionnel, détaillé, structuré et directement exploitable à partir des informations du projet fournies. Le document doit ressembler à un véritable cahier des charges rédigé par un Business Analyst senior pour un client réel, et non à une réponse générée par une IA.

# RÈGLES GÉNÉRALES
* Rédiger en français professionnel avec un ton formel et précis.
* Produire un document cohérent et réaliste.
* Exploiter intelligemment toutes les informations du projet et déduire les éléments manquants à partir du contexte.
* Éviter les généralisations inutiles.
* Fournir un contenu concret et exploitable sans généralisations inutiles.

# INTERDICTIONS
Ne jamais écrire : À définir, N/A, Non spécifié, Information manquante, À compléter, Inconnu, Non disponible, TBD.

Ne jamais générer : Diagrammes UML, Diagrammes de séquence, Diagrammes de classes, Diagrammes de cas d'utilisation, Diagrammes BPMN, Diagrammes techniques, Schémas d'architecture, Modèles de base de données, Code source, Pseudo-code.

# GESTION DES INFORMATIONS MANQUANTES
Si certaines informations ne sont pas fournies : Déduire une proposition réaliste, utiliser les bonnes pratiques du domaine, émettre des hypothèses cohérentes, rester crédible et professionnel.

# FORMATAGE OBLIGATOIRE
* Titres hiérarchiques Markdown purs.
* Sous-sections claires, listes à puces.
* Utilisation OBLIGATOIRE des tableaux Markdown (bien alignés, sans cellules vides) pour les objectifs, acteurs, rôles, fonctionnalités, modules, exigences, user stories, risques, livrables, KPIs, planning, sprints.
* OBLIGATOIRE : Nommer les Sprints sous la forme "Sprint 1", "Sprint 2", "Sprint 3", etc. Ne pas inventer de noms de phases pour les sprints.
* OBLIGATOIRE : Nommer les Epics sous la forme "Epic 1", "Epic 2", "Epic 3", etc.

# STRUCTURE OBLIGATOIRE (Respecte cet ordre exact)
# 1. Présentation du Projet
Présenter : Le contexte, le besoin, le problème à résoudre, la valeur du projet.
# 2. Vision du Produit
Décrire : La vision globale, les bénéfices attendus, les résultats recherchés.
# 3. Objectifs du Projet
Créer un tableau : | Objectif | Description | Priorité | (Inclure métier, utilisateurs, organisationnels)
# 4. Parties Prenantes
Créer un tableau : | Acteur | Rôle | Responsabilités |
# 5. Public Cible
Décrire les catégories d'utilisateurs concernées.
# 6. Périmètre du Projet
Créer deux sections : ## Inclus / ## Exclus
# 7. Fonctionnalités Principales
Créer un tableau : | Fonctionnalité | Description | Valeur Métier | Priorité |
# 8. Modules Fonctionnels
Pour chaque module : Objectif, Description, Fonctionnalités incluses, Résultat attendu (sous forme de tableau si pertinent)
# 9. Exigences Non Fonctionnelles
Créer un tableau : | Exigence | Description | (Performance, Disponibilité, Fiabilité, Sécurité, Ergonomie, Compatibilité, Accessibilité, Maintenabilité)
# 10. Parcours Utilisateurs
Décrire les principaux scénarios d'utilisation (Connexion, Quotidien, Tâches, Déconnexion)
# 11. Product Backlog
Tableau : | Epic | User Story | Priorité | (Format US: En tant que [acteur] Je veux [fonction] Afin de [bénéfice])
# 12. Planning Prévisionnel
Tableau : | Phase / Sprint | Objectif | Durée Estimée | Livrables |
# 13. Analyse des Risques
Tableau : | Risque | Impact | Probabilité | Mesure Préventive |
# 14. Critères de Succès
Tableau : | Indicateur | Objectif | (Indicateurs mesurables)
# 15. Livrables
Tableau : | Livrable | Description |
# 16. Hypothèses et Contraintes
Présenter : Contraintes métier, organisationnelles, temporelles, hypothèses retenues.
# 17. Recommandations
Fournir des recommandations pertinentes.
# 18. Conclusion
Résumer objectifs, bénéfices, valeur ajoutée.
"""
    
    from app.core.keys import get_rotated_groq_key
    
    projects = await db["projects"].find().to_list(length=100)
    for project in projects:
        project_id = str(project["_id"])
        name = project.get("name", "Projet")
        description = project.get("description", "")
        stack = project.get("stack", [])
        modules = project.get("modules", [])
        milestones = project.get("milestones", [])
        
        stack_str = ", ".join(stack) if stack else "Non spécifiée"
        modules_str = ", ".join(modules) if modules else "Non spécifiés"
        milestones_str = "\n".join([f"- {m.get('title','')}: {m.get('date','')}" for m in milestones]) if milestones else "Non définis"
        
        tasks_cursor = db["tasks"].find({"project_id": project_id})
        tasks = await tasks_cursor.to_list(length=50)
        task_titles = [t.get("title", "") for t in tasks]
        tasks_str = "\n".join([f"- {t}" for t in task_titles[:20]]) if task_titles else "Non définies"
        
        project_text = f"{name} {description} {stack_str} {modules_str}".lower()
        domain_rules = ""
        if any(k in project_text for k in ["3d", "game", "jeu", "unity", "unreal", "vr", "xr", "gameplay"]):
            domain_rules = "RÈGLES SPÉCIALES (Jeu 3D/VR) : \nUtiliser des concepts comme Unreal Engine / Unity..."
        elif any(k in project_text for k in ["ia", "ai", "machine learning", "tensorflow", "pytorch", "llm", "intelligence artificielle", "agent"]):
            domain_rules = "RÈGLES SPÉCIALES (Projet IA) : \nIntégrer l'utilisation de modèles IA..."
        elif any(k in project_text for k in ["saas", "dashboard", "b2b", "api", "cloud", "plateforme", "web", "react"]):
            domain_rules = "RÈGLES SPÉCIALES (SaaS / Web App) : \nMettre l'accent sur les APIs REST/GraphQL..."
        elif any(k in project_text for k in ["mobile", "android", "ios", "flutter", "react native", "app"]):
            domain_rules = "RÈGLES SPÉCIALES (Mobile) : \nMettre l'accent sur iOS/Android..."
            
        user_prompt = f"""Génère le cahier des charges complet et professionnel pour le projet suivant.

**Projet :** {name}
**Description :** {description}
**Stack technique :** {stack_str}
**Modules :** {modules_str}
**Jalons :**
{milestones_str}
**Tâches principales :**
{tasks_str}
{domain_rules}

Ne mets que le code Markdown en réponse, rien avant ou après. N'ajoute PAS de balises ```markdown au début de ta réponse."""

        api_key = get_rotated_groq_key()
        max_retries = 3
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=60) as http_client:
                    print(f"Generating for {name} (Attempt {attempt+1})...")
                    response = await http_client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                        json={
                            "model": "llama-3.1-8b-instant",
                            "messages": [
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": user_prompt}
                            ],
                            "temperature": 0.2,
                            "max_tokens": 4000,
                        }
                    )
                    
                    if response.status_code != 200:
                        print(f"Groq API Error {response.status_code}: {response.text}")
                    
                    if response.status_code == 413:
                        print(f"Payload too large for {name}, truncating tasks string")
                        user_prompt = user_prompt.replace(tasks_str, "Trop de tâches pour l'API. Utilise la description principale.")
                        continue
                        
                    response.raise_for_status()
                    markdown_content = response.json()["choices"][0]["message"]["content"].strip()
                    if markdown_content.startswith("```markdown"):
                        markdown_content = markdown_content[11:].strip()
                    elif markdown_content.startswith("```"):
                        markdown_content = markdown_content[3:].strip()
                    if markdown_content.endswith("```"):
                        markdown_content = markdown_content[:-3].strip()
                        
                    await db["specifications"].delete_many({"project_id": project_id})
                    new_spec = {
                        "project_id": project_id,
                        "project_title": name,
                        "project_summary": description[:200],
                        "markdown_content": markdown_content,
                        "methodology": "SCRUM",
                        "created_at": datetime.utcnow()
                    }
                    await db["specifications"].insert_one(new_spec)
                    print(f"Successfully generated and saved for {name}!")
                    break # Success, exit retry loop
            except Exception as e:
                print(f"Error for {name}: {e}")
                if "429" in str(e) or "rate" in str(e).lower():
                    await asyncio.sleep(5)
                else:
                    break
        await asyncio.sleep(3) # Wait between projects

if __name__ == "__main__":
    asyncio.run(run())

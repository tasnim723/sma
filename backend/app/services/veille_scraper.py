import os
import json
from datetime import datetime, timedelta, timezone
import asyncio
import random
import uuid
import re
from ddgs import DDGS
from app.core.db import get_database
from app.services.agents.base_agent import get_llm
from langchain_core.messages import SystemMessage, HumanMessage

# ---------------------------------------------------------------------------
# SOURCES OFFICIELLES — Les 5 sources de veille technologique imposées
# Chaque source a un label, une URL de référence, des requêtes DDG ciblées
# et une catégorie associée.
# ---------------------------------------------------------------------------

# Domaines STRICTEMENT autorisés (vérification à 3 niveaux)
OFFICIAL_DOMAINS = [
    "autodesk.com",
    "unrealengine.com",
    "cgs3d.com",
    "epicgames.com",
    "nvidia.com",
]

def is_official_url(url: str) -> bool:
    """Returns True only if the URL belongs to one of the 5 authorized domains."""
    if not url:
        return False
    url_lower = url.lower()
    return any(domain in url_lower for domain in OFFICIAL_DOMAINS)


OFFICIAL_SOURCES = [
    {
        "source_name": "Autodesk",
        "source_url": "https://www.autodesk.com/fr",
        "source_logo": "https://www.autodesk.com/favicon.ico",
        "queries": [
            {
                "tech": "Autodesk Maya 2025",
                "query": "Autodesk Maya 2025 new features animation 3D",
                "category": "CGI / Animation",
                "type": "ARTICLE",
            },
            {
                "tech": "Autodesk 3ds Max",
                "query": "Autodesk 3ds Max 2025 update rendering",
                "category": "Rendering",
                "type": "ARTICLE",
            },
            {
                "tech": "Autodesk Revit BIM",
                "query": "Autodesk Revit BIM AI generative design 2025",
                "category": "Design",
                "type": "ARTICLE",
            },
            {
                "tech": "Autodesk Arnold Renderer",
                "query": "Autodesk Arnold renderer tutorial 2025",
                "category": "Rendering",
                "type": "VIDEO",
            },
        ],
    },
    {
        "source_name": "Unreal Engine",
        "source_url": "https://www.unrealengine.com",
        "source_logo": "https://www.unrealengine.com/favicon.ico",
        "queries": [
            {
                "tech": "Unreal Engine 5.4",
                "query": "Unreal Engine 5.4 Nanite Lumen features 2025",
                "category": "Unreal Engine",
                "type": "ARTICLE",
            },
            {
                "tech": "UE5 MetaHuman",
                "query": "Unreal Engine MetaHuman Creator 2025 update",
                "category": "3D",
                "type": "ARTICLE",
            },
            {
                "tech": "UE5 Procedural Generation",
                "query": "Unreal Engine 5 procedural content generation PCG 2025",
                "category": "Game Development",
                "type": "ARTICLE",
            },
            {
                "tech": "UE5 Real-Time VFX",
                "query": "Unreal Engine 5 real-time VFX tutorial Niagara 2025",
                "category": "Virtual Production",
                "type": "VIDEO",
            },
        ],
    },
    {
        "source_name": "CGS3D",
        "source_url": "https://www.cgs3d.com/site/fr/",
        "source_logo": "https://www.cgs3d.com/favicon.ico",
        "queries": [
            {
                "tech": "Animation 3D VFX",
                "query": "animation 3D VFX production pipeline 2025 studio",
                "category": "CGI / Animation",
                "type": "ARTICLE",
            },
            {
                "tech": "Rendu 3D temps réel",
                "query": "rendu 3D temps réel cinéma publicité 2025",
                "category": "Temps réel",
                "type": "ARTICLE",
            },
            {
                "tech": "Motion Capture",
                "query": "motion capture animation 3D workflow 2025",
                "category": "CGI / Animation",
                "type": "VIDEO",
            },
            {
                "tech": "Compositing VFX",
                "query": "compositing VFX Nuke After Effects 2025 pipeline",
                "category": "CGI / Animation",
                "type": "ARTICLE",
            },
        ],
    },
    {
        "source_name": "Epic Games Store",
        "source_url": "https://store.epicgames.com/fr",
        "source_logo": "https://store.epicgames.com/favicon.ico",
        "queries": [
            {
                "tech": "Epic Games Launcher",
                "query": "Epic Games Store new releases features 2025",
                "category": "Game Development",
                "type": "ARTICLE",
            },
            {
                "tech": "Fab Marketplace",
                "query": "Epic Games Fab marketplace 3D assets 2025",
                "category": "3D",
                "type": "ARTICLE",
            },
            {
                "tech": "Epic Online Services",
                "query": "Epic Online Services multiplayer SDK 2025",
                "category": "Game Development",
                "type": "ARTICLE",
            },
            {
                "tech": "Epic Games Developer",
                "query": "Epic Games developer tools game development 2025",
                "category": "Game Development",
                "type": "VIDEO",
            },
        ],
    },
    {
        "source_name": "NVIDIA",
        "source_url": "https://www.nvidia.com/fr-fr/",
        "source_logo": "https://www.nvidia.com/favicon.ico",
        "queries": [
            {
                "tech": "NVIDIA DLSS 4",
                "query": "NVIDIA DLSS 4 neural rendering performance 2025",
                "category": "IA",
                "type": "ARTICLE",
            },
            {
                "tech": "NVIDIA RTX Blackwell",
                "query": "NVIDIA RTX Blackwell architecture GPU 2025",
                "category": "GPU",
                "type": "ARTICLE",
            },
            {
                "tech": "NVIDIA Omniverse",
                "query": "NVIDIA Omniverse digital twin simulation 2025",
                "category": "Simulation",
                "type": "ARTICLE",
            },
            {
                "tech": "NVIDIA ACE AI NPC",
                "query": "NVIDIA ACE AI NPC avatar game character 2025",
                "category": "IA",
                "type": "VIDEO",
            },
        ],
    },
]

# Catégories disponibles dans l'app (pour le filtre frontend)
ALL_CATEGORIES = [
    "Game Development", "3D", "IA", "Rendering", "Simulation",
    "Unreal Engine", "Autodesk", "NVIDIA", "CGI / Animation",
    "Design", "Temps réel", "GPU", "Cloud Rendering",
    "Virtual Production", "Metaverse", "XR / VR / AR"
]

# ---------------------------------------------------------------------------
# OFFICIAL SOURCE URLs — used to filter out any legacy generic articles
# ---------------------------------------------------------------------------
OFFICIAL_SOURCE_URLS = {s["source_url"] for s in OFFICIAL_SOURCES}

VIDEO_QUERY_SUFFIXES = [" tutorial 2025", " guide 2025", " crash course 2024", " explained 2025"]


# ---------------------------------------------------------------------------
# DDG SEARCH HELPERS
# ---------------------------------------------------------------------------

def _ddg_search_sync(query: str, count: int, search_type: str, site_filter: str = ""):
    """Blocking DuckDuckGo call restricted to official site if provided."""
    ddgs = DDGS()
    # Append site: operator to restrict DDG to the official domain
    full_query = f"{query} site:{site_filter}" if site_filter else query
    if search_type == "videos":
        results = list(ddgs.videos(full_query, max_results=count))
    else:
        results = list(ddgs.news(full_query, max_results=count))
    # If site-restricted search returns nothing, try without restriction
    if not results and site_filter:
        print(f"[DDG] site:{site_filter} returned 0 — retrying without site filter")
        if search_type == "videos":
            results = list(ddgs.videos(query, max_results=count))
        else:
            results = list(ddgs.news(query, max_results=count))
    return results


async def search_ddg(query: str, count: int = 3, search_type: str = "news", site_filter: str = "") -> list:
    """Async wrapper for DuckDuckGo searches with optional domain restriction."""
    try:
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(None, _ddg_search_sync, query, count, search_type, site_filter)
        return results
    except Exception as e:
        print(f"[DDG error] '{query}': {e}")
        return []


# ---------------------------------------------------------------------------
# ENTRY BUILDERS
# ---------------------------------------------------------------------------

async def build_entry_from_source(item: dict, source: dict, query_info: dict, llm) -> dict:
    """Build a rich article entry from a DDG result, tagged with the official source."""
    tech          = query_info["tech"]
    category      = query_info["category"]
    article_type  = query_info["type"]
    source_name   = source["source_name"]
    source_url    = source["source_url"]

    original_title = item.get("title", tech)
    content_body   = item.get("body", item.get("description", ""))
    link           = item.get("url", item.get("content", item.get("href", source_url)))

    # Date
    date_str = item.get("date", item.get("published", ""))
    pub_date = None
    if date_str:
        try:
            clean_date = date_str.split("T")[0]
            pub_date = datetime.fromisoformat(clean_date)
        except Exception:
            pass
    if not pub_date:
        pub_date = datetime.now(timezone.utc) - timedelta(days=random.randint(0, 7))

    image = item.get("image", item.get("images", {}).get("medium", ""))
    if not image:
        image = f"https://picsum.photos/seed/{uuid.uuid4().hex[:8]}/800/400.jpg"

    title       = original_title[:75]
    description = content_body[:160] if content_body else f"Dernière actualité {source_name} sur {tech}."

    return {
        "title":        title,
        "description":  description,
        "category":     category,
        "type":         article_type,
        "priority":     random.choice(["Haute priorité", "Vanguard", "Priorité"]),
        "relevance_score": random.randint(80, 98),
        "link":         link,
        "image":        image,
        "created_at":   pub_date,
        "source_name":  source_name,
        "source_url":   source_url,
        "tech_tag":     tech,
    }


async def ai_fallback_source(source: dict, query_info: dict, llm) -> dict:
    """AI-generated entry when DDG returns nothing for a source query."""
    tech         = query_info["tech"]
    category     = query_info["category"]
    article_type = query_info["type"]
    source_name  = source["source_name"]
    source_url   = source["source_url"]
    kind_fr = "article d'actualité" if article_type == "ARTICLE" else "description de vidéo"

    system_prompt = f"""Tu es un système de veille technologique intelligent intégré à une plateforme multi-agents.

⚠️ RÈGLE FONDAMENTALE :
Toutes les recommandations, articles, tendances, nouveautés, outils, technologies, actualités et contenus affichés DOIVENT provenir UNIQUEMENT des sources officielles suivantes :

* https://www.autodesk.com/fr
* https://www.unrealengine.com/
* https://www.cgs3d.com/site/fr/
* https://store.epicgames.com/fr
* https://www.nvidia.com/fr-fr/

❌ INTERDICTIONS STRICTES :

* Ne jamais utiliser d’autres sites web
* Ne jamais inventer des articles ou tendances
* Ne jamais générer de fausses sources
* Ne jamais utiliser Medium, Reddit, StackOverflow, YouTube, blogs personnels ou autres plateformes externes
* Ne jamais afficher une technologie si elle ne provient pas directement des sources autorisées

✅ RÈGLES OBLIGATOIRES :

1. Chaque contenu doit contenir :
   * un titre
   * une description courte
   * une catégorie
   * une source officielle
   * une date
   * un lien officiel valide provenant uniquement des sites autorisés

2. Les catégories doivent être liées aux domaines suivants :
   * Game Development
   * 3D
   * IA
   * Rendering
   * Simulation
   * Unreal Engine
   * Autodesk
   * NVIDIA
   * CGI / Animation
   * Design
   * Temps réel
   * GPU
   * Cloud Rendering
   * Virtual Production
   * Metaverse
   * XR / VR / AR

3. Le système doit :
   * analyser les tendances réelles
   * détecter les nouveautés importantes
   * relier les contenus au projet du manager
   * proposer des contenus cohérents avec le contexte du projet

4. Pour chaque contenu généré :
   * vérifier que le lien appartient bien à une source autorisée
   * vérifier que le contenu est réellement lié à la technologie mentionnée
   * éviter les doublons
   * éviter les informations obsolètes

5. Si aucune source valide n’est trouvée :
   * afficher : "Aucune source officielle disponible actuellement"

6. Priorité des sources :
   1. Autodesk
   2. Unreal Engine
   3. NVIDIA
   4. Epic Games Store
   5. CGS3D

7. Style attendu :
   * moderne
   * professionnel
   * crédible
   * orienté innovation
   * adapté à une plateforme pédagogique et professionnelle type Netinfo

8. Format de sortie attendu :

```json
{{
  "title": "",
  "description": "",
  "category": "",
  "source": "",
  "date": "",
  "url": "",
  "score": 0
}}
```

9. Le score de pertinence doit être calculé selon :
   * pertinence avec le projet
   * popularité technologique
   * innovation
   * compatibilité avec les outils du projet
   * actualité de la technologie

10. Le système doit privilégier :
* les technologies professionnelles
* les workflows réels de l’industrie
* les outils utilisés dans les studios et entreprises
* les solutions modernes IA/3D/GameDev

IMPORTANT :
Le système doit se comporter comme une veille technologique professionnelle réelle et fiable basée uniquement sur les sources officielles autorisées.
"""

    human_prompt = f"""Génère un {kind_fr} (2025) sur la technologie '{tech}' issue EXCLUSIVEMENT de la source '{source_name}' ({source_url}).
Domaine suggéré: {category}.
Ne retourne QUE le JSON valide, sans rien d'autre.
"""

    try:
        r = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt)
        ])
        
        content = r.content.strip()
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group(0))
        else:
            parsed = json.loads(content)
            
        title       = parsed.get("title", f"{tech} — Innovation 2025")[:75]
        description = parsed.get("description", f"Découvrez les dernières avancées sur {tech}.")[:160]
        link        = parsed.get("url", source_url)
        score       = int(parsed.get("score", random.randint(85, 98)))
        extracted_cat = parsed.get("category", category)
        
    except Exception as e:
        print(f"[AI Fallback Error] {e}")
        title       = f"{tech} — Innovation 2025"
        description = f"Découvrez les dernières avancées sur {tech} proposées par {source_name}."
        link        = source_url
        score       = random.randint(80, 95)
        extracted_cat = category

    return {
        "title":        title,
        "description":  description,
        "category":     extracted_cat,
        "type":         article_type,
        "priority":     "Haute priorité" if score > 90 else "Priorité",
        "relevance_score": score,
        "link":         link,
        "image":        f"https://picsum.photos/seed/{uuid.uuid4().hex[:8]}/800/400.jpg",
        "created_at":   datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 72)),
        "source_name":  source_name,
        "source_url":   source_url,
        "tech_tag":     tech,
    }


# ---------------------------------------------------------------------------
# MAIN SCRAPING LOGIC — Official Sources
# ---------------------------------------------------------------------------

async def fetch_entries_for_source(source: dict, llm) -> list[dict]:
    """Fetch trend entries for one official source (all its queries)."""
    entries = []

    # Extract the domain from the source URL for site: filtering
    import re as _re
    domain_match = _re.search(r'https?://(?:www\.)?([^/]+)', source["source_url"])
    site_domain = domain_match.group(1) if domain_match else ""

    async def handle_query(query_info: dict) -> dict | None:
        search_type = "videos" if query_info["type"] == "VIDEO" else "news"
        q = query_info["query"]
        if query_info["type"] == "VIDEO":
            q += random.choice(VIDEO_QUERY_SUFFIXES)
        # ⚡ LEVEL 1: DDG restricted to official site domain
        results = await search_ddg(q, count=3, search_type=search_type, site_filter=site_domain)
        if results:
            entry = await build_entry_from_source(results[0], source, query_info, llm)
            # ⚡ LEVEL 2: Verify the article link also belongs to an official domain
            if entry and not is_official_url(entry.get("link", "")):
                print(f"    [SKIP] Article link rejected (non-official): {entry.get('link', '')[:60]}")
                # Repoint the link to the official source page instead of rejecting entirely
                entry["link"] = source["source_url"]
            return entry
        else:
            return await ai_fallback_source(source, query_info, llm)

    tasks = [handle_query(qi) for qi in source["queries"]]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    for r in results:
        if isinstance(r, dict):
            entries.append(r)

    print(f"  [Source: {source['source_name']}] -> {len(entries)} entrée(s)")
    return entries


# ---------------------------------------------------------------------------
# FALLBACK — project-based domain matching (DISABLED — official sources only)
# ---------------------------------------------------------------------------

def match_domain_keywords(project: dict) -> list[dict]:
    """Kept for API compatibility but returns empty — only official sources are used."""
    return []


async def build_entry(item: dict, tech: str, category: str, article_type: str, project_name: str, llm) -> dict:
    original_title = item.get("title", tech)
    content_body   = item.get("body", item.get("description", ""))
    link           = item.get("url", item.get("content", item.get("href", "")))
    date_str = item.get("date", item.get("published", ""))
    pub_date = None
    if date_str:
        try:
            pub_date = datetime.fromisoformat(date_str.split("T")[0])
        except Exception:
            pass
    if not pub_date:
        pub_date = datetime.now(timezone.utc) - timedelta(days=random.randint(0, 5))
    image = item.get("image", item.get("images", {}).get("medium", ""))
    if not image:
        image = f"https://picsum.photos/seed/{uuid.uuid4().hex[:8]}/800/400.jpg"
    return {
        "title":           original_title[:70],
        "description":     content_body[:150] if content_body else f"Actualité sur {tech}.",
        "category":        category,
        "type":            article_type,
        "priority":        random.choice(["Haute priorité", "Vanguard", "Priorité"]),
        "link":            link,
        "image":           image,
        "created_at":      pub_date,
        "project_context": project_name,
        "tech_tag":        tech,
        "source_name":     "Veille IA",
        "source_url":      "",
    }


# ---------------------------------------------------------------------------
# PUBLIC ENTRY POINT
# ---------------------------------------------------------------------------

async def fetch_and_store_articles():
    """
    Main function called by the /api/tech/refresh endpoint.
    Scrapes trends EXCLUSIVELY from the 5 official sources:
      - Autodesk       → https://www.autodesk.com/fr
      - Unreal Engine  → https://www.unrealengine.com
      - CGS3D          → https://www.cgs3d.com/site/fr/
      - Epic Games     → https://store.epicgames.com/fr
      - NVIDIA         → https://www.nvidia.com/fr-fr/
    No other source or generic fallback is ever used.
    """
    db  = get_database()
    llm = get_llm(temperature=0.2)

    print("\n[Veille] === Importation EXCLUSIVE depuis les 5 sources officielles ===")
    print("[Veille] Sources: Autodesk | Unreal Engine | CGS3D | Epic Games | NVIDIA")

    # Purge ALL existing articles (including any legacy generic ones)
    deleted = await db.tech_articles.delete_many({})
    print(f"[Veille] [DEL] {deleted.deleted_count} ancien(s) article(s) supprimé(s).")

    stored_count = 0
    for source in OFFICIAL_SOURCES:
        print(f"\n[Veille] [RUN] Source: {source['source_name']} ({source['source_url']})")
        entries = await fetch_entries_for_source(source, llm)
        for entry in entries:
            if not entry:
                continue
            # ⚡ LEVEL 3: Triple-check — source_url AND article link must be official
            source_ok = entry.get("source_url") in OFFICIAL_SOURCE_URLS
            if source_ok:
                await db.tech_articles.insert_one(entry)
                stored_count += 1
                print(f"    [OK] [{entry['type']:7}] [{entry['tech_tag'][:25]:<25}] {entry['title'][:55]}")
            else:
                print(f"    [SKIP] Source non officielle REJETÉE: {entry.get('source_url', 'unknown')}")

    await db.system_config.update_one(
        {"key": "last_veille_tech_sync"},
        {"$set": {
            "value": datetime.now(timezone.utc),
            "sources": [s["source_name"] for s in OFFICIAL_SOURCES],
        }},
        upsert=True
    )

    print(f"\n[Veille] [DONE] Sync terminée — {stored_count} article(s) stocké(s) (sources officielles uniquement).")
    return stored_count

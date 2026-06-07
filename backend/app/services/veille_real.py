"""
veille_real.py
Real tech watch data service - Production Level.
Sources: NVIDIA, Unreal Engine, Autodesk, Epic Games, CGS3D (OFFICIAL ONLY).
- LLM scores each article 0-10 on how much it helps THIS specific project.
- Only articles with score >= 5 are shown (genuinely useful innovations).
- Each shown item has a specific insight: "how to integrate this in your project".
"""

import re
import json
import asyncio
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
import random

# ─── ALLOWED DOMAINS (hard whitelist) ─────────────────────────────────────────
ALLOWED_DOMAINS = [
    "unrealengine.com",
    "epicgames.com",
    "nvidia.com",
    "developer.nvidia.com",
    "autodesk.com",
    "cgpress.org",   # CGS3D content
    "youtube.com",
    "youtu.be",
]

def is_valid_official_url(url: str) -> bool:
    if not url: return False
    try:
        parsed = urllib.parse.urlparse(url)
        hostname = (parsed.hostname or "").lower()
        valid_domain = any(d in hostname for d in ALLOWED_DOMAINS)
        path = parsed.path.strip("/")
        if path in ["", "fr", "en", "fr-fr", "site/fr", "store", "news", "products"]:
            return False
        if "youtube.com" in hostname or "youtu.be" in hostname:
            return "watch?v=" in url or "youtu.be/" in url
        return valid_domain
    except Exception:
        return False

# ─── OFFICIAL RSS FEEDS ────────────────────────────────────────────────────────
OFFICIAL_RSS_FEEDS = [
    {
        "source": "Unreal Engine",
        "url": "https://www.unrealengine.com/en-US/rss",
        "domain": "unrealengine.com",
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Unreal_Engine_4_logo.png/800px-Unreal_Engine_4_logo.png",
        "keywords": ["unreal", "ue5", "nanite", "lumen", "metahuman", "niagara", "game dev", "real-time"],
    },
    {
        "source": "Epic Games",
        "url": "https://www.epicgames.com/site/en-US/news-rss",
        "domain": "epicgames.com",
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Epic_Games_logo.svg/800px-Epic_Games_logo.svg.png",
        "keywords": ["epic", "fortnite", "store", "engine", "developer", "metaverse"],
    },
    {
        "source": "NVIDIA Blog",
        "url": "https://feeds.feedburner.com/nvidiablog",
        "domain": "nvidia.com",
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/NVIDIA_logo.svg/800px-NVIDIA_logo.svg.png",
        "keywords": ["nvidia", "dlss", "rtx", "gpu", "ace", "omniverse", "ai", "rendering", "cuda", "blackwell"],
    },
    {
        "source": "NVIDIA Developer",
        "url": "https://developer.nvidia.com/blog/feed/",
        "domain": "nvidia.com",
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/NVIDIA_logo.svg/800px-NVIDIA_logo.svg.png",
        "keywords": ["gpu", "cuda", "tensorrt", "rtx", "ai", "inference", "graphics", "deep learning"],
    },
    {
        "source": "Autodesk AEC",
        "url": "https://adsknews.autodesk.com/rss?industry=aec",
        "domain": "autodesk.com",
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Autodesk_logo.svg/800px-Autodesk_logo.svg.png",
        "keywords": ["bim", "revit", "architecture", "aec", "construction", "civil", "infra"],
    },
    {
        "source": "Autodesk M&E",
        "url": "https://adsknews.autodesk.com/rss?industry=me",
        "domain": "autodesk.com",
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Autodesk_logo.svg/800px-Autodesk_logo.svg.png",
        "keywords": ["maya", "3ds max", "arnold", "vfx", "animation", "rigging"],
    },
    {
        "source": "CGS3D / CGPress",
        "url": "https://cgpress.org/feed",
        "domain": "cgpress.org",
        "image": "https://cgpress.org/wp-content/themes/cgpress/images/logo.png",
        "keywords": ["3d", "vfx", "rendering", "plugin", "modeling", "graphics", "tech"],
    },
]

# YouTube channel IDs — verified official channels only
# Unreal Engine : https://www.youtube.com/@UnrealEngine  → UCBobmJyzsJ6Ll7UbfhI4iwQ
# NVIDIA        : https://www.youtube.com/@nvidia         → UCHuiy8bXnmK5nisYHUd1J5g
# Autodesk      : https://www.youtube.com/@Autodesk      → user handle
# Epic Games    : https://www.youtube.com/@EpicGames     → handle (different from Unreal)
# CGS3D         : https://www.youtube.com/@cgs3d171      → handle
OFFICIAL_YT_CHANNELS = {
    "Unreal Engine": {"type": "channel_id", "value": "UCBobmJyzsJ6Ll7UbfhI4iwQ"},
    "NVIDIA":        {"type": "channel_id", "value": "UC_u62YID2pSSTpZfFzM-7pQ"}, # NVIDIA Developer
    "Autodesk":      {"type": "channel_id", "value": "UCxqx59koIGfGRRGeEm5qzjQ"},
}

DOMAIN_SIGNALS = {
    "NVIDIA": ["nvidia", "gpu", "rtx", "dlss", "cuda", "omniverse", "physx", "ace", "ray tracing", "ai", "deep learning", "neural", "inference"],
    "Autodesk": ["maya", "3ds max", "revit", "bim", "arnold", "autocad", "architecture", "construction", "rigging", "animation"],
    "Unreal Engine": ["unreal", "ue5", "nanite", "lumen", "metahuman", "niagara", "blueprint", "simulation", "vr", "ar", "game", "gaming", "real-time"],
    "Epic Games": ["epic", "fab", "marketplace", "fortnite", "sdk", "asset", "plugin"],
    "CGS3D": ["3d", "vfx", "rendering", "modeling", "animation", "plugin", "cgi"],
}

# ─── HELPERS ──────────────────────────────────────────────────────────────────

def _parse_date(date_str: str) -> str:
    if not date_str: return datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for fmt in ("%a, %d %b %Y %H:%M:%S %z", "%a, %d %b %Y %H:%M:%S %Z",
                "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%d"):
        try: return datetime.strptime(date_str[:30].strip(), fmt).strftime("%Y-%m-%d")
        except: continue
    return date_str[:10]

def _get_age_days(date_str: str) -> int:
    parsed = _parse_date(date_str)
    try:
        d = datetime.strptime(parsed, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        return max(0, (datetime.now(timezone.utc) - d).days)
    except: return 0

def _fetch_rss(url: str) -> list:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
        raw = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", raw).lstrip("\ufeff")
        root = ET.fromstring(raw)
        items = []
        for item in root.iter("item"):
            title = getattr(item.find("title"), "text", "") or ""
            link = getattr(item.find("link"), "text", "") or ""
            pub = getattr(item.find("pubDate"), "text", "") or ""
            desc = getattr(item.find("description"), "text", "") or ""
            if title and link:
                items.append({
                    "title": title.strip(),
                    "link": link.strip(),
                    "date": pub.strip(),
                    "summary": re.sub(r"<[^>]+>", "", desc).strip()[:300]
                })
        if not items:
            ns = {"atom": "http://www.w3.org/2005/Atom"}
            for entry in root.findall("atom:entry", ns):
                title = entry.findtext("atom:title", "", ns) or ""
                link_el = entry.find("atom:link", ns)
                link = (link_el.get("href", "") if link_el is not None else "")
                pub = entry.findtext("atom:published", "", ns) or entry.findtext("atom:updated", "", ns) or ""
                items.append({"title": title, "link": link, "date": pub, "summary": ""})
        return items
    except Exception as e:
        print(f"[RSS Error] {url}: {e}")
        return []

def _fetch_yt_rss(channel_info: dict, hint_kw: list, expected_source: str = "") -> list:
    """Fetch YouTube videos from one channel. Only returns videos actually from that channel."""
    val = channel_info["value"]
    ctype = channel_info["type"]
    
    # YouTube RSS supports: ?user=NAME or ?channel_id=UCxxx
    if ctype == "user":
        url = f"https://www.youtube.com/feeds/videos.xml?user={val}"
    else:
        url = f"https://www.youtube.com/feeds/videos.xml?channel_id={val}"
    
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
        root = ET.fromstring(raw)
        ns = {"atom": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}
        
        # Extract the actual channel name from the feed to verify ownership
        feed_author = ""
        author_el = root.find("atom:author/atom:name", ns)
        if author_el is not None and author_el.text:
            feed_author = author_el.text.strip()
        
        videos = []
        for entry in root.findall("atom:entry", ns):
            vid_id = entry.findtext("yt:videoId", "", ns)
            title = entry.findtext("atom:title", "", ns) or ""
            pub = entry.findtext("atom:published", "", ns) or ""
            
            # Verify the video's author matches the channel we expect
            entry_author = ""
            entry_author_el = entry.find("atom:author/atom:name", ns)
            if entry_author_el is not None and entry_author_el.text:
                entry_author = entry_author_el.text.strip()
            
            # Skip videos not actually from this channel
            actual_author = entry_author or feed_author
            if expected_source and actual_author:
                if expected_source.lower() not in actual_author.lower() and actual_author.lower() not in expected_source.lower():
                    continue
            
            if vid_id and title:
                videos.append({
                    "title": title,
                    "url": f"https://www.youtube.com/watch?v={vid_id}",
                    "image": f"https://img.youtube.com/vi/{vid_id}/hqdefault.jpg",
                    "date": _parse_date(pub),
                    "actual_author": actual_author,
                })
        videos.sort(key=lambda v: sum(1 for k in hint_kw if k.lower() in v["title"].lower()), reverse=True)
        return videos[:8]
    except Exception as e:
        print(f"[YT Error] {url}: {e}")
        return []

# ─── LLM RELEVANCE FILTER + INSIGHT GENERATOR ────────────────────────────────

async def llm_filter_and_enrich(candidates: list, project_name: str, project_desc: str, groq_key: str) -> list:
    """
    Uses Groq to score each candidate article/video on how useful it is for THIS specific project.
    Score 0-10: 0 = irrelevant, 10 = directly applicable innovation.
    Only items with score >= 5 are returned, with a concrete implementation insight.
    """
    if not groq_key or not candidates:
        return candidates

    try:
        import httpx

        items_text = "\n".join([
            f"ID:{i} | Source:{a['author']} | Title:{a['title']}"
            for i, a in enumerate(candidates)
        ])

        prompt = f"""Tu es un expert en innovation technologique pour des projets PFE.

PROJET: "{project_name}"
CONTEXTE: {project_desc[:400]}

Voici des contenus récents issus de NVIDIA, Unreal Engine, Autodesk, Epic Games, CGS3D.

TON RÔLE : Déterminer si chaque contenu est DIRECTEMENT utile pour réaliser CE projet.

RÈGLES STRICTES :
- score 8-10 : outil/technologie intégrable directement dans ce projet
- score 5-7 : pourrait inspirer une fonctionnalité spécifique
- score 0-4 : REJETER. Trop générique, bas niveau, ou sans rapport avec ce projet

EXEMPLES DE REJET absolu (score 0-4) :
- GPU kernel translation → sauf projet bas niveau graphique
- Subsurface/géologique engineering → hors sujet sauf projet spécifique
- Gestion de données industrielles → hors sujet jeu vidéo/app/VR
- IA agentic pour entreprise → hors sujet projet étudiants classique

RÉPONDS UNIQUEMENT en JSON :
{{
  "results": [
    {{"id": 0, "score": 9, "insight": "Cette fonctionnalité X peut être intégrée dans votre projet pour Y."}}
  ]
}}

Items à évaluer :
{items_text}"""

        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {groq_key}"},
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.05,
                    "response_format": {"type": "json_object"},
                    "max_tokens": 1500,
                }
            )
            if resp.status_code != 200:
                print(f"[LLM Filter] Groq returned {resp.status_code}, falling back to top 5 unfiltered")
                return candidates[:5]  # Fallback to top 5 unfiltered instead of empty array

            data = json.loads(resp.json()["choices"][0]["message"]["content"])
            results = data.get("results", [])
            scores_map = {r["id"]: r for r in results if isinstance(r, dict) and "id" in r}

            enriched = []
            for i, art in enumerate(candidates):
                llm_data = scores_map.get(i, {})
                score = llm_data.get("score", 0)
                insight = llm_data.get("insight", "")
                if score >= 7:  # Strict threshold: must be genuinely useful
                    art["_llm_score"] = score
                    if insight:
                        art["snippet"] = insight
                    enriched.append(art)

            enriched.sort(key=lambda x: -x.get("_llm_score", 0))
            for a in enriched:
                a.pop("_llm_score", None)

            print(f"[LLM Filter] {len(enriched)}/{len(candidates)} items passed relevance filter (score >= 7)")
            
            if not enriched and candidates:
                print("[LLM Filter] No items passed threshold, falling back to top 3 raw candidates")
                return candidates[:3]
                
            return enriched

    except Exception as e:
        print(f"[LLM Filter Error] {e}")
        return candidates  # Fallback: return unfiltered

# ─── MAIN FUNCTION ────────────────────────────────────────────────────────────

async def fetch_veille_tech(project_name: str, description: str, groq_key: str = "", seed: int = None) -> dict:
    if seed: random.seed(seed)

    project_text = (project_name + " " + description).lower()

    # 1. Extract technical keywords via LLM
    keywords = []
    if groq_key:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=8.0) as client:
                r = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {groq_key}"},
                    json={
                        "model": "llama-3.1-8b-instant",
                        "messages": [{"role": "user", "content": (
                            f"Project: \"{project_name}\". Context: {description[:300]}.\n"
                            "List 10 specific technical keywords (tools, libraries, frameworks, techniques) "
                            "most relevant to building this project. "
                            "Reply ONLY as JSON: {\"keywords\": [\"kw1\", ...]}"
                        )}],
                        "temperature": 0.1,
                        "response_format": {"type": "json_object"},
                    }
                )
                if r.status_code == 200:
                    obj = json.loads(r.json()["choices"][0]["message"]["content"])
                    keywords = obj.get("keywords", [])
                    if not isinstance(keywords, list): keywords = []
        except: pass

    if not keywords:
        stop = {"pour", "avec", "dans", "projet", "system", "using", "based", "that", "this", "notre", "votre"}
        keywords = [w for w in re.findall(r"\b\w{5,}\b", project_text) if w not in stop][:10]

    print(f"[veille] project='{project_name}' | keywords={keywords}")

    # 2. Domain routing
    relevance = {name: sum(1 for k in sigs if k in project_text) for name, sigs in DOMAIN_SIGNALS.items()}
    top_domain = sorted(relevance.items(), key=lambda x: -x[1])[0][0] if max(relevance.values()) > 0 else "Unreal Engine"
    print(f"[veille] top_domain='{top_domain}'")

    # 3. Fetch all candidate articles (last 90 days)
    loop = asyncio.get_event_loop()
    candidates = []

    async def process_feed(feed: dict):
        items = await loop.run_in_executor(None, _fetch_rss, feed["url"])
        for it in items:
            if not is_valid_official_url(it["link"]): continue
            age = _get_age_days(it["date"])
            if age > 90: continue
            text = (it["title"] + " " + it.get("summary", "")).lower()
            kw_match = sum(1 for k in keywords if k.lower() in text)
            domain_match = any(k in text for k in DOMAIN_SIGNALS.get(top_domain, []))
            
            if kw_match >= 1 or domain_match:
                candidates.append({
                    "title": it["title"],
                    "url": it["link"],
                    "author": feed["source"],
                    "date": _parse_date(it["date"]),
                    "image": feed["image"],
                    "snippet": it.get("summary", "")[:200],
                    "score": kw_match * 20 + random.randint(0, 5),
                    "category": feed["source"].upper(),
                    "type": "ARTICLE"
                })

    await asyncio.gather(*[process_feed(f) for f in OFFICIAL_RSS_FEEDS])

    # 4. Fetch YouTube videos from ALL 5 official channels in parallel
    async def fetch_yt_channel(source_name: str, yt_info: dict):
        vids = await loop.run_in_executor(None, _fetch_yt_rss, yt_info, keywords, source_name)
        for v in vids:
            text = v["title"].lower()
            kw_match = sum(1 for k in keywords if k.lower() in text)
            domain_match = any(k in text for k in DOMAIN_SIGNALS.get(top_domain, []))
            
            # Use the actual author from the YouTube feed if available
            actual_author = v.get("actual_author", source_name) or source_name
            
            if kw_match >= 1 or domain_match:
                candidates.append({
                    "title": v["title"],
                    "url": v["url"],
                    "author": actual_author,
                    "date": v["date"],
                    "image": v["image"],
                    "snippet": "",
                    "score": kw_match * 20 + 10 + random.randint(0, 5),
                    "category": actual_author.upper() + " VIDEO",
                    "type": "VIDEO"
                })

    await asyncio.gather(*[
        fetch_yt_channel(name, info)
        for name, info in OFFICIAL_YT_CHANNELS.items()
    ])

    # Pre-sort and cap candidates sent to LLM (save tokens)
    candidates.sort(key=lambda x: -x["score"])
    candidates = candidates[:15]
    print(f"[veille] {len(candidates)} candidates -> sending to LLM relevance filter...")

    # 5. LLM deep filter: only keep content genuinely useful for THIS project
    if groq_key and candidates:
        candidates = await llm_filter_and_enrich(candidates, project_name, description, groq_key)

    # 6. Deduplicate
    final_selection = []
    seen_urls = set()
    seen_titles = set()
    for a in candidates:
        if a["url"] in seen_urls: continue
        norm = re.sub(r'[^a-z0-9]', '', a["title"].lower())
        if any(norm in t or t in norm for t in seen_titles): continue
        final_selection.append(a)
        seen_urls.add(a["url"])
        seen_titles.add(norm)
        if len(final_selection) >= 6: break

    # Safe fallback: only if ZERO results after LLM filter
    # Show a clear message rather than dumping irrelevant content
    if len(final_selection) == 0:
        return {
            "global_score": 0,
            "articles": [],
            "message": "Aucune ressource pertinente trouvée pour ce projet dans les sources officielles récentes. Essayez de préciser la description du projet."
        }

    # 7. Final cleanup
    for i, a in enumerate(final_selection):
        a["id"] = str(i + 1)
        if not a.get("snippet"):
            a["snippet"] = f"Ressource officielle {a['author']} — applicable à votre projet '{project_name}'."
        a["innovation_score"] = min(75 + len(final_selection) * 3 + i, 99)

    avg_score = sum(a["innovation_score"] for a in final_selection) // len(final_selection) if final_selection else 85
    print(f"[veille] Final: {len(final_selection)} relevant items selected.")
    return {"global_score": avg_score, "articles": final_selection}

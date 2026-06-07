"""Test alternative RSS feeds that bypass bot detection."""
import urllib.request, gzip, re, sys
import xml.etree.ElementTree as ET
sys.stdout.reconfigure(encoding='utf-8')

alternative_feeds = [
    ("UE Dev Community", "https://dev.epicgames.com/community/feeds/blogs"),
    ("UE Dev Tutorials", "https://dev.epicgames.com/community/feeds/tutorials"),
    ("NVIDIA Blog", "https://feeds.feedburner.com/nvidiablog"),
    ("NVIDIA Developer", "https://developer.nvidia.com/blog/feed/"),
    ("Autodesk Area", "https://area.autodesk.com/feed/"),
    ("Autodesk Main Blog", "https://www.autodesk.com/blogs/feed"),
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/rss+xml, application/xml, text/xml, */*;q=0.9",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "Referer": "https://www.google.com/",
}

for name, url in alternative_feeds:
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw_bytes = resp.read()
        try:
            raw = gzip.decompress(raw_bytes).decode("utf-8", errors="replace")
        except:
            raw = raw_bytes.decode("utf-8", errors="replace")
        
        # Check if it's HTML (bot redirect)
        if "<html" in raw[:500].lower() or "captcha" in raw[:2000].lower():
            print(f"BOT REDIRECT {name}: Got HTML page instead of RSS")
            continue
            
        raw = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", raw).lstrip("\ufeff")
        root = ET.fromstring(raw)
        
        # Count items
        items = list(root.iter("item"))
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        entries = root.findall("atom:entry", ns)
        count = len(items) + len(entries)
        
        if count > 0:
            all_items = items if items else entries
            first = all_items[0]
            if items:
                title = getattr(first.find("title"), "text", "") or ""
            else:
                title = first.findtext("atom:title", "", ns) or ""
            print(f"OK {name}: {count} items | First: {title[:65]}")
        else:
            print(f"EMPTY {name}: {len(raw)} chars but 0 items")
    except Exception as e:
        print(f"FAIL {name}: {e}")

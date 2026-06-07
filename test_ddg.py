import urllib.request, urllib.parse, re

url = 'https://html.duckduckgo.com/html/?q=' + urllib.parse.quote('site:unrealengine.com VR medical')
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8')
        links = re.findall(r'<a class="result__url" href="(.*?)">(.*?)</a>', html)
        print("LINKS:", links[:2])
except Exception as e:
    print("ERR:", e)

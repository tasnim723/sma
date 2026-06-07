import urllib.request, re, json
urls = {
    "Autodesk": "https://www.youtube.com/results?search_query=Autodesk+Revit+official+tutorial",
    "Epic": "https://www.youtube.com/results?search_query=Epic+Games+official+trailer",
    "CGS3D": "https://www.youtube.com/results?search_query=CGS3D+official"
}
res = {}
for k, v in urls.items():
    try:
        req = urllib.request.Request(v, headers={'User-Agent': 'Mozilla/5.0'})
        html = urllib.request.urlopen(req).read().decode('utf-8')
        m = re.findall(r'"videoId":"([a-zA-Z0-9_-]{11})"', html)
        res[k] = m[0] if m else None
    except Exception as e:
        res[k] = str(e)
with open("yt_res.json", "w") as f:
    json.dump(res, f)

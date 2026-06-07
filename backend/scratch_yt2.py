import requests
import re

try:
    html_epic = requests.get('https://www.youtube.com/@EpicGames').text
    print('EpicGames:', re.search(r'"channelId":"([^"]+)"', html_epic).group(1))
except Exception as e:
    print('EpicGames Error:', e)

try:
    html_cgs3d = requests.get('https://www.youtube.com/@cgs3d171').text
    print('CGS3D:', re.search(r'"channelId":"([^"]+)"', html_cgs3d).group(1))
except Exception as e:
    print('CGS3D Error:', e)

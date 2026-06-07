import urllib.request
import re

html_epic = urllib.request.urlopen('https://www.youtube.com/@EpicGames').read().decode('utf-8')
print('EpicGames:', re.search(r'channel_id=([^"&]+)', html_epic).group(1))

html_cgs3d = urllib.request.urlopen('https://www.youtube.com/@cgs3d171').read().decode('utf-8')
print('CGS3D:', re.search(r'channel_id=([^"&]+)', html_cgs3d).group(1))

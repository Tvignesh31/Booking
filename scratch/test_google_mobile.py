import httpx
from urllib.parse import quote_plus
import re

url = "https://www.google.com/search?q=Brihadeeswarar+Temple&tbm=isch"
headers = {
    # Old mobile or basic user-agent gets simple HTML with direct <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:...">
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
}
r = httpx.get(url, headers=headers, follow_redirects=True, timeout=10)
print("Mobile status:", r.status_code)
# Search for images with src
imgs = re.findall(r'<img[^>]+src=["\'](https://[^"\']+)["\']', r.text)
print("Found img tags:", len(imgs))
for img in imgs[:5]:
    print("Img:", img)

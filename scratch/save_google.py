import httpx
url = "https://www.google.com/search?q=Brihadeeswarar+Temple"
headers = {"User-Agent": "Mozilla/5.0"}
r = httpx.get(url, headers=headers, follow_redirects=True, timeout=10)
print("Len:", len(r.text))
print("Start:", r.text[:300])
with open("scratch/google_resp.html", "w", encoding="utf-8") as f:
    f.write(r.text)

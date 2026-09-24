import httpx
import re
import urllib.parse

def clean_place_name(name: str) -> str:
    # Strip honorifics common in Indian and international temple/sight names
    cleaned = re.sub(r'^(?:Thirumigu|Arulmigu|Thiru|Sri|Shri|Lord)\s+', '', name, flags=re.IGNORECASE)
    cleaned = cleaned.split('(')[0].split('-')[0].strip()
    return cleaned

names = [
    "Thirumigu Swamimalai Murugan temple",
    "Thirumigu Kasi Vishwanathar Koil",
    "Sri Kalyanasundareswarar Swamy Temple",
    "Vaideeswaran Kovil",
    "Brihadisvara Temple",
    "Mahalingaswamy Temple"
]

headers = {"User-Agent": "HavenStayApp/1.0 (travel@havenstay.org)"}
for n in names:
    clean = clean_place_name(n)
    url = f"https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&pithumbsize=800&generator=search&gsrsearch={urllib.parse.quote(clean)}&gsrlimit=1"
    r = httpx.get(url, headers=headers, timeout=5)
    pages = r.json().get("query", {}).get("pages", {})
    img = None
    for _, p in pages.items():
        img = p.get("thumbnail", {}).get("source")
    print(f"'{n}' -> '{clean}': {img}")

import httpx
import re

def get_google_image(query: str):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    url = f"https://www.google.com/search?q={query}&tbm=isch&asearch=ichunk&async=_id:rg_s,_pms:s,_fmt:pc"
    try:
        r = httpx.get(url, headers=headers, timeout=5, follow_redirects=True)
        print("Status:", r.status_code)
        # Look for encrypted-tbn0.gstatic.com or direct image sources
        urls = re.findall(r'https://encrypted-tbn0\.gstatic\.com/images\?q=tbn:[a-zA-Z0-9_\-]+', r.text)
        if urls:
            return urls[0]
        # Also check regular google search images
        r2 = httpx.get(f"https://www.google.com/search?q={query}&tbm=isch", headers=headers, timeout=5, follow_redirects=True)
        urls2 = re.findall(r'https://encrypted-tbn0\.gstatic\.com/images\?q=tbn:[a-zA-Z0-9_\-]+', r2.text)
        if urls2:
            return urls2[0]
    except Exception as e:
        print("Error:", e)
    return None

def get_wikimedia_image(query: str):
    headers = {"User-Agent": "HavenStayApp/1.0 (contact@havenstay.org)"}
    try:
        # 1. Search Wikipedia page
        url = f"https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&pithumbsize=800&generator=search&gsrsearch={query}&gsrlimit=1"
        r = httpx.get(url, headers=headers, timeout=5)
        data = r.json()
        pages = data.get("query", {}).get("pages", {})
        for _, page in pages.items():
            thumb = page.get("thumbnail", {}).get("source")
            if thumb:
                return thumb
    except Exception as e:
        print("Wiki error:", e)
    return None

if __name__ == "__main__":
    for place in ["Brihadeeswarar Temple", "Kapaleeshwarar Temple", "Eiffel Tower", "Statue of Liberty"]:
        g_img = get_google_image(place)
        w_img = get_wikimedia_image(place)
        print(f"Place: {place}")
        print(f"  Google: {g_img}")
        print(f"  Wiki: {w_img}")

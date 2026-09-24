import httpx
import re
from urllib.parse import quote_plus

def test_google_images(query):
    # Google Images search query
    url = f"https://www.google.com/search?q={quote_plus(query)}&tbm=isch"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
    }
    r = httpx.get(url, headers=headers, follow_redirects=True, timeout=10)
    print("Google Status:", r.status_code)
    
    # In Google Images HTML, thumbnails are embedded or linked as encrypted-tbn0.gstatic.com/images?q=tbn:...
    # Or in AF_initDataCallback
    gstatic_matches = re.findall(r'(https://encrypted-tbn0\.gstatic\.com/images\?q=tbn:[^"\'\s&;]+)', r.text)
    print("Found gstatic thumbnails:", len(gstatic_matches))
    if gstatic_matches:
        print("First gstatic:", gstatic_matches[0])
        return gstatic_matches[0]
        
    # Also check for direct img urls inside AF_initDataCallback
    img_urls = re.findall(r'\[\"(https://[^\"]+?\.(?:jpg|jpeg|png))\",\s*\d+,\s*\d+\]', r.text)
    print("Found high-res urls:", len(img_urls))
    if img_urls:
        print("First high-res:", img_urls[0])
        return img_urls[0]
        
    return None

if __name__ == "__main__":
    for q in ["Brihadeeswarar Temple Thanjavur", "Kapaleeshwarar Temple Chennai", "St Patricks Cathedral New York"]:
        res = test_google_images(q)
        print(f"Result for {q}: {res}\n")

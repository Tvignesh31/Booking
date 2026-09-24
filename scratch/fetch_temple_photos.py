import httpx

temples = [
    "Mahalingaswamy Temple, Thiruvidaimaruthur",
    "Airavatesvara Temple",
    "Adi Kumbeswarar Temple",
    "Sarangapani Temple",
    "Brihadisvara Temple",
    "Kapaleeshwarar Temple",
    "Swamimalai Murugan Temple",
    "Uppiliappan Temple",
    "Ramaswamy Temple, Kumbakonam",
    "Nageswaran Temple, Kumbakonam",
    "Meenakshi Temple",
    "Ranganathaswamy Temple, Srirangam"
]

headers = {"User-Agent": "HavenStayApp/1.0 (travel@havenstay.org)"}
results = {}

for name in temples:
    url = f"https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&pithumbsize=1000&generator=search&gsrsearch={name}&gsrlimit=1"
    try:
        r = httpx.get(url, headers=headers, timeout=5)
        pages = r.json().get("query", {}).get("pages", {})
        for _, p in pages.items():
            thumb = p.get("thumbnail", {}).get("source")
            if thumb:
                results[name] = thumb
                print(f"'{name}': '{thumb}'")
    except Exception as e:
        print(f"Error {name}: {e}")

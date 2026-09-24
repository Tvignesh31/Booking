import re
with open("scratch/google_resp.html", "r", encoding="utf-8") as f:
    text = f.read()
for m in re.finditer(r'(https://[^\s"\'<>]+\.(?:jpg|jpeg|png|webp))', text):
    print("Direct img:", m.group(1)[:120])
for m in re.finditer(r'(https://encrypted-tbn[^\s"\'<>&]+)', text):
    print("Encrypted:", m.group(1)[:120])

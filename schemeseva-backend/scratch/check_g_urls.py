import json
import re
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent

def search_json(filename):
    filepath = backend_dir / "data" / filename
    if not filepath.exists():
        print(f"{filename} does not exist")
        return
    print(f"Searching {filename}...")
    with open(filepath, encoding="utf-8") as f:
        content = f.read()
    matches = set(re.findall(r'https?://[^\s"\'<>]+\.g\b[^\s"\'<>]*', content))
    print(f"Found {len(matches)} matches in {filename}:", matches)

search_json("myscheme_complete.json")
search_json("myscheme_cleaned.json")

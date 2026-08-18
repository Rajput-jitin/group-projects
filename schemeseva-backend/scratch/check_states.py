import sqlite3, json

conn = sqlite3.connect("schemeseva.db")

# Check what state info exists in details_json
rows = conn.execute("""
    SELECT name, ministry, details_json 
    FROM schemes 
    WHERE ministry LIKE '%Gujarat%' OR ministry LIKE '%Himachal%' OR name LIKE '%Gujarat%'
    LIMIT 10
""").fetchall()

print("=== Schemes with Gujarat/Himachal in ministry or name ===")
for r in rows:
    dj = json.loads(r[2]) if r[2] else {}
    level = dj.get("level", "?")
    print(f"  {r[0]}")
    print(f"    ministry: {r[1]}")
    print(f"    level: {level}")
    print()

# Check how many schemes have level info in details_json
rows2 = conn.execute("SELECT details_json FROM schemes WHERE details_json IS NOT NULL LIMIT 200").fetchall()
level_count = 0
state_names = set()
for r in rows2:
    dj = json.loads(r[0]) if r[0] else {}
    lvl = dj.get("level", {})
    if isinstance(lvl, dict) and lvl.get("value") == "state":
        level_count += 1

print(f"\n=== Out of first 200 schemes, {level_count} are state-level ===")

# Check if state name is embedded in ministry field
rows3 = conn.execute("""
    SELECT DISTINCT ministry FROM schemes 
    WHERE ministry LIKE '%Gujarat%' OR ministry LIKE '%Rajasthan%' 
    OR ministry LIKE '%Uttarakhand%' OR ministry LIKE '%Maharashtra%'
    OR ministry LIKE '%Himachal%' OR ministry LIKE '%Bihar%'
    OR ministry LIKE '%Kerala%' OR ministry LIKE '%Tamil Nadu%'
    LIMIT 20
""").fetchall()
print("\n=== Ministries with state names ===")
for r in rows3:
    print(f"  {r[0]}")

# Check the API response for state=Gujarat
print("\n=== Testing API with state=Gujarat ===")
import urllib.request
try:
    resp = urllib.request.urlopen("http://127.0.0.1:8000/api/schemes?state=Gujarat&page_size=3")
    data = json.loads(resp.read())
    print(f"Total returned: {data['total']}")
    for item in data["items"][:3]:
        print(f"  {item['name']} | {item['ministry']} | states={item.get('eligible_states')}")
except Exception as e:
    print(f"Error: {e}")

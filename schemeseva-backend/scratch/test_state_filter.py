import urllib.request, json

for state in ["Gujarat", "Himachal Pradesh", "Uttarakhand"]:
    url = f"http://127.0.0.1:8000/api/schemes?state={state.replace(' ', '+')}&page_size=5"
    resp = urllib.request.urlopen(url)
    data = json.loads(resp.read())
    print(f"=== {state}: {data['total']} schemes ===")
    for i in data["items"][:5]:
        print(f"  {i['name'][:70]} | {i['ministry']}")
    print()

# Also test All States (no state param)
resp2 = urllib.request.urlopen("http://127.0.0.1:8000/api/schemes?page_size=3")
data2 = json.loads(resp2.read())
print(f"=== No state filter: {data2['total']} schemes ===")

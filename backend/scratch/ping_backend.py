import requests
try:
    res = requests.get("http://127.0.0.1:8000/", timeout=5)
    print(f"Status: {res.status_code}")
    print(f"Response: {res.json()}")
except Exception as e:
    print(f"Error: {e}")

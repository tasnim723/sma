import requests
try:
    data = {"username": "manager@project.com", "password": "password"} # Assuming 'password' is the default if not changed
    res = requests.post("http://127.0.0.1:8000/api/auth/login", data=data, timeout=5)
    print(f"Status: {res.status_code}")
    print(f"Response: {res.json()}")
except Exception as e:
    print(f"Error: {e}")

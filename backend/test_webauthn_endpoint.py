import requests

try:
    response = requests.post("http://127.0.0.1:8000/api/webauthn/login/options", json={"email": "test@example.com"})
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")

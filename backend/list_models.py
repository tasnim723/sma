import os
import requests

api_key = os.getenv("GROQ_API_KEY") 
url = "https://api.groq.com/openai/v1/models"
headers = {"Authorization": f"Bearer {api_key}"}

try:
    response = requests.get(url, headers=headers)
    data = response.json()
    if "data" in data:
        for m in data["data"]:
            print(m["id"])
    else:
        print(f"No models found. Response: {data}")
except Exception as e:
    print(f"Error: {e}")

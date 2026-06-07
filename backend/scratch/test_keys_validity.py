import os
import requests
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

def test_groq():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("GROQ_API_KEY not found in .env")
        return
    print(f"Testing Groq key: {api_key[:10]}...")
    url = "https://api.groq.com/openai/v1/models"
    headers = {"Authorization": f"Bearer {api_key}"}
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            print("Groq key is VALID!")
        else:
            print(f"Groq key is INVALID (Status: {response.status_code}, Response: {response.text})")
    except Exception as e:
        print(f"Groq test failed: {e}")

def test_openai():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("OPENAI_API_KEY not found in .env")
        return
    print(f"Testing OpenAI key: {api_key[:10]}...")
    url = "https://api.openai.com/v1/models"
    headers = {"Authorization": f"Bearer {api_key}"}
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            print("OpenAI key is VALID!")
        else:
            print(f"OpenAI key is INVALID (Status: {response.status_code}, Response: {response.text})")
    except Exception as e:
        print(f"OpenAI test failed: {e}")

def test_gemini():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("GOOGLE_API_KEY not found in .env")
    else:
        print(f"Testing Gemini key (from .env): {api_key[:10]}...")
        genai.configure(api_key=api_key)
        try:
            genai.list_models()
            print("Gemini key (from .env) is VALID!")
        except Exception as e:
            print(f"Gemini key (from .env) is INVALID: {e}")

    # Also test the one from list_gemini.py if it's different
    hardcoded_key = "AIzaSyBxfH9d6hE-Ui4KiAoB94u4uVQY_XOsiFY"
    if hardcoded_key != api_key:
        print(f"Testing hardcoded Gemini key: {hardcoded_key[:10]}...")
        genai.configure(api_key=hardcoded_key)
        try:
            genai.list_models()
            print("Hardcoded Gemini key is VALID!")
        except Exception as e:
            print(f"Hardcoded Gemini key is INVALID: {e}")

if __name__ == "__main__":
    test_groq()
    test_openai()
    test_gemini()

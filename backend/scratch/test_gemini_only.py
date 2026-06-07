import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

async def test():
    import google.generativeai as genai
    api_key = os.getenv("GOOGLE_API_KEY") or "AIzaSyBxfH9d6hE-Ui4KiAoB94u4uVQY_XOsiFY"
    print(f"Using API Key: {api_key[:10]}...")
    genai.configure(api_key=api_key)
    
    # Let's list models to see if it works
    try:
        models = genai.list_models()
        print("Models listed successfully:")
        for m in models:
            if "gemini" in m.name:
                print(m.name)
    except Exception as e:
        print(f"Error listing models: {e}")
        return

    # Let's try calling generate_content
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content("Hello! Respond in French.")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error calling Gemini: {e}")

if __name__ == "__main__":
    asyncio.run(test())

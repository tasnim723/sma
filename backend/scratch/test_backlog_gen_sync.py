import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

def test_sync():
    import google.generativeai as genai
    api_key = os.getenv("GOOGLE_API_KEY")
    print(f"Using API Key: {api_key[:10]}...")
    genai.configure(api_key=api_key, transport="rest")

    model_names = ["gemini-2.5-flash", "gemini-3.1-flash", "gemini-1.5-flash"]
    system_prompt = "Tu es un expert en gestion de projet agile. Réponds uniquement en JSON valide."
    user_prompt = "Génère un tableau JSON simple avec 1 tâche pour un site web."

    for mname in model_names:
        print(f"\nTrying model: {mname}...")
        try:
            model = genai.GenerativeModel(
                model_name=mname,
                system_instruction=system_prompt
            )
            response = model.generate_content(
                user_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.3,
                    response_mime_type="application/json"
                )
            )
            print(f"SUCCESS with {mname}!")
            print(f"Response: {response.text}")
            return
        except Exception as e:
            print(f"FAILED with {mname}: {e}")

if __name__ == "__main__":
    test_sync()

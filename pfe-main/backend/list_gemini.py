import os
import google.generativeai as genai

api_key = "AIzaSyBxfH9d6hE-Ui4KiAoB94u4uVQY_XOsiFY"
genai.configure(api_key=api_key)

try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    print(f"Error: {e}")

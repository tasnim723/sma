import os
import random

def get_rotated_groq_key() -> str:
    """
    Returns a Groq API key from the pool defined in GROQ_API_KEYS.
    Falls back to GROQ_API_KEY or OPENAI_API_KEY if needed.
    """
    # 1. Try multi-key pool
    keys_str = os.getenv("GROQ_API_KEYS", "")
    if keys_str:
        keys = [k.strip() for k in keys_str.split(",") if k.strip()]
        if keys:
            return random.choice(keys)
            
    # 2. Fallback to single key
    single_key = os.getenv("GROQ_API_KEY")
    if single_key:
        return single_key
        
    # 3. Last resort fallback to OpenAI
    return os.getenv("OPENAI_API_KEY", "")

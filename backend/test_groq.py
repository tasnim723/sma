import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
import asyncio

load_dotenv()

async def main():
    api_key = os.getenv("GROQ_API_KEY")
    print(f"Key: {api_key}")
    llm = ChatOpenAI(
        temperature=0, 
        model="llama-3.1-8b-instant",
        max_tokens=4096,
        base_url="https://api.groq.com/openai/v1",
        api_key=api_key
    )
    try:
        res = await llm.ainvoke([HumanMessage(content="Hello")])
        print("Success:", res.content)
    except Exception as e:
        print("Error type:", type(e))
        print("Error details:", str(e))

asyncio.run(main())

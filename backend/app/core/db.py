import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(override=True)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "project_manager_db")

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

def get_database():
    return db

from pymongo import MongoClient
import os
from dotenv import load_dotenv
from bson import ObjectId

load_dotenv("backend/.env")
mongo_uri = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
db_name = os.getenv("DB_NAME", "project_manager_db")

client = MongoClient(mongo_uri)
db = client[db_name]

latest_session = db.brainstorming_sessions.find_one(sort=[("created_at", -1)])
if latest_session:
    print(f"ID: {latest_session['_id']}")
    print(f"Topic: {latest_session['topic']}")
    print(f"Status: {latest_session['status']}")
    print(f"Messages count: {len(latest_session.get('messages', []))}")
    if latest_session.get('messages'):
        last_msg = latest_session['messages'][-1]
        print(f"Last message agent: {last_msg['agent_name']}")
        print(f"Last message phase: {last_msg['phase']}")
    print(f"Top Ideas: {latest_session.get('top_ideas')}")
else:
    print("No session found")

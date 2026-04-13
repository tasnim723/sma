import os
from dotenv import load_dotenv
from twilio.rest import Client

load_dotenv()

def debug_twilio():
    sid = os.getenv("TWILIO_ACCOUNT_SID")
    token = os.getenv("TWILIO_AUTH_TOKEN")
    
    print(f"DEBUG: Checking Twilio Account for SID: {sid}")
    
    try:
        client = Client(sid, token)
        
        # 1. Try to fetch account info
        account = client.api.v2010.accounts(sid).fetch()
        print(f"SUCCESS: Account status is '{account.status}'")
        
        # 2. List Incoming Phone Numbers
        print("\n--- LISTING OWNED PHONE NUMBERS ---")
        numbers = client.incoming_phone_numbers.list(limit=5)
        if not numbers:
            print("No personal phone numbers found (Trial account?)")
        for nr in numbers:
            print(f"- {nr.phone_number} (SID: {nr.sid})")
            
        # 3. List messages to see if any were sent successfully
        print("\n--- CHECKING MESSAGE LOGS ---")
        msgs = client.messages.list(limit=5)
        for m in msgs:
            print(f"- to: {m.to} | from: {m.from_} | status: {m.status}")

    except Exception as e:
        print(f"\n❌ TWILIO ERROR: {str(e)}")

if __name__ == "__main__":
    debug_twilio()

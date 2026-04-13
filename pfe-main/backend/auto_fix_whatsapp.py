import os
from dotenv import load_dotenv
from twilio.rest import Client
import traceback

load_dotenv()

def find_working_solution():
    sid = os.getenv("TWILIO_ACCOUNT_SID")
    token = os.getenv("TWILIO_AUTH_TOKEN")
    to_nr = "+21629138467" # The target the user asked for
    
    # Try multiple 'From' formats
    from_attempts = [
        "whatsapp:+14155238886",
        "+14155238886",
        "+21629138467", # In case it's a personal verified sender
    ]
    
    print(f"--- AUTO-FIX ATTEMPT ---")
    client = Client(sid, token)
    
    for sender in from_attempts:
        print(f"\nTrying SENDER: {sender}")
        try:
            msg = client.messages.create(
                body="[SMA AUTO-FIX SUCCESS] Si vous voyez ce message, votre WhatsApp est enfin valide!",
                from_=sender,
                to=f"whatsapp:{to_nr}" if not to_nr.startswith("whatsapp:") else to_nr
            )
            print(f"SUCCESS! SENDER: {sender} | Msg SID: {msg.sid}")
            return sender # We found the winner
        except Exception as e:
            print(f"FAILED for {sender}: {str(e)}")

    print("\n--- ALTERNATIVE SOLUTION ---")
    print("If Twilio Sandbox is too restrictive, I recommend 'CallMeBot'.")
    print("It only requires an API Key that you obtain by sending a WhatsApp.")

if __name__ == "__main__":
    find_working_solution()

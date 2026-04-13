import asyncio
import os
from dotenv import load_dotenv
from app.services.notification_service import send_email_async, send_whatsapp_async

# Load credentials from .env
load_dotenv()

async def run_final_test():
    email_target = "hajritasnim7@gmail.com"
    whatsapp_target = "+21629138467"
    
    print(f"--- GLOBAL TEST START ---")
    print(f"Email Target: {email_target}")
    print(f"WhatsApp Target: {whatsapp_target}")
    
    test_msg = (
        "[SMA TEST GLOBAL]\n\n"
        "Félicitations ! Votre robot AI Orchestrator est maintenant branché à vos comptes Gmail et Twilio.\n\n"
        "Ceci est un message de confirmation envoyé automatiquement."
    )
    
    # 1. Send Email
    email_success = await send_email_async(
        to_email=email_target,
        subject="SMA System Test: Successful Configuration!",
        body=test_msg.replace("*", "") # Remove markdown for plain text email
    )
    
    # 2. Send WhatsApp
    whatsapp_success = await send_whatsapp_async(
        to_phone=whatsapp_target,
        body=test_msg
    )
    
    print("\n--- FINAL RESULTS ---")
    print(f"EMAIL: {'SUCCESS (Check Inbox)' if email_success else 'FAILED'}")
    print(f"WHATSAPP: {'SUCCESS' if whatsapp_success else 'FAILED (Check Twilio credentials or Sandbox connection)'}")

if __name__ == "__main__":
    asyncio.run(run_final_test())

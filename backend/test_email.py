import asyncio
import os
from dotenv import load_dotenv
from app.services.notification_service import send_email_async

# Force load latest .env
load_dotenv()

async def main():
    recipient = os.getenv("SMTP_USER")
    print(f"--- EMAIL TEST INITIATED ---")
    print(f"Using SMTP_USER: {recipient}")
    print(f"Using SMTP_SERVER: {os.getenv('SMTP_SERVER', 'smtp.gmail.com')}")
    
    if not recipient:
        print("ERROR: No recipient found in .env")
        return

    success = await send_email_async(
        to_email=recipient,
        subject="🚀 SMA Test: Email Notification Working!",
        body="Félicitations ! Votre système de notification SMA est maintenant opérationnel.\n\nVous recevrez désormais les alertes de projet par email et WhatsApp."
    )
    
    if success:
        print("\n✅ SUCCESS: Test email sent! Check your inbox (or spam).")
    else:
        print("\n❌ FAILED: Check your credentials or network settings.")

if __name__ == "__main__":
    asyncio.run(main())

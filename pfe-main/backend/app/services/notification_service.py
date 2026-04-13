import os
import smtplib
import httpx
from email.mime.text import MIMEText
import asyncio
from typing import Optional
from app.core.db import get_database
from bson import ObjectId

# Twilio (WhatsApp) - Fallback
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")

# CallMeBot (WhatsApp Simple) - Recommended for FREE usage
CALLMEBOT_API_KEY = os.getenv("CALLMEBOT_API_KEY")

# SMTP (Email)
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")

async def send_email_async(to_email: str, subject: str, body: str):
    """Sends an email using SMTP."""
    if not SMTP_USER or not SMTP_PASS:
        print(f"DEBUG: Email NOT sent (No credentials). To: {to_email}")
        return False
        
    try:
        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = SMTP_USER
        msg['To'] = to_email

        loop = asyncio.get_event_loop()
        def _send():
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
                server.send_message(msg)
        
        await loop.run_in_executor(None, _send)
        print(f"SUCCESS: Email sent to {to_email}")
        return True
    except Exception as e:
        print(f"ERROR: Email fail to {to_email}: {str(e)}")
        return False

async def send_whatsapp_callmebot(to_phone: str, body: str):
    """Sends WhatsApp via CallMeBot (Zero Sandbox restrictions)."""
    if not CALLMEBOT_API_KEY:
        return False
        
    try:
        # Format phone: remove + if present
        clean_phone = to_phone.replace("+", "").replace(" ", "")
        url = f"https://api.callmebot.com/whatsapp.php?phone={clean_phone}&text={body}&apikey={CALLMEBOT_API_KEY}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            if response.status_code == 200:
                print(f"SUCCESS: WhatsApp (CallMeBot) sent to {to_phone}")
                return True
            else:
                print(f"ERROR: CallMeBot returned status {response.status_code}")
                return False
    except Exception as e:
        print(f"ERROR: CallMeBot fail: {str(e)}")
        return False

async def send_whatsapp_twilio(to_phone: str, body: str):
    """Sends a WhatsApp message via Twilio."""
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        return False
        
    try:
        from twilio.rest import Client
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        
        formatted_phone = to_phone if to_phone.startswith("whatsapp:") else f"whatsapp:{to_phone}"
            
        loop = asyncio.get_event_loop()
        def _send():
            client.messages.create(
                from_=TWILIO_WHATSAPP_FROM,
                body=body,
                to=formatted_phone
            )
        
        await loop.run_in_executor(None, _send)
        print(f"SUCCESS: WhatsApp (Twilio) sent to {to_phone}")
        return True
    except Exception as e:
        print(f"ERROR: WhatsApp (Twilio) fail: {str(e)}")
        return False

async def orchestrate_multi_channel_notification(user_id: str, message: str):
    """Fetches user contact info and sends notification across all active channels."""
    db = get_database()
    
    try:
        query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"full_name": user_id}
        user = await db["users"].find_one(query)
        
        if not user:
            print(f"ERROR: Notification failed. User {user_id} not found.")
            return

        email = user.get("email")
        phone = user.get("phone_number")
        
        tasks = []
        
        if email:
            tasks.append(send_email_async(email, "SMA Notification: New Update", message))
            
        if phone:
            # TRY CALLMEBOT FIRST (No Sandbox)
            if CALLMEBOT_API_KEY:
                tasks.append(send_whatsapp_callmebot(phone, message))
            # FALLBACK TO TWILIO
            elif TWILIO_ACCOUNT_SID:
                tasks.append(send_whatsapp_twilio(phone, f"[*SMA Notification*]\n\n{message}"))
            
        if tasks:
            await asyncio.gather(*tasks)
            
    except Exception as e:
        print(f"ERROR: Orchestration failure: {str(e)}")

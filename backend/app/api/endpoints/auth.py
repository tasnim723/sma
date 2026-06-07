import os
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, status, Depends  # type: ignore
from fastapi.security import OAuth2PasswordRequestForm  # type: ignore
from app.core.auth import verify_password, create_access_token, get_password_hash
from app.core.db import get_database
from app.models.user import UserCreate, UserResponse, GoogleLoginRequest
from app.services.email_service import send_approval_email, send_rejection_email
from bson import ObjectId  # type: ignore
from google.oauth2 import id_token  # type: ignore
from google.auth.transport import requests as google_requests  # type: ignore

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

router = APIRouter()


# ─── Helper: push notification into alerts collection ─────────────────────────
async def push_notification(db, user_id: str, title: str, message: str, urgency: str = "LOW"):
    """Insert a notification into the alerts collection for a given user."""
    try:
        await db["alerts"].insert_one({
            "user_id": user_id,
            "title": title,
            "message": message,
            "urgency": urgency,
            "is_read": False,
            "created_at": datetime.utcnow()
        })
    except Exception as e:
        print(f"[NOTIF ERROR] {e}")


async def notify_all_managers(db, title: str, message: str, urgency: str = "LOW"):
    """Push notification to every PROJECT_MANAGER in the system."""
    managers = await db["users"].find({"role": "PROJECT_MANAGER", "status": "ACTIVE"}).to_list(50)
    for mgr in managers:
        await push_notification(db, str(mgr["_id"]), title, message, urgency)


# ─── REGISTER (creates PENDING user, no auto-login) ───────────────────────────
@router.post("/register")
async def register(user: UserCreate):
    db = get_database()
    existing = await db["users"].find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_dict = user.model_dump()
    hashed_pass = get_password_hash(user_dict.pop("password"))
    user_dict["hashed_password"] = hashed_pass
    user_dict["created_at"] = datetime.utcnow()
    user_dict["status"] = "PENDING"          # <-- PENDING until manager approves
    user_dict["confirm_token"] = None
    user_dict["confirm_token_expires"] = None

    result = await db["users"].insert_one(user_dict)

    # 🔔 Notify all managers about the new registration
    await notify_all_managers(
        db,
        title=f"🆕 Nouvelle demande de compte",
        message=f"{user_dict['full_name']} ({user_dict['email']}) a demandé l'accès à la plateforme. Rendez-vous dans Équipe > Demandes en attente pour valider.",
        urgency="ORANGE"
    )

    return {
        "message": "Registration submitted. Awaiting manager approval.",
        "user_id": str(result.inserted_id),
        "status": "PENDING"
    }


# ─── LOGIN (blocks PENDING users) ─────────────────────────────────────────────
@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = get_database()
    user = await db["users"].find_one({"email": form_data.username})

    if not user or not verify_password(form_data.password, user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants invalides",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_status = user.get("status", "ACTIVE")
    if user_status == "PENDING":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="PENDING: Your account is awaiting manager approval."
        )
    if user_status == "REJECTED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="REJECTED: Your account request was rejected."
        )

    access_token = create_access_token(data={"sub": str(user["_id"])})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user["role"],
        "user_id": str(user["_id"]),
        "full_name": user.get("full_name", ""),
        "email": user.get("email", ""),
        "gender": user.get("gender", ""),
        "avatar_url": user.get("avatar_url", "")
    }


# ─── LIST PENDING USERS (manager only) ────────────────────────────────────────
@router.get("/pending-users")
async def get_pending_users(token: str):
    """Get all users with PENDING status. Protected by token check."""
    from jose import jwt, JWTError
    SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey_for_development_change_in_prod")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_database()
    caller = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not caller or caller.get("role") not in ["PROJECT_MANAGER"]:
        raise HTTPException(status_code=403, detail="Manager access required")

    pending = await db["users"].find({"status": "PENDING"}).to_list(100)
    result = []
    for u in pending:
        result.append({
            "id": str(u["_id"]),
            "full_name": u.get("full_name", ""),
            "email": u.get("email", ""),
            "role": u.get("role", ""),
            "position": u.get("position", ""),
            "skills": u.get("skills", []),
            "created_at": u.get("created_at", datetime.utcnow()).isoformat(),
        })
    return result


# ─── APPROVE USER (manager only) ──────────────────────────────────────────────
@router.post("/approve/{user_id}")
async def approve_user(user_id: str, token: str):
    from jose import jwt, JWTError
    SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey_for_development_change_in_prod")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        caller_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_database()
    caller = await db["users"].find_one({"_id": ObjectId(caller_id)})
    if not caller or caller.get("role") != "PROJECT_MANAGER":
        raise HTTPException(status_code=403, detail="Manager access required")

    target = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.get("status") != "PENDING":
        raise HTTPException(status_code=400, detail="User is not in PENDING state")

    # Generate secure confirmation token (valid 24h)
    confirm_token = secrets.token_urlsafe(48)
    expires_at = datetime.utcnow() + timedelta(hours=24)

    await db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "status": "APPROVED",           # approved but not yet confirmed
            "confirm_token": confirm_token,
            "confirm_token_expires": expires_at
        }}
    )

    # Send email with confirmation link
    sent = send_approval_email(
        to_email=target["email"],
        full_name=target.get("full_name", "Utilisateur"),
        confirm_token=confirm_token
    )

    # 🔔 Notify the manager who approved (REMOVED - Redundant)
    # await push_notification(
    #     db,
    #     user_id=str(caller["_id"]),
    #     title=f"✅ Compte approuvé",
    #     message=f"Vous avez approuvé le compte de {target.get('full_name', target['email'])}. Un email de confirmation lui a été envoyé.",
    #     urgency="LOW"
    # )


    return {
        "message": f"User {target['email']} approved. Email {'sent' if sent else 'failed to send'}.",
        "email_sent": sent,
        "confirm_link": f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/confirm?token={confirm_token}"
    }


# ─── REJECT USER (manager only) ───────────────────────────────────────────────
@router.post("/reject/{user_id}")
async def reject_user(user_id: str, token: str):
    from jose import jwt, JWTError
    SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey_for_development_change_in_prod")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        caller_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_database()
    caller = await db["users"].find_one({"_id": ObjectId(caller_id)})
    if not caller or caller.get("role") != "PROJECT_MANAGER":
        raise HTTPException(status_code=403, detail="Manager access required")

    target = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    await db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"status": "REJECTED"}}
    )

    send_rejection_email(
        to_email=target["email"],
        full_name=target.get("full_name", "Utilisateur")
    )

    # 🔔 Notify the manager who rejected (REMOVED - Redundant)
    # await push_notification(
    #     db,
    #     user_id=str(caller["_id"]),
    #     title=f"❌ Compte refusé",
    #     message=f"Vous avez refusé la demande de {target.get('full_name', target['email'])} ({target['email']}).",
    #     urgency="LOW"
    # )


    return {"message": f"User {target['email']} rejected."}


# ─── CONFIRM ACCOUNT (user clicks email link) ─────────────────────────────────
@router.get("/confirm/{token}")
async def confirm_account(token: str):
    db = get_database()
    user = await db["users"].find_one({"confirm_token": token})

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired confirmation link")

    if user.get("status") == "ACTIVE":
        raise HTTPException(status_code=400, detail="Account already activated")

    expires = user.get("confirm_token_expires")
    if expires and datetime.utcnow() > expires:
        raise HTTPException(status_code=400, detail="Confirmation link has expired")

    # Activate account
    await db["users"].update_one(
        {"_id": user["_id"]},
        {"$set": {
            "status": "ACTIVE",
            "confirm_token": None,
            "confirm_token_expires": None
        }}
    )

    # Return a login token so frontend can auto-login
    access_token = create_access_token(data={"sub": str(user["_id"])})
    return {
        "message": "Account activated successfully!",
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.get("role", "TEAM_MEMBER"),
        "user_id": str(user["_id"]),
        "full_name": user.get("full_name", ""),
        "email": user.get("email", ""),
        "gender": user.get("gender", ""),
        "avatar_url": user.get("avatar_url", "")
    }


# ─── RESEND CONFIRMATION EMAIL (manager only) ──────────────────────────────────
@router.post("/resend-confirmation/{user_id}")
async def resend_confirmation(user_id: str, token: str):
    """Resend the confirmation email to an APPROVED user using the token already in DB."""
    from jose import jwt, JWTError
    SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey_for_development_change_in_prod")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        caller_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_database()
    caller = await db["users"].find_one({"_id": ObjectId(caller_id)})
    if not caller or caller.get("role") != "PROJECT_MANAGER":
        raise HTTPException(status_code=403, detail="Manager access required")

    target = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.get("status") not in ["APPROVED", "PENDING"]:
        raise HTTPException(status_code=400, detail="User is already active or rejected")

    # Regenerate a fresh token
    confirm_token = secrets.token_urlsafe(48)
    expires_at = datetime.utcnow() + timedelta(hours=24)

    await db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "status": "APPROVED",
            "confirm_token": confirm_token,
            "confirm_token_expires": expires_at
        }}
    )

    sent = send_approval_email(
        to_email=target["email"],
        full_name=target.get("full_name", "Utilisateur"),
        confirm_token=confirm_token
    )

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    return {
        "message": f"Confirmation email {'sent' if sent else 'failed to send'}.",
        "email_sent": sent,
        "confirm_link": f"{frontend_url}/confirm?token={confirm_token}"
    }


@router.get("/status/{user_id}")
async def check_user_status(user_id: str):
    """
    Public endpoint to poll the status of a registration request.
    Returns the current status (PENDING, APPROVED, ACTIVE, REJECTED).
    Used by the registration page to update the steps in real time.
    """
    db = get_database()
    try:
        user = await db["users"].find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "user_id": user_id,
        "status": user.get("status", "PENDING"),
        "email": user.get("email", ""),
    }


# ─── GOOGLE LOGIN (unchanged) ─────────────────────────────────────────────────
@router.post("/google")
async def google_login(body: GoogleLoginRequest):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID not configured")

    try:
        idinfo = id_token.verify_oauth2_token(
            body.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")

    google_id = idinfo.get("sub")
    email = idinfo.get("email")
    full_name = idinfo.get("name", "")
    avatar_url = idinfo.get("picture", "")

    if not email:
        raise HTTPException(status_code=400, detail="Google email not available")

    db = get_database()
    existing_user = await db["users"].find_one({"email": email})

    if existing_user:
        if not existing_user.get("google_id"):
            await db["users"].update_one(
                {"_id": existing_user["_id"]},
                {"$set": {"google_id": google_id, "avatar_url": avatar_url, "auth_provider": "google"}}
            )
        access_token = create_access_token(data={"sub": str(existing_user["_id"])})
        return {
            "access_token": access_token, "token_type": "bearer",
            "role": existing_user["role"], "user_id": str(existing_user["_id"]),
            "full_name": existing_user.get("full_name", full_name),
            "email": email, "avatar_url": avatar_url, "is_new": False
        }
    else:
        new_user = {
            "email": email, "full_name": full_name, "google_id": google_id,
            "auth_provider": "google", "avatar_url": avatar_url,
            "hashed_password": "", "role": "TEAM_MEMBER",
            "phone_number": "", "position": "", "skills": [],
            "cv_url": "", "linkedin_url": "", "github_url": "",
            "status": "ACTIVE",  # Google users auto-approved
        }
        result = await db["users"].insert_one(new_user)
        access_token = create_access_token(data={"sub": str(result.inserted_id)})
        return {
            "access_token": access_token, "token_type": "bearer",
            "role": "TEAM_MEMBER", "user_id": str(result.inserted_id),
            "full_name": full_name, "email": email,
            "avatar_url": avatar_url, "is_new": True
        }

import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.core.auth import verify_password, create_access_token, get_password_hash
from app.core.db import get_database
from app.models.user import UserCreate, UserResponse, GoogleLoginRequest
from bson import ObjectId
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate):
    db = get_database()
    existing_user = await db["users"].find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    user_dict = user.model_dump()
    hashed_pass = get_password_hash(user_dict.pop("password"))
    user_dict["hashed_password"] = hashed_pass
    
    result = await db["users"].insert_one(user_dict)
    
    created_user = await db["users"].find_one({"_id": result.inserted_id})
    created_user["_id"] = str(created_user["_id"])
    
    return created_user

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = get_database()
    user = await db["users"].find_one({"email": form_data.username})
    
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(
        data={"sub": str(user["_id"])}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user["role"],
        "user_id": str(user["_id"]),
        "full_name": user.get("full_name", ""),
        "email": user.get("email", "")
    }

@router.post("/google")
async def google_login(body: GoogleLoginRequest):
    """
    Authentification via Google OAuth 2.0.
    - Cas 1 : Utilisateur existant → connexion directe
    - Cas 2 : Nouvel utilisateur → création du compte + flag is_new=True
    """
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GOOGLE_CLIENT_ID non configuré dans le backend."
        )

    # 1. Vérifier le token Google
    try:
        idinfo = id_token.verify_oauth2_token(
            body.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token Google invalide : {str(e)}"
        )

    # 2. Extraire les infos
    google_id = idinfo.get("sub")
    email = idinfo.get("email")
    full_name = idinfo.get("name", "")
    avatar_url = idinfo.get("picture", "")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email Google non disponible."
        )

    db = get_database()

    # 3. Chercher l'utilisateur existant
    existing_user = await db["users"].find_one({"email": email})

    if existing_user:
        # Cas 2 : Utilisateur existant → mise à jour du google_id si besoin
        if not existing_user.get("google_id"):
            await db["users"].update_one(
                {"_id": existing_user["_id"]},
                {"$set": {"google_id": google_id, "avatar_url": avatar_url, "auth_provider": "google"}}
            )
        access_token = create_access_token(data={"sub": str(existing_user["_id"])})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "role": existing_user["role"],
            "user_id": str(existing_user["_id"]),
            "full_name": existing_user.get("full_name", full_name),
            "email": email,
            "avatar_url": avatar_url,
            "is_new": False
        }
    else:
        # Cas 1 : Nouvel utilisateur → création du compte
        new_user = {
            "email": email,
            "full_name": full_name,
            "google_id": google_id,
            "auth_provider": "google",
            "avatar_url": avatar_url,
            "hashed_password": "",
            "role": "TEAM_MEMBER",
            "phone_number": "",
            "position": "",
            "skills": [],
            "cv_url": "",
            "linkedin_url": "",
            "github_url": "",
        }
        result = await db["users"].insert_one(new_user)
        access_token = create_access_token(data={"sub": str(result.inserted_id)})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "role": "TEAM_MEMBER",
            "user_id": str(result.inserted_id),
            "full_name": full_name,
            "email": email,
            "avatar_url": avatar_url,
            "is_new": True
        }

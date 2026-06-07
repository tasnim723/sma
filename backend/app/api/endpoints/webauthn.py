import os
import json
import base64
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from bson import ObjectId
from app.core.db import get_database
from app.core.auth import create_access_token
from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
)
from webauthn.helpers.structs import (
    AttestationConveyancePreference,
    AuthenticatorSelectionCriteria,
    UserVerificationRequirement,
    RegistrationCredential,
    AuthenticationCredential,
)
from webauthn.helpers import bytes_to_base64url, base64url_to_bytes

router = APIRouter()

RP_ID = os.getenv("RP_ID", "localhost")
RP_NAME = "NETINFO SMA"
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
# We'll use a helper to get the expected origin based on the request
def get_expected_origin(request: Request):
    origin = request.headers.get("Origin")
    if origin:
        return origin
    return FRONTEND_URL

# Store challenges temporarily (In a real app, use Redis or a specific collection with TTL)
challenges: Dict[str, str] = {}

def map_webauthn_keys(data: Any) -> Any:
    """Recursively convert camelCase keys to snake_case for WebAuthn library."""
    if isinstance(data, list):
        return [map_webauthn_keys(i) for i in data]
    if isinstance(data, dict):
        new_data = {}
        for k, v in data.items():
            # Map camelCase to snake_case for known fields
            new_key = k
            if k == "rawId": new_key = "raw_id"
            elif k == "clientDataJSON": new_key = "client_data_json"
            elif k == "attestationObject": new_key = "attestation_object"
            elif k == "authenticatorData": new_key = "authenticator_data"
            elif k == "userHandle": new_key = "user_handle"
            elif k == "signature": new_key = "signature"
            
            new_data[new_key] = map_webauthn_keys(v)
        return new_data
    return data

class WebAuthnRegistrationStartRequest(BaseModel):
    user_id: str

class WebAuthnAuthenticationStartRequest(BaseModel):
    email: str

@router.post("/register/options")
async def register_options(body: WebAuthnRegistrationStartRequest):
    db = get_database()
    user = await db["users"].find_one({"_id": ObjectId(body.user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    options = generate_registration_options(
        rp_id=RP_ID,
        rp_name=RP_NAME,
        user_id=body.user_id.encode(), # user_id must be bytes
        user_name=user["email"],
        user_display_name=user.get("full_name", user["email"]),
        attestation=AttestationConveyancePreference.NONE,
        authenticator_selection=AuthenticatorSelectionCriteria(
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
    )

    # Store challenge for later verification
    challenges[body.user_id] = options.challenge.hex()

    return json.loads(options_to_json(options))

@router.post("/register/verify")
async def register_verify(request: Request):
    body = await request.json()
    credential = body.get("credential")
    user_id = body.get("user_id")

    if not credential or not user_id:
        raise HTTPException(status_code=400, detail="Missing data")

    expected_challenge = challenges.get(user_id)
    if not expected_challenge:
        raise HTTPException(status_code=400, detail="Challenge not found or expired")

    try:
        # Map camelCase from frontend to snake_case for the library
        mapped_credential = map_webauthn_keys(credential)
        
        verification = verify_registration_response(
            credential=RegistrationCredential.parse_obj(mapped_credential),
            expected_challenge=bytes.fromhex(expected_challenge),
            expected_origin=get_expected_origin(request),
            expected_rp_id=RP_ID,
        )
    except Exception as e:
        print(f"WebAuthn Registration Verification Error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Verification failed: {str(e)}")

    # Store the new credential
    db = get_database()
    new_credential = {
        "credential_id": bytes_to_base64url(verification.credential_id),
        "public_key": bytes_to_base64url(verification.credential_public_key),
        "sign_count": verification.sign_count,
        "created_at": datetime.utcnow()
    }

    await db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$push": {"biometric_credentials": new_credential}}
    )

    # Remove challenge
    if user_id in challenges:
        del challenges[user_id]

    return {"status": "ok"}

@router.post("/login/options")
async def login_options(body: WebAuthnAuthenticationStartRequest):
    db = get_database()
    user = await db["users"].find_one({"email": body.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.get("biometric_credentials"):
        raise HTTPException(status_code=404, detail="FACE_ID_NOT_CONFIGURED")

    user_status = user.get("status", "ACTIVE")
    if user_status == "PENDING":
        raise HTTPException(status_code=403, detail="PENDING: Your account is awaiting manager approval.")
    if user_status == "REJECTED":
        raise HTTPException(status_code=403, detail="REJECTED: Your account request was rejected.")

    allow_credentials = []
    for cred in user["biometric_credentials"]:
        allow_credentials.append({
            "id": cred["credential_id"],
            "type": "public-key",
        })

    options = generate_authentication_options(
        rp_id=RP_ID,
        allow_credentials=allow_credentials,
        user_verification=UserVerificationRequirement.PREFERRED,
    )

    # Store challenge for later verification (using email as key)
    challenges[body.email] = options.challenge.hex()

    return json.loads(options_to_json(options))

@router.post("/login/verify")
async def login_verify(request: Request):
    body = await request.json()
    credential = body.get("credential")
    email = body.get("email")

    if not credential or not email:
        raise HTTPException(status_code=400, detail="Missing data")

    db = get_database()
    user = await db["users"].find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_status = user.get("status", "ACTIVE")
    if user_status == "PENDING":
        raise HTTPException(status_code=403, detail="PENDING: Your account is awaiting manager approval.")
    if user_status == "REJECTED":
        raise HTTPException(status_code=403, detail="REJECTED: Your account request was rejected.")

    expected_challenge = challenges.get(email)
    if not expected_challenge:
        raise HTTPException(status_code=400, detail="Challenge not found or expired")

    # Find the corresponding stored credential
    credential_id = credential.get("id")
    stored_credential = None
    for cred in user.get("biometric_credentials", []):
        if cred["credential_id"] == credential_id:
            stored_credential = cred
            break

    if not stored_credential:
        raise HTTPException(status_code=400, detail="Credential ID not recognized")

    try:
        # Map camelCase from frontend to snake_case for the library
        mapped_credential = map_webauthn_keys(credential)

        verification = verify_authentication_response(
            credential=AuthenticationCredential.parse_obj(mapped_credential),
            expected_challenge=bytes.fromhex(expected_challenge),
            expected_origin=get_expected_origin(request),
            expected_rp_id=RP_ID,
            credential_public_key=base64url_to_bytes(stored_credential["public_key"]),
            credential_current_sign_count=stored_credential["sign_count"],
        )
    except Exception as e:
        print(f"WebAuthn Login Verification Error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Verification failed: {str(e)}")

    # Update sign count
    await db["users"].update_one(
        {"_id": user["_id"], "biometric_credentials.credential_id": credential_id},
        {"$set": {"biometric_credentials.$.sign_count": verification.new_sign_count}}
    )

    # Remove challenge
    del challenges[email]

    # Issue JWT
    access_token = create_access_token(data={"sub": str(user["_id"])})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user["role"],
        "user_id": str(user["_id"]),
        "full_name": user.get("full_name", ""),
        "email": user.get("email", "")
    }

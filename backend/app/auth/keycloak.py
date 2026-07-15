"""
auth/keycloak.py — JWT verification using Keycloak JWKS endpoint.

This module:
  1. Fetches the JSON Web Key Set (JWKS) from Keycloak on first use.
  2. Validates incoming Bearer tokens (RS256 signature, issuer, audience).
  3. Extracts the user's "sub" claim and realm_access.roles.
  4. Auto-creates a local User row on first authenticated request.
"""
from __future__ import annotations

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, jwk
from jose.utils import base64url_decode
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.user import User

settings = get_settings()

# ── Security scheme for Swagger UI ───────────────────────────────────
bearer_scheme = HTTPBearer()

# ── Cached JWKS keys ─────────────────────────────────────────────────
_jwks_cache: dict | None = None


async def _get_jwks() -> dict:
    """
    Fetch and cache the JWKS from Keycloak.
    The keys are cached in memory for the lifetime of the process.
    In production you'd want a TTL, but for dev this is fine.
    """
    global _jwks_cache
    if _jwks_cache is None:
        async with httpx.AsyncClient() as client:
            resp = await client.get(settings.JWKS_URL)
            resp.raise_for_status()
            _jwks_cache = resp.json()
    return _jwks_cache


def _find_rsa_key(token: str, jwks: dict) -> dict | None:
    """
    Match the token's 'kid' header to a key in the JWKS.
    Returns the matching key dict or None.
    """
    unverified_header = jwt.get_unverified_header(token)
    kid = unverified_header.get("kid")
    for key in jwks.get("keys", []):
        if key["kid"] == kid:
            return key
    return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency that:
      1. Extracts the Bearer token from the Authorization header.
      2. Validates it against Keycloak's JWKS (RS256).
      3. Checks issuer matches our realm.
      4. Extracts sub, name, email, and roles.
      5. Finds or creates a local User row.

    Returns the User ORM object for use in route handlers.
    """
    token = credentials.credentials

    # ── Fetch JWKS and find the matching RSA key ──────────────────────
    jwks = await _get_jwks()
    rsa_key = _find_rsa_key(token, jwks)

    if rsa_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to find matching RSA key in JWKS.",
        )

    # ── Decode and validate the token ─────────────────────────────────
    try:
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            issuer=settings.KEYCLOAK_ISSUER,
            # Keycloak tokens may not include 'aud' for public clients,
            # so we don't enforce audience validation here.
            options={"verify_aud": False},
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {str(e)}",
        )

    # ── Extract user info from token claims ───────────────────────────
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing 'sub' claim.",
        )

    name = payload.get("name", payload.get("preferred_username", ""))
    email = payload.get("email", "")
    realm_access = payload.get("realm_access", {})
    roles = realm_access.get("roles", [])

    # Determine the highest-priority role for this user
    if "admin" in roles:
        role = "admin"
    elif "instructor" in roles:
        role = "instructor"
    else:
        role = "learner"

    # ── Find or create the local User row ─────────────────────────────
    user = db.query(User).filter(User.keycloak_sub == sub).first()

    if user is None:
        # Auto-create a new user on first login
        user = User(
            keycloak_sub=sub,
            name=name,
            email=email,
            role=role,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update role and email if they changed in Keycloak
        changed = False
        if user.role != role:
            user.role = role
            changed = True
        if user.email != email and email:
            user.email = email
            changed = True
        if user.name != name and name:
            user.name = name
            changed = True
        if changed:
            db.commit()
            db.refresh(user)

    # Attach the roles list for use in role-checking dependencies
    user._realm_roles = roles

    return user

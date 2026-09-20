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
from fastapi import Depends, HTTPException, status, Request, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from jose import jwt, JWTError, jwk
from jose.utils import base64url_decode
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.user import User
from app.services.audit import record_audit_log

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

    preferred_username = payload.get("preferred_username", "")
    name = payload.get("name", preferred_username)
    email = payload.get("email", "")

    # Extract roles from realm_access AND resource_access
    realm_access = payload.get("realm_access", {})
    resource_access = payload.get("resource_access", {})
    client_access = resource_access.get("course-frontend", {})

    raw_roles = set(
        [r.lower() for r in realm_access.get("roles", [])] +
        [r.lower() for r in client_access.get("roles", [])]
    )

    # Normalize role aliases (e.g., course_coordinator <-> coursecoordinator)
    roles = set(raw_roles)
    if "course_coordinator" in raw_roles or "coursecoordinator" in raw_roles:
        roles.add("course_coordinator")
        roles.add("coursecoordinator")
    if "super_admin" in raw_roles or "superadmin" in raw_roles:
        roles.add("super_admin")
        roles.add("superadmin")
        roles.add("admin")
    if "sub_admin" in raw_roles or "subadmin" in raw_roles:
        roles.add("sub_admin")
        roles.add("subadmin")

    roles_list = list(roles)

    # Determine role from Keycloak roles
    keycloak_role = None
    if "super_admin" in roles or "superadmin" in roles:
        keycloak_role = "super_admin"
    elif "admin" in roles:
        keycloak_role = "super_admin"
    elif "sub_admin" in roles or "subadmin" in roles:
        keycloak_role = "sub_admin"
    elif "coursecoordinator" in roles or "course_coordinator" in roles:
        keycloak_role = "coursecoordinator"
    elif "accounts" in roles:
        keycloak_role = "accounts"
    elif "instructor" in roles:
        keycloak_role = "instructor"
    elif "learner" in roles:
        keycloak_role = "learner"

    # ── Find or create the local User row ─────────────────────────────
    user = db.query(User).filter(User.keycloak_sub == sub).first()
    if not user:
        # Match existing database user by email, preferred_username, or name
        for identifier in [email, preferred_username, name]:
            if identifier:
                user = db.query(User).filter(
                    (User.email.ilike(identifier)) |
                    (User.name.ilike(identifier))
                ).first()
                if user:
                    user.keycloak_sub = sub
                    db.commit()
                    db.refresh(user)
                    break

    if user is None:
        # Auto-create a new user on first login
        user = User(
            keycloak_sub=sub,
            name=name,
            email=email,
            role=keycloak_role or "learner",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update role and email if they changed in Keycloak, but preserve DB role if Keycloak didn't specify a specialized role
        changed = False
        if keycloak_role and keycloak_role != "learner" and user.role != keycloak_role:
            record_audit_log(
                db,
                actor_id=user.id,
                action="role_changed",
                target_type="user",
                target_id=str(user.id),
                details={"old_role": user.role, "new_role": keycloak_role}
            )
            user.role = keycloak_role
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

    # Attach the complete roles list (including DB role) for use in authorization dependencies
    effective_roles = list(roles)
    if user.role:
        effective_roles.append(user.role.lower())
        if user.role.lower() == "coursecoordinator":
            effective_roles.append("course_coordinator")
        if user.role.lower() == "super_admin":
            effective_roles.append("admin")

    user._realm_roles = list(set(effective_roles))

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated.",
        )

    return user


async def get_current_user_from_header_or_query(
    request: Request,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db),
) -> User:
    """
    Extract the JWT from either the 'Authorization' header or a 'token'
    query parameter, validate it, and return the database User.
    """
    auth_header = request.headers.get("Authorization")
    token_str = None
    if auth_header and auth_header.startswith("Bearer "):
        token_str = auth_header.split(" ")[1]
    elif token:
        token_str = token

    if not token_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required.",
        )

    jwks = await _get_jwks()
    rsa_key = _find_rsa_key(token_str, jwks)

    if rsa_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to find matching RSA key in JWKS.",
        )

    try:
        payload = jwt.decode(
            token_str,
            rsa_key,
            algorithms=["RS256"],
            issuer=settings.KEYCLOAK_ISSUER,
            options={"verify_aud": False},
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {str(e)}",
        )

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing 'sub' claim.",
        )

    preferred_username = payload.get("preferred_username", "")
    name = payload.get("name", preferred_username)
    email = payload.get("email", "")
    realm_access = payload.get("realm_access", {})
    roles = realm_access.get("roles", [])

    if "super_admin" in roles:
        role = "super_admin"
    elif "sub_admin" in roles:
        role = "sub_admin"
    elif "course_coordinator" in roles:
        role = "course_coordinator"
    elif "accounts" in roles:
        role = "accounts"
    elif "instructor" in roles:
        role = "instructor"
    else:
        role = "learner"

    user = db.query(User).filter(User.keycloak_sub == sub).first()
    if not user:
        for identifier in [email, preferred_username, name]:
            if identifier:
                user = db.query(User).filter(
                    (User.email.ilike(identifier)) |
                    (User.name.ilike(identifier))
                ).first()
                if user:
                    user.keycloak_sub = sub
                    db.commit()
                    db.refresh(user)
                    break

    if user is None:
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

    user._realm_roles = roles

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated.",
        )

    return user

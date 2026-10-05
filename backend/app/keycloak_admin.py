"""
keycloak_admin.py — Keycloak Admin REST API helper.

Used by the coordinator to create real Keycloak user accounts
when provisioning new instructors from the UI.

Keycloak Admin API flow:
  1. GET token from /realms/master/protocol/openid-connect/token  (admin-cli client)
  2. POST /admin/realms/{realm}/users  → creates user, returns Location header with new user UUID
  3. PUT  /admin/realms/{realm}/users/{id}/reset-password  → sets initial password
  4. GET  /admin/realms/{realm}/roles  → find the instructor role by name
  5. POST /admin/realms/{realm}/users/{id}/role-mappings/realm → assign role

All calls use the master-realm admin credentials stored in env vars:
  KEYCLOAK_ADMIN_USER  (default: admin)
  KEYCLOAK_ADMIN_PASS  (default: admin)
"""

import requests
from fastapi import HTTPException

from app.config import get_settings

_s             = get_settings()
KEYCLOAK_URL   = _s.KEYCLOAK_URL
KEYCLOAK_REALM = _s.KEYCLOAK_REALM
ADMIN_USER     = _s.KEYCLOAK_ADMIN_USER
ADMIN_PASS     = _s.KEYCLOAK_ADMIN_PASS


def _get_admin_token() -> str:
    """Obtain a short-lived admin access token from the master realm."""
    resp = requests.post(
        f"{KEYCLOAK_URL}/realms/master/protocol/openid-connect/token",
        data={
            "grant_type": "password",
            "client_id":  "admin-cli",
            "username":   ADMIN_USER,
            "password":   ADMIN_PASS,
        },
        timeout=10,
    )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Could not authenticate with Keycloak admin: {resp.text}",
        )
    return resp.json()["access_token"]


def create_keycloak_instructor(
    email: str,
    name: str,
    password: str = "testpass",
) -> str:
    """
    Create a user in Keycloak and return their UUID (sub).

    Steps:
      1. Create user → grab UUID from Location header
      2. Set password
      3. Assign realm role 'instructor' if it exists

    Returns the Keycloak user UUID string.
    """
    token = _get_admin_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type":  "application/json",
    }
    realm_url = f"{KEYCLOAK_URL}/admin/realms/{KEYCLOAK_REALM}"

    # ── Step 1: create user ────────────────────────────────────────────
    first, *rest = name.strip().split(" ", 1)
    last = rest[0] if rest else ""

    create_resp = requests.post(
        f"{realm_url}/users",
        json={
            "username":      email,
            "email":         email,
            "firstName":     first,
            "lastName":      last,
            "enabled":       True,
            "emailVerified": True,
            "credentials":   [],          # password set separately
        },
        headers=headers,
        timeout=10,
    )

    if create_resp.status_code == 409:
        raise HTTPException(status_code=400, detail="A Keycloak user with this email already exists.")

    if create_resp.status_code not in (201, 200):
        raise HTTPException(
            status_code=502,
            detail=f"Keycloak user creation failed: {create_resp.text}",
        )

    # Extract new user UUID from the Location header
    location = create_resp.headers.get("Location", "")
    kc_user_id = location.rstrip("/").split("/")[-1]

    # ── Step 2: set initial password ───────────────────────────────────
    pwd_resp = requests.put(
        f"{realm_url}/users/{kc_user_id}/reset-password",
        json={"type": "password", "value": password, "temporary": False},
        headers=headers,
        timeout=10,
    )
    if pwd_resp.status_code not in (204, 200):
        # Non-fatal: user created but password not set — log and continue
        print(f"[WARN] Could not set password for KC user {kc_user_id}: {pwd_resp.text}")

    # ── Step 3: assign 'instructor' realm role (best-effort) ───────────
    try:
        roles_resp = requests.get(
            f"{realm_url}/roles",
            headers=headers,
            timeout=10,
        )
        roles = roles_resp.json() if roles_resp.status_code == 200 else []
        instructor_role = next((r for r in roles if r["name"] == "instructor"), None)

        if instructor_role:
            requests.post(
                f"{realm_url}/users/{kc_user_id}/role-mappings/realm",
                json=[instructor_role],
                headers=headers,
                timeout=10,
            )
    except Exception as e:
        print(f"[WARN] Could not assign instructor role in Keycloak: {e}")

    return kc_user_id

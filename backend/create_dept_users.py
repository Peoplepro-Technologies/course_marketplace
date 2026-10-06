"""
create_dept_users.py - Create department staff users in Keycloak + assign DB depts.

Users created:
  testacademicoperations / testpass
  testacademicteam       / testpass
  testhr                 / testpass
  testittechnicalsupport / testpass
  testmisreporting       / testpass
  teststudentsupport     / testpass

Run from: backend/  (with venv active)
  python create_dept_users.py
"""

import asyncio
import httpx
import json
import sys
from pathlib import Path

# ── Load .env ────────────────────────────────────────────────────────
env_file = Path(__file__).parent / ".env"
env = {}
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip().strip('"').strip("'")

KEYCLOAK_URL = env.get("KEYCLOAK_URL", "http://localhost:8080")
REALM        = env.get("KEYCLOAK_REALM", "course-marketplace")
ADMIN_USER   = env.get("KEYCLOAK_ADMIN_USER", "manasvi")
ADMIN_PASS   = env.get("KEYCLOAK_ADMIN_PASS", "manasvi")
PASSWORD     = "testpass"

DEPT_USERS = [
    {"username": "testacademicoperations", "email": "testacademicoperations@test.com",
     "first_name": "Academic",  "last_name": "Operations",   "dept_keyword": "academic operations"},
    {"username": "testacademicteam",       "email": "testacademicteam@test.com",
     "first_name": "Academic",  "last_name": "Team",          "dept_keyword": "academic team"},
    {"username": "testhr",                 "email": "testhr@test.com",
     "first_name": "HR",        "last_name": "Staff",         "dept_keyword": "hr"},
    {"username": "testittechnicalsupport", "email": "testittechnicalsupport@test.com",
     "first_name": "IT",        "last_name": "Support",       "dept_keyword": "it"},
    {"username": "testmisreporting",       "email": "testmisreporting@test.com",
     "first_name": "MIS",       "last_name": "Reporting",     "dept_keyword": "mis"},
    {"username": "teststudentsupport",     "email": "teststudentsupport@test.com",
     "first_name": "Student",   "last_name": "Support",       "dept_keyword": "student"},
]


async def get_admin_token(client):
    resp = await client.post(
        f"{KEYCLOAK_URL}/realms/master/protocol/openid-connect/token",
        data={"grant_type": "password", "client_id": "admin-cli",
              "username": ADMIN_USER, "password": ADMIN_PASS},
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


async def create_kc_user(client, token, user):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload = {
        "username": user["username"],
        "email": user["email"],
        "firstName": user["first_name"],
        "lastName": user["last_name"],
        "enabled": True,
        "emailVerified": True,
        "credentials": [{"type": "password", "value": PASSWORD, "temporary": False}],
    }
    resp = await client.post(
        f"{KEYCLOAK_URL}/admin/realms/{REALM}/users",
        headers=headers, content=json.dumps(payload),
    )
    if resp.status_code == 201:
        location = resp.headers.get("Location", "")
        user_id = location.rstrip("/").split("/")[-1]
        print(f"  [CREATED] {user['username']}  (id: {user_id})")
        return user_id
    elif resp.status_code == 409:
        print(f"  [EXISTS]  {user['username']} - fetching existing ID")
        r2 = await client.get(
            f"{KEYCLOAK_URL}/admin/realms/{REALM}/users",
            headers=headers, params={"username": user["username"], "exact": "true"},
        )
        users = r2.json()
        if users:
            return users[0]["id"]
    else:
        print(f"  [FAIL]    {user['username']}: {resp.status_code} {resp.text}")
    return None


async def assign_realm_role(client, token, user_id, role_name):
    """Assign a realm role to a user (e.g. 'learner')."""
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    # Get role representation
    r = await client.get(f"{KEYCLOAK_URL}/admin/realms/{REALM}/roles/{role_name}", headers=headers)
    if r.status_code != 200:
        print(f"  [WARN] Role '{role_name}' not found in realm — skip role assign")
        return
    role = r.json()
    await client.post(
        f"{KEYCLOAK_URL}/admin/realms/{REALM}/users/{user_id}/role-mappings/realm",
        headers=headers, content=json.dumps([role]),
    )
    print(f"  [ROLE]    assigned realm role '{role_name}'")


def assign_dept_in_db(email, dept_keyword, user_id):
    """Assign user to department in the FastAPI PostgreSQL database."""
    import os
    sys.path.insert(0, str(Path(__file__).parent))
    os.environ.setdefault("DATABASE_URL", env.get("DATABASE_URL", ""))
    try:
        from app.database import SessionLocal
        from app.models.user import User
        from app.models.department import Department

        db = SessionLocal()
        try:
            # 1. Ensure user exists in local DB
            db_user = db.query(User).filter(User.email == email).first()
            if not db_user:
                # Get the full details from Keycloak list (passed from caller)
                # For this script we can just use the provided email as they match
                username = email.split('@')[0]
                db_user = User(
                    keycloak_sub=user_id,
                    email=email,
                    name=f"Staff {username}",
                    role="staff"
                )
                db.add(db_user)
                db.commit()
                db.refresh(db_user)
                print(f"  [DB]      created local user {email} (role: staff)")
            else:
                if db_user.role != "staff":
                    db_user.role = "staff"
                    db.commit()

            # 2. Assign department
            depts = db.query(Department).filter(Department.is_active == True).all()
            matched = next((d for d in depts if dept_keyword.lower() in d.name.lower()), None)
            if matched:
                db_user.department_id = matched.id
                db.commit()
                print(f"  [DB]      dept assigned -> {matched.name}")
            else:
                print(f"  [DB]      no dept matched '{dept_keyword}' - use SA > User Mgmt to assign manually")
        finally:
            db.close()
    except Exception as ex:
        print(f"  [DB]      skipped: {ex}")


async def main():
    print("\n" + "="*55)
    print(" Creating Department Staff Users in Keycloak")
    print(f" Realm: {REALM}  |  KC: {KEYCLOAK_URL}")
    print("="*55 + "\n")

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            token = await get_admin_token(client)
            print("[OK] Keycloak admin token obtained\n")
        except Exception as e:
            print(f"[FAIL] Cannot connect to Keycloak: {e}")
            print("  Is Keycloak running? Start with: npm run dev")
            sys.exit(1)

        for user in DEPT_USERS:
            print(f"-> {user['username']}")
            user_id = await create_kc_user(client, token, user)
            if user_id:
                await assign_realm_role(client, token, user_id, "staff")
                assign_dept_in_db(user["email"], user["dept_keyword"], user_id)
            print()

    print("="*55)
    print("Done!")
    print(f"  Login at: http://localhost:5173")
    print(f"  Password: {PASSWORD}")
    print()
    print("NEXT STEP: After each user logs in once, go to:")
    print("  Super Admin > User Management > find user > Assign Dept")
    print("  (or re-run this script after first login for auto-assign)")
    print("="*55)


if __name__ == "__main__":
    asyncio.run(main())

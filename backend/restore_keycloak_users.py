import asyncio
import httpx
import psycopg2

KEYCLOAK_URL = "http://localhost:8080"
REALM = "course-marketplace"
ADMIN_USER = "manasvi"
ADMIN_PASS = "manasvi"

async def main():
    async with httpx.AsyncClient() as client:
        # 1. Get Admin Token
        resp = await client.post(
            f"{KEYCLOAK_URL}/realms/master/protocol/openid-connect/token",
            data={
                "client_id": "admin-cli",
                "username": ADMIN_USER,
                "password": ADMIN_PASS,
                "grant_type": "password",
            },
        )
        resp.raise_for_status()
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        # 2. Get Users from DB
        conn = psycopg2.connect("postgresql://postgres:manasvi@localhost:5432/course_marketplace")
        cur = conn.cursor()
        cur.execute("SELECT email, role, keycloak_sub, name FROM users")
        db_users = cur.fetchall()

        for email, role, sub, name in db_users:
            username = email.split("@")[0] if email else sub
            if not email:
                email = f"{username}@example.com"
            
            # 3. Create User in Keycloak
            user_payload = {
                "id": sub,
                "username": username,
                "email": email,
                "firstName": name,
                "enabled": True,
                "emailVerified": True,
                "credentials": [{"type": "password", "value": "manasvi", "temporary": False}]
            }
            create_resp = await client.post(
                f"{KEYCLOAK_URL}/admin/realms/{REALM}/users",
                json=user_payload,
                headers=headers
            )
            if create_resp.status_code == 201:
                print(f"Created {email} ({sub})")
            elif create_resp.status_code == 409:
                print(f"User {email} already exists")
            else:
                print(f"Failed to create {email}: {create_resp.text}")

            # 4. Assign Role
            # First, make sure the role exists in Keycloak
            role_resp = await client.get(f"{KEYCLOAK_URL}/admin/realms/{REALM}/roles/{role}", headers=headers)
            if role_resp.status_code == 404:
                await client.post(f"{KEYCLOAK_URL}/admin/realms/{REALM}/roles", json={"name": role}, headers=headers)
                role_resp = await client.get(f"{KEYCLOAK_URL}/admin/realms/{REALM}/roles/{role}", headers=headers)
            
            if role_resp.status_code == 200:
                role_data = role_resp.json()
                await client.post(
                    f"{KEYCLOAK_URL}/admin/realms/{REALM}/users/{sub}/role-mappings/realm",
                    json=[{"id": role_data["id"], "name": role_data["name"]}],
                    headers=headers
                )
                print(f"Assigned role {role} to {email}")

if __name__ == "__main__":
    asyncio.run(main())

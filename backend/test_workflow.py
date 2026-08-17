from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid

from app.main import app
from app.database import get_db, Base, engine
from app.auth.keycloak import get_current_user
from app.models.user import User

client = TestClient(app)

def setup_db():
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    # Create test users
    instructor = db.query(User).filter(User.email == "instructor@test.com").first()
    if not instructor:
        instructor = User(
            id=uuid.uuid4(),
            keycloak_sub="sub_instructor",
            name="Test Instructor",
            email="instructor@test.com",
            role="instructor"
        )
        db.add(instructor)
        
    admin = db.query(User).filter(User.email == "admin@test.com").first()
    if not admin:
        admin = User(
            id=uuid.uuid4(),
            keycloak_sub="sub_admin",
            name="Test Admin",
            email="admin@test.com",
            role="admin"
        )
        db.add(admin)
    
    db.commit()
    db.refresh(instructor)
    db.refresh(admin)
    return instructor, admin, db

def override_as_instructor():
    db = next(get_db())
    user = db.query(User).filter(User.email == "instructor@test.com").first()
    user._realm_roles = ["instructor"]
    return user

def override_as_admin():
    db = next(get_db())
    user = db.query(User).filter(User.email == "admin@test.com").first()
    user._realm_roles = ["admin"]
    return user

def test_workflow():
    instructor, admin, db = setup_db()
    print("Users created.")
    
    # Switch to instructor
    app.dependency_overrides[get_current_user] = override_as_instructor
    
    # 1. Instructor creates course
    resp = client.post("/api/v1/instructor/courses", json={
        "title": "Approval Test Course",
        "description": "Test description",
        "category": "Test",
        "price": 10.0
    })
    assert resp.status_code == 200, resp.text
    course_id = resp.json()["id"]
    print(f"Course created: {course_id}, status: {resp.json()['status']}")
    assert resp.json()["status"] == "draft"

    # 2. Instructor submits for review
    resp = client.put(f"/api/v1/instructor/courses/{course_id}/publish")
    assert resp.status_code == 200, resp.text
    print(f"Course submitted, new status: {resp.json()['status']}")
    assert resp.json()["status"] == "pending_review"

    # 3. Public fetch should 404
    resp = client.get(f"/api/v1/public/courses/{course_id}")
    assert resp.status_code == 404, resp.text
    print("Public fetch returned 404 for pending_review (as expected).")

    # 4. Switch to admin and approve
    app.dependency_overrides[get_current_user] = override_as_admin
    resp = client.put(f"/api/v1/admin/courses/{course_id}/moderate", json={"action": "approve"})
    assert resp.status_code == 200, resp.text
    print(f"Course approved, new status: {resp.json()['status']}")
    assert resp.json()["status"] == "published"

    # 5. Public fetch should succeed
    # Public doesn't need auth, so removing override is fine, but it doesn't hurt.
    resp = client.get(f"/api/v1/public/courses/{course_id}")
    assert resp.status_code == 200, resp.text
    print("Public fetch succeeded for published course.")

    # 6. Second course - reject flow
    app.dependency_overrides[get_current_user] = override_as_instructor
    resp = client.post("/api/v1/instructor/courses", json={
        "title": "Reject Test Course",
        "description": "Test description",
        "category": "Test",
        "price": 10.0
    })
    course_id_2 = resp.json()["id"]
    client.put(f"/api/v1/instructor/courses/{course_id_2}/publish")
    
    app.dependency_overrides[get_current_user] = override_as_admin
    resp = client.put(f"/api/v1/admin/courses/{course_id_2}/moderate", json={
        "action": "reject",
        "rejection_reason": "Needs more content"
    })
    assert resp.status_code == 200, resp.text
    print(f"Second course rejected, status: {resp.json()['status']}")
    assert resp.json()["status"] == "rejected"
    
    # 7. Check if instructor sees rejection reason
    app.dependency_overrides[get_current_user] = override_as_instructor
    resp = client.get("/api/v1/instructor/courses")
    c = next(c for c in resp.json() if c["id"] == course_id_2)
    assert c["status"] == "rejected"
    assert c["rejection_reason"] == "Needs more content"
    print("Rejection reason successfully stored and retrieved.")
    
    # ── Test New Role System (Task 2 Backend) ──────────────────────────
    print("\n--- Testing New Role System (Task 2 Backend) ---")
    from fastapi import Depends
    from app.auth.roles import require_role

    # Define test endpoints dynamically on the main app
    @app.get("/api/test/super-admin", dependencies=[Depends(require_role("super_admin"))])
    def super_admin_test_route():
        return {"role": "super_admin"}

    @app.get("/api/test/sub-admin", dependencies=[Depends(require_role("sub_admin"))])
    def sub_admin_test_route():
        return {"role": "sub_admin"}

    @app.get("/api/test/coordinator", dependencies=[Depends(require_role("coursecoordinator"))])
    def _test_coordinator():
        return {"role": "coursecoordinator"}

    @app.get("/api/test/accounts", dependencies=[Depends(require_role("accounts"))])
    def accounts_test_route():
        return {"role": "accounts"}

    @app.get("/api/test/admin-generic", dependencies=[Depends(require_role("admin"))])
    def admin_generic_test_route():
        return {"role": "admin"}

    # Set up overrides and mock tokens
    def get_user_with_roles(roles_list):
        def _override():
            db = next(get_db())
            # Use get_current_user logic manually to build/retrieve user
            # Mocking payload parts
            sub = "mock_sub_" + "_".join(roles_list)
            email = "_".join(roles_list) + "@test.com"
            name = "Test " + " ".join(roles_list)
            
            # Determine the highest-priority role for this user.
            roles = roles_list
            if "super_admin" in roles:
                role = "admin"
                if "admin" not in roles:
                    roles = list(roles) + ["admin"]
            elif "admin" in roles:
                role = "admin"
            elif "sub_admin" in roles:
                role = "sub_admin"
            elif "coursecoordinator" in roles:
                role = "coursecoordinator"
            elif "accounts" in roles:
                role = "accounts"
            elif "instructor" in roles:
                role = "instructor"
            else:
                role = "learner"

            user = db.query(User).filter(User.keycloak_sub == sub).first()
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
                if user.role != role:
                    user.role = role
                    db.commit()
                    db.refresh(user)
            user._realm_roles = roles
            return user
        return _override

    # Test Super Admin Access and Admin Equivalence
    app.dependency_overrides[get_current_user] = get_user_with_roles(["super_admin"])
    
    # 1. Super Admin route allows super_admin
    resp = client.get("/api/test/super-admin")
    assert resp.status_code == 200, resp.text
    assert resp.json()["role"] == "super_admin"
    print("OK: require_role('super_admin') allowed access for super_admin user")

    # 2. Admin route allows super_admin (Admin equivalence)
    resp = client.get("/api/test/admin-generic")
    assert resp.status_code == 200, resp.text
    assert resp.json()["role"] == "admin"
    print("OK: require_role('admin') allowed access for super_admin user (Admin Equivalence)")

    # 3. Sub Admin route denies super_admin
    resp = client.get("/api/test/sub-admin")
    assert resp.status_code == 403, resp.text
    print("OK: require_role('sub_admin') denied access for super_admin user")

    # Test Sub Admin Access
    app.dependency_overrides[get_current_user] = get_user_with_roles(["sub_admin"])
    
    resp = client.get("/api/test/sub-admin")
    assert resp.status_code == 200, resp.text
    assert resp.json()["role"] == "sub_admin"
    print("OK: require_role('sub_admin') allowed access for sub_admin user")

    resp = client.get("/api/test/super-admin")
    assert resp.status_code == 403, resp.text
    print("OK: require_role('super_admin') denied access for sub_admin user")

    # Course Coordinator
    app.dependency_overrides[get_current_user] = get_user_with_roles(["coursecoordinator"])
    resp = client.get("/api/test/coordinator")
    assert resp.status_code == 200, "Coordinator should access /api/test/coordinator"
    assert resp.json()["role"] == "coursecoordinator"
    print("OK: require_role('coursecoordinator') allowed access for coordinator user")

    resp = client.get("/api/test/sub-admin")
    assert resp.status_code == 403, resp.text
    print("OK: require_role('sub_admin') denied access for coordinator user")

    # Test Accounts Access
    app.dependency_overrides[get_current_user] = get_user_with_roles(["accounts"])
    
    resp = client.get("/api/test/accounts")
    assert resp.status_code == 200, resp.text
    assert resp.json()["role"] == "accounts"
    print("OK: require_role('accounts') allowed access for accounts user")

    resp = client.get("/api/test/coordinator")
    assert resp.status_code == 403, "Accounts should NOT access coordinator route"
    print("OK: require_role('coursecoordinator') denied access for accounts user")

    # Test Sub Admin specific endpoints and security checks
    print("\n--- Testing Sub Admin Restrictions ---")
    # First create super_admin and learner users so they exist in DB
    get_user_with_roles(["super_admin"])()
    get_user_with_roles(["learner"])()

    # Set override to sub_admin
    app.dependency_overrides[get_current_user] = get_user_with_roles(["sub_admin"])
    
    # Retrieve a learner and a super_admin from database to use their IDs
    db = next(get_db())
    learner_user = db.query(User).filter(User.role == "learner").first()
    super_admin_user = db.query(User).filter(User.role == "admin").filter(User.keycloak_sub.like("%super_admin%")).first()

    assert learner_user is not None, "Learner user should be created"
    assert super_admin_user is not None, "Super admin user should be created"

    # 1. List users
    resp = client.get("/api/v1/subadmin/users")
    assert resp.status_code == 200, resp.text
    assert "users" in resp.json()
    print("OK: Sub-admin can list users")

    # 2. Block assigning super_admin role
    resp = client.put(f"/api/v1/subadmin/users/{learner_user.id}/role", json={"role": "super_admin"})
    assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
    print("OK: Sub-admin blocked from assigning super_admin role")

    # 3. Block modifying super_admin user's role
    resp = client.put(f"/api/v1/subadmin/users/{super_admin_user.id}/role", json={"role": "learner"})
    assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
    print("OK: Sub-admin blocked from modifying super_admin user's role")

    # 4. Block deactivating super_admin user
    resp = client.put(f"/api/v1/subadmin/users/{super_admin_user.id}/deactivate")
    assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
    print("OK: Sub-admin blocked from deactivating super_admin user")

    # 5. Allow role change for standard roles (e.g. learner -> instructor)
    resp = client.put(f"/api/v1/subadmin/users/{learner_user.id}/role", json={"role": "instructor"})
    assert resp.status_code == 200, resp.text
    print("OK: Sub-admin can assign standard roles")

    # 6. Allow deactivating and reactivating a learner
    resp = client.put(f"/api/v1/subadmin/users/{learner_user.id}/deactivate")
    assert resp.status_code == 200, resp.text
    print("OK: Sub-admin can deactivate standard user")

    # Block reactivating to super_admin
    resp = client.put(f"/api/v1/subadmin/users/{learner_user.id}/reactivate", json={"role": "super_admin"})
    assert resp.status_code == 403, resp.text
    print("OK: Sub-admin blocked from reactivating user to super_admin")

    # Reactivate to learner
    resp = client.put(f"/api/v1/subadmin/users/{learner_user.id}/reactivate", json={"role": "learner"})
    assert resp.status_code == 200, resp.text
    print("OK: Sub-admin can reactivate standard user")

    print("--- Sub Admin Restrictions Tests Passed! ---\n")

    # Cleanup overrides
    app.dependency_overrides.clear()
    print("--- New Role System Tests Passed! ---\n")
    
    print("ALL TESTS PASSED!")

if __name__ == "__main__":
    test_workflow()

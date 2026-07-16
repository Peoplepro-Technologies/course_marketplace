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
    
    print("ALL TESTS PASSED!")

if __name__ == "__main__":
    test_workflow()

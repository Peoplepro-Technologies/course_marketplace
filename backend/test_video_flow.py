import os
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import get_db, Base, engine
from app.auth.keycloak import get_current_user, get_current_user_from_header_or_query
from app.models.user import User
from app.models.course import Course
from app.models.section import Section
from app.models.lesson import Lesson
from app.models.enrollment import Enrollment

client = TestClient(app)

def setup_db():
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    
    # 1. Create Instructor
    instructor = db.query(User).filter(User.email == "vid_instructor@test.com").first()
    if not instructor:
        instructor = User(
            id=uuid.uuid4(),
            keycloak_sub="sub_vid_instructor",
            name="Video Instructor",
            email="vid_instructor@test.com",
            role="instructor"
        )
        db.add(instructor)

    # 2. Create Learner 1 (Approved)
    learner_ok = db.query(User).filter(User.email == "learner_ok@test.com").first()
    if not learner_ok:
        learner_ok = User(
            id=uuid.uuid4(),
            keycloak_sub="sub_learner_ok",
            name="Approved Learner",
            email="learner_ok@test.com",
            role="learner"
        )
        db.add(learner_ok)

    # 3. Create Learner 2 (Pending/Not Approved)
    learner_pending = db.query(User).filter(User.email == "learner_pending@test.com").first()
    if not learner_pending:
        learner_pending = User(
            id=uuid.uuid4(),
            keycloak_sub="sub_learner_pending",
            name="Pending Learner",
            email="learner_pending@test.com",
            role="learner"
        )
        db.add(learner_pending)

    # 4. Create Learner 3 (Not Enrolled)
    learner_none = db.query(User).filter(User.email == "learner_none@test.com").first()
    if not learner_none:
        learner_none = User(
            id=uuid.uuid4(),
            keycloak_sub="sub_learner_none",
            name="Unenrolled Learner",
            email="learner_none@test.com",
            role="learner"
        )
        db.add(learner_none)

    # 5. Create Admin
    admin = db.query(User).filter(User.email == "vid_admin@test.com").first()
    if not admin:
        admin = User(
            id=uuid.uuid4(),
            keycloak_sub="sub_vid_admin",
            name="Video Admin",
            email="vid_admin@test.com",
            role="admin"
        )
        db.add(admin)

    db.commit()
    db.refresh(instructor)
    db.refresh(learner_ok)
    db.refresh(learner_pending)
    db.refresh(learner_none)
    db.refresh(admin)
    return db, instructor, learner_ok, learner_pending, learner_none, admin


# Mocks for authentication
def mock_user_dependency(user, roles):
    def _override():
        user._realm_roles = roles
        return user
    return _override


def test_video_workflow():
    db, instructor, learner_ok, learner_pending, learner_none, admin = setup_db()
    print("[TEST] DB and mock users set up successfully.")

    # ── 1. Create Course, Section, and Lesson as Instructor ─────────────────
    app.dependency_overrides[get_current_user] = mock_user_dependency(instructor, ["instructor"])
    app.dependency_overrides[get_current_user_from_header_or_query] = mock_user_dependency(instructor, ["instructor"])

    # Create Course
    resp = client.post("/api/v1/instructor/courses", json={
        "title": "Secure Video Course",
        "description": "Course with secure lessons",
        "category": "Technology",
        "price": 49.99
    })
    assert resp.status_code == 200, resp.text
    course_id = resp.json()["id"]

    # Create Section
    resp = client.post(f"/api/v1/instructor/courses/{course_id}/sections", json={
        "title": "Video Section",
        "order_index": 0
    })
    assert resp.status_code == 200, resp.text
    section_id = resp.json()["id"]

    # Create Lesson
    resp = client.post(f"/api/v1/instructor/sections/{section_id}/lessons", json={
        "title": "Secure Video Lesson",
        "content": "Lesson content text",
        "duration": 10,
        "order_index": 0
    })
    assert resp.status_code == 200, resp.text
    lesson_id = resp.json()["id"]
    print(f"[TEST] Course, section, and lesson created: {lesson_id}")

    # Publish Course so learners can enroll (simulated admin approval)
    app.dependency_overrides[get_current_user] = mock_user_dependency(admin, ["admin"])
    resp = client.put(f"/api/v1/admin/courses/{course_id}/moderate", json={"action": "approve"})
    assert resp.status_code == 200, resp.text
    print("[TEST] Course approved and published.")

    # ── 2. Create Enrollments ───────────────────────────────────────────────
    # Enroll Learner OK (defaults to pending)
    app.dependency_overrides[get_current_user] = mock_user_dependency(learner_ok, ["learner"])
    resp = client.post(f"/api/v1/learner/enroll/{course_id}")
    assert resp.status_code == 200, resp.text
    enrollment_ok_id = resp.json()["enrollment_id"]

    # Enroll Learner Pending (defaults to pending)
    app.dependency_overrides[get_current_user] = mock_user_dependency(learner_pending, ["learner"])
    resp = client.post(f"/api/v1/learner/enroll/{course_id}")
    assert resp.status_code == 200, resp.text
    enrollment_pending_id = resp.json()["enrollment_id"]

    # Admin approves learner_ok's enrollment
    app.dependency_overrides[get_current_user] = mock_user_dependency(admin, ["admin"])
    resp = client.put(f"/api/v1/admin/enrollments/{enrollment_ok_id}/approve")
    assert resp.status_code == 200, resp.text
    approved_data = resp.json()
    assert approved_data["status"] == "approved"
    assert "approved_at" in approved_data

    # Verify that approved_by is set correctly in DB
    enroll_ok = db.query(Enrollment).filter(Enrollment.id == enrollment_ok_id).first()
    assert enroll_ok is not None
    assert enroll_ok.status == "approved"
    assert enroll_ok.approved_by == admin.id
    assert enroll_ok.approved_at is not None

    # learner_pending remains pending (default value)
    enroll_pending = db.query(Enrollment).filter(Enrollment.id == enrollment_pending_id).first()
    assert enroll_pending is not None
    assert enroll_pending.status == "pending"

    print("[TEST] Learners enrolled. learner_ok approved via admin, learner_pending remains pending.")

    # ── 3. Test Video serving security boundaries ───────────────────────────
    # Create a dummy video file on disk
    _HERE = os.path.dirname(os.path.abspath(__file__))
    _MEDIA_ROOT = os.path.join(_HERE, "app", "media")
    _VIDEOS_DIR = os.path.join(_MEDIA_ROOT, "videos")
    os.makedirs(_VIDEOS_DIR, exist_ok=True)
    video_path = os.path.join(_VIDEOS_DIR, f"{lesson_id}.mp4")
    with open(video_path, "wb") as f:
        f.write(b"fake mp4 video bytes" * 100) # dummy bytes

    try:
        # A. Unauthenticated request to the video endpoint should fail
        app.dependency_overrides.clear()
        resp = client.get(f"/api/v1/learner/lessons/{lesson_id}/video")
        assert resp.status_code == 401, resp.text
        print("[TEST] Passed: Unauthenticated request returned 401.")

        # B. Direct static file request to video file should fail with 404 (removed mount)
        resp = client.get(f"/media/videos/{lesson_id}.mp4")
        assert resp.status_code == 404, resp.text
        print("[TEST] Passed: Static file video access returned 404.")

        # C. Non-enrolled learner should get 403
        app.dependency_overrides[get_current_user_from_header_or_query] = mock_user_dependency(learner_none, ["learner"])
        resp = client.get(f"/api/v1/learner/lessons/{lesson_id}/video")
        assert resp.status_code == 403, resp.text
        print("[TEST] Passed: Unenrolled learner returned 403.")

        # D. Pending learner should get 403
        app.dependency_overrides[get_current_user_from_header_or_query] = mock_user_dependency(learner_pending, ["learner"])
        resp = client.get(f"/api/v1/learner/lessons/{lesson_id}/video")
        assert resp.status_code == 403, resp.text
        print("[TEST] Passed: Pending learner returned 403.")

        # E. Approved learner should get 200 and video contents (support query param token)
        app.dependency_overrides[get_current_user_from_header_or_query] = mock_user_dependency(learner_ok, ["learner"])
        # Query parameter token simulation
        resp = client.get(f"/api/v1/learner/lessons/{lesson_id}/video?token=mock_token")
        assert resp.status_code == 200, resp.text
        assert resp.content == b"fake mp4 video bytes" * 100
        print("[TEST] Passed: Approved learner successfully downloaded video.")

        # F. Instructor of course should get 200 for preview
        app.dependency_overrides[get_current_user_from_header_or_query] = mock_user_dependency(instructor, ["instructor"])
        resp = client.get(f"/api/v1/learner/lessons/{lesson_id}/video")
        assert resp.status_code == 200, resp.text
        print("[TEST] Passed: Instructor preview successful.")

        # G. Admin should get 200
        app.dependency_overrides[get_current_user_from_header_or_query] = mock_user_dependency(admin, ["admin"])
        resp = client.get(f"/api/v1/learner/lessons/{lesson_id}/video")
        assert resp.status_code == 200, resp.text
        print("[TEST] Passed: Admin review successful.")

    finally:
        # Cleanup dummy video file
        if os.path.exists(video_path):
            os.remove(video_path)

    app.dependency_overrides.clear()
    print("[TEST] All secure video tests passed!")

if __name__ == "__main__":
    test_video_workflow()

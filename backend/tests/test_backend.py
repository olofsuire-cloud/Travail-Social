"""Backend API tests for Makandal Travail Social platform."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://social-work-hub-6.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "olofsuire@gmail.com"
ADMIN_PASSWORD = "Makandal2026!"

TS = str(int(time.time()))
TEACHER_EMAIL = f"TEST_teacher_{TS}@test.com"
STUDENT_EMAIL = f"TEST_student_{TS}@test.com"
PW = "pass1234"


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["role"] == "admin"
    assert "access_token" in s.cookies
    return s


@pytest.fixture(scope="session")
def created_users(admin_session):
    """Create a teacher assigned to SW10 and a student assigned to SW10."""
    teacher = admin_session.post(f"{API}/admin/users", json={
        "name": "TEST Prof", "email": TEACHER_EMAIL, "password": PW,
        "role": "enseignant", "course_codes": ["SW10"],
    })
    assert teacher.status_code == 200, teacher.text
    student = admin_session.post(f"{API}/admin/users", json={
        "name": "TEST Stud", "email": STUDENT_EMAIL, "password": PW,
        "role": "etudiant", "course_codes": ["SW10"],
    })
    assert student.status_code == 200, student.text
    yield {"teacher": teacher.json(), "student": student.json()}
    # cleanup
    for u in (teacher.json()["id"], student.json()["id"]):
        admin_session.delete(f"{API}/admin/users/{u}")


# ---------------- Auth ----------------
class TestAuth:
    def test_login_admin(self, admin_session):
        r = admin_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_login_bad(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_logout(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200


# ---------------- Courses ----------------
class TestCourses:
    def test_list_47(self, admin_session):
        r = admin_session.get(f"{API}/courses")
        assert r.status_code == 200
        courses = r.json()
        assert len(courses) == 47, f"expected 47, got {len(courses)}"
        assert all("code" in c and "title" in c for c in courses)

    def test_get_course(self, admin_session):
        r = admin_session.get(f"{API}/courses/SW10")
        assert r.status_code == 200
        c = r.json()
        assert c["code"] == "SW10"
        assert "seances" in c or "desc" in c

    def test_courses_unauth(self):
        r = requests.get(f"{API}/courses")
        assert r.status_code == 401

    def test_program(self, admin_session):
        r = admin_session.get(f"{API}/program")
        assert r.status_code == 200


# ---------------- Admin user management ----------------
class TestAdminUsers:
    def test_list_users_admin(self, admin_session):
        r = admin_session.get(f"{API}/admin/users")
        assert r.status_code == 200
        assert any(u["email"] == ADMIN_EMAIL for u in r.json())

    def test_users_requires_admin(self, created_users):
        # Login as teacher
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": TEACHER_EMAIL, "password": PW})
        r = s.get(f"{API}/admin/users")
        assert r.status_code == 403

    def test_create_duplicate_email(self, admin_session, created_users):
        r = admin_session.post(f"{API}/admin/users", json={
            "name": "dup", "email": TEACHER_EMAIL, "password": PW,
            "role": "enseignant", "course_codes": [],
        })
        assert r.status_code == 400

    def test_update_user(self, admin_session, created_users):
        uid = created_users["student"]["id"]
        r = admin_session.put(f"{API}/admin/users/{uid}", json={"course_codes": ["SW10", "CS104"]})
        assert r.status_code == 200
        assert set(r.json()["course_codes"]) == {"SW10", "CS104"}

    def test_admin_cannot_delete_self(self, admin_session):
        me = admin_session.get(f"{API}/auth/me").json()
        r = admin_session.delete(f"{API}/admin/users/{me['id']}")
        assert r.status_code == 400


# ---------------- Course edit RBAC ----------------
class TestCourseEdit:
    def test_teacher_edits_assigned(self, created_users):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": TEACHER_EMAIL, "password": PW})
        r = s.put(f"{API}/courses/SW10", json={"desc": "Updated by teacher test"})
        assert r.status_code == 200
        assert r.json()["desc"] == "Updated by teacher test"

    def test_teacher_cannot_edit_other(self, created_users):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": TEACHER_EMAIL, "password": PW})
        r = s.put(f"{API}/courses/CS104", json={"desc": "nope"})
        assert r.status_code == 403

    def test_student_cannot_edit(self, created_users):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": STUDENT_EMAIL, "password": PW})
        r = s.put(f"{API}/courses/SW10", json={"desc": "nope"})
        assert r.status_code == 403

    def test_admin_edits_any(self, admin_session):
        r = admin_session.put(f"{API}/courses/CS104", json={"desc": "admin edit"})
        assert r.status_code == 200


# ---------------- Progress / Forum / Submissions ----------------
class TestLearnerFlows:
    def test_progress(self, created_users):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": STUDENT_EMAIL, "password": PW})
        r = s.put(f"{API}/courses/SW10/progress", json={"seance_num": "1", "completed": True})
        assert r.status_code == 200
        assert "1" in r.json()["completed"]
        r2 = s.get(f"{API}/courses/SW10/progress")
        assert "1" in r2.json()["completed"]
        # uncheck
        r3 = s.put(f"{API}/courses/SW10/progress", json={"seance_num": "1", "completed": False})
        assert "1" not in r3.json()["completed"]

    def test_forum(self, created_users):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": STUDENT_EMAIL, "password": PW})
        r = s.post(f"{API}/courses/SW10/forum", json={"text": "Hello forum"})
        assert r.status_code == 200
        assert r.json()["author_name"] == "TEST Stud"
        r2 = s.get(f"{API}/courses/SW10/forum")
        assert any(p["text"] == "Hello forum" for p in r2.json())

    def test_submission_and_grade(self, created_users):
        # student submits
        ss = requests.Session()
        ss.post(f"{API}/auth/login", json={"email": STUDENT_EMAIL, "password": PW})
        r = ss.post(f"{API}/courses/SW10/submissions", json={"text": "my devoir"})
        assert r.status_code == 200
        sub_id = r.json()["id"]
        # teacher grades
        ts = requests.Session()
        ts.post(f"{API}/auth/login", json={"email": TEACHER_EMAIL, "password": PW})
        g = ts.put(f"{API}/submissions/{sub_id}/grade", json={"grade": "A", "feedback": "good"})
        assert g.status_code == 200
        assert g.json()["grade"] == "A"
        # student sees only own
        own = ss.get(f"{API}/courses/SW10/submissions").json()
        assert len(own) >= 1 and all(s["user_id"] == ss.get(f"{API}/auth/me").json()["id"] for s in own)

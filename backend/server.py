import os
import json
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from dotenv import load_dotenv
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"
DATA_FILE = ROOT_DIR / 'data' / 'travail_social.json'

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---------------- Auth helpers ----------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=12), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=43200, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=604800, path="/")

def public_user(u: dict) -> dict:
    return {
        "id": str(u["_id"]),
        "email": u["email"],
        "name": u.get("name", ""),
        "role": u.get("role", "etudiant"),
        "course_codes": u.get("course_codes", []),
    }

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifié")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Jeton invalide")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur introuvable")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expirée")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Jeton invalide")

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé à l'administrateur")
    return user


# ---------------- Models ----------------
class LoginInput(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str  # enseignant | etudiant
    course_codes: List[str] = []

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None
    course_codes: Optional[List[str]] = None

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    prof: Optional[str] = None
    credits: Optional[str] = None
    schedule: Optional[str] = None
    prereq: Optional[str] = None
    desc: Optional[str] = None
    objectifs: Optional[List[str]] = None
    seances: Optional[List[dict]] = None

class ProgressInput(BaseModel):
    seance_num: str
    completed: bool

class ForumPost(BaseModel):
    text: str

class SubmissionInput(BaseModel):
    text: str

class GradeInput(BaseModel):
    grade: str
    feedback: Optional[str] = ""


# ---------------- Auth endpoints ----------------
@api_router.post("/auth/login")
async def login(data: LoginInput, response: Response):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    access = create_access_token(str(user["_id"]), email)
    refresh = create_refresh_token(str(user["_id"]))
    set_auth_cookies(response, access, refresh)
    return public_user(user)

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}

@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)

@api_router.post("/auth/refresh")
async def refresh_token_ep(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Pas de jeton de rafraîchissement")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Jeton invalide")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur introuvable")
        access = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=43200, path="/")
        return {"ok": True}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Jeton invalide")


# ---------------- User management (admin) ----------------
@api_router.get("/admin/users")
async def list_users(_: dict = Depends(require_admin)):
    users = await db.users.find({}).sort("created_at", 1).to_list(1000)
    return [public_user(u) for u in users]

@api_router.post("/admin/users")
async def create_user(data: UserCreate, _: dict = Depends(require_admin)):
    if data.role not in ("enseignant", "etudiant", "admin"):
        raise HTTPException(status_code=400, detail="Rôle invalide")
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Cet email existe déjà")
    doc = {
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "role": data.role,
        "course_codes": data.course_codes,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    return public_user(doc)

@api_router.put("/admin/users/{user_id}")
async def update_user(user_id: str, data: UserUpdate, _: dict = Depends(require_admin)):
    update = {}
    if data.name is not None:
        update["name"] = data.name
    if data.role is not None:
        update["role"] = data.role
    if data.course_codes is not None:
        update["course_codes"] = data.course_codes
    if data.password:
        update["password_hash"] = hash_password(data.password)
    if not update:
        raise HTTPException(status_code=400, detail="Aucune modification")
    res = await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    return public_user(user)

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if str(admin["_id"]) == user_id:
        raise HTTPException(status_code=400, detail="Impossible de supprimer votre propre compte")
    await db.users.delete_one({"_id": ObjectId(user_id)})
    return {"ok": True}


# ---------------- Courses ----------------
def course_summary(c: dict) -> dict:
    return {
        "code": c["code"],
        "title": c["title"],
        "year": c["year"],
        "axis": c["axis"],
        "prof": c.get("prof", ""),
        "credits": c.get("credits", ""),
        "schedule": c.get("schedule", ""),
        "desc": c.get("desc", ""),
    }

def clean_course(c: dict) -> dict:
    c = dict(c)
    c.pop("_id", None)
    return c

@api_router.get("/program")
async def get_program():
    meta = await db.program_meta.find_one({"key": "travail-social"})
    if meta:
        meta.pop("_id", None)
    return meta or {}

@api_router.get("/courses")
async def list_courses(user: dict = Depends(get_current_user)):
    courses = await db.courses.find({}).to_list(1000)
    return [course_summary(c) for c in courses]

@api_router.get("/courses/{code}")
async def get_course(code: str, user: dict = Depends(get_current_user)):
    c = await db.courses.find_one({"code": code})
    if not c:
        raise HTTPException(status_code=404, detail="Cours introuvable")
    return clean_course(c)

def can_edit_course(user: dict, code: str) -> bool:
    if user.get("role") == "admin":
        return True
    if user.get("role") == "enseignant" and code in user.get("course_codes", []):
        return True
    return False

@api_router.put("/courses/{code}")
async def update_course(code: str, data: CourseUpdate, user: dict = Depends(get_current_user)):
    if not can_edit_course(user, code):
        raise HTTPException(status_code=403, detail="Vous ne pouvez pas modifier ce cours")
    c = await db.courses.find_one({"code": code})
    if not c:
        raise HTTPException(status_code=404, detail="Cours introuvable")
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if update:
        await db.courses.update_one({"code": code}, {"$set": update})
    c = await db.courses.find_one({"code": code})
    return clean_course(c)


# ---------------- Progress ----------------
@api_router.get("/courses/{code}/progress")
async def get_progress(code: str, user: dict = Depends(get_current_user)):
    p = await db.progress.find_one({"user_id": str(user["_id"]), "code": code})
    return {"completed": (p or {}).get("completed", [])}

@api_router.put("/courses/{code}/progress")
async def set_progress(code: str, data: ProgressInput, user: dict = Depends(get_current_user)):
    uid = str(user["_id"])
    p = await db.progress.find_one({"user_id": uid, "code": code})
    completed = set((p or {}).get("completed", []))
    if data.completed:
        completed.add(data.seance_num)
    else:
        completed.discard(data.seance_num)
    await db.progress.update_one(
        {"user_id": uid, "code": code},
        {"$set": {"completed": sorted(completed)}},
        upsert=True,
    )
    return {"completed": sorted(completed)}


# ---------------- Forum ----------------
@api_router.get("/courses/{code}/forum")
async def get_forum(code: str, user: dict = Depends(get_current_user)):
    posts = await db.forum.find({"code": code}).sort("created_at", -1).to_list(500)
    for p in posts:
        p["id"] = str(p.pop("_id"))
    return posts

@api_router.post("/courses/{code}/forum")
async def add_forum_post(code: str, data: ForumPost, user: dict = Depends(get_current_user)):
    doc = {
        "code": code,
        "user_id": str(user["_id"]),
        "author_name": user.get("name", ""),
        "role": user.get("role", "etudiant"),
        "text": data.text,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.forum.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    return doc


# ---------------- Submissions (devoirs) ----------------
@api_router.get("/courses/{code}/submissions")
async def get_submissions(code: str, user: dict = Depends(get_current_user)):
    query = {"code": code}
    if user.get("role") == "etudiant":
        query["user_id"] = str(user["_id"])
    elif not can_edit_course(user, code):
        query["user_id"] = str(user["_id"])
    subs = await db.submissions.find(query).sort("created_at", -1).to_list(500)
    for s in subs:
        s["id"] = str(s.pop("_id"))
    return subs

@api_router.post("/courses/{code}/submissions")
async def add_submission(code: str, data: SubmissionInput, user: dict = Depends(get_current_user)):
    doc = {
        "code": code,
        "user_id": str(user["_id"]),
        "student_name": user.get("name", ""),
        "text": data.text,
        "grade": None,
        "feedback": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.submissions.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    return doc

@api_router.put("/submissions/{sub_id}/grade")
async def grade_submission(sub_id: str, data: GradeInput, user: dict = Depends(get_current_user)):
    sub = await db.submissions.find_one({"_id": ObjectId(sub_id)})
    if not sub:
        raise HTTPException(status_code=404, detail="Soumission introuvable")
    if not can_edit_course(user, sub["code"]):
        raise HTTPException(status_code=403, detail="Accès refusé")
    await db.submissions.update_one(
        {"_id": ObjectId(sub_id)},
        {"$set": {"grade": data.grade, "feedback": data.feedback}},
    )
    sub = await db.submissions.find_one({"_id": ObjectId(sub_id)})
    sub["id"] = str(sub.pop("_id"))
    return sub


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------- Startup: seed ----------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.courses.create_index("code", unique=True)
    # Seed courses & program meta from JSON (idempotent)
    if await db.courses.count_documents({}) == 0:
        with open(DATA_FILE, encoding="utf-8") as f:
            data = json.load(f)
        if data.get("courses"):
            await db.courses.insert_many([dict(c) for c in data["courses"]])
        await db.program_meta.update_one(
            {"key": "travail-social"},
            {"$set": {
                "key": "travail-social",
                "meta": data.get("programMeta", {}),
                "axes": data.get("axes", []),
                "axisDesc": data.get("axisDesc", {}),
            }},
            upsert=True,
        )
        logger.info("Seeded %d courses", len(data.get("courses", [])))
    # Seed admin (idempotent)
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    admin_name = os.environ.get("ADMIN_NAME", "Admin")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": admin_name,
            "role": "admin",
            "course_codes": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Admin created: %s", admin_email)
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}})


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

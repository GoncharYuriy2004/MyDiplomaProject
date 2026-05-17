from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from jose import JWTError, jwt
from bson import ObjectId
from datetime import datetime

from dotenv import load_dotenv
import pathlib
from auth_utils import (
    get_password_hash,
    verify_password,
    create_access_token,
    SECRET_KEY,
    ALGORITHM,
)
import motor.motor_asyncio
import httpx
import os

load_dotenv(pathlib.Path(__file__).parent / ".env")

app = FastAPI(title="IT-WMS API", version="1.0.0")

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Database ──────────────────────────────────────────────────────────────────
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME   = os.getenv("DB_NAME", "user_Diplom")
client    = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db        = client[DB_NAME]

persons_col      = db["persons"]
suppliers_col    = db["suppliers"]
items_col        = db["mtak"]          # МтаК — матеріально-технічні цінності
transactions_col = db["transactions"]
documents_col    = db["documents"]
procurement_col  = db["procurement_orders"]

# ── Shared DB (DiplomDB — users shared with C# server) ───────────────────────
diplom_db           = client["DiplomDB"]
users_col           = diplom_db["users"]
detail_requests_col = diplom_db["detail_requests"]

# ── C# server base URL ────────────────────────────────────────────────────────
CS_API = os.getenv("CS_API_URL", "http://87.244.166.92:666")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# ═══════════════════════════════════════════════════════════════════════════════
# ROLE HELPERS
# ═══════════════════════════════════════════════════════════════════════════════
_VALID_ROLES = {"WAREHOUSE_MANAGER", "WAREHOUSE_WORKER"}

# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════
def to_oid(value: Optional[str]) -> Optional[ObjectId]:
    if value is None:
        return None
    try:
        return ObjectId(value)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid ObjectId: {value}")

def safe_to_oid(value: Optional[str]):
    """Convert to ObjectId if possible; keep as string otherwise (e.g. email-based user IDs)."""
    if not value:
        return None
    try:
        return ObjectId(value)
    except Exception:
        return value

def _oid_str(v) -> Optional[str]:
    return str(v) if isinstance(v, ObjectId) else (v if v else None)

def serialize(doc: dict) -> dict:
    """Generic serializer for transactions / documents."""
    if doc is None:
        return None
    doc = dict(doc)
    doc["_id"] = str(doc["_id"])
    for key in ("supplier_id", "issued_by", "written_off_by",
                "user_id", "document_id", "item_id", "created_by"):
        if key in doc and isinstance(doc[key], ObjectId):
            doc[key] = str(doc[key])
    return doc

# ═══════════════════════════════════════════════════════════════════════════════
# COLLECTION FIELD MAPPERS  (diagram schema ↔ API schema)
# ═══════════════════════════════════════════════════════════════════════════════

# ── User ──────────────────────────────────────────────────────────────────────
def user_from_db(doc: dict) -> dict:
    """DB fields → API fields for User."""
    if doc is None:
        return None
    return {
        "_id":            str(doc["_id"]),
        "login":          doc.get("login", ""),
        "full_name":      doc.get("full_name", ""),
        "role_in_system": doc.get("role_in_system", ""),
        "account_status": doc.get("account_status", ""),
        "pass_number":    doc.get("pass_number", 0),
        "position":       doc.get("position", ""),
        "phone":          doc.get("phone", ""),
        "email":          doc.get("email", ""),
        "last_login":     doc.get("last_login").isoformat() if doc.get("last_login") else None,
        "created_at":     doc.get("created_at").isoformat() if doc.get("created_at") else None,
    }

# ── Suppliers ─────────────────────────────────────────────────────────────────
def supplier_to_db(data: dict) -> dict:
    """API fields → DB Ukrainian fields for Suppliers class."""
    return {
        "Код":              data.get("code", ""),
        "Ім'я":             data.get("name", ""),
        "Адреса":           data.get("address", ""),
        "IBAN":             data.get("iban", ""),
        "Контактна особа":  data.get("contact_person", ""),
        "Електронна пошта": data.get("email", ""),
        "Телеграма":        data.get("telegram", ""),
        "Телефон":          data.get("phone", ""),
        "edrpou":           data.get("edrpou", ""),
    }

def supplier_from_db(doc: dict) -> dict:
    """DB Ukrainian fields → API fields for Suppliers class."""
    if doc is None:
        return None
    # Support both old seed data field names and new schema
    name  = doc.get("Ім'я") or doc.get("Імя", "")
    email = doc.get("Електронна пошта") or doc.get("Електронна_пошта", "")
    cp    = doc.get("Контактна особа") or doc.get("Контактна_особа", "")
    return {
        "_id":            str(doc["_id"]),
        "code":           doc.get("Код", ""),
        "name":           name,
        "edrpou":         doc.get("edrpou", ""),
        "address":        doc.get("Адреса", ""),
        "iban":           doc.get("IBAN", ""),
        "contact_person": cp,
        "email":          email,
        "telegram":       doc.get("Телеграма", ""),
        "phone":          doc.get("Телефон", ""),
        "contact_info":   email,
        "bank_details":   doc.get("IBAN", ""),
    }

# ── МтаК (items) ──────────────────────────────────────────────────────────────
def item_to_db(data: dict) -> dict:
    """API fields → DB Ukrainian fields for МтаК class."""
    return {
        "ID_м_кл":                     data.get("sku", ""),
        "ID_Постачальника":            to_oid(data.get("supplier_id")),
        "ID_хто_видав":                safe_to_oid(data.get("issued_by")),
        "ID_кому_видає":               data.get("issued_to", ""),   # plain string
        "ID_хто_списав":               safe_to_oid(data.get("written_off_by")),
        "назва":                       data.get("name", ""),
        "категорія":                   data.get("category", ""),
        "тип":                         data.get("type", ""),
        "кількість":                   float(data.get("current_stock", 0)),
        "min_stock":                   float(data.get("min_stock", 0)),
        "одиниця":                     data.get("unit", "шт"),
        "ідентифікатор_постачальника": data.get("supplier_sku", ""),
        "ціна":                        float(data.get("unit_price", 0)),
        "tax_rate":                    float(data.get("tax_rate", 0.20)),
        "статус":                      data.get("status", "available"),
        "дата_отримання":              data.get("received_date"),
        "термін_придатності":          data.get("expiry_date"),
        "дата_постачання":             data.get("delivery_date"),
        "дата_виконання_списання":     data.get("writeoff_date"),
        "дата_видачі":                 data.get("issued_date"),
        "received_by":                 data.get("received_by"),
        "writeoff_reason":             data.get("writeoff_reason"),
    }

def item_from_db(doc: dict) -> dict:
    """DB Ukrainian fields → API fields for МтаК class."""
    if doc is None:
        return None
    return {
        "_id":           str(doc["_id"]),
        "name":          doc.get("назва", ""),
        "sku":           doc.get("ID_м_кл", ""),
        "category":      str(doc.get("категорія", "")),
        "type":          doc.get("тип", ""),
        "current_stock": float(doc.get("кількість", 0)),
        "min_stock":     float(doc.get("min_stock", 0)),
        "unit":          doc.get("одиниця", "шт"),
        "unit_price":    float(doc.get("ціна", 0)),
        "tax_rate":      float(doc.get("tax_rate", 0.20)),
        "supplier_id":   _oid_str(doc.get("ID_Постачальника")),
        "issued_by":     _oid_str(doc.get("ID_хто_видав")),
        "issued_to":     doc.get("ID_кому_видає", ""),
        "written_off_by": _oid_str(doc.get("ID_хто_списав")),
        "status":        doc.get("статус", "available"),
        "received_date": doc.get("дата_отримання"),
        "expiry_date":   doc.get("термін_придатності"),
        "delivery_date": doc.get("дата_постачання"),
        "writeoff_date": doc.get("дата_виконання_списання"),
        "issued_date":   doc.get("дата_видачі"),
        "received_by":   doc.get("received_by"),
        "writeoff_reason": doc.get("writeoff_reason"),
    }

# ── Persons ───────────────────────────────────────────────────────────────────
def person_to_db(data: dict) -> dict:
    """API fields → DB Ukrainian fields for Persons class."""
    return {
        "ID_Користувача":   to_oid(data.get("user_id")),
        "FIO":              data.get("fio", ""),
        "Електронна пошта": data.get("email", ""),
        "Опис":             data.get("description", ""),
        "Дата початку":     data.get("start_date"),
        "Дата закінчення":  data.get("end_date"),
        "Робота":           data.get("job", ""),
    }

def person_from_db(doc: dict) -> dict:
    """DB Ukrainian fields → API fields for Persons class."""
    if doc is None:
        return None
    uid = doc.get("ID_Користувача")
    return {
        "_id":         str(doc["_id"]),
        "fio":         doc.get("FIO", "") or doc.get("ФІО", ""),
        "email":       doc.get("Електронна пошта", "") or doc.get("Електронна_пошта", ""),
        "description": doc.get("Опис", "") or doc.get("Коментарій", ""),
        "start_date":  doc.get("Дата початку") or doc.get("Дата_початку"),
        "end_date":    doc.get("Дата закінчення"),
        "job":         doc.get("Робота", "") or doc.get("Роботи", ""),
        "user_id":     str(uid) if isinstance(uid, ObjectId) else uid,
    }

# ═══════════════════════════════════════════════════════════════════════════════
# AUTH DEPENDENCY
# ═══════════════════════════════════════════════════════════════════════════════
async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        login: str = payload.get("sub")
        role:  str = payload.get("role")
        if not login:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"login": login, "role": role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

async def require_manager(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] != "WAREHOUSE_MANAGER":
        raise HTTPException(status_code=403, detail="Manager access required")
    return current_user

# ═══════════════════════════════════════════════════════════════════════════════
# AUTH  — User class
# ═══════════════════════════════════════════════════════════════════════════════
class UserRegister(BaseModel):
    full_name:       str
    pass_number:     int
    login:           str
    password:        str
    role_in_system:  str   # WAREHOUSE_MANAGER | WAREHOUSE_WORKER
    position:        str = ""
    phone:           str = ""
    email:           str = ""
    floor_number:    int = 0
    office_number:   int = 0
    workshop_number: int = 0

class UserLogin(BaseModel):
    login:    str
    password: str

@app.post("/auth/register", status_code=201)
async def register(user: UserRegister):
    if user.role_in_system not in _VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"role_in_system must be one of {_VALID_ROLES}")

    if await users_col.find_one({"login": user.login}):
        raise HTTPException(status_code=400, detail="Login already taken")

    # Managers activate immediately; workers need manager approval
    status = "ACTIVE" if user.role_in_system == "WAREHOUSE_MANAGER" else "REGISTRATION"

    doc = {
        "full_name":       user.full_name,
        "pass_number":     user.pass_number,
        "role_in_system":  user.role_in_system,
        "login":           user.login,
        "password_hash":   get_password_hash(user.password),
        "position":        user.position,
        "phone":           user.phone,
        "email":           user.email,
        "account_status":  status,
        "floor_number":    user.floor_number,
        "office_number":   user.office_number,
        "workshop_number": user.workshop_number,
        "created_at":      datetime.utcnow(),
    }
    result = await users_col.insert_one(doc)
    msg = "Account created successfully." if status == "ACTIVE" else "Account created. Waiting for manager activation."
    return {"message": msg, "id": str(result.inserted_id)}

@app.post("/auth/login")
async def login(creds: UserLogin):
    # Try direct DB login first (DiplomDB, Python-hashed passwords)
    user = await users_col.find_one({"login": creds.login})

    if user and user.get("password_hash"):
        if not verify_password(creds.password, user["password_hash"]):
            raise HTTPException(status_code=400, detail="Invalid credentials")
        status = user.get("account_status", "REGISTRATION")
        if status != "ACTIVE":
            raise HTTPException(status_code=403, detail="Account not activated. Contact your manager.")
        await users_col.update_one({"_id": user["_id"]}, {"$set": {"last_login": datetime.utcnow()}})
        token = create_access_token(data={"sub": user["login"], "role": user.get("role_in_system", "WAREHOUSE_WORKER")})
        return {
            "access_token": token, "token_type": "bearer",
            "user": {"login": user["login"], "role": user.get("role_in_system", "WAREHOUSE_WORKER"),
                     "full_name": user.get("full_name", ""), "account_status": status},
        }

    # Fallback: delegate to C# server (handles ASP.NET Identity hashes)
    try:
        async with httpx.AsyncClient(timeout=10) as client_http:
            cs_resp = await client_http.post(f"{CS_API}/api/auth/login",
                                             json={"login": creds.login, "password": creds.password})
        if cs_resp.status_code != 200:
            cs_msg = cs_resp.json().get("message", "Invalid credentials")
            if "inactive" in cs_msg.lower():
                raise HTTPException(status_code=403, detail="Account not activated. Contact your manager.")
            raise HTTPException(status_code=400, detail="Invalid credentials")

        cs_token = cs_resp.json().get("token", "")
        # Get user details from C#
        async with httpx.AsyncClient(timeout=10) as client_http:
            me_resp = await client_http.get(f"{CS_API}/api/auth/me",
                                            headers={"Authorization": f"Bearer {cs_token}"})
        if me_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid credentials")
        me = me_resp.json()
        role = me.get("role", "WAREHOUSE_WORKER")
        full_name = me.get("fullName", creds.login)

        # Upsert user in DiplomDB so future logins work directly
        await users_col.update_one(
            {"login": creds.login},
            {"$set": {"login": creds.login, "full_name": full_name, "role_in_system": role,
                      "account_status": "ACTIVE", "last_login": datetime.utcnow()}},
            upsert=True,
        )
        token = create_access_token(data={"sub": creds.login, "role": role})
        return {
            "access_token": token, "token_type": "bearer",
            "user": {"login": creds.login, "role": role, "full_name": full_name, "account_status": "ACTIVE"},
        }
    except httpx.RequestError:
        raise HTTPException(status_code=400, detail="Invalid credentials")

@app.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user = await users_col.find_one({"login": current_user["login"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user_from_db(user)

# ═══════════════════════════════════════════════════════════════════════════════
# USERS MANAGEMENT  (manager only)
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/users")
async def list_users(_: dict = Depends(get_current_user)):
    docs = await users_col.find().to_list(length=None)
    return [user_from_db(d) for d in docs]

@app.patch("/users/{uid}/activate")
async def activate_user(uid: str, _: dict = Depends(require_manager)):
    result = await users_col.update_one(
        {"_id": to_oid(uid)},
        {"$set": {"account_status": "ACTIVE"}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return user_from_db(await users_col.find_one({"_id": to_oid(uid)}))

@app.patch("/users/{uid}/deactivate")
async def deactivate_user(uid: str, _: dict = Depends(require_manager)):
    result = await users_col.update_one(
        {"_id": to_oid(uid)},
        {"$set": {"account_status": "INACTIVE"}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return user_from_db(await users_col.find_one({"_id": to_oid(uid)}))

# ═══════════════════════════════════════════════════════════════════════════════
# SUPPLIERS  — Suppliers class
# ═══════════════════════════════════════════════════════════════════════════════
class SupplierModel(BaseModel):
    code:           str = ""
    name:           str
    edrpou:         str = ""
    address:        str = ""
    iban:           str = ""
    contact_person: str = ""
    email:          str = ""
    telegram:       str = ""
    phone:          str = ""

@app.get("/suppliers")
async def list_suppliers(_: dict = Depends(get_current_user)):
    docs = await suppliers_col.find().to_list(length=None)
    return [supplier_from_db(d) for d in docs]

@app.get("/suppliers/{sid}")
async def get_supplier(sid: str, _: dict = Depends(get_current_user)):
    doc = await suppliers_col.find_one({"_id": to_oid(sid)})
    if not doc:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier_from_db(doc)

@app.post("/suppliers", status_code=201)
async def create_supplier(body: SupplierModel, _: dict = Depends(require_manager)):
    doc = supplier_to_db(body.model_dump())
    result = await suppliers_col.insert_one(doc)
    return supplier_from_db(await suppliers_col.find_one({"_id": result.inserted_id}))

@app.put("/suppliers/{sid}")
async def update_supplier(sid: str, body: SupplierModel, _: dict = Depends(require_manager)):
    doc = supplier_to_db(body.model_dump())
    result = await suppliers_col.update_one({"_id": to_oid(sid)}, {"$set": doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier_from_db(await suppliers_col.find_one({"_id": to_oid(sid)}))

@app.delete("/suppliers/{sid}")
async def delete_supplier(sid: str, _: dict = Depends(require_manager)):
    result = await suppliers_col.delete_one({"_id": to_oid(sid)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return {"message": "Supplier deleted"}

# ═══════════════════════════════════════════════════════════════════════════════
# ITEMS (МтаК)  — МтаК class
# ═══════════════════════════════════════════════════════════════════════════════
class ItemModel(BaseModel):
    model_config = {"extra": "allow"}

    name:           str
    sku:            str           = ""
    category:       str           = ""
    type:           str           = ""
    current_stock:  float         = 0
    min_stock:      float         = 0
    unit:           str           = "шт"
    unit_price:     float         = 0
    tax_rate:       float         = 0.20
    supplier_id:    Optional[str] = None
    status:         str           = "available"
    received_date:  Optional[str] = None
    received_by:    Optional[str] = None
    expiry_date:    Optional[str] = None
    delivery_date:  Optional[str] = None
    issued_date:    Optional[str] = None
    writeoff_date:  Optional[str] = None
    issued_by:      Optional[str] = None
    issued_to:      Optional[str] = None
    written_off_by: Optional[str] = None
    writeoff_reason: Optional[str] = None
    supplier_sku:   Optional[str] = None

@app.get("/items")
async def list_items(
    status:   Optional[str] = None,
    category: Optional[str] = None,
    _: dict = Depends(get_current_user),
):
    query: dict = {}
    if status:
        query["статус"] = status       # map English param → Ukrainian DB field
    if category:
        query["категорія"] = category
    docs = await items_col.find(query).to_list(length=None)
    return [item_from_db(d) for d in docs]

@app.get("/items/{iid}")
async def get_item(iid: str, _: dict = Depends(get_current_user)):
    doc = await items_col.find_one({"_id": to_oid(iid)})
    if not doc:
        raise HTTPException(status_code=404, detail="Item not found")
    return item_from_db(doc)

@app.post("/items", status_code=201)
async def create_item(body: ItemModel, _: dict = Depends(get_current_user)):
    doc = item_to_db(body.model_dump())
    result = await items_col.insert_one(doc)
    return item_from_db(await items_col.find_one({"_id": result.inserted_id}))

@app.put("/items/{iid}")
async def update_item(iid: str, body: ItemModel, _: dict = Depends(get_current_user)):
    doc = item_to_db(body.model_dump())
    result = await items_col.update_one({"_id": to_oid(iid)}, {"$set": doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return item_from_db(await items_col.find_one({"_id": to_oid(iid)}))

@app.delete("/items/{iid}")
async def delete_item(iid: str, _: dict = Depends(require_manager)):
    result = await items_col.delete_one({"_id": to_oid(iid)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted"}

# ═══════════════════════════════════════════════════════════════════════════════
# PERSONS  — Persons class
# ═══════════════════════════════════════════════════════════════════════════════
class PersonModel(BaseModel):
    fio:         str
    email:       str           = ""
    description: str           = ""
    start_date:  Optional[str] = None
    end_date:    Optional[str] = None
    job:         str           = ""
    user_id:     Optional[str] = None

@app.get("/persons")
async def list_persons(_: dict = Depends(get_current_user)):
    docs = await persons_col.find().to_list(length=None)
    return [person_from_db(d) for d in docs]

@app.get("/persons/{pid}")
async def get_person(pid: str, _: dict = Depends(get_current_user)):
    doc = await persons_col.find_one({"_id": to_oid(pid)})
    if not doc:
        raise HTTPException(status_code=404, detail="Person not found")
    return person_from_db(doc)

@app.post("/persons", status_code=201)
async def create_person(body: PersonModel, _: dict = Depends(require_manager)):
    doc = person_to_db(body.model_dump())
    result = await persons_col.insert_one(doc)
    return person_from_db(await persons_col.find_one({"_id": result.inserted_id}))

@app.put("/persons/{pid}")
async def update_person(pid: str, body: PersonModel, _: dict = Depends(require_manager)):
    doc = person_to_db(body.model_dump())
    result = await persons_col.update_one({"_id": to_oid(pid)}, {"$set": doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Person not found")
    return person_from_db(await persons_col.find_one({"_id": to_oid(pid)}))

@app.delete("/persons/{pid}")
async def delete_person(pid: str, _: dict = Depends(require_manager)):
    result = await persons_col.delete_one({"_id": to_oid(pid)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Person not found")
    return {"message": "Person deleted"}

# ═══════════════════════════════════════════════════════════════════════════════
# TRANSACTIONS
# ═══════════════════════════════════════════════════════════════════════════════
class TransactionModel(BaseModel):
    model_config = {"extra": "allow"}

    type:            str
    product_id:      Optional[str] = None
    item_id:         Optional[str] = None
    quantity:        float          = 0
    user_id:         Optional[str] = None
    document_id:     Optional[str] = None
    ref_document_id: Optional[str] = None
    date:            Optional[str] = None
    notes:           Optional[str] = None
    returned_from:   Optional[str] = None

@app.get("/transactions")
async def list_transactions(
    type: Optional[str] = None,
    _: dict = Depends(get_current_user),
):
    query: dict = {}
    if type:
        query["type"] = type
    docs = await transactions_col.find(query).sort("date", -1).to_list(length=None)
    return [serialize(d) for d in docs]

@app.post("/transactions", status_code=201)
async def create_transaction(body: TransactionModel, _: dict = Depends(get_current_user)):
    doc = body.model_dump()
    raw_item_id = doc.pop("product_id", None) or doc.pop("item_id", None)
    doc["item_id"]     = to_oid(raw_item_id) if raw_item_id else None
    doc["user_id"]     = safe_to_oid(doc.get("user_id"))
    doc["document_id"] = safe_to_oid(doc.get("document_id"))
    doc.pop("ref_document_id", None)
    doc["date"] = doc.get("date") or datetime.utcnow().isoformat()
    result = await transactions_col.insert_one(doc)
    return serialize(await transactions_col.find_one({"_id": result.inserted_id}))

# ═══════════════════════════════════════════════════════════════════════════════
# DOCUMENTS
# ═══════════════════════════════════════════════════════════════════════════════
class DocumentModel(BaseModel):
    model_config = {"extra": "allow"}

    type:          str
    status:        str            = "pending"
    created_by:    Optional[str] = None
    created_at:    Optional[str] = None
    items:         List[Any]     = []
    total_sum:     Optional[float] = None
    total_vat:     Optional[float] = None
    item_id:       Optional[str] = None
    quantity:      Optional[float] = None
    recipient:     Optional[str] = None
    reason:        Optional[str] = None
    notes:         Optional[str] = None
    discrepancies: List[Any]     = []

@app.get("/documents")
async def list_documents(
    status: Optional[str] = None,
    type:   Optional[str] = None,
    _: dict = Depends(get_current_user),
):
    query: dict = {}
    if status:
        query["status"] = status
    if type:
        query["type"] = type
    docs = await documents_col.find(query).sort("created_at", -1).to_list(length=None)
    return [serialize(d) for d in docs]

@app.get("/documents/{did}")
async def get_document(did: str, _: dict = Depends(get_current_user)):
    doc = await documents_col.find_one({"_id": to_oid(did)})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return serialize(doc)

@app.post("/documents", status_code=201)
async def create_document(body: DocumentModel, _: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["created_at"] = doc.get("created_at") or datetime.utcnow().isoformat()
    doc["created_by"] = safe_to_oid(doc.get("created_by"))
    result = await documents_col.insert_one(doc)
    return serialize(await documents_col.find_one({"_id": result.inserted_id}))

@app.put("/documents/{did}")
async def update_document(did: str, body: DocumentModel, _: dict = Depends(require_manager)):
    doc = body.model_dump()
    doc["created_by"] = safe_to_oid(doc.get("created_by"))
    result = await documents_col.update_one({"_id": to_oid(did)}, {"$set": doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return serialize(await documents_col.find_one({"_id": to_oid(did)}))

@app.patch("/documents/{did}/approve")
async def approve_document(did: str, _: dict = Depends(require_manager)):
    result = await documents_col.update_one(
        {"_id": to_oid(did)},
        {"$set": {"status": "approved"}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return serialize(await documents_col.find_one({"_id": to_oid(did)}))

@app.patch("/documents/{did}/reject")
async def reject_document(did: str, _: dict = Depends(require_manager)):
    result = await documents_col.update_one(
        {"_id": to_oid(did)},
        {"$set": {"status": "rejected"}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return serialize(await documents_col.find_one({"_id": to_oid(did)}))

@app.delete("/documents/{did}")
async def delete_document(did: str, _: dict = Depends(require_manager)):
    result = await documents_col.delete_one({"_id": to_oid(did)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted"}

# ═══════════════════════════════════════════════════════════════════════════════
# STATS
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/stats")
async def get_stats(_: dict = Depends(get_current_user)):
    total_items     = await items_col.count_documents({})
    available       = await items_col.count_documents({"статус": "available"})
    issued          = await items_col.count_documents({"статус": "issued"})
    written_off     = await items_col.count_documents({"статус": "written_off"})
    damaged         = await items_col.count_documents({"статус": "damaged"})
    total_suppliers = await suppliers_col.count_documents({})
    pending_docs    = await documents_col.count_documents({"status": "pending"})

    pipeline = [
        {"$match": {"статус": "available"}},
        {"$group": {"_id": None,
                    "total": {"$sum": {"$multiply": ["$кількість", "$ціна"]}}}},
    ]
    agg = await items_col.aggregate(pipeline).to_list(length=1)
    stock_value = agg[0]["total"] if agg else 0

    return {
        "total_items":       total_items,
        "available":         available,
        "issued":            issued,
        "written_off":       written_off,
        "damaged":           damaged,
        "total_suppliers":   total_suppliers,
        "pending_approvals": pending_docs,
        "total_stock_value": round(stock_value, 2),
    }

# ═══════════════════════════════════════════════════════════════════════════════
# PROCUREMENT ORDERS
# ═══════════════════════════════════════════════════════════════════════════════
class ProcurementModel(BaseModel):
    item_id:       Optional[str] = None
    supplier_id:   Optional[str] = None
    item_name:     str           = ""
    supplier_name: str           = ""
    quantity:      float         = 1
    unit_price:    float         = 0
    total:         float         = 0
    status:        str           = "planned"   # planned | ordered | received
    date:          Optional[str] = None
    created_by:    Optional[str] = None

def procurement_from_db(doc: dict) -> dict:
    if doc is None:
        return None
    return {
        "_id":           str(doc["_id"]),
        "item_id":       _oid_str(doc.get("item_id")),
        "supplier_id":   _oid_str(doc.get("supplier_id")),
        "item_name":     doc.get("item_name", ""),
        "supplier_name": doc.get("supplier_name", ""),
        "quantity":      float(doc.get("quantity", 1)),
        "unit_price":    float(doc.get("unit_price", 0)),
        "total":         float(doc.get("total", 0)),
        "status":        doc.get("status", "planned"),
        "date":          doc.get("date"),
        "created_by":    _oid_str(doc.get("created_by")),
    }

@app.get("/procurement")
async def list_procurement(_: dict = Depends(get_current_user)):
    docs = await procurement_col.find().sort("date", -1).to_list(length=None)
    return [procurement_from_db(d) for d in docs]

@app.post("/procurement", status_code=201)
async def create_procurement(body: ProcurementModel, current_user: dict = Depends(require_manager)):
    doc = body.model_dump()
    doc["item_id"]    = to_oid(doc.get("item_id"))
    doc["supplier_id"] = to_oid(doc.get("supplier_id"))
    doc["created_by"] = None
    user = await users_col.find_one({"login": current_user["login"]})
    if user:
        doc["created_by"] = user["_id"]
    doc["date"] = doc.get("date") or datetime.utcnow().isoformat()
    result = await procurement_col.insert_one(doc)
    return procurement_from_db(await procurement_col.find_one({"_id": result.inserted_id}))

@app.patch("/procurement/{pid}/status")
async def update_procurement_status(pid: str, status: str, _: dict = Depends(require_manager)):
    allowed = {"planned", "ordered", "received"}
    if status not in allowed:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {allowed}")

    order = await procurement_col.find_one({"_id": to_oid(pid)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    await procurement_col.update_one(
        {"_id": to_oid(pid)},
        {"$set": {"status": status}},
    )

    # When order is received for the first time — increment item stock and create a transaction
    if status == "received" and order.get("status") != "received":
        item_oid = order.get("item_id")
        qty = float(order.get("quantity", 0))
        if item_oid and qty > 0:
            await items_col.update_one(
                {"_id": item_oid},
                {"$inc": {"кількість": qty}},
            )
            await transactions_col.insert_one({
                "type":        "in",
                "item_id":     item_oid,
                "quantity":    qty,
                "date":        datetime.utcnow().isoformat(),
                "notes":       f"Надходження за замовленням закупівлі",
                "user_id":     None,
                "document_id": None,
            })

    return procurement_from_db(await procurement_col.find_one({"_id": to_oid(pid)}))

@app.delete("/procurement/{pid}")
async def delete_procurement(pid: str, _: dict = Depends(require_manager)):
    result = await procurement_col.delete_one({"_id": to_oid(pid)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order deleted"}

# ═══════════════════════════════════════════════════════════════════════════════
# DETAIL REQUESTS  (read from DiplomDB, update status only)
# ═══════════════════════════════════════════════════════════════════════════════
def detail_request_from_db(doc: dict) -> dict:
    if doc is None:
        return None
    return {
        "_id":           str(doc["_id"]),
        "order_id":      str(doc["order_id"])      if doc.get("order_id")      else None,
        "specialist_id": str(doc["specialist_id"]) if doc.get("specialist_id") else None,
        "detail_needs":  doc.get("detail_needs", ""),
        "explanation":   doc.get("explanation", ""),
        "photos":        doc.get("photos", []),
        "status":        doc.get("status", "CREATED"),
        "approved_by":   doc.get("approved_by"),
        "approved_at":   doc.get("approved_at"),
        "created_at":    doc.get("created_at").isoformat() if hasattr(doc.get("created_at"), "isoformat") else str(doc.get("created_at", "")),
    }

class DetailRequestStatusUpdate(BaseModel):
    approved_by: str   # full name of the worker

@app.get("/detail-requests")
async def list_detail_requests(_: dict = Depends(get_current_user)):
    docs = await detail_requests_col.find().sort("created_at", -1).to_list(length=None)
    return [detail_request_from_db(d) for d in docs]

async def _update_detail_request_status(rid: str, fields: dict) -> dict:
    """Update a detail-request status, handling both ObjectId and string _id (C# compat)."""
    oid = safe_to_oid(rid)
    # Try ObjectId first, fall back to raw string (C# may store _id as string)
    for id_val in ([oid, rid] if oid != rid else [rid]):
        result = await detail_requests_col.update_one({"_id": id_val}, {"$set": fields})
        if result.matched_count > 0:
            doc = await detail_requests_col.find_one({"_id": id_val})
            return detail_request_from_db(doc)
    raise HTTPException(status_code=404, detail="Request not found")

@app.patch("/detail-requests/{rid}/approve")
async def approve_detail_request(rid: str, body: DetailRequestStatusUpdate, _: dict = Depends(get_current_user)):
    return await _update_detail_request_status(rid, {
        "status":      "APPROVED",
        "approved_by": body.approved_by,
        "approved_at": datetime.utcnow().isoformat(),
    })

@app.patch("/detail-requests/{rid}/reject")
async def reject_detail_request(rid: str, body: DetailRequestStatusUpdate, _: dict = Depends(get_current_user)):
    return await _update_detail_request_status(rid, {
        "status":      "REJECTED",
        "approved_by": body.approved_by,
        "approved_at": datetime.utcnow().isoformat(),
    })

@app.patch("/detail-requests/{rid}/wait")
async def wait_detail_request(rid: str, body: DetailRequestStatusUpdate, _: dict = Depends(get_current_user)):
    return await _update_detail_request_status(rid, {
        "status":      "WAITING",
        "approved_by": body.approved_by,
        "approved_at": datetime.utcnow().isoformat(),
    })

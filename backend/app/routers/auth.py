from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from ..database import get_db
from ..models import User
from ..schemas import UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post("/register", response_model=UserOut)
def register(data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    if data.role not in ("student", "teacher"):
        raise HTTPException(status_code=400, detail="Invalid role")

    user = User(
        username=data.username,
        password_hash=pwd_context.hash(data.password),
        role=data.role,
        year=data.year if data.role == "student" else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=UserOut)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not pwd_context.verify(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user

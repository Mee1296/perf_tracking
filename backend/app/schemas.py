from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from .models import StatusEnum


class UserCreate(BaseModel):
    username: str
    password: str
    role: str
    year: Optional[int] = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    role: str
    year: Optional[int] = None

    model_config = {"from_attributes": True}


class AssignmentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: datetime
    max_score: Optional[float] = 100.0


class AssignmentOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    due_date: datetime
    created_at: datetime
    teacher_id: int
    max_score: Optional[float] = None

    model_config = {"from_attributes": True}


class SubmissionOut(BaseModel):
    id: int
    assignment_id: int
    student_id: int
    submitted_at: Optional[datetime]
    status: StatusEnum
    score: Optional[float]
    max_score: Optional[float]
    student_note: Optional[str]
    teacher_note: Optional[str]
    assignment: Optional[AssignmentOut] = None

    model_config = {"from_attributes": True}


class GradeUpdate(BaseModel):
    score: float
    teacher_note: Optional[str] = None


class StudentNoteUpdate(BaseModel):
    student_note: str

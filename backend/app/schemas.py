from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from .models import StatusEnum, SubmissionTypeEnum


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
    weight: Optional[float] = 100.0
    submission_type: Optional[SubmissionTypeEnum] = SubmissionTypeEnum.text
    question: Optional[str] = None
    choices: Optional[str] = None  # JSON string


class AssignmentOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    due_date: datetime
    created_at: datetime
    teacher_id: int
    max_score: Optional[float] = None
    weight: float = 100.0
    submission_type: SubmissionTypeEnum = SubmissionTypeEnum.text
    question: Optional[str] = None
    choices: Optional[str] = None

    model_config = {"from_attributes": True}


class SubmissionOut(BaseModel):
    id: int
    assignment_id: int
    student_id: int
    submitted_at: Optional[datetime]
    status: StatusEnum
    score: Optional[float]
    max_score: Optional[float]
    teacher_note: Optional[str]
    answer_text: Optional[str] = None
    selected_choice: Optional[int] = None
    file_name: Optional[str] = None
    assignment: Optional[AssignmentOut] = None

    model_config = {"from_attributes": True}


class GradeUpdate(BaseModel):
    score: float
    teacher_note: Optional[str] = None


class SubmitAnswer(BaseModel):
    answer_text: Optional[str] = None
    selected_choice: Optional[int] = None
    file_name: Optional[str] = None  # mocked

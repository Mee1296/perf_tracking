from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .database import Base


class RoleEnum(str, enum.Enum):
    student = "student"
    teacher = "teacher"


class StatusEnum(str, enum.Enum):
    pending = "pending"
    submitted = "submitted"
    graded = "graded"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    year = Column(Integer, nullable=True)  # only for students

    submissions = relationship("Submission", back_populates="student", foreign_keys="Submission.student_id")
    assignments_created = relationship("Assignment", back_populates="teacher")


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    teacher = relationship("User", back_populates="assignments_created")
    submissions = relationship("Submission", back_populates="assignment")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    submitted_at = Column(DateTime, nullable=True)
    status = Column(Enum(StatusEnum), default=StatusEnum.pending)
    score = Column(Float, nullable=True)
    max_score = Column(Float, nullable=True)
    student_note = Column(Text, nullable=True)
    teacher_note = Column(Text, nullable=True)

    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("User", back_populates="submissions", foreign_keys=[student_id])

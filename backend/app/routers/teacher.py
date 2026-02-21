from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from datetime import datetime
from typing import List, Optional

from ..database import get_db
from ..models import User, Assignment, Submission, StatusEnum, RoleEnum
from ..schemas import AssignmentCreate, AssignmentOut, SubmissionOut, GradeUpdate, UserOut

router = APIRouter(prefix="/teacher", tags=["teacher"])


def get_teacher(teacher_id: int, db: Session):
    user = db.query(User).filter(User.id == teacher_id, User.role == RoleEnum.teacher).first()
    if not user:
        raise HTTPException(status_code=403, detail="Teacher not found")
    return user


@router.get("/students", response_model=List[UserOut])
def list_students(teacher_id: int = Query(...), db: Session = Depends(get_db)):
    get_teacher(teacher_id, db)
    return db.query(User).filter(User.role == RoleEnum.student).all()


@router.post("/assignments", response_model=AssignmentOut)
def create_assignment(data: AssignmentCreate, teacher_id: int = Query(...), db: Session = Depends(get_db)):
    get_teacher(teacher_id, db)
    assignment = Assignment(
        title=data.title,
        description=data.description,
        due_date=data.due_date,
        teacher_id=teacher_id,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    # Auto-create pending submissions for all students
    students = db.query(User).filter(User.role == RoleEnum.student).all()
    for student in students:
        sub = Submission(
            assignment_id=assignment.id,
            student_id=student.id,
            status=StatusEnum.pending,
            max_score=data.max_score,
        )
        db.add(sub)
    db.commit()
    return assignment


@router.get("/assignments", response_model=List[AssignmentOut])
def list_assignments(teacher_id: int = Query(...), db: Session = Depends(get_db)):
    get_teacher(teacher_id, db)
    return db.query(Assignment).filter(Assignment.teacher_id == teacher_id).order_by(Assignment.due_date).all()


@router.get("/students/{student_id}/submissions", response_model=List[SubmissionOut])
def get_student_submissions(student_id: int, teacher_id: int = Query(...), db: Session = Depends(get_db)):
    get_teacher(teacher_id, db)
    return (
        db.query(Submission)
        .options(joinedload(Submission.assignment))
        .filter(Submission.student_id == student_id)
        .all()
    )


@router.put("/submissions/{submission_id}/grade", response_model=SubmissionOut)
def grade_submission(submission_id: int, data: GradeUpdate, teacher_id: int = Query(...), db: Session = Depends(get_db)):
    get_teacher(teacher_id, db)
    sub = db.query(Submission).options(joinedload(Submission.assignment)).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    sub.score = data.score
    sub.teacher_note = data.teacher_note
    sub.status = StatusEnum.graded
    db.commit()
    db.refresh(sub)
    return sub

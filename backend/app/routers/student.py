from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from datetime import datetime
from typing import List
import io

from ..database import get_db
from ..models import User, Assignment, Submission, StatusEnum, RoleEnum
from ..schemas import AssignmentOut, SubmissionOut, SubmitAnswer

router = APIRouter(prefix="/student", tags=["student"])


def get_student(student_id: int, db: Session):
    user = db.query(User).filter(User.id == student_id, User.role == RoleEnum.student).first()
    if not user:
        raise HTTPException(status_code=403, detail="Student not found")
    return user


@router.get("/assignments", response_model=List[SubmissionOut])
def list_assignments(student_id: int = Query(...), db: Session = Depends(get_db)):
    student = get_student(student_id, db)
    return (
        db.query(Submission)
        .options(joinedload(Submission.assignment))
        .filter(Submission.student_id == student_id)
        .order_by(Submission.id)
        .all()
    )


@router.post("/submissions/{assignment_id}/submit", response_model=SubmissionOut)
def submit_assignment(
    assignment_id: int,
    data: SubmitAnswer,
    student_id: int = Query(...),
    db: Session = Depends(get_db),
):
    get_student(student_id, db)
    sub = db.query(Submission).options(joinedload(Submission.assignment)).filter(
        Submission.assignment_id == assignment_id,
        Submission.student_id == student_id,
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission record not found")
    if sub.status == StatusEnum.graded:
        raise HTTPException(status_code=400, detail="Already graded")

    sub.submitted_at = datetime.utcnow()
    sub.status = StatusEnum.submitted
    sub.answer_text = data.answer_text
    sub.selected_choice = data.selected_choice
    sub.file_name = data.file_name
    db.commit()
    db.refresh(sub)
    return sub


@router.get("/export/pdf")
def export_pdf(student_id: int = Query(...), db: Session = Depends(get_db)):
    student = get_student(student_id, db)
    submissions = (
        db.query(Submission)
        .options(joinedload(Submission.assignment))
        .filter(Submission.student_id == student_id)
        .all()
    )

    pdf_buffer = _generate_pdf(student, submissions)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=grades_{student.username}.pdf"},
    )


def _generate_pdf(student, submissions):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle("Title", parent=styles["Title"], fontSize=16, spaceAfter=12)
    normal_style = ParagraphStyle("Normal", parent=styles["Normal"], fontSize=10)

    story = []
    story.append(Paragraph(f"Student Grade Report", title_style))
    story.append(Paragraph(f"Username: {student.username} | Year: {student.year or '-'}", normal_style))
    story.append(Spacer(1, 0.5*cm))

    table_data = [["#", "Assignment", "Type", "Due Date", "Status", "Score", "Max Score", "Teacher Note"]]

    for i, sub in enumerate(submissions, start=1):
        asgn = sub.assignment
        status_map = {"pending": "Pending", "submitted": "Submitted", "graded": "Graded"}
        type_map = {"text": "Text", "multiple_choice": "MCQ", "file": "File"}
        table_data.append([
            str(i),
            asgn.title if asgn else "-",
            type_map.get(asgn.submission_type if asgn else "text", "-"),
            asgn.due_date.strftime("%d/%m/%Y") if asgn else "-",
            status_map.get(sub.status, sub.status),
            str(sub.score) if sub.score is not None else "-",
            str(sub.max_score) if sub.max_score is not None else "-",
            sub.teacher_note or "-",
        ])

    col_widths = [0.7*cm, 4*cm, 1.5*cm, 2.3*cm, 2.2*cm, 1.5*cm, 1.8*cm, 4.5*cm]
    t = Table(table_data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F5F3FF")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#C4B5FD")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(t)

    graded = [s for s in submissions if s.score is not None]
    if graded:
        total = sum(s.score for s in graded)
        max_total = sum(s.max_score for s in graded if s.max_score)
        story.append(Spacer(1, 0.5*cm))
        story.append(Paragraph(f"Total Score: {total:.1f} / {max_total:.1f}", normal_style))

    doc.build(story)
    buffer.seek(0)
    return buffer

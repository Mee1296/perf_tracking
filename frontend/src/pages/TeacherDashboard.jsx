import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";

const STATUS_LABEL = {
    pending: { label: "รอส่ง", cls: "badge-warning" },
    submitted: { label: "ส่งแล้ว", cls: "badge-info" },
    graded: { label: "ตรวจแล้ว", cls: "badge-success" },
};

const TYPE_LABEL = {
    text: "ตอบคำถาม",
    multiple_choice: "หลายตัวเลือก",
    file: "ส่งไฟล์ PDF",
};

const EMPTY_FORM = {
    title: "", description: "", due_date: "",
    max_score: "100", weight: "100",
    submission_type: "text",
    question: "",
    choices: ["", ""],   // array of choice strings
};

export default function TeacherDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [showAssignForm, setShowAssignForm] = useState(false);
    const [gradingTarget, setGradingTarget] = useState(null);
    const [gradeForm, setGradeForm] = useState({ score: "", teacher_note: "" });
    const [assignForm, setAssignForm] = useState(EMPTY_FORM);
    const [viewNote, setViewNote] = useState(null);
    const [viewAnswer, setViewAnswer] = useState(null);  // { title, content }
    const [msg, setMsg] = useState("");
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [loadingSubs, setLoadingSubs] = useState(false);

    useEffect(() => { fetchStudents(); }, []);

    const fetchStudents = async () => {
        setLoadingStudents(true);
        try {
            const res = await api.get(`/teacher/students?teacher_id=${user.id}`);
            setStudents(res.data);
        } finally { setLoadingStudents(false); }
    };

    const fetchStudentSubmissions = async (student) => {
        setSelectedStudent(student);
        setLoadingSubs(true);
        try {
            const res = await api.get(`/teacher/students/${student.id}/submissions?teacher_id=${user.id}`);
            setSubmissions(res.data);
        } finally { setLoadingSubs(false); }
    };

    const handleCreateAssignment = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                title: assignForm.title,
                description: assignForm.description || null,
                due_date: new Date(assignForm.due_date).toISOString(),
                max_score: parseFloat(assignForm.max_score),
                weight: parseFloat(assignForm.weight),
                submission_type: assignForm.submission_type,
                question: assignForm.question || null,
                choices: assignForm.submission_type === "multiple_choice"
                    ? JSON.stringify(assignForm.choices.filter(c => c.trim()))
                    : null,
            };
            await api.post(`/teacher/assignments?teacher_id=${user.id}`, payload);
            setMsg("สร้างงานสำเร็จ");
            setShowAssignForm(false);
            setAssignForm(EMPTY_FORM);
            if (selectedStudent) fetchStudentSubmissions(selectedStudent);
        } catch (e) {
            setMsg(e.response?.data?.detail || "สร้างงานไม่สำเร็จ");
        }
    };

    const handleGrade = async () => {
        try {
            await api.put(`/teacher/submissions/${gradingTarget.id}/grade?teacher_id=${user.id}`, {
                score: parseFloat(gradeForm.score),
                teacher_note: gradeForm.teacher_note,
            });
            setMsg("ให้คะแนนสำเร็จ");
            setGradingTarget(null);
            fetchStudentSubmissions(selectedStudent);
        } catch (e) {
            setMsg(e.response?.data?.detail || "ให้คะแนนไม่สำเร็จ");
        }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString("th-TH") : "-";

    // Weighted total for selected student
    const graded = submissions.filter(s => s.score !== null && s.assignment?.weight != null && s.max_score);
    const sumWeights = graded.reduce((a, s) => a + s.assignment.weight, 0);
    const weightedScore = sumWeights > 0
        ? graded.reduce((a, s) => a + (s.score / s.max_score) * s.assignment.weight, 0) / sumWeights * 100
        : null;

    // Render student answer based on type
    const renderAnswer = (sub) => {
        const type = sub.assignment?.submission_type;
        if (type === "text") return sub.answer_text || null;
        if (type === "multiple_choice") {
            if (sub.selected_choice == null) return null;
            try {
                const choices = JSON.parse(sub.assignment?.choices || "[]");
                return `(${sub.selected_choice + 1}) ${choices[sub.selected_choice] || "?"}`;
            } catch { return `ตัวเลือกที่ ${sub.selected_choice + 1}`; }
        }
        if (type === "file") return sub.file_name || null;
        return null;
    };

    return (
        <div className="dashboard">
            <header className="dash-header">
                <div className="dash-header-left">
                    <div className="user-avatar-pill">{user.username[0].toUpperCase()}</div>
                    <div className="user-info">
                        <span className="user-info-name">{user.username}</span>
                        <span className="user-info-role role-teacher">อาจารย์</span>
                    </div>
                </div>
                <div className="dash-header-right">
                    <button className="btn btn-primary" onClick={() => setShowAssignForm(true)}>มอบหมายงาน</button>
                    <button className="btn btn-danger" onClick={() => { logout(); navigate("/login"); }}>ออกจากระบบ</button>
                </div>
            </header>

            {msg && (
                <div className="alert alert-success" onClick={() => setMsg("")}>{msg} <span className="close-btn">✕</span></div>
            )}

            <div className="teacher-layout">
                {/* Student list */}
                <div className="card student-list-card">
                    <h3 className="section-title">รายชื่อนักศึกษา</h3>
                    {loadingStudents ? (
                        <div className="loading">กำลังโหลด...</div>
                    ) : students.length === 0 ? (
                        <div className="empty-state">ยังไม่มีนักศึกษา</div>
                    ) : (
                        <ul className="student-list">
                            {students.map((s) => (
                                <li
                                    key={s.id}
                                    className={`student-item ${selectedStudent?.id === s.id ? "active" : ""}`}
                                    onClick={() => fetchStudentSubmissions(s)}
                                >
                                    <div className="student-avatar">{s.username[0].toUpperCase()}</div>
                                    <div>
                                        <div className="student-name">{s.username}</div>
                                        <div className="student-year">{s.year ? `ปีที่ ${s.year}` : ""}</div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Submissions panel */}
                <div className="card submissions-panel">
                    {!selectedStudent ? (
                        <div className="empty-state large"></div>
                    ) : (
                        <>
                            <div className="panel-header">
                                <h3 className="section-title">
                                    งานของ <span className="highlight">{selectedStudent.username}</span>
                                    {selectedStudent.year && ` (ปีที่ ${selectedStudent.year})`}
                                </h3>
                                {weightedScore !== null && (
                                    <div className="weighted-total-badge">
                                        คะแนนรวม: <strong>{weightedScore.toFixed(1)}%</strong>
                                    </div>
                                )}
                            </div>
                            {loadingSubs ? (
                                <div className="loading">กำลังโหลด...</div>
                            ) : submissions.length === 0 ? (
                                <div className="empty-state">ยังไม่มีงาน</div>
                            ) : (
                                <div className="table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>ชื่องาน</th>
                                                <th>รูปแบบ</th>
                                                <th>น้ำหนัก</th>
                                                <th>กำหนดส่ง</th>
                                                <th>สถานะ</th>
                                                <th>คำตอบ</th>
                                                <th>คะแนน</th>
                                                <th>การดำเนินการ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {submissions.map((sub, i) => {
                                                const s = STATUS_LABEL[sub.status] || {};
                                                const w = sub.assignment?.weight ?? 100;
                                                const answer = renderAnswer(sub);
                                                return (
                                                    <tr key={sub.id}>
                                                        <td>{i + 1}</td>
                                                        <td>
                                                            <div className="assignment-name">{sub.assignment?.title}</div>
                                                            {sub.assignment?.question && (
                                                                <div className="assignment-desc">{sub.assignment.question}</div>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <span className="type-badge">
                                                                {TYPE_LABEL[sub.assignment?.submission_type] || "-"}
                                                            </span>
                                                        </td>
                                                        <td><span className="weight-badge">{w}%</span></td>
                                                        <td>{formatDate(sub.assignment?.due_date)}</td>
                                                        <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                                                        <td>
                                                            {answer ? (
                                                                <button
                                                                    className="btn btn-sm btn-ghost"
                                                                    onClick={() => setViewAnswer({ title: sub.assignment?.title, content: answer, type: sub.assignment?.submission_type })}
                                                                >
                                                                    ดูคำตอบ
                                                                </button>
                                                            ) : <span className="text-muted">-</span>}
                                                        </td>
                                                        <td>
                                                            {sub.score !== null
                                                                ? `${sub.score} / ${sub.max_score ?? "-"}`
                                                                : <span className="text-muted">-</span>}
                                                        </td>
                                                        <td>
                                                            {sub.status === "submitted" && (
                                                                <button
                                                                    className="btn btn-sm btn-primary"
                                                                    onClick={() => { setGradingTarget(sub); setGradeForm({ score: "", teacher_note: sub.teacher_note || "" }); }}
                                                                >
                                                                    ให้คะแนน
                                                                </button>
                                                            )}
                                                            {sub.status === "graded" && (
                                                                <button
                                                                    className="btn btn-sm btn-outline"
                                                                    onClick={() => { setGradingTarget(sub); setGradeForm({ score: sub.score, teacher_note: sub.teacher_note || "" }); }}
                                                                >
                                                                    แก้คะแนน
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Create Assignment Modal */}
            {showAssignForm && (
                <div className="modal-overlay" onClick={() => setShowAssignForm(false)}>
                    <div className="modal-card modal-card-lg" onClick={(e) => e.stopPropagation()}>
                        <h3>มอบหมายงานใหม่</h3>
                        <form onSubmit={handleCreateAssignment}>
                            <div className="form-group">
                                <label>ชื่องาน</label>
                                <input value={assignForm.title} onChange={(e) => setAssignForm({ ...assignForm, title: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>คำอธิบาย (ไม่บังคับ)</label>
                                <textarea rows={2} className="note-textarea" value={assignForm.description} onChange={(e) => setAssignForm({ ...assignForm, description: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>กำหนดส่ง</label>
                                <input type="datetime-local" value={assignForm.due_date} onChange={(e) => setAssignForm({ ...assignForm, due_date: e.target.value })} required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>คะแนนเต็ม</label>
                                    <input type="number" min="1" value={assignForm.max_score} onChange={(e) => setAssignForm({ ...assignForm, max_score: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>น้ำหนัก (%)</label>
                                    <input type="number" min="0" max="100" value={assignForm.weight} onChange={(e) => setAssignForm({ ...assignForm, weight: e.target.value })} required />
                                    <small className="form-hint">สัดส่วนต่อคะแนนรวม เช่น 30 = 30%</small>
                                </div>
                            </div>

                            {/* Submission type selector */}
                            <div className="form-group">
                                <label>รูปแบบการส่งงาน</label>
                                <div className="type-tabs">
                                    {["text", "multiple_choice", "file"].map(t => (
                                        <button
                                            key={t} type="button"
                                            className={`type-tab ${assignForm.submission_type === t ? "active" : ""}`}
                                            onClick={() => setAssignForm({ ...assignForm, submission_type: t, question: "", choices: ["", ""] })}
                                        >
                                            {t === "text" && "ตอบคำถาม"}
                                            {t === "multiple_choice" && "หลายตัวเลือก"}
                                            {t === "file" && "ส่งไฟล์ PDF"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Question field (text + MCQ) */}
                            {(assignForm.submission_type === "text" || assignForm.submission_type === "multiple_choice") && (
                                <div className="form-group">
                                    <label>คำถาม / โจทย์</label>
                                    <textarea rows={2} className="note-textarea" value={assignForm.question}
                                        onChange={(e) => setAssignForm({ ...assignForm, question: e.target.value })}
                                        placeholder="พิมพ์คำถามหรือโจทย์ที่ต้องการให้นักศึกษาตอบ..."
                                    />
                                </div>
                            )}

                            {/* Choices builder (MCQ only) */}
                            {assignForm.submission_type === "multiple_choice" && (
                                <div className="form-group">
                                    <label>ตัวเลือก</label>
                                    <div className="choices-builder">
                                        {assignForm.choices.map((c, idx) => (
                                            <div key={idx} className="choice-row">
                                                <span className="choice-label">{idx + 1}.</span>
                                                <input
                                                    className="choice-input"
                                                    value={c}
                                                    placeholder={`ตัวเลือกที่ ${idx + 1}`}
                                                    onChange={(e) => {
                                                        const next = [...assignForm.choices];
                                                        next[idx] = e.target.value;
                                                        setAssignForm({ ...assignForm, choices: next });
                                                    }}
                                                />
                                                {assignForm.choices.length > 2 && (
                                                    <button type="button" className="choice-remove"
                                                        onClick={() => setAssignForm({ ...assignForm, choices: assignForm.choices.filter((_, i) => i !== idx) })}>
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        {assignForm.choices.length < 6 && (
                                            <button type="button" className="btn btn-ghost btn-sm"
                                                onClick={() => setAssignForm({ ...assignForm, choices: [...assignForm.choices, ""] })}>
                                                + เพิ่มตัวเลือก
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* File info */}
                            {assignForm.submission_type === "file" && (
                                <div className="file-type-info">
                                    นักศึกษาจะสามารถส่งไฟล์ PDF เข้าระบบได้
                                </div>
                            )}

                            <div className="modal-actions">
                                <button type="submit" className="btn btn-primary">สร้างงาน</button>
                                <button type="button" className="btn btn-outline" onClick={() => setShowAssignForm(false)}>ยกเลิก</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Grade Modal */}
            {gradingTarget && (
                <div className="modal-overlay" onClick={() => setGradingTarget(null)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <h3>ให้คะแนน — {gradingTarget.assignment?.title}</h3>
                        <div className="form-group">
                            <label>คะแนน (เต็ม {gradingTarget.max_score ?? "?"})</label>
                            <input
                                type="number" min={0} max={gradingTarget.max_score}
                                value={gradeForm.score}
                                onChange={(e) => setGradeForm({ ...gradeForm, score: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>โน้ต</label>
                            <textarea
                                className="note-textarea" rows={3}
                                value={gradeForm.teacher_note}
                                onChange={(e) => setGradeForm({ ...gradeForm, teacher_note: e.target.value })}
                                placeholder="เขียนคอมเมนต์หรือข้อแนะนำ..."
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-primary" onClick={handleGrade}>บันทึกคะแนน</button>
                            <button className="btn btn-outline" onClick={() => setGradingTarget(null)}>ยกเลิก</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Answer Popup */}
            {viewAnswer && (
                <div className="modal-overlay" onClick={() => setViewAnswer(null)}>
                    <div className="modal-card note-view-card" onClick={(e) => e.stopPropagation()}>
                        <div className="note-view-header">
                            <h3>คำตอบของนักศึกษา</h3>
                            <span className="note-view-subtitle">{viewAnswer.title}</span>
                        </div>
                        <div className="note-view-content">{viewAnswer.content}</div>
                        <div className="modal-actions">
                            <button className="btn btn-primary" onClick={() => setViewAnswer(null)}>ปิด</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Note Popup */}
            {viewNote && (
                <div className="modal-overlay" onClick={() => setViewNote(null)}>
                    <div className="modal-card note-view-card" onClick={(e) => e.stopPropagation()}>
                        <div className="note-view-header">
                            <h3>โน้ตจาก{viewNote.from}</h3>
                            <span className="note-view-subtitle">{viewNote.title}</span>
                        </div>
                        <div className="note-view-content">{viewNote.content}</div>
                        <div className="modal-actions">
                            <button className="btn btn-primary" onClick={() => setViewNote(null)}>ปิด</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

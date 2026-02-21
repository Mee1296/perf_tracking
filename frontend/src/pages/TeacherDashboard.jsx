import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";

const STATUS_LABEL = {
    pending: { label: "รอส่ง", cls: "badge-warning" },
    submitted: { label: "ส่งแล้ว", cls: "badge-info" },
    graded: { label: "ตรวจแล้ว", cls: "badge-success" },
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
    const [assignForm, setAssignForm] = useState({ title: "", description: "", due_date: "", max_score: "100" });
    const [msg, setMsg] = useState("");
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [loadingSubs, setLoadingSubs] = useState(false);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        setLoadingStudents(true);
        try {
            const res = await api.get(`/teacher/students?teacher_id=${user.id}`);
            setStudents(res.data);
        } finally {
            setLoadingStudents(false);
        }
    };

    const fetchStudentSubmissions = async (student) => {
        setSelectedStudent(student);
        setLoadingSubs(true);
        try {
            const res = await api.get(`/teacher/students/${student.id}/submissions?teacher_id=${user.id}`);
            setSubmissions(res.data);
        } finally {
            setLoadingSubs(false);
        }
    };

    const handleCreateAssignment = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/teacher/assignments?teacher_id=${user.id}`, {
                ...assignForm,
                due_date: new Date(assignForm.due_date).toISOString(),
                max_score: parseFloat(assignForm.max_score),
            });
            setMsg("สร้างงานสำเร็จ ✅");
            setShowAssignForm(false);
            setAssignForm({ title: "", description: "", due_date: "", max_score: "100" });
            // Refresh submissions if a student is selected
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
            setMsg("ให้คะแนนสำเร็จ ✅");
            setGradingTarget(null);
            fetchStudentSubmissions(selectedStudent);
        } catch (e) {
            setMsg(e.response?.data?.detail || "ให้คะแนนไม่สำเร็จ");
        }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString("th-TH") : "-";

    return (
        <div className="dashboard">
            {/* Header */}
            <header className="dash-header">
                <div className="dash-header-left">
                    <span className="dash-logo">👨‍🏫</span>
                    <div>
                        <h2>แดชบอร์ดอาจารย์</h2>
                        <p>ยินดีต้อนรับ, {user.username}</p>
                    </div>
                </div>
                <div className="dash-header-right">
                    <button className="btn btn-primary" onClick={() => setShowAssignForm(true)}>
                        ➕ มอบหมายงาน
                    </button>
                    <button className="btn btn-danger" onClick={() => { logout(); navigate("/login"); }}>ออกจากระบบ</button>
                </div>
            </header>

            {msg && (
                <div className="alert alert-success" onClick={() => setMsg("")}>{msg} <span className="close-btn">✕</span></div>
            )}

            <div className="teacher-layout">
                {/* Student list */}
                <div className="card student-list-card">
                    <h3 className="section-title">👩‍🎓 รายชื่อนักศึกษา</h3>
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
                        <div className="empty-state large">
                            <div className="empty-icon">👈</div>
                            <p>เลือกนักศึกษาเพื่อดูงาน</p>
                        </div>
                    ) : (
                        <>
                            <h3 className="section-title">
                                📋 งานของ <span className="highlight">{selectedStudent.username}</span>
                                {selectedStudent.year && ` (ปีที่ ${selectedStudent.year})`}
                            </h3>
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
                                                <th>กำหนดส่ง</th>
                                                <th>ส่งเมื่อ</th>
                                                <th>สถานะ</th>
                                                <th>คะแนน</th>
                                                <th>โน้ตนักศึกษา</th>
                                                <th>การดำเนินการ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {submissions.map((sub, i) => {
                                                const s = STATUS_LABEL[sub.status] || {};
                                                return (
                                                    <tr key={sub.id}>
                                                        <td>{i + 1}</td>
                                                        <td>
                                                            <div className="assignment-name">{sub.assignment?.title}</div>
                                                            {sub.assignment?.description && (
                                                                <div className="assignment-desc">{sub.assignment.description}</div>
                                                            )}
                                                        </td>
                                                        <td>{formatDate(sub.assignment?.due_date)}</td>
                                                        <td>{sub.submitted_at ? formatDate(sub.submitted_at) : <span className="text-muted">-</span>}</td>
                                                        <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                                                        <td>
                                                            {sub.score !== null
                                                                ? `${sub.score} / ${sub.max_score ?? "-"}`
                                                                : <span className="text-muted">-</span>}
                                                        </td>
                                                        <td className="note-cell">{sub.student_note || <span className="text-muted">-</span>}</td>
                                                        <td>
                                                            {sub.status === "submitted" && (
                                                                <button
                                                                    className="btn btn-sm btn-primary"
                                                                    onClick={() => { setGradingTarget(sub); setGradeForm({ score: "", teacher_note: sub.teacher_note || "" }); }}
                                                                >
                                                                    ✏️ ให้คะแนน
                                                                </button>
                                                            )}
                                                            {sub.status === "graded" && (
                                                                <button
                                                                    className="btn btn-sm btn-outline"
                                                                    onClick={() => { setGradingTarget(sub); setGradeForm({ score: sub.score, teacher_note: sub.teacher_note || "" }); }}
                                                                >
                                                                    ✏️ แก้คะแนน
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
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <h3>➕ มอบหมายงานใหม่</h3>
                        <form onSubmit={handleCreateAssignment}>
                            <div className="form-group">
                                <label>ชื่องาน</label>
                                <input value={assignForm.title} onChange={(e) => setAssignForm({ ...assignForm, title: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>คำอธิบาย</label>
                                <textarea
                                    rows={3}
                                    className="note-textarea"
                                    value={assignForm.description}
                                    onChange={(e) => setAssignForm({ ...assignForm, description: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>กำหนดส่ง</label>
                                <input type="datetime-local" value={assignForm.due_date} onChange={(e) => setAssignForm({ ...assignForm, due_date: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>คะแนนเต็ม</label>
                                <input type="number" value={assignForm.max_score} onChange={(e) => setAssignForm({ ...assignForm, max_score: e.target.value })} required />
                            </div>
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
                        <h3>✏️ ให้คะแนน — {gradingTarget.assignment?.title}</h3>
                        <div className="form-group">
                            <label>คะแนน (เต็ม {gradingTarget.max_score ?? "?"})</label>
                            <input
                                type="number"
                                min={0}
                                max={gradingTarget.max_score}
                                value={gradeForm.score}
                                onChange={(e) => setGradeForm({ ...gradeForm, score: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>โน้ตถึงนักศึกษา</label>
                            <textarea
                                className="note-textarea"
                                rows={3}
                                value={gradeForm.teacher_note}
                                onChange={(e) => setGradeForm({ ...gradeForm, teacher_note: e.target.value })}
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-primary" onClick={handleGrade}>บันทึกคะแนน</button>
                            <button className="btn btn-outline" onClick={() => setGradingTarget(null)}>ยกเลิก</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

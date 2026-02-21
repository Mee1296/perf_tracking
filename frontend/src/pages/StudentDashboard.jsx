import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";

const STATUS_LABEL = {
    pending: { label: "รอส่ง", cls: "badge-warning" },
    submitted: { label: "ส่งแล้ว", cls: "badge-info" },
    graded: { label: "ตรวจแล้ว", cls: "badge-success" },
};

export default function StudentDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState([]);
    const [selected, setSelected] = useState(null);
    const [note, setNote] = useState("");
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/student/assignments?student_id=${user.id}`);
            setSubmissions(res.data);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (assignmentId) => {
        try {
            await api.post(`/student/submissions/${assignmentId}/submit?student_id=${user.id}`);
            setMsg("ส่งงานสำเร็จ ✅");
            fetchData();
        } catch (e) {
            setMsg(e.response?.data?.detail || "เกิดข้อผิดพลาด");
        }
    };

    const handleSaveNote = async () => {
        try {
            await api.put(`/student/submissions/${selected.id}/note?student_id=${user.id}`, { student_note: note });
            setMsg("บันทึกโน้ตสำเร็จ ✅");
            setSelected(null);
            fetchData();
        } catch {
            setMsg("บันทึกโน้ตไม่สำเร็จ");
        }
    };

    const handleExportPDF = async () => {
        try {
            const res = await api.get(`/student/export/pdf?student_id=${user.id}`, { responseType: "blob" });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement("a");
            a.href = url;
            a.download = `grades_${user.username}.pdf`;
            a.click();
        } catch {
            setMsg("ดาวน์โหลด PDF ไม่สำเร็จ");
        }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString("th-TH") : "-";
    const isOverdue = (due) => due && new Date(due) < new Date();

    const totalScore = submissions.filter(s => s.score !== null).reduce((a, b) => a + b.score, 0);
    const maxTotal = submissions.filter(s => s.max_score !== null).reduce((a, b) => a + b.max_score, 0);

    return (
        <div className="dashboard">
            {/* Header */}
            <header className="dash-header">
                <div className="dash-header-left">
                    <span className="dash-logo">🎓</span>
                    <div>
                        <h2>แดชบอร์ดนักศึกษา</h2>
                        <p>ยินดีต้อนรับ, {user.username} {user.year ? `(ปีที่ ${user.year})` : ""}</p>
                    </div>
                </div>
                <div className="dash-header-right">
                    <button className="btn btn-outline" onClick={handleExportPDF}>📄 ส่งออก PDF</button>
                    <button className="btn btn-danger" onClick={() => { logout(); navigate("/login"); }}>ออกจากระบบ</button>
                </div>
            </header>

            {/* Summary cards */}
            <div className="summary-cards">
                <div className="card stat-card">
                    <div className="stat-num">{submissions.length}</div>
                    <div className="stat-label">งานทั้งหมด</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-num">{submissions.filter(s => s.status === "submitted").length}</div>
                    <div className="stat-label">รอตรวจ</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-num">{submissions.filter(s => s.status === "graded").length}</div>
                    <div className="stat-label">ตรวจแล้ว</div>
                </div>
                <div className="card stat-card accent">
                    <div className="stat-num">{maxTotal > 0 ? `${totalScore}/${maxTotal}` : "-"}</div>
                    <div className="stat-label">คะแนนรวม</div>
                </div>
            </div>

            {msg && (
                <div className="alert alert-success" onClick={() => setMsg("")}>{msg} <span className="close-btn">✕</span></div>
            )}

            {/* Assignment list */}
            <div className="card">
                <h3 className="section-title">📋 รายการงาน</h3>
                {loading ? (
                    <div className="loading">กำลังโหลด...</div>
                ) : submissions.length === 0 ? (
                    <div className="empty-state">ยังไม่มีงานที่ได้รับมอบหมาย</div>
                ) : (
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>ชื่องาน</th>
                                    <th>กำหนดส่ง</th>
                                    <th>สถานะ</th>
                                    <th>คะแนน</th>
                                    <th>โน้ตอาจารย์</th>
                                    <th>การดำเนินการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {submissions.map((sub, i) => {
                                    const s = STATUS_LABEL[sub.status] || {};
                                    const overdue = sub.status === "pending" && isOverdue(sub.assignment?.due_date);
                                    return (
                                        <tr key={sub.id} className={overdue ? "row-overdue" : ""}>
                                            <td>{i + 1}</td>
                                            <td>
                                                <div className="assignment-name">{sub.assignment?.title}</div>
                                                {sub.assignment?.description && (
                                                    <div className="assignment-desc">{sub.assignment.description}</div>
                                                )}
                                            </td>
                                            <td>
                                                <span className={overdue ? "text-danger" : ""}>
                                                    {formatDate(sub.assignment?.due_date)}
                                                    {overdue && " ⚠️"}
                                                </span>
                                            </td>
                                            <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                                            <td>
                                                {sub.score !== null
                                                    ? `${sub.score} / ${sub.max_score ?? "-"}`
                                                    : <span className="text-muted">-</span>}
                                            </td>
                                            <td className="note-cell">{sub.teacher_note || <span className="text-muted">-</span>}</td>
                                            <td>
                                                <div className="action-btns">
                                                    {sub.status === "pending" && (
                                                        <button
                                                            className="btn btn-sm btn-primary"
                                                            onClick={() => handleSubmit(sub.assignment_id)}
                                                        >
                                                            ส่งงาน
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn btn-sm btn-outline"
                                                        onClick={() => { setSelected(sub); setNote(sub.student_note || ""); }}
                                                    >
                                                        📝 โน้ต
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Note modal */}
            {selected && (
                <div className="modal-overlay" onClick={() => setSelected(null)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <h3>📝 โน้ตของฉัน — {selected.assignment?.title}</h3>
                        <textarea
                            className="note-textarea"
                            rows={5}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="เขียนโน้ตของคุณที่นี่..."
                        />
                        <div className="modal-actions">
                            <button className="btn btn-primary" onClick={handleSaveNote}>บันทึก</button>
                            <button className="btn btn-outline" onClick={() => setSelected(null)}>ยกเลิก</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

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

export default function StudentDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState([]);
    const [answerTarget, setAnswerTarget] = useState(null); // submission to answer
    const [answerForm, setAnswerForm] = useState({ answer_text: "", selected_choice: null, file_name: "" });
    const [mockFile, setMockFile] = useState(null);  // mocked file input
    const [viewNote, setViewNote] = useState(null);   // { title, content } teacher comment popup
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/student/assignments?student_id=${user.id}`);
            setSubmissions(res.data);
        } finally { setLoading(false); }
    };

    const openAnswerModal = (sub) => {
        setAnswerTarget(sub);
        setAnswerForm({ answer_text: "", selected_choice: null, file_name: "" });
        setMockFile(null);
    };

    const handleSubmit = async () => {
        try {
            const type = answerTarget.assignment?.submission_type;
            let payload = {};
            if (type === "text") payload = { answer_text: answerForm.answer_text };
            if (type === "multiple_choice") payload = { selected_choice: answerForm.selected_choice };
            if (type === "file") payload = { file_name: mockFile?.name || "file_mock.pdf" };

            await api.post(
                `/student/submissions/${answerTarget.assignment_id}/submit?student_id=${user.id}`,
                payload
            );
            setMsg("ส่งงานสำเร็จ");
            setAnswerTarget(null);
            fetchData();
        } catch (e) {
            setMsg(e.response?.data?.detail || "ส่งงานไม่สำเร็จ");
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
        } catch { setMsg("ดาวน์โหลด PDF ไม่สำเร็จ"); }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString("th-TH") : "-";
    const isOverdue = (due) => due && new Date(due) < new Date();

    // Weighted score
    const graded = submissions.filter(s => s.score !== null && s.assignment?.weight != null && s.max_score);
    const sumWeights = graded.reduce((a, s) => a + s.assignment.weight, 0);
    const weightedScore = sumWeights > 0
        ? graded.reduce((a, s) => a + (s.score / s.max_score) * s.assignment.weight, 0) / sumWeights * 100
        : null;

    // Render answer form inside modal
    const renderAnswerForm = () => {
        if (!answerTarget) return null;
        const type = answerTarget.assignment?.submission_type;
        const question = answerTarget.assignment?.question;

        if (type === "text") return (
            <>
                {question && <div className="answer-question">{question}</div>}
                <div className="form-group">
                    <label>คำตอบของคุณ</label>
                    <textarea
                        className="note-textarea" rows={5}
                        value={answerForm.answer_text}
                        onChange={(e) => setAnswerForm({ ...answerForm, answer_text: e.target.value })}
                        placeholder="พิมพ์คำตอบที่นี่..."
                    />
                </div>
            </>
        );

        if (type === "multiple_choice") {
            let choices = [];
            try { choices = JSON.parse(answerTarget.assignment?.choices || "[]"); } catch { }
            return (
                <>
                    {question && <div className="answer-question">{question}</div>}
                    <div className="mcq-choices">
                        {choices.map((c, idx) => (
                            <label key={idx}
                                className={`mcq-option ${answerForm.selected_choice === idx ? "selected" : ""}`}
                                onClick={() => setAnswerForm({ ...answerForm, selected_choice: idx })}
                            >
                                <span className="mcq-dot">{answerForm.selected_choice === idx ? "●" : "○"}</span>
                                <span>{c}</span>
                            </label>
                        ))}
                    </div>
                </>
            );
        }

        if (type === "file") return (
            <div className="file-upload-area">
                <div className="file-upload-label">เลือกไฟล์ PDF ที่ต้องการส่ง</div>
                <input
                    type="file" accept=".pdf"
                    className="file-input"
                    id="file-upload"
                    onChange={(e) => setMockFile(e.target.files[0] || null)}
                />
                <label htmlFor="file-upload" className="btn btn-outline btn-sm">
                    เลือกไฟล์
                </label>
                {mockFile && <div className="file-selected">ไฟล์: {mockFile.name}</div>}
            </div>
        );

        return null;
    };

    const canSubmit = () => {
        if (!answerTarget) return false;
        const type = answerTarget.assignment?.submission_type;
        if (type === "text") return answerForm.answer_text.trim().length > 0;
        if (type === "multiple_choice") return answerForm.selected_choice !== null;
        if (type === "file") return true; // mock: always allow
        return false;
    };

    return (
        <div className="dashboard">
            <header className="dash-header">
                <div className="dash-header-left">
                    <div className="user-avatar-pill">{user.username[0].toUpperCase()}</div>
                    <div className="user-info">
                        <span className="user-info-name">{user.username}</span>
                        <span className="user-info-role role-student">
                            นักศึกษา{user.year ? ` · ปีที่ ${user.year}` : ""}
                        </span>
                    </div>
                </div>
                <div className="dash-header-right">
                    <button className="btn btn-outline" onClick={handleExportPDF}>ส่งออก PDF</button>
                    <button className="btn btn-danger" onClick={() => { logout(); navigate("/login"); }}>ออกจากระบบ</button>
                </div>
            </header>

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
                    <div className="stat-num">
                        {weightedScore !== null ? `${weightedScore.toFixed(1)}%` : "-"}
                    </div>
                    <div className="stat-label">คะแนนรวม (weighted)</div>
                </div>
            </div>

            {msg && (
                <div className="alert alert-success" onClick={() => setMsg("")}>{msg} <span className="close-btn">✕</span></div>
            )}

            <div className="card">
                <h3 className="section-title">งานทั้งหมด</h3>
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
                                    <th>ชื่องาน / คำถาม</th>
                                    <th>รูปแบบ</th>
                                    <th>น้ำหนัก</th>
                                    <th>กำหนดส่ง</th>
                                    <th>สถานะ</th>
                                    <th>คะแนน</th>
                                    <th>คอมเมนต์อาจารย์</th>
                                    <th>การดำเนินการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {submissions.map((sub, i) => {
                                    const s = STATUS_LABEL[sub.status] || {};
                                    const overdue = sub.status === "pending" && isOverdue(sub.assignment?.due_date);
                                    const w = sub.assignment?.weight ?? 100;
                                    const weightedPct = sub.score != null && sub.max_score
                                        ? ((sub.score / sub.max_score) * w).toFixed(1)
                                        : null;
                                    return (
                                        <tr key={sub.id} className={overdue ? "row-overdue" : ""}>
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
                                            <td>
                                                <span className={overdue ? "text-danger" : ""}>
                                                    {formatDate(sub.assignment?.due_date)}
                                                </span>
                                            </td>
                                            <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                                            <td>
                                                {sub.score !== null
                                                    ? <span className="weighted-score">{sub.score} / {sub.max_score ?? "-"}</span>
                                                    : <span className="text-muted">-</span>}
                                            </td>
                                            <td>
                                                {sub.teacher_note ? (
                                                    <button
                                                        className="btn btn-sm btn-ghost"
                                                        onClick={() => setViewNote({ title: sub.assignment?.title, content: sub.teacher_note })}
                                                    >
                                                        ดูคอมเมนต์
                                                    </button>
                                                ) : <span className="text-muted">-</span>}
                                            </td>
                                            <td>
                                                {sub.status === "pending" && (
                                                    <button className="btn btn-sm btn-primary" onClick={() => openAnswerModal(sub)}>
                                                        ส่งงาน
                                                    </button>
                                                )}
                                                {sub.status !== "pending" && (
                                                    <span className="text-muted">ส่งแล้ว</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Answer / Submit Modal */}
            {answerTarget && (
                <div className="modal-overlay" onClick={() => setAnswerTarget(null)}>
                    <div className="modal-card modal-card-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="answer-modal-header">
                            <h3>{answerTarget.assignment?.title}</h3>
                            <span className="type-badge">
                                {TYPE_LABEL[answerTarget.assignment?.submission_type] || ""}
                            </span>
                        </div>
                        {renderAnswerForm()}
                        <div className="modal-actions">
                            <button className="btn btn-primary" onClick={handleSubmit} disabled={!canSubmit()}>
                                ส่งงาน
                            </button>
                            <button className="btn btn-outline" onClick={() => setAnswerTarget(null)}>ยกเลิก</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Teacher comment popup */}
            {viewNote && (
                <div className="modal-overlay" onClick={() => setViewNote(null)}>
                    <div className="modal-card note-view-card" onClick={(e) => e.stopPropagation()}>
                        <div className="note-view-header">
                            <h3>คอมเมนต์จากอาจารย์</h3>
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

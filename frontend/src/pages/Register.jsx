import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";

export default function Register() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: "", password: "", role: "student", year: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await api.post("/auth/register", {
                username: form.username,
                password: form.password,
                role: form.role,
                year: form.role === "student" && form.year ? parseInt(form.year) : null,
            });
            navigate("/login");
        } catch (err) {
            setError(err.response?.data?.detail || "สมัครสมาชิกไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">📝</div>
                <h1>สมัครสมาชิก</h1>
                <p className="auth-subtitle">สร้างบัญชีใหม่</p>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>ชื่อผู้ใช้</label>
                        <input
                            type="text"
                            placeholder="กรอกชื่อผู้ใช้"
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>รหัสผ่าน</label>
                        <input
                            type="password"
                            placeholder="กรอกรหัสผ่าน"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>บทบาท</label>
                        <div className="role-selector">
                            <button
                                type="button"
                                className={`role-btn ${form.role === "student" ? "active" : ""}`}
                                onClick={() => setForm({ ...form, role: "student" })}
                            >
                                👩‍🎓 นักศึกษา
                            </button>
                            <button
                                type="button"
                                className={`role-btn ${form.role === "teacher" ? "active" : ""}`}
                                onClick={() => setForm({ ...form, role: "teacher" })}
                            >
                                👨‍🏫 อาจารย์
                            </button>
                        </div>
                    </div>
                    {form.role === "student" && (
                        <div className="form-group">
                            <label>ชั้นปีที่</label>
                            <select
                                value={form.year}
                                onChange={(e) => setForm({ ...form, year: e.target.value })}
                            >
                                <option value="">-- เลือกชั้นปี --</option>
                                <option value="1">ปีที่ 1</option>
                                <option value="2">ปีที่ 2</option>
                                <option value="3">ปีที่ 3</option>
                                <option value="4">ปีที่ 4</option>
                                <option value="5">ปีที่ 5</option>
                            </select>
                        </div>
                    )}
                    {error && <div className="alert alert-error">{error}</div>}
                    <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                        {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
                    </button>
                </form>
                <p className="auth-link">
                    มีบัญชีแล้ว? <Link to="/login">เข้าสู่ระบบ</Link>
                </p>
            </div>
        </div>
    );
}

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await api.post("/auth/login", form);
            login(res.data);
            navigate(res.data.role === "teacher" ? "/teacher" : "/student");
        } catch (err) {
            setError(err.response?.data?.detail || "เข้าสู่ระบบไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">🎓</div>
                <h1>เข้าสู่ระบบ</h1>
                <p className="auth-subtitle">ระบบติดตามผลการเรียน</p>
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
                    {error && <div className="alert alert-error">{error}</div>}
                    <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                        {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                    </button>
                </form>
                <p className="auth-link">
                    ยังไม่มีบัญชี? <Link to="/register">สมัครสมาชิก</Link>
                </p>
            </div>
        </div>
    );
}

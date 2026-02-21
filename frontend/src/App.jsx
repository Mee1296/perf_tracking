import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";

function PrivateRoute({ children, role }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" />;
    if (role && user.role !== role) return <Navigate to={user.role === "teacher" ? "/teacher" : "/student"} />;
    return children;
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Navigate to="/login" />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route
                        path="/student"
                        element={<PrivateRoute role="student"><StudentDashboard /></PrivateRoute>}
                    />
                    <Route
                        path="/teacher"
                        element={<PrivateRoute role="teacher"><TeacherDashboard /></PrivateRoute>}
                    />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

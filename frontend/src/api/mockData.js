export const mockUserTeacher = {
    id: 1,
    username: "mock_teacher",
    role: "teacher"
};

export const mockUserStudent = {
    id: 101,
    username: "mock_student",
    role: "student",
    year: 3
};

export const mockStudents = [
    { id: 101, username: "mock_student", year: 3 },
    { id: 102, username: "สมชาย ใจดี", year: 2 },
    { id: 103, username: "สมหญิง รักเรียน", year: 1 }
];

export const mockSubmissions = [
    {
        id: 1,
        assignment_id: 1,
        student_id: 101,
        status: "pending",
        score: null,
        max_score: 10,
        teacher_note: null,
        assignment: {
            id: 1,
            title: "การบ้าน 1: พื้นฐาน Python",
            description: "จงเขียนโปรแกรม Hello World",
            due_date: new Date(Date.now() + 86400000).toISOString(),
            submission_type: "text",
            question: "ให้นักศึกษาสรุปสิ่งที่ได้เรียนวันนี้",
            weight: 10
        }
    },
    {
        id: 2,
        assignment_id: 2,
        student_id: 101,
        status: "graded",
        score: 8,
        max_score: 10,
        teacher_note: "ทำได้ดีมากครับ",
        assignment: {
            id: 2,
            title: "ควิซ 1: ตัวแปรและการคำนวณ",
            description: "แบบทดสอบย่อยเรื่องตัวแปร",
            due_date: new Date(Date.now() - 86400000).toISOString(),
            submission_type: "multiple_choice",
            question: "1 + 1 เท่ากับเท่าไหร่?",
            choices: JSON.stringify(["1", "2", "3", "4"]),
            weight: 20
        },
        selected_choice: 1
    }
];

export const getMockData = (url, method, data) => {
    console.warn(`[Mock API Request] ${method.toUpperCase()} ${url}`);
    if (data) console.log("[Mock API Payload]", data);

    if (url.includes("/auth/login")) {
        if (data && data.username && data.username.toLowerCase().includes("student")) {
            return { data: mockUserStudent };
        }
        return { data: mockUserTeacher };
    }

    if (url.includes("/teacher/students") && !url.includes("submissions")) {
        return { data: mockStudents };
    }

    if (url.includes("/teacher/students/") && url.includes("/submissions")) {
        return { data: mockSubmissions };
    }

    if (url.includes("/student/assignments")) {
        return { data: mockSubmissions };
    }

    // Default success response for POST/PUT
    if (method === "post" || method === "put") {
        return { data: { message: "Mock success" } };
    }

    return { data: [] };
};

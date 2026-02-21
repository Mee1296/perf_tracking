-- ============================================================
-- Performance Tracking System — Database Initialization
-- Runs automatically on first startup via docker-entrypoint-initdb.d
-- ============================================================

-- Enum types
DO $$ BEGIN
    CREATE TYPE roleenum AS ENUM ('student', 'teacher');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE statusenum AS ENUM ('pending', 'submitted', 'graded');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE submissiontypeenum AS ENUM ('text', 'multiple_choice', 'file');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Users
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          roleenum     NOT NULL,
    year          INTEGER
);
CREATE INDEX IF NOT EXISTS ix_users_id       ON users (id);
CREATE INDEX IF NOT EXISTS ix_users_username ON users (username);

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    due_date        TIMESTAMP    NOT NULL,
    created_at      TIMESTAMP    DEFAULT NOW(),
    teacher_id      INTEGER      NOT NULL REFERENCES users(id),
    weight          DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    submission_type submissiontypeenum NOT NULL DEFAULT 'text',
    question        TEXT,
    choices         TEXT
);
CREATE INDEX IF NOT EXISTS ix_assignments_id ON assignments (id);

-- Submissions
CREATE TABLE IF NOT EXISTS submissions (
    id              SERIAL PRIMARY KEY,
    assignment_id   INTEGER      NOT NULL REFERENCES assignments(id),
    student_id      INTEGER      NOT NULL REFERENCES users(id),
    submitted_at    TIMESTAMP,
    status          statusenum   NOT NULL DEFAULT 'pending',
    score           DOUBLE PRECISION,
    max_score       DOUBLE PRECISION,
    teacher_note    TEXT,
    answer_text     TEXT,
    selected_choice INTEGER,
    file_name       VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS ix_submissions_id ON submissions (id);

-- =============================================================================
-- V33: Academic Years, Grades, and Classes Management
-- =============================================================================

CREATE TABLE IF NOT EXISTS academic_years (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    khmer_name VARCHAR(150),
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    company_code VARCHAR(50) NOT NULL DEFAULT 'default',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_years_comp_code 
    ON academic_years (company_code, code) 
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS academic_grades (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    khmer_name VARCHAR(100),
    academic_year VARCHAR(50) NOT NULL,
    sequence_order INT NOT NULL DEFAULT 1,
    description VARCHAR(255),
    company_code VARCHAR(50) NOT NULL DEFAULT 'default',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_academic_grades_comp_year 
    ON academic_grades (company_code, academic_year);

CREATE TABLE IF NOT EXISTS academic_classes (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    khmer_name VARCHAR(100),
    grade_id BIGINT REFERENCES academic_grades(id) ON DELETE SET NULL,
    grade_name VARCHAR(50) NOT NULL,
    academic_year VARCHAR(50) NOT NULL,
    room_number VARCHAR(50),
    homeroom_teacher_id BIGINT,
    homeroom_teacher_name VARCHAR(150),
    telegram_chat_id VARCHAR(100),
    max_students INT NOT NULL DEFAULT 40,
    branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
    company_code VARCHAR(50) NOT NULL DEFAULT 'default',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_academic_classes_comp_year 
    ON academic_classes (company_code, academic_year);

CREATE INDEX IF NOT EXISTS idx_academic_classes_grade 
    ON academic_classes (grade_id);

-- Seed Academic Years from existing active students
INSERT INTO academic_years (code, name, khmer_name, is_current, company_code)
SELECT DISTINCT
    COALESCE(s.academic_year, '2026-2027'),
    'Academic Year ' || COALESCE(s.academic_year, '2026-2027'),
    'ឆ្នាំសិក្សា ' || COALESCE(s.academic_year, '2026-2027'),
    (CASE WHEN COALESCE(s.academic_year, '2026-2027') = '2026-2027' THEN TRUE ELSE FALSE END),
    COALESCE(s.company_code, 'default')
FROM students s
WHERE s.deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- If no academic year exists, insert default 2026-2027
INSERT INTO academic_years (code, name, khmer_name, is_current, company_code)
VALUES 
    ('2025-2026', 'Academic Year 2025-2026', 'ឆ្នាំសិក្សា ២០២៥-២០២៦', FALSE, 'default'),
    ('2026-2027', 'Academic Year 2026-2027', 'ឆ្នាំសិក្សា ២០២៦-២០២៧', TRUE, 'default'),
    ('2027-2028', 'Academic Year 2027-2028', 'ឆ្នាំសិក្សា ២០២៧-២០២៨', FALSE, 'default')
ON CONFLICT DO NOTHING;

-- Seed Academic Grades from distinct grades in students table
INSERT INTO academic_grades (name, khmer_name, academic_year, sequence_order, company_code)
SELECT DISTINCT
    s.grade,
    s.grade,
    COALESCE(s.academic_year, '2026-2027'),
    CASE 
        WHEN s.grade ILIKE '%Grade 7%' THEN 7
        WHEN s.grade ILIKE '%Grade 8%' THEN 8
        WHEN s.grade ILIKE '%Grade 9%' THEN 9
        WHEN s.grade ILIKE '%Grade 10%' THEN 10
        WHEN s.grade ILIKE '%Grade 11%' THEN 11
        WHEN s.grade ILIKE '%Grade 12%' THEN 12
        ELSE 1
    END,
    COALESCE(s.company_code, 'default')
FROM students s
WHERE s.deleted_at IS NULL AND s.grade IS NOT NULL AND s.grade != ''
ON CONFLICT DO NOTHING;

-- Seed Academic Classes from distinct class_name in students table
INSERT INTO academic_classes (name, khmer_name, grade_name, academic_year, company_code)
SELECT DISTINCT
    s.class_name,
    s.class_name,
    COALESCE(s.grade, 'General'),
    COALESCE(s.academic_year, '2026-2027'),
    COALESCE(s.company_code, 'default')
FROM students s
WHERE s.deleted_at IS NULL AND s.class_name IS NOT NULL AND s.class_name != ''
ON CONFLICT DO NOTHING;

-- Link academic_classes.grade_id to academic_grades.id
UPDATE academic_classes c
SET grade_id = g.id
FROM academic_grades g
WHERE c.grade_name = g.name 
  AND c.academic_year = g.academic_year 
  AND c.company_code = g.company_code
  AND c.grade_id IS NULL;


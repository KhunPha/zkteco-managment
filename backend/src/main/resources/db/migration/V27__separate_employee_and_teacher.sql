-- V27__separate_employee_and_teacher.sql
-- Explicitly separate general employees (staff) and teachers/lecturers

ALTER TABLE employees ADD COLUMN IF NOT EXISTS staff_type VARCHAR(50) NOT NULL DEFAULT 'EMPLOYEE';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_teacher BOOLEAN NOT NULL DEFAULT FALSE;

-- Migrate existing academic / teaching staff to TEACHER
UPDATE employees
SET staff_type = 'TEACHER', is_teacher = TRUE
WHERE deleted_at IS NULL
  AND (
    department_id IN (SELECT id FROM departments WHERE code = 'ACAD' OR LOWER(name) LIKE '%acad%' OR LOWER(name) LIKE '%teach%')
    OR position_id IN (SELECT id FROM positions WHERE code = 'TCHR' OR LOWER(title) LIKE '%teacher%' OR LOWER(title) LIKE '%lecturer%' OR LOWER(title) LIKE '%instructor%' OR LOWER(title) LIKE '%prof%')
  );

-- Indexes for high performance filtering
CREATE INDEX IF NOT EXISTS idx_employees_staff_type ON employees(staff_type);
CREATE INDEX IF NOT EXISTS idx_employees_is_teacher ON employees(is_teacher);
CREATE INDEX IF NOT EXISTS idx_employees_company_staff_type ON employees(company_code, staff_type);
CREATE INDEX IF NOT EXISTS idx_employees_company_is_teacher ON employees(company_code, is_teacher);


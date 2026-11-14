-- V28__institutional_id_and_fix_duplicate_constraints.sql
-- 1. Fix soft-delete collision on employees & students: use partial unique indexes (WHERE deleted_at IS NULL)
ALTER TABLE employees DROP CONSTRAINT IF EXISTS uq_employee_company_code;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_employee_code_key;
DROP INDEX IF EXISTS uq_employee_company_code;

-- Mangle existing soft-deleted records so they never conflict
UPDATE employees
SET employee_code = employee_code || '_del_' || id
WHERE deleted_at IS NOT NULL AND employee_code NOT LIKE '%_del_%';

CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_company_code ON employees (company_code, employee_code) WHERE deleted_at IS NULL;

-- Students soft-delete fix
ALTER TABLE students DROP CONSTRAINT IF EXISTS uq_student_company_code;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_student_code_key;
DROP INDEX IF EXISTS uq_student_company_code;

UPDATE students
SET student_code = student_code || '_del_' || id
WHERE deleted_at IS NOT NULL AND student_code NOT LIKE '%_del_%';

CREATE UNIQUE INDEX IF NOT EXISTS uq_student_company_code ON students (company_code, student_code) WHERE deleted_at IS NULL;

-- 2. Add institutional text ID column (id_number) to employees (staff & teachers) and students
ALTER TABLE employees ADD COLUMN IF NOT EXISTS id_number VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS id_number VARCHAR(100);

-- Backfill default institutional IDs for existing active records
UPDATE employees
SET id_number = CASE 
    WHEN staff_type = 'TEACHER' OR is_teacher = TRUE THEN 'FBIST' || LPAD(REGEXP_REPLACE(employee_code, '[^0-9]', '', 'g'), 4, '0')
    ELSE 'FBISS' || LPAD(REGEXP_REPLACE(employee_code, '[^0-9]', '', 'g'), 4, '0')
END
WHERE id_number IS NULL AND employee_code NOT LIKE '%_del_%';

UPDATE students
SET id_number = 'FBIS' || LPAD(REGEXP_REPLACE(student_code, '[^0-9]', '', 'g'), 4, '0')
WHERE id_number IS NULL AND student_code NOT LIKE '%_del_%';

-- Performance indexes for institutional ID searches
CREATE INDEX IF NOT EXISTS idx_employees_id_number ON employees(company_code, id_number);
CREATE INDEX IF NOT EXISTS idx_students_id_number ON students(company_code, id_number);


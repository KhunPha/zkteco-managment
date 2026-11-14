-- =============================================================================
-- V25: Scope Personnel Unique Constraints and Performance Indexes by Company
-- Allows each tenant company to have independent employee and student code
-- numbering (e.g. employee 1001, student 2001) without cross-tenant collisions.
-- =============================================================================

-- 1. Scope Employee Code by Company
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_employee_code_key;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS uq_employee_company_code;
ALTER TABLE employees ADD CONSTRAINT uq_employee_company_code UNIQUE (company_code, employee_code);

-- 2. Scope Student Code by Company
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_student_code_key;
ALTER TABLE students DROP CONSTRAINT IF EXISTS uq_student_company_code;
ALTER TABLE students ADD CONSTRAINT uq_student_company_code UNIQUE (company_code, student_code);

-- 3. Composite Indexes for Multi-Tenant Query Performance & Strict Isolation
CREATE INDEX IF NOT EXISTS idx_employees_comp_status ON employees(company_code, employment_status);
CREATE INDEX IF NOT EXISTS idx_students_comp_status ON students(company_code, status);
CREATE INDEX IF NOT EXISTS idx_records_comp_date ON attendance_records(company_code, attendance_date);
CREATE INDEX IF NOT EXISTS idx_records_comp_status ON attendance_records(company_code, status);
CREATE INDEX IF NOT EXISTS idx_raw_logs_comp_punch ON attendance_raw_logs(company_code, punch_time);
CREATE INDEX IF NOT EXISTS idx_devices_comp_status ON attendance_devices(company_code, connection_status);
CREATE INDEX IF NOT EXISTS idx_device_users_comp ON attendance_device_users(company_code, device_pin);
CREATE INDEX IF NOT EXISTS idx_users_comp ON users(company_code);


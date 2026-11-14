-- Flyway Migration V22: Synchronize company_code on attendance_records and attendance_raw_logs

-- 1. Sync attendance_records with employee company_code
UPDATE attendance_records a
SET company_code = e.company_code
FROM employees e
WHERE a.employee_id = e.id AND e.company_code IS NOT NULL AND a.company_code <> e.company_code;

-- 2. Sync attendance_records with student company_code
UPDATE attendance_records a
SET company_code = s.company_code
FROM students s
WHERE a.student_id = s.id AND s.company_code IS NOT NULL AND a.company_code <> s.company_code;

-- 3. Sync attendance_raw_logs with employee company_code
UPDATE attendance_raw_logs l
SET company_code = e.company_code
FROM employees e
WHERE l.device_pin = e.employee_code AND e.company_code IS NOT NULL AND l.company_code <> e.company_code;

-- 4. Sync attendance_raw_logs with student company_code
UPDATE attendance_raw_logs l
SET company_code = s.company_code
FROM students s
WHERE l.device_pin = s.student_code AND s.company_code IS NOT NULL AND l.company_code <> s.company_code;


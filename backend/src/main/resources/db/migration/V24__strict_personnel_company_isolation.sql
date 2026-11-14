-- V24: Enforce strict personnel company isolation on attendance raw logs
-- Revert any raw log not belonging to fbis_scool personnel back to 'default'

-- 1. Revert raw logs belonging to default employees
UPDATE attendance_raw_logs r
SET company_code = 'default'
FROM employees e
WHERE (r.device_pin = e.employee_code OR r.device_pin = CAST(e.id AS VARCHAR))
  AND e.company_code = 'default'
  AND r.company_code <> 'default';

-- 2. Revert raw logs belonging to default students
UPDATE attendance_raw_logs r
SET company_code = 'default'
FROM students s
WHERE (r.device_pin = s.student_code OR r.device_pin = CAST(s.id AS VARCHAR))
  AND s.company_code = 'default'
  AND r.company_code <> 'default';

-- 3. Reset any raw log in 'fbis_scool' that does NOT belong to fbis_scool personnel
UPDATE attendance_raw_logs r
SET company_code = 'default'
WHERE r.company_code = 'fbis_scool'
  AND r.device_pin NOT IN (
    SELECT employee_code FROM employees WHERE company_code = 'fbis_scool' AND employee_code IS NOT NULL
    UNION
    SELECT CAST(id AS VARCHAR) FROM employees WHERE company_code = 'fbis_scool'
    UNION
    SELECT student_code FROM students WHERE company_code = 'fbis_scool' AND student_code IS NOT NULL
    UNION
    SELECT CAST(id AS VARCHAR) FROM students WHERE company_code = 'fbis_scool'
    UNION
    SELECT device_pin FROM attendance_device_users WHERE company_code = 'fbis_scool' AND device_pin IS NOT NULL
  );

-- 4. Ensure all raw logs of fbis_scool personnel strictly have company_code = 'fbis_scool'
UPDATE attendance_raw_logs r
SET company_code = 'fbis_scool'
WHERE r.device_pin IN (
    SELECT employee_code FROM employees WHERE company_code = 'fbis_scool' AND employee_code IS NOT NULL
    UNION
    SELECT CAST(id AS VARCHAR) FROM employees WHERE company_code = 'fbis_scool'
    UNION
    SELECT student_code FROM students WHERE company_code = 'fbis_scool' AND student_code IS NOT NULL
    UNION
    SELECT CAST(id AS VARCHAR) FROM students WHERE company_code = 'fbis_scool'
    UNION
    SELECT device_pin FROM attendance_device_users WHERE company_code = 'fbis_scool' AND device_pin IS NOT NULL
);


-- Flyway Migration V21: Synchronize company_code across attendance_device_users and face_biometrics

UPDATE attendance_device_users u
SET company_code = e.company_code
FROM employees e
WHERE u.employee_id = e.id AND e.company_code IS NOT NULL AND u.company_code <> e.company_code;

UPDATE attendance_device_users u
SET company_code = s.company_code
FROM students s
WHERE u.student_id = s.id AND s.company_code IS NOT NULL AND u.company_code <> s.company_code;

UPDATE face_biometrics fb
SET company_code = e.company_code
FROM employees e
WHERE fb.employee_id = e.id AND e.company_code IS NOT NULL AND fb.company_code <> e.company_code;

UPDATE face_biometrics fb
SET company_code = s.company_code
FROM students s
WHERE fb.student_id = s.id AND s.company_code IS NOT NULL AND fb.company_code <> s.company_code;


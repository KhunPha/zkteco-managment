-- V23: Fix raw logs and devices company code multi-tenant mapping
-- Assign physical terminal BYRQ211860043 to fbis_scool if currently default
UPDATE attendance_devices 
SET company_code = 'fbis_scool' 
WHERE serial_number = 'BYRQ211860043' AND (company_code IS NULL OR company_code = 'default');

-- Update raw logs matching employees
UPDATE attendance_raw_logs r
SET company_code = e.company_code
FROM employees e
WHERE (r.device_pin = e.employee_code OR r.device_pin = CAST(e.id AS VARCHAR))
  AND e.company_code IS NOT NULL
  AND r.company_code <> e.company_code;

-- Update raw logs matching students
UPDATE attendance_raw_logs r
SET company_code = s.company_code
FROM students s
WHERE (r.device_pin = s.student_code OR r.device_pin = CAST(s.id AS VARCHAR))
  AND s.company_code IS NOT NULL
  AND r.company_code <> s.company_code;

-- Update raw logs matching device users
UPDATE attendance_raw_logs r
SET company_code = du.company_code
FROM attendance_device_users du
WHERE r.device_pin = du.device_pin
  AND du.company_code IS NOT NULL
  AND r.company_code <> du.company_code;

-- Update raw logs captured from BYRQ211860043
UPDATE attendance_raw_logs r
SET company_code = 'fbis_scool'
WHERE r.device_sn = 'BYRQ211860043' AND (r.company_code IS NULL OR r.company_code = 'default');


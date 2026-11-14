-- V29__institutional_id_format_update.sql
-- Format students id_number to match FBIS + 2-digit year + 4-digit auto index (e.g. FBIS250134, FBIS260001)

-- 1. Upgrade 5-digit student codes (2-digit year + 3-digit index like 25134) to FBIS + YY + 4-digit index (FBIS250134)
UPDATE students
SET id_number = 'FBIS' || SUBSTRING(REGEXP_REPLACE(student_code, '[^0-9]', '', 'g') FROM 1 FOR 2) || LPAD(SUBSTRING(REGEXP_REPLACE(student_code, '[^0-9]', '', 'g') FROM 3), 4, '0')
WHERE student_code ~ '^[0-9]{5}$' 
  AND (id_number IS NULL OR id_number ~ '^FBIS[0-9]{4}$');

-- 2. Upgrade any other students that have short codes to FBIS + 26 + 4-digit index
UPDATE students
SET id_number = 'FBIS26' || LPAD(REGEXP_REPLACE(student_code, '[^0-9]', '', 'g'), 4, '0')
WHERE id_number IS NULL OR id_number = '' OR id_number ~ '^FBIS[0-9]{1,3}$';

-- 3. Upgrade teachers without year prefix to FBIST + 26 + 4-digit index if needed
UPDATE employees
SET id_number = 'FBIST26' || LPAD(REGEXP_REPLACE(employee_code, '[^0-9]', '', 'g'), 4, '0')
WHERE (staff_type = 'TEACHER' OR is_teacher = TRUE)
  AND (id_number IS NULL OR id_number = '' OR id_number ~ '^FBIST[0-9]{1,3}$');

-- 4. Upgrade employees without year prefix to FBISS + 26 + 4-digit index if needed
UPDATE employees
SET id_number = 'FBISS26' || LPAD(REGEXP_REPLACE(employee_code, '[^0-9]', '', 'g'), 4, '0')
WHERE (staff_type = 'EMPLOYEE' AND is_teacher = FALSE)
  AND (id_number IS NULL OR id_number = '' OR id_number ~ '^FBISS[0-9]{1,3}$');


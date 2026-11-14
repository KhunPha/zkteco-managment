-- V31__cleanup_orphaned_device_users.sql
-- 1. Remove orphaned device users whose corresponding employee or student is soft-deleted
DELETE FROM attendance_device_users
WHERE employee_id IN (SELECT id FROM employees WHERE deleted_at IS NOT NULL);

DELETE FROM attendance_device_users
WHERE student_id IN (SELECT id FROM students WHERE deleted_at IS NOT NULL);

-- 2. Remove any test device users with codes starting with 4000
DELETE FROM attendance_device_users
WHERE device_pin ~ '^400[0-9]+$' 
  AND (employee_id IS NULL OR employee_id IN (SELECT id FROM employees WHERE deleted_at IS NOT NULL))
  AND (student_id IS NULL OR student_id IN (SELECT id FROM students WHERE deleted_at IS NOT NULL));


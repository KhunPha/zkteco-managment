-- V11: Enforce numeric personnel codes (update historical TCH- prefixes to numeric 9001-9004)
UPDATE employees SET employee_code = '9001' WHERE employee_code = 'TCH-001';
UPDATE employees SET employee_code = '9002' WHERE employee_code = 'TCH-002';
UPDATE employees SET employee_code = '9003' WHERE employee_code = 'TCH-003';
UPDATE employees SET employee_code = '9004' WHERE employee_code = 'TCH-004';

UPDATE attendance_device_users SET device_pin = '9001' WHERE device_pin = 'TCH-001';
UPDATE attendance_device_users SET device_pin = '9002' WHERE device_pin = 'TCH-002';
UPDATE attendance_device_users SET device_pin = '9003' WHERE device_pin = 'TCH-003';
UPDATE attendance_device_users SET device_pin = '9004' WHERE device_pin = 'TCH-004';

UPDATE attendance_raw_logs SET device_pin = '9001' WHERE device_pin = 'TCH-001';
UPDATE card_history SET device_pin = '9001' WHERE device_pin = 'TCH-001';

-- Update ADMS_PUSH_PORT setting to 8484
UPDATE system_settings SET setting_value = '8484' WHERE setting_key = 'ADMS_PUSH_PORT';


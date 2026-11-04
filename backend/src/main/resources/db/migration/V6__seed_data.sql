-- =============================================================================
-- V6: Seed Data (Roles, Permissions, Admin User, Branches, Departments, Shifts)
-- =============================================================================

-- 1. Permissions
INSERT INTO permissions (code, module, description) VALUES
('user.read', 'USER', 'View users'),
('user.create', 'USER', 'Create users'),
('user.update', 'USER', 'Update users'),
('user.delete', 'USER', 'Delete users'),
('role.read', 'ROLE', 'View roles'),
('role.create', 'ROLE', 'Create roles'),
('role.update', 'ROLE', 'Update roles'),
('employee.read', 'EMPLOYEE', 'View employees'),
('employee.create', 'EMPLOYEE', 'Create employees'),
('employee.update', 'EMPLOYEE', 'Update employees'),
('employee.delete', 'EMPLOYEE', 'Delete employees'),
('student.read', 'STUDENT', 'View students'),
('student.create', 'STUDENT', 'Create students'),
('student.update', 'STUDENT', 'Update students'),
('student.delete', 'STUDENT', 'Delete students'),
('department.read', 'ORGANIZATION', 'View departments'),
('department.create', 'ORGANIZATION', 'Create departments'),
('department.update', 'ORGANIZATION', 'Update departments'),
('branch.read', 'ORGANIZATION', 'View branches'),
('branch.create', 'ORGANIZATION', 'Create branches'),
('branch.update', 'ORGANIZATION', 'Update branches'),
('device.read', 'DEVICE', 'View biometric devices'),
('device.create', 'DEVICE', 'Register new biometric devices'),
('device.update', 'DEVICE', 'Update biometric devices'),
('device.delete', 'DEVICE', 'Remove biometric devices'),
('device.sync', 'DEVICE', 'Synchronize device data and users'),
('device.restart', 'DEVICE', 'Restart terminal remotely'),
('attendance.read', 'ATTENDANCE', 'View attendance logs and records'),
('attendance.create', 'ATTENDANCE', 'Add manual attendance'),
('attendance.update', 'ATTENDANCE', 'Edit attendance records'),
('attendance.approve', 'ATTENDANCE', 'Approve attendance adjustments'),
('attendance.process', 'ATTENDANCE', 'Trigger attendance calculation'),
('shift.read', 'SHIFT', 'View shifts and schedules'),
('shift.create', 'SHIFT', 'Create shifts'),
('shift.update', 'SHIFT', 'Update shifts'),
('schedule.read', 'SCHEDULE', 'View schedules'),
('schedule.create', 'SCHEDULE', 'Assign schedules'),
('schedule.update', 'SCHEDULE', 'Update schedules'),
('leave.read', 'LEAVE', 'View leave requests'),
('leave.apply', 'LEAVE', 'Apply for leave'),
('leave.approve', 'LEAVE', 'Approve or reject leave'),
('holiday.read', 'HOLIDAY', 'View holidays'),
('holiday.create', 'HOLIDAY', 'Create holidays'),
('holiday.update', 'HOLIDAY', 'Update holidays'),
('report.read', 'REPORT', 'View attendance reports'),
('report.export', 'REPORT', 'Export reports to Excel, PDF, CSV'),
('settings.read', 'SETTINGS', 'View system settings'),
('settings.manage', 'SETTINGS', 'Update system settings'),
('audit.read', 'AUDIT', 'View audit logs')
ON CONFLICT (code) DO NOTHING;

-- 2. Roles
INSERT INTO roles (name, description, is_system) VALUES
('SUPER_ADMIN', 'Super Administrator with unrestricted access', TRUE),
('ADMIN', 'System Administrator', TRUE),
('HR_MANAGER', 'Human Resources Manager', TRUE),
('HR_STAFF', 'Human Resources Staff', TRUE),
('DEPARTMENT_MANAGER', 'Department Head / Manager', TRUE),
('SUPERVISOR', 'Team Supervisor', TRUE),
('TEACHER', 'School Instructor / Teacher', TRUE),
('EMPLOYEE', 'Standard Employee', TRUE),
('STUDENT', 'Student Access', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Grant all permissions to SUPER_ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;

-- 3. Default System Settings
INSERT INTO system_settings (setting_key, setting_value, category, description) VALUES
('COMPANY_NAME', 'Enterprise Biometrics Organization', 'GENERAL', 'Organization display name'),
('TIMEZONE', 'Asia/Phnom_Penh', 'GENERAL', 'Primary operational timezone'),
('DATE_FORMAT', 'YYYY-MM-DD', 'GENERAL', 'Default date display format'),
('TIME_FORMAT', 'HH:mm:ss', 'GENERAL', 'Default time display format'),
('AUTO_PROCESS_ATTENDANCE', 'true', 'ATTENDANCE', 'Automatically process attendance hourly'),
('LATE_GRACE_MINUTES', '15', 'ATTENDANCE', 'Standard grace period for late arrival'),
('EARLY_DEPARTURE_GRACE_MINUTES', '15', 'ATTENDANCE', 'Standard grace period for early departure'),
('STUDENT_ATTENDANCE_ENABLED', 'true', 'MODULES', 'Toggle student attendance module'),
('ADMS_PUSH_PORT', '8080', 'DEVICE', 'ADMS Push HTTP receiver port'),
('TCP_POLL_INTERVAL_SECONDS', '300', 'DEVICE', 'Interval for TCP/IP device pulling')
ON CONFLICT (setting_key) DO NOTHING;

-- 4. Initial Branch & Departments
INSERT INTO branches (code, name, address, phone, email, is_active) VALUES
('HQ-PP', 'Phnom Penh Main Campus', 'Norodom Blvd, Phnom Penh, Cambodia', '+855 23 888 999', 'info@enterprise.edu.kh', TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO departments (branch_id, code, name, is_active) VALUES
(1, 'MGMT', 'Executive Management', TRUE),
(1, 'HR', 'Human Resources', TRUE),
(1, 'IT', 'Information Technology', TRUE),
(1, 'ACAD', 'Academic Affairs', TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO positions (code, title, description, is_active) VALUES
('CEO', 'Chief Executive Officer', 'Head of Organization', TRUE),
('HRM', 'HR Manager', 'Lead of Human Resources', TRUE),
('SWE', 'Senior Software Engineer', 'Software Development Lead', TRUE),
('TCHR', 'Lecturer / Instructor', 'Academic Faculty Member', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 5. Standard Shifts
INSERT INTO shifts (code, name, start_time, end_time, break_start, break_end, grace_late_minutes, grace_early_leave_minutes, work_hours, is_overnight, is_flexible, requires_checkout) VALUES
('SHIFT_MORNING', 'Standard 8-Hour Full Shift (No Break)', '08:00:00', '16:00:00', NULL, NULL, 15, 15, 8.0, FALSE, FALSE, TRUE),
('SHIFT_TEACHER', 'Academic Faculty Shift', '07:30:00', '16:30:00', '11:30:00', '13:00:00', 10, 10, 7.5, FALSE, FALSE, TRUE)
ON CONFLICT (code) DO NOTHING;

-- 6. Standard Leave Types
INSERT INTO leave_types (code, name, description, is_paid, default_days_per_year, requires_approval) VALUES
('ANNUAL', 'Annual Paid Leave', 'Standard statutory annual vacation leave', TRUE, 18, TRUE),
('SICK', 'Sick Leave', 'Medical leave with medical certificate', TRUE, 10, TRUE),
('MATERNITY', 'Maternity Leave', 'Maternity leave for female staff', TRUE, 90, TRUE),
('UNPAID', 'Unpaid Leave', 'Authorized leave without compensation', FALSE, 30, TRUE),
('SPECIAL', 'Special Emergency Leave', 'Compassionate or emergency family leave', TRUE, 5, TRUE)
ON CONFLICT (code) DO NOTHING;


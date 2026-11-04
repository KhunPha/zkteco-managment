-- =============================================================================
-- V5: Attendance Raw Logs, Daily Processed Records, Corrections, Notifications
-- =============================================================================

CREATE TABLE IF NOT EXISTS attendance_raw_logs (
    id BIGSERIAL PRIMARY KEY,
    device_id BIGINT REFERENCES attendance_devices(id) ON DELETE SET NULL,
    device_sn VARCHAR(100) NOT NULL,
    device_pin VARCHAR(50) NOT NULL,
    punch_time TIMESTAMP WITH TIME ZONE NOT NULL,
    verify_type VARCHAR(50) NOT NULL DEFAULT 'OTHER', -- FINGERPRINT, FACE, CARD, PASSWORD, OTHER
    punch_state VARCHAR(50) NOT NULL DEFAULT 'CHECK_IN', -- CHECK_IN, CHECK_OUT, BREAK_OUT, BREAK_IN, OVERTIME_IN, OVERTIME_OUT, UNKNOWN
    work_code VARCHAR(50),
    original_payload TEXT,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id BIGSERIAL PRIMARY KEY,
    attendance_date DATE NOT NULL,
    employee_id BIGINT REFERENCES employees(id) ON DELETE CASCADE,
    student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
    shift_id BIGINT REFERENCES shifts(id) ON DELETE SET NULL,
    first_check_in TIMESTAMP WITH TIME ZONE,
    last_check_out TIMESTAMP WITH TIME ZONE,
    in_device_id BIGINT REFERENCES attendance_devices(id) ON DELETE SET NULL,
    out_device_id BIGINT REFERENCES attendance_devices(id) ON DELETE SET NULL,
    total_work_minutes INT NOT NULL DEFAULT 0,
    late_minutes INT NOT NULL DEFAULT 0,
    early_leave_minutes INT NOT NULL DEFAULT 0,
    overtime_minutes INT NOT NULL DEFAULT 0,
    break_minutes INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'ABSENT', -- PRESENT, LATE, EARLY_DEPARTURE, ABSENT, HALF_DAY, ON_LEAVE, HOLIDAY, REST_DAY
    is_manual_adjusted BOOLEAN NOT NULL DEFAULT FALSE,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_emp_att_date UNIQUE (employee_id, attendance_date),
    CONSTRAINT uq_student_att_date UNIQUE (student_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS attendance_corrections (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_record_id BIGINT REFERENCES attendance_records(id) ON DELETE SET NULL,
    attendance_date DATE NOT NULL,
    original_check_in TIMESTAMP WITH TIME ZONE,
    original_check_out TIMESTAMP WITH TIME ZONE,
    requested_check_in TIMESTAMP WITH TIME ZONE,
    requested_check_out TIMESTAMP WITH TIME ZONE,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    approver_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_processing_logs (
    id BIGSERIAL PRIMARY KEY,
    process_date DATE NOT NULL,
    total_raw_logs INT NOT NULL DEFAULT 0,
    total_processed INT NOT NULL DEFAULT 0,
    total_errors INT NOT NULL DEFAULT 0,
    error_details TEXT,
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'INFO', -- INFO, WARNING, ALERT, ATTENDANCE, DEVICE, LEAVE
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    link_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_raw_logs_pin_time ON attendance_raw_logs(device_pin, punch_time);
CREATE INDEX IF NOT EXISTS idx_raw_logs_sn_time ON attendance_raw_logs(device_sn, punch_time);
CREATE INDEX IF NOT EXISTS idx_raw_logs_processed ON attendance_raw_logs(processed);
CREATE INDEX IF NOT EXISTS idx_records_emp_date ON attendance_records(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_records_student_date ON attendance_records(student_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_records_status ON attendance_records(status);
CREATE INDEX IF NOT EXISTS idx_corrections_emp ON attendance_corrections(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);


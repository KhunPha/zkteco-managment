-- =============================================================================
-- V3: Biometric Devices, Device Users, Sync & Operation Logs
-- =============================================================================

CREATE TABLE IF NOT EXISTS attendance_devices (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    model VARCHAR(100),
    ip_address VARCHAR(50),
    port INT NOT NULL DEFAULT 4370,
    comm_key VARCHAR(100) DEFAULT '0',
    integration_type VARCHAR(50) NOT NULL DEFAULT 'ADMS_PUSH', -- TCP_PULL, ADMS_PUSH, SDK_STANDALONE
    location VARCHAR(255),
    branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
    department_id BIGINT REFERENCES departments(id) ON DELETE SET NULL,
    description TEXT,
    connection_status VARCHAR(50) NOT NULL DEFAULT 'OFFLINE', -- ONLINE, OFFLINE, ERROR, UNKNOWN
    last_communication TIMESTAMP WITH TIME ZONE,
    last_sync TIMESTAMP WITH TIME ZONE,
    firmware_version VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_device_users (
    id BIGSERIAL PRIMARY KEY,
    device_id BIGINT NOT NULL REFERENCES attendance_devices(id) ON DELETE CASCADE,
    device_pin VARCHAR(50) NOT NULL,
    employee_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    student_id BIGINT REFERENCES students(id) ON DELETE SET NULL,
    name_on_device VARCHAR(150),
    privilege VARCHAR(50) NOT NULL DEFAULT 'NORMAL_USER', -- NORMAL_USER, ENROLLER, ADMIN, SUPER_ADMIN
    card_number VARCHAR(50),
    password VARCHAR(50),
    face_enrolled BOOLEAN NOT NULL DEFAULT FALSE,
    fingerprint_count INT NOT NULL DEFAULT 0,
    sync_status VARCHAR(50) NOT NULL DEFAULT 'SYNCED', -- SYNCED, PENDING_UPLOAD, PENDING_DELETE, ERROR
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_device_pin UNIQUE (device_id, device_pin)
);

CREATE TABLE IF NOT EXISTS device_sync_logs (
    id BIGSERIAL PRIMARY KEY,
    device_id BIGINT NOT NULL REFERENCES attendance_devices(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL, -- LOG_DOWNLOAD, USER_SYNC, TIME_SYNC, COMMAND
    status VARCHAR(50) NOT NULL, -- SUCCESS, FAILED, PARTIAL
    records_retrieved INT NOT NULL DEFAULT 0,
    records_inserted INT NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS device_operation_logs (
    id BIGSERIAL PRIMARY KEY,
    device_id BIGINT NOT NULL REFERENCES attendance_devices(id) ON DELETE CASCADE,
    operation VARCHAR(50) NOT NULL, -- CONNECT, DISCONNECT, RESTART, CLEAR_LOGS, SYNC_TIME, ENROLL_USER, INFO
    initiated_by VARCHAR(100),
    parameters TEXT,
    result VARCHAR(50) NOT NULL, -- SUCCESS, FAILED
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_commands (
    id BIGSERIAL PRIMARY KEY,
    device_id BIGINT NOT NULL REFERENCES attendance_devices(id) ON DELETE CASCADE,
    command_content TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, SENT, EXECUTED, FAILED
    response_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE,
    executed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_devices_sn ON attendance_devices(serial_number);
CREATE INDEX IF NOT EXISTS idx_device_users_pin ON attendance_device_users(device_pin);
CREATE INDEX IF NOT EXISTS idx_device_users_emp ON attendance_device_users(employee_id);
CREATE INDEX IF NOT EXISTS idx_device_users_student ON attendance_device_users(student_id);
CREATE INDEX IF NOT EXISTS idx_device_commands_status ON device_commands(device_id, status);


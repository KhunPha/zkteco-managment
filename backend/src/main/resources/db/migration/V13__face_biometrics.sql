-- Migration V13: Face Biometrics Schema for Direct Webcam Enrollment & Recognition
CREATE TABLE IF NOT EXISTS face_biometrics (
    id BIGSERIAL PRIMARY KEY,
    device_pin VARCHAR(50) NOT NULL,
    personnel_type VARCHAR(50) NOT NULL DEFAULT 'EMPLOYEE',
    employee_id BIGINT REFERENCES employees(id) ON DELETE CASCADE,
    student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
    person_name VARCHAR(150),
    photo_path VARCHAR(255) NOT NULL,
    descriptor_json TEXT NOT NULL,
    quality_score DOUBLE PRECISION DEFAULT 1.0,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_face_device_pin UNIQUE (device_pin)
);

CREATE INDEX IF NOT EXISTS idx_face_biometrics_pin ON face_biometrics(device_pin);
CREATE INDEX IF NOT EXISTS idx_face_biometrics_emp ON face_biometrics(employee_id);
CREATE INDEX IF NOT EXISTS idx_face_biometrics_student ON face_biometrics(student_id);

CREATE TABLE IF NOT EXISTS face_scan_logs (
    id BIGSERIAL PRIMARY KEY,
    device_pin VARCHAR(50),
    person_name VARCHAR(150),
    personnel_type VARCHAR(50),
    confidence_score DOUBLE PRECISION,
    distance DOUBLE PRECISION,
    photo_path VARCHAR(255),
    punch_state VARCHAR(50) DEFAULT 'CHECK_IN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_face_scan_logs_pin ON face_scan_logs(device_pin);
CREATE INDEX IF NOT EXISTS idx_face_scan_logs_created ON face_scan_logs(created_at);


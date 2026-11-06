-- =============================================================================
-- V7: Card Number History & Annual Card Renewal Tracking
-- =============================================================================

CREATE TABLE IF NOT EXISTS card_history (
    id BIGSERIAL PRIMARY KEY,
    device_pin VARCHAR(50) NOT NULL,
    card_number VARCHAR(50) NOT NULL,
    previous_card_number VARCHAR(50),
    academic_year VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, REPLACED, EXPIRED, LOST
    issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE,
    replaced_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    employee_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    student_id BIGINT REFERENCES students(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_card_history_pin ON card_history(device_pin);
CREATE INDEX IF NOT EXISTS idx_card_history_card ON card_history(card_number);
CREATE INDEX IF NOT EXISTS idx_card_history_emp ON card_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_card_history_stu ON card_history(student_id);

-- Populate initial card history from existing active device users
INSERT INTO card_history (device_pin, card_number, academic_year, status, issued_date, notes, employee_id, student_id)
SELECT DISTINCT ON (u.device_pin)
    u.device_pin,
    u.card_number,
    '2025-2026',
    'ACTIVE',
    CURRENT_DATE - INTERVAL '1 year',
    'Initial enrollment card number',
    u.employee_id,
    u.student_id
FROM attendance_device_users u
WHERE u.card_number IS NOT NULL AND TRIM(u.card_number) <> '' AND u.card_number <> '0'
ON CONFLICT DO NOTHING;


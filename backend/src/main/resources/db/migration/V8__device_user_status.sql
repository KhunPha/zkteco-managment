-- ============================================================================
-- Flyway Migration V8: Add status column to attendance_device_users
-- ============================================================================

ALTER TABLE attendance_device_users 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_device_users_status ON attendance_device_users(status);

UPDATE attendance_device_users 
SET status = 'ACTIVE' 
WHERE status IS NULL;


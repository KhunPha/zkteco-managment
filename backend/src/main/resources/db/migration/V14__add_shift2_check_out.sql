-- ============================================================================
-- Flyway Migration V14: Add Shift 2 Check-Out column
-- ============================================================================

ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS shift2_check_out TIMESTAMP WITH TIME ZONE;


-- ============================================================================
-- Flyway Migration V9: Add Shift 1 Check-Out and Shift 2 Check-In columns
-- ============================================================================

ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS shift1_check_out TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS shift2_check_in TIMESTAMP WITH TIME ZONE;


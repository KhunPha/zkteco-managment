-- V12: Multi-Day Holiday Date Range Support (e.g. Khmer New Year 3-day holiday, Pchum Ben, Water Festival)
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS end_date DATE;

-- Drop single-date unique constraint so multi-day ranges and annual recurrences can be stored
ALTER TABLE holidays DROP CONSTRAINT IF EXISTS holidays_holiday_date_key;

-- Add index on end_date and date ranges for sub-millisecond holiday lookups
CREATE INDEX IF NOT EXISTS idx_holidays_end_date ON holidays(end_date);
CREATE INDEX IF NOT EXISTS idx_holidays_date_range ON holidays(holiday_date, end_date);


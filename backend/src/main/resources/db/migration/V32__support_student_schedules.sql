-- V32__support_student_schedules.sql
-- 1. Make employee_id nullable in employee_schedules so students can also be scheduled
ALTER TABLE employee_schedules ALTER COLUMN employee_id DROP NOT NULL;

-- 2. Add student_id to employee_schedules
ALTER TABLE employee_schedules ADD COLUMN IF NOT EXISTS student_id BIGINT REFERENCES students(id) ON DELETE CASCADE;

-- 3. Add constraint to ensure either employee_id OR student_id is set
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_schedule_person'
    ) THEN
        ALTER TABLE employee_schedules 
        ADD CONSTRAINT chk_schedule_person 
        CHECK ((employee_id IS NOT NULL AND student_id IS NULL) OR (employee_id IS NULL AND student_id IS NOT NULL));
    END IF;
END $$;

-- 4. Create index for student schedule queries
CREATE INDEX IF NOT EXISTS idx_schedules_stu ON employee_schedules(student_id);
CREATE INDEX IF NOT EXISTS idx_schedules_effective ON employee_schedules(effective_from, effective_to);


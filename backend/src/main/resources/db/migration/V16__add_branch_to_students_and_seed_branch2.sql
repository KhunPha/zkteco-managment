-- V16: Add branch support to students and register Branch 2 for multi-branch campuses

-- 1. Add branch_id foreign key to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_students_branch_id ON students(branch_id);

-- 2. Assign default branch_id = 1 to existing employees and students
UPDATE employees SET branch_id = 1 WHERE branch_id IS NULL;
UPDATE students SET branch_id = 1 WHERE branch_id IS NULL;

-- 3. Ensure Branch 1 has clear naming: Main Campus (Branch 1)
UPDATE branches SET name = 'Phnom Penh Main Campus (Branch 1)', code = 'BR-01' WHERE id = 1;

-- 4. Insert Branch 2 (Campus 2) for the workplace and organizations
INSERT INTO branches (code, name, address, phone, email, is_active, company_code, created_at, updated_at)
VALUES 
    ('BR-02', 'Tuol Kouk Campus (Branch 2)', 'Street 598, Tuol Kouk, Phnom Penh', '+855 23 888 002', 'branch2@enterprise.edu.kh', true, 'default', NOW(), NOW()),
    ('BR-02-AG', 'Angkor Branch 2 (Siem Reap Campus)', 'Sivutha Blvd, Siem Reap, Cambodia', '+855 63 969 002', 'branch2@angkor.com.kh', true, 'angkor_group', NOW(), NOW()),
    ('BR-02-ABA', 'ABA Bank Central Branch (Branch 2)', 'Norodom Blvd, Phnom Penh, Cambodia', '+855 23 225 334', 'branch2@ababank.com', true, 'aba_bank', NOW(), NOW())
ON CONFLICT DO NOTHING;


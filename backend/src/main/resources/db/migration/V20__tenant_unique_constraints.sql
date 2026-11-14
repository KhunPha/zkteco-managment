-- =============================================================================
-- V20: Scope Unique Constraints by Company / Tenant
-- Allows multiple companies to create departments, branches, positions, and
-- shifts with common business codes (e.g. IT, HR, ACAD, MGR) without collision.
-- =============================================================================

ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_code_key;
ALTER TABLE departments DROP CONSTRAINT IF EXISTS uq_dept_company_code;
ALTER TABLE departments ADD CONSTRAINT uq_dept_company_code UNIQUE (company_code, code);

ALTER TABLE branches DROP CONSTRAINT IF EXISTS branches_code_key;
ALTER TABLE branches DROP CONSTRAINT IF EXISTS uq_branch_company_code;
ALTER TABLE branches ADD CONSTRAINT uq_branch_company_code UNIQUE (company_code, code);

ALTER TABLE positions DROP CONSTRAINT IF EXISTS positions_code_key;
ALTER TABLE positions DROP CONSTRAINT IF EXISTS uq_position_company_code;
ALTER TABLE positions ADD CONSTRAINT uq_position_company_code UNIQUE (company_code, code);

ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_code_key;
ALTER TABLE shifts DROP CONSTRAINT IF EXISTS uq_shift_company_code;
ALTER TABLE shifts ADD CONSTRAINT uq_shift_company_code UNIQUE (company_code, code);


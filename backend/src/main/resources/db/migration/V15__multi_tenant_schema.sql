-- =============================================================================
-- V15: Multi-Tenant Architecture Schema (Companies / Tenants)
-- Enables selling this system to multiple companies on a single Cloud instance
-- =============================================================================

-- 1. Create Companies table
CREATE TABLE IF NOT EXISTS companies (
    id BIGSERIAL PRIMARY KEY,
    company_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    khmer_name VARCHAR(200),
    logo_url TEXT,
    plan VARCHAR(50) NOT NULL DEFAULT 'PRO', -- TRIAL, STARTER, PRO, ENTERPRISE
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, EXPIRED
    max_users INT NOT NULL DEFAULT 500,
    max_devices INT NOT NULL DEFAULT 10,
    contact_name VARCHAR(100),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(100),
    address TEXT,
    license_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Seed Default Institution (Preserves 100% of existing client data)
INSERT INTO companies (company_code, name, khmer_name, plan, status, max_users, max_devices)
VALUES ('default', 'Main Institution (HQ)', 'ស្ថាប័នកណ្តាល', 'ENTERPRISE', 'ACTIVE', 10000, 100)
ON CONFLICT (company_code) DO NOTHING;

-- 3. Add company_code column to all tenant-scoped entities with 'default' fallback
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_code VARCHAR(50) NOT NULL DEFAULT 'default';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS company_code VARCHAR(50) NOT NULL DEFAULT 'default';
ALTER TABLE students ADD COLUMN IF NOT EXISTS company_code VARCHAR(50) NOT NULL DEFAULT 'default';
ALTER TABLE departments ADD COLUMN IF NOT EXISTS company_code VARCHAR(50) NOT NULL DEFAULT 'default';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS company_code VARCHAR(50) NOT NULL DEFAULT 'default';
ALTER TABLE positions ADD COLUMN IF NOT EXISTS company_code VARCHAR(50) NOT NULL DEFAULT 'default';
ALTER TABLE attendance_devices ADD COLUMN IF NOT EXISTS company_code VARCHAR(50) NOT NULL DEFAULT 'default';
ALTER TABLE attendance_device_users ADD COLUMN IF NOT EXISTS company_code VARCHAR(50) NOT NULL DEFAULT 'default';
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS company_code VARCHAR(50) NOT NULL DEFAULT 'default';
ALTER TABLE attendance_raw_logs ADD COLUMN IF NOT EXISTS company_code VARCHAR(50) NOT NULL DEFAULT 'default';
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS company_code VARCHAR(50) NOT NULL DEFAULT 'default';
ALTER TABLE face_biometrics ADD COLUMN IF NOT EXISTS company_code VARCHAR(50) NOT NULL DEFAULT 'default';
ALTER TABLE card_history ADD COLUMN IF NOT EXISTS company_code VARCHAR(50) NOT NULL DEFAULT 'default';

-- 4. Create indexes on company_code for ultra-fast multi-tenant query performance
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_code);
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_code);
CREATE INDEX IF NOT EXISTS idx_students_company ON students(company_code);
CREATE INDEX IF NOT EXISTS idx_departments_company ON departments(company_code);
CREATE INDEX IF NOT EXISTS idx_devices_company ON attendance_devices(company_code);
CREATE INDEX IF NOT EXISTS idx_device_users_company ON attendance_device_users(company_code);
CREATE INDEX IF NOT EXISTS idx_attendance_records_company ON attendance_records(company_code);
CREATE INDEX IF NOT EXISTS idx_attendance_raw_logs_company ON attendance_raw_logs(company_code);
CREATE INDEX IF NOT EXISTS idx_shifts_company ON shifts(company_code);
CREATE INDEX IF NOT EXISTS idx_face_biometrics_company ON face_biometrics(company_code);

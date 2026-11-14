-- =============================================================================
-- V26: Add Multi-Tenant Isolation and Performance Indexes to Audit Logs
-- =============================================================================

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS company_code VARCHAR(100) NOT NULL DEFAULT 'default';

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_code ON audit_logs(company_code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_company ON audit_logs(company_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_username ON audit_logs(username);


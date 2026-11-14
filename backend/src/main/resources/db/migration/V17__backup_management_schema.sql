-- =============================================================================
-- V17: Automated Database Backups & Google Drive Cloud Storage Schema
-- =============================================================================

CREATE TABLE IF NOT EXISTS backup_configurations (
    id BIGSERIAL PRIMARY KEY,
    company_code VARCHAR(50) NOT NULL DEFAULT 'default' UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT true,
    frequency VARCHAR(30) NOT NULL DEFAULT 'DAILY', -- DAILY, WEEKLY, HOURLY, CUSTOM
    cron_expression VARCHAR(100) NOT NULL DEFAULT '0 0 2 * * *',
    backup_time VARCHAR(10) NOT NULL DEFAULT '02:00',
    backup_day_of_week VARCHAR(20) NOT NULL DEFAULT 'MONDAY',
    retention_days INT NOT NULL DEFAULT 30,
    include_uploads BOOLEAN NOT NULL DEFAULT false,
    gdrive_enabled BOOLEAN NOT NULL DEFAULT false,
    gdrive_folder_id VARCHAR(255),
    gdrive_service_account_json TEXT,
    gdrive_service_account_email VARCHAR(255),
    last_run_at TIMESTAMP,
    last_status VARCHAR(30),
    last_error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS backup_records (
    id BIGSERIAL PRIMARY KEY,
    company_code VARCHAR(50) NOT NULL DEFAULT 'default',
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    backup_type VARCHAR(30) NOT NULL DEFAULT 'MANUAL', -- MANUAL, SCHEDULED
    status VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS', -- IN_PROGRESS, SUCCESS, FAILED
    error_message TEXT,
    gdrive_file_id VARCHAR(255),
    gdrive_web_view_link TEXT,
    gdrive_status VARCHAR(30) NOT NULL DEFAULT 'NOT_CONFIGURED', -- NOT_CONFIGURED, PENDING, UPLOADED, FAILED
    gdrive_error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_backup_records_company ON backup_records (company_code);
CREATE INDEX IF NOT EXISTS idx_backup_records_created ON backup_records (created_at DESC);

-- Seed default configuration
INSERT INTO backup_configurations (
    company_code,
    enabled,
    frequency,
    cron_expression,
    backup_time,
    retention_days,
    include_uploads,
    gdrive_enabled
) VALUES (
    'default',
    true,
    'DAILY',
    '0 0 2 * * *',
    '02:00',
    30,
    false,
    false
) ON CONFLICT (company_code) DO NOTHING;


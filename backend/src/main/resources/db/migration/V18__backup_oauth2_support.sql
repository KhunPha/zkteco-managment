-- =============================================================================
-- V18: Add Google Drive OAuth 2.0 Personal Account Support to Backups
-- =============================================================================

ALTER TABLE backup_configurations
ADD COLUMN IF NOT EXISTS gdrive_auth_type VARCHAR(30) NOT NULL DEFAULT 'SERVICE_ACCOUNT',
ADD COLUMN IF NOT EXISTS gdrive_client_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS gdrive_client_secret VARCHAR(255),
ADD COLUMN IF NOT EXISTS gdrive_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS gdrive_user_email VARCHAR(255);


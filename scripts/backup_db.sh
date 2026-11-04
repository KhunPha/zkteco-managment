#!/bin/bash
# =============================================================================
# Automated PostgreSQL Database Backup Script for ZKTeco Attendance Platform
# =============================================================================

set -e

BACKUP_DIR="/var/backups/zkteco_attendance"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/zkteco_attendance_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

mkdir -p "${BACKUP_DIR}"

echo "[INFO] Starting database backup at $(date)..."

# If running within Docker Compose
if docker ps --format '{{.Names}}' | grep -q "zkteco-postgres"; then
    echo "[INFO] Running pg_dump inside zkteco-postgres container..."
    docker exec zkteco-postgres pg_dump -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-zkteco_attendance}" | gzip > "${BACKUP_FILE}"
else
    # Host PostgreSQL
    pg_dump -U "${POSTGRES_USER:-postgres}" -h "${POSTGRES_HOST:-localhost}" -d "${POSTGRES_DB:-zkteco_attendance}" | gzip > "${BACKUP_FILE}"
fi

echo "[INFO] Backup successfully created: ${BACKUP_FILE} ($(du -sh "${BACKUP_FILE}" | cut -f1))"

# Retention cleanup
echo "[INFO] Cleaning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "zkteco_attendance_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "[INFO] Backup routine completed."


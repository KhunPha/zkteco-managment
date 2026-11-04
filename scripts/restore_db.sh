#!/bin/bash
# =============================================================================
# PostgreSQL Database Restore Procedure for ZKTeco Attendance Platform
# =============================================================================

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <path_to_backup_file.sql.gz>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "[ERROR] Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

read -p "WARNING: This will overwrite existing database '${POSTGRES_DB:-zkteco_attendance}'. Continue? (y/N): " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "Aborted by user."
    exit 0
fi

echo "[INFO] Restoring database from ${BACKUP_FILE}..."

if docker ps --format '{{.Names}}' | grep -q "zkteco-postgres"; then
    gunzip -c "${BACKUP_FILE}" | docker exec -i zkteco-postgres psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-zkteco_attendance}"
else
    gunzip -c "${BACKUP_FILE}" | psql -U "${POSTGRES_USER:-postgres}" -h "${POSTGRES_HOST:-localhost}" -d "${POSTGRES_DB:-zkteco_attendance}"
fi

echo "[SUCCESS] Database restoration complete."


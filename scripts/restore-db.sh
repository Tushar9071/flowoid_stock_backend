#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env"
BACKUP_FILE="${1:-}"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: scripts/restore-db.sh /path/to/backup.sql.gz|backup.dump" >&2
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi

if [ -f "${ENV_FILE}" ]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set" >&2
  exit 1
fi

echo "This will restore ${BACKUP_FILE} into the configured database."
read -r -p "Type RESTORE to continue: " CONFIRMATION

if [ "${CONFIRMATION}" != "RESTORE" ]; then
  echo "Restore cancelled"
  exit 1
fi

case "${BACKUP_FILE}" in
  *.sql.gz)
    gunzip -c "${BACKUP_FILE}" | psql "${DATABASE_URL}"
    ;;
  *.sql)
    psql "${DATABASE_URL}" < "${BACKUP_FILE}"
    ;;
  *)
    pg_restore --clean --if-exists --no-owner --no-acl --dbname="${DATABASE_URL}" "${BACKUP_FILE}"
    ;;
esac

echo "Restore completed"

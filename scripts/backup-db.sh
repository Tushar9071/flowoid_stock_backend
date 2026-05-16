#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env"

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

BACKUP_DIR="${BACKUP_DIR:-/var/backups/flowoid}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP="$(date +%F_%H-%M)"
BACKUP_FILE="${BACKUP_DIR}/${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is not installed or not in PATH" >&2
  exit 1
fi

pg_dump "${DATABASE_URL}" --no-owner --no-acl | gzip > "${BACKUP_FILE}"

if [ ! -s "${BACKUP_FILE}" ]; then
  echo "Backup file was not created or is empty" >&2
  rm -f "${BACKUP_FILE}"
  exit 1
fi

find "${BACKUP_DIR}" -type f -name "*.sql.gz" -mtime +"${BACKUP_RETENTION_DAYS}" -delete

echo "Backup completed: ${BACKUP_FILE}"

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

if [ "${NODE_ENV:-}" = "production" ]; then
  echo "ERROR: prisma db push is disabled in production. Use: pnpm db:migrate" >&2
  exit 1
fi

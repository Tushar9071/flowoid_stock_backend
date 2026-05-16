# Backup and Restore

## Configuration

Set these environment variables on the VPS:

```env
BACKUP_DIR=/var/backups/flowoid
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE=0 2 * * *
```

The backend schedules the backup job at startup with `node-cron`. The default schedule is daily at 2:00 AM in the server timezone.

## Manual Backup

```bash
bash scripts/backup-db.sh
```

The script reads `DATABASE_URL` from `.env`, runs:

```bash
pg_dump --no-owner --no-acl
```

and writes a gzip SQL backup to:

```text
/var/backups/flowoid/YYYY-MM-DD_HH-MM.sql.gz
```

Backups older than `BACKUP_RETENTION_DAYS` are deleted.

## Restore

```bash
bash scripts/restore-db.sh /var/backups/flowoid/2026-05-16_02-00.sql.gz
```

The restore script asks for confirmation before writing to the configured database.

## Admin API

All endpoints require `SUPER_ADMIN` or `ADMIN`:

```text
GET  /admin/backup/list
POST /admin/backup/trigger
GET  /admin/backup/status
```

Backup success and failure events are logged with category `backup` and are visible through:

```text
GET /admin/logs?category=backup
```

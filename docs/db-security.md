# Database Security

## Migration Safety

Never run `prisma db push` against production. Production schema changes must use reviewed Prisma migrations and:

```bash
pnpm db:migrate
```

The `pnpm db:push` script runs `scripts/check-env.sh` first and exits when `NODE_ENV=production`.

CI/CD should run:

```bash
pnpm prisma generate
pnpm db:migrate
pnpm build
```

Do not use `prisma db push` in GitHub Actions or deployment scripts.

## Application-Level Delete Protection

Critical models use `deletedAt` and `deletedBy` for soft deletion. The Prisma client extension in `src/prisma/softDelete.middleware.ts` converts normal `delete` and `deleteMany` calls into updates that set these fields.

Physical deletes require explicit runtime arguments:

```ts
forceDelete: true
callerRole: "SUPER_ADMIN"
```

Every delete attempt, bulk update affecting more than 10 rows, and change to `User`, `Role`, or `Permission` is written to `SystemLog` with category `db_audit`.

## PostgreSQL-Level Safety Net

Run these manually on production after confirming the actual application database user name:

```sql
CREATE ROLE flowoid_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO flowoid_readonly;

REVOKE DELETE ON TABLE "users" FROM flowoid_app_user;
REVOKE DELETE ON TABLE "orders" FROM flowoid_app_user;
REVOKE DELETE ON TABLE "payments" FROM flowoid_app_user;
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM flowoid_app_user;
```

Prisma models are mapped to lowercase table names in this schema, so use the mapped table names such as `users`, `orders`, and `payments`.

## Logging Retention

The application writes structured JSON logs to stdout for PM2 and to `logs/`. Install PM2 log rotation on the VPS:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 20M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

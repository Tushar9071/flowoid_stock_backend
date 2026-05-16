import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { createAuditLogExtension } from '../prisma/auditLog.middleware';
import { createSoftDeleteExtension } from '../prisma/softDelete.middleware';
import logger from '../utils/logger';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Please configure it in .env');
}

const adapter = new PrismaPg({ connectionString });

const basePrisma = new PrismaClient({
  adapter,
  log:
    process.env.LOG_DB_QUERIES === 'true'
      ? [{ emit: 'event', level: 'query' }, { emit: 'event', level: 'error' }]
      : ['error'],
});

if (process.env.LOG_DB_QUERIES === 'true') {
  basePrisma.$on('query' as never, (event: any) => {
    logger.debug('Prisma query executed', {
      category: 'db',
      duration: event.duration,
      meta: {
        query: event.query,
        params: event.params,
        target: event.target,
      },
    });
  });
}

const prisma = basePrisma
  .$extends(createSoftDeleteExtension(basePrisma as any))
  .$extends(createAuditLogExtension(basePrisma as any)) as unknown as PrismaClient;

export default prisma;

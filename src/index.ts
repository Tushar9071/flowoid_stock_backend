import 'dotenv/config';


import app from './app.ts';
import prisma from './lib/prisma.ts';

const PORT = process.env.PORT || 3000;

async function main() {
  // Test DB connection before starting server
  await prisma.$connect();
  console.log('✅ PostgreSQL connected via Prisma');

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

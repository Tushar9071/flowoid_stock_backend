import "dotenv/config";

import http from "http";
import app from "./app";
import prisma from "./lib/prisma";
import { initializeMonitoringSocket } from "./socket/monitoring.socket";

const PORT = process.env.PORT || 3000;

async function main() {
  // Test DB connection before starting server
  await prisma.$connect();
  console.log("✅ PostgreSQL connected via Prisma");

  const server = http.createServer(app);
  initializeMonitoringSocket(server);

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});

import os from "os";
import prisma from "../../lib/prisma";

type StatusCodeCounts = Record<string, number>;

type ApiMetricsState = {
  totalRequests: number;
  activeRequests: number;
  totalResponseTimeMs: number;
  statusCodes: StatusCodeCounts;
  routes: Record<string, number>;
  startedAt: Date;
};

let lastCpuSnapshot = os.cpus();

const apiMetrics: ApiMetricsState = {
  totalRequests: 0,
  activeRequests: 0,
  totalResponseTimeMs: 0,
  statusCodes: {},
  routes: {},
  startedAt: new Date(),
};

const bytesToMb = (bytes: number): number => Math.round((bytes / 1024 / 1024) * 100) / 100;

const getCpuUsagePercent = (): number => {
  const currentSnapshot = os.cpus();

  let idleDiff = 0;
  let totalDiff = 0;

  currentSnapshot.forEach((cpu, index) => {
    const previousTimes = lastCpuSnapshot[index]?.times;
    if (!previousTimes) return;

    const currentTimes = cpu.times;
    const previousTotal = Object.values(previousTimes).reduce((sum, value) => sum + value, 0);
    const currentTotal = Object.values(currentTimes).reduce((sum, value) => sum + value, 0);

    idleDiff += currentTimes.idle - previousTimes.idle;
    totalDiff += currentTotal - previousTotal;
  });

  lastCpuSnapshot = currentSnapshot;

  if (totalDiff <= 0) {
    return 0;
  }

  return Math.round((100 - (idleDiff / totalDiff) * 100) * 100) / 100;
};

const checkDatabaseHealth = async () => {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: "UP",
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      status: "DOWN",
      latencyMs: Date.now() - startedAt,
    };
  }
};

export const recordApiRequestStart = (): number => {
  apiMetrics.totalRequests += 1;
  apiMetrics.activeRequests += 1;

  return Date.now();
};

export const recordApiRequestEnd = (
  startedAt: number,
  statusCode: number,
  route: string,
): void => {
  apiMetrics.activeRequests = Math.max(0, apiMetrics.activeRequests - 1);
  apiMetrics.totalResponseTimeMs += Date.now() - startedAt;

  const statusKey = String(statusCode);
  apiMetrics.statusCodes[statusKey] = (apiMetrics.statusCodes[statusKey] || 0) + 1;
  apiMetrics.routes[route] = (apiMetrics.routes[route] || 0) + 1;
};

export const getMetricsSnapshot = async () => {
  const memory = process.memoryUsage();
  const totalMemoryBytes = os.totalmem();
  const freeMemoryBytes = os.freemem();
  const usedMemoryBytes = totalMemoryBytes - freeMemoryBytes;
  const averageResponseTimeMs =
    apiMetrics.totalRequests > 0
      ? Math.round((apiMetrics.totalResponseTimeMs / apiMetrics.totalRequests) * 100) / 100
      : 0;

  return {
    timestamp: new Date().toISOString(),
    service: {
      uptimeSeconds: Math.round(process.uptime()),
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      startedAt: apiMetrics.startedAt.toISOString(),
    },
    system: {
      hostname: os.hostname(),
      cpuUsagePercent: getCpuUsagePercent(),
      cpuCount: os.cpus().length,
      loadAverage: os.loadavg(),
      totalMemoryMb: bytesToMb(totalMemoryBytes),
      usedMemoryMb: bytesToMb(usedMemoryBytes),
      freeMemoryMb: bytesToMb(freeMemoryBytes),
      memoryUsagePercent: Math.round((usedMemoryBytes / totalMemoryBytes) * 10000) / 100,
    },
    process: {
      rssMb: bytesToMb(memory.rss),
      heapTotalMb: bytesToMb(memory.heapTotal),
      heapUsedMb: bytesToMb(memory.heapUsed),
      externalMb: bytesToMb(memory.external),
    },
    api: {
      totalRequests: apiMetrics.totalRequests,
      activeRequests: apiMetrics.activeRequests,
      averageResponseTimeMs,
      statusCodes: apiMetrics.statusCodes,
      routes: apiMetrics.routes,
    },
    database: await checkDatabaseHealth(),
  };
};

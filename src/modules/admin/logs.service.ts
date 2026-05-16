import prisma from "../../lib/prisma";

type ListLogsInput = {
  level?: string;
  category?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: string;
  limit?: string;
};

const toPositiveInt = (value: string | undefined, fallback: number, max?: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  const normalized = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  return max ? Math.min(normalized, max) : normalized;
};

export const listLogs = async (input: ListLogsInput) => {
  const page = toPositiveInt(input.page, 1);
  const limit = toPositiveInt(input.limit, 50, 200);
  const where: any = {};

  if (input.level) {
    where.level = input.level;
  }

  if (input.category) {
    where.category = input.category;
  }

  if (input.search) {
    where.message = { contains: input.search, mode: "insensitive" };
  }

  if (input.startDate || input.endDate) {
    where.createdAt = {};
    if (input.startDate) {
      where.createdAt.gte = new Date(input.startDate);
    }
    if (input.endDate) {
      where.createdAt.lte = new Date(input.endDate);
    }
  }

  const [total, data] = await Promise.all([
    prisma.systemLog.count({ where }),
    prisma.systemLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const countForWindow = async (since: Date) => {
  const [total, errors, warns] = await Promise.all([
    prisma.systemLog.count({ where: { createdAt: { gte: since } } }),
    prisma.systemLog.count({ where: { level: "error", createdAt: { gte: since } } }),
    prisma.systemLog.count({ where: { level: "warn", createdAt: { gte: since } } }),
  ]);

  return { total, errors, warns };
};

export const getLogStats = async () => {
  const now = Date.now();
  const last24hSince = new Date(now - 24 * 60 * 60 * 1000);
  const last7dSince = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const [last24h, last7d, groupedErrors] = await Promise.all([
    countForWindow(last24hSince),
    countForWindow(last7dSince),
    prisma.systemLog.groupBy({
      by: ["message"],
      where: {
        level: "error",
        createdAt: { gte: last7dSince },
      },
      _count: { message: true },
      orderBy: { _count: { message: "desc" } },
      take: 10,
    }),
  ]);

  return {
    last24h,
    last7d,
    topErrors: groupedErrors.map((item) => ({
      message: item.message,
      count: item._count.message,
    })),
  };
};

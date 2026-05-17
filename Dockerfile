# ── Stage 1: Build ────────────────────────────────────────────
FROM node:lts-alpine AS builder

WORKDIR /app

# Install pnpm globally
RUN npm i -g pnpm

# Copy dependency manifests first (layer cache)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install ALL dependencies (dev + prod) — needed for tsc & prisma
RUN pnpm install --frozen-lockfile

# Copy prisma schema and config so we can generate the client
COPY prisma ./prisma
COPY prisma.config.ts ./

# Generate Prisma client
RUN pnpm prisma generate

# Copy the rest of the source code
COPY tsconfig.json ./
COPY src ./src

# Build (tsc → dist/)
RUN pnpm build

# ── Stage 2: Production runtime ──────────────────────────────
FROM node:lts-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install pnpm globally
RUN npm i -g pnpm

# Copy dependency manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy prisma schema + config (needed at runtime for @prisma/client)
COPY prisma ./prisma
COPY prisma.config.ts ./

# Copy generated Prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy compiled output
COPY --from=builder /app/dist ./dist

EXPOSE 8000

CMD ["node", "dist/index.js"]

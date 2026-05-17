FROM node:lts-alpine AS base

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS builder

COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./
COPY src ./src

RUN DATABASE_URL="postgresql://user:password@localhost:5432/flowoid" pnpm prisma generate
RUN pnpm build

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=8000

RUN apk add --no-cache bash postgresql-client \
  && mkdir -p /app/logs /app/storage/generated-documents /var/backups/flowoid \
  && chown -R node:node /app /var/backups/flowoid

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN pnpm install --frozen-lockfile \
  && DATABASE_URL="postgresql://user:password@localhost:5432/flowoid" pnpm prisma generate

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --chown=node:node scripts ./scripts

USER node

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 8000) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/agent-core/package.json ./packages/agent-core/
COPY packages/agent-identity/package.json ./packages/agent-identity/
COPY packages/acp/package.json ./packages/acp/
COPY packages/db/package.json ./packages/db/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
RUN pnpm --filter @aura/db generate
RUN pnpm --filter @aura/api build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db/prisma ./prisma

EXPOSE 3001
CMD ["node", "dist/index.js"]

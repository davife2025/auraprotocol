FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/agent-runner/package.json ./apps/agent-runner/
COPY packages/agent-core/package.json ./packages/agent-core/
COPY packages/acp/package.json ./packages/acp/
COPY packages/db/package.json ./packages/db/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @aura/agent-runner build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/agent-runner/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

CMD ["node", "dist/index.js"]

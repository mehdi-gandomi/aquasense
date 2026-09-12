# AQUASENSE API — production image (pnpm monorepo)
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.13.1 --activate
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN pnpm --filter @aquasense/shared build \
  && pnpm --filter @aquasense/api build \
  && pnpm --filter @aquasense/api deploy --prod --legacy /out

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV API_PORT=3001
RUN apk add --no-cache wget

COPY --from=build /out ./
COPY apps/api/scripts/mqtt-sim.cjs ./scripts/mqtt-sim.cjs

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health || exit 1

CMD ["node", "dist/main.js"]

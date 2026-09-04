FROM node:22-alpine AS deps
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile || pnpm install

FROM deps AS build
COPY . .
RUN pnpm --filter @aquasense/shared build && pnpm --filter @aquasense/api build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./
COPY --from=build /repo/packages/shared/dist /packages/shared/dist
COPY --from=build /repo/packages/shared/package.json /packages/shared/
COPY --from=build /repo/node_modules ./node_modules
CMD ["node", "dist/main.js"]

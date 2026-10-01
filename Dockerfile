FROM node:24-slim AS base
RUN npm install --global pnpm@10.34.4
ENV HUSKY=0
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch
COPY . .
RUN pnpm install --frozen-lockfile --offline

FROM deps AS api-build
RUN pnpm build:packages \
  && pnpm --filter @gamemash/api build \
  && pnpm --filter @gamemash/api deploy --prod --legacy /out

FROM deps AS web-build
ARG VITE_PUBLIC_URL=""
ARG PUBLIC_PLAY_URL="https://play.gamemash.io"
ENV VITE_PUBLIC_URL=${VITE_PUBLIC_URL}
ENV PUBLIC_PLAY_URL=${PUBLIC_PLAY_URL}
RUN pnpm build:packages \
  && pnpm --filter @gamemash/web build \
  && pnpm --filter @gamemash/landing build

FROM node:24-slim AS api
ENV NODE_ENV=production
WORKDIR /app
COPY --from=api-build /out /app
RUN mkdir -p /data/images && chown node:node /data/images
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]

FROM caddy:2-alpine AS web
COPY --from=web-build /app/apps/web/dist /srv/app
COPY --from=web-build /app/apps/landing/dist /srv/landing
COPY deploy/Caddyfile /etc/caddy/Caddyfile

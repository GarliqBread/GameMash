FROM node:24-slim AS build
RUN npm install --global pnpm@10.34.4
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
ARG VITE_PUBLIC_URL=""
ARG PUBLIC_PLAY_URL="https://play.gamemash.io"
ENV VITE_PUBLIC_URL=${VITE_PUBLIC_URL}
ENV PUBLIC_PLAY_URL=${PUBLIC_PLAY_URL}
RUN pnpm build:packages \
  && pnpm --filter @gamemash/api build \
  && pnpm --filter @gamemash/web build \
  && pnpm --filter @gamemash/landing build

FROM build AS api-deps
RUN CI=true pnpm install --prod --frozen-lockfile --filter "@gamemash/api..."

FROM node:24-slim AS api
ENV NODE_ENV=production
WORKDIR /app
COPY --from=api-deps /app /app
RUN mkdir -p /data/images && chown node:node /data/images
USER node
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/index.js"]

FROM caddy:2-alpine AS web
COPY --from=build /app/apps/web/dist /srv/app
COPY --from=build /app/apps/landing/dist /srv/landing
COPY deploy/Caddyfile /etc/caddy/Caddyfile

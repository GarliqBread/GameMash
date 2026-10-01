# GameMash

Team games for company get-togethers: one shared big screen, players use their phones as controllers.

Product decisions, progress and open questions live in [docs/spec.md](docs/spec.md).

## Development

Requires Node 24+, pnpm 10 and Docker (for Redis on port 6380 and MinIO on port 9000, console on 9001; set `REDIS_PORT`, `MINIO_PORT` or `MINIO_CONSOLE_PORT` to change them).

```sh
pnpm install
pnpm services                               # start Redis and MinIO in Docker
cp apps/api/.env.example apps/api/.env      # first time only
pnpm dev                                    # build packages, then watch everything
```

The landing page runs on http://localhost:4321 and the web app on http://localhost:5173 and proxies `/api` and `/socket.io` to the API on port 3000. Stop the services with `docker compose down` (add `-v` to also wipe stored images).

| URL                      | Screen                                       |
| ------------------------ | -------------------------------------------- |
| `/host`                  | Create a session (big screen)                |
| `/host/:sessionId/setup` | Workshop: name the session, build the lineup |
| `/host/:sessionId`       | Big-screen lobby with room code and QR code  |
| `/` and `/join/:code`    | Join from a phone (name + optional photo)    |
| `/join?code=`            | Redirects to `/join/:code` (landing page form) |
| `/play/:sessionId`       | Phone waiting screen                         |

### Testing on a real phone

Phones can't open `localhost`. Set `VITE_PUBLIC_URL` in `apps/web/.env` (see `apps/web/.env.example`) to an address the phone can reach, such as your machine's LAN address (`http://192.168.1.20:5173`) or an ngrok URL (`ngrok http 5173`), then restart `pnpm dev`. The lobby shows that address and puts it in the QR code, and Vite accepts it as a host. Without it the lobby uses the page's own address.

### Environment

`apps/api/.env`:

| Variable               | Default                  | Purpose                                                            |
| ---------------------- | ------------------------ | ------------------------------------------------------------------ |
| `HOST`                 | `0.0.0.0`                | Listen address                                                     |
| `PORT`                 | `3000`                   | API port                                                           |
| `REDIS_URL`            | `redis://localhost:6380` | Redis connection                                                   |
| `LOG_LEVEL`            | `info`                   | Pino log level                                                     |
| `TRUST_PROXY`          | empty                    | Comma-separated proxy addresses whose `X-Forwarded-For` is trusted |
| `IMAGES_DIR`           | empty                    | Folder for question images on disk (`.images` in `.env.example`)   |
| `IMAGES_MAX_ACTIVE`    | `3000`                   | Most question images kept across all sessions at once              |
| `IMAGES_MIN_FREE_MB`   | `1024`                   | Uploads pause when the disk has less free space than this          |
| `S3_ENDPOINT`          | empty                    | S3-compatible endpoint for question images, scheme and host only   |
| `S3_BUCKET`            | empty                    | Bucket for question images                                         |
| `S3_ACCESS_KEY_ID`     | empty                    | S3 access key                                                      |
| `S3_SECRET_ACCESS_KEY` | empty                    | S3 secret key                                                      |
| `S3_REGION`            | `auto`                   | Signing region (`auto` for R2)                                     |

Question images are stored on disk under `IMAGES_DIR` and served by the API at `/api/images/{sessionId}/{imageId}`. Setting all four `S3_*` variables stores them in an S3-compatible bucket instead (presigned URLs, valid for an hour); a partial set stops the API at startup. With neither, the API runs with images turned off. Images live under `sessions/{sessionId}/`. Images that no question has used for 10 minutes are deleted when the setup is saved. All of a session's images are deleted when it ends, and every 10 minutes the API sweeps away the images of sessions that expired with nobody connected.

Uploads pause (`image_storage_full`) once `IMAGES_MAX_ACTIVE` images are held across all sessions or the disk drops below `IMAGES_MIN_FREE_MB`, so abuse can fill a limit but never the disk or a bill.

Tests that need Redis use `TEST_REDIS_URL` (default `redis://localhost:6380`). The S3 image store tests use `TEST_S3_ENDPOINT` (default `http://localhost:9000`), `TEST_S3_BUCKET` (default `gamemash-test`, created on the fly), `TEST_S3_ACCESS_KEY_ID` and `TEST_S3_SECRET_ACCESS_KEY` (default `minioadmin`). Without Redis or MinIO those tests are skipped locally; in CI they fail. `pnpm services` starts both.

## Self-hosting

GameMash runs on one Linux server with Docker, defined in [`deploy/compose.yml`](deploy/compose.yml): Redis, the API and Caddy, which handles HTTPS. Caddy serves the app on `APP_DOMAIN`, the landing page on `LANDING_DOMAIN`, and redirects every domain in `REDIRECT_DOMAINS` to the landing page.

1. Point your domains (A and AAAA records) at the server.
2. On the server, allow only SSH, HTTP and HTTPS through the firewall (`ufw allow OpenSSH && ufw allow 80,443/tcp && ufw allow 443/udp && ufw enable`), and log in with an SSH key only.
3. Install Docker: `curl -fsSL https://get.docker.com | sh`.
4. Clone the repository, then `cp deploy/.env.example deploy/.env` and set the domains and `PUBLIC_URL` (the app's address, for example `https://play.example.com`).
5. Start it: `docker compose -f deploy/compose.yml --env-file deploy/.env up -d --build`. Caddy fetches the HTTPS certificates on the first request.
6. To update: `git pull`, then run the same command again.

If you don't want the landing page, remove its two site blocks (`{$LANDING_DOMAIN}` and `{$REDIRECT_DOMAINS}`) from `deploy/Caddyfile` and the two variables from `deploy/compose.yml`.

The app's Content-Security-Policy in `deploy/Caddyfile` only allows images from the site itself; if you switch to an S3 bucket, add its origin to `img-src`. The landing page's policy is generated by Astro at build time.

Question images sit in the `images` volume, Redis data (sessions only, all with expiries) in `redis-data`. No backups are needed: nothing outlives a session.

How gamemash.io itself is deployed is described in [docs/deploying.md](docs/deploying.md).

## Licence

GameMash is free software under the [GNU Affero General Public License v3.0](LICENSE). If you run a modified version as a service for others, you have to offer them its source code.

## Commands

| Command          | What it does                                             |
| ---------------- | -------------------------------------------------------- |
| `pnpm services`  | Start Redis and MinIO (for S3 tests) in Docker           |
| `pnpm dev`       | Build shared packages, then run everything in watch mode |
| `pnpm lint`      | Biome lint + format check                                |
| `pnpm format`    | Biome autofix                                            |
| `pnpm typecheck` | TypeScript across all workspaces                         |
| `pnpm test`      | Vitest                                                   |
| `pnpm build`     | Production build                                         |
| `pnpm stories`   | Ladle stories for `@gamemash/ui` (port 61000)            |

## Layout

- `apps/api` – Fastify + Socket.io + Redis, question images on disk (or an S3-compatible bucket)
- `apps/web` – React, TanStack Router/Query, Zustand, Tailwind, Base UI, react-intl
- `packages/shared` – types, constants and helpers shared by API and web; TypeBox schemas under `@gamemash/shared/schemas`
- `packages/games` – game definitions (title, colour, icon) and game config; helpers under `@gamemash/games/config`, schemas under `@gamemash/games/schemas`
- `packages/messages` – ICU message catalogs
- `packages/ui` – design system: tokens, Base UI primitives, layouts

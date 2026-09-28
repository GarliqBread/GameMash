# GameMash

Team games for company get-togethers: one shared big screen, players use their phones as controllers.

Product decisions, progress and open questions live in [docs/spec.md](docs/spec.md).

## Development

Requires Node 24+, pnpm 10 and Docker (for Redis, exposed on port 6380 by default; set `REDIS_PORT` to change it).

```sh
pnpm install
pnpm redis                                  # start Redis in Docker
cp apps/api/.env.example apps/api/.env      # first time only
pnpm dev                                    # build packages, then watch everything
```

The web app runs on http://localhost:5173 and proxies `/api` and `/socket.io` to the API on port 3000. Stop Redis with `docker compose down`.

| URL                      | Screen                                       |
| ------------------------ | -------------------------------------------- |
| `/host`                  | Create a session (big screen)                |
| `/host/:sessionId/setup` | Workshop: name the session, build the lineup |
| `/host/:sessionId`       | Big-screen lobby with room code and QR code  |
| `/` and `/join/:code`    | Join from a phone (name + optional photo)    |
| `/play/:sessionId`       | Phone waiting screen                         |

### Testing on a real phone

Phones can't open `localhost`. Set `VITE_PUBLIC_URL` in `apps/web/.env` (see `apps/web/.env.example`) to an address the phone can reach, such as your machine's LAN address (`http://192.168.1.20:5173`) or an ngrok URL (`ngrok http 5173`), then restart `pnpm dev`. The lobby shows that address and puts it in the QR code, and Vite accepts it as a host. Without it the lobby uses the page's own address.

### Environment

`apps/api/.env`:

| Variable      | Default                  | Purpose                                                           |
| ------------- | ------------------------ | ----------------------------------------------------------------- |
| `HOST`        | `0.0.0.0`                | Listen address                                                    |
| `PORT`        | `3000`                   | API port                                                          |
| `REDIS_URL`   | `redis://localhost:6380` | Redis connection                                                  |
| `LOG_LEVEL`   | `info`                   | Pino log level                                                    |
| `TRUST_PROXY` | empty                    | Comma-separated proxy addresses whose `X-Forwarded-For` is trusted |

Tests that need Redis use `TEST_REDIS_URL` (default `redis://localhost:6380`). Without Redis they are skipped locally; in CI they fail.

## Commands

| Command          | What it does                                             |
| ---------------- | -------------------------------------------------------- |
| `pnpm redis`     | Start Redis in Docker                                    |
| `pnpm dev`       | Build shared packages, then run everything in watch mode |
| `pnpm lint`      | Biome lint + format check                                |
| `pnpm format`    | Biome autofix                                            |
| `pnpm typecheck` | TypeScript across all workspaces                         |
| `pnpm test`      | Vitest                                                   |
| `pnpm build`     | Production build                                         |
| `pnpm stories`   | Ladle stories for `@gamemash/ui` (port 61000)            |

## Layout

- `apps/api` – Fastify + Socket.io + Redis
- `apps/web` – React, TanStack Router/Query, Zustand, Tailwind, Base UI, react-intl
- `packages/shared` – types, constants and helpers shared by API and web; TypeBox schemas under `@gamemash/shared/schemas`
- `packages/games` – game definitions (title, colour, icon) and game config; helpers under `@gamemash/games/config`, schemas under `@gamemash/games/schemas`
- `packages/messages` – ICU message catalogs
- `packages/ui` – design system: tokens, Base UI primitives, layouts

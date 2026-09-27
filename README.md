# GameMash

Team games for company get-togethers: one shared big screen, players use their phones as controllers.

## Development

Requires Node 24+, pnpm 10 and Docker (for Redis, exposed on port 6380 by default; set `REDIS_PORT` to change it).

```sh
pnpm install
pnpm redis
cp apps/api/.env.example apps/api/.env
pnpm dev
```

The web app runs on http://localhost:5173 and proxies `/api` and `/socket.io` to the API on port 3000.

| Command          | What it does                     |
| ---------------- | -------------------------------- |
| `pnpm lint`      | Biome lint + format check        |
| `pnpm format`    | Biome autofix                    |
| `pnpm typecheck` | TypeScript across all workspaces |
| `pnpm test`      | Vitest                           |
| `pnpm build`     | Production build                 |

## Layout

- `apps/api` – Fastify + Socket.io + Redis
- `apps/web` – React, TanStack Router/Query, Zustand, Tailwind, Base UI, react-intl
- `packages/shared` – types shared by API and web
- `packages/messages` – ICU message catalogs used by both sides

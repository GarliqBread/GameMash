# GameMash

A web app where companies host fun team game sessions. Will be open sourced later.

## How we work
- Build step by step together. Propose a plan before writing code, and keep changes small and reviewable.
- Don't fill gaps with assumptions. If a spec is missing, ask me.
- Items under "Open questions" are NOT decided. Don't implement them without discussing first.

## Decided
- **Jackbox model:** one shared big screen (meeting-room TV or screen share); players use their phones as controllers.
- **Structure:** a "round" is one whole sitting from start to finish, with one total score. A round contains multiple games (e.g. pop quiz, then drawing game).
- **Games planned:**
  - Pop quiz (Kahoot-style multiple choice, internal quizzes)
  - Drawing game (everyone gets the same word, draws it, then everyone votes on all drawings)
- **No data retention:** all data, including uploaded avatar images, is wiped when the game ends. A cron-style cleanup job catches games that never ended properly.

## Stack
- **API:** Fastify + Redis
- **Realtime:** Socket.io (Colyseus considered and not chosen: the games are phase-based, not tick-based, and per-player hidden state is simpler with plain emits. Revisit if we add real-time action games.)
- **Web:** React
  - TanStack Router (file-based routing)
  - TanStack Query for REST calls (create session, check room code, etc.)
  - Zustand for live game state received over the socket. Socket state does not go in the Query cache.
- **Localisation:** shared messages package used by both API and web
  - Web: react-intl
  - API: @formatjs/intl (same ICU message format and catalogs)
  - The API should prefer returning error codes with params; the client translates them.
- **Monorepo:** pnpm workspaces with shared types between server and client.

## Architecture direction (discussed, agreed in principle)
- **Server-authoritative:** phones only send inputs; the server owns all state and timers.
- **Phase engine:** games are built from phases (prompt → submit → vote → reveal → score) so new games are cheap to add.
- **Games as plugins:** each game is a self-contained module (server logic + big-screen view + phone view + config editor), so open-source contributors can add games.
- **Per-viewer views:** the server sends each screen only what it may see (phones never receive quiz answers or others' drawings before the reveal).
- **Reconnects:** a reconnect token per player so phones that lock or drop resume where the game is.
- **Storage:** all session data in Redis with TTLs. Small resized avatars stored in Redis too, so wiping a session is just deleting its keys.

## Open questions
- Naming in code: "round" vs "session" (to avoid confusion with quiz rounds)
- Scoring across games: raw points, or normalized so each game counts equally?
- Can players join after the round has started?
- Host identity: no accounts, or some login?
- Retention timings: idle timeout, max age, how long final scores stay visible
- Reusing quizzes when nothing is stored (e.g. export/import as a JSON file?)
- Drawing game details: word lists, timers, voting rules, drawing tools
- Which languages to support at launch, and how players pick one (browser locale, per player, or set by the host?)
- Should hosts write quiz content in any language, with only the UI localised?
- Which other games to include later (ideas: Gartic Phone-style telephone drawing, caption this, Fibbage-style bluffing, "who said it", closest-guess estimation)
- Visual design

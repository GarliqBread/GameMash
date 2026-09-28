# GameMash

A web app where companies host fun team game sessions. Will be open sourced later.

## How we work
- Build step by step together. Propose a plan before writing code, and keep changes small and reviewable.
- Don't fill gaps with assumptions. If a spec is missing, ask me.
- Items under "Open questions" are NOT decided. Don't implement them without discussing first.

## Decided
- **Jackbox model:** one shared big screen (meeting-room TV or screen share); players use their phones as controllers.
- **Structure:** a **session** is one whole sitting from start to finish, with one total score. A session contains multiple games (e.g. pop quiz, then drawing game). Use "session" in code, API, events and storage keys. One unit inside a game (one quiz question, one Draw it turn) is a **round** in code; the UI can still say "question".
- **Host controls:** by default the host runs the session from the big screen (they share their own screen). Hosts can optionally control the session from their phone instead.
- **Games planned:**
  - Pop quiz (Kahoot-style multiple choice, internal quizzes)
  - Drawing game (everyone gets the same word, draws it, then everyone votes on all drawings)
    - While their own drawing is being rated, the artist's phone shows "This one's yours" instead of the rating scale, so nobody can rate their own drawing.
- **No accounts:** the host gets a secret host token when creating a session and uses it to prove they are the host (from the big screen or their phone). Players never log in; they join with the room code, a name that must be unique within the session, and an optional avatar photo.
- **Room codes:** 4 letters, A–Z without I and O (easy to read off a TV).
- **Players:** up to 100 per session. Players can join after the session has started; they start with 0 points and take part from the next round.
- **Retention timings:** a session is deleted after 30 minutes without activity, and at most 6 hours after it was created. While the host or any player is connected, the session counts as active. When a session is deleted, every connected screen is told and disconnected.
- **Visual design:** the `@gamemash/ui` design system in `packages/ui` (tokens in `theme.css`, stories via `pnpm stories`).
- **No data retention:** all data, including uploaded avatar images, is wiped when the session ends. Every Redis key carries an expiry, so sessions that never end properly are deleted by Redis itself (no cron job).
- **Reconnects:** the host token and player tokens live in the browser tab's `sessionStorage` (one entry per session), so a reload or a locked phone resumes. They are cleared when the session ends. A server error during reconnect never counts as "session ended"; only a rejected token does.
- **Avatars:** the phone crops and resizes the photo to 256×256 WebP (JPEG fallback) before upload; the server accepts at most 32 KB and 512×512, checks the actual bytes, and serves avatars with `no-store`. Players without a photo show initials.
- **Host flow:** `/host` creates a session and opens the setup screen (the "workshop"): name the session, build a lineup of up to 10 games, edit each game. Every change autosaves to the server. "Open lobby" shows the big-screen lobby with room code, QR code, players and "Today's games"; "Edit games" goes back to setup. Opening the lobby requires every game to be complete.
- **Setup rules:** the setup can only change while the session is in the lobby; it is locked once the session starts. The server refuses to start a session until every game is complete. Phones and the lobby only receive the session name and a lineup summary (game type, number of rounds, seconds per round), never quiz answers.
- **Pop quiz config:** up to 50 questions per quiz. Each question has text (max 90 characters) and exactly 4 answers (triangle, diamond, circle, square; max 40 characters each), one marked correct. Rules per quiz: time per question (10, 20, 30 or 60 s), points for a right answer (500, 1000 or 2000), and switches for "faster answers earn more points", "show leaderboard after each question" and "shuffle answer order". Late joiners can always play (no per-game switch).
- **Big-screen lobby:** shows up to 15 player slots; beyond that the 14 most recent players plus "+N more".
- **Order of work:** Pop quiz end to end first, then Draw it. Draw it is not insertable in the lineup until its open questions are settled.
- **Deferred for now:** images in quiz questions, and "Preview on big screen" in the workshop.

## Stack
- **API:** Fastify + Redis
- **Realtime:** Socket.io (Colyseus considered and not chosen: the games are phase-based, not tick-based, and per-player hidden state is simpler with plain emits. Revisit if we add real-time action games.)
- **Web:** React
  - TanStack Router (file-based routing)
  - TanStack Query for REST calls (create session, check room code, etc.)
  - Zustand for live game state received over the socket. Socket state does not go in the Query cache.
- **Localisation:** shared messages package (ICU message format), translated on the client
  - Web: react-intl
  - The API returns error codes with params, never text; the client translates them.
  - If the server ever needs to produce text itself (emails, exports), add @formatjs/intl with the same catalogs.
- **Monorepo:** pnpm workspaces with shared types between server and client.

## Architecture direction (discussed, agreed in principle)
- **Server-authoritative:** phones only send inputs; the server owns all state and timers.
- **Phase engine:** games are built from phases (prompt → submit → vote → reveal → score) so new games are cheap to add.
- **Games as plugins:** each game is a self-contained module (server logic + big-screen view + phone view + config editor), so open-source contributors can add games.
- **Per-viewer views:** the server sends each screen only what it may see (phones never receive quiz answers or others' drawings before the reveal).
- **Reconnects:** a reconnect token per player so phones that lock or drop resume where the game is.
- **Storage:** all session data in Redis with TTLs. Small resized avatars stored in Redis too, so wiping a session is just deleting its keys.

## Progress
- **Done:** monorepo, CI and design system (`@gamemash/ui`, including the workshop theme); sessions over REST (create, room code lookup, join with unique names, avatars); live lobby over Socket.io (presence, keep-alive, 6-hour deadline, session end); web app for hosting, joining, the big-screen lobby and the phone waiting screen; session setup (workshop) for pop quizzes with autosave.
- **Next:** the game engine and Pop quiz gameplay: the host's Start button in the lobby, then rounds (question on the big screen, answer buttons on phones, timer, reveal, scores), built on the phase engine described above.
- **After that:** Draw it (settle its open questions first), then final scores.

## Open questions
- How "faster answers earn more points" is calculated (the switch exists in the quiz setup, the formula doesn't yet)
- Scoring across games: raw points, or normalized so each game counts equally?
- How long final scores stay visible after the last game
- Reusing quizzes when nothing is stored (e.g. export/import as a JSON file?)
- Drawing game details: word lists, timers, voting rules, drawing tools
- Which languages to support at launch, and how players pick one (browser locale, per player, or set by the host?)
- Should hosts write quiz content in any language, with only the UI localised?
- Which other games to include later (ideas: Gartic Phone-style telephone drawing, caption this, Fibbage-style bluffing, "who said it", closest-guess estimation)

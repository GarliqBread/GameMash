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
- **No accounts:** the host gets a secret host token when creating a session and uses it to prove they are the host (from the big screen or their phone). Players never log in; they join with the room code and a name that must be unique within the session. Avatars are set up afterwards in the lobby.
- **Room codes:** 4 letters, A–Z without I and O (easy to read off a TV).
- **Players:** up to 100 per session. Players can join after the session has started; they start with 0 points and take part from the next round.
- **Retention timings:** a session is deleted after 30 minutes without activity, and at most 6 hours after it was created. While the host or any player is connected, the session counts as active. When a session is deleted, every connected screen is told and disconnected.
- **Visual design:** the `@gamemash/ui` design system in `packages/ui` (tokens in `theme.css`, stories via `pnpm stories`).
- **No data retention:** all data, including uploaded avatar and question images, is wiped when the session ends. Every Redis key carries an expiry, so sessions that never end properly are deleted by Redis itself (no cron job). Question images are deleted when the session ends, and the API sweeps away the images of sessions that expired with nobody connected every 10 minutes.
- **Reconnects:** the host token and player tokens live in the browser tab's `sessionStorage` (one entry per session), so a reload or a locked phone resumes. They are cleared when the session ends. A server error during reconnect never counts as "session ended"; only a rejected token does.
- **Avatars:** every player gets a random character when they join (DiceBear "Croodles" style, CC BY 4.0 by vijay verma, credited in the app). On the phone's waiting screen they can customise it (hair or hat, eyes including glasses, mouth, nose, beard, moustache, top colour) or replace it with a photo, and remove the photo again to go back to their character. The character is stored as the chosen part per slot; the server checks each value against the style's list and never accepts SVG. Avatars can only be changed while the session is in the lobby; players who join after the start keep their random character.
- **Avatar photos:** the phone crops and resizes the photo to 256×256 WebP (JPEG fallback) before upload; the server accepts at most 32 KB and 512×512, checks the actual bytes, and serves avatars with `no-store`.
- **Kick:** the host can remove a player from the big-screen lobby, only while the session is in the lobby. The player's avatar is deleted, their name is freed and their phone shows that they were removed, with a button to join again. Removed players can rejoin with the room code (the host can remove them again).
- **Host flow:** `/host` creates a session and opens the setup screen (the "workshop"): name the session, build a lineup of up to 10 games, edit each game. Every change autosaves to the server. "Open lobby" shows the big-screen lobby with room code, QR code, players and "Today's games"; "Edit games" goes back to setup. Opening the lobby requires every game to be complete.
- **Setup rules:** the setup can only change while the session is in the lobby; it is locked once the session starts. The server refuses to start a session until every game is complete. Phones and the lobby only receive the session name and a lineup summary (game type, number of rounds, shortest and longest seconds per round), never quiz answers.
- **Pop quiz config:** up to 50 questions per quiz. Each question has text (max 90 characters counted as UTF-16 code units, so some emoji count as 2 or more; with bold, italic and underline; one paragraph), up to 9 images, exactly 4 answers (squircle, triangle, plus, dome; max 40 characters each) with one marked correct, a time limit (the quiz default, or its own 10, 20, 30, 60 or 120 s) and points (Standard = 1000 or Double = 2000). Rules per quiz: default time per question (10, 20, 30, 60 or 120 s), and switches for "faster answers earn more points", "show leaderboard after each question" and "shuffle answer order". Late joiners can always play (no per-game switch).
- **Pop quiz gameplay:** each question is shown alone for about 5 seconds, then the answers and timer appear and phones unlock. The first tap locks a player's answer. Answering ends when the timer runs out or every connected player has answered. The reveal shows the correct answer, how many picked each answer and the fastest right answer; with "show leaderboard after each question" on, it also shows the leaderboard as a side panel (no separate leaderboard screen). The host presses Next to move on from the reveal; there is no automatic countdown.
- **Question images:** the workshop resizes each image in the browser to at most 1920 px on the long side (WebP, JPEG fallback, max 1 MB) and uploads it; the server checks the actual bytes. Images are stored on the server's disk (an S3-compatible bucket is optional for self-hosters), never in Redis, up to 150 per session and at most 3,000 across all sessions at once; uploads also pause when the disk runs low. Images no question uses are deleted on the next save once they are 10 minutes old, which frees their slots. The big screen shows them during the question and answering phases, laid out by count (1 full, 2 side by side, 3 in a row, 4 as 2×2, 5–6 as 3×2, 7–9 as 3×3); the reveal doesn't show them. Phones never receive images. Without image storage configured the API runs with images turned off and the workshop hides "Add image".
- **Speed bonus (Kahoot-style):** with "faster answers earn more points" on, a correct answer earns `points × (1 − elapsed / limit ÷ 2)`, rounded, so an instant answer gets full points and a last-second answer gets half. With it off, every correct answer earns the full points. Wrong or missing answers earn 0.
- **Big-screen lobby:** shows up to 15 player slots; beyond that the 14 most recent players plus "+N more".
- **Order of work:** Pop quiz end to end first, then Draw it. Draw it is not insertable in the lineup until its open questions are settled.
- **Deferred for now:** "Preview on big screen" in the workshop.

## Stack
- **API:** Fastify + Redis; question images on disk
- **Hosting:** one OVHcloud VPS-2 (EU) running Redis, the API and Caddy with Docker Compose. Fixed monthly price, unlimited traffic, so abuse can't run up a bill.
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
- **Storage:** all session data in Redis with TTLs. Small resized avatar photos and character choices stored in Redis too. Question images live on disk under `sessions/{id}/`.

## Progress
- **Done:** monorepo, CI and design system (`@gamemash/ui`, including the workshop theme); sessions over REST (create, room code lookup, join with unique names, avatars); live lobby over Socket.io (presence, keep-alive, 6-hour deadline, session end); web app for hosting, joining, the big-screen lobby and the phone waiting screen; session setup (workshop) for pop quizzes with autosave; the phase engine (`apps/api/src/game`, games plug in through `GameRules`); Pop quiz gameplay end to end (Start in the lobby, read time, answering, reveal with leaderboard, host Next, a first final-scores screen on the big screen and phones); avatars (random Croodles character at join, customising it or swapping it for a photo on the waiting screen, locked once the session starts); removing players from the lobby.
- **Next:** ending the session from the final-scores screen (and how long final scores stay up, see open questions).
- **After that:** Draw it (settle its open questions first), then final scores.

## Open questions
- Is the Croodles credit in the avatar editor footer enough, or should it also go on an about page?
- Scoring across games: raw points, or normalized so each game counts equally?
- How long final scores stay visible after the last game
- Reusing quizzes when nothing is stored (e.g. export/import as a JSON file?)
- Drawing game details: word lists, timers, voting rules, drawing tools
- Which languages to support at launch, and how players pick one (browser locale, per player, or set by the host?)
- Should hosts write quiz content in any language, with only the UI localised?
- Which other games to include later (ideas: Gartic Phone-style telephone drawing, caption this, Fibbage-style bluffing, "who said it", closest-guess estimation)

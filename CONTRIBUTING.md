# Contributing to GameMash

Thanks for helping out. Bug reports, fixes and new games are all welcome.

## Before you start

- Read [docs/spec.md](docs/spec.md). It records what has been decided and what is still open. Anything under "Open questions" isn't decided yet, so open an issue to discuss it before writing code.
- For anything bigger than a small fix, open an issue first and describe what you want to change. Keep pull requests small and focused on one thing.
- Setup, URLs and environment variables are in the [README](README.md#development).

## Conventions

These are checked in review, and most of them by the tools too:

- No code comments. Name things so the code explains itself.
- The API returns error codes (`{ code, params? }` from `@gamemash/shared`), never text shown to people. Every error code needs a message in every catalog in `packages/messages`.
- Messages: no full stop at the end, `...` for an ellipsis, numbers through ICU (`{count, number}`), and limits passed in as values rather than written into the text. British spelling.
- Players' phones only receive what they are allowed to see: never quiz answers, other players' drawings before the reveal, or tokens.
- Every Redis key has an expiry. Nothing about a session outlives it.
- Styling uses the tokens in `packages/ui/src/theme.css`. New tokens need the maintainer's approval.
- UI components in `packages/ui` take their text through props and hold no game logic. Every primitive has a Ladle story (`pnpm stories`).
- Shared dependency versions go in the `catalog:` in `pnpm-workspace.yaml`.

[AGENTS.md](AGENTS.md) has the full list and a map of the code; it doubles as the guide for coding agents.

## Checks

Run these before opening a pull request. CI runs the same ones:

```sh
pnpm services   # Redis and MinIO, needed by the API tests
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

For UI changes, also check them in a browser: on a phone-sized window for player screens, and on a big screen for the host's.

## Adding a game

Each game lives in its own folder in `packages/games/src`, next to `pop-quiz` and `draw-it`. Copying one of those is the quickest way to start.

| File             | What it holds                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| `definition.tsx` | Title, colour, icon and round label shown in the workshop and lobby                                 |
| `schema.ts`      | The TypeBox schema for the game's setup                                                             |
| `config.ts`      | Limits, defaults and the readiness checks the workshop uses                                         |
| `rules.ts`       | The server-side game: its phases, how inputs are validated and scored, and what each screen may see |
| `views.ts`       | The types of what the big screen and the phones receive                                             |
| `scoring.ts`     | Scoring helpers, kept pure so they're easy to test                                                  |

Then register it:

1. Add its setup schema to the union in `packages/games/src/setup-schema.ts`, its config rules in `setup.ts` and its definition in `index.ts`.
2. Add its rules to `gameRules` in `packages/games/src/server.ts`.
3. Add the big-screen and phone screens in `apps/web/src/features`, and wire them in where the web app switches on the game type: `StageGame.tsx`, `PlayGame.tsx`, the workshop (`SetupWorkshop.tsx`) and `setup-changes.ts`, which creates a new game's default setup.
4. Add its messages to `packages/messages/src/locales`.
5. Test its rules with Vitest, like `pop-quiz/rules.test.ts`.

## Licence

By contributing, you agree that your contributions are licensed under the [AGPL-3.0](LICENSE), like the rest of the project.

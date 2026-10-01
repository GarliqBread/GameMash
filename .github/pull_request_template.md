## What and why

<!-- What does this change, and why? Link the issue it closes, e.g. "Closes #12". -->

## How to test

<!-- Steps a reviewer can follow to see it working. -->

## Screenshots

<!-- For UI changes: the phone screen, the big screen, or both. Delete this section otherwise. -->

## Checklist

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass
- [ ] UI changes checked in a browser (phone-sized for player screens, big screen for the host's)
- [ ] New error codes and messages are in every catalog in `packages/messages`
- [ ] Phones only receive what they're allowed to see (no quiz answers, tokens or other players' drawings before the reveal)
- [ ] New Redis keys have an expiry
- [ ] Follows the conventions in [CONTRIBUTING.md](https://github.com/GarliqBread/GameMash/blob/main/CONTRIBUTING.md)

# Deploy smoke — Production live URL

**Live URL:** https://web-ui-delta-eight.vercel.app

Live as of 2026-04-26 (B8c fan-in; tracking commit `5a3a0eb` after B7 land).

## Aliases

- `web-ui-delta-eight.vercel.app` — canonical alias (use this)
- `web-ui-git-main-beatlesms-projects.vercel.app` — branch-tracking alias
- `web-m0z1va3k4-beatlesms-projects.vercel.app` — deployment-specific (changes per deploy)

## Architecture note

Production hosted on Vercel under the `beatlesms-projects` team (Hobby tier). Vercel watches `rjgeng/web_ui` (personal fork) — `shuhan-study/web_ui` (org canonical) is the Refinery merge target, manually mirrored to `rjgeng/main` after each landing. See `wu-68q` close reason for the architecture decision.

## B8c HTTP evidence (verified 2026-04-26 ~11:23 PDT)

- `curl -I /grades` → HTTP/2 200, `cache-control: ... no-store ...`, `x-robots-tag: noindex`
- `curl /robots.txt` → `User-Agent: *` / `Disallow: /`
- `curl -I /` → HTTP/2 307, `location: /grades`

Function Logs (Vercel UI, last 30 min, ~10:48–11:23 PDT): zero errors, zero warnings across `/grades`, `/subject/history`, `/subject/math`, `/subject/test_2`, `/subject/test`, `/subject/reading`.

Build Logs: implicit pass — build Status = Ready in ~29s; no Prisma engine errors surfaced at runtime.

## Reseed cycle

_To be verified by B9 (`wu-n7i`)._

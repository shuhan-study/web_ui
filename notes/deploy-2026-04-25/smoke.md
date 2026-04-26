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

## B9 5-item smoke checklist (PRD goal #7)

Verified 2026-04-26 against `https://web-ui-delta-eight.vercel.app` (deployment tracking commit `8af6bfb`).

- [x] **`/grades` ✅** — `curl /grades` → HTTP 200; HTML contains all 8 current subject names (Choir 6, History 6, Math 6, P.E. 6, Reading 6, Science 6, Study Hall 6, Writing 6); no error-boundary copy in body.
- [x] **`/subject/[id]` ✅** — `curl /subject/history_6` → HTTP 200; HTML contains `<h1>History 6</h1>`, status line `Ms. L. · A+ · 97.0%`, and an `<table>` with 5 `<tr>` rows (header + assignments).
- [x] **`/about` ✅** — `curl /about` → HTTP 200; HTML contains `<h1 class="text-3xl font-semibold">About</h1>` (matches `web/app/about/page.tsx`).
- [x] **Styled 404 ✅** — `curl /subject/no-such-id` → HTTP 404 (verified 2026-04-26 21:03 UTC, post-wu-fsn fix at commit `8c7edb7`). Body contains the styled copy from `web/app/not-found.tsx` and the status is correctly downgraded. Original failure was force-dynamic streaming locking status at 200; `wu-fsn` removed `force-dynamic` from `/subject/[id]` so `notFound()` short-circuits before stream start.
- [x] **Reseed-and-redeploy ✅** — Edited Math 6 `current_percent` 94.0 → 94.5, ran `npm run reseed`, committed (`32f9c2f`), pushed to shuhan-study + rjgeng. Vercel auto-deployed. Reloaded `/grades` — Math 6 showed 94.5%. Test value reverted in this same commit.

reseed cycle: ✅ 2026-04-26

## B9 finding (RESOLVED 2026-04-26)

`/subject/no-such-id` originally returned HTTP 200 with the styled-404 body instead of HTTP 404 — a structural streaming-vs-`notFound()` interaction in `web/app/subject/[id]/page.tsx`. Tracked as `wu-fsn` (P2 bug). Resolved at commit `8c7edb7`: removed `force-dynamic` and `loading.tsx` from `/subject/[id]` so the response buffers until `notFound()` runs. Live URL verified returning HTTP 404 (2026-04-26 21:03 UTC). B10 (`wu-hwf`) no longer blocked by this finding.

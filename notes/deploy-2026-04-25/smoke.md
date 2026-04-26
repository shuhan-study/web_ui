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
- [ ] **Styled 404 ❌** — `curl /subject/no-such-id` returns **HTTP 200** (NOT 404). Body DOES contain the styled copy from `web/app/not-found.tsx` (`Not found`, `That page doesn't exist.`, `Back to grades`) plus Next's `NEXT_HTTP_ERROR_FALLBACK;404` digest, so the visual UX is correct, but the strict curl-verifiable acceptance (`returns 404`) fails. Root cause: `web/app/subject/[id]/page.tsx` declares `export const dynamic = 'force-dynamic'` and calls `notFound()` after async `fetchSubjectById`; once Next has begun streaming the response, the HTTP status is locked at 200 and cannot be downgraded to 404. Filed as `wu-fsn` (follow-up bug); see B10 blocker note below.
- [ ] **Reseed-and-redeploy** — _Reserved for overseer (Rongjun): edit `web/data/seed/grades.json`, `npm run reseed`, commit, push, mirror to `rjgeng/main`, await Vercel auto-deploy, reload `/grades`, confirm changed value. Stamp `reseed cycle: ✅ <date>` here ONLY after success._

reseed cycle: _pending overseer_

## B9 finding — surface as B10 blocker

`/subject/no-such-id` returns HTTP 200 with the styled-404 body instead of HTTP 404. Per B9 acceptance and the bead's rollback path, this is a smoke failure on item 4. It is NOT caused by an offending commit (no rollback applies); it is a structural streaming-vs-`notFound()` interaction in `web/app/subject/[id]/page.tsx`. Tracked as `wu-fsn` (P2 bug) and recommended as a named blocker for B10 (`wu-hwf`, Tag v0.7-deploy-complete) until the route is reworked to return a true 404 status.

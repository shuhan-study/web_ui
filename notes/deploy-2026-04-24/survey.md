# Deploy project — survey notes (2026-04-24)

Notes accumulated while preparing PLAN.md for the Deploy project.
Captured for polecat reference and future-Sherpa context. Not
authoritative — PLAN.md is.

## Repo state at survey time

- Branch surveyed: `origin/main` (read via `git show origin/main:<path>`)
- Tag on main: `v0.6-modernization-complete`
- GitHub: `https://github.com/shuhan-study/web_ui.git`

## Stack (from `web/package.json`)

- Next 16.2.4 (Turbopack), React 19.2.5, Tailwind 3.4.1, Prisma 5.22.0
- Node engine: ≥20.9
- shadcn (hand-seeded), next-themes, lucide-react, radix
- DATABASE_URL = `file:./dev.db` (SQLite)
- `next.config.mjs` is empty — no redirects, no custom settings

## Vercel context

- GitHub link / Vercel account: prerequisite, not blocking — first bead can include it
- Project Root Directory must be `web` (Next.js app lives in `web/` subdir)
- Default `*.vercel.app` URL is fine for "landed"; custom domain deferred

## Decisions locked in PLAN.md

1. **DB: Option C** — SQLite committed to repo, read-only at runtime, redeploy on reseed
2. **Root `/`: redirect** to `/grades`
3. **Stale subtitle: zero-state** ("No assignments yet")

See PLAN.md decision log for "why".

## Reused inputs

- `archive/prd-reviews/p6-deploy-discarded-draft.md` — the seed PRD. It identified the same gaps and surfaced the DB decision. The intake polecat should adopt its problem framing and update the DB-options section to lock Option C.
- Modernization `PLAN.md` (now archived at `archive/PLAN-modernization.md`) explicitly listed these items as carry-forward to "the next project (Deploy)".

## Found in flight (preserved in full_stack's stash)

During full_stack's pre-flight on 2026-04-24, a local uncommitted edit to
`web/.gitignore` was discovered: it un-ignores `/prisma/dev.db`.
**Origin: overseer's morning 2026-04-24 claude.ai session, prepping for
Option C.** Stashed by full_stack with label
`wu-avk pre-pull: un-ignore dev.db edit` so the edit isn't lost. Apply
through a proper Deploy implementation bead when the molecule lands the
bead graph — this is the right Option-C plumbing point (un-ignore +
commit `dev.db` together, in the deploy bead, not ad-hoc).

## Open follow-on beads (not Deploy-blocking, per hq-h82)

- `wu-8ld` (P3) — OQ #4 client-boundary probe target mismatch
- `wu-0yk` (P4) — `wu-8eo.6` mutate-probe SQL typo (grade → currentGrade)
- `wu-sjk` (P3) — Modernization v2: Tailwind 3 → 4

## Mayor worktree warning (to flag at session close)

The mayor worktree at `/Users/rfvitis/gt-personal/web_ui/mayor/rig/` is on
main but `git status` shows ~100 files staged as deletions (essentially
the entire repo minus `README.md`). Mayor session is currently down
(yesterday's nudge failed). If mayor wakes and pushes in that state, it
wipes the repo on GitHub. Needs to be surfaced when mayor session restarts.

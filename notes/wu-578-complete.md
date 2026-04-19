# wu-578 — Completion Report

## Status: PASS. P1 complete.

## Scope

Add `/grades` route placeholder. No data wiring (Prisma + seed → P2).

## Files

| Path | Kind | Content |
|---|---|---|
| `web/app/grades/page.tsx` | create (9 lines) | Server component; `<h1>Grades</h1>` + `<p>` placeholder; bare fragment (no Container — layout owns it per wu-9xz divergence #2) |

## Gates

| Check | Result |
|---|---|
| `GET /grades` → HTTP 200 | ✓ |
| `<nav` in HTML | present — Navbar persists from layout |
| `mx-auto max-w-6xl` in HTML | present — Container still wrapping |
| `>Grades<` | h1 rendered |
| `Placeholder` | subtitle rendered |
| dev log errors/warnings | none |

## Commit

- `P1: Add /grades placeholder route` → (see git)
- Pushed to `origin/main`.
- `bd close wu-578`.

## P1 status

All five P1 beads closed:

| Bead | Title | Commit |
|---|---|---|
| (pre-existing) | Scaffold Next.js app with TypeScript + Tailwind | `202310f` |
| wu-oa3 | Remove default boilerplate; add Container component | `1427756` |
| wu-eix | Wire next-themes + cn() utility (shadcn CLI deferred) | `c4c4cb4` |
| wu-9xz | Add Navbar with Logo + DarkMode (hand-seed shadcn Radix era) | `a3deca3` |
| wu-578 | Add /grades placeholder route | this commit |

P1 acceptance (from `PLAN.md` §5): `npm run dev` serves the app; `/`
and `/grades` render; dark mode toggles; no console errors. **Met.**

Next phase: P2 — Data layer (Prisma + SQLite + seed from
`data/seed/grades.json`). Beads not yet filed; ready to scaffold when
you are.

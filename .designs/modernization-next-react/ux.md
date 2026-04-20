# User Experience Analysis

## Summary

There are two users of this upgrade: **Shuhan** (the end user of the
grades app) and **Rongjun** (the maintainer running the upgrade pipeline).
Shuhan must experience **zero change** — that is the success criterion.
Rongjun must experience a **clean pull, build, run, smoke** cycle with
no hidden manual steps. The UX risk concentrates in two places: the
`next-themes` mount-flash on React 19, and the maintainer's ability to
reproduce the polecat's green build on their own laptop. Everything
else is already disciplined by the PRD's Non-Goals.

## Analysis

### Key Considerations

- **Invisibility as the bar.** Any visible pixel difference between
  pre- and post-upgrade `/grades` and `/subject/[id]` is a failure.
  This includes: theme flash, font FOUT, focus-ring shift, table
  column width drift (tailwindcss-animate or tailwind-merge edge
  behavior), dropdown menu animation jitter.
- **Theme flash is the highest UX risk.** `next-themes ^0.4.6` on
  React 19 is untested in this repo. Review risk ranking rates it
  Medium. Symptom: light-mode paint on first render before the
  client hydrates the `dark` class from `localStorage`. Detection:
  hard-refresh `/grades` in dark mode, look for a white flash.
- **Font loading via `next/font/local`.** `app/layout.tsx` loads
  GeistVF locally. Next 16's font loader internal resolution
  changed. FOUT (flash of unstyled text) or a 404 on `.woff2` in
  the Network panel would be a regression. Not in the PRD's stated
  smoke — but cheap to add.
- **Error experience.** `app/error.tsx` is the shipped error boundary.
  Goal 4 requires it still triggers. Underspecified in the PRD: does
  the forced throw go in a Server Component, Client Component,
  `useEffect`, or a route handler? React 19 rewrote the error
  signature for `ErrorBoundary` (now receives `{ digest }` shape
  tweaks). Choose Client Component for the smoke throw — it exercises
  the client-boundary render path which is where the `'use client'`
  boundary code has the most React 19 change.
- **Accessibility regression surface.** Not named in the PRD but
  flagged in the review. Keyboard nav through the table and dropdown,
  color contrast, `prefers-reduced-motion`. All unlikely to regress
  from a framework bump alone — but a hand-seeded
  `forwardRef`-to-ref-as-prop conversion that breaks ref forwarding
  on the dropdown menu trigger would silently break focus management.
- **Maintainer's post-merge path.** `git pull --rebase && npm ci &&
  npx prisma generate && npm run dev`. Four steps. If any one
  errors, the invisibility promise is already broken for the person
  who matters most to project success.
- **Baseline snapshot as UX anchor.** The review's Q1 proposed
  `notes/modernization-baseline.md`. This is both a verification
  artifact and a UX artifact — the maintainer can diff baseline
  vs. post-upgrade themselves without reading the code.

### Options Explored

#### Option 1: Named-route smoke + theme-flash + font-load + mutate-probe (recommended)

- **Description**: Phase 5 smoke script is five named probes:
  (1) `/`, (2) `/grades` list renders, (3) click subject →
  `/subject/[id]` renders, (4) toggle dark mode, hard-refresh, no
  flash, (5) forced throw in a Client Component triggers `error.tsx`,
  (6) mutate row via Prisma Studio, refresh, new value appears,
  (7) Network panel clean on `.woff2`. Script is a markdown
  checklist in `notes/modernization-smoke.md`.
- **Pros**: Each probe maps to a specific regression class the
  review flagged. Manual but falsifiable. Cheap.
- **Cons**: Requires maintainer to execute; polecat cannot verify
  theme flash (no headless browser in-scope).
- **Effort**: Low.

#### Option 2: `curl` + grep as sole verification

- **Description**: Polecat curls each route, greps for known
  strings, declares success.
- **Pros**: Automatable, runs in polecat sandbox.
- **Cons**: Does not catch theme flash, font FOUT, focus loss,
  animation regression. Fundamentally insufficient for "looks
  identical" success criterion.
- **Effort**: Lowest — regression-unsafe.

#### Option 3: Full Playwright smoke

- **Description**: Stand up Playwright, scripted smoke.
- **Pros**: Reproducible, catches regressions.
- **Cons**: PRD Non-Goal ("No test infrastructure"). Out of scope.
- **Effort**: High — out of scope.

### Recommendation

**Option 1**. Named-route smoke checklist, executed by the
maintainer post-merge. The polecat produces the checklist as part of
Phase 5 output. The polecat's own verification stops at `npm run
build` succeeding and `npm run dev` cold-starting without server-log
errors. The maintainer takes the browser-visible ownership — documented
as the split per the review's "browser smoke ownership" point.

## Constraints Identified

- No visible pixel difference allowed on `/`, `/grades`, or
  `/subject/[id]`.
- `next-themes` must still prevent FOUC / theme flash.
- Dropdown menu keyboard accessibility must not regress.
- GeistVF local fonts must load without 404 or FOUT.
- Error boundary must catch a Client Component throw.

## Open Questions

- **Who owns the browser smoke?** PRD implies polecat; PRD review
  flags polecats typically cannot launch GUI browsers. Proposed:
  polecat produces the checklist and cold-start log, maintainer
  executes the browser probe. `gt done` fires when `npm run build`
  is green and `dev` cold-starts clean. Maintainer's browser smoke
  is a pre-tag manual gate, not a polecat gate.
- **Browser target?** Review flagged this. Proposed: name Chrome
  stable on the maintainer's laptop as the authoritative target.
  Shuhan's actual browser is out of polecat scope.

## Integration Points

- **API dimension** — maintainer's post-merge CLI path is the UX
  surface; `postinstall` script decision affects step count.
- **Data dimension** — mutate-probe is both a data-freshness and
  a UX check.
- **Integration dimension** — baseline artifact and smoke checklist
  are committed markdown files; commit granularity feeds bisect.

# wu-dw9 — Completion Report

## Status: PASS. First live DB fetch working end-to-end.

## Gates

### Gate 1 — `npx tsc --noEmit`

```
exit: 0
```

Prisma-client types aligned. `fetchAllSubjects()` inferred as
`Promise<Subject[]>`; page component's `.map(s => …)` type-checks.

### Gate 2 — `npm run build`

Built cleanly, 5 static pages generated:

```
Route (app)                              Size     First Load JS
┌ ○ /                                    142 B          87.4 kB
├ ○ /_not-found                          873 B          88.1 kB
└ ○ /grades                              142 B          87.4 kB
```

**Caveat worth flagging:** `/grades` built as `○ (Static)` —
prerendered at build time with whatever DB state existed. Next's
default for async server components with no dynamic APIs (`cookies()`,
`headers()`, `searchParams`) is static.

For local dev this is fine (dev server is always dynamic — see
Gate 3). For a future production deploy we'll need
`export const dynamic = 'force-dynamic'` (or `revalidate`) on this
page so the DB is re-queried per request. Not in scope for wu-dw9;
can land in a P5 polish bead or whenever we first consider deploy.

### Gate 3 — dev server + curl

```
HTTP 200
GET /grades 200 in 3818ms
```

All 7 seeded subjects rendered in the HTML:

```
  ✓ Math 6
  ✓ Writing 6
  ✓ Reading 6
  ✓ History 6
  ✓ Science 6
  ✓ P.E. 6
  ✓ Cobra Choir
```

Teachers (Angeloni/Fryer/Huizinga/Mann) also present. `utils/db.ts`
singleton carried the load cleanly on first production-path usage.

### Gate 4 — Empty-state check (skipped)

Marked optional in the intent and flagged as wu-noz's domain.
Current page has an inline `<p>` fallback when `subjects.length === 0`;
wu-noz will replace with a proper component + probably handle the
"DB file missing entirely" case more carefully (currently that would
throw a 500, not render empty state).

### Gate 5 — Hydration / console warnings

```
errors/warnings in dev log: none
```

## Files shipped

| Path | Action | Size |
|---|---|---|
| `web/utils/actions.ts` | create | 7 lines (just `fetchAllSubjects`) |
| `web/app/grades/page.tsx` | replace | 25 lines (async server component) |
| `notes/wu-dw9-intent.md` | create (pre-bead) | 160 lines |
| `notes/wu-dw9-complete.md` | create | this file |

## Design confirmations

- `utils/actions.ts` naming per manual ✓
- `orderBy: { name: 'asc' }` — deterministic alphabetical (Cobra
  Choir, History 6, Math 6, P.E. 6, Reading 6, Science 6, Writing 6)
- No `include` for assignments or term — stays light for the grid
- Server component async fetch — no `'use client'`, no hooks

## Commit

- Message: `P3: Fetch subjects from DB on /grades`
- Push, `bd close wu-dw9`.

## Carry-forward notes for P3 remainder

- **Static prerender caveat** — once wu-88w lands and the page gets
  richer cards/grid, consider adding `export const dynamic =
  'force-dynamic'` if we're noticing stale data during dev restarts.
- `fetchAllSubjects()` returns bare `Subject[]`. wu-32c will need
  `Subject` type imported from `@prisma/client` for its prop type.
- wu-noz will want the `subjects.length === 0` branch — currently
  inline in page.tsx; migrating to a component is a one-line swap.

## Next

wu-32c (SubjectCard component).

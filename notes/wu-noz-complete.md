# wu-noz — Completion Report

## Status: ALL 4 GATES PASS. **P3 complete.**

## Gates

### Gate 1 — `npx tsc --noEmit`

```
exit: 0
```

`heading: React.ReactNode` type threads correctly through to the
JSX fragment call site.

### Gate 2 — `npm run build`

Clean; build output unchanged from wu-88w (EmptyState is tiny + only
in the unreachable branch today).

### Gate 3 — dev server + `curl /grades` (seeded, non-empty path)

```
HTTP 200
```

Grid still rendering 7 subjects. No regression from wu-88w.

### Gate 4 — Empty-state render (migrated-but-unseeded DB)

The probe needed a nuance the intent didn't call out: simply renaming
`dev.db` creates a *fresh blank DB* on next Prisma connect, which
returns 500 ("table `Subject` does not exist") — not an empty state.
That's the "missing-migration" failure mode, not the "empty-but-
valid" one we're trying to verify.

**Proper probe:**
1. Parked seeded DB: `mv prisma/dev.db prisma/dev.db.seed.bak`
2. Applied migrations to a fresh empty DB: `npx prisma migrate deploy`
3. Started dev, curled `/grades`.
4. Restored seeded DB afterwards; confirmed row count back to 7.

**Result:**

```
HTTP 200
```

Empty-state HTML markers all present:
- `<h2 class="mt-2 text-xl …">` — EmptyState's own classes ✓
- "No subjects yet" ✓
- "npm run seed" ✓

No errors in dev log. EmptyState renders cleanly.

**Post-probe state:** seeded DB restored; `subjects: 7` confirmed via
direct Prisma count.

**Out-of-scope issue uncovered:** the "DB file missing entirely" path
(no schema applied) returns a 500, not a graceful empty state. That's
a different failure mode than "empty-but-migrated" — it'd need either
an error boundary (Next `error.tsx`), a try/catch in
`fetchAllSubjects`, or an on-boot migration-deploy check. Flag for a
future bead if we ever ship this beyond local dev. Not wu-noz's job.

## Files shipped

| Path | Action | Size |
|---|---|---|
| `web/components/global/EmptyState.tsx` | create | 17 lines |
| `web/app/grades/page.tsx` | modify | +7 / -3 lines (import + JSX swap) |

## Design confirmations

- `heading: React.ReactNode` accepts both strings (manual default)
  and JSX fragments (our `<>No subjects yet. Run <code>npm run
  seed</code>.</>` call site).
- `cn()` from `@/lib/utils` (set up in wu-eix) handles merging the
  default `text-xl text-muted-foreground` with caller's optional
  `className`.
- Generic enough for P4 reuse (e.g. "No assignments yet.") — just
  pass a different `heading`.

## Commit

- Message: `P3: Add EmptyState component; replace inline grades empty fallback`
- Push, `bd close wu-noz`.

## P3 complete

All four beads closed:

| Bead | Title | Commit |
|---|---|---|
| wu-dw9 | Fetch subjects from DB | `f29c1bd` |
| wu-32c | SubjectCard component | `e2040b0` |
| wu-88w | Responsive grid + wire-up | `9f01410` |
| wu-noz | EmptyState when DB has no subjects | this commit |

P3 acceptance (PLAN.md §5): `/grades` lists all seeded subjects with
correct data, in both dark and light mode. **Met.**

Retrospective in `notes/p3-retrospective.md`.

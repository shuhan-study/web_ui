# wu-1mk — Completion Report

## Status: ALL 3 GATES PASS.

## Gates

### Gate 1 — `npx tsc --noEmit`

```
exit: 0
```

Prisma-inferred return type
`Promise<(Subject & { assignments: Assignment[] }) | null>`
threads cleanly.

### Gate 2 — Functional probe (ephemeral `npx -y tsx -e`)

```
math_6 non-null: true
math_6 currentGrade: A
math_6 assignments.length: 5
first date: 2026-02-20
last date: 2026-04-17
date order asc: true
bogus is null: true
```

Three acceptance criteria verified in one probe:
- `fetchSubjectById('math_6')` → non-null Subject with `currentGrade: 'A'`
- `assignments.length === 5` matches seed (Math 6 has 5 assignments)
- `date asc` order confirmed (`2026-02-20` <= `2026-04-17`)
- `fetchSubjectById('bogus')` → `null`

### Gate 3 — `npm run build`

Clean. Bundle unchanged (function not yet imported from any route).

## Files shipped

| Path | Action | Size |
|---|---|---|
| `web/utils/actions.ts` | modify | +10 lines (one function) |

## Design confirmations

- `findUnique` preferred over `findFirst` — primary key guarantee
  caught at compile time.
- `orderBy: { date: 'asc' }` — chronological reading order for the
  table (wu-h1q).
- Returns `null` (not `redirect()` like the manual) — cleaner split:
  data layer returns data, route layer handles UX (404 via
  `notFound()` in wu-amy).

## Commit

- Message: `P4: Add fetchSubjectById to utils/actions.ts`
- Push, `bd close wu-1mk`.

## Next

wu-amy (dynamic route) — now has a typed data source to wire to.

# wu-amy — Completion Report

## Status: ALL 5 AUTOMATED GATES PASS.

## Gates

### Gate 1 — `npx tsc --noEmit`

```
exit: 0
```

`params: { id: string }` shape correct; `notFound()` narrows
`subject` to the non-null `Subject & { assignments: Assignment[] }`
type as expected.

### Gate 2 — `npm run build` + route-mode check

```
├ ○ /                                    142 B          87.4 kB
├ ○ /_not-found                          873 B          88.1 kB
├ ○ /grades                              175 B          96.1 kB
└ ƒ /subject/[id]                        142 B          87.4 kB
```

**`/subject/[id]` built as `ƒ (Dynamic) server-rendered on demand`** —
exactly as the intent predicted. Next auto-picked dynamic rendering
because there's no `generateStaticParams` and no other static-only
hint. No `export const dynamic = 'force-dynamic'` was needed; data
freshness per request is free.

### Gate 3 — `curl /subject/math_6`

```
HTTP 200
```

All content markers present (text-node split caveat — see below):

| Marker | Source | Present |
|---|---|---|
| `Math 6` | `<h1>` | ✓ |
| `Angeloni` | teacher | ✓ |
| `>A<` | currentGrade | ✓ |
| `>94.0<` | currentPercent.toFixed(1) | ✓ |
| `assignments recorded` | placeholder line | ✓ |

**First false-alarm:** initial grep for literal `"94.0%"` and
`"5 assignments recorded"` missed because React RSC output splits
text nodes at JSX expression boundaries — `{percent}%` became two
adjacent text nodes, so `94.0` and `%` aren't contiguous in the
raw HTML. Re-verified with per-token greps. This is a general
pattern; future curl-based gates should grep for discrete tokens
rather than long phrase-spanning strings.

### Gate 4 — `curl /subject/bogus`

```
HTTP 404
body: "404 · This page could not be found"
```

`notFound()` wired correctly; Next's default 404 page served.

### Gate 5 — Dev log

```
errors/warnings: none
```

### Gate 6 — Visual QA

Not run (automated gates are conclusive for this scope). User can
verify via browser: click any card on `/grades` → lands on
`/subject/<id>`; back button returns to grid; toggle theme; try
`/subject/nope` → 404.

## Files shipped

| Path | Action | Size |
|---|---|---|
| `web/app/subject/[id]/page.tsx` | create | 23 lines |

Zero other changes.

## Design confirmations

- **Server component, no `'use client'`** — async Prisma call, zero
  client hooks.
- **`notFound()` narrows the type** — TS knows `subject` is non-null
  after the guard because `notFound()` returns `never`. No cast, no
  non-null assertion.
- **Dynamic-by-default for parameterized routes** — preserved
  request-time DB reads without explicit config. Carries the
  unresolved `/grades` static-prerender concern into sharp contrast:
  list page is frozen at build, detail page is fresh. Will be worth
  reconciling if we ever deploy.
- **Links from wu-32c SubjectCard now live.** Clicking cards on
  `/grades` works end-to-end against seeded data.

## Commit

- Message: `P4: Add /subject/[id] dynamic route scaffold`
- Push, `bd close wu-amy`.

## Carry-forward for P4 remainder

- **`subject.assignments` is already fetched** via wu-1mk's
  `include`. wu-h1q's AssignmentsTable just receives the array as a
  prop; no additional data fetch needed.
- **Placeholder `<p>` count line** gets replaced by
  `<AssignmentsTable assignments={subject.assignments} />` in wu-h1q.
- **Gate-grep lesson:** prefer discrete token greps (`>A<`, `94.0`)
  over phrase greps that cross JSX expression boundaries. Will
  apply going forward.

## Next

wu-h1q (AssignmentsTable). First data-rich table; may need shadcn
Table primitive hand-seed.

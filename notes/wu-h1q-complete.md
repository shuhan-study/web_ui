# wu-h1q — Completion Report

## Status: ALL 6 GATES PASS (after one bug fix during gate 4).

## Bug caught by Gate 4 — timezone date shift

Initial run showed every assignment date off-by-one (Feb 19 instead
of Feb 20, Apr 16 instead of Apr 17, etc.). Root cause:

- Seed JSON date `"2026-02-20"` → `new Date("2026-02-20")` parses as
  midnight UTC (`2026-02-20T00:00:00.000Z`).
- Server runs in PDT (UTC-7); `.toLocaleDateString('en-US', …)` with
  no `timeZone` option renders in local TZ → `Feb 19, 17:00` → "Feb 19".

**Fix:** added `timeZone: 'UTC'` to the format call. One line:

```diff
 a.date.toLocaleDateString('en-US', {
   month: 'short',
   day: 'numeric',
+  timeZone: 'UTC',
 })
```

All five math_6 dates now render correctly (Feb 20, Mar 6, Mar 27,
Apr 10, Apr 17).

**Pattern to remember:** any `Date` column stored from a date-only
seed string like `"YYYY-MM-DD"` needs UTC-explicit rendering. The
seed parses to midnight UTC; that's the semantic "date" we want to
show. Defaulting to local TZ silently fragments data by deploy
location. Carrying forward for wu-orr if it ever displays dates, and
for any future component that renders `Term.start` / `Term.end`.

## Gates

### Gate 1 — source-diff `table.tsx` vs 0.9.4 registry

```
diff exit: 0
```

Byte-match. 117 lines, verbatim.

### Gate 2 — `npx tsc --noEmit`

```
exit: 0
```

`Assignment` prop type, Table sub-component types all align.

### Gate 3 — `npm run build`

```
└ ƒ /subject/[id]                        142 B          87.4 kB
```

Still `ƒ Dynamic`. Interesting: First Load JS **unchanged** from
wu-amy (87.4 kB). Table is pure presentational (no `'use client'`,
no hooks) → fully server-rendered → zero client bundle impact. Nice
property of the dynamic route.

### Gate 4 — `curl /subject/math_6`

```
HTTP 200
```

All markers present after the TZ fix:

| Marker type | Expected | Result |
|---|---|---|
| `<table>` element | 1 | 1 ✓ |
| Column headers | `>Assignment<`, `>Date<`, `>Category<`, `>Score<` | all 4 ✓ |
| Assignment names | 5 (Fractions, Ratios, Unit 7, Geometry, Data Collection) | all 5 ✓ |
| Dates | Feb 20, Mar 6, Mar 27, Apr 10, Apr 17 | all 5 ✓ |
| Category values | Homework, Quiz, Test, Project | all 4 ✓ |
| Score numerators | 28, 18, 46, 24, 38 | all 5 ✓ |
| Score denominators | 30, 20, 50, 25, 40 | all 5 ✓ |

Grep-for-discrete-tokens lesson from wu-amy applied — `28/30`
splits across `>28<`, `/`, `>30<` in RSC output, so tokens were
grepped individually.

### Gate 5 — `curl /subject/cobra_choir`

```
HTTP 200
```

All 4 cobra_choir assignment names present. Table renders for a
different subject cleanly.

### Gate 6 — Dev log

```
errors/warnings: none
```

## Files shipped

| Path | Action | Size | Source |
|---|---|---|---|
| `web/components/ui/table.tsx` | create (pull verbatim) | 117 lines | 0.9.4 registry |
| `web/components/assignments/AssignmentsTable.tsx` | create | 54 lines | hand-written |
| `web/app/subject/[id]/page.tsx` | modify | +6 / -3 lines | wire-up |

## Design confirmations

- **Column set:** Name / Date / Category / Score-with-inline-percent.
  4 columns. Approved.
- **Date format:** `Feb 20` (short month + day, no year). Approved.
- **Score cell:** combined `"28/30 (93.3%)"`. Approved.
- **Layout:** stacked `<section>` below the subject header.
  Approved. Leaves room for wu-orr's CategoryBreakdown as either a
  sibling section below or a side column.
- **Overflow wrapper** from 0.9.4 Table (`<div relative w-full
  overflow-auto>`) means the table gets horizontal scroll for free
  on narrow screens. No extra responsive work needed.

## Commit

- Message: `P4: Add AssignmentsTable (hand-seed shadcn Table)`
- Push, `bd close wu-h1q`.

## Next

wu-orr (CategoryBreakdown). Last P4 bead. Subject detail page gets
complete after that lands.

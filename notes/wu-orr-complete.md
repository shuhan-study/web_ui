# wu-orr — Completion Report

## Status: ALL 6 GATES PASS. **P4 complete.**

## Gates

### Gate 1 — `npx tsc --noEmit`

```
exit: 0
```

`as const` tuple narrows to literal union; type guard in `.filter`
correctly removes `null` entries; `Assignment` prop typed.

### Gate 2 — Functional probe (correctness)

All math matches intent's hand-computed expectations:

```
math_6:
  Homework: 52/55 = 94.5% (2)
  Quiz:     18/20 = 90.0% (1)
  Test:     46/50 = 92.0% (1)
  Project:  38/40 = 95.0% (1)
writing_6:
  Homework: 37/40 = 92.5% (2)
  Quiz:     14/15 = 93.3% (1)
  Project:  47/50 = 94.0% (1)
writing_6 hides Test: true
```

### Gate 3 — `npm run build`

Clean. `/subject/[id]` still `ƒ Dynamic`, First Load JS unchanged
(CategoryBreakdown is pure server-rendered like AssignmentsTable).

### Gate 4 — `curl /subject/math_6`

```
HTTP 200
```

All 4 category headings + all 4 expected percents (94.5, 90.0, 92.0,
95.0) + the "By category" section heading present.

### Gate 5 — `curl /subject/writing_6` (hide-empty-category rule)

```
HTTP 200
```

- All 3 expected percents present (92.5, 93.3, 94.0)
- `>Test<` count in HTML: **0** — confirmed hidden (writing_6 has
  no Test assignments anywhere, so the token doesn't appear in
  AssignmentsTable's Category column or CategoryBreakdown's heading
  list)

### Gate 6 — Dev log

```
errors/warnings: none
```

## Port-conflict hiccup (process note)

First run of gates 4–5 hit HTTP 404. Root cause: a previous stale
dev server (likely left over from a killed bash session earlier in
this conversation) was holding port 3000 under a different PID.
`npm run dev` auto-rebinds to 3001, but curl was still hitting 3000.

Fix: `pkill -f "next dev"` + sleep + restart. Gates then passed
cleanly.

**Pattern for future beads:** when a dev-server gate returns 404
unexpectedly, check `dev.log` for the "port in use, trying 3001"
warning before assuming a code bug. Belongs in a gate-hygiene note,
not wu-orr's scope.

## Files shipped

| Path | Action | Size |
|---|---|---|
| `web/components/assignments/CategoryBreakdown.tsx` | create | 46 lines |
| `web/app/subject/[id]/page.tsx` | modify | +5 lines (import + stacked section) |

Zero other changes.

## Design confirmations

- `<dl>` / `<dt>` / `<dd>` semantic markup for the description-list
  layout.
- Canonical category order `[Homework, Quiz, Test, Project]`
  preserved — matches seed validation order.
- Hide-empty rule works: writing_6 shows 3 rows, not 4.
- `tabular-nums` keeps digits aligned across rows.
- Stacked sections layout (wu-h1q precedent) — AssignmentsTable on
  top, CategoryBreakdown below, 32px gap between them.

## Commit

- Message: `P4: Add CategoryBreakdown component`
- Push, `bd close wu-orr`.

## P4 status

All 4 beads closed:

| Bead | Title | Commit |
|---|---|---|
| wu-1mk | Fetch subject + assignments | `82e845d` |
| wu-amy | Dynamic route /subject/[id] | `35e876b` |
| wu-h1q | AssignmentsTable | `124f7f5` |
| wu-orr | CategoryBreakdown | this commit |

P4 acceptance (PLAN.md §5): "clicking a subject card opens its
detail page; all assignments render; category totals sum
correctly." **Met.**

Retrospective in `notes/p4-retrospective.md`.

# wu-orr — Intent (CategoryBreakdown)

## Scope

Build `components/assignments/CategoryBreakdown.tsx` — pure
presentational; takes `assignments[]` prop; computes per-category
aggregate and renders in canonical order. Wire into `/subject/[id]`
as a second stacked `<section>` below AssignmentsTable. Closes P4.

## Computation

For each category in the canonical order `[Homework, Quiz, Test,
Project]`:

1. Filter assignments by category.
2. If the filtered set is empty → **skip the row entirely** (per
   bead acceptance: no `0%` placeholders).
3. Else sum `score` and `maxScore` across the subset → compute
   `percent = (sumScore / sumMax) * 100`.
4. Also track `count` (assignments in that category) for
   informational display.

No hooks, no client code. Pure reduce over the prop array at render
time. Server-rendered like every other P3/P4 component.

**Canonical order:** fixed `['Homework', 'Quiz', 'Test', 'Project']`
(not alphabetical) — matches seed validation order from wu-jqt and
matches "grading weight" intuition (assignments, then quizzes, then
tests, then projects).

## Expected values (sanity-check targets for the functional gate)

**math_6** (all 4 categories present):

| Category | Score | Max | Percent |
|---|---|---|---|
| Homework | 28 + 24 = 52 | 30 + 25 = 55 | 94.5% |
| Quiz | 18 | 20 | 90.0% |
| Test | 46 | 50 | 92.0% |
| Project | 38 | 40 | 95.0% |

**writing_6** (no Test — Test row must be hidden):

| Category | Score | Max | Percent |
|---|---|---|---|
| Homework | 18 + 19 = 37 | 20 + 20 = 40 | 92.5% |
| Quiz | 14 | 15 | 93.3% |
| Project | 47 | 50 | 94.0% |
| *(Test)* | — | — | hidden |

writing_6 is the "hide empty category" acceptance test.

## Component shape

```tsx
import type { Assignment } from '@prisma/client';

const CATEGORY_ORDER = ['Homework', 'Quiz', 'Test', 'Project'] as const;

function CategoryBreakdown({
  assignments,
}: {
  assignments: Assignment[];
}) {
  const rows = CATEGORY_ORDER.map((cat) => {
    const subset = assignments.filter((a) => a.category === cat);
    if (subset.length === 0) return null;
    const score = subset.reduce((s, a) => s + a.score, 0);
    const max = subset.reduce((s, a) => s + a.maxScore, 0);
    return {
      category: cat,
      score,
      max,
      percent: (score / max) * 100,
      count: subset.length,
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) return null;

  return (
    <dl className="grid gap-3">
      {rows.map((r) => (
        <div
          key={r.category}
          className="flex items-baseline justify-between"
        >
          <dt className="font-medium">{r.category}</dt>
          <dd className="text-sm text-muted-foreground tabular-nums">
            {r.score}/{r.max}
            <span className="ml-2 text-foreground">
              {r.percent.toFixed(1)}%
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default CategoryBreakdown;
```

**Design choices:**

- `<dl>` (description list) semantics: each row is a
  `<dt>`/`<dd>` pair. Category = term, breakdown = definition. More
  semantically accurate than `<ul>`.
- `tabular-nums` on the right-side cell so digits line up across
  rows vertically (same pattern as AssignmentsTable's Score).
- `text-muted-foreground` on the score fraction, `text-foreground`
  on the percent — percent is the "headline" number each row.
- No shadcn Table — simpler visual weight; reinforces summary role
  vs AssignmentsTable's primary role.
- **Returns `null` for fully-empty input** — defensive; covers the
  theoretical case of a subject with no assignments (seed has none
  but safe to handle).

## Wire-up in `/subject/[id]/page.tsx`

After the AssignmentsTable section, add:

```tsx
<section className="mt-8">
  <h2 className="text-xl font-semibold mb-4">By category</h2>
  <CategoryBreakdown assignments={subject.assignments} />
</section>
```

Plus `import CategoryBreakdown from '@/components/assignments/CategoryBreakdown';`.

**Layout:** stacked below AssignmentsTable (consistent with wu-h1q's
stacked-sections approach). Same `mt-8` gap.

## Files touched

| Path | Action | Size |
|---|---|---|
| `web/components/assignments/CategoryBreakdown.tsx` | create | ~45 lines |
| `web/app/subject/[id]/page.tsx` | modify | +5 / +1 lines (import + section) |

## Verification gates

1. **`npx tsc --noEmit`** — `Assignment` prop type, `as const` tuple
   types, type guard in `.filter`.

2. **Functional probe (ephemeral `tsx`)** — extract `CATEGORY_ORDER`
   + computation inline, verify against math_6 + writing_6 seeded
   values (table above). This is the real correctness gate — the
   math has to match hand-calculation.

3. **`npm run build`** — clean.

4. **`curl /subject/math_6`** — HTTP 200; HTML contains all 4
   category names and expected percents (`94.5`, `90.0`, `92.0`,
   `95.0`).

5. **`curl /subject/writing_6`** — HTTP 200; HTML contains 3
   category names (`Homework`, `Quiz`, `Project`); **does NOT
   contain the word `Test`** — confirms the hide-empty-category
   rule.

6. **Dev log clean.**

Grep-for-discrete-tokens lesson applied: grep `94.5`, `92.5`, etc.
individually; don't try to match `"Homework 52/55 94.5%"` as a
phrase.

## Out of scope

- Letter-grade derivation from percent → not in scope
- Weighted category computation (e.g. 40% tests + 30% quizzes) —
  the seed doesn't carry weights, and the subject's `currentPercent`
  is already an authoritative aggregate. This component shows the
  per-category breakdown, not a recomputed total.
- Side-by-side layout alternative — stacked is the approved path
  from wu-h1q.

## Commit + close

- Message: `P4: Add CategoryBreakdown component`
- Push, `bd close wu-orr`, report to `notes/wu-orr-complete.md`.
- **P4 complete** after this. Will write `notes/p4-retrospective.md`.

## No open questions

Defaults fully specified; numerical expectations written out above.
Proceeding on your ok.

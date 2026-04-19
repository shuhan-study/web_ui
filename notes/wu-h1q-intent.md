# wu-h1q — Intent (AssignmentsTable component)

## Scope

Hand-seed `components/ui/table.tsx` from 0.9.4 (same pattern as Card
in wu-32c), build `components/assignments/AssignmentsTable.tsx`, and
wire it into `app/subject/[id]/page.tsx` replacing the placeholder
`{subject.assignments.length} assignments recorded.` line. Full
verification means rendering against seeded data, so the wire-up
lands with the component.

## Sources

- **Repo + tag:** `shadcn-ui/ui @ shadcn-ui@0.9.4` (commit `729b9ec`
  — same as wu-9xz/wu-32c)
- **File:** `apps/www/registry/default/ui/table.tsx` — **117 lines**
- **URL:** https://github.com/shadcn-ui/ui/blob/shadcn-ui%400.9.4/apps/www/registry/default/ui/table.tsx
- **Peer deps:** none declared in registry-ui.ts (pure `<table>`
  wrappers + `cn()`). No `npm install` needed.
- **Exports:** `Table`, `TableHeader`, `TableBody`, `TableFooter`,
  `TableRow`, `TableHead`, `TableCell`, `TableCaption`. The top-level
  `Table` wraps in `<div className="relative w-full overflow-auto">`
  — gives horizontal scroll on mobile for free.

## Manual reference

No clean 1:1 in the manual (e-commerce didn't have an assignments-
style table). Working from the shadcn docs' Table pattern directly;
cite that in the component if someone asks later.

## Column design — 4 columns

| # | Column header | Source | Render |
|---|---|---|---|
| 1 | Assignment | `a.name` | plain text |
| 2 | Date | `a.date` | `toLocaleDateString('en-US', { month: 'short', day: 'numeric' })` → `"Feb 20"` (short form; year omitted since single term) |
| 3 | Category | `a.category` | plain text (already validated to be in the allowed set at seed time) |
| 4 | Score | `a.score`, `a.maxScore` | `"{score}/{max} ({percent}%)"` → `"28/30 (93.3%)"` |

**Why 4 columns, not 5:** readability. Percent piggybacks on Score
inline. Breakdown by category is wu-orr's component, not this
table's job.

**Ordering:** already handled by wu-1mk's `orderBy: { date: 'asc' }`
in `fetchSubjectById`. The component just maps what it's given;
zero sort logic inside.

**Score alignment:** numeric column, right-aligned
(`className="text-right"`) — standard table convention for numeric
data, makes scanning multiple rows easier.

## Component shape

```tsx
import type { Assignment } from '@prisma/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function AssignmentsTable({
  assignments,
}: {
  assignments: Assignment[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Assignment</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assignments.map((a) => {
          const percent = (a.score / a.maxScore) * 100;
          return (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {a.date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {a.category}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {a.score}/{a.maxScore}
                <span className="ml-2 text-muted-foreground">
                  ({percent.toFixed(1)}%)
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default AssignmentsTable;
```

**Classes:**
- `font-medium` on Name — light emphasis, matches SubjectCard.
- `text-muted-foreground` on Date and Category — de-emphasized so
  the eye lands on Name + Score.
- `tabular-nums` on Score cell — lines up digits vertically for
  clean column scanning.
- `text-right` on both Score header and cell.

## Wire-up in `/subject/[id]/page.tsx`

Replace:

```tsx
<p className="mt-8 text-sm text-muted-foreground">
  {subject.assignments.length} assignments recorded.
</p>
```

With:

```tsx
<section className="mt-8">
  <h2 className="text-xl font-semibold mb-4">Assignments</h2>
  <AssignmentsTable assignments={subject.assignments} />
</section>
```

Plus `import AssignmentsTable from '@/components/assignments/AssignmentsTable';`.

The `<section>` wrapper + `<h2>` heading give a natural anchor for
wu-orr's CategoryBreakdown to sit alongside (as a second section
below or beside the table).

## Files touched

| Path | Action | Size |
|---|---|---|
| `web/components/ui/table.tsx` | create (pull verbatim) | 117 lines |
| `web/components/assignments/AssignmentsTable.tsx` | create | ~48 lines |
| `web/app/subject/[id]/page.tsx` | modify | +6 / -3 lines |

## Verification gates

1. **Source-diff** `table.tsx` vs 0.9.4 registry — byte match (diff
   exit 0).
2. **`npx tsc --noEmit`** — `Assignment` prop type, Table sub-
   component types.
3. **`npm run build`** — expect `/subject/[id]` First Load JS to
   grow (Table pulled in). Modest increase.
4. **`npm run dev` + `curl /subject/math_6`** — HTTP 200. HTML
   contains:
   - `<table` element
   - Column headers: `Assignment`, `Date`, `Category`, `Score`
   - 5 assignment names (`Fractions Practice Set`, `Ratios Quiz`,
     `Unit 7 Proportions Test`, `Geometry Warm-ups`, `Data
     Collection Poster`)
   - Per-row score formats like `28/30` and `(93.3%)`
   - Categories: `Homework`, `Quiz`, `Test`, `Project`
5. **`curl /subject/cobra_choir`** — HTTP 200; table with 4 rows
   (cobra_choir has 4 assignments).
6. **Dev log clean.**

Grep-for-discrete-tokens lesson from wu-amy applied: I'll grep
`28/30` and `93.3` separately, not `"28/30 (93.3%)"`.

## Visual QA (optional)

Run dev, let user browser-verify: table layout on /subject/math_6,
dark mode, responsive (resize to mobile — should get horizontal
scroll, not overflow).

## Out of scope

- CategoryBreakdown → **wu-orr**
- Sort controls / filter UI — polish
- Back-link to /grades — polish

## Commit + close

- Message: `P4: Add AssignmentsTable (hand-seed shadcn Table)`
- Push, `bd close wu-h1q`, report to `notes/wu-h1q-complete.md`.

## Open questions

1. **Date format.** Default = short month + day ("Feb 20"). Alts:
   "2/20" (even shorter), "Feb 20, 2026" (with year), "2026-02-20"
   (ISO). Short-month-day reads best in a table. Confirm?
2. **Score cell.** `28/30 (93.3%)` vs splitting into two cells.
   Default = combined (4 columns total).
3. **Where to mount the wire-up.** Proposed as a `<section>` below
   the subject header. wu-orr can then sit either below the table
   or in a side column. OK to commit to "stacked sections" layout
   now, or want side-by-side reserved as an option?

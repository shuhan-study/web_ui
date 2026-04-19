# wu-7p6 intent — friendly empty states

## Three empty paths, three decisions

### 1. `/grades` with no subjects

Today: `grades/page.tsx:11-18` already renders `<EmptyState>` when
`subjects.length === 0`, but the heading is developer-facing:

```
No subjects yet. Run npm run seed.
```

Plan: replace copy with user-facing text. One-line edit to
`grades/page.tsx`. No component changes.

New copy: **"No subjects yet. Check back after grades are loaded."**

### 2. `/subject/[id]` — no assignments (AssignmentsTable)

Today: `AssignmentsTable.tsx:16-52` unconditionally renders the
Table with a header row and an empty TableBody when
`assignments.length === 0`. User sees column headers floating
over nothing.

Plan: add an early-return in the component — when the array is
empty, render `<EmptyState heading="No assignments yet." />`
instead of the Table. Single place of responsibility (any future
caller also gets the empty UX).

Alternative considered: render the Table shell with a single
cell saying "No assignments" spanning all columns. Rejected —
bead says "Reuse existing EmptyState", and a floating header
above a "no data" cell is visually heavier than EmptyState's
single muted line.

### 3. `/subject/[id]` — no categories (CategoryBreakdown)

Today: `CategoryBreakdown.tsx:24` already `return null` when
`rows.length === 0`. But the surrounding `<section>` in
`subject/[id]/page.tsx:25-28` still renders the h2 "By category"
with an empty content area. Ugly.

Plan: **hide the entire "By category" section** when the subject
has zero assignments. Conditional wrap in `page.tsx`. No changes
to `CategoryBreakdown.tsx` itself — its `null` return is still
defensive coverage, but the section wrapper goes away entirely
in the empty case.

Why hide instead of show an empty message: Categories are
derived from assignments. With zero assignments, the Assignments
section already shows the empty message — a second empty message
for Categories is redundant noise. Bead explicitly permits
hiding ("or hides the latter, full_stack's call").

## Scope — files touched

Three code files + two notes:

1. `web/app/grades/page.tsx` — change EmptyState heading copy
2. `web/components/assignments/AssignmentsTable.tsx` — empty
   early-return with EmptyState
3. `web/app/subject/[id]/page.tsx` — conditionally render "By
   category" section
4. `notes/wu-7p6-intent.md` + `notes/wu-7p6-completion.md`

No changes to `EmptyState.tsx`. Its current API
(`{ heading?: React.ReactNode, className?: string }`) carries
all three contexts.

## Precise diffs

### `web/app/grades/page.tsx`

Replace the current heading prop:

```tsx
<EmptyState
  heading={
    <>
      No subjects yet. Run <code>npm run seed</code>.
    </>
  }
/>
```

with:

```tsx
<EmptyState heading="No subjects yet. Check back after grades are loaded." />
```

### `web/components/assignments/AssignmentsTable.tsx`

Add import + early return at the top of the function body:

```tsx
import EmptyState from '@/components/global/EmptyState';
// ...
function AssignmentsTable({ assignments }: { assignments: Assignment[] }) {
  if (assignments.length === 0) {
    return <EmptyState heading="No assignments yet." />;
  }
  return (
    <Table>
      ...
```

### `web/app/subject/[id]/page.tsx`

Wrap the "By category" section in a conditional:

```tsx
{subject.assignments.length > 0 && (
  <section className="mt-8">
    <h2 className="text-xl font-semibold mb-4">By category</h2>
    <CategoryBreakdown assignments={subject.assignments} />
  </section>
)}
```

The "Assignments" section still renders unconditionally — it
handles its own empty state via the change above.

## Verification plan

For each empty path, use `sqlite3` on `prisma/dev.db` to
temporarily delete rows, curl/eyeball, then `npm run seed` to
restore.

### Path 1 — `/grades` empty

```bash
sqlite3 web/prisma/dev.db "DELETE FROM Assignment; DELETE FROM Subject;"
# reload localhost:3000/grades → "No subjects yet. Check back..."
npm run seed   # from web/
```

### Path 2 — `/subject/history_6` empty assignments

```bash
sqlite3 web/prisma/dev.db "DELETE FROM Assignment WHERE subjectId = 'history_6';"
# reload localhost:3000/subject/history_6 →
#   - Assignments section shows "No assignments yet."
#   - By category section hidden entirely
npm run seed
```

After each restore, one final curl/eyeball of the populated
state to confirm no regression.

## Risks / watch-fors

- **Seed script idempotency.** `npm run seed` might use upsert
  (safe) or a wipe-and-create (also safe, since I'm wiping
  first). Will check seed.ts behavior if `npm run seed` throws
  after a partial delete. If broken, fall back to full DB
  reset: `rm web/prisma/dev.db && npm run migrate && npm run seed`.
- **Subtitle data staleness on subject with zero assignments.**
  `subject.currentGrade` / `currentPercent` come from the
  Subject row (seed-computed), not from assignment totals. So
  after DELETE FROM Assignment, the subtitle "teacher · A ·
  93.5%" will still render — stale but not broken. Out of
  scope for this bead; could file as a follow-up if desired.
- **Layout shift.** Bead requires "no layout shift between
  empty and populated states". EmptyState renders `<h2
  className='mt-2 text-xl text-muted-foreground'>` — a single
  short line where the populated Table would be multi-row. The
  "shift" is from the Assignments section being short in empty
  state. That's unavoidable and the bead's definition of
  layout shift seems to be about Container/section spacing,
  not content height. I'll confirm during eyeball.

## Out of scope (confirming)

- No new seed scripts, no `seed:empty` npm command
- No EmptyState redesign / upgrade
- No animations
- No UI to create/edit data
- No fix for stale subtitle on empty-assignments subjects

## Commit plan

```
P5: Friendly empty states for /grades and /subject/[id] (no-data paths)
```

Files: `web/app/grades/page.tsx`,
`web/components/assignments/AssignmentsTable.tsx`,
`web/app/subject/[id]/page.tsx`, plus intent + completion notes.

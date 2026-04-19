# wu-7p6 completion — friendly empty states

## What shipped

Three small edits, no new components:

1. **`web/app/grades/page.tsx`** — replaced dev-facing EmptyState
   heading (`No subjects yet. Run <code>npm run seed</code>.`)
   with user-facing copy: `No subjects yet. Check back after
   grades are loaded.`
2. **`web/components/assignments/AssignmentsTable.tsx`** — added
   import + early return: when `assignments.length === 0`,
   render `<EmptyState heading="No assignments yet." />`.
   Responsibility now lives inside the component — any future
   caller gets the empty UX automatically.
3. **`web/app/subject/[id]/page.tsx`** — wrapped the "By
   category" section in `{subject.assignments.length > 0 && (
   ... )}` so the whole section (h2 + CategoryBreakdown) hides
   when there are no assignments.

Zero changes to `EmptyState.tsx` — its `{ heading, className }`
API carried all three contexts.

## Verification

Build: `npm run build` clean, route table unchanged
(`/grades` ○ Static, `/subject/[id]` ƒ Dynamic).

Per-path verification with `sqlite3 web/prisma/dev.db` DELETEs
and eyeballing the rendered DOM (not the RSC data stream):

- **/grades empty** — after `DELETE FROM Assignment; DELETE
  FROM Subject;`, rendered body:
  ```
  <h1>Grades</h1>
  <h2 class="mt-2 text-xl text-muted-foreground">
    No subjects yet. Check back after grades are loaded.
  </h2>
  ```
- **/subject/history_6 empty** — after `DELETE FROM Assignment
  WHERE subjectId = 'history_6';`, rendered body terminates
  with one section only (Assignments) containing `<h2>Assignments</h2>`
  + `<h2>No assignments yet.</h2>`. Resolved RSC tree
  terminates at `... [section], false]` — the `false` is the
  conditional evaluating to its empty branch, confirming "By
  category" is fully hidden (not just its content).
- **Populated states** — after `npm run seed`, both routes
  show real SubjectCards / AssignmentsTable / CategoryBreakdown.
  No regressions.

## What surprised me

- **"By category" string appeared twice in the curl response
  even with the section hidden.** First instance came from
  `subject/[id]/loading.tsx`'s static skeleton h2 (embedded in
  the RSC stream as the Suspense fallback). Second instance
  came from references in the CategoryBreakdown client
  module chunk. Neither was in the *rendered* DOM — they lived
  in `<script>` payloads. Grepping raw curl output for a
  string is not the same as grepping rendered HTML. Lesson I
  learned last bead (wu-901) re-confirmed here: RSC streams
  serialize fallback trees + resolved trees + module
  references, all in the one response.
- **`{condition && (<section>...)}` serializes to `false` in
  the RSC payload.** Instead of omitting the slot entirely,
  React writes a literal `false` where the children would have
  gone. Useful for debugging: `grep ,false\] ...` on a curl
  response tells you the conditional branch fired.
- **Seed's `upsert` approach survives any partial DELETE.** I
  worried about FK cascades / unique-key collisions after
  deleting assignments mid-subject. `npm run seed` just
  re-created everything cleanly — 1 term, 7 subjects, 30
  assignments. Partial DELETE → seed is a safe verification
  pattern for future empty-state work.

## Carry-forward

- **Stale subtitle on empty-assignments subject** (flagged in
  intent risks). After deleting assignments from history_6,
  the subject page still rendered `Fryer · A+ · 97.0%`
  because `currentGrade` and `currentPercent` live on the
  `Subject` row, computed at seed time — not derived at read
  time from assignments. Not broken, just stale. Worth a
  dedicated bead in P6 ("recompute subtitle stats from live
  assignments" or "zero-assignments subtitle variant"). Filing
  is overseer's call; not doing it automatically.
- **AssignmentsTable now has two visual modes** (table vs
  empty state). If a future bead wants a "partial data"
  state (some assignments but a known-incomplete term), the
  component would need a third mode. Current early-return
  branch keeps the path simple; no refactor yet.
- **CategoryBreakdown's `return null` is now redundant** for
  the zero-assignments case, since `page.tsx` no longer
  renders it in that case. Left as-is — defensive coverage if
  the component is reused elsewhere without the page.tsx
  conditional. Removing it would be an anti-pattern
  (component would crash on an empty array if any consumer
  forgot the guard).
- **sqlite3 + partial DELETE + seed** is now a known-good
  verification pattern for empty-state beads. If P6 has more
  data-shape beads, this is the tool to reach for.

## Commit

```
P5: Friendly empty states for /grades and /subject/[id] (no-data paths)
```

Files: `web/app/grades/page.tsx`,
`web/app/subject/[id]/page.tsx`,
`web/components/assignments/AssignmentsTable.tsx`,
`notes/wu-7p6-intent.md`, `notes/wu-7p6-completion.md`.

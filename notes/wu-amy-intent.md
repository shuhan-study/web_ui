# wu-amy — Intent (Dynamic route /subject/[id])

## Scope

Create `web/app/subject/[id]/page.tsx` — async server component that
calls `fetchSubjectById(params.id)` (from wu-1mk), renders a minimal
subject-detail placeholder, and 404s via `notFound()` on unknown IDs.
First bead where the SubjectCard links from wu-32c actually land on
a working route.

**Deferred:** AssignmentsTable (wu-h1q), CategoryBreakdown (wu-orr),
custom `not-found.tsx` (polish).

## Manual reference

| Section | Lines | Usage |
|---|---|---|
| Single Product - Page | 1467+ | Pattern for dynamic-route server component with `params`. |

## Next 14 specifics

- **Dynamic route file:** `app/subject/[id]/page.tsx` — `[id]`
  bracket syntax binds the segment to `params.id`.
- **Props shape:** `{ params: { id: string } }`. Next 14.2 passes
  `params` synchronously (Next 15 migrates to async Promise; we're
  on 14.2.35 per PLAN.md tech stack pin).
- **404 path:** `import { notFound } from 'next/navigation'` +
  `notFound()` call throws; Next renders the default 404 page (or a
  `not-found.tsx` if one exists in scope). No custom 404 file for
  this bead — default works.
- **Rendering mode:** dynamic routes without `generateStaticParams`
  render on-demand at request time by default — so `/subject/[id]`
  auto-gets the "fresh DB read per request" behavior `/grades`
  lacked. No `export const dynamic = 'force-dynamic'` needed.

## Component

```tsx
import { notFound } from 'next/navigation';
import { fetchSubjectById } from '@/utils/actions';

export default async function SubjectPage({
  params,
}: {
  params: { id: string };
}) {
  const subject = await fetchSubjectById(params.id);
  if (!subject) notFound();

  return (
    <>
      <h1 className="text-3xl font-semibold">{subject.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {subject.teacher} · {subject.currentGrade} ·{' '}
        {subject.currentPercent.toFixed(1)}%
      </p>
      <p className="mt-8 text-sm text-muted-foreground">
        {subject.assignments.length} assignments recorded.
      </p>
    </>
  );
}
```

**Design notes:**

- **Header format** (`{teacher} · {grade} · {percent}%`) mirrors the
  SubjectCard's data but in a horizontal row for the detail page's
  wider layout.
- **Assignment count line** is a placeholder that confirms the
  relation fetch worked without pre-empting wu-h1q's table design.
  wu-h1q replaces this `<p>` with `<AssignmentsTable assignments={subject.assignments} />`.
- **No `return subject` or explicit cast** after `notFound()` —
  TypeScript narrows the type because `notFound()` returns `never`.

## Files touched

| Path | Action | Size |
|---|---|---|
| `web/app/subject/[id]/page.tsx` | create | ~22 lines |

Zero other changes (SubjectCard already points here from wu-32c).

## Verification gates

1. **`npx tsc --noEmit`** — validates `params: { id: string }` shape,
   `notFound()` narrowing, and Prisma `Assignment[]` shape through
   `subject.assignments.length`.

2. **`npm run build`** — `/subject/[id]` should appear in the route
   manifest as **`ƒ`** (dynamic on-demand), NOT `○` (static).
   Confirms Next auto-picked dynamic rendering without
   `generateStaticParams`.

3. **`npm run dev` + `curl /subject/math_6`** — HTTP 200. HTML
   contains:
   - `Math 6` (subject name as `<h1>`)
   - `Angeloni` (teacher)
   - `A` (current letter grade)
   - `94.0%` (current percent with `.toFixed(1)`)
   - `5 assignments recorded.`

4. **`curl /subject/bogus`** — HTTP 404. Confirms `notFound()` path
   works.

5. **No hydration/console warnings** in dev log.

6. **Visual eyeball (optional)** — user browser: click "Math 6" card
   on `/grades` → lands on `/subject/math_6` with placeholder; click
   back; dark mode still works on detail page; try typing
   `/subject/nope` manually → 404 page.

## Out of scope

- AssignmentsTable → **wu-h1q**
- CategoryBreakdown → **wu-orr**
- Custom `not-found.tsx` → polish bead
- Breadcrumbs / back-link — polish

## Commit + close

- Message: `P4: Add /subject/[id] dynamic route scaffold`
- Push, `bd close wu-amy`, report to `notes/wu-amy-complete.md`.

## No open questions

Scope is narrow and mirrors wu-dw9's pattern (async server component
+ minimal render). Proceeding on your ok.

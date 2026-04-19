# wu-dw9 — Intent (Fetch subjects from DB)

## Scope

Flip `/grades` from wu-578's static placeholder to a server component
that fetches all Subjects from Prisma and renders them as a minimal
name list. **No card component** (wu-32c), **no responsive grid**
(wu-88w), **no polished EmptyState** (wu-noz — inline placeholder
string only for this bead).

First bead to exercise `utils/db.ts` as load-bearing — the P2
retrospective flagged this.

## Manual references

| Section | Lines | Usage |
|---|---|---|
| FetchFeaturedProducts and FetchAllProducts | 800–822 | Pattern for `utils/actions.ts` with `db.subject.findMany()`. Rename Products → Subjects, drop `featured` filter (not applicable), drop `createdAt` orderBy (our schema doesn't have createdAt — use `name` asc). |
| FeaturedProducts Component | 825–843 | Pattern for async server component calling the fetch + branching on `.length === 0`. Mirrors without EmptyList/SectionTitle/Grid (those are later beads). |
| Home Page | 747–762 | Pattern for a page rendering the fetched component. |

## Design points

### D1. File location — `web/utils/actions.ts`

Manual convention. A bit of a misnomer (these are queries, not Next
server actions), but keeping naming consistent with the manual
simplifies future bead recon.

### D2. Fetch shape — `fetchAllSubjects()`

```ts
import db from '@/utils/db';

export const fetchAllSubjects = () => {
  return db.subject.findMany({
    orderBy: { name: 'asc' },
  });
};
```

**`orderBy: { name: 'asc' }`** — deterministic alphabetical. Seed
insertion order isn't a SQL guarantee; ordering explicitly avoids
surprises later.

**No `include` for assignments** — P4's subject-detail page fetches
those. Keeping wu-dw9's fetch small keeps the grid's initial render
light.

**No `include: { term: true }`** — grades page doesn't surface term
info yet. Can add in a polish bead if needed.

### D3. Return type

Prisma 5.22 infers the return as `Promise<Subject[]>` from the schema.
`Subject` is imported from `@prisma/client` where needed (probably in
wu-32c for the card's prop type, not here).

### D4. Page component — async server component

```tsx
import { fetchAllSubjects } from '@/utils/actions';

export default async function GradesPage() {
  const subjects = await fetchAllSubjects();

  return (
    <>
      <h1 className="text-3xl font-semibold">Grades</h1>
      {subjects.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No subjects yet. Run <code>npm run seed</code>.
        </p>
      ) : (
        <ul className="mt-4 space-y-1">
          {subjects.map((s) => (
            <li key={s.id}>
              <span className="font-medium">{s.name}</span>
              <span className="text-muted-foreground"> — {s.teacher}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
```

**Minimal render** — one `<li>` per subject with name + teacher. Gets
replaced by `<SubjectCard>` in wu-32c and wrapped in grid by wu-88w.
Enough signal to validate the fetch works end-to-end without
pre-empting the cards bead's design.

**No `'use client'`** — this is a Server Component. `async function`
+ Prisma call in the module is standard Next 14 App Router pattern.

### D5. Empty-state placeholder — one inline paragraph

Rendered only when `subjects.length === 0`. Replaced by wu-noz's
dedicated `<EmptyState>` component. Keeping an inline version now so
this bead is verifiable against an empty DB without depending on
wu-noz.

## Files touched

| Path | Action | Size |
|---|---|---|
| `web/utils/actions.ts` | create | ~10 lines |
| `web/app/grades/page.tsx` | replace | ~25 lines |

No schema, migration, or package.json changes.

## Verification gates

1. **`npx tsc --noEmit`** — catches any Prisma-client type mismatch
   (e.g. if `subject` isn't a known model because `prisma generate`
   didn't run, or if we typoed a field name).

2. **`npm run build`** — confirms Next's static/dynamic analysis
   accepts the async server component and the Prisma import at build
   time.

3. **`npm run dev` + `curl /grades`** — HTTP 200 with HTML containing
   all 7 seeded subject names (Math 6, Writing 6, Reading 6, History
   6, Science 6, P.E. 6, Cobra Choir). Navbar + Container still wrap
   the page via layout.

4. **Empty-state check (optional, quick)** — rename
   `web/prisma/dev.db` → `.bak`, start dev server, expect either the
   empty-state `<p>` or a graceful error. Restore after. **Flag:**
   hitting the DB on every page render in dev means a missing db file
   may surface as a 500, not a nice empty state. If so, document and
   move on — wu-noz will handle the empty path more gracefully.

5. **No hydration warnings** — inspect dev log after GET /grades.

## Out of scope

- `<SubjectCard>` component → **wu-32c**
- Responsive grid → **wu-88w**
- Polished `<EmptyState>` component → **wu-noz**
- Subject detail page / assignments fetch → P4 (not yet filed)
- Adding Term / Student info to the grades page header → future polish

## Commit + close

- Message: `P3: Fetch subjects from DB on /grades`
- Push, `bd close wu-dw9`, report to `notes/wu-dw9-complete.md`.

## Open questions for approval

1. **`utils/actions.ts` vs `utils/queries.ts`** — manual says actions,
   but these are pure reads. Confirm manual-aligned (`actions.ts`)?
2. **orderBy** — `name: 'asc'` (alphabetical) vs `currentPercent:
   'desc'` (best-to-worst) vs no order. Default = alphabetical.
3. **Empty-state messaging** — "No subjects yet. Run `npm run seed`"
   works for single-dev local; if we ever ship this somewhere the
   "run seed" advice becomes nonsense. Small issue, deferring to
   wu-noz which will design this properly. Confirm placeholder
   phrasing is fine for now?

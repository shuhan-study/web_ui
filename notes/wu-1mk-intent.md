# wu-1mk — Intent (fetchSubjectById)

## Scope

Add one function to `web/utils/actions.ts`: `fetchSubjectById(id)`.
Returns a Subject + its assignments (date-ascending) or `null` on
not-found. Pure data-layer addition; no route, no component, no
render.

## Manual reference

| Section | Lines | Usage |
|---|---|---|
| Single Product - Setup | 1365–1381 | `findUnique({ where: { id } })` pattern. |

**Divergence from manual:**
- Manual calls `redirect('/products')` on not-found; we return `null`
  and let the caller (wu-amy) call Next's `notFound()` for an
  idiomatic 404 page. Bead acceptance matches (returns null).
- Manual doesn't include child relations (Product had none in scope).
  We add `include: { assignments: { orderBy: { date: 'asc' } } }`.

## Function

```ts
export const fetchSubjectById = (id: string) => {
  return db.subject.findUnique({
    where: { id },
    include: {
      assignments: {
        orderBy: { date: 'asc' },
      },
    },
  });
};
```

`findUnique` returns `T | null` natively — no explicit null-check or
throw. Prisma infers the return type as
`Promise<(Subject & { assignments: Assignment[] }) | null>`, giving
callers full typing without manual annotation.

## Design notes

- **Why `findUnique` not `findFirst`:** `id` is a primary key; the
  compiler enforces unique-field constraint on the `where` clause,
  catching typos at build time.
- **Why `orderBy: date asc`:** assignments will render in a table;
  chronological (oldest first) is the natural reading order for a
  term's progression. Matches the P3 "name asc" precedent of
  deterministic ordering.
- **Why not nested orderBy on something else:** P4 bead 4
  (CategoryBreakdown) sums across all assignments regardless of
  order — so grouping within the list is purely presentational.
  Date-ascending is the one order that serves both the table and any
  future "recent activity" view.

## Files touched

| Path | Action | Size |
|---|---|---|
| `web/utils/actions.ts` | modify | +10 lines (one function) |

## Verification gates

1. **`npx tsc --noEmit`** — catches relation-type mismatches (e.g.
   if `Assignment` isn't linked to Subject, or the `date` field
   doesn't exist).
2. **Functional probe (ephemeral `npx -y tsx -e`)** — call the
   function three ways against the seeded DB:
   - `fetchSubjectById('math_6')` → expect non-null; `assignments.length === 5`; first assignment's `date` is `<=` last's.
   - `fetchSubjectById('bogus')` → expect `null`.
   - Verify the returned Subject has the right fields (e.g.
     `currentGrade === 'A'` for math_6).
3. **`npm run build`** — confirms the util compiles when pulled into
   Next's build graph (even though it's not yet imported from any
   route).

## Out of scope

- Route consumption → **wu-amy**
- Error boundary for DB failures → not wu-1mk's job
- Caching / revalidation hints → polish bead

## Commit + close

- Message: `P4: Add fetchSubjectById to utils/actions.ts`
- Push, `bd close wu-1mk`, report to `notes/wu-1mk-complete.md`.

## No open questions

Short bead, defaults are obvious. Proceeding on your ok.

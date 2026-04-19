# wu-32c — Intent (SubjectCard component)

## Scope

Ship `web/components/subjects/SubjectCard.tsx`, plus hand-seed
`web/components/ui/card.tsx` from shadcn 0.9.4 (same pattern as
wu-9xz). **Do not wire into `/grades`** — that's wu-88w's job (grid
+ replacement of the current `<ul>` render). This bead ships the
component in isolation; verification is TypeScript + build, no
visual render.

## Manual reference

| Section | Lines | Usage |
|---|---|---|
| ProductsGrid | 874–925 | Pattern for `<article><Link><Card><CardContent>…</CardContent></Card></Link></article>`. Renaming Product→Subject; **dropping** image (no subject images), favorite button (not in rig scope), and price (replaced with grade + percent display). |

## Source — Card primitive

- **Repo + tag:** `shadcn-ui/ui @ shadcn-ui@0.9.4` (commit `729b9ec`
  — same as wu-9xz)
- **File:** `apps/www/registry/default/ui/card.tsx` — **79 lines**
- **URL:** https://github.com/shadcn-ui/ui/blob/shadcn-ui%400.9.4/apps/www/registry/default/ui/card.tsx
- **Peer deps:** none declared in registry-ui.ts (pure `<div>` wrappers
  + `cn()`). No `npm install` needed for wu-32c.
- **Exports:** `Card`, `CardHeader`, `CardTitle`, `CardDescription`,
  `CardContent`, `CardFooter`.

## Design — `SubjectCard.tsx`

```tsx
import type { Subject } from '@prisma/client';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function SubjectCard({ subject }: { subject: Subject }) {
  return (
    <article className="group">
      <Link href={`/subject/${subject.id}`}>
        <Card className="transition-shadow group-hover:shadow-xl">
          <CardHeader>
            <CardTitle>{subject.name}</CardTitle>
            <CardDescription>{subject.teacher}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold">
                {subject.currentGrade}
              </span>
              <span className="text-sm text-muted-foreground">
                {subject.currentPercent.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </article>
  );
}

export default SubjectCard;
```

**Design choices:**

- **Prop type: `Subject` from `@prisma/client`.** Fully-typed; any
  field rename on the schema side fails fast at compile time in this
  component.
- **Link target: `/subject/${subject.id}`.** That route doesn't exist
  yet (P4 scope). Clicking a card in wu-88w's grid will 404 until
  P4. Acceptable — the hover affordance is still meaningful, and the
  href makes P4's wiring trivial.
- **No image.** Manual's Product grid shows an `<Image>`; subjects
  don't have images. Saves a column of layout work + skips the
  `next.config.mjs` remotePatterns edit.
- **`currentPercent.toFixed(1)`** — one decimal place (e.g. `94.3%`,
  `86.3%`). Seed already uses at-most-one decimal. Prisma stores Float
  so trailing zeros are not an issue (`94.0.toFixed(1)` → `"94.0"`).
- **Hover shadow** — `group-hover:shadow-xl transition-shadow`
  matches manual's interaction pattern.
- **No absolute-positioned buttons.** The manual has a favorite
  toggle in the top-right corner; we have no analogous UI element
  in scope.

## Files touched

| Path | Action | Size |
|---|---|---|
| `web/components/ui/card.tsx` | create (pull verbatim) | 79 lines |
| `web/components/subjects/SubjectCard.tsx` | create | ~34 lines |

No changes to `/grades`, `utils/actions.ts`, `schema.prisma`,
`package.json`.

## Verification gates

1. **Source-diff card.tsx vs 0.9.4 registry** — `gh api ... | base64
   -d | diff - web/components/ui/card.tsx` → exit 0 (byte match).
   Same gate pattern as wu-9xz.
2. **`npx tsc --noEmit`** — catches Prisma `Subject` import
   mismatches, Card prop-type errors, etc.
3. **`npm run build`** — confirms Next can analyze the component (even
   though it's not used from any route yet — if it's unreachable, Next
   won't tree-shake broken imports; they'd surface when wu-88w wires
   it. Build still validates syntax + types.)
4. **Visual check** — deferred to wu-88w when the card actually
   renders on `/grades`.

## Out of scope

- Wiring SubjectCard into `/grades` → **wu-88w**
- Responsive grid → **wu-88w**
- EmptyState component → **wu-noz**
- `/subject/[id]` route (referenced by Link) → **P4**

## Commit + close

- Message: `P3: Add SubjectCard component (hand-seed shadcn Card)`
- Push, `bd close wu-32c`, report to `notes/wu-32c-complete.md`.

## Open questions for approval

1. **Percent formatting** — `.toFixed(1)` gives `"94.0%"` for integer
   percents. Alternatives: `.toFixed(0)` (drop decimal for integers,
   inconsistent), or conditional (`Number.isInteger(n) ? n : n.toFixed(1)`).
   Default = `.toFixed(1)`, consistent.
2. **Grade letter typography** — `text-4xl font-bold`. That's a
   mid-size display value. Alternative: `text-3xl` or `text-5xl`.
   Default = `text-4xl`.
3. **Link navigation** — currently points at `/subject/${id}` which
   will 404 until P4. OK to ship the dead-ended link, or prefer a
   non-clickable card for this bead and add the Link wrapper in P4?

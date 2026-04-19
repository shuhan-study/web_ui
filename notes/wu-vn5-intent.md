# wu-vn5 intent — not-found.tsx + error.tsx

## Path correction up front

Bead describes files as `web/src/app/not-found.tsx` and
`web/src/app/error.tsx`, but this project has no `src/` layer —
actual app router lives at `web/app/`. Alias `@/` resolves to
`web/`. I'll file under `web/app/` and note the bead description
discrepancy in the completion report.

## Scope

Two files, both under `web/app/`:

1. `web/app/not-found.tsx` — Server Component (default, no
   `'use client'`)
2. `web/app/error.tsx` — **Client** Component (`'use client'` at
   top, receives `{ error, reset }`)

No changes to `layout.tsx`, no new components in `components/`,
no global-error.tsx (explicitly deferred to P6 per bead).

## Style mirrors — what I'm copying from existing pages

From `app/grades/page.tsx` and `app/subject/[id]/page.tsx`:

- Top-level `<h1 className="text-3xl font-semibold">` for the page
  heading.
- A muted subtitle using `text-sm text-muted-foreground` (used on
  subject page for teacher/grade line).
- Don't wrap in `<Container>` — layout.tsx already wraps all
  children. Emit a fragment / plain JSX, same as grades and
  subject pages do.
- Stack sections with `mt-8` if there's more than one block.

I will **not** import `EmptyState` — it's sized for inline "no
items" fallbacks (small muted h2), not a full-page 404. I'll
match its typographic intent (muted tone) without reusing the
component. Bead says "where they fit"; here it doesn't fit.

## File 1: `web/app/not-found.tsx`

```tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      <h1 className="text-3xl font-semibold">Not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        That page doesn't exist.
      </p>
      <p className="mt-8">
        <Link href="/grades" className="underline">
          Back to grades
        </Link>
      </p>
    </>
  );
}
```

Notes:
- Server Component (no `'use client'`, no state, no event handlers).
- Plain `next/link` with `underline` class — no shadcn Button,
  because it's a navigation link, not an action.
- Catches both `notFound()` calls (already used in
  `subject/[id]/page.tsx:12`) AND any unmatched URL.

## File 2: `web/app/error.tsx`

```tsx
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <h1 className="text-3xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        An unexpected error occurred.
      </p>
      <div className="mt-8">
        <Button onClick={reset}>Try again</Button>
      </div>
    </>
  );
}
```

Notes:
- `'use client'` is mandatory (Next 14 requires error boundaries
  to be client components — they use `reset` as a callback).
- `useEffect` with `[error]` dependency so re-renders with the
  same error don't re-log.
- shadcn `<Button>` for the action (it's a button, not a link).
- Export named `Error` is idiomatic for Next's convention; the
  local name shadows the global `Error` type only inside this
  module, which is fine — `Error & { digest?: string }` in the
  props annotation resolves against the global before the local
  declaration takes effect (standard TS hoisting, same pattern
  the Next docs use).

## Acceptance walk-through (what I'll verify)

1. `curl localhost:3000/subject/nonexistent-id` → renders custom
   404 (currently `notFound()` is called at
   `subject/[id]/page.tsx:12`).
2. `curl localhost:3000/totally-fake-route` → same custom 404.
3. Error boundary: temporarily add `throw new Error('test')` to a
   Server Component (probably `grades/page.tsx` behind a flag I'll
   revert), confirm the rig-styled error UI renders and "Try
   again" clears the error when the throw is removed. Revert the
   throw before committing.
4. Run `npm run build` — both files should appear in the build
   output as part of the app shell, no type errors.

## Out of scope — confirming I'll skip

- `global-error.tsx` — deferred to P6 per bead
- Sentry / remote error reporting
- Toast notifications
- Any redesign of `EmptyState` or `Container`

## Risks / things to watch

- The local `Error` identifier shadowing the global. If TS
  complains, I'll rename the function to `ErrorBoundary` (Next
  only cares about the default export, not the local name).
- Port 3000 might still be held by a zombie dev server from P4
  (p4-retrospective.md:34). Before the curl checks I'll run
  `lsof -i :3000` and pre-kill if stale.

## Commit plan

Single commit at the end:
```
P5: Add root not-found.tsx and error.tsx
```
Files staged: `web/app/not-found.tsx`, `web/app/error.tsx`.
No other files should change.

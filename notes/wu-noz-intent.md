# wu-noz — Intent (EmptyState component)

## Scope

Create `web/components/global/EmptyState.tsx` and swap the inline
`<p>` fallback in `/grades` for it. Closes P3.

## Manual reference

| Section | Lines | Usage |
|---|---|---|
| EmptyList Component | 782–798 | Template shape: `heading` prop with default, `className` prop, single `<h2>` render using `cn()`. |

## Divergences from manual

| Manual | Ours | Why |
|---|---|---|
| `function EmptyList` (name) | `EmptyState` | Bead title uses "EmptyState"; more modern React convention; easier to recognize vs "List". |
| `heading?: string` | `heading?: React.ReactNode` | Our default heading includes a `<code>` element ("Run `npm run seed`"). A `ReactNode` type accepts plain strings too, so no regression for simple callers. |
| `text-xl` only | `mt-2 text-xl text-muted-foreground` | Slightly muted for gentler visual weight as a non-error empty state. Still manual-adjacent. |

## Component

```tsx
import { cn } from '@/lib/utils';

function EmptyState({
  heading = 'No items found.',
  className,
}: {
  heading?: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn('mt-2 text-xl text-muted-foreground', className)}>
      {heading}
    </h2>
  );
}

export default EmptyState;
```

## `grades/page.tsx` edit

Current inline:

```tsx
{subjects.length === 0 ? (
  <p className="mt-2 text-sm text-muted-foreground">
    No subjects yet. Run <code>npm run seed</code>.
  </p>
) : ( … )}
```

Replace with:

```tsx
{subjects.length === 0 ? (
  <EmptyState
    heading={
      <>
        No subjects yet. Run <code>npm run seed</code>.
      </>
    }
  />
) : ( … )}
```

Plus `import EmptyState from '@/components/global/EmptyState';`.

## Files touched

| Path | Action | Size |
|---|---|---|
| `web/components/global/EmptyState.tsx` | create | ~17 lines |
| `web/app/grades/page.tsx` | modify | +5 / -3 lines |

## Verification gates

1. **`npx tsc --noEmit`** — `heading: ReactNode` type, `cn()` call,
   import paths.
2. **`npm run build`** — clean.
3. **`npm run dev` + `curl /grades`** — HTTP 200; still renders the
   seeded grid (non-empty path). Bundle size should be nearly
   unchanged (EmptyState is tiny + only in the unreachable branch).
4. **Empty-state render check** — temporarily rename
   `web/prisma/dev.db` → `.bak`, restart dev, curl `/grades`.
   Expectation:
   - EITHER HTTP 200 with HTML containing "No subjects yet. Run"
     and `<code>npm run seed</code>` (if Prisma silently returns
     empty array on missing DB);
   - OR HTTP 500 from Prisma's "file not found" error (if Prisma
     errors instead of returning empty).

   If it's the latter, wu-noz only handles the "seeded DB with zero
   subjects" case cleanly. The "DB file missing entirely" case is a
   different failure mode — might want a future bead for graceful
   error handling. Will report whichever behavior we get; revert
   either way.

## Out of scope

- Error boundary for "DB file missing entirely" — separate concern
  (Next error.tsx, try/catch in fetchAllSubjects, etc.). File as
  follow-up if Gate 4 shows it's needed.
- P4 (subject detail page) using EmptyState for empty assignment
  lists — the component is generic enough; callers will just pass
  their own heading.

## Commit + close

- Message: `P3: Add EmptyState component; replace inline grades empty fallback`
- Push, `bd close wu-noz`, report to `notes/wu-noz-complete.md`.
- **P3 complete** after this. Will write `notes/p3-retrospective.md`
  per P2 pattern.

## No open questions

Manual-aligned with minimal divergences already documented. Proceeding
on your ok.

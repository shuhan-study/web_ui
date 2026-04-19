# wu-dte intent — static /about page + navbar link

## Recon surprise — there's no existing nav-link convention

Current `web/components/navbar/Navbar.tsx` renders two things:
- `<Logo />` — shadcn icon Button linking to `/`
- `<DarkMode />` — shadcn icon Button theme toggle

**No text links anywhere.** `/grades` is not reachable from the
navbar today; users must type `/grades` in the URL bar or
click from the root landing (which itself is a placeholder
with no link either). The bead says "Active-state on the link
matches existing nav conventions" — there are no such
conventions to match.

I'll set a new convention with this bead and flag it. If a
future bead adds a `Grades` / `Home` link, it'll reuse the
pattern I set here.

## Scope — what I'll touch

1. **`web/app/about/page.tsx`** (new) — static Server
   Component, plain text copy.
2. **`web/components/navbar/NavLink.tsx`** (new) — small Client
   Component that applies an active className based on
   `usePathname()`. Reusable if more links land later.
3. **`web/components/navbar/Navbar.tsx`** — add `<NavLink
   href="/about">About</NavLink>` in the existing right-side
   flex group (next to DarkMode), before DarkMode.
4. Intent + completion notes.

## Why a separate NavLink component

Navbar today is a Server Component. `usePathname()` requires
a Client Component. Cheapest change is a dedicated, minimal
`NavLink` — not a full Navbar-to-Client conversion, which
would drag Logo + DarkMode into the client bundle for no
reason.

Bead says "no new components" but that's clearly scoped to
the about page copy ("No new components; plain JSX + existing
Tailwind utilities"). The navbar-link bullet is a separate
bullet with no such constraint. A focused NavLink is the
smallest correct piece.

## File 1: `web/app/about/page.tsx`

```tsx
export default function AboutPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold">About</h1>
      <p className="mt-4">
        This is Shuhan&apos;s grade tracker — a place where the
        family can follow her progress at school.
      </p>
      <p className="mt-4">
        It shows her current grades, recent assignments, and how
        she&apos;s doing in each subject.
      </p>
      <p className="mt-4">
        Grades are updated by family members from Aeries. This
        tool is for family use only.
      </p>
    </>
  );
}
```

Copy refinements from the bead baseline:
- Dropped "middle school" → "at school" (age-future-proof;
  student level is in the seed, may change).
- Changed "a place for the family to see" → "a place where the
  family can follow" (reads slightly warmer to me).
- Otherwise identical.

Spacing: `mt-4` between paragraphs. Not `mt-8` (too sparse for
three short paragraphs), not `mt-2` (`mt-2` is reserved for
subtitle-under-h1 pattern; this is body copy).

No subtitle, no muted copy, no sections — page is three
sentences plus a heading.

## File 2: `web/components/navbar/NavLink.tsx`

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={cn(
        'text-sm font-medium transition-colors hover:text-foreground',
        isActive ? 'text-foreground' : 'text-muted-foreground'
      )}
    >
      {children}
    </Link>
  );
}

export default NavLink;
```

Styling rationale:
- `text-sm font-medium` matches shadcn's nav-link pattern
  (same weight/size used in the Button/input variants).
- Inactive = `text-muted-foreground`, active = `text-foreground`.
  Hover lifts to `text-foreground` regardless. This is the
  canonical shadcn nav idiom.
- `transition-colors` for smoothness.
- Exact-match active (`pathname === href`). A more permissive
  `pathname.startsWith(href)` would be wrong for `/about` vs
  `/about/x` (no child routes today, but better behavior on
  principle).

## File 3: `web/components/navbar/Navbar.tsx` — one-line add

Current right-side group:
```tsx
<div className='flex gap-4 items-center'>
  <DarkMode />
</div>
```

Change to:
```tsx
<div className='flex gap-4 items-center'>
  <NavLink href='/about'>About</NavLink>
  <DarkMode />
</div>
```

Plus the `import NavLink from './NavLink';` at the top.

I'm putting About *before* DarkMode so nav-link text sits left
of the utility toggle. Matches common Western reading-order
conventions (content nav, then preferences).

## Acceptance walk-through

1. `npm run build` clean. Route output: `○ /about` appears as
   Static. Existing routes unchanged.
2. curl `/about` → HTML contains `<h1>About</h1>` and all three
   paragraphs.
3. curl `/grades`, `/subject/history_6` → still work, no
   regression from adding NavLink to the Navbar.
4. Dev server + browser:
   - Click About from `/grades` → lands on `/about`, About
     link goes active (foreground color).
   - Click back to `/grades` → About returns to muted state.
   - Typography / spacing on /about matches other pages.

## Risks / things to watch

- **Layout shift when About becomes the first nav link.**
  Adding a new flex item to the right group could reflow the
  navbar on narrow widths. Current nav uses
  `flex-col sm:flex-row sm:justify-between flex-wrap gap-4`.
  Should handle fine — on mobile it stacks vertically, on
  desktop it lays out inline. Will eyeball.
- **Client bundle cost of NavLink.** `'use client'` pulls
  `next/navigation` + React into the client bundle for this
  component. Cost is negligible (~ few KB), but worth
  flagging.
- **Pronoun / name in copy.** The about page names "Shuhan"
  explicitly. That's intentional (family-voiced, per bead
  baseline). No concern, just noting.

## Out of scope (confirming)

- **No `Grades` / `Home` nav link.** Stays out of scope. Will
  flag as a possible follow-up in completion notes.
- No contact form, no version info, no mailto, no analytics.
- No icon on the About link.
- No mobile-menu drawer; current responsive stacking is fine
  for three items.

## Commit plan

```
P5: Add static /about page with navbar link
```

Files: `web/app/about/page.tsx`,
`web/components/navbar/NavLink.tsx`,
`web/components/navbar/Navbar.tsx`,
`notes/wu-dte-intent.md`,
`notes/wu-dte-completion.md`.

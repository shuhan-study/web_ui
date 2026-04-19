# wu-9xz — Final Intent (HS: hand-seed, Radix era)

## Scope

Add Navbar with Logo + DarkMode toggle to the app, seeding the required
shadcn UI primitives (Button, DropdownMenu) by hand from the pre-rename
shadcn-ui registry. No shadcn CLI invocations. Mount Navbar + wrap
children in `<Container>` per the manual's layout pattern.

---

## Canonical sources

All copies pulled from **shadcn-ui/ui @ tag `shadcn-ui@0.9.4`**
(commit `729b9ec8cacfae0bc31958c1a8e425d0a21be54e`). Latest pre-rename
tag; still Radix + hsl + tailwindcss-animate. Post-this, the repo
migrated to base-ui / lucide / oklch.

| Purpose | Source path at tag | URL |
|---|---|---|
| Button component | `apps/www/registry/default/ui/button.tsx` | https://github.com/shadcn-ui/ui/blob/shadcn-ui%400.9.4/apps/www/registry/default/ui/button.tsx |
| DropdownMenu component | `apps/www/registry/default/ui/dropdown-menu.tsx` | https://github.com/shadcn-ui/ui/blob/shadcn-ui%400.9.4/apps/www/registry/default/ui/dropdown-menu.tsx |
| Tailwind config template | `packages/shadcn/src/utils/templates.ts` → `TAILWIND_CONFIG_TS_WITH_VARIABLES` (lines 174–253) | https://github.com/shadcn-ui/ui/blob/shadcn-ui%400.9.4/packages/shadcn/src/utils/templates.ts#L174-L253 |
| Slate hsl tokens (light + dark) | `apps/www/registry/registry-base-colors.ts` → `slate` entry (lines 66–130) | https://github.com/shadcn-ui/ui/blob/shadcn-ui%400.9.4/apps/www/registry/registry-base-colors.ts#L66-L130 |
| globals.css structural wrapper | `apps/www/styles/globals.css` | https://github.com/shadcn-ui/ui/blob/shadcn-ui%400.9.4/apps/www/styles/globals.css |
| Peer-dep versions (era-contemporary) | `apps/www/package.json` at same tag | https://github.com/shadcn-ui/ui/blob/shadcn-ui%400.9.4/apps/www/package.json |

Manual sources (for components authored from the manual, not shadcn):

| Component | Manual lines |
|---|---|
| Navbar.tsx (simplified) | `building_manual_4g-store.md` lines 110–133 |
| Logo.tsx (verbatim) | lines 161–178 |
| DarkMode.tsx (with icon swap) | lines 309–350 |

---

## The lucide-react nudge — manual divergence

The 0.9.4 `dropdown-menu.tsx` source itself imports `Check`, `ChevronRight`,
`Circle` from **`lucide-react`** — not `@radix-ui/react-icons`. So HS
already requires `lucide-react` to be installed regardless of what icons
our own DarkMode uses.

Given that, we translate the manual's DarkMode `MoonIcon, SunIcon` from
`@radix-ui/react-icons` → `Moon, Sun` from `lucide-react` (same swap
Intent-TL would perform). Rationale: one icon library instead of two,
and the class names (`h-[1.2rem] w-[1.2rem] rotate-0 scale-100 …`) work
identically against both libraries.

**Net:** drop `@radix-ui/react-icons` from HS's dep list. DarkMode
divergence from manual: two import lines change, no visual difference.

---

## File list + line counts

| # | Path | Action | Approx lines | Source |
|---|---|---|---|---|
| 1 | `web/components/ui/button.tsx` | create | 56 | 0.9.4 registry, verbatim |
| 2 | `web/components/ui/dropdown-menu.tsx` | create | 200 | 0.9.4 registry, verbatim |
| 3 | `web/components/navbar/Logo.tsx` | create | ~18 | manual 161–178 (drop unused `LuArmchair` import line 164) |
| 4 | `web/components/navbar/DarkMode.tsx` | create | ~42 | manual 309–350 with icon swap (see above) |
| 5 | `web/components/navbar/Navbar.tsx` | create | ~20 | manual 110–133, simplified: keep Logo + DarkMode, drop `LinksDropdown`, `NavSearch`, `CartButton` (not in scope until later phases) |
| 6 | `web/app/globals.css` | replace | ~85 | header from 0.9.4 `apps/www/styles/globals.css` (@tailwind + @layer base wrappers); hsl token values from `slate` entry of `registry-base-colors.ts`; trailing `* { @apply border-border }` + `body { @apply bg-background text-foreground }` block from same globals.css |
| 7 | `web/tailwind.config.ts` | replace | ~70 | `TAILWIND_CONFIG_TS_WITH_VARIABLES` template, verbatim, with placeholders resolved (`extension`→`ts`, `prefix`→`""`) |
| 8 | `web/app/layout.tsx` | modify (~5 lines) | — | add `<Navbar />` above children; wrap `{children}` in `<Container className='py-20'>` per manual line 145; keep wu-eix's `suppressHydrationWarning` + `<Providers>` |

No changes to wu-eix's `web/app/providers.tsx`, `web/app/theme-provider.tsx`,
`web/lib/utils.ts`, or `web/components/global/Container.tsx`.

---

## Deps to install (pinned to 0.9.4 era)

Versions pulled from `apps/www/package.json` at the tag (authoritative
contemporary resolutions):

```
npm install @radix-ui/react-slot@^1.0.2 \
            @radix-ui/react-dropdown-menu@^2.0.5 \
            class-variance-authority@^0.7.0 \
            tailwindcss-animate@^1.0.7 \
            lucide-react@0.359.0 \
            react-icons@^5.0.1
```

Notes:
- `tailwindcss-animate@^1.0.7` — standard stable version at the 0.9.4
  release window; the template references `require("tailwindcss-animate")`.
  Not in the demo site's package.json (that uses a different animation
  setup) — pinning `^1.0.7` as era-appropriate.
- `react-icons@^5.0.1` — used by `Logo.tsx` (`VscCode` from
  `react-icons/vsc`). The manual prescribes `npm install react-icons`
  without a version; `^5.0.1` was the current major in late 2024.
- `@radix-ui/react-icons` — **intentionally omitted** per the lucide
  nudge above.
- `lucide-react@0.359.0` — pinned exactly to the tag's version. Required
  for the internal icons in `dropdown-menu.tsx` (Check, ChevronRight,
  Circle) AND now also for our DarkMode's Sun/Moon.
- Already installed by wu-eix: `clsx`, `tailwind-merge`, `next-themes`.
  Versions resolved at wu-eix time are newer than 0.9.4 era but API-
  compatible (verified: `cn()` works with clsx 2.x + twMerge 3.x same
  as clsx 1.x + twMerge 1.x).

---

## Implementation order (work steps)

1. **Pull** `button.tsx` + `dropdown-menu.tsx` verbatim from the 0.9.4
   registry via `gh api` + base64 decode; write to
   `web/components/ui/`. No edits.
2. **Replace** `web/app/globals.css` with 0.9.4 structural wrapper +
   slate hsl values.
3. **Replace** `web/tailwind.config.ts` with the resolved TS template.
4. **Install** the 6 deps above.
5. **Write** `web/components/navbar/Logo.tsx` from manual.
6. **Write** `web/components/navbar/DarkMode.tsx` from manual with the
   lucide icon swap.
7. **Write** `web/components/navbar/Navbar.tsx` (simplified version).
8. **Modify** `web/app/layout.tsx` to mount Navbar + wrap children in
   `<Container className='py-20'>`.

---

## Post-install audit steps

### Source-diff gates (run BEFORE verify + BEFORE commit)

For each verbatim-copied file, fetch the source directly from GitHub
and diff against the on-disk version. Zero diffs expected.

```sh
# Button
gh api "repos/shadcn-ui/ui/contents/apps/www/registry/default/ui/button.tsx?ref=shadcn-ui%400.9.4" \
  --jq '.content' | base64 -d | diff - web/components/ui/button.tsx
# DropdownMenu
gh api "repos/shadcn-ui/ui/contents/apps/www/registry/default/ui/dropdown-menu.tsx?ref=shadcn-ui%400.9.4" \
  --jq '.content' | base64 -d | diff - web/components/ui/dropdown-menu.tsx
```

### Drift gates (regression on TL findings)

```sh
grep "oklch("        web/app/globals.css     # expect: NONE
grep "tw-animate-css" web/package.json        # expect: NONE
grep "@base-ui/react" web/package.json        # expect: NONE
grep "lucide-react"   web/package.json        # expect: 0.359.0
```

### Build + dev verification

- `npm run build` succeeds (catches type errors in button/dropdown-menu
  transcription, misconfigured tailwind tokens).
- `npm run dev` → `GET / 200`.
- `curl /` HTML contains:
  - `<nav` element
  - `sr-only">Toggle theme</span` (from DarkMode button)
  - `mx-auto max-w-6xl` (Container classes persist)

### Visual QA (manual — localhost:3000 in browser)

Light mode (system-theme default if OS is light):
- Navbar renders at top, spans full width, thin bottom border.
- Logo (square button with VscCode code-brackets icon) on the left.
- DarkMode toggle (outline square button, Sun icon visible) on the
  right.
- Click the DarkMode button → dropdown appears with "Light", "Dark",
  "System" items, animates in.
- Click "Dark" → `<html>` gets `class="dark"`, background flips to
  near-black, text to near-white, Sun icon rotates out, Moon rotates in.
- Click "Light" → returns to light.
- Click "System" → follows OS preference.
- No console errors. No React hydration warnings.

### Known risks to watch for during QA

1. **hsl token mismatch.** If any class referenced by button.tsx or
   dropdown-menu.tsx (e.g. `bg-popover`, `text-popover-foreground`,
   `ring-ring`) lacks a corresponding `--popover` / `--ring` / etc.
   CSS variable in globals.css, dropdown will render transparent or
   with wrong contrast. Triage: `grep -oE 'bg-[a-z-]+|text-[a-z-]+|border-[a-z-]+|ring-[a-z-]+' web/components/ui/*.tsx | sort -u`, cross-check against `@layer base` vars.
2. **tailwindcss-animate keyframes.** DropdownMenu content animations
   rely on `data-[state=open]:animate-in` + `data-[state=closed]:animate-out` classes provided by the `tailwindcss-animate` plugin. If plugin isn't in `tailwind.config.ts` plugins array, dropdown snaps instead of animates. Covered by step 3.
3. **Container path in Navbar.** Manual line 116 imports
   `../global/Container` (relative). Our Navbar is at
   `web/components/navbar/Navbar.tsx` and Container at
   `web/components/global/Container.tsx` → same relative path works.
   Use `@/components/global/Container` alias for consistency with the
   rest of our code.
4. **tailwind.config.ts `content` globs.** The 0.9.4 template globs
   `./pages/...`, `./components/...`, `./app/...`, `./src/...`. We
   don't have `pages/` or `src/`; the extra globs are harmless but we
   keep them to stay verbatim.

---

## Commit + close

- Commit message: `P1: Add Navbar with Logo + DarkMode (hand-seed shadcn Radix era)`
- After push + `git status` shows up-to-date: `bd close wu-9xz` with a
  reason summarizing (a) what was transcribed verbatim, (b) what
  diverged from manual (lucide swap), (c) that source-diff gates passed.

## Out of scope

- `NavSearch`, `CartButton`, `LinksDropdown` components from the manual
  (these belong to e-commerce features excluded from this rig per
  `PLAN.md` § Not adopting).
- The `/grades` route placeholder (that's `wu-578`).
- Any Tailwind 4 migration concerns raised by `tailwindcss-animate`
  being Tailwind 3-only. Deferred to a hypothetical P6 upgrade bead.

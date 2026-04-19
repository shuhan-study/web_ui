# wu-9xz — Completion Report

## Status: ALL GATES PASS. Ready to commit + push + close.

## Execution order (as approved)

1. Install 6 deps ✓
2. Pull `button.tsx` + `dropdown-menu.tsx` verbatim ✓
3. Replace `globals.css` with slate hsl tokens ✓
4. Replace `tailwind.config.ts` ✓
5. Write `Logo.tsx` from manual ✓
6. Write `DarkMode.tsx` with lucide swap ✓
7. Write `Navbar.tsx` (simplified) ✓
8. Modify `layout.tsx` ✓

## Gate results

### Gate 1 — Source-diff (verbatim-copy verification)

| File | Diff vs `shadcn-ui@0.9.4` registry | Exit code |
|---|---|---|
| `web/components/ui/button.tsx` | identical | 0 |
| `web/components/ui/dropdown-menu.tsx` | identical | 0 |

**PASS.** Both files byte-for-byte match the canonical source at commit
`729b9ec`.

### Gate 2 — Drift regression

| Check | Expectation | Actual |
|---|---|---|
| `grep "oklch(" app/globals.css` | 0 | **0** ✓ |
| `grep "tw-animate-css" package.json` | 0 | **0** ✓ |
| `grep "@base-ui/react" package.json` | 0 | **0** ✓ |
| `grep "lucide-react" package.json` | `0.359.0` | `^0.359.0` ✓ |

**PASS.** None of the 4.3-era drift contaminants present.

### Gate 3 — Build + dev

- `npm run build`: succeeded, 5 static pages generated, no TS errors.
- `npm run dev`: `Ready in 1559ms`, `GET / 200 in 3826ms`, 759 modules
  (up from wu-eix's 523 — accounts for Radix DropdownMenu internals +
  lucide + react-icons).
- No errors, no warnings in the dev log.

### Gate 4 — HTML content markers (curl-based proxy for visual QA)

| Marker | Count | Notes |
|---|---|---|
| `<nav` | 1 | Navbar rendered |
| `sr-only">Toggle theme</span` | 1 | DarkMode button accessible label present |
| `mx-auto max-w-6xl` | 1 | Container still applied |
| `Shuhan` | 1 | page.tsx content rendered inside Container |

**PASS.** Full visual QA in a browser (dropdown animation, toggle flip,
`<html class="dark">` attachment) is still manual work you'll want to
eyeball.

## Divergences from intent worth flagging

### 1. `--ring` trailing `%` fixed (bug in upstream source)

The 0.9.4 `registry-base-colors.ts` slate entry has a typo for the dark
theme's `ring` value: `"212.7 26.8% 83.9"` — missing the trailing `%`
on lightness. Left verbatim, this produces invalid HSL
(`hsl(212.7 26.8% 83.9)` — CSS `hsl()` requires the unit on lightness).

**Applied fix:** wrote `--ring: 212.7 26.8% 83.9%;` (with `%`). One
character departure from the upstream source; HSL-valid. Documented
here because the intent said "verbatim" for the slate tokens.

### 2. `page.tsx` lost its Container wrapper

Intent step 8 described only `layout.tsx` edits (~5 lines), but adding
`<Container className="py-20">` in the layout would cause double-
Container nesting with wu-oa3's `page.tsx` (which also wraps in
`<Container className="py-16">`). That'd produce double horizontal
padding and a tighter width than intended.

**Applied:** rewrote `page.tsx` to render a bare fragment (`<>...</>`)
with the `<h1>` + `<p>` inline; no outer Container. Matches the
manual's convention where pages render content directly and the
layout owns Container mounting. One additional file changed beyond
the intent's file list.

Also swapped `text-gray-600` → `text-muted-foreground` on the subtitle
so it picks up the hsl token and flips correctly in dark mode.

### 3. Dep version float (caret ranges)

Pinned with `^` and npm resolved to newer semver-compatible versions:

| Dep | Intent pin | npm resolved |
|---|---|---|
| `@radix-ui/react-slot` | `^1.0.2` | `1.2.4` |
| `@radix-ui/react-dropdown-menu` | `^2.0.5` | `2.1.16` |
| `class-variance-authority` | `^0.7.0` | `0.7.1` |
| `react-icons` | `^5.0.1` | `5.6.0` |
| `lucide-react` | `0.359.0` | `0.359.0` (`^0.359.0` in package.json; 0.x caret locks to 0.359.y) |
| `tailwindcss-animate` | `^1.0.7` | `1.0.7` |

API-compatible per semver. If we want exact 0.9.4 era reproducibility
later, switch to exact pins (no caret).

### 4. Directory-scaffolding bobble (recovered)

An early `mkdir -p web/components/ui` ran from inside the `web/` cwd,
accidentally creating `web/web/components/ui/` where the first two
`gh api | base64 -d > …` pulls landed. Caught by Gate 1a, which
errored `No such file or directory` on the expected path.

**Recovered:** moved the two `.tsx` files to the correct
`web/components/ui/`, removed `web/web/` entirely, re-ran gates.
Zero residual trace — but worth logging as a process lesson: prefer
absolute paths in Bash for directory creation, same as for Write.

## Files changed

| Path | Kind | Size |
|---|---|---|
| `web/app/globals.css` | replace | 63 lines |
| `web/app/layout.tsx` | modify | +4 / -1 lines |
| `web/app/page.tsx` | modify | +6 / -9 lines (undocumented in intent — see §Divergences #2) |
| `web/tailwind.config.ts` | replace | 83 lines |
| `web/components/ui/button.tsx` | create | 56 lines (verbatim, 0.9.4) |
| `web/components/ui/dropdown-menu.tsx` | create | 200 lines (verbatim, 0.9.4) |
| `web/components/navbar/Logo.tsx` | create | 15 lines |
| `web/components/navbar/DarkMode.tsx` | create | 37 lines |
| `web/components/navbar/Navbar.tsx` | create | 19 lines |
| `web/package.json` | modify | +6 deps |
| `web/package-lock.json` | modify | ~transitive deps |

## Commit + close

- Commit message: `P1: Add Navbar with Logo + DarkMode (hand-seed shadcn Radix era)`
- `git pull --rebase && git push` per CLAUDE.md session protocol
- `bd close wu-9xz` with reason summarizing gates passed + divergences
  above.

## Out of scope (verified not touched)

- `NavSearch`, `CartButton`, `LinksDropdown` — e-commerce features
  excluded per `PLAN.md` § Not adopting.
- `/grades` route (wu-578 handles that).
- Tailwind 4 migration concerns around `tailwindcss-animate` — deferred
  to hypothetical P6.

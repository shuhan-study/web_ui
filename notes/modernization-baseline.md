# Modernization Baseline

Pre-upgrade UI baseline for the Next.js modernization work.  
Purpose: provide concrete, diffable anchors before upgrading so post-upgrade checks can distinguish real regressions from normal dev-mode noise.

## Scope

Pages checked locally in dev mode:

- `/`
- `/grades`
- `/subject/reading_6`

---

## `/`

Observed on local render:

- Header shows app logo at top-left.
- Header shows `About` link and theme toggle at top-right.
- Main hero area shows title `web_ui`.
- Subtitle reads: `Shuhan's study performance — placeholder landing page.`
- No visible cards, tables, or charts on this page.
- No console errors or warnings observed on hard refresh.

Interpretation:

- Landing page renders successfully.
- Layout shell, header, and theme control are present.

---

## `/grades`

Observed on local render:

- Page title is `Grades`.
- Subject cards visible:
  - Cobra Choir
  - History 6
  - Math 6
  - P.E. 6
  - Reading 6
  - Science 6
  - Writing 6
- Each card shows:
  - subject name
  - teacher name
  - letter grade
  - percentage
- Specific visible values at capture time:
  - Cobra Choir — Huizinga — `A+` — `97.0%`
  - History 6 — Fryer — `A+` — `97.0%`
  - Math 6 — Angeloni — `A` — `94.0%`
  - P.E. 6 — Mann — `A+` — `98.0%`
  - Reading 6 — Fryer — `B` — `86.3%`
  - Science 6 — Angeloni — `A+` — `96.0%`
  - Writing 6 — Fryer — `A` — `93.0%`
- No console errors or warnings observed in the captured state.

Interpretation:

- Grades overview page renders successfully.
- Subject-card grid is present and populated.
- Reading 6 card links to a working detail page.

---

## `/subject/reading_6`

Observed on local render:

- Page title is `Reading 6`.
- Summary line shows `Fryer · B · 86.3%`.
- `Assignments` section is visible.
- Assignments table columns visible:
  - Assignment
  - Date
  - Category
  - Score
- Five assignment rows visible:
  - Reading Log — Week 1
  - Vocabulary Quiz
  - Night Diary Book Test
  - Book Report — Character Analysis
  - Reading Log — Week 10
- Visible score values at capture time:
  - Reading Log — Week 1 — `9/10 (90.0%)`
  - Vocabulary Quiz — `14/15 (93.3%)`
  - Night Diary Book Test — `38/50 (76.0%)`
  - Book Report — Character Analysis — `42/50 (84.0%)`
  - Reading Log — Week 10 — `10/10 (100.0%)`
- `By category` section is visible.
- Category totals visible:
  - Homework — `19/20` — `95.0%`
  - Quiz — `14/15` — `93.3%`
  - Test — `38/50` — `76.0%`
  - Project — `42/50` — `84.0%`
- No console errors or warnings observed in the captured state.

Interpretation:

- Subject detail page renders successfully.
- Assignment table data and category summary data are present.
- Route parameter resolution for `reading_6` works in current dev mode.

---

## Console / dev-mode note

Benign Next 14 dev-mode RSC prefetch log may appear in console during navigation, for example `fetch-server-response.js` entries with `?_rsc=...`, including aborted or failed prefetches caused by in-flight navigation changes.

This behavior is treated as dev-mode noise, not a product regression by itself.

Post-upgrade rule:

- Presence of these RSC prefetch log lines is **not** by itself a regression.
- Absence of these RSC prefetch log lines is **not** by itself a regression.

Only treat console output as a regression if it indicates an actual render failure, uncaught runtime error, data-fetch failure affecting page content, or user-visible breakage.

---

## Baseline comparison rule for post-upgrade check

After upgrade, verify at minimum:

1. `/` still renders the same shell elements and landing copy.
2. `/grades` still shows all seven subject cards with teacher + grade + percentage.
3. `/subject/reading_6` still shows:
   - title
   - summary line
   - assignments table
   - five visible rows
   - by-category summary
4. No user-visible data loss, missing cards, broken route rendering, or runtime error overlays.

Minor dev-mode differences in fetch timing, prefetch logs, or non-user-visible request behavior should not be flagged unless they cause visible regressions.

---

## Polecat-captured baseline (Phase 1, pre-upgrade)

Captured on `polecat/furiosa-moayvcqv` against the current `v0.5-pre-modernization` code state, before any Phase 2 edits.

### Environment

- Node: `v22.16.0` (≥ Next 16 floor of 20.9).
- Working tree at `origin/main` = `6959173` (design-doc-only commits since tag `v0.5-pre-modernization` = `6537344`; code unchanged).
- `web/.env` created from `web/.env.example`; `web/prisma/dev.db` created via `prisma db push` + `prisma db seed` (1 term, 7 subjects, 30 assignments).

### `npm run build` (Next 14.2.35)

Exit 0. Empty stderr. Full stdout:

```
> web@0.1.0 build
> next build

  ▲ Next.js 14.2.35
  - Environments: .env

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/7) ...
   Generating static pages (1/7)
   Generating static pages (3/7)
   Generating static pages (5/7)
 ✓ Generating static pages (7/7)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                              Size     First Load JS
┌ ○ /                                    155 B          87.4 kB
├ ○ /_not-found                          155 B          87.4 kB
├ ○ /about                               156 B          87.4 kB
├ ○ /grades                              178 B          96.1 kB
└ ƒ /subject/[id]                        155 B          87.4 kB
+ First Load JS shared by all            87.3 kB
  ├ chunks/117-63e8d736830a9b26.js       31.7 kB
  ├ chunks/fd9d1056-b6bd4111191f2b98.js  53.6 kB
  └ other shared chunks (total)          1.89 kB


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

No build warnings. Three static routes, one dynamic route (`/subject/[id]`), one not-found, plus the `/about` landing.

### `.next/static` bundle size (pre-dev)

Captured immediately after `npm run build`, before any `npm run dev`:

```
1.0M  .next/static
```

### `npm run dev` cold-start + per-route curls

Cold-start + route-serving log (three curls to `/`, `/grades`, `/subject/cobra_choir`, all HTTP 200):

```
> web@0.1.0 dev
> next dev

  ▲ Next.js 14.2.35
  - Local:        http://localhost:3000
  - Environments: .env

 ✓ Starting...
 ✓ Ready in 1372ms
 ○ Compiling / ...
 ✓ Compiled / in 3.5s (772 modules)
 GET / 200 in 3790ms
 ○ Compiling /grades ...
 ✓ Compiled /grades in 3.4s (749 modules)
 GET /grades 200 in 3209ms
 ✓ Compiled /subject/[id] in 202ms (760 modules)
 GET /subject/cobra_choir 200 in 664ms
```

No `⨯` / `Error:` / `UnhandledPromiseRejection` / `FATAL` lines. This capture is the apples-to-apples anchor for the Phase 5 server-log delta.

### `tsc --noEmit`

Exit 0. Zero errors.

### `npm audit`

Full audit: 4 High, 0 Critical (pre-upgrade), captured to raw JSON. High-severity entries:

- `next` (high via advisory GHSA-9g9p-9gw9-jx7f) — resolves naturally on Next 16 bump.
- `glob` (high via advisory GHSA-5j98-mcp5-4vw2) — transitive via `@next/eslint-plugin-next` → `eslint-config-next`.
- `@next/eslint-plugin-next` (high via `glob`) — dev-only.
- `eslint-config-next` (high via `@next/eslint-plugin-next`) — dev-only.

Runtime-only (`npm audit --omit=dev`): **1 High** (`next` itself). This is the hard-gate anchor for Phase 4 step 5.

### Transitive-dep React-19 peer audit

All React-peer dependencies at their current versions already declare React 19 compatibility. No transitive bumps are required for the React-19 dimension under the "no transitive majors" rule.

| Package | Current | Latest | `peer.react` | Action |
|---------|---------|--------|--------------|--------|
| `@radix-ui/react-dropdown-menu` | 2.1.16 | 2.1.16 | `^16.8 \|\| ^17 \|\| ^18 \|\| ^19 \|\| ^19.0.0-rc` | none (already latest, already React-19 compat) |
| `@radix-ui/react-slot` | 1.2.4 | 1.2.4 | `^16.8 \|\| ^17 \|\| ^18 \|\| ^19 \|\| ^19.0.0-rc` | none |
| `lucide-react` | 0.359.0 | 1.8.0 | current supports `^19`; latest crosses a major | none (transitive majors banned; current covers React 19) |
| `next-themes` | 0.4.6 | 0.4.6 | `^16.8 \|\| ^17 \|\| ^18 \|\| ^19 \|\| ^19.0.0-rc` | none |
| `class-variance-authority` | 0.7.1 | 0.7.1 | no React peer | none |
| `react-icons` | 5.6.0 | 5.6.0 | `*` | none |
| `tailwind-merge` | 3.5.0 | 3.5.0 | no React peer | none |
| `tailwindcss-animate` | 1.0.7 | 1.0.7 | no React peer | none |

Conclusion: Phase 4 step 4 ("Bump any remaining transitives flagged in Phase 1 audit") expected to be a no-op for this project. Still run the `npm audit` delta in Phase 4 step 5 as a hard gate.

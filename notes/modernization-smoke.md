# Modernization Smoke Checklist

Post-upgrade verification for the Next 14.2.35 → 16 + React 18 → 19 modernization. This is the doc the maintainer reads during the post-merge smoke — it must stand alone without reaching into the design-doc.

## CLI setup

Run these before the smoke checks, from a clean checkout of the merged branch:

```
cd web
git pull --rebase
npm ci                     # must complete with no peer-dep warnings
                           # postinstall runs `prisma generate` automatically
                           # (OQ #1 landed with postinstall added)
# dev.db is gitignored; if this is a fresh clone or dev.db is missing:
cp .env.example .env       # only if .env doesn't already exist
npx prisma db push
npx prisma db seed
npm run dev
```

Notes on what changed vs the Phase-0 baseline:

- `"engines": { "node": ">=20.9" }` is now declared in `web/package.json`. npm will warn (not fail) if you run on < 20.9; Next 16 won't boot under 20.9.
- `postinstall` runs `prisma generate`, so a plain `npm ci` is sufficient — no separate `npx prisma generate` step is needed.
- `npm run lint` now invokes `eslint .` directly (the `next lint` subcommand was removed in Next 16; the `next-lint-to-eslint-cli` codemod migrated the script). Flat config lives in `web/eslint.config.mjs`.

## Maintainer smoke checks

Browser checks on Chrome stable (maintainer's 2019 Mac Pro, per design OQ #3):

- `/` renders. Hero shows `web_ui` heading and `Shuhan's study performance — placeholder landing page.` subtitle. Header shows logo, `About` link, theme toggle.
- `/grades` renders all seven seeded subjects (Cobra Choir, History 6, Math 6, P.E. 6, Reading 6, Science 6, Writing 6). Each card shows teacher, letter grade, percentage. Values match the `notes/modernization-baseline.md` capture (Cobra Choir — Huizinga — A+ — 97.0%, etc.).
- Click any subject → `/subject/[id]` renders detail (title, summary line `teacher · grade · percentage`, assignments table with 5 rows for Reading 6, by-category summary).
- Dark-mode toggle flips. Hard-refresh (⌘⇧R) in dark mode — watch for a light-theme flash on mount. If flash is observed, file a bead against `next-themes` (not a smoke blocker per design §Decisions Made).
- Open DevTools Console on each of `/`, `/grades`, `/subject/reading_6`. Confirm no new `console.error` entries beyond the Phase-0 baseline capture in `notes/modernization-baseline.md` (which recorded none on any route). Deprecation `console.warn` entries are tolerated but note them in the PR if any appear.
- GeistVF fonts load. In the Network panel, confirm no `.woff2` 404. (Font-loader regressions are Risks-table row "Font-loader regression on `next/font/local`".)
- Error-boundary probe (OQ #4 decision: Client Component throw on `/grades`). Temporarily insert a `throw new Error('smoke')` in any Client Component used on `/grades` and reload — confirm `error.tsx` overlay renders. Revert the throw after.
- `/grades` freshness probe (Risks-table row "`/grades` serves stale data post-upgrade"). Mutate one row:

  ```
  sqlite3 web/prisma/dev.db "UPDATE Subject SET percentage = 91.5 WHERE id = 'reading_6';"
  ```

  Reload `/grades` once. Reading 6's percentage must update to `91.5%` within that single reload. Revert:

  ```
  sqlite3 web/prisma/dev.db "UPDATE Subject SET percentage = 86.3 WHERE id = 'reading_6';"
  ```

  Or re-run `npx prisma db seed`. **If the value does not refresh:** add `export const dynamic = 'force-dynamic'` to `web/app/grades/page.tsx` and file the follow-on caching bead per design-doc.

## Build-warning delta

No net-new warning classes. Both `npm run build` runs (Phase-0 baseline under Next 14.2.35 and Phase-5 post-upgrade under Next 16.2.4) produced empty stderr and zero `warn`/`warning`/`⚠`/`error` lines under the design-doc normalization recipe (`sed` to strip ANSI + paths + line:col, then `sort -u`). Progress-log text changed shape (Turbopack banner, different route-listing format with no size column, multi-worker static-generation messages) but none of those count as warning classes.

## Server-log delta

No net-new error/warning classes. Both captures — Phase-1 `npm run dev` cold-start + three-route serving under Next 14.2.35 (`notes/modernization-baseline.md` "Polecat-captured baseline" section) and Phase-5 equivalent under Next 16.2.4 — produced zero matches for `^\s*(err|error|warn|warning|⨯|✗)\b` after the design-doc normalization. Cold-start time dropped from 1372 ms (Next 14) to 417 ms (Next 16 Turbopack); this is not a warning class, noted as a side-benefit only.

## Bundle-size delta

Informational only per Risks-table row "Bundle size 2× blow-up" (no threshold, no action regardless of value).

- Pre-upgrade (Next 14.2.35): `du -sh web/.next/static` → `1.0M`.
- Post-upgrade (Next 16.2.4): `du -sh web/.next/static` → `956K`.
- Ratio: ~0.93 (about 7% smaller). Well under the 2× blow-up threshold named in the Risks table.

Both measurements captured immediately after `npm run build` and before any `npm run dev` invocation, per the design-doc discipline to keep HMR chunks out of the measurement.

## Follow-on beads filed

- **Modernization v2 — Tailwind 3 → 4.** Deferred by PRD (design-doc Future). The Phase-4 Tailwind-3/Next-16 compatibility probe passed (`bg-card` and `text-muted-foreground` both present in `.next/server/app/grades.html` and in the compiled CSS chunk), so the Tailwind-4 move remains an opt-in project, not a forced escalation.

Beads intentionally NOT filed, with reasons:

- "Add postinstall + engines.node pin under Modernization v2" — OQ #1 was resolved yes/yes at dispatch time; both additions landed in the Phase-2 atomic bump commit. No residual scope.
- "Migrate to ESLint 9 flat config" — the `next-lint-to-eslint-cli` codemod migrated to flat config in-scope; the two lint errors that remained after migration were trivial and fixed inside OQ #2's 30-minute budget (ESM import of `tailwindcss-animate`, drop unused imports in `eslint.config.mjs`, delete legacy `.eslintrc.json`). `npm run lint` exits 0 with zero warnings.
- "Caching redesign inherits `force-dynamic` on `/grades`" — **conditional on maintainer's mutate-probe above.** If the post-merge freshness check passes, this bead is not filed and the caching question stays Deploy's. If the probe fails, add `force-dynamic` to `web/app/grades/page.tsx` and file the bead under Modernization v2.

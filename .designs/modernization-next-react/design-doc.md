# Design: Modernization — Next 14.2.35 → 16 + React 18 → 19

## Executive Summary

`web_ui` is a ~30-file App Router grade-tracker on Next 14.2.35 / React 18.
The upgrade is structurally tractable — grep-confirmed absence of `React.FC`,
`useFormState`, and `PropsWithChildren`, empty `next.config.mjs`, no
middleware, no Edge runtime, Node v22.16.0 (well above Next 16's 20.9 floor).
The real risk concentrates in **three surfaces**, all named in the PRD review
and now pinned by this design:

1. **`dropdown-menu.tsx` + Radix forwardRef composition.** The `types-react-
   codemod preset-19` rewrite is likely correct for flat `forwardRef` files
   (`card.tsx`, `table.tsx`, `button.tsx`) and risky for `dropdown-menu.tsx`
   because it composes Radix's own `forwardRef` primitives. Hand-review
   required; be prepared to hand-write the React 19 version.
2. **Caching-model change on `/grades`.** Next 16's default-static-where-
   possible + `'use cache'` opt-in model replaces the implicit fetch cache.
   `/grades` reads from Prisma (not `fetch`), so the risk is default-static
   freezing of seed-time data. Mutate-probe in Phase 5 is a hard gate.
3. **Reproducibility for the maintainer.** Invisibility for Shuhan requires
   the maintainer to cleanly `git pull && npm ci && npx prisma generate &&
   npm run dev` without manual recovery. `postinstall` script and
   `engines.node` pin are cheap enablers.

Recommended path: **atomic 14 → 16 + 18 → 19 bump** (per the problem
statement) executed as **~8-12 linear commits** anchored by
`v0.5-pre-modernization` on `main`. Commits split codemod output, hand
fixes, and transitive dep bumps so bisect is trivial later. Success is
falsifiable via a committed baseline artifact (`notes/modernization-
baseline.md`) and a named-route smoke checklist exercised by the
maintainer post-merge.

## Problem Statement

Upgrade `web_ui` from **Next 14.2.35 → 16** (direct, skipping 15) and
**React 18 → 19** without user-visible regression. Tailwind 3 stays,
Prisma stays, shadcn hand-seeded components stay unless build / runtime /
peer-dep conflict. Maintenance project — no new features, no new routes,
no data-model changes. Phase 1 must produce a committed baseline artifact.
Stop if blocked >4 hours. No transitive major upgrades.

## Proposed Design

### Overview

Atomic framework bump driven by codemods, with disciplined commit
granularity. Pre-upgrade anchor tag enables one-command rollback. Phase 1
baseline and Phase 5 smoke checklist make the "looks identical" criterion
falsifiable. Caching-model change is addressed by a targeted mutate-probe,
not a caching redesign.

### Key Components

- **Pre-upgrade anchor tag** `v0.5-pre-modernization` on `main` (cut by
  maintainer or Refinery, not by the polecat).
- **Baseline artifact** `notes/modernization-baseline.md` capturing build
  output, dev startup log, per-route browser-console snapshot, `tsc
  --noEmit` error count, `.next/static` bundle size, `npm audit` output,
  `prisma migrate status`, row counts.
- **Atomic codemod chain** — `types-react-codemod preset-19` first, then
  `@next/codemod@latest upgrade latest`, then hand-fixes for anything the
  codemods missed (notably `dropdown-menu.tsx`).
- **Transitive dep audit** — one commit per dep bump, bounded by the
  "no transitive majors" rule.
- **Smoke checklist** — `notes/modernization-smoke.md` committed with the
  named-route probes; maintainer executes browser probes post-merge.
- **Freshness fallback** — if `/grades` serves stale data after upgrade,
  add `export const dynamic = 'force-dynamic'` to
  `web/app/grades/page.tsx` as the minimum fix, file a bead documenting
  the caching-redesign handoff to Deploy.

### Interface

**Maintainer's post-upgrade CLI path** (the only user-facing API surface):

```
git pull --rebase
npm ci                      # must complete with no peer-dep warnings
npx prisma generate         # manual, unless postinstall is added
npm run dev                 # must cold-start without server errors
# …then browser smoke checklist
```

**Optional `postinstall` addition** (recommended — see API leg Q):

```json
"scripts": {
  "postinstall": "prisma generate"
}
```

**Optional `engines` pin** (recommended — see API leg Q):

```json
"engines": { "node": ">=20.9" }
```

### Data Model

**Frozen.** Prisma schema, seed data, `utils/actions.ts` signatures
unchanged. Data-freshness verified via mutate-probe, not schema change.
Row counts captured in baseline.

## Trade-offs and Decisions

### Decisions Made (by this design, given problem-statement constraints)

- **Atomic 14 → 16 path.** Pinned by problem statement. No intermediate
  green build at Next 15; only anchor is `v0.5-pre-modernization`.
  (Resolves review Q6.)
- **React + Next bumped together**, not "React 19 first on Next 14."
  The latter requires `--legacy-peer-deps` (banned). Collapse into one
  atomic `package.json` edit, one commit. (Resolves review ambiguity-leg
  critical #2.)
- **Baseline artifact is a Phase 1 hard gate.** Committed as
  `notes/modernization-baseline.md`. (Resolves review Q1.)
- **"Runtime error" bar**: fail on `console.error` in browser, fail on
  any new server-log entry not present in the baseline, tolerate dev-
  only `console.warn` deprecations. Capture all three buckets in the
  baseline for later diff. (Resolves review Q2.)
- **Smoke includes mutate-probe for `/grades` data freshness.**
  (Resolves review Q3.)
- **Smoke includes prod-bundle smoke.** `npm run build && npm run
  start` exercised on all three routes before tag. (Resolves review
  Q4.)
- **`--legacy-peer-deps` is banned.** Any peer-dep conflict is either
  resolved by bumping the conflicting dep to a React-19-compatible
  minor, or the project stops per the 4-hour abort rule. (Resolves
  review Q8 / ambiguity-leg critical.)
- **Transitive majors are banned.** If a transitive requires its own
  major migration to support React 19, stop and file a bead. Pin to the
  latest compatible minor of the current major. (Resolves review Q7 /
  consistent with problem statement.)
- **"Unless it breaks" = build fails OR runtime error on smoke routes
  OR peer-dep needs `--legacy-peer-deps`.** Deprecation warnings or
  theme flash alone do NOT count as "breaks" — file a bead, keep the
  pin. (Resolves review Q8.)
- **4-hour blocker abort rule.** Pinned by problem statement. On abort:
  park branch, file bead, leave `main` untouched, no `v0.6` tag.
  (Resolves review Q5.)
- **Polecat stops at `npm run build` green + `dev` cold-start clean.**
  Maintainer owns browser smoke. `gt done` fires at the polecat's gate;
  the maintainer's smoke is a pre-tag gate, not a polecat gate.
  (Resolves review "browser smoke ownership".)
- **No `'use cache'` annotations added.** Pinned by Non-Goal. The
  caching redesign is a future project.

### Open Questions (need maintainer decision before Phase 1 starts)

1. **Who cuts `v0.5-pre-modernization` and `v0.6-modernization-complete`?**
   Polecats don't push to `main`. Proposed: maintainer cuts the
   pre-upgrade tag before dispatch; Refinery or maintainer cuts the
   completion tag after merge. Please confirm.
2. **Add `postinstall: "prisma generate"` and `engines.node: ">=20.9"`
   in this project?** Both are cheap, in-spirit with the Modernization
   theme, technically beyond the literal framework bump. Recommend:
   yes to both. Please confirm or veto.
3. **ESLint 8 → 9 disposition if forced by `eslint-config-next@16`.**
   Three options: (a) in-scope migrate to flat config; (b) pin older
   `eslint-config-next` (defeats upgrade); (c) accept broken `npm
   run lint` and file follow-on bead (does not break Goal 3, since
   `build` doesn't run lint). Recommend (c) unless (a) is near-free
   after seeing the actual break.
4. **Browser target naming.** Recommend: Chrome stable on the
   maintainer's laptop, named explicitly. Please confirm.
5. **Error-boundary smoke throw location.** Recommend: Client Component
   throw on `/grades`, exercises the client-boundary render path that
   changed most between React 18 → 19. Please confirm.

### Trade-offs

- **Atomic bump vs. phased bump.** Atomic is more cognitively demanding
  mid-project but has a single rollback anchor. Phased would give a
  Next-15 bisect anchor but requires two codemod chains. Atomic wins
  for a ~30-file app; phased would win for a larger surface.
- **Granular commits vs. one mega-commit.** Granular adds commits but
  preserves bisect resolution. The PRD already requires small and
  linear; granular is the right answer.
- **Maintainer-owns-browser-smoke vs. polecat-owns.** Maintainer-owns
  breaks the "zero approval" aesthetic but respects the technical
  reality that polecats lack GUI browsers. The pre-tag gate adds
  latency (maintainer availability) but the alternative is a verifica-
  tion hole (curl+grep misses theme flash, FOUT, focus regressions).
- **Baseline verbosity.** A thorough baseline takes 15-30 min to
  capture and a commit of ~100 lines of markdown. Skipping it saves
  time today and loses the only falsifiable anchor for "no new
  warnings." Baseline wins.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Radix dropdown-menu React 19 peer block | Medium | High | Audit before starting (Phase 1 transitive-dep check). If blocked, hand-rewrite `dropdown-menu.tsx` using current Radix version. If Radix itself blocks, invoke 4-hour abort rule. |
| Codemod miscompiles `dropdown-menu.tsx` (Radix composition) | Medium | High | Isolated commit for codemod output; hand-review specifically for this file; separate commit to hand-fix if needed. |
| `/grades` serves stale data post-upgrade (silent) | Medium | High | Mutate-probe in Phase 5 smoke. Fallback: add `force-dynamic` to `/grades`. |
| `next-themes` theme-flash on React 19 | Medium | Medium | Hard-refresh in dark mode as explicit smoke step. If flash observed, file bead; evaluate `next-themes` minor bump only if it doesn't cross a major. |
| Async-`params` missed in `web/app/subject/[id]/page.tsx` | Low | High | Explicit grep + hand-fix commit even if codemod reports handled. |
| Font-loader regression on `next/font/local` | Low | Medium | Network-panel check for `.woff2` 404 in smoke. |
| Bundle size 2× blow-up | Low | Low-Med | Baseline capture; diff at Phase 5; not a hard gate unless severe. |
| ESLint 8 → 9 forced | Medium | Low | `build` doesn't run lint; accept broken `npm run lint` and file bead. |
| `npm audit` regression (new High/Critical runtime CVE) | Low | Medium | Hard gate on Phase 4 lockfile commit. |
| Supply-chain surprise in a bumped transitive | Low | Medium | `npm audit` delta + lockfile spot-check. |
| Prisma generated-client resolution under Turbopack | Low | High | Baseline captures `prisma generate` output; include `/grades` in mutate-probe which exercises Prisma runtime. |

## Implementation Plan

The PRD's Phase numbering (1-5) is retained with small revisions.

### Phase 1: Baseline (hard gate, MUST commit artifact)

1. Confirm Node version, record in baseline doc.
2. `npm run build` on current stack — capture stdout+stderr.
3. `npm run dev` cold-start — capture 10s of server log.
4. Browser: `/`, `/grades`, `/subject/[id]` — capture console tab
   per route (errors, warnings, info).
5. `npx tsc --noEmit` — capture error count.
6. `du -sh web/.next/static` — capture bundle size.
7. `npm audit --json` — capture vulnerability summary.
8. `npx prisma migrate status` + row counts — capture DB state.
9. Transitive-dep React-19 peer audit — note each current version and
   latest React-19-compatible minor, without bumping yet.
10. Commit: `notes/modernization-baseline.md` + `notes/modernization-
    smoke.md` (empty skeleton for Phase 5 to fill).

**Abort condition:** if any current-stack build/dev step fails, STOP.
Upgrading on a broken baseline is incoherent.

### Phase 2: React 19 + Next 16 atomic bump

1. Edit `web/package.json`:
   - `next` → latest `^16`
   - `react`, `react-dom` → latest `^19`
   - `@types/react`, `@types/react-dom` → latest `^19`
   - `eslint-config-next` → latest `^16`
   - (optional) `@types/node` → `^22`
   - (optional) add `"engines": { "node": ">=20.9" }`
   - (optional) add `"postinstall": "prisma generate"`
2. Delete `web/node_modules` and `web/package-lock.json`.
3. `npm install` — no `--legacy-peer-deps`.
4. If peer-dep resolution fails with a single blocker, bump just that
   transitive to its latest React-19-compatible minor (one extra
   `package.json` edit). Re-run `npm install`.
5. Commit: `chore: bump next 16 + react 19 + types`.

**Abort condition:** if `npm install` cannot resolve cleanly within a
single transitive bump pass, invoke 4-hour rule.

### Phase 3: Codemods

1. `npx types-react-codemod@latest preset-19 .` (scope to `web/`).
2. Hand-review every diff. Flag any rewrite inside a file that imports
   a Radix primitive.
3. Commit: `chore: apply types-react-codemod preset-19`.
4. `npx @next/codemod@latest upgrade latest` (scope to `web/`).
5. Hand-review every diff. Particular attention: `web/app/subject/
   [id]/page.tsx` — confirm `params` became `Promise` with `await`.
6. Commit: `chore: apply @next/codemod upgrade latest`.
7. Grep for `params.`, `searchParams.`, `cookies()`, `headers()`,
   `draftMode()`. For any touch point not rewritten, hand-fix.
8. Commit (if any): `fix: await async params/searchParams/headers`.

### Phase 4: Hand-fixes and transitive-dep cleanup

1. Run `npm run build`. Triage errors.
2. For each broken shadcn component (`card.tsx`, `table.tsx`,
   `button.tsx`, `dropdown-menu.tsx`):
   - Verify codemod output; hand-patch if Radix composition is wrong.
   - **`dropdown-menu.tsx` gets its own commit** — this is the highest-
     risk file.
3. Bump any remaining transitives flagged in Phase 1 audit — one
   commit per dep, each with a React-19-compatible minor.
4. `npm audit` — compare against baseline, hard-gate on new
   High/Critical runtime CVE.
5. `npm run build` — must be green. Commit if any hand-fixes landed.

### Phase 5: Smoke + tag prep

1. `npm run dev` cold-start, capture server log; diff against baseline.
2. Polecat smoke (machine-verifiable):
   - `tsc --noEmit` clean (or documented-unchanged error count).
   - `npm run build` green.
   - `npm run dev` boots, `curl http://localhost:3000/grades` returns
     200 with expected HTML markers.
   - `npm run start` (post-build) smokes the same three routes.
3. Populate `notes/modernization-smoke.md` with the maintainer smoke
   checklist:
   - `/` renders.
   - `/grades` renders all seeded subjects with letters + percentages.
   - Click subject → `/subject/[id]` renders detail.
   - Dark-mode toggle flips; hard-refresh in dark mode — no light
     flash.
   - GeistVF fonts load, no `.woff2` 404 in Network panel.
   - Force a throw in a Client Component on `/grades`, confirm
     `error.tsx` renders.
   - Mutate one row via Prisma Studio or direct SQL; refresh
     `/grades`; confirm new value appears within one reload.
4. Capture `.next/static` size diff; note in smoke doc.
5. File follow-on beads:
   - "Modernization v2 — Tailwind 3 → 4."
   - If ESLint 8 → 9 forced and punted: "Migrate to ESLint 9 flat
     config."
   - If `/grades` needed `force-dynamic`: "Caching redesign inherits
     force-dynamic on `/grades`, Deploy to reassess."
6. Commit: `docs: modernization smoke checklist + baseline diff`.
7. `gt done`.

**Maintainer's post-merge gate** (pre-tag):
- Pull, install, run, execute smoke checklist.
- If all green, cut `v0.6-modernization-complete`.

### Future (out of scope, filed as beads)

- Tailwind 3 → 4 (deferred by PRD).
- Caching redesign using `'use cache'` / `cacheLife` / `cacheTag`.
- Test infrastructure (still deferred).
- Deploy project (next in sequence).

## Appendix: Dimension Analyses

- [API & Interface Design](api.md) — codemod chain, lockfile
  hygiene, `postinstall`, `engines`.
- [Data Model](data.md) — schema frozen, mutate-probe, freshness
  fallback rule.
- [User Experience](ux.md) — invisibility bar, theme flash, font
  load, smoke ownership split.
- [Scalability](scale.md) — caching-model-change verification,
  bundle and cold-start baseline.
- [Security](security.md) — `npm audit` delta, supply-chain
  hygiene, no auth surface.
- [Integration](integration.md) — touch-point grep map, commit
  granularity, pre-upgrade anchor, `dropdown-menu.tsx` as the
  highest-risk file.

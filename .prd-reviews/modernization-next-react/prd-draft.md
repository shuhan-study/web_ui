# PRD: Modernization — Next.js + React major-version bump

## Problem Statement

`web_ui` is Shuhan's grade-tracker app. P1–P5 shipped the feature set (subjects grid,
subject detail, empty states, error boundaries, About page) on **Next.js 14.2.35 / React 18**.
The stack has drifted from the current major versions of its two foundational frameworks.
Every quarter we stay on an old major, upgrades get more expensive: transitive deps move on,
community examples/patterns shift, and security backports thin out.

**What the upgrade buys us:**
- React 19: stable Server Components story, `use()`, `<form action>` server actions, ref-as-prop,
  simpler Suspense ergonomics — which the Deploy project and any future real-data work will want.
- Next 16: App Router is the default and stable, Turbopack dev is production-grade,
  new caching primitives (`'use cache'`, explicit `cacheLife`/`cacheTag`) replacing the
  overloaded implicit fetch cache that P1–P5 relied on.

**For whom:** Rongjun (maintainer) — Shuhan (end user) sees no visible change.

**Why now:** P5 closed with the rig "sturdy enough to deploy." PLAN.md explicitly sequences
Modernization **before** Deploy so we don't ship the old stack into production and then
migrate a live app. Greenfield-in-prod is cheaper than brownfield-in-prod.

> Note on version numbering: PLAN.md frames this as "15 → 16 and 18 → 19", but `web/package.json`
> currently pins **Next 14.2.35** and **React ^18**. The effective jump is **14 → 16** (skipping
> 15 entirely) and **18 → 19**. This is called out explicitly in Open Questions — it may change
> the approach (intermediate stop on 15 vs. direct jump to 16).

---

## Goals

1. `web/package.json` resolves to the latest stable **Next.js 16.x** and **React 19.x**
   (and matching `react-dom`, `@types/react*`, `eslint-config-next`).
2. `npm run build` succeeds with zero errors and no new warnings beyond what exists on
   the current baseline.
3. `npm run dev` cold-starts and serves `/`, `/grades`, and `/subject/[id]` without runtime
   errors in the browser console or the server log.
4. Manual smoke test passes in a real browser:
   - `/grades` renders all seeded subjects with grade letters + percentages.
   - Clicking a subject navigates to `/subject/[id]` and renders the detail view.
   - Light/dark theme toggle still works (`next-themes`).
   - The error boundary still triggers on a forced throw (don't ship a broken `error.tsx`).
5. Lockfile is regenerated cleanly — no `npm install` warnings about peer-dep conflicts
   we're silencing with `--legacy-peer-deps`.
6. A follow-on bead is filed for **Tailwind 3 → 4** so the deferred work is visible.

**How we'll know we're done:** `git tag v0.6-modernization-complete` created on `main` after
all Path B beads land and the four verification checks above pass.

---

## Non-Goals

- **No new features.** No new routes, components, copy, or UX changes.
- **No data-model changes.** Prisma schema, seed data, and `utils/actions.ts` queries stay
  byte-for-byte identical unless React 19 types force a signature change.
- **No Tailwind 4.** Deferred to "Modernization v2" — Tailwind 4 is a CSS engine rewrite
  (Lightning CSS, CSS-first config) and belongs in its own project. Tailwind 3 is supported
  on Next 16.
- **No Prisma major bump.** Stay on `@prisma/client ^5.22.0` unless it breaks on React 19 types
  or Node 20+ runtime that Next 16 requires.
- **No shadcn re-seed.** Hand-seeded components stay unless React 19 breaks a specific one —
  in which case patch *that* component, don't re-run the CLI.
- **No `next-themes` bump.** Stay on `^0.4.6` unless it breaks.
- **No test infrastructure.** P5 deferred tests; this project does not unblock that.
- **No deploy.** Deploy is the next project. This project ends when `v0.6` tag is cut locally.
- **No bundle-size audit or perf work.**
- **No refactor of "the App Router uses implicit fetch cache" into the new `'use cache'` model.**
  Just get the app running on 16; opt-in caching redesign is a future project.

---

## User Stories / Scenarios

**As the maintainer (Rongjun), during the upgrade:**
1. I run the Path B pipeline; a polecat opens a feature branch.
2. The polecat bumps Next + React + types, fixes whatever breaks, commits in small steps.
3. `npm run build` and `npm run dev` both go green.
4. I pull the branch, run `npm run dev`, click through `/grades` → `/subject/[id]` → theme
   toggle, confirm it looks identical to pre-upgrade.
5. Merge, tag `v0.6-modernization-complete`.

**As the end user (Shuhan), after the upgrade:**
- Opens the app. It looks the same. It works the same. Nothing new to learn.
- (She will not notice. That is the success criterion.)

**Adversarial scenario — a breaking change we didn't anticipate:**
- `useFormState` was renamed to `useActionState` in React 19. If any code uses it (it doesn't
  today, but a shadcn re-seed might have introduced it), the build breaks with a rename error
  and the polecat patches the import.

**Adversarial scenario — a transitive blocker:**
- `@radix-ui/react-dropdown-menu ^2.1.16` doesn't yet support React 19. Options: bump Radix
  (in scope — transitive), or find a compatible minor, or pin `react` peer and accept the
  warning (last resort).

---

## Constraints

- **Framework pairing is fixed.** Next 16 ships with React 19 support. We are not trying
  Next 16 + React 18 or Next 15 + React 19 — neither is a supported combo.
- **Node runtime.** Next 16 requires Node 20+. The rig already runs Node 20+, so this should
  be a non-event, but worth confirming on the rig's actual Node version.
- **Tailwind 3 must keep working.** If the Tailwind 3 + Next 16 combo is broken in a way
  we can't fix with a PostCSS config tweak, that's a hard stop — we'd have to either roll
  back or escalate to include Tailwind 4, which breaks the scoping decision.
- **No test suite to lean on.** Verification is manual + `npm run build`. Which means the
  polecat must actually exercise the app in a browser, not declare victory when `tsc` is quiet.
- **Polecat model.** Work happens in a worktree; Refinery merges via MQ. Upgrade commits
  must be small and linear so they're easy to bisect if something regresses after deploy.
- **No user-visible regressions allowed.** The whole point is invisibility. A working app
  on Next 16 that lost the theme toggle is a failed project.

---

## Open Questions

These are the things *I already know I don't know*. The review phase will find more.

1. **Is the baseline really 14 → 16, or did someone already bump to 15 locally?**
   `web/package.json` shows `next: 14.2.35` and `react: ^18`. PLAN.md says "15 → 16".
   Either PLAN.md is wrong about the starting point or there's an un-committed intermediate
   state. Confirm before planning — a direct 14 → 16 jump is a different beast than 15 → 16
   (we'd be skipping one codemod generation).

2. **Transitive dep compatibility — which ones block React 19?** Candidates to audit:
   - `@radix-ui/react-dropdown-menu ^2.1.16`
   - `@radix-ui/react-slot ^1.2.4`
   - `class-variance-authority ^0.7.1`
   - `lucide-react ^0.359.0` (quite old)
   - `next-themes ^0.4.6`
   - `tailwind-merge ^3.5.0`, `tailwindcss-animate ^1.0.7`
   - `react-icons ^5.6.0`
   Each needs a `peerDependencies` check for `react@19`.

3. **Does `next lint` survive the bump?** Next 16 is moving lint config; the project currently
   uses `eslint-config-next 14.2.35` + ESLint 8. ESLint 9 (flat config) may get pulled in as
   a peer. Decide: bump ESLint to 9 (scope creep) or pin old ESLint (may block).

4. **Prisma 5 on Node runtime Next 16 ships.** Prisma 5 is fine on Node 20. Do we hit any
   edge where Next 16's Turbopack or server runtime changes how Prisma's generated client
   loads (binary targets, `__dirname` resolution, etc.)?

5. **`force-dynamic` on `/grades`.** The Deploy project's PRD flagged that `/grades` needs
   `export const dynamic = 'force-dynamic'` to reflect current DB on every page load.
   Do we add that *in this project* because React 19 / Next 16 changes caching defaults
   (the `'use cache'` model replacing implicit fetch cache), or leave it strictly to Deploy?
   My instinct: leave it to Deploy. But Next 16's caching model change means the current
   behavior may already differ post-upgrade — verify during smoke test.

6. **Codemods vs. hand-migration.** Next ships `npx @next/codemod@latest`. Do we trust it?
   On a small codebase (10s of files), hand-migration may be clearer and more reviewable
   than a black-box codemod. Recommend: run codemods, then diff and hand-review every change
   before committing.

7. **`@types/react ^18` → `@types/react ^19`.** Known breaking: implicit `children` prop
   removed from `React.FC`. Do we use `React.FC` anywhere? If so, inline prop types.

8. **shadcn component breakage.** The hand-seeded components (`Card`, `Table`,
   `DropdownMenu` wrapper) were generated against React 18 types. React 19's stricter
   ref-as-prop handling may invalidate a `forwardRef` usage. Each hand-seeded file should
   be re-examined.

9. **Rollback plan.** If the upgrade is structurally infeasible (e.g., Radix has no React 19
   release and the dropdown-menu is load-bearing), what's the exit strategy? Options:
   park the work on a feature branch, file a beads issue for the blocker, ship no tag.
   Needs an explicit answer before we start.

10. **Is one polecat enough, or does this want to be phased?** PLAN.md says "Path B" —
    implying the pipeline will generate a design doc + phase breakdown. I suspect 2–3
    phases (P1: deps + types; P2: Next 16 config/API migrations; P3: smoke + tag) is
    the right shape, but that's a planning-step call, not an intake-step call.

---

## Rough Approach

Not a plan. A direction.

**Phase 1 — Baseline inventory (30–60 min).**
- Pin current working state: confirm `npm run build` and `npm run dev` pass on 14/18 *today*.
- Run `npm outdated` and record the gap.
- Audit every dep in `package.json` against its React-19 peer-dep status.
- Record the Node version the rig actually runs.

**Phase 2 — React 19 first, in place on Next 14.**
- Bump `react`, `react-dom`, `@types/react`, `@types/react-dom` to 19.x.
- Run codemods for React 19 (`npx types-react-codemod@latest preset-19 .`).
- Hand-review codemod output before committing.
- Fix anything that breaks (`React.FC` children, `useFormState` → `useActionState`, ref-as-prop).
- `npm run build` + smoke test. Commit.
- *Why React first?* Smaller surface — if a transitive dep blocks here, we catch it before
  we also introduce a Next major bump on top of a still-broken React step.

**Phase 3 — Next 16 on top.**
- Bump `next` + `eslint-config-next` to 16.
- Run `npx @next/codemod@latest upgrade latest`.
- Hand-review every codemod diff.
- Fix `next.config.*`, caching annotations, and any App Router API rename fallout.
- `npm run build` + `npm run dev` + browser smoke. Commit.

**Phase 4 — Transitive dep cleanup.**
- Bump Radix / lucide-react / class-variance-authority to React-19-compatible versions.
- One commit per dep; easy to bisect later.

**Phase 5 — Verification + tag.**
- Full smoke: `/`, `/grades`, `/subject/[id]`, theme toggle, forced-error boundary.
- File follow-on bead: "Modernization v2 — Tailwind 3 → 4."
- Tag `v0.6-modernization-complete`.

**What could go wrong (risk ranking):**
- **High:** Radix + React 19 peer-dep mismatch on `dropdown-menu` with no clean upgrade.
- **Medium:** Next 16 caching model change breaks `/grades` data freshness silently (no
  error, just stale data). Smoke test must click-refresh and verify.
- **Medium:** `next-themes 0.4.6` on React 19 flashes wrong theme on mount.
- **Low:** ESLint 8 → 9 gets dragged in by `eslint-config-next@16` and breaks lint step.
- **Low:** Prisma 5 + Node 20 + Next 16 Turbopack has a generated-client resolution edge case.

**Escape hatch.** If Phase 2 or Phase 3 produces a blocker with no same-day fix, the polecat
escalates to Witness and parks the branch. Better to abandon a broken upgrade than to
ship a half-migrated app into the Deploy project.

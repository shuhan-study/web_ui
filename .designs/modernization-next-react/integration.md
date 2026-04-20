# Integration Analysis

## Summary

This is the **load-bearing dimension**. The project is defined by how
the upgrade fits into the existing ~30-file App Router app and how the
polecat's commit graph enables bisect if something regresses later
(during Deploy or after). Integration answers: **which files change,
in what commit order, with what rollback anchor.** Based on codebase
inspection: four `forwardRef`-heavy hand-seeded shadcn components, one
synchronous `params.id` access (`web/app/subject/[id]/page.tsx:11`),
an empty `next.config.mjs`, no middleware, no Edge runtime, Node
v22.16.0 (well above Next 16's 20.9 floor). The integration surface
is small, the touch points are grep-enumerable, and the bisect story
can be kept clean with disciplined commit granularity.

## Analysis

### Key Considerations

- **Known touch points (confirmed by grep):**
  - `web/app/subject/[id]/page.tsx:7-11` — synchronous `params.id`.
    Next 15+ makes `params` a `Promise`. The Next codemod should
    rewrite to `async` + `await`. Verify.
  - `web/components/ui/card.tsx` — 6 `React.forwardRef` usages.
  - `web/components/ui/table.tsx` — 9 `React.forwardRef` usages.
  - `web/components/ui/button.tsx` — 1 `React.forwardRef`.
  - `web/components/ui/dropdown-menu.tsx` — 9+ `React.forwardRef`
    usages, most composing Radix's own `forwardRef`-based primitives.
    **This is the highest-risk file.**
- **Grep-confirmed absent:** `React.FC`, `useFormState`,
  `PropsWithChildren`, `searchParams.`, `cookies()`, `headers()`,
  `draftMode()`, `useActionState`. Several anticipated break
  surfaces are pre-empted by the actual code shape.
- **Pre-upgrade anchor tag.** Review recommended
  `v0.5-pre-modernization` on `main` before Phase 2 begins.
  Rollback becomes `git reset --hard v0.5-pre-modernization`
  instead of "revert N commits." Cheap, high-value.
- **Path choice: atomic 14 → 16 (per problem statement).** PRD review
  Q6 named this as a load-bearing decision; the problem statement
  pins it to atomic. Consequence: Next 15 codemod chain runs inside
  `@next/codemod@latest upgrade latest`. No intermediate green
  build at Next 15. Bisect anchor is only `v0.5-pre-modernization`
  (not a mid-Next-15 commit).
- **React 19 on Next 14 (Phase 2 sequencing).** The PRD review's
  "Verification Gaps" flagged that Next 14's `react` peerDep is
  `^18`, so "React 19 first on Next 14" in the PRD's Rough Approach
  is structurally suspect. Two resolutions: (a) collapse Phases 2+3
  into one atomic bump, or (b) authorize a scoped one-time
  `--legacy-peer-deps` for the Phase-2 install only. The banned-
  flag rule (Q8) means (a) is cleaner. **Recommend: collapse into
  atomic React + Next bump, one commit for the `package.json`
  edits, one commit per codemod output, one commit per hand-fix.**
- **Transitive deps to audit:**
  - `@radix-ui/react-dropdown-menu ^2.1.16` — check React 19 peer.
  - `@radix-ui/react-slot ^1.2.4` — check React 19 peer.
  - `class-variance-authority ^0.7.1` — check React 19 peer.
  - `lucide-react ^0.359.0` — ~18 months old; bump to latest
    React-19-compatible minor.
  - `next-themes ^0.4.6` — check React 19 peer; theme-flash watch.
  - `tailwind-merge ^3.5.0` — usually React-agnostic; peer check
    only.
  - `react-icons ^5.6.0` — React 19 peer check.
  - `tailwindcss-animate ^1.0.7` — check for deprecation.
  - `@types/node ^20` → `^22` (optional, consistent with runtime).
- **ESLint 8 → 9.** `eslint-config-next@16` may drop `.eslintrc`
  support. Mitigation: `next build` does not run lint, so broken
  lint does not block Goal 3. Decision rule: if `eslint-config-next
  @16` installs cleanly and `npm run lint` passes, keep it. If it
  forces a flat-config migration, file a bead and accept broken
  `npm run lint` for this project.
- **`next.config.mjs` is empty.** No framework-config surface to
  migrate. Codemod output for this file should be either no-op or
  a minor comment/format change.
- **Commit granularity for bisect:**
  1. Pre-upgrade anchor tag on `main`.
  2. Phase 1 baseline artifact commit (no code change).
  3. `package.json` + lockfile bump (one atomic commit).
  4. `types-react-codemod preset-19` output (reviewed, one commit).
  5. `@next/codemod upgrade latest` output (reviewed, one commit).
  6. Each hand-fix to `dropdown-menu.tsx` / `card.tsx` /
     `table.tsx` / `button.tsx` (one commit per file or one
     reviewed commit for all shadcn files).
  7. `web/app/subject/[id]/page.tsx` async-`params` fix (one commit,
     in case the codemod missed it).
  8. Transitive dep bumps (one per dep).
  9. Phase 5 smoke checklist + mutate-probe result commit.
  10. If `force-dynamic` needed on `/grades`: one commit documenting
      the fallback from Option 1 of the data leg.
- **Where this code lives.** Entirely under `web/`. Polecat worktree
  is `web_ui/polecats/furiosa/web_ui/`. All edits are inside the
  worktree. No cross-repo coupling.
- **Dependents.** Deploy project (next) depends on this project's
  output (a working build on the new stack). Silent caching-model
  regression in this project = debugging hell in Deploy. Hence the
  freshness probe is an integration requirement, not a nice-to-have.

### Options Explored

#### Option 1: Atomic bump, anchored, granular commits (recommended)

- **Description**: Tag `v0.5-pre-modernization` first. One
  `package.json` commit bumping React + Next + types together. Run
  codemods in sequence, commit each. Hand-fix what codemods miss,
  one commit per conceptual fix. Transitive dep bumps one-per-dep.
  Each commit green-builds (or is explicitly marked "intermediate
  WIP, next commit resolves").
- **Pros**: Maximum bisect resolution. Every commit is a review
  unit. Matches PRD's "commits must be small and linear."
- **Cons**: More commits. Polecat must resist the temptation to
  squash.
- **Effort**: Medium.

#### Option 2: One mega-commit "upgrade to Next 16 + React 19"

- **Description**: All package.json edits, all codemod output, all
  hand-fixes in one commit.
- **Pros**: Easiest to understand at a glance.
- **Cons**: Zero bisect resolution. Violates PRD constraint
  "commits must be small and linear."
- **Effort**: Lowest — but loss-of-signal severe.

#### Option 3: Branch-per-phase with merge commits

- **Description**: Separate feature branches for baseline, React,
  Next, transitives; merge each to the upgrade branch with a merge
  commit.
- **Pros**: Preserves phase boundaries.
- **Cons**: Overkill for a 30-file app. Non-linear history
  complicates bisect. Extra ceremony for no gain.
- **Effort**: Medium-High.

### Recommendation

**Option 1**. Atomic bump, granular commits, anchored by
`v0.5-pre-modernization`. Polecat produces ~8-12 commits on the
branch. Each is either a `package.json`+lockfile change, a codemod
output, or a reviewed hand-fix.

## Constraints Identified

- `v0.5-pre-modernization` tag must be cut on `main` before the
  polecat starts (maintainer or Refinery action, not polecat).
- Every commit on the upgrade branch must at minimum compile
  (`tsc --noEmit` clean), even if the whole build is not green
  until Phase 4 completes.
- No merge commits on the upgrade branch (rebase-linear).
- Codemod output commits must be reviewable as standalone diffs.

## Open Questions

- **Does the pre-upgrade anchor tag fall to the polecat or the
  maintainer?** Polecats don't push to `main`. Proposed: polecat
  escalates to Witness for the tag, or the tag is cut by the
  maintainer pre-dispatch. Either is fine — naming who does what
  avoids a mid-project stall.
- **If `dropdown-menu.tsx` codemod output is wrong (Radix composition
  breaks), what's the fallback?** Proposed: hand-revert the dropdown-
  menu codemod change, keep every other codemod output, hand-write
  the React 19 compatible version of dropdown-menu.tsx from the
  current Radix docs, one reviewed commit.
- **Does `/grades` need `force-dynamic` here?** See data leg. The
  decision rule: run mutate-probe, apply fix only if probe shows
  stale.

## Integration Points

- **API dimension** — commit granularity is the integration-api
  surface; codemod ordering is shared.
- **Data dimension** — `postinstall` script (if added) becomes part
  of integration commit #3.
- **UX dimension** — smoke checklist commit is part of the bisect
  surface (Phase 5 commit).
- **Scale dimension** — baseline and post-upgrade bundle size diff
  is a signal in the integration tag notes.
- **Security dimension** — `npm audit` delta is a gate before
  lockfile commit lands.

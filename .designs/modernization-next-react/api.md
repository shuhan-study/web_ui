# API & Interface Design

## Summary

The "API" here is the **codemod / CLI pipeline** a single polecat drives and
the **package.json surface** left behind after the upgrade. Because this is a
maintenance project with zero new user-facing surface, API design reduces to:
(a) which codemod chain to invoke, (b) what lockfile shape is acceptable, and
(c) what the maintainer types after pulling the branch. We recommend running
`types-react-codemod preset-19` before `@next/codemod@latest upgrade latest`,
banning `--legacy-peer-deps` outright, and treating `postinstall: prisma
generate` as an in-scope ergonomics fix.

## Analysis

### Key Considerations

- **Codemod ordering matters.** React 19 types codemod first (rewrites
  `forwardRef` and ref-as-prop), then Next codemod (rewrites `async params`,
  caching annotations). Running Next first can leave orphaned
  `React.forwardRef` diffs the Next codemod has no opinion on.
- **`--legacy-peer-deps` is the escape valve everyone reaches for.** Goal 5
  of the PRD implicitly bans it; the review's Q8 explicitly bans it except
  as a bisect tool. Spelling out "banned" up-front is cheaper than a
  polecat mid-upgrade deciding "just this once."
- **Lockfile hygiene.** `package-lock.json` must be regenerated from
  scratch on a clean `node_modules`, not by `npm install --package-lock-only`
  on top of an 18-era lockfile. Drift will hide peer-dep warnings.
- **Prisma generated client resolution.** No `postinstall` script today.
  A `npm ci` gives `Cannot find module '.prisma/client'` on clean installs.
  Cheap fix, included because the whole project is "clean install works."
- **CLI ergonomics for the maintainer.** Post-upgrade, the verification
  sequence on the maintainer's laptop is `git pull && npm ci && npx prisma
  generate && npm run dev` + browser smoke. Each of those steps needs to
  work first time or the "invisibility" success criterion fails.

### Options Explored

#### Option 1: Atomic codemod chain (recommended)

- **Description**: One polecat runs (1) `npx types-react-codemod@latest
  preset-19 .`, (2) `npx @next/codemod@latest upgrade latest`, (3) manual
  `package.json` bumps for `next`, `react`, `react-dom`, `@types/react*`,
  `eslint-config-next`. Each codemod output is a single commit diff the
  polecat hand-reviews before staging.
- **Pros**: Standard path, widely documented, codemod authors know the
  combinations. Diff per codemod is reviewable. Bisect-friendly.
- **Cons**: Codemods may miss edge cases (e.g., `forwardRef` nested inside
  Radix wrappers — see the scope leg). Requires hand-review discipline.
- **Effort**: Low — this is the mechanical path.

#### Option 2: Hand-migration only, skip codemods

- **Description**: Polecat manually updates every `forwardRef`, every
  `params.id`-style access, every affected file.
- **Pros**: Full control, no black-box rewrites. Good for a ~30-file app.
- **Cons**: Guaranteed miss on subtle type changes (implicit `children`
  prop, stricter `ReactNode`, async-`params` in route handlers). Slower.
  Loses the codemod diff as a bisect anchor.
- **Effort**: Medium-High — more manual surface.

#### Option 3: Codemods with no hand-review

- **Description**: Run both codemods, commit the output verbatim, move on.
- **Pros**: Fastest.
- **Cons**: Known-unsafe for `dropdown-menu.tsx` (composes Radix forwardRefs
  — codemod may rewrite the outer but not the inner). Defeats the polecat
  contract to hand-review before committing.
- **Effort**: Lowest — but highest regression probability.

### Recommendation

**Option 1**. Codemod-then-review, in the order: types first, Next second.
Each codemod run is its own commit. Reject any diff that rewrites
`forwardRef` inside a file where a Radix primitive is imported — review
manually.

## Constraints Identified

- `--legacy-peer-deps` is banned (hard). If peer-dep resolution requires
  it, the project stops and files a bead per the PRD review's Q5 rule.
- No breaking changes to `utils/actions.ts` signatures. Prisma-to-client
  contract is load-bearing for `/grades` and `/subject/[id]`.
- `next.config.mjs` is empty today. Any non-empty config Next 16 forces
  (e.g., `turbopack: { ... }` defaults shift, or App Router experimental
  flags removed) must be the minimum to boot, not opportunistic adds.
- `npm run build` and `npm run dev` are the only two build entry points.
  No `npm run lint` in `build`, so ESLint regressions do not block Goal 3.

## Open Questions

- **Should `postinstall: "prisma generate"` be added in this project, or
  documented as a manual step in Phase 1?** Adding it is a 1-line ergonomics
  fix but technically outside "modernize Next + React." Recommend: add it.
  Rationale: every clean-install verification step needs it, and a
  documented manual step is fragile. (Cross-ref: scope leg, gaps leg.)
- **Should `engines.node` be pinned to `>=20.9` in `package.json`?** Next 16
  requires it. Cheap, in-spirit, but technically scope creep. Recommend:
  yes, pin it — the whole project is about aligning the stack with current
  requirements.

## Integration Points

- **Data dimension** — codemod chain must not touch Prisma schema or
  migration files; data leg confirms no schema changes.
- **Integration dimension** — commit granularity feeds bisect strategy.
  One commit per codemod, one per dep bump, one per hand-fix.
- **UX dimension** — post-upgrade CLI experience for the maintainer
  (`npm ci && npm run dev`) is the user-facing surface.

# Data Model Design

## Summary

**No data-model changes are in scope.** The Non-Goals section of the PRD
pins Prisma schema, seed data, and `utils/actions.ts` queries byte-for-byte
identical. The data dimension's contribution is therefore a **guard**, not
a design: document the invariant so a polecat mid-upgrade doesn't
opportunistically "fix" a Prisma warning that React 19 surfaces. The only
data-adjacent work is verifying Prisma's generated client still resolves
under Next 16's Turbopack and under Node 22.

## Analysis

### Key Considerations

- **Prisma stays at `^5.22.0`.** PRD Non-Goal. Prisma 6 is out, but
  crossing a second major is explicitly off-limits per the review's Q7
  rule ("no transitive majors").
- **Generated client resolution.** `@prisma/client` ships a generated
  runtime into `node_modules/.prisma/client`. Next 16's Turbopack dev
  server and the production build bundle it differently than Next 14's
  webpack path. Historical failure mode: `Cannot find module
  '.prisma/client'` on edge/middleware boundaries. This app has no
  middleware and no Edge runtime, so exposure is low — but still
  verifiable in the baseline.
- **Seed data is static.** `prisma/seed.ts` runs via `tsx` (dev dep).
  No React/Next coupling. Must still run post-upgrade to reset the
  verification DB.
- **SQLite file lives under `web/prisma/`**, checked into git for
  single-dev simplicity. Upgrade should not touch the SQLite file or
  its location.
- **`utils/actions.ts` signatures.** Server actions today are plain
  async functions returning `Prisma`-inferred types. React 19 does not
  change server action signatures (`'use server'` export shape is
  stable between 18.3 and 19.x). No expected signature churn.
- **Data freshness vs. caching.** The PRD review's Q3 flags that
  `/grades` has no `force-dynamic`. This is a caching-model concern
  (scale / integration dimensions), not a data-model concern — schema
  is unchanged. Data leg's contribution: the freshness probe needs a
  **mutate-via-Prisma-then-refresh** step, not a schema change.

### Options Explored

#### Option 1: Strict schema freeze, mutate-probe in smoke (recommended)

- **Description**: Prisma stays pinned. Baseline captures `prisma
  migrate status` + row counts. Phase 5 smoke includes a mutate-then-
  refresh probe: `sqlite3 web/prisma/*.db 'UPDATE Subject SET ...'`
  (or `prisma studio` GUI), reload `/grades`, confirm new value.
- **Pros**: Zero schema churn. Freshness probe answers review Q3.
  Baseline row count is a cheap invariant.
- **Cons**: Mutate-probe requires sqlite3 CLI or prisma studio — adds
  one manual verification step to Phase 5.
- **Effort**: Low.

#### Option 2: Let the polecat regenerate Prisma client opportunistically

- **Description**: On each install, re-run `prisma generate`. No
  mutate-probe.
- **Pros**: Simpler smoke.
- **Cons**: Misses the whole point of Q3 — stale-data regression
  invisible to "does it render" checks.
- **Effort**: Low, but regression-unsafe.

#### Option 3: Bump Prisma to 6 as a "modernization bonus"

- **Description**: While we're here, cross Prisma's major too.
- **Pros**: Fewer open debts.
- **Cons**: Violates Non-Goal. Adds migration surface. Explicitly banned
  by the problem statement.
- **Effort**: High — out of scope.

### Recommendation

**Option 1**. Freeze the schema, baseline the row counts, and make the
freshness probe a named Phase 5 smoke step: "mutate one row via direct
SQL or Prisma Studio, refresh `/grades`, confirm UI reflects change
within one reload." If the UI does not reflect the change, add `export
const dynamic = 'force-dynamic'` to `web/app/grades/page.tsx` as the
minimum fix — OR explicitly document the stale-data handoff to the
Deploy project. (Decision point: see synthesis.)

## Constraints Identified

- Prisma schema must not change.
- `utils/actions.ts` function signatures must not change (except where
  React 19 type inference forces a signature widening).
- SQLite file location and format must not change.
- `npx prisma generate` must run after every clean install (see API
  leg's `postinstall` recommendation).

## Open Questions

- **Does `/grades` need `force-dynamic` here, or in Deploy?** The PRD
  draft says Deploy. The review's Q3 says it depends on whether Next
  16's caching-model change makes `/grades` serve stale data after
  the upgrade. Proposed decision rule: **run the mutate-probe in
  Phase 5. If stale, add `force-dynamic` in this project as a one-line
  fix and file a bead documenting that Deploy inherits it. If fresh,
  leave the line untouched and let Deploy own the decision.** This
  respects the Non-Goal while not hiding a silent regression.
- **Should Prisma binary targets be pinned?** Today they are not —
  Prisma auto-detects. Next 16's Node 20.9+ floor means `linux-arm64`
  and `darwin-arm64` should both still resolve. Verify in baseline; do
  not change.

## Integration Points

- **Scale dimension** — caching and data freshness overlap. Scale
  owns the `'use cache'` / `cacheLife` annotations (opt-in) but this
  project is explicitly not doing the caching redesign.
- **Integration dimension** — `postinstall` script decision affects
  the `npm ci` reproducibility story.
- **UX dimension** — mutate-probe needs a documented recipe so the
  maintainer (or future polecat) can run it without reading this doc.

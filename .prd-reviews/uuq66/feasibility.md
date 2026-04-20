# Technical Feasibility

## Summary

The Modernization PRD (Next 14 → 16, React 18 → 19) is broadly feasible on this
codebase — it's a ~30-file app with no custom Webpack config, no Edge runtime
usage, no middleware, and no exotic framework plumbing. The heavy lifting is a
well-trodden dependency upgrade with first-party codemods from the Next and React
teams. However, the PRD under-states two concrete mechanical breaking changes
that *will* hit every data-driven route, and it glosses over the fact that
"14 → 16" is crossing **two** major boundaries (Next 15's async request APIs +
caching overhaul), not one. The biggest feasibility risk is not the upgrade
itself but the PRD's Non-Goal #9 — "no refactor of implicit fetch cache into
`'use cache'` model" — which is not optional on Next 16: the semantics changed,
and ignoring them is how you silently ship stale data. Confidence is **medium**:
the path is known, but "no user-visible regressions allowed" + "no test suite to
lean on" is a fragile combination for a caching-behavior change the PRD does not
plan to exercise.

## Findings

### Critical Gaps / Questions

**1. Next 15 async `params` / `searchParams` is a mandatory codemod, not an
open question.**
The PRD treats this migration as a collection of "maybe we hit this" items. But
`web/app/subject/[id]/page.tsx:7-11` currently types `params` as
`{ id: string }` (synchronous) and reads `params.id` directly. In Next 15,
`params` became `Promise<{ id: string }>` — the codemod rewrites this to
`const { id } = await params`. Any route, `layout`, `generateMetadata`,
`generateStaticParams`, or `route handler` that touches `params`, `searchParams`,
`cookies()`, `headers()`, or `draftMode()` must be updated. This is not
speculative; it's guaranteed for this app.
- **Why this matters:** the PRD's phase plan (Phase 3: "Bump next + run codemod,
  hand-review") buries this under generic codemod review. It should be called
  out as its own step so the polecat knows to grep for every `params` /
  `searchParams` touch point before relying on the codemod to catch them.
- **Clarifying question:** should the PRD explicitly enumerate the async-APIs
  migration as a named sub-step in Phase 3, with a grep-checklist of sync
  `params`/`searchParams`/`cookies`/`headers` usages to audit?

**2. Non-Goal #9 ("no caching redesign") conflicts with Constraint
"no user-visible regressions" on `/grades`.**
Next 16 changes the default caching behavior. The implicit fetch cache that
P1–P5 relied on is being deprecated in favor of the explicit `'use cache'` /
`cacheLife` / `cacheTag` primitives. What this means for `/grades`:
`fetchSubjects()` today goes straight to Prisma — no `fetch()`, so the implicit
fetch cache was never the mechanism anyway; it's the Route Segment cache / Full
Route Cache that governs freshness. Under Next 16's new defaults, a
database-backed RSC may be cached differently than today. If `/grades` starts
rendering stale subject data (or is re-rendered on every request where it
wasn't), that is a user-visible regression by definition and violates
Constraint #6. The PRD's Open Question #5 acknowledges this exists but punts to
Deploy; the Non-Goal section says explicitly "just get the app running on 16."
Those two positions are in tension.
- **Why this matters:** smoke-test-as-verification (Goal #3, #4) will not
  reliably catch stale-data bugs on a freshly-seeded SQLite DB — you need to
  mutate and refresh to observe staleness. The polecat can tick every box in
  Goal #3/#4 and still ship a regression.
- **Clarifying question:** is the acceptance criterion "it renders" or "it
  renders *current* DB data after a mutation"? If the latter, the smoke test
  needs an explicit mutate-and-refresh step, or the PRD needs to accept that
  `force-dynamic` lands in this project (not Deploy) as a compensating control.

**3. The baseline-confusion open question (#1) is a gating prerequisite.**
The PRD says PLAN.md frames this as 15 → 16 but `package.json` pins Next 14.
Phase 2 of the Rough Approach bumps React-only on "Next 14", meaning a direct
14 → 16 jump is the assumed path. A direct skip of Next 15 means you run
`@next/codemod` with the `upgrade latest` flag, which does chain the
intermediate codemods — but it also means you do not get a stable-build
checkpoint on Next 15 to bisect against if Phase 3 explodes. The PRD should
pick a lane before work starts.
- **Clarifying question:** is the chosen path (a) one atomic 14 → 16 jump with
  no Next-15 checkpoint, or (b) 14 → 15 → 16 with a green build at 15 as an
  explicit checkpoint? Path (b) doubles the Next-bump work but gives you a
  bisect anchor if something regresses silently.

### Important Considerations

**4. `forwardRef` usage is pervasive and codemod-sensitive.**
Eight files under `web/components/ui/` use `React.forwardRef` (card.tsx:5-67,
table.tsx:5-96, button.tsx:42, dropdown-menu.tsx:21-159). React 19 does not
remove `forwardRef` but its types changed, and the React-team codemod
(`types-react-codemod preset-19`) can auto-convert these to ref-as-prop. Each
converted component needs to be spot-checked — especially the `dropdown-menu.tsx`
wrappers around `@radix-ui/react-dropdown-menu`, because Radix's own ref
forwarding is what the `forwardRef` is composing with. If Radix ships a React-19
compatible version that already uses ref-as-prop, the wrapper refactor is
straightforward; if Radix still uses `forwardRef` internally, the wrapper must
continue to use it and the codemod's rewrite may be wrong for those files. This
deserves its own commit rather than being folded into "transitive dep cleanup."

**5. `next-themes` FOUC risk on React 19 is real but manageable.**
The PRD flags this at "Medium" risk. Worth noting: `next-themes ^0.4.6` already
advertises React 19 support as of late 2024, so the concern is likely overstated.
But `web/app/providers.tsx` + the `ThemeProvider` pattern involves
`suppressHydrationWarning` on `<html>` (standard next-themes boilerplate) —
verify `web/app/layout.tsx` still has this attribute after any codemod runs,
because React 19's stricter hydration-mismatch handling makes its absence more
visible than on 18.

**6. ESLint 9 / flat config scope creep is actually likely, not "low."**
`eslint-config-next@16` has dropped the legacy `.eslintrc` format in favor of
ESLint 9 flat config. The PRD rates this "Low" risk. Based on the Next 16
release notes, it's closer to "High probability, low severity" — you almost
certainly will have to migrate `.eslintrc*` to `eslint.config.js` (or accept a
broken `npm run lint`). Since Goal #4 includes "manual smoke test passes" but
not "lint passes", a broken lint step is technically out of scope for Goals, but
the project's Non-Goal "no test infrastructure" tacitly relied on lint as the
only static check. Losing lint is a real regression in signal quality.

**7. Prisma + Turbopack dev edge case is worth pre-flighting.**
Prisma's generated client relies on `__dirname`-style resolution to find its
query engine binary. Turbopack (now the default in Next 16 dev) has had
historical rough edges with native binaries. The PRD rates this "Low." A cheap
check: after Phase 3 bumps, run `npm run dev` once and hit `/grades` in a
browser before declaring Phase 3 done. A build that compiles but dies at first
DB query on cold dev start is the canonical Prisma/Turbopack failure mode.

**8. `@radix-ui/react-dropdown-menu ^2.1.16` is *not* current.**
Radix has shipped newer versions with explicit React 19 peer-dep support. The
PRD frames this as an unknown ("may not support React 19"); verify by running
`npm view @radix-ui/react-dropdown-menu versions --json` + checking
peerDependencies on the latest. Likely a one-line bump, but worth resolving as
a fact before Phase 4 begins — it removes a "High" risk from the risk ranking.

### Observations

- No `React.FC`, `useFormState`, `PropsWithChildren`, or `createContext` usage
  in the app/components/utils tree (grep-confirmed). That's three pre-empted
  breaking changes from the PRD's Open Question #7 and Adversarial Scenario
  list. The React 19 type surface this app actually exercises is narrower than
  the PRD assumes.
- Rig runs Node v22.16.0; Next 16 requires Node 20+. Constraint satisfied.
- `next.config.mjs` is empty (`{}`). No custom config to migrate — this removes
  a whole category of Next-major-bump pain.
- No middleware, no custom `app` runtime config, no `images.loader` config,
  no `experimental.*` flags. The footprint the migration touches is small.
- `lucide-react ^0.359.0` is ~18 months old. Peer-dep check needed, but if it
  blocks, a major-version bump is cheap — icon imports are type-checked names,
  not structural API.
- `@types/node` is `^20` but runtime is Node 22. Non-blocking, but worth
  bumping to `^22` in the same pass for consistency.
- No `tsconfig.json` shown; a React 19 + Next 16 upgrade may want `"target": "ES2022"`
  or better and `"moduleResolution": "Bundler"`. Worth a glance but not a
  blocker.

## Confidence Assessment

**Medium.**

**High-confidence parts:** the PRD has correctly identified that this is a
mechanical upgrade, correctly scoped out Tailwind 4 and Prisma 6, and correctly
sequenced React-before-Next. The risk ranking has the right shape even where
I'd adjust magnitudes. The phase breakdown is roughly what a careful polecat
would do anyway.

**Lower-confidence parts:** the PRD does not yet acknowledge that Next 15's
async request APIs and Next 16's caching-model change are *required* work
items, not *possible* ones. It treats them as open questions to audit, but for
this specific codebase (which has a dynamic route reading `params` and a
data-driven `/grades` page), both are guaranteed hits. Combined with "no test
suite" + "no user-visible regressions allowed" + "smoke test is the acceptance
gate," there is a live risk that the polecat declares victory on a build that
silently regressed data freshness. The fix is small: either move
`force-dynamic` on `/grades` into this project's scope, or write the smoke test
to include a "mutate DB + refresh page" step that would expose stale cache.

The project is buildable; the PRD's current acceptance criteria may not be
sufficient to prove it was built correctly.

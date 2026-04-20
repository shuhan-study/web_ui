# Scope Analysis

## Summary

The PRD is scoped tightly and with unusual discipline: Non-Goals are numerous,
explicit, and each is justified with a one-line rationale (why Tailwind 4 is out,
why Prisma stays, why no tests, why no deploy). That is the single strongest
aspect of this document from a scope perspective. The stated MVP is coherent:
"app on Next 16 + React 19, looks identical to Shuhan, tagged `v0.6`." The
four-check verification (`build`, `dev`, manual browser smoke, theme toggle) is
concrete enough to prevent "declare victory when `tsc` is quiet" drift.

That said, scope risk is non-trivial and sits in two specific places: the
**transitive dependency surface** and the **caching-model change** in Next 16.
The PRD names both as open questions, but neither has a hard scope fence.
Radix / ESLint / `next-themes` upgrades are acknowledged as "in scope —
transitive" in Open Question #2 and the adversarial scenario, which is an
invitation for scope creep dressed as "we had to bump it to unblock the build."
The Next 16 caching model change (Open Question #5) is the one genuinely
ambiguous boundary with the downstream Deploy project, and the PRD's instinct
("leave `force-dynamic` to Deploy") is correct but not yet a decision.

## Findings

### Critical Gaps / Questions

- **"Transitive bumps are in scope" has no upper bound.**
  The PRD says bumping Radix / lucide-react / CVA to React-19-compatible
  versions is in scope (Phase 4, "one commit per dep"). But some of these are
  themselves majors: `lucide-react ^0.359.0` to current is a large jump;
  Radix 2.x → 3.x (if it exists by then) could ship breaking API changes in
  the wrapped shadcn components. There is no rule for "if a transitive upgrade
  requires its *own* major-version migration, stop and file a separate bead."
  Without that rule, the polecat will rationalize every dep bump as necessary
  and this project grows.
  **Why it matters:** Radix majors have historically reshaped component APIs
  (`asChild`, portals, composition). A "just bump it" attitude can silently
  break the hand-seeded `Card`, `Table`, `DropdownMenu` wrappers the PRD
  explicitly protects in Non-Goals.
  **Suggested question for Rongjun:** "What's the rule when a transitive
  upgrade is itself a major version? Accept it, pin to the latest compatible
  minor, or stop and file a separate project?"

- **ESLint 8 → 9 decision is deferred, but ESLint 9 is likely non-optional.**
  Open Question #3 acknowledges ESLint 9 may get pulled in by
  `eslint-config-next@16`. "Scope creep" is one option offered. ESLint 9 is a
  flat-config rewrite; if it lands, `.eslintrc.*` disappears and `eslint.config.js`
  replaces it. That is not "creep," that is a forced migration — and it is
  not in any Phase of the Rough Approach.
  **Why it matters:** If `eslint-config-next@16` hard-requires ESLint 9, the
  "No test/lint infrastructure changes" implicit assumption breaks. The
  polecat either does the flat-config migration (unscoped), or disables lint
  (also unscoped), or pins an older `eslint-config-next` (defeats the upgrade).
  **Suggested question:** "If ESLint 9 is required by `eslint-config-next@16`,
  is flat-config migration in scope for this project, or does the polecat
  stop and escalate?"

- **Rollback plan is listed as an Open Question, not a decision.**
  Open Question #9 asks "what's the exit strategy?" and offers three options
  (park branch, file bead, ship no tag). This must be decided *before* work
  begins, not during a blocker. Without a pre-committed rollback, a polecat
  hitting a Radix+React-19 blocker at 80% through Phase 3 will either
  spiral trying to fix it (scope balloon) or bail without a clean abort trail.
  **Suggested question:** "What's the explicit abort criterion — e.g., 'if
  any single blocker costs more than 4 hours, park the branch, file a bead,
  and exit with no tag'?"

### Important Considerations

- **`force-dynamic` / caching boundary with Deploy is the one real scope
  overlap.** Open Question #5 captures this well: the Next 16 caching model
  replaces implicit fetch cache with `'use cache'` + `cacheLife`/`cacheTag`.
  The Deploy PRD wants `force-dynamic` on `/grades`. The PRD's instinct
  ("leave to Deploy") is right *unless* the upgrade itself silently changes
  `/grades` freshness behavior — in which case shipping an upgrade that
  makes `/grades` stale, and then separately fixing it in Deploy, is two
  projects' worth of debugging conflated. Recommend the PRD commit to:
  "smoke test must explicitly verify `/grades` reflects a DB mutation on
  refresh; if it doesn't, `force-dynamic` moves into this project."

- **"Phase 2: React 19 first, on Next 14" is a bet, not a given.**
  The Rough Approach assumes React 19 works on Next 14. Next 14 was released
  before React 19 stabilized; the `react` peer-dep in `next@14.2.35` may
  be `^18`. If so, Phase 2 produces a peer-dep warning or a hard failure
  and the sequencing collapses. Worth confirming the React-19-on-Next-14
  compatibility claim before committing to the staged approach, otherwise
  Phase 2 and Phase 3 must merge (bigger, harder to bisect).

- **"The 14 → 16 vs. 15 → 16 decision" is load-bearing and deferred.**
  Open Question #1 acknowledges PLAN.md says 15 → 16 while `package.json`
  says 14. Skipping Next 15 means skipping one generation of codemods and
  one generation of App Router default flips (e.g., `fetch` cache default
  changed between 14 and 15). A direct 14 → 16 jump is riskier than two
  sequential majors — but two majors is two projects, not one. Decide
  before Phase 1, because "which codemod chain to run" depends on it.

- **`react-icons ^5.6.0` and `next-themes ^0.4.6` lumped with Radix is a
  category error.** `react-icons` is stateless, SVG-only — unlikely to block
  on React 19. `next-themes` wraps `useEffect` + context and *is* the kind
  of library that breaks on React 19's stricter effect semantics. They need
  separate scope treatment; Phase 4 currently bundles all "transitives" as
  one step, which obscures the risk concentration.

- **The `v0.6-modernization-complete` tag is on `main`** per the PRD, but
  the polecat model says Refinery merges from MQ and the polecat never
  pushes to main. Who creates the tag, when, and on which commit? If the
  polecat tags before Refinery merges, the tag is on an unmerged SHA.
  Needs a one-line answer in a "Handoff to maintainer" subsection.

### Observations

- **Non-Goals are exemplary.** Tailwind 4, Prisma, shadcn re-seed,
  `next-themes` bump, tests, deploy, bundle audit, caching redesign all
  explicitly out. This is unusually disciplined and should be held up as
  the model for future PRDs.

- **"Day-after-launch" is N/A here** — there is no launch, only a local
  tag. The useful analogue is "what will the *Deploy* project ask for?"
  Answer: (a) `force-dynamic` on `/grades` behavior confirmed, (b) Node
  version recorded so the Deploy runtime target matches, (c) any lockfile
  peer-dep suppressions documented so Deploy doesn't inherit mystery
  `--legacy-peer-deps` flags. The PRD covers (a) and (b) implicitly; (c)
  should be made explicit as a deliverable.

- **The "Tailwind 3 → 4 follow-on bead" is the right seam.** Good natural
  phase boundary. No concerns.

- **Two-person scope: maintainer + Shuhan.** The PRD is crisp about this.
  No stakeholder surprise risk.

- **The adversarial scenarios section (`useFormState` rename, Radix peer)
  is a strong pattern.** More PRDs should include "here's a thing that
  probably won't happen but if it does, here's the triage."

- **"One polecat or phased?" (Open Question #10)** — the PRD's instinct
  (P1 deps+types, P2 Next config, P3 smoke+tag) maps to Phases 1–5 of the
  Rough Approach, which suggests this is really "one polecat, three
  commits" rather than "three separate polecats." Worth saying explicitly.

## Confidence Assessment

**Medium-High.** The scope is unusually well-defined for a PRD at this
stage: Non-Goals are explicit and justified, the MVP is concrete, the
verification criteria are falsifiable, and the Rough Approach has a clear
abort-shaped escape hatch. The genuine scope risks are concentrated in two
places — transitive-dep creep (Radix / ESLint / lucide) and the caching /
`force-dynamic` boundary with Deploy — and both are named as open
questions. The gap is that they are not yet *decisions*. A pre-commit
answer to "what's our rule when a transitive upgrade is itself a major?"
and "is the ESLint 9 flat-config migration in scope?" would move this
from "well-scoped intake" to "ready to dispatch."

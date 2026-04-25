# Plan-Review Round 3: coherence (FINAL)

_Date: 2026-04-25 · Reviewer: web_ui/polecats/dementus (bead `wu-9qz`)._

Plan reviewed: `.designs/deploy/design-doc.md` post plan-review r2 (commit
`f2948a5`).

## Scope of this review

Final holistic / coherence pass. Checks:
- Internal contradictions across the 5 prior fix rounds (prd-align r1–r3,
  plan-review r1–r2).
- Naming / path consistency.
- Architecture coherence — pieces fit into a working system.
- Missing glue / integration points between phases.
- Completeness delta after 5 prior rounds.
- Overall readability.
- Cross-round artifact alignment — do plan-approval-gate carry-forwards
  in r1+r2 actually map to design-doc.md text?

This is review-only; no edits to the plan.

## Findings

### Must-fix

**ISSUE — `npm run reseed` script path is broken; would fail at B9.**
- Severity: must-fix
- Where: lines 132 (§Key Components) and 563 (B2 spec). Both render the
  script as `prisma db seed && git add prisma/dev.db ../data/seed/grades.json`.
  Line 164's "Reseed-to-live developer workflow" example also implies
  this command via `npm run reseed`.
- Why broken: the actual seed JSON lives at `web/data/seed/grades.json`,
  not `<repo-root>/data/seed/grades.json`. The script runs from `web/`
  (the script is in `web/package.json`), so `../data/seed/grades.json`
  resolves to `<repo-root>/data/seed/grades.json` — a path that does not
  exist. Verified: `ls ../data/seed/grades.json` from `web/` returns
  "No such file or directory"; `ls data/seed/grades.json` from `web/`
  finds the file.
- Why this matters now (not just at B9): B2 acceptance includes
  "`npm run reseed` exits 0 in a smoke run." That smoke run will fail
  with `fatal: pathspec '../data/seed/grades.json' did not match any
  files`, which would block B2 close and ripple into B8c/B9. Worse,
  if the polecat works around it by dropping the path from the script,
  R6 mitigation (forgotten `git add` of the JSON alongside dev.db)
  silently regresses.
- Suggested fix: change `../data/seed/grades.json` →
  `data/seed/grades.json` (no `..`) in both line 132 and line 563. The
  PRD §Constraints reference `data/seed/grades.json` should also be
  read as web-relative; line 164 stays acceptable (the workflow example
  reads naturally from inside `web/`). Cross-check: B1.5's
  `web/data/seed/grades.json` (lines 275, 543) is repo-relative and
  correct as-is.

**ISSUE — `web/next.config.mjs` ordering between B2 and B8b is asserted
in prose but not enforced by the bead graph.**
- Severity: must-fix
- Where: §Key Components lines 148–153 ("`web/next.config.mjs` is
  touched by **B2** … and **B8b** … — both single-purpose additions;
  B2 lands first and B8b appends or B8b folds into B2's commit if both
  fixes are landed simultaneously"); contradicted by the bead graph
  (lines 718–741) which shows B8b depending only on B0, parallel with
  B2.
- Why broken: in the conditional case where B1(d) requires the
  `outputFileTracingIncludes` fix (folded into B2 per the r2 R-M1 fix
  at lines 519–522), both B2 and B8b modify `web/next.config.mjs`. If
  the witness dispatches them in parallel — which the graph permits —
  the second commit hits a merge conflict against `next.config.mjs`,
  forcing a rebase mid-deploy-prep. The "B2 lands first" statement in
  prose is a coordination wish, not a graph constraint.
- Why this slipped through r1+r2: r1 split B8 into B8a/B8b/B8c and
  decoupled B8b from any code-touching bead (S-F3 fix). r2 added the
  B1(d) probe → next.config.mjs fold-into-B2 path (R-M1 fix). The
  intersection — both end up writing the same file — was created by
  r2 but not graph-resolved.
- Suggested fix (lighter): in B8b's spec (lines 638–653), add an
  explicit coordination clause: "If B1(d) required `next.config.mjs`
  to land in B2, B8b rebases on top of B2's commit before opening; the
  `headers()` block appends below `outputFileTracingIncludes`. If B1(d)
  did not require `next.config.mjs`, B8b creates the file from
  scratch." Keeps the parallel-fan-out shape.
- Suggested fix (stricter): make B8b conditionally depend on B2 in the
  B1(d)-fold-in branch ("Depends on: B0; if B1(d) required
  next.config.mjs → also depends on B2 main-merge"). Removes the race
  entirely at the cost of a ~1-bead serialization on the
  worst-probe-outcome branch only.

### Should-fix

**ISSUE — §Key Components file list omits `web/app/robots.ts`.**
- Severity: should-fix
- Where: §Key Components "Code edits in `web/` (B2-B8b)" enumerates
  11 file touches (lines 104–135). It names `web/next.config.mjs` for
  B8b's `headers()` addition, but does not list the new
  `web/app/robots.ts` file that B8b's spec adds (line 643: "a static
  `web/app/robots.ts` (Next 13+ MetadataRoute) returning a
  disallow-all `Robots` object").
- Why this matters: §Key Components is the single-glance reference of
  "what files change in this project." A reader scanning it to scope
  diff size or to confirm "no new files in app/" would miss the only
  net-new app/ file in the project. Also makes the "roughly seven
  files change in `web/`" claim in §Executive Summary (line 18)
  harder to audit.
- Suggested fix: add `web/app/robots.ts` — new file (B8b),
  Next 13+ MetadataRoute returning `{ rules: { userAgent: '*',
  disallow: '/' } }`. Place after the `web/app/error.tsx` line in
  the §Key Components list.

**ISSUE — B6 gating rationale technically misstates the pivot risk.**
- Severity: should-fix
- Where: B6 spec line 609 ("Depends on: B1 green. (Touches a Prisma
  query shape; pivot to Option B would re-shape the query, so keep
  gated.)").
- Why misleading: §Data Model (line 223) states the Option B pivot
  inherits this schema with "a one-line `provider` switch in
  `schema.prisma`, unchanged seed script, unchanged seed JSON." Adding
  `hasAssignments: boolean` to `fetchAllSubjects` (whether via
  `_count` aggregation or via the relation) is a Prisma client query
  change that works identically on SQLite and Postgres — there is no
  "re-shape" needed on pivot. The honest reason to gate B6 on B1 is
  *"avoid wasted work if pivot consumes the deadline window."* That
  reason is fine, but the parenthetical claims a technical
  incompatibility that doesn't exist.
- Why r1's S-F3 fix didn't catch this: S-F3 decoupled B3/B4/B5/B7
  from B1 with the rationale "pure UI/routing; survives a B1-failure
  pivot." B6 was deliberately kept gated, but the kept-gating
  rationale was waved through without the same scrutiny.
- Suggested fix: rewrite the B6 parenthetical as
  "*(Reads from Prisma; if B1 fails and we pivot to Option B, this
  bead's polecat re-runs against the pivoted client. Gating avoids
  wasted work in the pivot branch.)*" — or fully decouple B6 to
  depend only on B0 and trust the polecat to retest post-pivot.

**ISSUE — B8a omits the "no Vercel account yet" branch despite
plan-approval gate carry-forward item #6.**
- Severity: should-fix
- Where: B8a spec lines 618–636. First procedural step is "Create
  Vercel project; link GitHub repo (`shuhan-study/web_ui`)…" which
  presupposes an existing Vercel account.
- Why this matters: §Open Questions #3 (lines 312–314) explicitly
  defers account ownership to "B8 starts with an account-creation
  step if not — that's the earliest natural point." Plan-review r1's
  carry-forward item #6 reaffirms: "B8a starts with creation if
  account/link doesn't pre-exist." Neither claim is reflected in
  B8a's text. A polecat picking up B8a will hit a missing-precondition
  surprise if the overseer has not pre-created the account, and
  there's no acceptance line covering the create-then-link path.
- Suggested fix: insert one bullet at the top of B8a's procedural
  list — "If no Vercel account exists for the GitHub user/org,
  create one (~30s sign-up flow, free Hobby tier); record the
  account-creation outcome in bead notes alongside the project URL."

**ISSUE — B11 "no transitive lockfile changes" criterion has no
verification surface.**
- Severity: should-fix
- Where: B11 spec lines 709–714. Plan-review r2's S5 fix tightened
  the fold-in criterion to "patch-level only AND no transitive
  lockfile changes outside the patched package's tree." But the spec
  names neither *who verifies this* nor *what artifact proves it.*
- Why this matters: the criterion exists to keep B8c off the
  critical path of unrelated dependency churn, but a polecat reading
  B11 has no procedural test. The most-likely failure mode is the
  polecat eyeballing the `package.json` diff (which is one line by
  construction — B11 is gated on patch-level) and folding into B8c
  without inspecting `package-lock.json`, where transitive changes
  actually live.
- Suggested fix: add a one-line acceptance step — "Run `npm install`
  post-bump; inspect `package-lock.json` diff. If diff touches only
  the patched package's `node_modules/<pkg>` subtree, fold into B8c.
  Otherwise defer to a post-Deploy bead and record the lockfile
  diff in the deferred bead's notes."

## Observations (not findings)

**O-3-1 — Round-2 R-S2 gate-defaults table is intentionally absent
from design-doc.md.** The "default-yes/default-no" defaults table
(plan-review r2 verdict, lines 121–129) lives only in the round-2
review log and is routed to the plan-approval mail (Blocker-2
contract). This is intentional ("not applied here") and the gate
mail is the right home for it. Surfacing here only because the
review prompt asked specifically about cross-round carry-forward
mapping; this is the one r1+r2 carry-forward item that doesn't
appear in design-doc.md and that's correct by design.

**O-3-2 — §Key Components prose acknowledges the next.config.mjs
intersection ("B2 lands first and B8b appends…") which suggests the
authors saw the issue but resolved it editorially rather than
graph-structurally.** That's the root of must-fix #2 above. Fix
preference is whichever the create-beads phase finds easier to
encode in real bead dependencies.

**O-3-3 — §Executive Summary line 18 still claims "roughly seven
files change in `web/`" but the actual count post-r1+r2 is closer to
nine (`.gitignore`, `prisma/dev.db`, `prisma/schema.prisma`,
`app/grades/page.tsx`, `app/subject/[id]/page.tsx`, `app/page.tsx`,
`components/navbar/Navbar.tsx`, `components/subjects/SubjectCard.tsx`,
`app/error.tsx`, `package.json`, `next.config.mjs`,
`app/robots.ts`).** Not a coherence issue per se — the summary
line uses "roughly" and the count is naturally fuzzy under the
B1(d)-conditional next.config.mjs fold-in. Surfaced for cosmetic
fix at the same time as must-fix #2 if the editor is rewriting the
neighborhood.

## Cross-round carry-forward mapping check

| # | r1+r2 Carry-Forward Item                  | Maps to design-doc       |
|---|-------------------------------------------|--------------------------|
| 1 | B10 tag-cut actor                         | ✅ B10 spec, OQ #4       |
| 2 | Seed anonymization yes/no                 | ✅ B1.5 + B8a + R3 + OQ #2 |
| 3 | `npm run reseed` ratification             | ✅ B2 + §Decisions Made  |
| 4 | `robots.txt` + `noindex` ratification     | ✅ B8b + §Decisions Made |
| 5 | R9 deadline framing                       | ✅ §Risks/R9             |
| 6 | O-1 6-scenario smoke opt-in               | ✅ B9                    |
| 7 | Vercel account creation                   | ⚠ OQ #3 only — see should-fix above (B8a omits) |
| – | R-S2 gate defaults table                  | – Intentional (gate mail), see O-3-1 |

All r1+r2 substantive carry-forwards reach design-doc.md text
except #7's branch handling, captured as a should-fix above.

## Round 3 verdict

**2 must-fix + 4 should-fix.** Plan is otherwise coherent;
naming is consistent across the 808-line design-doc; the B0…B11
graph is sound after r1's decoupling and r2's probe→main fidelity
clause. The two must-fixes are both small, surgical text edits
(broken script path; one race-coordination clause) — neither
re-opens prior decisions or rewrites the bead graph. After fixes,
plan should be ready for the manual plan-approval gate.

LABELS: review-only, wu-avk-plan-review-3

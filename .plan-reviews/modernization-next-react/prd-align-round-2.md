# PRD Alignment Round 2 — Constraints + Non-Goals

**Date:** 2026-04-21
**Workflow:** `mol-idea-to-plan` step 6 (`prd-align-2`)
**Project:** Modernization — Next 14.2.35 → 16 + React 18 → 19
**Orchestrator:** shuhan/crew/shuhan (Sherpa)
**Review path:** B1 — adapted commands (same as round 1)

## Polecats dispatched

| Wisp | Polecat | Focus | Report |
|---|---|---|---|
| `wu-a28` | web_ui/polecats/furiosa | constraints-compliance | hq-wisp-b7n3 |
| `wu-cfa` | web_ui/polecats/nux | non-goals-enforcement | hq-wisp-dz8k |

Both polecats ran in parallel against the post-round-1 `main` (`fb74a92`), reading PRD, design-doc, and round-1 change log. Read-only reviewers; both wisps closed with `Close reason: no-changes`.

## Headline

- **0 VIOLATED (must-fix) / 0 SCOPE-CREEP (must-fix)**
- **6 should-fix** — all on scope-clarity edges, not delivery
- Strong convergence on findings #1 and #2 (both polecats independently flagged)

## Findings and applied fixes

### Finding 1 — Bundle-size capture softens NG9

**Source:** Both polecats (C and D converged). **Severity:** should-fix.

PRD Non-Goal is explicit: "No bundle-size audit or perf work." The design captures `.next/static` size (Phase 1 step 6), diffs it (Phase 5 step 4), and hedges in the Risks table ("not a hard gate unless severe"). The hedge invites the polecat to judge "severe," which is itself bundle-audit work.

**Applied to `design-doc.md`:**

- Risks table "Bundle size 2× blow-up" row, Mitigation cell: explicit "Single regression-detection data point, not a bundle audit — no optimization work performed regardless of value. Any action deferred to a follow-on bead under Modernization v2."

### Finding 2 — OQ #1 default behavior unpinned

**Source:** C flagged once; D flagged it twice (once per optional field). **Severity:** should-fix.

OQ #1 asks the maintainer to approve adding `postinstall: "prisma generate"` and `engines.node: ">=20.9"`. Both are "(optional)" in Phase 2 step 1 and "Recommend: yes." If the maintainer doesn't answer before dispatch, a polecat reading "Recommend: yes" may include them by default, adding scope that the PRD did not ask for (beyond literal framework bump).

**Applied to `design-doc.md`:**

- Appended to OQ #1: "If unresolved at dispatch time, the polecat does NOT add `postinstall` or `engines.node`; defaults stay out and a follow-on bead 'Add postinstall + engines.node pin' is filed under Modernization v2."

### Finding 3 — C6 vs NG6 theme-flash override implicit

**Source:** Polecat C only. **Severity:** should-fix.

PRD Constraint C6 says "no user-visible regressions allowed." NG6 says "no next-themes bump unless it breaks," and "breaks" excludes theme flash. Plan shipping a persistent flash IS a user-visible degradation, resolving C6/NG6 in favor of NG6 — but the override is implicit. Execution risk: maintainer objects at smoke time.

**Applied to `design-doc.md`:**

- Appended to the "Unless it breaks" bullet under Decisions Made: theme flash falls outside C6 because C6's worked example is "lost theme toggle" (loss, not degradation); flash is a cosmetic mount-time glitch tolerated here and owned by the deferred `next-themes` bead.

### Finding 4 — Force-dynamic fallback scope justification missing

**Source:** Polecat D only. **Severity:** should-fix.

PRD OQ5 stated instinct was "leave to Deploy." Plan commits to adding `force-dynamic` conditionally if mutate-probe shows stale data. A reader could read this as quiet scope expansion into the Deploy project's domain without the explicit PRD-clause tie-off.

**Applied to `design-doc.md`:**

- Appended to Key Components "Freshness fallback" bullet: the override is active **only** when the mutate-probe shows a live regression; if freshness is intact, no annotation is added and the caching question remains Deploy's.

### Finding 5 — `@types/node → ^22` unjustified

**Source:** Polecat D only. **Severity:** should-fix.

Next 16 requires Node 20, not 22. React 19 doesn't force ^22 types. Phase 2 step 1 listed "(optional) @types/node → ^22" without citing a specific forcing dependency — an unjustified version bump.

**Applied to `design-doc.md`:**

- Phase 2 step 1: changed to "`@types/node` → `^20` (match Next 16 Node floor; bump only if a specific Next 16 / React 19 type dependency forces ^22)".

### Finding 6 — Mutate-probe seed-data revert (low-severity nit)

**Source:** Polecat D only. **Severity:** should-fix (low).

Phase 5 step 3 mutate-probe doesn't specify reverting the mutated row. A stale test-mutation left in seed data would breach PRD NG2 ("seed data unchanged").

**Applied to `design-doc.md`:**

- Phase 5 step 3 mutate-probe bullet: appended "Revert the mutated row to its seeded value after the probe, or re-run `npx prisma db seed`."

## Methodology

Same as round 1 — option-c consolidated batch patch; wisps read-only; fix-application owned by orchestrator.

## Convergence signal

Round 2 convergence map:

| Finding | C | D |
|---|---|---|
| Bundle-size softening (#1) | ✓ | ✓ |
| OQ #1 default (#2) | ✓ | ✓✓ (split into two entries) |
| Theme flash override (#3) | ✓ | — |
| Force-dynamic justification (#4) | — | ✓ |
| @types/node ^22 (#5) | — | ✓ |
| Mutate-probe revert (#6) | — | ✓ |

Convergence strongest on #1 and #2 (matches round 1's pattern). Non-convergent findings reflect the different remits: C looks for constraint violations (policy-level), D walks every plan item for scope-creep (line-level).

## Verdict after round 2

The plan has emerged from round 2 with zero new decisions changed and zero delivery paths altered. All six fixes are **scope-clarity additions** — one-sentence tie-offs that close ambiguity between plan actions and PRD clauses. The design-doc already "knew" where it was dancing near the fence (OQ #1 self-flagged, force-dynamic was self-flagged as conditional, bundle-size was self-hedged as "not a hard gate"); round 2 simply added the missing "in scope because / out of scope because" citations.

**Cumulative plan health after rounds 1 and 2:** 11 should-fix items applied across two rounds, 0 must-fix in either round. The plan is internally coherent, PRD-aligned, and scope-clean.

## Next step

Round 3 (`prd-align-3`): user-stories-coverage + open-questions-resolution, reviewing the post-round-2 plan.

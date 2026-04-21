# PRD Alignment Round 1 — Requirements + Goals

**Date:** 2026-04-21
**Workflow:** `mol-idea-to-plan` step 5 (`prd-align-1`)
**Project:** Modernization — Next 14.2.35 → 16 + React 18 → 19
**Orchestrator:** shuhan/crew/shuhan (Sherpa)
**Review path chosen:** B1 — adapted commands (see commit trail for reason)

## Polecats dispatched

| Wisp | Polecat | Focus | Report |
|---|---|---|---|
| `wu-xu2` | web_ui/polecats/furiosa | requirements-coverage | hq-wisp-1rab |
| `wu-j21` | web_ui/polecats/nux | goals-alignment | hq-wisp-ykpk |

Both polecats ran in parallel against a fresh `web_ui/main` checkout, read `.prd-reviews/modernization-next-react/prd-draft.md` + `.designs/modernization-next-react/design-doc.md`, and mailed structured reports back. No file modifications by polecats (read-only reviewers). Both wisps closed cleanly with `Close reason: no-changes`.

## Headline

- **0 GAP / MISALIGNED (must-fix)**
- **0 must-fix PARTIAL**
- **5 should-fix PARTIAL** — all on *falsifiability* edges, not *delivery* edges

Both polecats converged on findings #1 and #2 independently (strongest signal). Findings #3–5 are from the broader requirements review (polecat A); #5 is a PRD-vs-design text mismatch rather than a plan deficiency.

## Findings and applied fixes

### Finding 1 — G2 build-warning delta not operationalized

**Source:** Both polecats. **Severity:** should-fix.

The plan captures a build-output baseline (Phase 1 step 2) and requires `npm run build` green (Phases 4+5), but no Phase 5 step diffs the post-upgrade build output against baseline. A Next 14 → 16 bump predictably introduces new deprecation warning classes that would pass silently.

**Applied to `design-doc.md`:**

1. New bullet under *Decisions Made* → **Build-warning delta bar**: new warning *classes* (not count) must be acknowledged in the smoke delta or filed as a follow-on bead.
2. New Phase 5 step **2a** between current steps 2 and 3: diff build output against baseline; net-new warning without acknowledgement fails the smoke gate.

### Finding 2 — G3 browser-console smoke + baseline server-log scope

**Source:** Both polecats. **Severity:** should-fix.

Two sub-issues:

- Decision "fail on `console.error` in browser" lives in *Decisions Made* but is never translated into a line-item in the Phase 5 maintainer smoke checklist. A literal checklist executor never opens DevTools.
- Phase 1 step 3 captures 10s of cold-start server log only; Phase 5 step 1 diffs the full cold-start + route-serving window. Every Phase 5 route request would trip the gate under a literal reading of "any new server-log entry."

**Applied to `design-doc.md`:**

1. Phase 1 step 3 widened: baseline capture now covers cold-start **plus** `/`, `/grades`, `/subject/[id]` once each, framed as the canonical diff anchor for Phase 5.
2. Phase 5 step 2 polecat curl probe extended from `/grades` only to all three routes (first seed-id for `/subject/[id]`).
3. New bullet in Phase 5 step 3 maintainer smoke: open DevTools Console on each of the three routes, diff against baseline; deprecation warns tolerated but noted.

### Finding 3 — v0.6 tag ownership undecided

**Source:** Polecat A only. **Severity:** should-fix.

Design Open Question #1 left "who cuts `v0.5-pre-modernization` and `v0.6-modernization-complete`" open for maintainer confirmation. Since the PRD's completion criterion hinges on this tag, leaving ownership unresolved means "done" is operationally ambiguous.

**Applied to `design-doc.md`:**

1. OQ #1 removed from *Open Questions* and promoted to a *Decisions Made* bullet — **Tag ownership**: the maintainer cuts both tags; Refinery does not. Remaining OQs renumbered from 2–5 to 1–4.
2. Key Components *Pre-upgrade anchor tag* line updated from "cut by maintainer or Refinery, not by the polecat" to "cut by the maintainer — see Tag ownership decision" (consistency cleanup).

### Finding 4 — C3 Tailwind 3 escalation path underspecified

**Source:** Polecat A only. **Severity:** should-fix.

PRD C3 says "hard stop" for Tailwind 3 + Next 16 incompatibility unless escalated to include Tailwind 4. Design-doc only had the generic 4-hour abort rule, which would auto-park the branch instead of escalating to the maintainer for a scope decision. Also no explicit Tailwind compatibility probe step.

**Applied to `design-doc.md`:**

1. New Phase 4 step **2** (renumbering old 2–5 to 3–6) — explicit Tailwind 3 on Next 16 compatibility probe: `.next/static/css` bundle produced, utility classes resolve in rendered HTML, no PostCSS errors.
2. New bullet under *Decisions Made* immediately after the 4-hour abort rule — Tailwind-3 incompatibility is a scope escalation (to maintainer for Tailwind-4-inclusion decision), not an auto-abort.

### Finding 5 — C4 PRD vs design-doc contradiction on browser smoke ownership

**Source:** Polecat A only. **Severity:** should-fix.

PRD C4 says "the polecat must actually exercise the app in a browser." Design-doc explicitly reassigns browser smoke to the maintainer (polecats lack GUI browsers — a reasoned decision). The two texts contradict. Review chose **PRD amendment** over **design override note** (see *Methodology* below).

**Applied to `prd-draft.md`:**

1. PRD Constraint C4 amended to explicitly name the polecat/maintainer split: build + `dev` cold-start + curl probes are polecat gates; browser smoke (theme toggle, flash, font load, error-boundary, mutate-probe) is a maintainer pre-tag gate. The "don't declare victory when `tsc` is quiet" principle is preserved in the new language — a polecat passing machine gates is NOT done until the maintainer runs the browser checklist.

## Methodology

- **Option-c consolidation** (human preference): all 5 findings drafted as a single batch patch, reviewed and approved in one pass. No per-fix approval ping-pong.
- **PRD amendment over design override** (human preference, finding #5): single source of truth is cleaner than a textual override note in the design-doc.
- **Review wisps were read-only**: polecats instructed to mail reports, not edit files, so fix-application is owned by the orchestrator after consolidating both reports.

## Convergence signal

Polecats A and B independently flagged findings #1 and #2 as the largest gaps — strongest signal that those are real, not noise. The 3 A-only findings fall in areas polecat B's "goals" remit didn't cover (constraints, tag ownership).

## Verdict after round 1

The plan was well-aligned before round 1 — zero must-fix gaps is unusually strong coming out of a first alignment pass. All 5 applied fixes tighten the *falsifiability* of the invisibility bar rather than changing any substantive delivery path. The "baseline captures everything; Phase 5 diffs it" architecture is now consistently closed at every point the PRD declares a quality bar.

## Next step

Round 2 (`prd-align-2`): constraints-compliance + non-goals-enforcement, reviewing the post-round-1 plan.

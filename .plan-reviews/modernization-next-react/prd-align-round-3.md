# PRD Alignment Round 3 — User Stories + Open Questions

**Date:** 2026-04-21
**Workflow:** `mol-idea-to-plan` step 7 (`prd-align-3`) — final PRD-alignment round
**Project:** Modernization — Next 14.2.35 → 16 + React 18 → 19
**Orchestrator:** shuhan/crew/shuhan (Sherpa)
**Review path:** B1 — adapted commands (same as rounds 1, 2)

## Polecats dispatched

| Wisp | Polecat | Focus | Report |
|---|---|---|---|
| `wu-9wg` | web_ui/polecats/furiosa | user-stories-coverage | hq-wisp-91nr |
| `wu-kzl` | web_ui/polecats/nux | open-questions-resolution | hq-wisp-cel6 |

Both polecats ran in parallel against the post-round-2 `main` (`951470b`), reading PRD, design-doc, and rounds 1+2 change logs. Read-only reviewers; both wisps closed with `Close reason: no-changes`.

## Headline

- **0 GAP / UNRESOLVED (must-fix)**
- **1 should-fix PARTIAL** — narrowest round yet
- Open-questions audit: **all 36 questions resolved or explicitly deferred** across 3 pools (PRD-originating, review-raised, plan-originating)

## Finding and applied fix

### Finding 1 — Maintainer CLI prereqs missing from smoke checklist

**Source:** Polecat E only. **Severity:** should-fix.

The maintainer's user-story journey depends on the CLI prerequisites `git pull --rebase && npm ci && npx prisma generate && npm run dev`. These live in the design-doc's §Interface section. But Phase 5 step 3 tells the polecat to populate `notes/modernization-smoke.md` with the smoke checklist, and the populated smoke doc is what the maintainer actually opens and reads during smoke — not the design-doc itself.

Round 2 finding #2 locked in the default "polecat does NOT add `postinstall`/`engines.node` if OQ #1 is unresolved at dispatch." That makes `npx prisma generate` a **manual** CLI step. If the smoke doc doesn't reproduce it at the top, a maintainer running the checklist literally will skip it and may hit stale Prisma client confusion.

This is the "literal checklist executor" pattern already surfaced in round 1 finding #2 — policies living in §Decisions Made that never made it to the user-facing checklist. Round 3 finds one more instance of the same pattern at the CLI-prereqs layer.

**Applied to `design-doc.md`:**

- Phase 5 step 3: prepended a "CLI setup" block to the populated smoke-doc template, reproducing the §Interface prereqs (`git pull --rebase`, `npm ci`, `npx prisma generate`, `npm run dev`) with an inline comment noting the `prisma generate` conditional (skippable if OQ #1 opts into `postinstall`).

## Methodology

Same as rounds 1 and 2 — option-c consolidated batch patch; wisps read-only; fix-application owned by orchestrator.

## Non-findings (observational, not patched)

Polecat F noted: only design-OQ #1 has an explicit "if unresolved at dispatch, polecat does X" pin. OQs #2/#3/#4 have clear recommendations but not the same dispatch-time safety clause. Polecat F explicitly classified this as observational, not a finding — OQ #2's recommended path is already a deferral (accept broken lint, file bead), and OQs #3/#4 affect only maintainer-smoke language. No patch applied.

## Open-questions coverage summary

| Pool | Count | RESOLVED | DEFERRED-OK | UNRESOLVED |
|---|---:|---:|---:|---:|
| PRD §Open Questions | 10 | 9 | 1 | 0 |
| Review-synthesis Q1–Q8 | 8 | 8 | 0 | 0 |
| Review "Important-But-Non-Blocking" | ~14 | 10 | 4 | 0 |
| Design-doc §Open Questions (post-round-2) | 4 | 0 | 4 | 0 |
| **Total** | **36** | **27** | **9** | **0** |

Every question lands on RESOLVED or DEFERRED-OK. The plan is dispatch-ready.

## Verdict after round 3

**PRD alignment is complete.** Three rounds, zero must-fix findings in any round, 12 should-fix applied cumulatively. The plan:

- Covers every requirement, goal, constraint, non-goal, user story, and adversarial scenario.
- Respects every hard prohibition (no Tailwind 4, no Prisma major, no deploy, no test infra, no `'use cache'`, no `--legacy-peer-deps`, no transitive majors).
- Answers or explicitly defers every open question, with named downstream owners for the deferrals.
- Has a falsifiable verification architecture (baseline capture + diff at every gate) that we tightened progressively across the 3 rounds.

Cumulative rounds 1–3:
- Round 1 (requirements + goals): 5 should-fix applied
- Round 2 (constraints + non-goals): 6 should-fix applied
- Round 3 (user-stories + open-questions): 1 should-fix applied
- **Total: 12 should-fix applied, 0 must-fix in any round**

## Next step

Step 8: `plan-review-1` (completeness + sequencing) — first of three plan self-review rounds. These rounds review the plan **against itself** (internal quality), not against the PRD. Same 2-polecat-parallel pattern.

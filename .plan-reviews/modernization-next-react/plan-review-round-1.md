# Plan Self-Review Round 1 — Completeness + Sequencing

**Date:** 2026-04-21
**Workflow:** `mol-idea-to-plan` step 8 (`plan-review-1`) — first plan self-review round
**Project:** Modernization — Next 14.2.35 → 16 + React 18 → 19
**Orchestrator:** shuhan/crew/shuhan (Sherpa)
**Review path:** B1 — adapted commands (same as PRD-align rounds 1–3)

## Polecats dispatched

| Wisp | Polecat | Focus | Report |
|---|---|---|---|
| `wu-cqh` | web_ui/polecats/furiosa | completeness | hq-wisp-e4bb |
| `wu-vr4` | web_ui/polecats/nux | sequencing | hq-wisp-kj8f |

Both polecats ran in parallel against the post-PRD-align `main` (`ae05154`), reading design-doc and rounds 1–3 change logs. Read-only reviewers; both wisps closed cleanly.

## Headline

- **2 must-fix** (first round to surface must-fix findings)
- **12 should-fix**
- Both must-fix are **second-order consequences of earlier-round decisions** — exactly what plan self-review is designed to catch

## Why this round mattered

The PRD-alignment rounds asked "does the plan match what the PRD wants?" The plan self-review rounds ask "does the plan actually execute cleanly?" These are orthogonal questions. The two must-fix findings here would have been invisible to the PRD-align lens because they're about **execution mechanics** — operational gaps created when earlier rounds tightened policy.

## Findings and applied fixes

### MUST-FIX 1 — Browser-console baseline has no executor

**Source:** Polecat G (completeness). **Severity:** must-fix.

Phase 1 step 4 told the polecat to capture browser-console output per route. But round 1's PRD C4 amendment + design "Polecat stops at build green" decision pinned the polecat out of browser work. Yet round 1 finding #2 added a Phase 5 maintainer DevTools-diff step that needs a browser-console **baseline** to diff against. The plan had no path to produce the baseline — neither polecat nor maintainer was assigned the duty.

**Applied to `design-doc.md`:**

- Decisions Made → Tag ownership bullet **renamed and extended** to "Tag ownership + browser-console baseline." The maintainer now also captures the browser-console baseline on `/`, `/grades`, `/subject/[id]` into `notes/modernization-baseline.md` and commits it to `main` *before dispatching the polecat*. All human-side pre-dispatch duties grouped in one decision.
- Phase 1 step 4 → step 5: rewritten from "capture browser console" to "verify the maintainer-captured section already exists; escalate if missing."
- Phase 1 new step 0: pre-flight verification that `v0.5-pre-modernization` tag AND `notes/modernization-baseline.md` (with browser sections) both exist on `main` before proceeding. Escalates with `gt escalate -s HIGH` if either missing.

### MUST-FIX 2 — `npx prisma generate` never runs in polecat workflow

**Source:** Polecat G (completeness). **Severity:** must-fix.

Round 2 finding #2 defaulted OQ #1 to "polecat does NOT add `postinstall` if unresolved at dispatch." Round 3 finding added `prisma generate` to the **smoke-doc CLI prereqs** (for the maintainer's reading). But the polecat's own Phase 2–5 workflow never explicitly runs it. With `web/package.json` having no existing `postinstall`, the Prisma client is never generated. Phase 4 build, Phase 5 dev cold-start, and Phase 5 `npm run start` all depend on a current Prisma client — they'd fail mid-phase with confusing runtime errors.

This finding is a direct consequence of round 2's correct scope decision; it just exposed a manual step that nobody had written down for the polecat's path.

**Applied to `design-doc.md`:**

- Phase 2 new step 5: explicit `npx prisma generate` (conditional on OQ #1 not opting into `postinstall`). Renumbered subsequent step.
- Phase 5 step 1 preamble: "if resuming from a killed session, re-run `npx prisma generate` first" — handles the resume-after-kill case.

## Should-fix findings (12) and applied fixes

| # | Finding | Source | Applied |
|---|---|---|---|
| 3 | `.next/` cache not cleaned between Next 14 and Next 16 builds; cross-major stale-cache risk | G | Phase 2 step 2: extended delete list to include `web/.next` |
| 4 | Codemods (`types-react-codemod`, `@next/codemod`) prompt interactively → polecat would hang | G | Phase 3: added non-interactive invocation note covering both commands |
| 5 | `v0.5` tag not verified before Phase 2 destructive edits; if maintainer forgets, no rollback anchor | G | Folded into Phase 1 new step 0 (pre-flight) — covers both must-fix #1 verification AND tag verification |
| 6 | 4-hour abort park procedure under-specified (push branch where? what `gt done` flag?) | G | Decisions Made: appended explicit "Park procedure" sub-bullet (`git push origin HEAD:polecat/modernization-parked-<YYYYMMDD>`, `gt done --status DEFERRED`, file resume bead) |
| 7 | `notes/modernization-smoke.md` skeleton structure unspecified in Phase 1 step 10 | G | Phase 1 step 10: enumerated required headings (`## CLI setup`, `## Maintainer smoke checks`, `## Build-warning delta`, `## Bundle-size delta`, `## Follow-on beads filed`) |
| 8 | Phase 5 step 1 "diff against baseline" doesn't cite which file section (compare to step 2a's explicit citation) | G + H | Folded into Phase 5 new step 2b — both polecats flagged the same root issue (diff scope mismatch); fix subsumes the citation gap |
| 9 | Phase 1 `.next/static` size capture runs after `npm run dev`; dev pollutes prod artifacts | H | Phase 1: moved bundle-size capture from step 6 to new step 3 (immediately after `npm run build`, before `npm run dev`); subsequent steps renumbered |
| 10 | Phase 4 Tailwind probe bullet (b) needs running server (not started in P4) | H | Phase 4 step 3 (renumbered after swap): bullet (b) changed from `curl /grades` to `grep .next/server/app/grades/` build artifacts directly — no server dep |
| 11 | Tailwind probe ordered before shadcn hand-fixes; broken dropdown-menu would trip Tailwind escalation for the wrong reason | H | Phase 4: swapped Tailwind probe (was step 2) with shadcn hand-fixes (was step 3); also disambiguated step 1 "triage" wording to "non-shadcn compile errors" |
| 12 | Phase 5 step 1 diff scope mismatch (cold-start only vs cold-start+routes baseline) → pure noise | H | Phase 5: rewrote step 1 to serve all three routes after cold-start (matching baseline scope); created new step 2b that performs the apples-to-apples server-log diff after curl probes |
| 13 | Phase 5 dev server (step 1) and `npm run start` (step 2) conflict on port 3000 | H | Phase 5 step 1: appended "stop the dev server after capture so step 2's `npm run start` can bind to port 3000" |
| 14 | Phase 4 step 1 triage-fixes have no commit home; step 6 catch-all could absorb them silently | H | Phase 4 step 1: explicit "commit each conceptual triage-fix as its own commit (bisect granularity)" instruction |

## Methodology

Same as previous rounds — option-c consolidated batch patch; wisps read-only; fix-application owned by orchestrator. Two-commit shape (must-fix + should-fix separately) for clean ledger.

## Convergence signal

Polecats G and H independently flagged Finding #8 (Phase 5 step 1 diff scope) — strongest convergence in this round. Their other findings were complementary rather than overlapping: G found completeness gaps (missing executors, missing prereqs, missing structure); H found ordering/timing issues. The two reviewers' remits were genuinely different, so low convergence is expected and not a quality concern.

## Pedagogical observation

This round demonstrates why the formula has both review modes:

- **PRD-align rounds (1–3)** caught alignment with the *spec*: 12 should-fix, 0 must-fix across three rounds.
- **Plan self-review round 4** caught alignment with *execution reality*: 2 must-fix, 12 should-fix in one round.

Same plan, different lens. The must-fix findings are not "the PRD-align rounds missed something" — they're "the PRD-align rounds tightened policies that created downstream operational gaps that only execution-flow review can see."

## Cumulative plan health (rounds 1–4)

- Total findings applied: **2 must-fix + 24 should-fix = 26**
- Must-fix all from round 4 (plan self-review)
- Should-fix split: 12 from PRD-align (rounds 1–3) + 12 from plan self-review (round 4)
- Plan is significantly more execution-ready post-round-4 than it was post-round-3

## Next step

Step 9: `plan-review-2` (risk + scope-creep) — reviewing the post-round-4 plan for residual risk and scope leakage.

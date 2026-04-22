# Plan Self-Review Round 3 — Testability + Coherence

**Date:** 2026-04-21
**Workflow:** `mol-idea-to-plan` step 10 (`plan-review-3`) — final plan self-review round
**Project:** Modernization — Next 14.2.35 → 16 + React 18 → 19
**Orchestrator:** shuhan/crew/shuhan (Sherpa)
**Review path:** B1 — adapted commands

## Polecats dispatched

| Wisp | Polecat | Focus | Report |
|---|---|---|---|
| `wu-4jf` | web_ui/polecats/furiosa | testability | hq-wisp-sn8k |
| `wu-m5p` | web_ui/polecats/nux | coherence | hq-wisp-7e6a |

## Headline

- **1 must-fix** (curl probe markers undefined — reproducibility bug)
- **19 should-fix** (10 testability + 9 coherence)
- **17 applied, 3 skipped** as cumulative-weight-increasing scaffolding (continuing round 5's re-audit pattern)

This was the largest review round in terms of finding count. Most are cleanup (coherence) and sharpening (testability operationalizations); three are heavier ceremony that conflicts with round 5's explicit architecture-weight framing and were skipped.

## Findings applied (17 of 20)

### MUST-FIX (1)

**K-1 — Curl probe markers defined.**
Phase 5 step 2 previously said curl probes must return "200 with expected HTML markers" without defining markers. Two polecats running the smoke would invent different markers. Applied: literal grep targets inlined per route, rooted in seed data so they can't silently drift (`/` → anchor from `web/app/page.tsx`; `/grades` → seed subject title + grade character; `/subject/<first-seed-id>` → matching title). Phase 1 step 4 baseline curl probe also given an explicit method (`curl -sS -o /tmp/baseline-<route>.html -w '%{http_code}\n'`) so baseline↔smoke are apples-to-apples.

### Coherence findings (9)

All 9 applied — clean cleanup from accumulated patching.

**L-1 — Dropdown-menu Risks row 2 contradicted row 1.** Row 2 mitigation said "separate commit to hand-fix if needed"; row 1 + Phase 4 (post-round-5) say "escalate, do NOT rewrite." Applied: row 2 rewritten to "if hand-review passes, commit as-is. If it fails, escalate per row 1 — polecat does not hand-rewrite."

**L-2 — Soft-recovery recipe #2 stale cross-reference.** Recipe #2 claimed "same recipe as Phase 2 step 2" but Phase 2 step 2 was extended (round 4) to also delete `web/.next`. Applied: recipe #2 now includes `web/.next` with a note that stale build cache compounds npm-tree confusion.

**L-3 — "Shuhan" / "the maintainer" naming drift in Executive Summary.** Applied: "Invisibility for Shuhan requires the maintainer to..." → "End-user invisibility requires the maintainer to..."

**L-4 — Server-log delta had no home heading in smoke-doc skeleton.** Step 2a pointed at `## Build-warning delta`; step 2b had no equivalent. Applied: `## Server-log delta` added to Phase 1 step 8 skeleton heading list; step 2b now cites this heading.

**L-5 — OQ #1 auto-filed bead not in Phase 5 step 5 bead-filing list.** Applied: "Add postinstall + engines.node pin" added as a conditional bead bullet in step 5.

**L-6 — Post-escalation workflow for dropdown-menu unstated.** Previously Phase 4 step 2 said "Escalate to maintainer per Risks-table row 1" without specifying mechanism or polecat wait-state. Applied: explicit `gt escalate -s HIGH` + `gt handoff -s ...` sequence; polecat does NOT sit idle; on resume, `git pull` fresh and proceed from Phase 4 step 3.

**L-7 — Phase 5 steps 1/2 opaque dev-server lifecycle.** Step 1 stopped dev; step 2's third bullet said "dev boots" — unclear whether a second dev boot was implied. Applied: step 1 now includes the curl+200-check (single dev session covering baseline-scope + 200-check); step 2's dev bullet now reads "Step-1 dev curls: HTTP 200 for all three routes" — no re-boot.

**L-8 — Phase 1 step 0 pre-flight already verified baseline-file existence; step 5 did it again.** Applied: step 5 dropped entirely; subsequent steps renumbered (6→5, 7→6, 8→7, 9→8). Step 4 now includes a parenthetical "Browser-console baseline was verified in step 0 pre-flight; no polecat action here."

**L-9 — "Polecat stops at build green + dev cold-start clean" understated the actual gate.** Applied: rewritten to "Polecat stops at the machine-verifiable gate (tsc clean + build green + dev-boot + start-boot + curl probes on all three routes — see Phase 5 step 2 for the full list)."

### Testability findings (7 applied, 3 skipped)

**Applied (7):**

- **K-2 — Build-warning delta class-extraction recipe.** Inline `sed -E` pipeline in step 2a strips ANSI color, absolute `web/` paths, and line:col numbers. Normalizes "class" so two polecats can't reasonably disagree on the diff.
- **K-3 — Server-log delta class-extraction recipe.** Same normalization as K-2 plus `grep -Ei` filter for `err|error|warn|warning|⨯|✗` and ms-timing stripping. Addresses polecat J's round-5 point that timestamps/request-IDs drift naturally.
- **K-4 — npm install inline acceptance criterion.** Phase 2 step 3 now says "exit code 0 AND `grep -E 'WARN (ERESOLVE|peer dep)'` returns no matches" — a local pass/fail check before branching to step 4.
- **K-5 — "Single blocker" definition.** Phase 2 step 4 defines single blocker as "the `ERESOLVE` stanza citing exactly one package name in `found:`/`required by:` hops" with a mechanical check.
- **K-6 — npm audit runtime/dev separation.** Phase 4 step 5 now uses `npm audit --omit=dev --json` piped through `jq` to extract High/Critical runtime CVEs; diffed against the Phase 1 baseline with the same expression.
- **K-8 — Dev-server "error" definition.** Phase 1 step 4 abort-bar now explicitly uses Next 16's `⨯`/`Error:`/`UnhandledPromiseRejection`/`FATAL` prefixes, NOT the word "error" incidentally appearing in normal summaries.
- **K-11 — Phase 5 step 4 labeled informational-only.** Rewritten to "Bundle-size data point (informational only; no threshold, no action — see Risks-table)" + records under `## Bundle-size delta`.

**Skipped (3, same rationale as round 5):**

- **K-7 — Phase 1 step 0 "populated" mechanical check + heading contract in Tag-ownership.** Skipped: adds template formalism to the maintainer pre-dispatch duty. Round 5 explicitly cut template-style ceremony for a hobby-tracker project.
- **K-9 — New artifact file `notes/modernization-codemod-review.md`.** Skipped: adds a new per-phase review artifact. Round 5's "verification architecture over-engineered" finding specifically warned against adding more scaffolding files.
- **K-10 — Tailwind probe baseline assertion (Phase 1 capture + Phase 4 re-assert).** Skipped: would partially reverse round 5 J-3 (collapsed the Tailwind probe to one bullet). Flipping back now would invalidate round 5's call.

## Methodology

Same as prior rounds — consolidated batch patch; wisps read-only; fix-application owned by orchestrator. Applied in one commit (16 consolidated edits covering 17 findings, since some coherence fixes collapsed across related sections).

## Cumulative plan health (rounds 1–6)

| Round | Focus | Applied | Skipped |
|---|---|---:|---:|
| 1 | PRD-align: requirements + goals | 5 | — |
| 2 | PRD-align: constraints + non-goals | 6 | — |
| 3 | PRD-align: user-stories + open-questions | 1 | — |
| 4 | Plan self-review: completeness + sequencing | 14 (2 must-fix) | — |
| 5 | Plan self-review: risk + scope-creep | 7 | 8 (ceremony) |
| 6 | Plan self-review: testability + coherence | 17 (1 must-fix) | 3 (ceremony) |
| **Total** | | **50** (**3 must-fix**) | **11** |

Plan is dispatch-ready. Verification architecture has been deliberately tuned via rounds 5 and 6 to be proportional to a 30-file hobby tracker — enough rigor to make "invisibility" falsifiable, not enough to require a regulated-industry workflow.

## Next step

Step 11: `create-beads` — convert the refined implementation plan into beads with dependencies. After that, 3 verification passes (steps 12, 13, 14) to ensure plan↔beads coverage.

**Review phase of Path B is now complete.** Steps 11–14 shift from "review the plan" to "convert plan to executable beads" — a qualitatively different mode.

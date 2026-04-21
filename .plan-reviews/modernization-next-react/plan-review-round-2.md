# Plan Self-Review Round 2 — Risk + Scope-Creep

**Date:** 2026-04-21
**Workflow:** `mol-idea-to-plan` step 9 (`plan-review-2`) — second plan self-review round
**Project:** Modernization — Next 14.2.35 → 16 + React 18 → 19
**Orchestrator:** shuhan/crew/shuhan (Sherpa)
**Review path:** B1 — adapted commands

## Polecats dispatched

| Wisp | Polecat | Focus | Report |
|---|---|---|---|
| `wu-29r` | web_ui/polecats/furiosa | risk | hq-wisp-zleh |
| `wu-2uh` | web_ui/polecats/nux | scope-creep | hq-wisp-k1hf |

## Headline

- **0 must-fix from either polecat**
- Polecat I: 11 should-fix risks, all operational/structural — wanted MORE scaffolding
- Polecat J: 4 should-fix scope-creep, **and verdict explicitly challenged the cumulative weight of the verification architecture** — wanted LESS scaffolding
- **Two polecats pulled in opposite directions** — first time in 5 rounds

## The meta-finding

Polecat J's verdict, verbatim:

> "The four rounds did not over-engineer the upgrade work itself — they over-engineered the **verification architecture around it**. This is a characteristic failure mode of iterative review: each round closes a gap with more scaffolding, and the cumulative weight is never re-audited."

This is the first round where the review machine caught itself drifting. Polecat I doesn't see it — I sees uncovered risks and proposes guardrails for each. Polecat J zooms out and sees the cumulative weight on a 30-file hobby tracker.

## Decision: Path C (selective both)

User chose Path C: apply 4 from I (structural fixes) + 3 from J (cleanup), skip the rest as ceremony. Explicitly rejected:
- **Path A** (apply all I, ignore J): max rigor, max ceremony — too heavy for a hobby tracker
- **Path B** (apply all J + only structural I): would fully drop the browser-console baseline ceremony — loses round-4 must-fix's quality bar
- **Path D** (minimal: just 2 patches): leaves real structural gaps unaddressed

## Findings applied (7 of 15)

### From Polecat I (4 of 11):

**I-1 (applied) — Soft recovery playbook (under the 4-hour bar).**
Three concrete recipes added to Decisions Made for failures that don't trigger abort: codemod partial-apply (`git checkout -- .` + re-run), inconsistent npm tree (`rm -rf node_modules + lockfile + reinstall`), hand-fix revert (`git revert <sha>`, NOT `git reset` — preserves bisect).

**I-2 (applied) — Post-merge regression recovery.**
New Decisions Made bullet: if maintainer smoke fails after Refinery merge, maintainer opens a revert PR (or `git revert` of merged range) targeting `v0.5-pre-modernization` rather than hot-fixing on `main`. Files a "Resume modernization" bead. Explicit parallel to pre-merge park procedure.

**I-3 (applied) — Codemod flag pre-discovery as maintainer pre-dispatch task.**
Phase 3 non-interactive note rewritten: maintainer determines exact non-interactive incantations during the v0.5 tag-cut + baseline window and inlines literal commands. If not inlined at dispatch, polecat treats as pre-flight failure (`gt escalate -s HIGH`). Fixes the "check --help yourself" delegation that round 4 had introduced.

**I-4 (applied) — Dropdown-menu hand-rewrite escalation, not polecat self-rewrite.**
Risks-table row 1 + Phase 4 step 2 updated: polecat does NOT attempt hand-rewrite of `dropdown-menu.tsx` if codemod hand-review fails. Escalates to maintainer (who has Radix docs + browser). Maintainer either commits to the polecat's branch via worktree, or makes rewrite a pre-dispatch task. Closes the "compiles clean but subtly broken" failure mode that would surface only at maintainer browser smoke (post-merge).

**Skipped from I (7 findings):**
- I-5 Turbopack-vs-Webpack broader divergence framing (current narrow Prisma-only row + dev-vs-start dual probe is sufficient mitigation)
- I-6 Maintainer baseline template contract (template formalism for a hobby project)
- I-7 `gt escalate` semantics (the soft-recovery + park procedure cover the cases that matter)
- I-8 React-19-compatible-minor reference map (audit-as-discovery is fine for 8 transitive deps)
- I-9 Prisma as forcing factor probe (low likelihood; existing Risks-table row covers the Turbopack angle)
- I-10 Error-boundary throw injection mechanism (small ambiguity; maintainer can pick mechanism on first run)
- I-11 Browser-console baseline scope coverage of interactive probes (would expand baseline; conflicts with Path C's "lean rigorous" framing)

### From Polecat J (3 of 4):

**J-1 (applied) — Server-log delta granularity consistency.**
Phase 5 step 2b rewritten: bars on new error/warning-level entry **classes**, not literal entries (matches step 2a's class-not-count bar). Decisions Made "Runtime error bar" bullet updated to match — "class" not "entry," with explicit "timestamps and request IDs drift naturally" carve-out.

**J-2 (applied) — Drop Phase 1 step 8 (`prisma migrate status` + row counts).**
Removed entirely. Data Model section updated to drop "Row counts captured in baseline" (no consumer existed). Subsequent steps renumbered: step 9 → 8 (transitive audit), step 10 → 9 (commit). Also fixed Phase 5 step 2b citation that pointed at the wrong Phase 1 step number after the renumber.

**J-3 (applied) — Collapse Phase 4 Tailwind probe sub-checks.**
Three sub-bullets reduced to one: `.next/server/app/grades/` HTML grep for `bg-card` and `text-muted-foreground`. The sub-checks for "`.next/static/css` produced" and "no PostCSS errors" were redundant with the precondition "`npm run build` is green" already stated in the step preamble.

**Skipped from J (1 finding):**
- J-4 Drop browser-console baseline pre-dispatch ceremony — explicitly retained per Path C's framing (preserves round-4 must-fix #1's quality bar)

## Methodology note

This was the first round to surface a **meta-finding**: the review machine's cumulative scaffolding weight. The user's Path C choice represents a deliberate selection on the rigor spectrum — neither maximally strict (Path A) nor maximally lean (Path B), with the explicit framing "this is rep training but the verification architecture really did grow too much."

Worth flagging for future Path B runs: round 5's scope-creep polecat caught what 4 prior rounds didn't — the architecture itself drifting. Plan-review rounds may benefit from an explicit "re-audit cumulative weight" mandate, not just per-round delta review.

## Cumulative plan health (rounds 1–5)

- **Total findings applied: 33** (2 must-fix + 31 should-fix)
- **Findings skipped this round: 8** (7 from I as ceremony, 1 from J as quality-bar preserve)
- Plan is dispatch-ready and now has explicit recovery paths for both pre-merge (park) and post-merge (revert) failure modes
- Verification architecture is leaner than post-round-4 (dropped one Phase 1 step, simplified one Phase 4 probe, normalized one diff bar)

## Next step

Step 10: `plan-review-3` (testability + coherence) — final plan self-review round. After this, the plan is converted to beads (steps 11–14).

# PRD Review: Deploy web_ui to Vercel (Option C)

_Synthesis of six analyst dimensions: requirements, gaps, ambiguity,
feasibility, scope, stakeholders. Each leg's full analysis is in this
directory; this file consolidates and prioritizes._

## Executive Summary

The PRD is in unusually good shape for a draft — decisions are locked
where they should be, scope is bounded with explicit non-goals, and
acceptance criteria mostly map cleanly to verifiable checks. The single
concentrated risk is **Open Question #1** (Prisma 5.22 + read-only
SQLite + Vercel serverless), which the PRD treats as one binary probe
but is in fact at least three distinct sub-mechanics that can each
fail independently — and a failure triggers an Option B pivot that
roughly doubles the project. The next-most-material gaps are
ambiguities in the word "fresh" (goal #2), the absence of a concrete
"reseed cycle verified" artifact (goal #3), and an unstated mayor-
worktree coordination plan. Six critical-path questions and a handful
of important-but-not-blocking ones are listed below. **Overall
readiness: Medium-High** — the project is buildable as written; the
risks are concentrated in one technical probe and a few specific
clarifications the overseer can answer in one pass.

---

## Before You Build: Critical Questions

These should be answered before plan generation / bead creation.

### Feasibility & Probe Strategy

**Q1: How is the Option C probe structured — single check or three?**
- *Why this matters:* Open Question #1 is currently framed as one
  pass/fail probe. The actual failure modes are at least three
  separate mechanics: (a) Prisma engine bundling on Vercel with
  non-root project directory, (b) `DATABASE_URL` path resolution at
  runtime, (c) read-only filesystem vs. SQLite journal-mode behavior.
  Each can fail independently. A monolithic "deploy and see" probe
  burns one re-investigation cycle per failure.
- *Found by:* feasibility, gaps
- *Suggested options:* (i) split the probe into three explicit
  verifications inside one bead, (ii) keep one bead but require a
  written checklist of all three mechanics passing before declaring
  Option C green, (iii) accept "deploy and see" with an upper bound
  on debug time before pivoting.

**Q2: If the Option C probe fails, is the right move to (a) pivot
in-project to Option B, (b) close Deploy as blocked and open a new
"Deploy via Postgres" project, or (c) escalate before deciding?**
- *Why this matters:* PRD frames Option B as "the only acceptable
  pivot" but doesn't surface that the pivot is essentially a separate
  Postgres-migration project (Neon provisioning, schema port, seed-
  script reauthoring, connection pooling). The "small fallback"
  framing under-represents the cost.
- *Found by:* scope, feasibility

**Q3: If Option C *probe* fails only because Prisma 5.22 has a known
fix in a later 5.x patch, is bumping Prisma allowed under the Option
C lock?**
- *Why this matters:* Constraints say "no version drift introduced by
  this project," which appears to forbid the bump-to-fix path even
  if a one-line bump would unblock the entire project. Need an
  explicit sub-decision here.
- *Found by:* feasibility

### Requirements & Acceptance

**Q4: What's the single concrete artifact that proves goal #3
(reseed cycle verified end-to-end)?**
- *Why this matters:* "Verified once before tagging" leaves the
  evidence undefined. Could be a screenshot, a curl against the live
  URL with a known-changed value, a checklist tick, or an automated
  check. Each implies different implementation effort and different
  reproducibility for future reseeds.
- *Found by:* requirements, scope
- *Suggested options:* (i) screenshot of live URL pre/post reseed,
  pasted into the implementation bead's notes, (ii) a checked-in
  smoke checklist with "reseed cycle: ✅ <date>" entry, (iii) a
  reseed-redeploy run captured by a polecat in a verification bead.

**Q5: Confirm goal #2's "fresh" definition and lift it out of the
parenthetical.**
- *Why this matters:* Goal #2 reads "fresh data on every load" with
  the freshness scope ("since the last `git push`") in a parenthetical.
  A future implementer or polecat could read the title literally and
  build something stronger than required (cache busting, no client-
  side prefetch, etc.).
- *Found by:* ambiguity, requirements
- *Suggested phrasing:* "Each request to `/grades` and `/subject/[id]`
  reads from the bundled `dev.db` shipped with the most recent
  successful deploy. No build-time SSG snapshot, no per-request
  caching beyond standard browser/CDN behavior. Freshness ≠ real-time;
  staleness is bounded by deploy cadence."

**Q6: What should the user see if a deploy lands and `/grades` 500s?**
- *Why this matters:* PRD covers happy paths and explicit non-goals
  (no Sentry, no remote error reporting), but is silent on what
  Shuhan sees when the live URL breaks. Default Vercel error page is
  the implicit answer; making it explicit prevents a "we should have
  added an error boundary" debate during implementation.
- *Found by:* requirements, gaps
- *Suggested options:* (i) accept Vercel's default error page as
  v0.7's behavior, (ii) add a minimal `error.tsx` with a friendly
  message + "tell Rongjun" instruction, (iii) defer to a follow-on
  bead.

### Coordination & Hazards

**Q7: What's the concrete mayor-worktree coordination plan?**
- *Why this matters:* PRD acknowledges the mayor worktree as a
  Deploy-blocking hazard (~100 deletions staged) and says "in scope
  to *not trigger.*" That's an unactionable negative requirement —
  what positive procedure does the implementer follow?
- *Found by:* ambiguity, gaps, stakeholders
- *Suggested options:* (i) mayor stays down for the duration of
  Deploy, restart only after `v0.7-deploy-complete` is tagged,
  (ii) implementer never `cd`s into `mayor/rig/`, (iii) overseer
  cleans the mayor worktree as a prerequisite to Deploy
  implementation.

---

## Important But Non-Blocking

These can be answered during plan generation; they don't block
beginning implementation.

- **Latency expectations.** Cold-start TTFB on Vercel + Prisma is
  typically 1–3 seconds. PRD has no latency target. Confirm "the page
  eventually renders" is acceptable, or set a soft target (e.g.
  p95 < 3s on cold). [requirements, feasibility]

- **Privacy sign-off on a public URL displaying a minor's grades.**
  PRD treats the public-URL-with-no-auth as accepted. Worth an
  explicit Rongjun sign-off (URL secrecy *is* the access control)
  given the user is a minor. [stakeholders]

- **Empty-assignments scope.** Goal #6 says zero-state replaces the
  "stale grade letter / percent subtitle" — confirm whether this
  applies to (a) `/grades` cards, (b) subject detail page header, or
  (c) both. Define "empty" as `assignments.length === 0` after Prisma
  fetch, or another condition. [ambiguity, requirements]

- **Subject-with-some-assignments behavior.** PRD only addresses the
  empty case. If a subject had 5 assignments last week and now has
  3, does the UI show recomputed grade or the stored grade? Probably
  recomputed, but unstated. [requirements]

- **Three correctness fixes — bundled or splittable.** Navbar link,
  root redirect, zero-state are technically independent of the
  deploy itself. Confirm they stay bundled into v0.7 even if the
  Option C probe consumes more time than expected, or whether they
  can slip to v0.7.1. [scope]

- **Of the eight goals, are any cut-able for an earlier v0.7 ship?**
  PRD treats v0.7 as atomic ("all eight or no tag"). Worth
  confirming or flagging a fallback MVP. [scope, requirements]

- **Smoke-pass owner.** Who runs the live-URL smoke checklist —
  Rongjun on laptop, or a polecat in a verification bead? Affects
  the "smoke checklist as Markdown vs. as bead checklist" question
  (Open Question #6). [requirements, ambiguity]

- **Dependabot fix folded in or deferred.** Open Question #8 needs a
  concrete decision before plan phase. Default rule "fold in if one
  line, defer if version drift" is reasonable but should be made
  explicit. [scope]

- **Build success as an explicit criterion.** Goal #1 ("live URL
  resolves") subsumes a successful build, but a separate "Vercel
  build completes with no Prisma engine warnings" goal would catch
  silent issues earlier. [requirements]

- **Edge runtime vs Node.js runtime for `/grades` and `/subject/[id]`.**
  Default Next 16 routes can run on Edge; Prisma needs Node. May
  need explicit `export const runtime = 'nodejs'` alongside
  `force-dynamic`. [feasibility]

- **Branch-to-deploy strategy.** Currently every merge to `main`
  will trigger a production deploy. Confirm that's intended (vs. a
  `production` branch / tag-to-deploy gate). [stakeholders]

---

## Observations and Suggestions

Non-blocking notes worth considering in plan phase.

- **Probe-first ordering is correct.** The "Phase 1: probe Option C
  feasibility" framing is the right risk-adjusted ordering.
  Recommend the plan phase make the probe its *own* checklist with
  three explicit checkboxes (engine bundle, path resolution,
  read-only-with-journal handling) rather than one binary probe.

- **Prisma 5.22 SQLite engine note.** Prisma's SQLite driver is
  statically bundled in 5.x — no separate `query-engine-*` binary
  download at runtime. That removes one historical failure mode and
  is worth noting in the probe plan to scope expectations.

- **`force-dynamic` + Link prefetch interaction.** Setting
  `dynamic = 'force-dynamic'` does not disable client-side route
  prefetch by default. If per-navigation freshness matters,
  additional opt-out is needed; if per-page-load is enough,
  `force-dynamic` alone is correct.

- **Vercel Function Logs vs. Build Logs.** Build-time errors are
  visible in the deploy log; runtime engine-load errors surface only
  on first request. The implementer should know to check Function
  Logs after deploy, not just Build Logs.

- **Build-time `dev.db` presence guard.** A simple `ls
  web/prisma/dev.db || exit 1` step in the build catches a
  missing-DB regression (e.g. accidental `.gitignore` re-revert).
  Cheap insurance.

- **Smoke checklist convention.** The PRD's Open Question #6 should
  default to "checked-in Markdown file" mirroring the modernization
  smoke pattern at `notes/modernization-smoke.md`. That's the
  established norm.

- **OQ #5 (Navbar order: Grades | About).** This is described as
  "trivial, but flagging." Recommend resolving as `Grades | About`
  during plan phase and not surfacing it as a separate question to
  the human — it's well below the bar of the other six critical
  questions.

- **Re-anchor the three correctness fixes to Shuhan's UX.** PRD
  describes Navbar / redirect / zero-state as bug fixes; they are
  in fact UX choices for an 11-year-old. Re-anchoring in the design
  doc helps the implementer make small judgment calls (label
  wording, capitalization) consistent with the user.

- **Dolt / mail discipline note for the implementing polecat.**
  Implementation will involve at least 5–10 beads. Each `bd create`
  is a Dolt commit. Worth a "use design / notes fields rather than
  serial bead-update messages" reminder in the plan.

- **Long-tail follow-on beads (already filed, non-blocking):**
  `wu-8ld` (OQ #4 client-boundary probe target mismatch),
  `wu-0yk` (mutate-probe SQL typo), `wu-sjk` (Tailwind 3 → 4),
  Dependabot moderate vuln. These should remain visible during
  Deploy but not folded in.

---

## Confidence Assessment

| Dimension | Score | Notes |
|---|---|---|
| Requirements completeness | M-H | Goals are testable; failure-modes & evidence-for-reseed are soft |
| Technical feasibility | M-L | One concentrated risk (Option C probe); rest is small/well-understood |
| Scope clarity | H | Unusually good non-goals discipline; hidden contingent scope is the gap |
| Ambiguity level | M-H | Most ambiguities are word-level; "fresh" definition is the riskiest |
| Stakeholder coverage | M-H | 2-person model is honest; mayor / privacy / future-maintainer underspecified |
| **Overall readiness** | **M-H** | **Buildable as written; six critical questions resolve the main risks** |

---

## Next Steps

- [ ] Overseer answers the six critical questions (Q1–Q7) above
- [ ] PRD bead updated with answers; ambiguities resolved inline
- [ ] Plan phase (`mol-generate-plan` or equivalent) consumes the
      revised PRD + this synthesis
- [ ] Plan phase produces beads, with the Option C probe structured
      as three explicit verifications inside the first
      implementation bead
- [ ] Important-but-non-blocking items resolved during plan phase
      rather than blocking it

---

_Synthesis authored 2026-04-25 by polecat `web_ui/polecats/furiosa`
(`wu-wisp-g5il`, `mol-prd-review`). Inputs: this directory's six leg
analyses, `prd-draft.md`, `PLAN.md`, `notes/deploy-2026-04-24/
survey.md`._

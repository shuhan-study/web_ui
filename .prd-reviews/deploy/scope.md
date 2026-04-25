# Scope Analysis

## Summary

Scope is unusually well-bounded for a deploy project — the Non-Goals
list is long, specific, and inherits from a previously-stable PLAN.md.
The PRD demonstrates real discipline by listing things it could
reasonably do but explicitly won't (Tailwind upgrade, Sentry, custom
domain, auth). The remaining scope risks are mostly at the *seams*: the
"three correctness fixes" bundled with deploy could each be its own
project, and the Option B pivot trigger represents a hidden
"contingent doubling" of project size that the PRD acknowledges but
does not quantify. The biggest scope-creep magnet is observability —
once a user is on the live URL, "we don't know if it's broken" becomes
a real felt problem fast.

## Findings

### Critical Gaps / Questions

- **The three correctness fixes bundle is a scope choice, not a
  necessity.** Navbar link, root redirect, and zero-state subtitle
  are technically independent of "deploy to Vercel." They were
  carried forward from modernization for convenience. If the Option
  C probe consumes more time than expected, are these still bundled
  into v0.7, or do they slip into v0.7.1?
  - *Suggested clarifying question:* If Option C probe fails and we
    pivot to Option B mid-project, do the three correctness fixes
    stay in scope or get cut to ship a v0.7-deploy-only first?

- **Option B pivot is a scope-doubling escape hatch.** "Pivot to
  Option B" is described in two sentences but represents Postgres
  provisioning, schema migration tooling, seed-script reauthoring,
  Neon account setup, and connection-pool tuning. The PRD does not
  make the *size* of the pivot visible, which means the
  "Option C is locked, B is the only fallback" framing reads like a
  small contingency when it is in fact an entirely different project.
  - *Suggested clarifying question:* If the Option C probe fails, is
    the right move to (a) pivot in-project to Option B (potentially
    weeks more work), (b) close the Deploy project as blocked and
    open a new "Deploy via Postgres" project, or (c) escalate before
    deciding?

- **No explicit "stop-ship" criteria.** The PRD lists the eight goals
  for v0.7 but doesn't say which are blocking-for-tag vs.
  nice-to-have. If Navbar link works but zero-state doesn't, do we
  tag? Implicit "all eight required" but not stated.
  - *Suggested clarifying question:* Of the eight goals, are any
    cut-able to ship v0.7 sooner if a sub-bead becomes hard?

- **"Verified end-to-end at least once" (goal #3) — defined how?**
  Could be (a) Rongjun edits a value, pushes, refreshes browser, sees
  it; (b) full smoke checklist re-run after reseed; (c) automated
  smoke. The choice has scope implications.
  - *Suggested clarifying question:* What's the single concrete
    artifact that proves goal #3 — a screenshot, a checklist tick,
    a recorded test run?

### Important Considerations

- **Scope-creep magnet: observability.** Once Shuhan is using a live
  URL, the first "site is broken" experience triggers an obvious
  desire for monitoring. PRD explicitly excludes Sentry/Axiom — good
  — but doesn't address the "what do we do when she reports it's
  down" workflow. This will come up post-launch as a follow-on
  project; flagging now prevents in-Deploy creep.

- **Scope-creep magnet: custom domain.** Shuhan will probably want a
  more memorable URL than `web-ui-shuhan.vercel.app`. PRD correctly
  excludes this; should be a follow-on bead at minimum so it doesn't
  get folded in mid-project.

- **Scope-creep magnet: parent visibility.** PRD says "every
  plausible follow-on" presupposes deploy. If the deploy is live and
  Shuhan's mom asks for read access, the implementer might be
  tempted to add a per-user link or basic auth. PRD's "no auth"
  Non-Goal blocks this cleanly — but the social pressure is real.

- **Scope-creep magnet: bookmarkability of subject pages.** Once
  `/grades` is live, "I want to bookmark Math directly" is the
  obvious next ask. The current `/subject/[id]` route is technically
  bookmarkable, but stable IDs across reseeds aren't guaranteed by
  the seed script. If the implementer notices this, they might be
  tempted to add stable slugs. PRD should explicitly defer this.

- **Scope split inside the project.** The PRD has both
  "infrastructure work" (Vercel setup, env vars, force-dynamic)
  and "in-app correctness fixes" (Navbar, redirect, zero-state).
  These have different risk profiles and different verification
  paths. Worth confirming the plan phase keeps them as separate
  beads rather than combining.

- **Dependabot fix (Open Question #8) — scope decision pending.**
  The "fold in if one-line, defer if major" rule is reasonable but
  open. Should be resolved before plan phase, not during.

- **MVP definition is missing.** The PRD lists eight goals as the
  v0.7 release, but doesn't define a "smaller v0.7" — e.g., "deploy
  works and is bookmarkable" without the three correctness fixes.
  Useful as a fallback if any single goal becomes hard.

### Observations

- Out-of-scope items are explicitly named with rationale (Tailwind 4,
  test infrastructure, custom domain). This is unusually good
  discipline and prevents most of the scope-creep risk.

- The `wu-avk` parent bead's "non-blocking" Dependabot mention is
  treated correctly — flagged but not gating.

- The mayor worktree hazard is correctly out of scope for *fixing*
  but in scope for *avoiding triggering*. That's a reasonable
  fence-sit, though the negative requirement (don't trigger) is hard
  to encode as a checkbox.

- The "next project" framing (parent visibility, real Aeries
  integration, richer reporting) is mentioned in Problem Statement
  as motivation, not as in-scope. Good — this is exactly the
  scope-creep guardrail the PRD needs.

- "End of Trimester 3 (2026-05-30)" is a soft deadline. With a probe
  that may pivot to a doubled-scope Option B, that deadline is
  load-bearing. If the implementer estimates Option B at 2 weeks and
  the probe runs in week 3 of 5, the math gets uncomfortable. Worth
  budgeting probe time aggressively.

- The PRD doesn't contemplate a *partial* deploy (e.g., deploy
  succeeds but stale subtitle bug isn't fixed). It treats v0.7 as
  atomic. If atomicity is the intent, an "all-or-nothing" criterion
  belongs in goal #8.

## Confidence Assessment

**High for explicit scope; Medium for hidden contingent scope.** The
in-scope and out-of-scope items are well-specified. The hidden risk is
the Option B pivot, which the PRD treats as a small fallback but is in
fact a project-doubling event. If the probe and pivot are surfaced as
their own scope decision (rather than "we'll see"), the project becomes
honestly-sized. As written, the PRD risks looking small and turning
out medium.

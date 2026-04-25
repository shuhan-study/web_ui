# Requirements Completeness

## Summary

The PRD has unusually clean completion criteria for a draft — the eight goals
in §Goals each map to a verifiable post-deploy check, and the smoke checklist
(goal #7) is a real artifact already prefigured by the modernization smoke
file. Where the PRD is weak is at the *boundary* between "we deployed" and
"we know it works": fail-mode behavior at runtime is undefined (what does the
user see if a request hits Vercel before Prisma engines warm? if the SQLite
read fails?), and the reseed cycle's "verified end-to-end at least once"
criterion (goal #3) lacks a concrete pass/fail script. Most goals are
testable; a few rely on the implementer choosing the right test.

## Findings

### Critical Gaps / Questions

- **What counts as "Live URL" for goal #1?** Resolves with HTTP 200? Renders
  `/grades` content? Renders within N seconds? Cold-start TTFB on Vercel
  serverless can be multiple seconds for a Prisma route — if Shuhan's
  bookmarked-tap experience is the actual goal, that needs a latency
  threshold (or an explicit "we accept cold starts" statement).
  - *Suggested clarifying question:* What latency is acceptable on a cold
    request? Is "the page eventually renders" sufficient, or do we want a
    rough p95 target (e.g. < 3s)?

- **Goal #3 ("Reseed → live in one cycle") has no failure definition.** What
  if Vercel's auto-deploy doesn't fire because a `.db` binary commit is
  classified as non-source? What if the deploy succeeds but a build cache
  serves the old `dev.db`? The criterion says "verified end-to-end at least
  once before tagging release" but doesn't say what evidence counts.
  - *Suggested clarifying question:* What artifact proves the reseed cycle
    worked — a screenshot of the live URL post-redeploy, a curl against the
    production URL with a known-changed value, a manual check by Shuhan?

- **Goal #6 zero-state acceptance is half-specified.** The PRD says subjects
  with assignments "are unchanged," but doesn't say what subjects with one
  *removed* assignment but a previously-stored grade should look like (the
  bug surface is exactly stale stored summaries). Is the rule "compute from
  current assignments, ignore stored summary" or "show zero-state only when
  list is empty"?
  - *Suggested clarifying question:* If a subject had 5 assignments last
    week and now has 3, do we show the recomputed grade or the stored one?
    The PRD only addresses the empty case.

- **No definition of failure UI for the live URL.** If `/grades` 500s
  because Prisma can't open `dev.db`, the user sees Vercel's default error
  page. Is that acceptable as a placeholder, or does Deploy need a
  user-facing error boundary? The PRD's "happy path only" framing leaves
  this open.
  - *Suggested clarifying question:* If a deploy lands and `/grades`
    returns 500, what should Shuhan see? (Default Vercel error page is the
    current implicit answer.)

### Important Considerations

- **No observability requirement.** Non-goals explicitly excludes Sentry/
  Axiom. That's fine for v0.7, but means there is *no signal* if the live
  URL breaks between Rongjun's reseed pushes. Consider whether a manual
  weekly check belongs in the completion criteria, or if "Shuhan reports
  it's broken" is the monitoring strategy. Document the choice.

- **Build success is not in the goals.** Implicit, but goal #1 ("live URL
  resolves") subsumes it. A separate criterion that the Vercel build
  completes with no warnings (Prisma engine bundle in particular) would
  catch silent issues before they manifest as runtime errors.

- **No rollback story.** If a reseed pushes a corrupt `dev.db`, the only
  recovery is `git revert` and re-push. That's acceptable for Option C but
  isn't stated. Worth one sentence in Constraints.

- **`v0.7-deploy-complete` tag (goal #8) — what's "above"?** Tag criteria
  list only the seven preceding goals. If a Dependabot fix gets folded in
  (Open Question #8), does the tag wait on it? Probably no, but unstated.

### Observations

- Goal-to-test mapping is mostly excellent — six of eight goals can be
  smoke-checked directly. Goals #2 and #3 are the soft ones (need
  *evidence*, not just behavior).

- The PRD inherits the "smoke checklist" pattern from modernization
  cleanly — that's a known-working test artifact, not a hypothetical.

- "Tagged release" as the final criterion is well-chosen: it forces a
  human moment of "is this actually shipped" rather than a continuous
  drift.

## Confidence Assessment

**Medium-High.** Acceptance conditions are written down for almost every
goal, and the smoke checklist provides a concrete test scaffold. The gaps
are at the failure-mode boundary (what happens when things go wrong?) and
the evidence boundary (what artifact proves reseed worked?). For a v0.7
deploy of a one-user app, the current spec is buildable; for a multi-user
app it would not be.

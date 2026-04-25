# PRD-Align Round 2: constraints + non-goals

_Date: 2026-04-25 · Driver: web_ui/crew/full_stack._

## Reviewers

- **Constraints compliance** — `web_ui/polecats/capable` (bead `wu-qke`,
  mail `hq-wisp-pnnr`). Result: 0 violations, 2 unaddressed.
- **Non-goals enforcement** — `web_ui/polecats/dementus` (bead `wu-at8`,
  mail `hq-wisp-7ao5x`). Result: 0 scope-creep, 3 borderline.

Plan reviewed: `.designs/deploy/design-doc.md` (post round 1).

## Findings (5 unique should-fix items)

### From constraints

1. **Node engine ≥20.9 unaddressed** (capable). PRD lists this in
   §Constraints/Stack but plan never verifies Vercel runtime Node.
2. **Soft deadline 2026-05-30 unaddressed** (capable). PRD names this
   in §Constraints/Process; plan has no schedule, no critical path,
   no checkpoint. ~5 weeks remain from project open.

### From non-goals

3. **`npm run reseed` script borderline** (dementus). Not requested
   by PRD; not on non-goal list. Already in plan as R6 mitigation.
4. **Seed anonymization borderline** (dementus). Not in PRD; gated
   already as design OQ #2 but recommendation is to strengthen the
   gate to require an explicit yes/no.
5. **`robots.txt` + `X-Robots-Tag: noindex` borderline** (dementus).
   Adjacent to "URL secrecy is the access control" but not
   PRD-authorized by name.

## Fixes applied to design-doc.md

### Fix for item 1 (Node ≥20.9)

Added a one-line bullet to B8: *"Verify Vercel project Node version
≥ 20.9 in Project Settings → General before first deploy."*
~30-second check, closes the constraint loop.

### Fix for item 2 (deadline)

Added new risk **R9 — Soft deadline 2026-05-30 slips** with B1-failure
named as the only realistic miss scenario and a "deadline-aware but
not deadline-driven" framing for the plan-approval ratification.

### Fix for item 3 (`npm run reseed`)

Annotated the §Decisions Made entry to make explicit: ergonomics
adjunct to goal #3, mitigates R6, logged for ratification at
plan-approval gate. Doesn't change the implementation; surfaces the
non-PRD-authorized status.

### Fix for item 4 (seed anonymization)

Strengthened design's §Open Questions #2: added a "Plan-approval gate
requirement: overseer must answer explicitly — yes/no, not silent
skip" clause with both branches' framings (yes → enables no-auth
posture; no → log a privacy waiver in PLAN.md decision log before
B8 opens).

### Fix for item 5 (robots/noindex)

Annotated B8's "Also adds" line to frame robots.txt + X-Robots-Tag as
"defense-in-depth for the locked URL-secrecy posture — not new
privacy-engineering scope; ratify at plan-approval gate." Same
implementation; surfaces the framing.

## Carry-forward to plan-approval gate

The plan-approval mail (after `plan-review-3`) will need to surface
explicitly:
- B10 tag-cut actor (round-1 carry-forward)
- Seed-data anonymization yes/no (round-2 item 4, strengthened)
- Ratify the three borderlines (npm run reseed, robots/noindex, plus
  whichever way item 4 lands)
- Acknowledge R9 as soft (round-2 item 2)

None of these block create-beads on technical grounds; all benefit
from explicit overseer ratification rather than implicit inclusion.

## Round 2 verdict

**0 must-fix, 5 should-fix → all 5 applied.** Plan-vs-PRD constraints
+ non-goals alignment is high. Proceeding to round 3 (user-stories
+ open-questions).

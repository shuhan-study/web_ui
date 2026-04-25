# PRD-Align Round 3: user-stories + open-questions (FINAL)

_Date: 2026-04-25 · Driver: web_ui/crew/full_stack._

## Reviewers

- **User-stories coverage** — `web_ui/polecats/capable` (bead `wu-3e2`,
  mail `hq-wisp-cmja4`). Result: 0 gaps, 0 partials, 1 observation.
  Per-dimension log: `.plan-reviews/deploy/prd-align-round-3-user-stories.md`.
- **Open-questions resolution** — `web_ui/polecats/dementus` (bead
  `wu-bmi`, mail `hq-wisp-zgpn1`). Result: 0 unresolved, 1
  deferred-OK, 14 resolved.
  Per-dimension log: `.plan-reviews/deploy/prd-align-round-3-open-questions.md`.

## Findings

**0 must-fix, 0 should-fix.** All 6 user stories (S1–S6) covered;
all 8 PRD §Open Questions and all 7 Q1–Q7 Clarifications resolved or
explicitly deferred-OK. No fixes to apply to design-doc.md.

## Observation O-1 (logged, not should-fix)

Capable noted: B9's smoke contents currently echo PRD goal #7's
narrow 5-item list. Some scenario steps (S1's root-redirect, S3's
Grades-from-About navbar, S5's empty-assignments rendering) are
acceptance-tested at implementation time (B5/B4/B6) but not
necessarily walked end-to-end on the live URL.

Not should-fix because expanding B9 expands the PRD's own goal #7.
Surfaced for plan-approval gate visibility — overseer can opt in by
asking for a one-line addition to B9: *"Smoke checklist must walk all
6 PRD scenarios end-to-end on the production URL."*

Adding to plan-approval carry-forward list.

## Plan-approval gate carry-forward (cumulative across r1–r3)

To be put in front of overseer at the manual gate (Blocker-2
contract) after `plan-review-3`:

1. **B10 tag-cut actor** (r1): pick (a) Refinery `git tag` capability
   or (b) overseer manual `git tag … && git push origin …`.
2. **Seed anonymization yes/no** (r2): explicit decision required.
   If yes → frame as "enables the locked no-auth posture." If no →
   log a privacy waiver in PLAN.md decision log before B8 opens.
3. **Three borderline ratifications** (r2):
   - `npm run reseed` script — keep as ergonomics adjunct or drop
   - `robots.txt` + `X-Robots-Tag: noindex` — keep as defense-in-depth
   - Anonymization disposition (rolls up into item 2)
4. **R9 deadline framing** (r2): ratify as "deadline-aware but not
   deadline-driven."
5. **O-1 smoke coverage** (r3, optional): expand B9 to walk all 6
   PRD scenarios? Default no; cheap to opt in.
6. **Vercel account creation** (r3, deferred-OK): B8 starts with
   account-creation step if account/link doesn't pre-exist.

## Round 3 verdict

**Plan-vs-PRD alignment is closed.** Stack closes with 0 must-fix
across all 3 rounds. Plan is ready for plan-review (the next stack
of 3 rounds, which evaluates the plan ON ITS OWN — not against the
PRD). Then the manual plan-approval gate, then create-beads.

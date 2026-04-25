# PRD-Align Round 1: requirements + goals

_Date: 2026-04-25 · Driver: web_ui/crew/full_stack (orchestrating wu-avk
mol-idea-to-plan)._

## Reviewers

- **Requirements coverage** — `web_ui/polecats/capable` (bead `wu-1zb`,
  mail `hq-wisp-cwd5`). Result: 0 gaps, 2 partials.
- **Goals alignment** — `web_ui/polecats/dementus` (bead `wu-t0b`,
  mail `hq-wisp-e6uz`). Result: 0 misaligned, 1 partial.

Plan reviewed: `.designs/deploy/design-doc.md` (commit on main, before
this round's edits).

## Findings (deduped: 2 unique should-fix items)

### Issue 1 — Q5 "fresh" verbatim wording not surfaced as explicit acceptance

Both reviewers and the requirements-coverage reviewer flagged this. Plan
covers the *mechanic* (B3 force-dynamic, `?mode=ro&immutable=1`) but the
PRD-locked verbatim 3-clause text never appears as an explicit
acceptance criterion. Reviewer suggested either B3's "why" or B9's smoke
checklist.

### Issue 2 — Goal 8 / B10 tag-cut actor unresolved

Design's own §Open Questions #4 flags the gap. Plan reaches B10 with no
named executor (polecats don't push to main). Two options surfaced:
(a) Refinery cuts via `git tag` capability, (b) overseer cuts manually.

## Fixes applied to design-doc.md

### Fix 1 (Issue 1)

Added under B3 in §Implementation Plan / Phase 1, as a "Why (PRD Q5
acceptance, verbatim)" line lifting the three-clause wording verbatim
from PRD Q5 answer. Chose B3 over B9 because B3 is where the mechanic
lives; the smoke checklist (B9) verifies behavior at runtime but the
acceptance text is structurally about the route's rendering mode.

### Fix 2 (Issue 2)

Added a "Pre-B10 prerequisite" line to B10's bead description. Does NOT
unilaterally pick option (a) vs (b); instead requires the tag-cutting
actor to be named before B10 opens, and routes the decision to the
plan-approval gate (wu-avk Blocker-2 contract). Reasoning: this is a
process / authority question, not a technical question — the overseer
should make it. Surfacing it again at plan-approval costs one extra
mail round-trip but avoids me silently picking the wrong actor.

## Items NOT applied (deferred)

None. Both should-fix items resolved this round (one with verbatim
text, one with a structural gate).

## Open carry-forward to round 2 (constraints + non-goals)

The B10 actor question will land in front of the overseer at the
plan-approval gate regardless. Reviewers flagged no
constraint or non-goal misalignment in their dimensions; round 2 will
formally check those dimensions.

## Round 1 verdict

**0 must-fix, 2 should-fix → both applied.** Plan-vs-PRD alignment is
high. Proceeding to round 2 (constraints + non-goals).

# Scope Analysis

## Summary

This scope analysis cannot be performed in the normal sense: the convoy
`xamwy` was dispatched with no PRD attached. The leg bead (`wu-leg-twxrm`)
carries the literal placeholder `**Problem / Feature**: <no value>` in its
base prompt; there is no `prd-draft.md` (or any other source artifact) at
`.prd-reviews/xamwy/`; and none of the sibling `xamwy` legs
(`wu-leg-fu2py` ambiguity, `wu-leg-nkknk` feasibility, plus the requirements
leg already filed in commit `feee0d6`) reference any source document. The
dispatcher `web_ui/crew/full_stack` appears to have launched a `mol-prd-review`
convoy with empty inputs.

The dominant finding for this leg is therefore that **scope cannot be
analyzed against an absent document**. Every sub-question scope review is
supposed to answer ("what is in vs out?", "what's the MVP?", "what is phase 2
in disguise?", "where will scope creep happen?") presupposes a written
proposal whose boundaries can be inspected. There is no such proposal here.

A well-formed comparison exists: the prior `deploy` convoy at
`.prd-reviews/deploy/` (commit `7c0a86e`) was launched with a complete draft
and produced six dimension analyses plus a synthesis. The expected shape of
this work is visible there; only the input is missing for `xamwy`.

## Findings

### Critical Gaps / Questions

- **No source PRD means no scope to bound.** Without a draft document, every
  scope-creep risk is hypothetical and every "in/out" line is invented by
  the reviewer. Producing speculative scope guidance against a phantom PRD
  would be worse than producing nothing — the synthesis leg (`wu-syn-*`)
  would treat it as authoritative and bake invented constraints into a
  document that does not yet exist.
  - Why this matters: A scope review's job is to make the *author's*
    boundaries explicit and surface where they will break. With no author
    and no boundaries, this leg has no object to operate on.
  - Suggested clarifying question for the human: *Which PRD was the `xamwy`
    convoy intended to review? If it is the Deploy PRD, the convoy is
    duplicative — the `deploy` convoy already produced a scope analysis at
    `.prd-reviews/deploy/scope.md`. If it is a new feature, please place the
    draft at `.prd-reviews/xamwy/prd-draft.md` and re-dispatch, or close the
    existing legs with `--reason="no-changes: missing input"`.*

- **Risk of "scope by review."** If polecats infer a PRD from context (most
  obvious candidate: the Deploy draft already at `.prd-reviews/deploy/`) and
  produce a scope analysis against that, the convoy will silently
  re-litigate decisions that are already locked in `web_ui/PLAN.md` (DB =
  Option C; root `/` redirect; stale-subtitle zero-state — see `wu-avk`).
  Re-opening locked decisions via a side-channel review is exactly the kind
  of unintended scope creep this dimension is meant to flag.
  - Why this matters: The Deploy PLAN explicitly says "don't relitigate"
    these three decisions. A second scope review could surface them as
    "creep risks" and trigger churn.
  - Suggested clarifying question for the human: *Should `xamwy` legs default
    to closing as `no-changes: missing input` rather than guessing, when the
    PRD is absent?*

### Important Considerations

- **The "MVP cut" question is unanswerable** without a source document. The
  standard scope-review questions — what is the smallest version that
  delivers value, where are the natural seams for future phases, what
  belongs in a separate project entirely — all require a list of proposed
  features to operate on. A scope review of an empty proposal collapses to
  "the MVP is to write the PRD," which is true but useless.

- **Phasing/sequencing review is also blocked.** Whether something should be
  big-bang vs incremental, and where the natural seams lie, are properties
  of the *proposed solution shape*. Without a solution shape, this leg
  cannot evaluate phasing. (The Deploy PRD at `.prd-reviews/deploy/` does
  have a phasing analysis — see `.prd-reviews/deploy/scope.md` — and that is
  what a populated `xamwy` would look like.)

- **Stakeholder/team-dependency scoping is similarly blocked.** Identifying
  cross-team dependencies that fall outside scope requires knowing what is
  *inside* scope. With nothing inside, nothing can be outside.

### Observations

- The convoy slug `xamwy` was substituted into per-leg prompts (the output
  paths are correct) but the `problem` / PRD-draft variables were not. This
  matches the templating gap already documented by the requirements leg in
  `.prd-reviews/xamwy/requirements.md`: the dispatcher resolved some
  variables and silently no-op'd others.

- A single corrective action by the human (drop a real `prd-draft.md` and
  re-dispatch, or close the four `xamwy` legs as
  `no-changes: missing input`) clears this leg and all its siblings at once.
  Per-leg fixes are not needed.

- Polecats running scope analysis should **not** "rescue" the convoy by
  picking a plausible PRD and reviewing that. Doing so would (a) produce a
  scope analysis the human did not request, (b) likely re-open locked
  decisions in `web_ui/PLAN.md` if the chosen draft is the Deploy one, and
  (c) be treated as authoritative input by the synthesis leg. Surface the
  gap and stop.

- Pre-flight detector for future `mol-prd-review` convoys: dispatch should
  fail closed when `<output_dir>/prd-draft.md` does not exist or when
  `Problem / Feature` is empty. The current behavior — launch six legs
  against `<no value>` — silently consumes six polecat sessions and
  produces a synthesis with nothing to synthesize.

## Confidence Assessment

**Low — but only because the input is empty.** Confidence in *this finding*
(that the `xamwy` convoy was dispatched malformed and no scope analysis is
possible) is high: the literal `<no value>` placeholder in the base prompt,
the absent `.prd-reviews/xamwy/` directory at session start, and the contrast
with the well-formed `deploy` convoy are all directly observable. The
sibling requirements leg (`wu-leg-x73x2`, commit `feee0d6`) reached the same
conclusion independently, which strengthens it. Confidence in any judgment
about the *underlying feature's* scope is zero, because there is no
underlying feature to bound.

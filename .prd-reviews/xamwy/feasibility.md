# Technical Feasibility

## Summary

This feasibility review cannot be performed: the `xamwy` convoy was dispatched
without a PRD to assess. The leg bead (`wu-leg-nkknk`) carries the literal
placeholder `**Problem / Feature**: <no value>` in its base prompt, no
`prd-draft.md` exists at `.prd-reviews/xamwy/` (in any polecat worktree, the
rig root, or main), and the sibling legs of this convoy reference no source
document either. The dispatcher `web_ui/crew/full_stack` launched a
`mol-prd-review` convoy with empty inputs.

The dominant finding is therefore that the input required for a feasibility
assessment — a written description of what is being built — is missing. Every
sub-question this leg is supposed to answer ("what's the hardest technical
problem?", "are any requirements technically impossible or very expensive?",
"what unstated technical constraints exist?") is vacuously unanswerable: there
is no proposal to evaluate.

## Findings

### Critical Gaps / Questions

- **Source PRD is absent.** `Problem / Feature` resolved to `<no value>`, and
  no `prd-draft.md` (or equivalent) exists at `.prd-reviews/xamwy/`. The prior
  `deploy` convoy launched with a complete draft at
  `.prd-reviews/deploy/prd-draft.md` and produced six analyses plus a
  synthesis (commit `7c0a86e`). The `xamwy` convoy has none of that input.
  - Why this matters: A feasibility review needs a target. Without one, the
    six legs of this convoy will each produce an "I have nothing to review"
    report, the synthesis step (`wu-syn-*`) cannot meaningfully combine them,
    and six polecat sessions are spent on a no-op.
  - Suggested clarifying question for the human: *Which feature was this
    convoy intended to review? If it was the Deploy PRD, the convoy is
    duplicative — `.prd-reviews/deploy/` already contains a full review with
    a synthesis. If it is a new feature, drop the draft at
    `.prd-reviews/xamwy/prd-draft.md` and re-dispatch the legs, or close the
    open `xamwy` legs with `--reason="no-changes: missing input"`.*

- **Dispatch pipeline did not validate inputs.** The synthesis bead
  descriptions (`wu-syn-5hhoa`, `wu-syn-4hx2i`, `wu-syn-v72q4`) still contain
  raw `{{.problem}}` and `{{.output.directory}}` placeholders, and the per-leg
  prompts pinned `.prd-reviews/xamwy/...` while leaving `Problem / Feature`
  empty. The slug `xamwy` substituted; the problem statement and PRD draft did
  not. There is no pre-flight check refusing to dispatch when those resolve
  to empty.
  - Why this matters: This is a silent failure mode. Any future
    `mol-prd-review` convoy launched without inputs will repeat the same
    six-way no-op pattern. From a feasibility lens, the *dispatch system*
    itself has a small gap that should be patched before more convoys run.
  - Suggested clarifying question for the human: *Should
    `web_ui/crew/full_stack` (or `mol-prd-review`'s entry point) fail closed
    when `<output_dir>/prd-draft.md` is missing or `problem` is empty? A
    one-line existence check would have prevented this convoy.*

### Important Considerations

- **Hard-problem ranking is not possible without a target.** The questions
  this leg is supposed to answer — what's the hardest technical problem,
  which requirements are impossible/expensive, what would double the
  implementation effort if discovered mid-build — all require source text.
  Marking these as "missing" against an absent document would be misleading;
  the document itself is what is missing, not a section within it.

- **Risk of duplicative work.** A complete and recent PRD review for the
  Deploy project already exists at `.prd-reviews/deploy/` (six legs +
  synthesis, commit `7c0a86e`, including a feasibility analysis). If the
  human intended `xamwy` as a re-run of that review, the existing artifacts
  should be reused. If `xamwy` is for a different feature, the source
  document needs to exist before any feasibility judgment is meaningful.

- **No assessable architectural surface.** Even a partial PRD usually
  surfaces *some* architectural pressure (a new persistence layer, a
  third-party SDK, a real-time pathway, a privacy boundary). With no PRD at
  all, there is no surface to push on. This is not "feasibility: high" — it
  is "feasibility: unknown".

### Observations

- The other `xamwy` legs are in the same state. The Requirements Completeness
  leg (`.prd-reviews/xamwy/requirements.md`, written by sibling polecat
  `slit`) reached the same conclusion via the same observable evidence. A
  single corrective action (provide the PRD or close the convoy) clears all
  legs at once.
- A polecat working this leg should *not* invent a PRD or pick a likely
  candidate (e.g., the Deploy draft) and review that instead. Doing so would
  produce a feasibility judgment the human did not request, and the synthesis
  step would treat it as authoritative for a feature the human may not even
  be working on.
- A fast detector for future convoys: have `mol-prd-review` dispatch fail
  closed if `<output_dir>/prd-draft.md` does not exist or the problem
  statement is empty at leg-creation time.

## Confidence Assessment

**Low — but only because the input is empty.** Confidence in *this finding*
(that the convoy was malformed) is high: the bead's literal `<no value>`
placeholder, the missing `xamwy` directory, the unrendered template variables
in the synthesis beads, and the contrast with the well-formed `deploy` convoy
are all directly observable. Confidence in any judgment about the *underlying
feature's* technical feasibility is zero, because no underlying feature
description exists to evaluate.

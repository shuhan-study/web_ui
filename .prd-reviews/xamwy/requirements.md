# Requirements Completeness

## Summary

This review cannot be performed in the normal sense: the convoy `xamwy` was
dispatched without a PRD to review. The leg bead (`wu-leg-x73x2`) carries the
literal placeholder `**Problem / Feature**: <no value>` in its base prompt, no
`prd-draft.md` exists at `.prd-reviews/xamwy/`, and none of the sibling legs
for this convoy (`wu-leg-4bwba` Missing Requirements, plus the other `xamwy`
legs) reference any source document either. The dispatcher
`web_ui/crew/full_stack` appears to have launched a `mol-prd-review` convoy
with empty inputs.

The single, dominant finding is therefore that the most fundamental input to a
requirements-completeness review — a written PRD — is missing. Every
sub-question this leg is supposed to answer ("can someone write a test from
this?", "is done verifiable?", "what would QA flag as untestable?") is vacuously
unanswerable: there is no artifact to grade.

## Findings

### Critical Gaps / Questions

- **Source PRD is absent.** The base prompt's `Problem / Feature` field is
  `<no value>`, and there is no `prd-draft.md` (or equivalent) under
  `.prd-reviews/xamwy/`. By contrast, the prior `deploy` convoy
  (`.prd-reviews/deploy/prd-draft.md`) was launched with a complete draft and
  produced six analyses plus a synthesis (commit `7c0a86e`). Without an
  equivalent draft for `xamwy`, no review of any dimension can produce useful
  output.
  - Why this matters: Running the convoy without input wastes six polecat
    sessions and produces six "I have nothing to review" reports that the
    synthesis step (`wu-syn-*`) cannot meaningfully combine. It also pollutes
    the capability ledger with no-op completions.
  - Suggested clarifying question for the human: *Which PRD was this convoy
    intended to review? If it is the Deploy PRD, the convoy is duplicative —
    `.prd-reviews/deploy/` already contains a full review. If it is a new
    feature, please drop the draft at `.prd-reviews/xamwy/prd-draft.md` and
    re-dispatch the legs, or close the existing legs with
    `--reason="no-changes: missing input"`.*

- **Convoy variable substitution failed silently.** The leg prompts contain
  raw `{{.output.directory}}` and `{{.problem}}` placeholders in the synthesis
  bead descriptions (`wu-syn-5hhoa`, `wu-syn-4hx2i`), and the per-leg prompts
  hardcode `.prd-reviews/xamwy/...` while leaving `Problem / Feature` empty.
  This points at a templating gap in the dispatch pipeline: the slug `xamwy`
  was substituted but the problem statement was not.
  - Why this matters: If the dispatcher does not validate that the
    `problem`/PRD-draft variables resolved, future convoys will keep launching
    six-way no-op reviews. This is a silent failure mode that burns cycles.
  - Suggested clarifying question for the human: *Should the dispatcher (the
    crew member that ran `web_ui/crew/full_stack`) refuse to launch a
    `mol-prd-review` convoy when the problem statement or PRD draft is empty?
    A pre-flight check ("does `<output_dir>/prd-draft.md` exist?") would
    have caught this.*

### Important Considerations

- **No success criteria can be evaluated** until a PRD exists. The standard
  questions this leg targets — measurable outcomes, NFRs (performance, scale,
  reliability), error/failure modes, rollback paths, observability — all
  require source text to score against. Marking these as "missing" against an
  absent document would be misleading: the document itself is what is missing,
  not its individual sections.

- **Risk of duplicate work.** A complete and recent PRD review for the Deploy
  project already exists at `.prd-reviews/deploy/` (six legs + synthesis,
  commit `7c0a86e`). If the human intended `xamwy` as a re-run of that review,
  they should reuse the existing artifacts rather than re-dispatching. If
  `xamwy` is for a different feature, the source document needs to be created
  before any leg can produce signal.

### Observations

- The `xamwy` convoy has at least the following sibling legs open and likely
  in the same state: `wu-leg-4bwba` (Missing Requirements), and the rest of
  the `wu-leg-*` set whose base prompts also reference `.prd-reviews/xamwy/`.
  All of them will hit this same wall. A single corrective action by the
  human (provide the PRD or close the convoy) unblocks/clears all of them at
  once.
- Polecats running this leg should *not* invent a PRD or pick a likely
  candidate (e.g., the Deploy draft) and review that instead — doing so would
  produce a review the human did not request and that the synthesis step
  would treat as authoritative. The right move is to surface the gap and
  stop.
- A fast detector for future convoys: have `mol-prd-review` dispatch fail
  closed if `<output_dir>/prd-draft.md` does not exist at leg-creation time.

## Confidence Assessment

**Low — but only because the input is empty.** Confidence in *this finding*
(that the convoy was malformed) is high: the bead's literal `<no value>`
placeholder, the absent directory, and the contrast with the well-formed
`deploy` convoy are all directly observable. Confidence in any judgment about
the *underlying feature's* requirements completeness is zero, because there
is no underlying feature description to read.

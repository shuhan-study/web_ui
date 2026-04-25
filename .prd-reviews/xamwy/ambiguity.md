# Ambiguity Analysis

## Summary

This leg cannot produce a real ambiguity review: the convoy `xamwy` was
dispatched without a source document. The leg bead (`wu-leg-fu2py`) carries
the literal placeholder `**Problem / Feature**: <no value>` in its base
prompt, no `prd-draft.md` exists at `.prd-reviews/xamwy/`, and the sibling
legs (`wu-leg-x73x2` Requirements Completeness, `wu-leg-nkknk` Technical
Feasibility, `wu-leg-pp5iq` Missing Requirements, plus the rest of the
`xamwy` set) reference no source text either. The dispatcher
`web_ui/crew/full_stack` appears to have run `mol-prd-review` with empty
inputs.

The dominant finding for the ambiguity dimension is therefore that the
*entire convoy is itself ambiguous*: the polecats cannot tell what feature
they are reviewing, what user this is for, or what success looks like —
because no statement of any of those things was supplied. Every question
this leg is supposed to answer ("which sentences could be read two ways?",
"what would two engineers disagree on?", "what will cause a PR debate?")
is vacuously unanswerable: there is no sentence to read, no engineers'
disagreement to anticipate, no PR to imagine.

## Findings

### Critical Gaps / Questions

- **No PRD exists to find ambiguity in.** `.prd-reviews/xamwy/prd-draft.md`
  is absent and the base prompt's `Problem / Feature` field is `<no value>`.
  By contrast, the prior `deploy` convoy launched with a complete draft
  (`.prd-reviews/deploy/prd-draft.md`, commit `ff7e363`) and produced six
  analyses plus a synthesis (`7c0a86e`). Without the equivalent input,
  there is no text whose interpretation could be ambiguous, contradictory,
  or vague.
  - Why this matters: An ambiguity review of nothing produces nothing.
    Worse, if a polecat fabricates a candidate document (e.g., reviewing
    the Deploy draft because it is nearby) the synthesis step
    (`wu-syn-*`) will treat that fabrication as authoritative.
  - Suggested clarifying question for the human: *Which feature was
    `xamwy` supposed to review? If it duplicates the Deploy convoy
    (`.prd-reviews/deploy/`), close these legs with
    `--reason="no-changes: duplicate of deploy convoy"`. If it is a new
    feature, drop the draft at `.prd-reviews/xamwy/prd-draft.md` and
    re-dispatch. If it was a misfire, close with
    `--reason="no-changes: missing input"`.*

- **The dispatch itself is the most ambiguous statement in the convoy.**
  The leg base prompt simultaneously says "find statements in the PRD that
  are ambiguous" *and* leaves the PRD undefined. Two reasonable polecats
  will read this two different ways:
  1. *Strict reading* — "no PRD, no review; surface the gap and stop"
     (this leg's choice; matches sibling `wu-leg-x73x2`).
  2. *Permissive reading* — "review whatever PRD seems most likely
     intended" (would silently substitute the Deploy draft or invent
     content).
  These two readings produce drastically different artifacts. The dispatch
  template gives no guidance on which is correct, which is the precise
  failure mode this leg is supposed to flag.
  - Why this matters: The template ambiguity guarantees inconsistent
    outputs across legs of the same convoy and across future convoys.
  - Suggested clarifying question for the human: *Should the
    `mol-prd-review` template fail-closed when `Problem / Feature` is
    empty or `<output_dir>/prd-draft.md` is missing, rather than
    dispatching legs that must each individually choose a reading?*

- **Variable substitution is partially silent.** The slug `xamwy` was
  substituted into the leg's output paths, but `Problem / Feature` was
  not — the literal string `<no value>` was rendered. This mixed state
  ("some variables resolved, others not") is itself an ambiguous signal:
  a polecat cannot tell whether the empty problem is intentional (the
  feature legitimately has no description and the human wants the convoy
  to surface that) or a templating bug (the dispatcher meant to populate
  it and failed). Both readings are plausible.
  - Why this matters: Polecats cannot distinguish "human asked an empty
    question" from "pipeline lost the question". The two require
    different responses.
  - Suggested clarifying question for the human: *When `Problem /
    Feature` renders as `<no value>`, is that a valid input the leg
    should review-as-empty, or always a dispatch defect?*

### Important Considerations

- **"Ambiguity" terms in the dispatch are themselves not defined for the
  empty case.** The leg's checklist asks about vague language ("fast",
  "simple", "reasonable"), undefined terms, contradictions, implicit
  assumptions, and "should vs must vs could" — all of which assume there
  is text to grade. The template does not specify the correct behavior
  when *zero* statements exist to grade. Different polecats will fill in
  this gap differently (write a no-op report, refuse the leg, fabricate
  content, escalate to Witness). Each is defensible against the literal
  prompt.

- **Scope of "the PRD" is unclear even on a populated convoy.** Even when
  `prd-draft.md` exists, the leg prompt does not say whether linked
  documents (architecture notes, base PRDs, project PLANs in `.beads/` or
  `docs/`) are in-scope. For `xamwy` this is moot, but it is a
  template-level ambiguity that will recur on the next real convoy.

### Observations

- All `xamwy` legs are wedged on the same root cause. A single corrective
  action by the human — supply the PRD, or close the convoy — unblocks
  every leg at once.
- Polecats on this convoy should *not* invent a PRD or substitute a
  nearby candidate (the Deploy draft is the nearest neighbor and the most
  tempting). Doing so produces a review the human did not request and
  feeds bogus signal into the synthesis step.
- A fast detector for future convoys: have `mol-prd-review` dispatch
  fail-closed if `<output_dir>/prd-draft.md` does not exist or if
  `Problem / Feature` resolves to empty / `<no value>` at leg-creation
  time. This would convert the silent template ambiguity into a loud
  dispatch error.
- The sibling Requirements Completeness leg (`wu-leg-x73x2`, owner
  furiosa) reached the same conclusion independently and wrote
  `.prd-reviews/xamwy/requirements.md` (≈5.3 KB) describing it. The two
  reports agree, which is itself useful corroboration of the dispatch
  defect rather than a polecat-specific misreading.

## Confidence Assessment

**Low on the underlying feature, High on the dispatch defect.** Confidence
in *this finding* — that the convoy was malformed and there is nothing to
review — is high: the literal `<no value>` placeholder, the absent
`prd-draft.md`, the contrast with the well-formed `deploy` convoy, and the
matching independent finding from sibling `wu-leg-x73x2` are all directly
observable. Confidence in any judgment about the underlying feature's
ambiguity is zero, because there is no underlying feature text to read.

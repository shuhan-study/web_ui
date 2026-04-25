# Ambiguity Analysis

## Summary

The PRD is unusually disciplined about flagging its own unknowns (Open
Questions section is well-curated), and decisions are explicitly locked
where appropriate ("do NOT relitigate"). Most ambiguities are at a finer
grain than the OQ section captures: word choices like "fresh," "default,"
"smoke-verifiable" each carry implementation consequences that could be
read two ways. The riskiest single ambiguity is goal #2's "fresh data on
every load" — the PRD redefines "fresh" mid-sentence ("since the last
`git push`"), which is correct but the goal title still suggests
real-time freshness and could mislead a casual reader (or a future
polecat) into building something stronger than required.

## Findings

### Critical Gaps / Questions

- **"Fresh data on every load" (goal #2) means two different things.** The
  goal title implies request-time DB read; the parenthetical clarifies it
  means "since last push." A future implementer could reasonably read this
  as "we need request-time freshness" and over-engineer (e.g., add a cache
  bust, refuse to use any caching). The clarification needs to be lifted
  out of the parenthetical.
  - *Suggested clarifying question:* Confirm: "fresh" = "the bundled
    `dev.db` from the most recent successful deploy, read at request time,
    no per-request caching" — yes/no?

- **"Smoke-verifiable on the live URL" (goal #7) — verified by whom?**
  Rongjun manually? An automated check? A checked-in markdown checklist
  run by hand? PRD's Open Question #6 surfaces "Markdown checklist vs.
  bead checklist" but doesn't surface the *who* question.
  - *Suggested clarifying question:* Who runs the smoke pass — Rongjun on
    laptop, or a polecat in a final verification bead?

- **"Empty assignments list" (goal #6) — what counts as "empty"?** Zero
  rows in the `assignments` table for that subject? Rows where all are
  marked excluded? Rows where the assignments list at the API level is
  `[]`? Each is a different code path.
  - *Suggested clarifying question:* Define "empty" — `assignments.length
    === 0` after Prisma returns the list? Or another condition?

- **"In place of the stale grade letter / percent subtitle" — replacement
  scope.** Does "subtitle" mean the small grade letter shown next to the
  subject name on the `/grades` card? Or the subject page header? Or both?
  S1 says cards on `/grades` already wouldn't show a stale letter (S5);
  S5 implies the page-level subtitle is the target. PRD doesn't pin this.
  - *Suggested clarifying question:* Which UI surface(s) carry the
    zero-state — grade list cards, subject detail page header, or both?

- **"Out-of-band hazard" framing for the mayor worktree.** "In scope to
  *not trigger*" — what does an implementer concretely *do* with this?
  Avoid running any `git` command in `mayor/rig/`? Avoid running `gt`
  commands while mayor session might wake? The negative requirement is
  unactionable without a positive procedure.
  - *Suggested clarifying question:* What's the concrete guardrail —
    "implementer never `cd`s into mayor/rig" plus "mayor stays down
    until repo cleanup"? Make it a checkable step.

### Important Considerations

- **"Default `*.vercel.app` is sufficient" vs "default `*.vercel.app` is
  fine for landed."** PRD uses both phrasings (Goals §1 and Non-Goals).
  Is the Vercel-assigned URL like `web-ui-shuhan.vercel.app`, or do we
  pick a slug? The phrasing implies *any* default is fine; an
  implementer might want clarity to avoid bikeshed.

- **"Every page that renders the Navbar" (goal #4)** — does the 404 page
  render the Navbar? The about page? Implicit "all of them" but the
  styled 404 may not. Worth a one-liner.

- **"Subject pages that *do* have assignments are unchanged" (goal #6)**
  — "unchanged" relative to what? Current production (which doesn't
  exist) or current dev behavior? If dev behavior is the baseline, an
  implementer must verify *exactly that* renders; "we made no change" is
  not the same as "the visible output is identical."

- **Open Question #5 says "should we also confirm the *order*" but then
  pre-resolves with "Probably yes — Grades is the primary destination."**
  Is the implementer authorized to act on that probably, or do we need
  a confirmed answer before they touch the Navbar? Soft pre-resolution
  is ambiguous.

- **"No bundle / performance audit" (non-goals) vs. "87.3 KB shared First
  Load JS is acceptable" (also non-goals).** The latter implies a bar
  was set; the former says we won't check it. If the deploy somehow
  makes it bigger (Prisma client bundle, force-dynamic affecting
  splitting), do we care? PRD says no but the specific number reads
  like a tripwire.

- **"Pivot trigger" for Option B (Constraints).** "If Prisma + SQLite
  proves flaky" — "flaky" is unspecified. Two failures? Cold-start
  exceeding N seconds? Random 500s? Implementer needs a threshold or
  this becomes a judgment call mid-build.

- **"No mid-session writes" (non-goals) vs. "App stays read-only at
  runtime."** The first is the rule, the second is the consequence.
  Implementer might wonder: does this mean *no write paths exist in code
  at all*, or just that they aren't called? Prisma client allows
  writes by default; do we need to refuse them at the connection level?

### Observations

- The PRD distinguishes "must" / "should" / "could" implicitly through
  Goals vs. Non-Goals vs. Open Questions. That's fine for a draft, but
  a future implementer in a hurry could miss the distinction between an
  Open Question (probe needed) and a Constraint (decided).

- "RSC-friendly" (Open Question #4) is jargon a future polecat may not
  parse; either explain or remove.

- "Technical correctness" subhead under Constraints conflates two
  separate concerns: route rendering mode (force-dynamic) and runtime
  filesystem mode (read-only `dev.db`). Splitting them prevents
  "we did one, called it done" risk.

- "The `web/.gitignore` currently un-ignores `/prisma/dev.db` on
  Rongjun's local working tree (stashed by full_stack as `wu-avk
  pre-pull: un-ignore dev.db edit`)" — the embedded stash label may
  rot. It's better to reference the bead than the stash.

- "Three correctness fixes in parallel-able beads" (Rough Approach #4)
  is described as parallel but Navbar link change touches the same
  layout file as routing changes might (depending on how root redirect
  is implemented). Verify they actually don't conflict before
  parallelizing.

- "Trivial, but flagging" (OQ #5) is a tic that occurs in the document.
  Worth deciding: are these blockers or aren't they? "Trivial" implies
  not, "flagging" implies yes.

## Confidence Assessment

**Medium-High.** The PRD's deliberate self-questioning surfaces most of
its own ambiguities, and the locked decisions are unambiguous. The
remaining ambiguities are mostly word-level and resolvable in a single
sit-down with the overseer. The largest single risk is goal #2's
"freshness" definition, which is critical-path for the entire deploy
strategy and is currently buried in a parenthetical.

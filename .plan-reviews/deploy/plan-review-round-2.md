# Plan-Review Round 2: risk + scope-creep

_Date: 2026-04-25 · Driver: web_ui/crew/full_stack._

## Reviewers

- **Risk** — `web_ui/polecats/capable` (bead `wu-nj2`,
  mail `hq-wisp-hp4pu`). Result: 3 must-fix, 5 should-fix.
  Per-dimension log: `.plan-reviews/deploy/plan-review-round-2-risk.md`.
- **Scope-creep** — `web_ui/polecats/dementus` (bead `wu-wkz`,
  mail `hq-wisp-fty0c`). Result: 0 cut, 0 defer, 1 simplify.
  Per-dimension log: `.plan-reviews/deploy/plan-review-round-2-scope-creep.md`.

Plan reviewed: `.designs/deploy/design-doc.md` post plan-review r1
(commit `4210273`).

## Findings (3 must-fix risk + 1 should-fix scope-creep + 5 should-fix risk)

### Must-fix

1. **R-M1 — `prisma/dev.db` not auto-traced into Vercel artifact.**
   Next's serverless tracer only includes *imported* files; `dev.db`
   is opened via `DATABASE_URL` so it isn't auto-included. Standard
   Next-on-serverless gotcha; second-most-likely B1 failure mode
   after the binaryTargets miss.
2. **R-M2 — Probe→main fidelity gap.** B1 verifies on a throwaway
   branch; nothing required B2's main commit set to *equal* what was
   verified. False-green probe → B8c surprise.
3. **R-M3 — R3 'no-anonymization' residual severity unstated, B8a
   sign-off too light for a waiver.** Plan documents the waiver
   mechanism (B1.5 closed-as-waived, PLAN.md log) but doesn't state
   residual severity in that branch and treats sign-off as
   procedural rather than informed-consent.

### Should-fix

4. **SC-SIMPLIFY-1 — Drop preemptive `dev.db-wal` + `dev.db-shm`
   gitignore patterns.** WAL mode isn't enabled; Vercel runtime is
   read-only. Adding patterns for files that don't exist is
   over-engineering.
5. **R-S1 — B0 has no SLA / fallback.** Mayor unresponsive → project
   blocked indefinitely against R9 soft deadline.
6. **R-S2 — Plan-approval gate items have no fallback defaults.**
   Six items aggregate at the gate; no timeline, no defaults if
   overseer unreachable. Anonymization in particular could ship with
   real PII as silent default.
7. **R-S3 — Prisma 5.x bump regression test surface unnamed.** PRD
   Q3 carve-out allows the bump; plan doesn't say what to test.
8. **R-S4 — Vercel Hobby tier limits not flagged in §Risks.**
9. **R-S5 — B11 'one-line bump' criterion too subjective.** Could
   pull transitive lockfile churn into the critical-path deploy.

## Fixes applied to design-doc.md

### Must-fix fixes

- **R-M1:** Added **B1(d)** — fourth probe acceptance item for
  `dev.db` runtime presence (probe page or build-output inspector).
  Most-likely fix `outputFileTracingIncludes` written to
  `web/next.config.mjs`; if needed, folds into B2's atomic commit
  alongside `binaryTargets` (and B8b's `headers()`) — single
  `next.config.mjs` rewrite, one file in the diff.
- **R-M2:** Tightened B1 with **probe→main fidelity clause:**
  B2 cherry-picks the exact commit B1 verified on the throwaway
  branch (path (i) from reviewer's options — cheapest); B1 records
  the probe-branch SHA, B2 references it.
- **R-M3:** §Risks/R3 now states residual severity on the
  no-anonymization branch (HIGH impact, LOW-MEDIUM likelihood, only
  layers (b)+(c) remain). B8a's privacy sign-off promoted from
  procedural ack to informed-consent waiver requiring overseer text
  to name the subject + URL + PII fields + HIGH residual impact
  defended only by `noindex` + repo-private.

### Should-fix fixes

- **SC-SIMPLIFY-1:** §Key Components updated — `dev.db-wal` and
  `dev.db-shm` patterns dropped from B2's `.gitignore` edit.
- **R-S1:** B0 acceptance now includes a **48h SLA** with
  overseer-manual fallback (`git -C <mayor-worktree> reset --hard
  HEAD && git -C <mayor-worktree> clean -fd` after diagnostic
  snapshot).
- **R-S3:** B1 carve-out now requires `npm run build` + localhost
  smoke walk of `/grades`, `/subject/[id]`, `/about`, `/` redirect
  if a Prisma bump is taken.
- **R-S4:** Added **R10 — Vercel Hobby tier limits**. No active
  monitoring; first-look-on-broken-URL = check Vercel dashboard
  quota.
- **R-S5:** B11 criterion tightened: "patch-level only AND no
  transitive lockfile changes outside the patched package's tree"
  — otherwise defer to post-Deploy.

### Should-fix routed to plan-approval gate (not applied here)

- **R-S2 (gate fallback defaults):** Adds a *new* requirement on the
  plan-approval mail — for each of the 6 carry-forward items, name
  the conservative default that takes effect after N days of no
  reply. Reviewer's suggested defaults:
  - **Anonymization** → default-yes (safest; ships with anonymized
    PII rather than real PII)
  - **B10 tag-cut actor** → default "overseer cuts manually"
  - **O-1 smoke 6-scenario opt-in** → default-no (current plan
    implicit)
  - **R9 deadline ratification** → default "deadline-aware,
    not deadline-driven"
  - **`npm run reseed` ratification** → default-yes (ergonomics
    adjunct)
  - **`robots.txt`+noindex ratification** → default-yes
    (defense-in-depth)

  The plan-approval mail (Blocker-2 contract) will name each default
  + N-day window. Removes the silent-skip risk on the most
  consequential gate item.

## Plan-approval gate carry-forward (cumulative; r1+r2)

To be put in front of overseer at the manual gate (Blocker-2
contract) after `plan-review-3`. **Each item now carries a default
that auto-applies if no reply within N days** — N to be set in the
gate mail.

| # | Item                                            | Default          |
|---|-------------------------------------------------|------------------|
| 1 | B10 tag-cut actor                               | overseer manual  |
| 2 | Seed anonymization yes/no                       | yes              |
| 3 | `npm run reseed` ratification                   | yes              |
| 4 | `robots.txt` + `noindex` ratification           | yes              |
| 5 | R9 deadline framing                             | deadline-aware   |
| 6 | O-1 6-scenario smoke opt-in                     | no               |

## Round 2 verdict

**3 must-fix + 1 should-fix scope-creep + 5 should-fix risk → all
applied (R-S2 routed to plan-approval gate as a structural
strengthening).** Plan after r2 fixes is materially tighter on
serverless-asset bundling, probe→main fidelity, and the
no-anonymization branch's informed-consent posture. Proceeding to
plan-review round 3 (testability + coherence).

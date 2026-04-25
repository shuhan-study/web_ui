# Plan-Review Round 3: testability + coherence (FINAL)

_Date: 2026-04-25 · Driver: web_ui/crew/full_stack._

## Reviewers

- **Testability** — `web_ui/polecats/capable` (bead `wu-ig7`,
  mail `hq-wisp-ezbp3`). Result: 1 must-fix, 7 should-fix, 5 obs.
  Per-dimension log: `.plan-reviews/deploy/plan-review-round-3-testability.md`.
- **Coherence** — `web_ui/polecats/dementus` (bead `wu-9qz`,
  mail `hq-wisp-mdaf2`). Result: 2 must-fix, 4 should-fix.
  Per-dimension log: `.plan-reviews/deploy/plan-review-round-3-coherence.md`.

Plan reviewed: `.designs/deploy/design-doc.md` post plan-review r2
(commit `f2948a5`).

## Findings (3 must-fix, 11 should-fix)

### Must-fix

1. **T-M1 — B8b acceptance straddles a phase boundary.** Live-URL
   `curl` checks can't run before B8c's first deploy → either bead
   stays open across B8c (breaks "each phase independently
   verified") or closes on trust.
2. **C-M1 — `npm run reseed` script path broken.** Real seed JSON
   is at `web/data/seed/grades.json`; script wrote
   `../data/seed/grades.json` (resolves to `<repo-root>/data/seed/...`
   which doesn't exist). Would fail B2's smoke.
3. **C-M2 — B2 ↔ B8b race on `web/next.config.mjs`.** If B1(d) needs
   `outputFileTracingIncludes`, both B2 and B8b modify the same file
   in parallel. Bead-graph parallel dispatch → merge conflict.

### Should-fix

4. **T-S1 — B9 smoke per-item pass criteria undefined.**
5. **T-S2 — B10 acceptance vague.**
6. **T-S3 — B7 copy not locked + non-deterministic trigger.**
7. **T-S4 — B1.5 anonymization patterns under-specified.**
8. **T-S5 — B6 acceptance assumes a fixture that may not exist.**
9. **T-S6 — B4 verification mode unstated (manual or scripted?).**
10. **T-S7 — B11 folded-in acceptance unstated.**
11. **C-S1 — §Key Components misses `web/app/robots.ts`.**
12. **C-S2 — B6 gating rationale technically misstates pivot risk.**
    (Schema is portable; honest reason is wasted-work avoidance.)
13. **C-S3 — B8a omits "no Vercel account yet" branch** despite
    plan-approval gate carry-forward item #6.
14. **C-S4 — B11 transitive-lockfile criterion has no verification
    surface.**

## Fixes applied to design-doc.md

### Must-fix fixes

- **C-M1:** Changed both occurrences (lines 132, 563) of
  `../data/seed/grades.json` → `data/seed/grades.json` (npm runs
  from `web/`, so the seed JSON is repo-relative `data/seed/...`
  not `../data/seed/...`). Bug bypass surfaced via B2 acceptance
  smoke run.
- **C-M2:** Added a **Coordination clause** in B8b spec — if B1(d)
  required `outputFileTracingIncludes`, B8b rebases on top of B2's
  commit before opening; the `headers()` block appends below
  `outputFileTracingIncludes` in the same `next.config.mjs` file.
  No graph change required; coordination is explicit textual.
- **T-M1:** Split B8b/B8c acceptance:
  - **B8b acceptance** (commit-time, no live URL): file-read
    verification of `headers()` config + `web/app/robots.ts`
    existence + `npm run build` exits 0.
  - **B8c acceptance gains:** the live-URL `curl` checks for
    `x-robots-tag: noindex` and `robots.txt` body fold into B8c.
  - Each phase now independently verifiable before the next.

### Should-fix fixes

- **T-S1:** B9 acceptance now pins per-item pass criteria for all
  5 PRD-goal-#7 items (`/grades`, `/subject/[id]`, `/about`, styled
  404, reseed-and-redeploy) plus the optional 6th (S6). Each item
  is a `curl` + grep or operational step.
- **T-S2:** B10 acceptance: `git ls-remote --tags origin
  v0.7-deploy-complete` returns SHA matching `origin/main`; tag
  visible in GitHub UI; SHA captured in bead notes.
- **T-S3:** B7 copy locked to: *"Hmm, the grade tracker isn't
  working right now. Your dad will fix it soon."* (overridable at
  plan-approval gate). Deterministic trigger added: set
  `DATABASE_URL=file:/nonexistent.db` + curl `/grades`.
- **T-S4:** B1.5 acceptance now lists machine-checkable patterns:
  first-name only, school = literal `"Middle School"`,
  teachers = `Ms. <Initial>.`/`Mr. <Initial>.` only; verified via
  `git grep` for real values returning no matches.
- **T-S5:** B6 acceptance now requires the polecat to name the
  empty-assignments fixture (or introduce one). Verification via
  `curl -s ... | grep "No assignments yet"`.
- **T-S6:** B4 acceptance now `curl`-grep based for both `/grades`
  and `/about`; DOM order check; active class check.
- **T-S7 + C-S4:** B11 acceptance now includes (a) verification of
  the patch-level + lockfile-scope criterion via scratch-branch
  `npm install` + `package-lock.json` diff inspection; (b)
  fold-in acceptance via Dependabot alert closure + `npm audit`
  zero-moderate count.
- **C-S1:** §Key Components now lists `web/app/robots.ts` as a new
  file (B8b).
- **C-S2:** B6 gating rationale rewritten: "Reads from Prisma; if
  B1 fails and we pivot to Option B, this bead's polecat re-runs
  against the pivoted client. Gating avoids wasted work in the
  pivot branch — the schema itself is portable per §Data Model
  line 223."
- **C-S3:** B8a now starts with a conditional pre-step: "If no
  Vercel account exists for the GitHub user/org, create one (~30s
  sign-up flow, free Hobby tier); record outcome in bead notes."

## Observations (logged from testability O1–O5; not classified)

- B1(b) "document the winning value" is correctly an artifact gated
  by B1(a).
- B1(c) verification mechanism is `fs.readdir` on `prisma/` in the
  B1(d) probe page, asserting no `*-journal` entries.
- Vercel UI checks (B8a screenshot + Node version) are manual by
  necessity; `vercel env ls` is the strongest auto-proof and is
  already in the acceptance.
- PRD-lock "no test infrastructure" honoured throughout.
- After T-M1's split, "each phase independently verifiable before
  the next" holds fully.

## Plan-approval-gate impact

T-S3 (B7 copy lock) was a candidate 7th item. **Decision (driver):**
fold the copy lock into B7 with the locked default — a one-line
override at the gate is still possible, but the carry-forward table
stays at 6 items so the gate mail doesn't bloat. (T-S3's locked
copy IS the default the gate would have pinned anyway.)

## Cross-round carry-forward mapping check (per coherence reviewer)

| # | Item                                | Mapped in design                                       |
|---|-------------------------------------|--------------------------------------------------------|
| 1 | B10 tag-cut actor                   | ✅ B10 spec, OQ #4                                     |
| 2 | Seed anonymization yes/no           | ✅ B1.5 + B8a + R3 + OQ #2                             |
| 3 | npm run reseed ratification         | ✅ B2 + §Decisions Made                                |
| 4 | robots.txt + noindex ratification   | ✅ B8b + §Decisions Made                               |
| 5 | R9 deadline framing                 | ✅ §Risks/R9                                           |
| 6 | O-1 6-scenario smoke opt-in         | ✅ B9                                                  |
| 7 | Vercel account creation branch      | ✅ B8a (added in r3 C-S3 fix)                          |
| – | R-S2 gate-defaults table            | – Gate-mail only (intentional; not in design-doc)      |

**Coherence check passed:** all r1+r2+r3 carry-forwards now reach
design-doc text.

## Round 3 verdict

**3 must-fix + 11 should-fix → all applied.** Plan-review stack
closes after 3 rounds × 2 dimensions = 6 dimensions × ~60 distinct
findings, all dispositioned. Plan is **ready for the manual
plan-approval gate (Blocker-2 contract)**. No further self-review
rounds; next action is the gate mail to overseer.

# Plan-Review Round 1: completeness + sequencing

_Date: 2026-04-25 · Driver: web_ui/crew/full_stack._

## Reviewers

- **Completeness** — `web_ui/polecats/capable` (bead `wu-xh3`,
  mail `hq-wisp-97wwq`). Result: 3 must-fix, 5 should-fix, 1 obs.
  Per-dimension log: `.plan-reviews/deploy/plan-review-round-1-completeness.md`.
- **Sequencing** — `web_ui/polecats/dementus` (bead `wu-36o`,
  mail `hq-wisp-pmo48`). Result: 2 must-fix, 2 should-fix.
  Per-dimension log: `.plan-reviews/deploy/plan-review-round-1-sequencing.md`.

Plan reviewed: `.designs/deploy/design-doc.md` post-prd-align (r3
commit `bb8b354`).

## Findings (deduped: 5 must-fix, 7 should-fix)

### Must-fix

1. **C-M1 — `X-Robots-Tag: noindex` impl surface unnamed.** B8 said
   it ships the header but `next.config.mjs` was on the
   NOT-touched list and no other surface was named.
2. **C-M2 ≡ S-F2 — `npm run reseed` script unowned.** Both reviewers
   caught this. Listed in §Key Components / R6 / B9 acceptance but
   no bead in B0–B11 owned the package.json edit.
3. **C-M3 ≡ S-F4 — Anonymization yes-branch unowned + miss-sequenced.**
   No bead implemented the seed-data anonymization path; if it ran
   after B2 it would commit real PII for an 11-year-old as the
   permanent-history first commit (R4).
4. **S-F1 — `schema.prisma binaryTargets` edit unowned.** R1's
   most-likely fix path; B1 is a probe (no main commit), B2 only
   landed dev.db, so the fix never reached main and B8 would trip
   on the engine-target mismatch B1 was designed to prevent.
5. **S-F3 — B3/B4/B5 unnecessarily gated on B1 green.** Asymmetric
   with B7 (rationale "independent of DB-platform outcome" applied
   to B3/B4/B5 too); serialized parallelizable work without
   correctness justification.

### Should-fix

6. **C-S1** — B8 bundled ~9 sub-items; split.
7. **C-S2** — R4 "Add to README" mitigation had no bead owner.
8. **C-S3** — B9 smoke checklist contents undefined.
9. **C-S4** — B4/B5/B6/B7 lacked acceptance criteria (only B3 had one).
10. **C-S5** — Rollback paths missing for B8 deploy and B9 smoke.
11. **F3 (sequencing variant)** — graph improvement (folded into the
   must-fix above by decoupling B3/B4/B5; should-fix flag was the
   same root cause).

## Fixes applied to design-doc.md

### Must-fix fixes

- **C-M1:** B8 split into **B8a** (Vercel configure), **B8b**
  (robots.txt + `next.config.mjs` `headers()` + `web/app/robots.ts`),
  **B8c** (first deploy + URL capture). `web/next.config.mjs`
  removed from §Files NOT touched and promoted to "single-purpose
  `headers()` addition." Implementation surface named explicitly in
  B8b.
- **C-M2 ≡ S-F2:** Folded `npm run reseed` script into **B2**
  (alongside `dev.db` + `.gitignore` + `binaryTargets`). Acceptance
  includes `npm run reseed` exiting 0 in a smoke run.
- **C-M3 ≡ S-F4:** Added **B1.5 (conditional)** between B1 and B2.
  Opens iff plan-approval-gate answer is yes; closed-as-waived if no
  (with PLAN.md privacy-waiver text). B2 now hard-depends on B1.5.
- **S-F1:** Folded `schema.prisma binaryTargets = ["native",
  "rhel-openssl-3.0.x"]` into **B2**'s atomic commit alongside
  `dev.db` + `.gitignore` + `package.json`. Acceptance includes
  `npx prisma validate` passing.
- **S-F3:** **B3, B4, B5, B7, B8a, B8b** now all depend only on B0
  (mirroring B7's rationale). **B6** stays gated on B1 (Prisma query
  shape). Bead-graph diagram redrawn.

### Should-fix fixes

- **C-S1:** B8 split into B8a / B8b / B8c (above).
- **C-S2:** Added one-line `web/README.md` "repo must stay private"
  addition to **B9**'s acceptance.
- **C-S3:** **B9** now inlines the PRD goal #7 5-item smoke
  checklist (`/grades`, `/subject/[id]`, `/about`, styled 404,
  reseed-and-redeploy) and surfaces the optional opt-in for the
  full 6-scenario walk (r3 observation O-1) at the plan-approval
  gate.
- **C-S4:** Acceptance lines added to **B4**, **B5**, **B6**, **B7**.
- **C-S5:** Rollback paths named — **B8c**: Vercel dashboard
  "Redeploy from previous successful build" or commit-revert + push;
  **B9**: do NOT stamp `reseed cycle: ✅` until issue resolved;
  surface failure as B10's named blocker.

## Side-effects of these fixes

- **Bead count went from B0–B11 (12 named) to B0, B1, B1.5, B2, B3,
  B4, B5, B6, B7, B8a, B8b, B8c, B9, B10, B11 (15 named).** Net
  complexity is similar but the graph topology is cleaner.
- **`web/next.config.mjs` no longer empty post-Deploy.** The
  PRD-locked "narrow" framing still holds — the file gets one
  function (`headers()`).
- **B6 is the only remaining B1-gated UI bead.** Conscious choice
  documented in B6 spec.

## Plan-approval gate carry-forward (cumulative through plan-review r1)

To be put in front of overseer at the manual gate (Blocker-2
contract):
1. **B10 tag-cut actor** (prd-align r1)
2. **Seed anonymization yes/no** (prd-align r2 strengthened): now
   gates B1.5 → B2 chain
3. **Three borderline ratifications** (prd-align r2): npm run
   reseed (now part of B2), robots.txt+noindex (now B8b), seed
   anonymization disposition (rolls up into item 2)
4. **R9 deadline framing** (prd-align r2)
5. **O-1 smoke coverage opt-in** (prd-align r3): inlined as
   default-no in B9, opt-in available
6. **Vercel account creation step** (prd-align r3 deferred-OK):
   B8a starts with creation if account/link doesn't pre-exist

## Round 1 verdict

**5 must-fix, 7 should-fix → all applied.** Plan-completeness +
sequencing now sound. Bead graph redrawn. Proceeding to plan-review
round 2 (risk + scope-creep).

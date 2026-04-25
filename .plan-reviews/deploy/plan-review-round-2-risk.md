# Plan-Review Round 2 — Risk Check

_Reviewer: web_ui/polecats/capable · Bead: wu-nj2 · Date: 2026-04-25._
_Plan reviewed: `.designs/deploy/design-doc.md` post-plan-review-r1 (commit 4210273)._

## Verdict on existing R1-R9

R1-R9 are well-formed. Plan-review-r1 fixes (B8 split, B1.5 added, decoupled
gates, rollback paths in B8c/B9) materially tightened the risk surface.
Severity calibration is fine in 8/9 cases. **R3 needs recalibration on the
'no-anonymization' branch** (see M3).

## Findings: 3 must-fix, 5 should-fix

### MUST-FIX

**M1 — `prisma/dev.db` may not be bundled into the Vercel function artifact.**
Next.js serverless tracing only includes imported files. `dev.db` is opened
via `DATABASE_URL` string at runtime — nothing imports it, so it may not exist
at `/var/task/prisma/dev.db`. B1(b) covers path resolution, not file
inclusion.
- Impact: HIGH · Likelihood: MEDIUM-HIGH · Mitigation: must-fix
- Action: add B1 acceptance item (d) that verifies file presence at runtime
  cwd; if probe needs a fix, fold `outputFileTracingIncludes` into B2's
  atomic commit.

**M2 — Probe → main fidelity gap.**
B1 verifies on a throwaway branch; B2 lands on main. Nothing requires
byte-equality between probe and B2 commit. Reseed regenerates `dev.db`
non-deterministically across runs.
- Impact: HIGH · Likelihood: MEDIUM · Mitigation: must-fix
- Action: tighten B1 acceptance — B2 cherry-picks the exact commit B1
  verified, OR B1's throwaway branch deletes and B2 re-runs probe inline
  against `main`, OR hash-equality check on `dev.db` + `schema.prisma` +
  `next.config.mjs`.

**M3 — R3 residual severity is unstated for the 'no-anonymization' waiver.**
R3 mitigation (a) is conditional on plan-approval-gate. If 'no', layers
(b)+(c) only remain. Plan documents the waiver mechanism but not the
residual HIGH severity, and B8a's privacy sign-off is procedural, not
informed-consent on a named subject.
- Impact: HIGH · Likelihood: LOW-MEDIUM · Mitigation: must-fix
- Action: add to §Risks/R3: 'no-anonymization branch leaves residual impact
  HIGH'; strengthen B8a sign-off to reference R3 explicitly + name the
  subject + URL in the waiver text.

### SHOULD-FIX

**S1 — B0 (Mayor cleanup) has no SLA / fallback.** Project blocks entirely
on Mayor. No upper bound, no escalation. Impact HIGH · Likelihood
LOW-MEDIUM. Action: B0 footnote — overseer takes over manual cleanup if
Mayor unresponsive >48h.

**S2 — Plan-approval gate has no availability fallback.** Six items at
gate; no default if overseer unreachable. Impact MEDIUM · Likelihood
LOW-MEDIUM. Action: name conservative default per item (anonymization
→ default-yes, B10 actor → default-overseer-manual, O-1 → default-no).

**S3 — Prisma 5.x patch-bump regression test surface unnamed.** Carve-out
allows bump if B1 fails; no test for unrelated regressions. Impact MEDIUM
· Likelihood LOW-MEDIUM. Action: B1 carve-out paragraph requires
`npm run build` + localhost smoke of all PRD scenarios before B2 opens.

**S4 — Vercel Hobby tier constraints not flagged.** Bandwidth,
build-minutes, region-locking absent from §Risks. Impact LOW-MEDIUM ·
Likelihood LOW. Action: one-line R10 addition acknowledging tier limits
and 'check Vercel quota first if URL broken'.

**S5 — B11 'one-line bump' criterion is subjective.** Single line in
`package.json` can pull transitive lockfile churn. Impact LOW ·
Likelihood LOW-MEDIUM. Action: replace 'one-line' with 'patch-level only
AND no transitive lockfile changes outside the patched package's tree';
or just defer all of B11 to post-Deploy.

## Spike / POC coverage

B1 IS the spike for the primary risk. Adding M1's
`outputFileTracingIncludes` verification keeps coverage proportional. No
additional standalone spike beads needed.

## Severity calibration

- R1-R2, R5-R9: well-calibrated.
- **R3: under-calibrated on 'no-anonymization' branch** — see M3.
- R4: correctly LOW likelihood / HIGH impact (irreversible).

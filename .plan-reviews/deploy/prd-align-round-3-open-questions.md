# PRD-Align Round 3 — Open Questions Resolution Check

_Date: 2026-04-25 · Reviewer: web_ui/polecats/dementus · Bead: wu-bmi._

Plan reviewed: `.designs/deploy/design-doc.md` (post round-1 + round-2 fixes).
PRD: `.prd-reviews/deploy/prd-draft.md` (PRD §Open Questions 1–8 +
Clarifications Q1–Q7).
Round-1 + Round-2 logs: `.plan-reviews/deploy/prd-align-round-1.md`,
`.plan-reviews/deploy/prd-align-round-2.md`,
`.plan-reviews/deploy/prd-align-round-2-non-goals.md`.

Review-only — no plan edits. Classification: each OQ is RESOLVED (plan
answers it), DEFERRED-OK (plan explicitly defers with a named task),
or UNRESOLVED (must-fix).

---

## PRD §Open Questions (8 items)

### OQ1 — Does Prisma + read-only SQLite work on Vercel serverless?

**RESOLVED.** Plan §Implementation Plan / B1 (lines 466–484) gates the
project on a single probe bead with the 3-item acceptance checklist
that PRD-Q1 mandates. Recommended fixes pre-staged:
`binaryTargets = ["native", "rhel-openssl-3.0.x"]` (design lines
44–46, 110–112, 200–207) and `?mode=ro&immutable=1` open mode (lines
47–49, 192–199). Failure-mode mitigations and pivot path
(file P0 "Switch to Option B", stop Deploy) explicitly named at lines
478–479 and R1 (lines 348–363).

### OQ2 — Right `DATABASE_URL` on Vercel?

**RESOLVED.** Plan §Data Model (lines 192–199) and §Decisions Made
(lines 248–249, "Resolves PRD Open Question #2") prescribe the
absolute path with `?mode=ro&immutable=1` query string. B1(b) (line
471–473) verifies the winning value at probe time and writes it into
bead notes; B8 (line 522) consumes it as a Vercel env var.

### OQ3 — How do we trigger the redeploy on reseed?

**RESOLVED.** Plan §Interface (lines 154–160) names Vercel's GitHub
auto-deploy as the entire trigger mechanism (no manual hook). B8
(line 521–522, "deploy on push to `main`") configures it. The PRD's
specific sub-question — "does Vercel rebuild even when only `dev.db`
binary changed?" — is verified end-to-end inside B9 (lines 538–541,
"perform reseed cycle end-to-end ... commit smoke.md with `reseed
cycle: ✅ <date>`"). The reseed-cycle stamp IS the test for this.

### OQ4 — Where does the redirect for `/` live?

**RESOLVED.** Plan §Decisions Made (lines 253–254, "Redirect
implementation: `app/page.tsx` calling `redirect()`, not
`next.config.mjs`. Resolves PRD Open Question #4."). Implemented in
B5 (lines 506–508).

### OQ5 — Is `Grades` the right Navbar label? Order?

**RESOLVED.** Plan §Decisions Made (line 255, "Navbar order: `Grades
| About | DarkMode`. Resolves PRD OQ #5.") and B4 (lines 502–504)
both use the label `"Grades"` and place it before `About`. The
PRD-OQ#5's secondary "should we confirm with overseer" framing is
satisfied by the explicit decision-log entry; the locked order
matches the PRD's own "probably yes" instinct.

### OQ6 — Smoke automation vs. manual smoke?

**RESOLVED.** Plan §Decisions Made (lines 242–243, "Smoke artifact:
checked-in markdown ... mirroring modernization pattern.") + B9
(lines 538–544, hybrid ownership: polecat for text-verifiable,
Rongjun for dark-mode flash + reseed cycle). Picks the PRD's stated
default (committed Markdown like `notes/modernization-baseline.md`).

### OQ7 — Vercel project ownership / GitHub link

**DEFERRED-OK.** Plan §Trade-offs / Open Questions #3 (lines 304–306,
"Vercel account ownership ... B8 starts with an account-creation
step if not — that's the earliest natural point.") explicitly defers
the answer to B8's first action, with the named task being "create
account if it does not yet exist." This is the plan-side equivalent
of the PRD's own framing ("first bead can include it").

### OQ8 — Dependabot vuln: fix in this project or defer?

**RESOLVED.** Plan §Decisions Made (lines 280–281, "Dependabot fix:
conditional B11 — fold into B8 if it's a one-line bump; defer
otherwise. Resolves PRD OQ #8.") + R8 (lines 423–429) + B11 (lines
559–560) carry the conditional policy that PRD-OQ#8 prescribed.

---

## PRD Clarifications Q1–Q7 (overseer answers, 7 items)

These are *answers* the overseer provided; this section verifies the
plan reflects each one.

### Q1 — Option C probe: single check or three?

**RESOLVED.** Plan B1 (lines 464–484) is one bead with a 3-item
acceptance checklist `(a)/(b)/(c)`, each independently passable;
failure of any → pivot. Matches Q1 answer (ii) verbatim.

### Q2 — Pivot in-project or open new project?

**RESOLVED.** Plan §Decisions Made / Locked (lines 232–234, "Pivot
mechanics: if Option C probe fails → file P0 'Switch to Option B',
stop Deploy, do NOT inline migration into Deploy.") + B1 footer
(lines 478–479) + Phase 3 callout (lines 603–604, "Postgres
Migration: the Option B project that gets opened *only* if B1
fails. Stays a separate project even if it does happen."). Matches
Q2 answer.

### Q3 — Prisma version bump allowed?

**RESOLVED.** Plan §Decisions Made / Locked (lines 235–236, "Prisma
version: 5.22.0 pinned; 5.x patch/minor bumps allowed only if
required to resolve a probe failure with documented evidence; 6.x
rejected") + B1 carve-out (lines 480–481). Matches Q3 answer.

### Q4 — Concrete artifact for goal #3?

**RESOLVED.** Plan §Interface (lines 178–180) + §Decisions Made
(lines 242–243) + B9 (lines 538–541) all specify a checked-in
markdown file at `notes/deploy-2026-04-25/smoke.md` with the
`reseed cycle: ✅ <date>` stamp, mirroring
`notes/modernization-baseline.md`. Matches Q4 answer (ii).

### Q5 — "Fresh" verbatim definition lifted to acceptance?

**RESOLVED.** Plan B3 (lines 495–498) carries the three-clause
PRD-Q5 wording verbatim under the "Why (PRD Q5 acceptance,
verbatim)" heading. Round-1 fix (round-1 review, "Fix 1") landed
this. Matches Q5 answer.

### Q6 — Broken-URL UX (kid-readable error.tsx)?

**RESOLVED.** Plan §Decisions Made / Locked (line 239, "`error.tsx`:
kid-readable, ~30 lines, no remote error reporting.") + §Interface
(lines 171–175, suggested copy verbatim from PRD-Q6 answer) + B7
(lines 516–519, "Rewrite copy + remove 'Try again' wording per PRD
Q6"). Matches Q6 answer (ii).

### Q7 — Mayor worktree coordination plan?

**RESOLVED.** Plan B0 (lines 457–462, "Pre-Deploy: clean Mayor
worktree (P0, prerequisite, blocks all code-touching beads)") + R2
(lines 365–371) + bead graph (lines 562–584, B0 is the root). Mayor
operates normally after B0 closes — matches the Q7 (iii)+(i) blend
exactly.

---

## Note on plan's own §Open Questions list (informational)

The design doc carries its own §Open Questions list (lines 284–316,
6 items) for plan-phase concerns not blocking create-beads:

1. Will the probe pass? — gating risk, monitored at B1.
2. Seed-data anonymization yes/no — gated as plan-approval gate
   requirement (round-2 strengthening).
3. Vercel account ownership — same as PRD-OQ#7 above (DEFERRED-OK to
   B8 start).
4. Who cuts the v0.7 tag (B10) — round-1 carry-forward to
   plan-approval gate.
5. Mayor mid-Deploy wake-up — out of Deploy scope, surfaced for
   monitoring.
6. `SubjectCard` data shape (`hasAssignments` boolean) — confirm at
   B6 implementation time.

These are appropriately tracked as plan-internal questions, each
with a named resolution venue (probe time, plan-approval gate, B6,
B8, B10, or "monitor only"). Not part of the PRD-OQ scope but worth
noting they're owned.

---

## Items NOT applied (deferred)

None. This is review-only — no plan edits.

## Carry-forward to plan-approval gate

The plan-approval mail will need to surface (already accumulated in
rounds 1–2; round 3 adds nothing new):

- B10 tag-cut actor (round-1 carry-forward)
- Seed-data anonymization yes/no (round-2 item 4, strengthened)
- Three borderlines: `npm run reseed`, `robots.txt`/`noindex`, plus
  whichever way anonymization lands
- Acknowledge R9 (soft deadline) as deadline-aware-not-deadline-driven
- Vercel account creation (start of B8) — DEFERRED-OK from PRD-OQ#7

## Round 3 verdict

**0 unresolved, 1 deferred-OK, 14 resolved.**

PRD-OQ#7 (Vercel account ownership) is the lone DEFERRED-OK; it has
a named resolution task (account creation as B8's first action) so
it does not block create-beads. All other 14 PRD open questions
(8 §Open Questions + 7 Q-clarifications minus #7) are reflected
explicitly in the plan with traceable line references.

Plan-vs-PRD open-questions alignment is **high**. No must-fix.
Three rounds of PRD-align review are now complete (requirements +
goals; constraints + non-goals; user-stories + open-questions). Plan
is ready for plan-approval gate.

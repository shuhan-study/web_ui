# Verify-Beads Passes 1–3

_Date: 2026-04-25 · Driver: web_ui/crew/full_stack._

Three sequential passes comparing `.designs/deploy/design-doc.md`
against the 15 task beads + 1 epic created in step 12 (create-beads).
Each pass narrows focus.

## Bead inventory

| Bead    | ID       | Priority | Title                                          |
|---------|----------|----------|------------------------------------------------|
| (epic)  | wu-c55   | P1       | Deploy: web_ui live on Vercel (Option C)       |
| B0      | wu-aho   | P0       | Pre-Deploy: clean Mayor worktree               |
| B1      | wu-q0w   | P0       | B1: Probe Option C feasibility                 |
| B1.5    | wu-7j4   | P0       | B1.5: Anonymize seed data                      |
| B2      | wu-b2q   | P1       | B2: Land dev.db + schema/package edits         |
| B3      | wu-p28   | P1       | B3: Add force-dynamic on /grades + /subject    |
| B4      | wu-n6m   | P2       | B4: Navbar Grades link                         |
| B5      | wu-644   | P2       | B5: Root / redirect to /grades                 |
| B6      | wu-wn7   | P2       | B6: Empty-assignments zero-state               |
| B7      | wu-3eh   | P3       | B7: Kid-readable error.tsx                     |
| B8a     | wu-68q   | P1       | B8a: Vercel project configure                  |
| B8b     | wu-lu9   | P1       | B8b: robots.txt + X-Robots-Tag noindex         |
| B8c     | wu-97k   | P1       | B8c: First deploy + URL capture                |
| B9      | wu-n7i   | P1       | B9: Live-URL smoke + reseed-redeploy           |
| B10     | wu-hwf   | P1       | B10: Tag v0.7-deploy-complete                  |
| B11     | wu-wov   | P3       | B11 (optional): Dependabot moderate vuln       |

15 task beads + 1 tracking epic. Matches design-doc's §Implementation
Plan exactly (B0, B1, B1.5, B2, B3, B4, B5, B6, B7, B8a, B8b, B8c, B9,
B10, B11). Phase 2 (polish, post-tag) and Phase 3 (out-of-project)
items intentionally have no beads — design-doc declares them out of
scope.

---

## Pass 1 — B-graph completeness

**Method:** for each B-x in design-doc §Implementation Plan, verify a
bead exists, the title matches, the description captures the
"What" + acceptance + dependencies + notes.

**Findings:**

- **B0 (wu-aho):** ✅ matches. Includes 48-h SLA + overseer-manual fallback.
- **B1 (wu-q0w):** ✅ matches. 4-item acceptance checklist (a)/(b)/(c)/(d) lifted verbatim. Probe→main fidelity clause + Prisma-bump localhost-smoke clause both present.
- **B1.5 (wu-7j4):** ✅ matches. Yes-branch (overseer's plan-approval answer). Machine-checkable patterns (first-name only, school = "Middle School", teacher initials, `git grep` verification).
- **B2 (wu-b2q):** ✅ matches. Atomic commit of dev.db + schema.prisma binaryTargets + package.json reseed script. Path bug (`../data/seed/...` → `data/seed/...`) corrected.
- **B3 (wu-p28):** ✅ matches. PRD Q5 verbatim "fresh" wording present.
- **B4 (wu-n6m):** ✅ matches. curl-grep acceptance. Decoupled from B1.
- **B5 (wu-644):** ✅ matches. curl 307/308 acceptance. Decoupled from B1.
- **B6 (wu-wn7):** ✅ matches. Fixture naming requirement; B1-gated with portable-schema rationale.
- **B7 (wu-3eh):** ✅ matches. Locked copy verbatim. Deterministic trigger via DATABASE_URL=file:/nonexistent.db.
- **B8a (wu-68q):** ✅ matches. Conditional pre-step for "no Vercel account yet" branch. Privacy sign-off in yes-anonymization branch.
- **B8b (wu-lu9):** ✅ matches. Coordination clause for B2/B8b race. Commit-time acceptance only (live-URL checks moved to B8c).
- **B8c (wu-97k):** ✅ matches. Fan-in. Live-URL curl + Vercel deploy log + Function Logs. Rollback path named.
- **B9 (wu-n7i):** ✅ matches. Per-item smoke pass criteria pinned for all 5 PRD-goal-#7 items + reseed-cycle stamp.
- **B10 (wu-hwf):** ✅ matches. Overseer-manual decision baked in (gate item #1 = (b)). git ls-remote acceptance.
- **B11 (wu-wov):** ✅ matches. Conditional fold-in. Strict patch-level + no-transitive-lockfile criterion. Verification surface (scratch-branch npm install + lockfile diff).
- **Epic (wu-c55):** ✅ created. Lists all planning artifacts + plan-approval gate decisions + bead-graph table + completion criterion.

**Gaps found in pass 1:** none.
**Beads added in pass 1:** none.

---

## Pass 2 — Acceptance precision

**Method:** for each bead, check that acceptance criteria are
specific and verifiable (not "looks right" or "works"). Lifted from
design-doc post plan-review r3 fixes (which already addressed
testability).

**Findings:**

- All 15 task beads carry explicit acceptance criteria with concrete
  verification paths (curl + grep, file-read, command exit code,
  pattern match, git ls-remote).
- B0 acceptance includes the 48-h SLA fallback as part of the "done"
  contract — not just "Mayor confirms," but "or overseer manually
  cleans after 48 h."
- B1 acceptance is the longest (4-item probe checklist + bump
  carve-out). Each item has a verification mechanism and a fix path.
- B6 acceptance requires the polecat to name the empty-assignments
  fixture before claiming done — not vacuous.

**Gaps found in pass 2:** none.
**Beads added in pass 2:** none.

---

## Pass 3 — Dependency-graph integrity

**Method:** `bd dep cycles` and `bd dep tree wu-hwf` confirm:
- No circular dependencies
- B10 traces back to B0 via the full chain
- B0 is the only ready bead; everything else is correctly blocked
- Fan-in at B8c has all 8 expected predecessors (B2, B3, B4, B5, B6, B7, B8a, B8b)
- B1.5 → B2 chain present (anonymization yes-branch)
- B11 has no fixed dependencies (conditional bead by design)

**Findings:**

- **Cycles:** none (`bd dep cycles` reports clean).
- **Topological order:** correct. Critical path is
  `B0 → B1 → B1.5 → B2 → B8c → B9 → B10`.
- **Parallel beads correctly identified:** B3, B4, B5, B7, B8a, B8b
  all gate only on B0 — can dispatch in parallel after B0 closes.
- **B6 correctly gated on B1** (Prisma query touch).
- **B11 unparented** — by design, conditional based on patch-bump
  inspection.
- **Epic (wu-c55) does not have explicit `tracks` deps to the 15
  beads** — observation, not a gap. The label `wu-avk-deploy` ties
  them; `bd list --label wu-avk-deploy` returns the full set. Adding
  explicit `tracks` deps would create 15 extra graph edges with no
  blocking semantics; the label suffices.

**Gaps found in pass 3:** none.
**Beads added in pass 3:** none.

---

## Final verdict

**Three sequential passes, zero gaps found, zero beads added.** Bead
coverage matches design-doc §Implementation Plan exactly. Acceptance
criteria are testable. Dependency graph is acyclic and topologically
sound. Plan is ready for execution.

The mol-idea-to-plan formula has executed all 14 steps. wu-avk closes
next, with completion mail to `shuhan/crew/shuhan` and `mayor/`.

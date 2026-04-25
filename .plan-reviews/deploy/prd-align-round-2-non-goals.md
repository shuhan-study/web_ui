# PRD-Align Round 2 — Non-Goals Enforcement Check

_Date: 2026-04-25 · Reviewer: web_ui/polecats/dementus · Bead: wu-at8._

Plan reviewed: `.designs/deploy/design-doc.md`.
PRD: `.prd-reviews/deploy/prd-draft.md` (incl. Non-Goals + Clarifications).
Scope source: `PLAN.md` "Out" list.

## Watch list (from bead)

Postgres/Neon migration, custom domain, auth, mobile drawer, remote error
reporting (Sentry/Axiom), test infrastructure, Tailwind 3→4, multi-student,
Aeries integration. Plus PRD-explicit: no new pages, no schema changes,
no new data-model fields, no bundle/perf audit, no mid-session writes.

---

## CLEAN (in scope, no violation)

- **B0 Mayor cleanup** — PRD Q7 prerequisite.
- **B1 Option C probe** — PRD-locked decision; gates everything.
- **B2 dev.db commit + un-ignore** — Option C plumbing per PLAN scope.
- **B3 force-dynamic on /grades + /subject/[id]** — PRD goal #2.
- **B4 Navbar Grades link** — PRD goal #4.
- **B5 Root `/` redirect** — PRD goal #5.
- **B6 Empty-assignments zero-state** — PRD goal #6. Adding the
  `hasAssignments: boolean` query projection on `fetchAllSubjects` is
  a *query-result projection*, not a stored data-model field — schema
  remains unchanged (design doc §Data Model, line 184). Does NOT
  violate "no new data model fields."
- **B7 Kid-readable `error.tsx`** — PRD Q6 clarification (~30 lines,
  no remote error reporting); spec explicitly preserves the
  Sentry/Axiom non-goal (line 175).
- **B8 Vercel deploy** — PRD goal #1.
- **B9 Smoke + reseed verification** — PRD goal #7 + Q4 stamp format.
- **B10 Tag v0.7-deploy-complete** — PRD goal #8.
- **B11 Dependabot fix (conditional)** — PRD Constraints line 197–198
  explicitly authorizes folding into a small bead.
- **Pivot mechanics** (file P0, stop Deploy, separate "Postgres
  Migration" project) — PRD Q2-locked. Postgres work is NOT inlined
  into Deploy; it is named-for-handoff in Phase 3 (lines 577–578).
- **Custom domain** — explicitly excluded (lines 241, 564, 579).
- **Auth** — explicitly excluded (lines 240, 367, 615); URL secrecy
  named as the access posture per PRD lock.
- **Mobile drawer / nav redesign** — only a single Grades link is
  added (PRD goal #4); existing responsive stacking is unchanged.
- **Test infrastructure** — not introduced anywhere.
- **Tailwind 3→4** — explicitly Phase 3 / Modernization v2 (line 576).
- **Aeries / school-system integration** — explicitly Phase 3 (line 582).
- **Multi-student support** — not mentioned anywhere; single-user
  framing preserved throughout.
- **Bundle / perf audit** — R7 (cold-start) explicitly says "None
  recommended" (line 412); no audit work scheduled.
- **New pages, schema changes** — design doc explicitly states
  "Schema unchanged" (line 184); "Files explicitly NOT touched"
  enumerates the kept-out scope (lines 140–146).
- **Mid-session writes** — `?mode=ro&immutable=1` open mode reinforces
  the read-only-at-runtime lock.

---

## BORDERLINE (should-fix — recommend explicit handling)

### B-1: `npm run reseed` script (design doc lines 128–129, 262, 405)

Wraps `prisma db seed` + `git add` of the binary + grades.json. The
PRD does not request a script. It is also not on any non-goal list.

- **Why borderline:** The PRD's goal #3 ("Reseed → live in one cycle")
  describes the existing 3-command flow. Adding an `npm run reseed`
  script is a developer-ergonomics convenience, not a goal-mechanic.
  R6 (line 401) frames it as a forgetfulness mitigation.
- **Recommendation:** Keep, but disposition explicitly. Either:
  (a) document this script as an "ergonomics adjunct serving goal #3
  reliability" in PLAN.md decision log (cheap, makes it intentional
  in-scope rather than implicit creep); or
  (b) drop the script and rely on the bare `npm run seed` + manual
  `git add`. The script is harmless either way; a one-line note in
  the plan-approval gate prevents future scope-creep precedent.

### B-2: Seed data anonymization (design doc lines 263–267, R3 lines 364–379)

Convert `web/data/seed/grades.json` + `web/prisma/seed.ts` to
first-name-only / generic school / initials-only teacher names BEFORE
first deploy. Surfaced by the security leg.

- **Why borderline:** The PRD does not speak to data privacy or PII
  mitigation. It is not in the non-goals list either. The design doc
  acknowledges this in §Open Questions #2 (lines 290–295): "Touches
  PRD scope tangentially (no schema change, no architectural change,
  but does change displayed copy). Recommend folding the decision
  into B0/B1 timeframe... If overseer prefers to keep real data,
  document that explicitly so the privacy posture is conscious."
- **Recommendation:** The design has already structured this
  correctly — gated as an overseer decision via OQ #2. Keep that gate.
  Strengthen the wording: at the plan-approval gate, the overseer
  must make an explicit yes/no call (not silently skip). Frame the
  yes-path as "enables the locked no-auth posture" so it stays
  defensible against a "scope creep" critique. If the overseer
  declines anonymization, the privacy waiver should be logged in
  PLAN.md decision log before B8 opens.

### B-3: `robots.txt` + `X-Robots-Tag: noindex` (design doc lines 268–269, 509)

Search-engine indexing deterrent, scheduled to ship with B8.

- **Why borderline:** Not requested by the PRD. Not on any non-goal
  list. Adjacent in spirit to the "no auth" lock (URL secrecy as
  access control) — this strengthens the same posture by reducing
  URL discoverability. Tiny effort (a `robots.txt` file + one HTTP
  header).
- **Recommendation:** Keep. Frame in the plan-approval gate as
  "defense-in-depth for the locked URL-secrecy access posture, not a
  privacy/compliance feature." This anchors it to an existing PRD
  lock rather than introducing a new privacy-engineering scope.
  Borderline (not clean) only because the PRD does not authorize it
  by name.

---

## Classification

- **0 must-fix** (no SCOPE-CREEP — no plan element falls under an
  explicit non-goal).
- **3 should-fix** (BORDERLINE — three small additions sit adjacent
  to PRD scope without explicit authorization. All three should be
  surfaced at the plan-approval gate so the overseer makes a
  conscious in/out call rather than letting them slip in implicitly).

## Round 2 verdict

**0 must-fix, 3 should-fix.** Plan-vs-non-goals alignment is
**high**. The pivot mechanics (file P0, stop Deploy) cleanly preserve
the "no Postgres migration in Deploy" lock — the most load-bearing
non-goal — without inlining migration work. Phase 3 callouts are
named-for-handoff only; no Phase-3 work is scheduled inside Deploy.

The three borderlines are small and individually defensible, but
collectively they establish a precedent. Recommend they be
explicitly dispositioned at the plan-approval gate (alongside the
B10 actor question carried forward from round 1) so the overseer
can ratify or trim before create-beads runs.

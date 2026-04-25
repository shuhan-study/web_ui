# Plan-Review Round 2: Scope-Creep Check

_Date: 2026-04-25 · Reviewer: web_ui/polecats/dementus (bead `wu-wkz`).
Scope: scope-creep in `.designs/deploy/design-doc.md` post-r1 fixes
(commit `4210273`). Looking for gold-plating, premature optimization,
over-engineering, nice-to-haves disguised as requirements, and tasks
deferrable to follow-up without affecting the core feature. The 3
prd-align r2 borderlines (`npm run reseed`, `robots.txt + noindex`,
seed anonymization) are already known and routed to the plan-approval
gate — focus is on NEW creep beyond those._

## Summary

**0 must-fix (CUT/DEFER) · 1 should-fix (SIMPLIFY).** The plan is
tight against the PRD. Every plan element beyond PRD-stated scope
falls into one of: (a) required to make Option C work
(`binaryTargets`, `?mode=ro&immutable=1`, schema/package atomic
commit), (b) verification anchored in a PRD constraint or PRD-locked
risk (Node ≥ 20.9 check, `npx prisma validate`, B8c "zero engine
warnings", B8c Function Logs check), (c) one of the 3 known
borderlines deferred to plan-approval gate, or (d) a small mitigation
for a self-identified risk that the design explicitly named and
ratified at r1 (B9 README "repo must stay private" line for R4;
B8c/B9 rollback paths added in r1 fixes).

The single new finding is a tiny defensive over-spec in the
`web/.gitignore` edit — preemptive coverage of SQLite WAL-mode
artifacts that the design's read-only-immutable open mode rules out
at runtime. Trivially small but flagged for completeness.

## Findings

### SIMPLIFY-1 (should-fix) — B2 `.gitignore` preemptive WAL/SHM patterns

**Where:** Design doc lines 107–109, B2 acceptance:

> `web/.gitignore` — un-ignore `/prisma/dev.db`; keep `dev.db-journal`
> ignored; **add `dev.db-wal` and `dev.db-shm` to the ignore list**

**Why it's mild over-engineering:**
- The existing `.gitignore` already covers `/prisma/dev.db-journal`.
- `dev.db-wal` and `dev.db-shm` are SQLite WAL-mode artifacts that
  only exist if `PRAGMA journal_mode=WAL` is set. The current Prisma
  schema and seed pipeline do not enable WAL mode. Vercel runtime
  uses `?mode=ro&immutable=1` (no journal/WAL files at all). Local
  dev uses default rollback-journal mode (which produces
  `dev.db-journal`, not `*-wal`/`*-shm`).
- Adding patterns for files that don't and won't exist is preemptive
  for a configuration scenario the design rules out. Two extra glob
  lines in a config file that already has ~30 patterns — cost is
  near-zero, but the rule is "don't pattern-match speculative state."

**Simpler approach:** drop the `dev.db-wal` and `dev.db-shm`
additions; un-ignore `/prisma/dev.db` and keep `dev.db-journal`
ignored (the only journal artifact local dev actually produces). If
WAL mode is ever enabled in the future, add the patterns then.

**Severity:** should-fix. Truly minor; not a hard stop. Surfacing it
because (a) it's the only non-required, non-known-borderline item the
plan adds, (b) keeping the .gitignore minimal preserves the design's
"narrow surface" framing, (c) round-2 scope-creep is exactly the
phase to flag preemptive defenses against speculative scenarios.

## Items considered and judged CLEAN (in scope or justified)

For traceability — these were inspected and ruled NOT scope creep:

- **`binaryTargets = ["native", "rhel-openssl-3.0.x"]`** (B2) —
  required for Vercel Linux runtime; R1's most-likely fix path. PRD
  Q3 carve-out authorizes Prisma 5.x bumps if needed; this isn't a
  bump.
- **`?mode=ro&immutable=1` SQLite open mode** (Data Model) — required
  to match Vercel's read-only filesystem.
- **`npx prisma validate` in B2 acceptance** — verification of the
  schema edit; small, anchored to B2's own change.
- **Node ≥ 20.9 verification in B8a** — directly anchored to PRD
  Constraint ("Node engine ≥ 20.9").
- **Privacy sign-off step in B8a** — coordination point for the
  anonymization decision (already routed to plan-approval gate as
  borderline B-2 / Q2). Not new scope; just naming the moment of
  capture.
- **B8c "zero Prisma engine warnings"** — strict R1 verification.
  Defensible because R1 is the project's primary risk and engine
  warnings on Vercel commonly indicate `binaryTargets` mismatch.
- **B8c Function Logs check (not just Build Logs)** — defensive R1
  verification; Build Logs miss runtime engine-load failures.
- **B8c rollback path** — added in r1 fixes (C-S5); reasonable for a
  fan-in deploy bead.
- **B9 hybrid ownership** (polecat + Rongjun) — operational dispatch,
  not new scope. PRD goal #7 doesn't dictate who runs the smoke; the
  hybrid split reflects which checks need a human (dark-mode flash,
  cross-machine reseed cycle) vs. which are text-verifiable.
- **B9 optional 6-scenario opt-in (S1–S6)** — opt-in, default-no.
  Not scheduled work; just an option surfaced at the plan-approval
  gate per r3 observation O-1.
- **B9 rollback path** — added in r1 fixes (C-S5); reasonable.
- **B9 README "repo must stay private" line** — small (one-line)
  R4 mitigation, ratified in r1 fixes (C-S2). Borderline-but-CLEAN
  because: (a) R4 is a real risk the design self-identified and
  documented, (b) the cost is trivial (one line in README), (c) the
  alternative of NOT documenting an existing constraint creates the
  exact retroactive-disclosure scenario R4 names. NOT flagged because
  removing it provides no meaningful simplification and weakens the
  "URL secrecy is the access posture" PRD-locked decision.
- **B11 Dependabot fix conditional** — PRD Constraints lines 196–198
  explicitly authorize folding into a small bead.
- **`hasAssignments: boolean` query projection in B6** — query-result
  shape, NOT a stored data-model field. PRD non-goal "no new data
  model fields" explicitly addressed in prd-align r2 (CLEAN).
  Choosing the boolean over widening the type IS the simpler option;
  flagging it would push the wrong direction.
- **Bead granularity (one per fix)** — the design ratified this trade-
  off explicitly in §Trade-offs. Not creep; a granularity choice the
  design owns.
- **Phase 2 / Phase 3 callouts** — explicitly out-of-scope, named-
  for-handoff. CLEAN by construction.

## Items NOT in scope of this review

The 3 known borderlines (already routed to plan-approval gate):
1. `npm run reseed` script (B-1)
2. `robots.txt` + `X-Robots-Tag: noindex` (B-3)
3. Seed-data anonymization (B-2 / B1.5 conditional)

These were dispositioned in prd-align r2 (`prd-align-round-2-non-goals.md`)
and surface to the overseer at the plan-approval gate. r2 scope-creep
defers to that gate.

## Round 2 verdict

**0 must-fix, 1 should-fix.** Scope-creep alignment is **high**. The
plan introduces the minimum surface needed to make Option C work,
verify it, fix the 4 PRD-named correctness gaps, deploy, and stamp.
Every other addition is either (a) a known borderline already routed
to overseer or (b) a verification anchored to a PRD constraint or a
self-identified PRD-adjacent risk.

The single SIMPLIFY (B2 `.gitignore` preemptive WAL/SHM patterns) is
genuinely tiny and the design can adopt or reject without affecting
correctness or schedule.

Recommendation: apply SIMPLIFY-1 (drop the two preemptive patterns)
or explicitly waive it in r2 fixes; either way, no new plan-approval-
gate items are created by this round.

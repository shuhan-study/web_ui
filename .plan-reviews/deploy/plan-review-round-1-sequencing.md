# Plan-Review Round 1: sequencing

_Date: 2026-04-25 · Driver: web_ui/crew/full_stack (orchestrating wu-avk
mol-idea-to-plan, plan-review phase)._

## Reviewer

- **Sequencing** — `web_ui/polecats/dementus` (bead `wu-36o`).
  Result: 2 must-fix, 2 should-fix.

Plan reviewed: `.designs/deploy/design-doc.md` (commit `bb8b354` on
branch `polecat/dementus-moee0q41`). Bead graph: B0…B10 (+ optional B11).

## Findings

### FINDING 1 — `schema.prisma` `binaryTargets` edit is not owned by any bead

Severity: **must-fix**

The plan's §Key Components and §Data Model both call out adding
`binaryTargets = ["native", "rhel-openssl-3.0.x"]` to
`web/prisma/schema.prisma`'s generator block — and §Risks/R1 ranks the
engine-target mismatch as the most likely B1 failure mode. But none of
B0…B11 owns this edit on `main`.

- B1 is a probe — it produces findings on a throwaway branch and writes
  the winning value to bead notes. Per the bead's own description, B1
  does not commit to `main`.
- B2 only lands `web/.gitignore` + `web/prisma/dev.db` (per the
  unstashed `wu-avk pre-pull` stash + reseed). Schema.prisma is not in
  that scope.
- B3-B7 are unrelated UX/route edits.
- B8 is Vercel project setup + first deploy. If `binaryTargets` isn't
  on `main` by the time B8 runs, the production build fails with the
  same engine-target mismatch the probe was supposed to fix.

Without a bead owning this edit, the probe's most-likely fix never
lands on `main`, and B8 hits the exact failure mode B1 was designed to
prevent.

**Suggested reorder:** Fold the `schema.prisma` `binaryTargets` edit
into B2's commit. B2 already touches the DB layer (dev.db + .gitignore);
adding one more line to schema.prisma is consistent with B2's existing
"land DB-layer changes" framing. Update B2's title to e.g. "Land
`dev.db` + un-ignore + Prisma `binaryTargets`" and its acceptance to
include `web/prisma/schema.prisma`.

Alternative: split into a new bead B2a between B1 green and B8, but
this adds graph overhead with no additional bisect resolution (the edit
is one line).

### FINDING 2 — `npm run reseed` script in `package.json` is not owned by any bead

Severity: **must-fix**

The plan's §Key Components and §Interface (reseed-to-live workflow)
both depend on a new `"reseed"` script in `web/package.json`:
`prisma db seed && git add prisma/dev.db ../data/seed/grades.json`.
§Risks/R6 mitigation explicitly relies on this script existing.
B9's acceptance includes "perform reseed cycle end-to-end" — which
calls `npm run reseed`.

But none of B0…B11 owns the `package.json` edit. The script is named
in §Key Components and §Trade-offs as "ratify at plan-approval gate"
but never assigned to a bead.

Without ownership, B9's reseed-cycle smoke step has no script to call
and the operator workflow documented in §Interface is incomplete on
the first deploy.

**Suggested reorder:** Fold the `package.json` `reseed` script into
B2. The script wraps `prisma db seed` + `git add prisma/dev.db
../data/seed/grades.json` — the same artifact B2 lands. Pairing them
keeps the "DB-layer + reseed mechanic" landings atomic.

Alternative: own it in B9, where it's first exercised. Slightly worse
because B9 is on the critical path post-B8 — pulling the edit earlier
de-risks B9.

### FINDING 3 — B3, B4, B5 unnecessarily serialized behind B1

Severity: **should-fix**

The bead graph gates B2, B3, B4, B5, B6 on `B1 green`. B7 (kid-readable
`error.tsx`) explicitly does NOT gate on B1 — its bead text says
"Independent of DB-platform outcome, so does not require B1 green;
depends only on B0."

The same reasoning applies to B3, B4, B5:
- **B3** (force-dynamic on `/grades` and `/subject/[id]`) — pure Next.js
  route configuration. If the project pivots to Option B (Postgres),
  these routes still need `force-dynamic` to avoid SSG snapshots.
- **B4** (Navbar `Grades` link) — pure UI; no DB layer touched.
- **B5** (Root `/` redirect to `/grades`) — pure routing; no DB layer.

(B6 is borderline — it adds `hasAssignments: boolean` to
`fetchAllSubjects`, a Prisma query change. The query is platform-
agnostic in practice — same schema under Option B — so B6 could also
parallelize with B1, but conservative gating on B1 is defensible.)

Gating B3, B4, B5 on B1 adds wall-clock time without bisect or
correctness benefit. If B1 fails, the project pivots to a separate
Postgres Migration project, which would still need these UX fixes —
landing them early is not wasted work.

**Suggested reorder:** Change B3, B4, B5 to depend on B0 only, not on
B1 green. This mirrors B7's existing dependency shape and parallelizes
4 beads (B3, B4, B5, B7) with the probe. The bead graph diagram in
§Implementation Plan should also be updated so all four pure-UX beads
fan out from B0 alongside B1.

### FINDING 4 — Seed-data anonymization is not sequenced before B2

Severity: **should-fix**

The plan recommends (§Trade-offs / §Risks/R3) anonymizing
`web/data/seed/grades.json` and `web/prisma/seed.ts` to first-name-only
+ generic school + initials-only teachers BEFORE the first public
deploy. §Open Questions #2 names "before B8" as the deadline.

But "before B8" is the wrong load-bearing predecessor. The predecessor
is **B2**: B2 commits the binary `dev.db` blob produced from the seed
data. If anonymization runs *after* B2, the dev.db committed in B2
contains real PII for an 11-year-old, and the first deploy (B8) ships
that real-PII binary even if subsequent commits anonymize the JSON.

Sequence required (if overseer's plan-approval-gate answer is "yes"):
1. Anonymize `web/data/seed/grades.json` + `web/prisma/seed.ts`
2. Re-run `npm run seed` to regenerate `dev.db` from anonymized inputs
3. **Then** B2 commits dev.db + un-ignore atomically

Currently no bead in the graph owns step 1+2, and no edge enforces it
running before B2.

**Suggested reorder:** Add a conditional bead `B1.5` (or `B2a`)
between B1 green and B2, owned by overseer or polecat depending on the
plan-approval-gate decision: "Anonymize seed data + reseed dev.db".
Acceptance: `web/data/seed/grades.json` and `web/prisma/seed.ts`
contain only first-name + generic school + initials-only teachers;
`npm run seed` re-run; resulting dev.db left staged for B2 to commit.
Add a hard-edge: `B2 depends on B1.5` (only if anonymization is
"yes" at plan-approval gate; otherwise B1.5 is closed with a privacy
waiver per §Open Questions #2 and B2 proceeds).

This makes the sequencing explicit instead of leaving it as a "before
B8" recommendation that mis-identifies the load-bearing predecessor.

## Items NOT applied (deferred)

Plan-review is read-only this round — no edits applied to
`design-doc.md`. All four findings are reported back to
`web_ui/crew/full_stack` for plan-author judgment.

## Other sequencing observations (no findings)

- **Critical path** — B0 → B1 → max(B2…B6) → B8 → B9 → B10. With
  Finding 3 applied, B3/B4/B5 leave the critical path; B1 + B2 remain
  load-bearing. Critical-path *length* is unchanged because B1 + B2
  still serialize, but throughput improves.
- **Circular dependencies** — none.
- **B7 → B8** — correctly fan-in, not a hidden serial dep.
- **B11 (Dependabot)** — correctly conditional, not a sequencing risk.
- **B10 tag-cut actor** — already flagged as an authority/process
  question by prd-align round 1; not a sequencing concern.

## Round 1 verdict

**2 must-fix, 2 should-fix.** Plan's bead graph topology is sound, but
two file edits enumerated in §Key Components are unowned by any bead
(Findings 1 + 2), and one ordering invariant (anonymization before
dev.db commit) is mis-specified (Finding 4). Finding 3 is a parallelism
opportunity, not a correctness issue.

Reporting back to `web_ui/crew/full_stack` for resolution before
plan-review round 2 (other sequencing dimensions or plan-vs-design
checks).

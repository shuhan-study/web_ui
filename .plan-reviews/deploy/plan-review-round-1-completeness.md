# Plan-Review Round 1: Completeness Check

_Date: 2026-04-25 · Reviewer: web_ui/polecats/capable (bead `wu-xh3`).
Scope: completeness of `.designs/deploy/design-doc.md` against itself
(implicit dependencies, missing tasks, coarse-grained beads, missing
infra/test/docs/rollback). NOT plan-vs-PRD — that's closed at r1–r3._

## Summary

**3 must-fix · 5 should-fix.** The plan's bead graph is mostly coherent
but three items mentioned in the design body never become beads (so the
work is unimplementable from the graph alone), one fan-in bead is too
coarse for clean bisect, and most P2 beads lack acceptance criteria.

## MUST-FIX

### M1 — `X-Robots-Tag: noindex` has no consistent implementation surface

**Where:** B8 ("Also adds: `robots.txt` + `X-Robots-Tag: noindex`
headers"); contradicts §Key Components ("Files explicitly NOT touched:
`web/next.config.mjs` stays empty unless B1 forces…") and §Interface
("No `vercel.json`").

**Why it's a gap:** `robots.txt` is a static file (fine, lives at
`web/public/robots.txt`). The `X-Robots-Tag` HTTP **header**, however,
must come from one of: (a) `next.config.mjs` `headers()` function,
(b) `vercel.json` `headers` entry, or (c) middleware. All three are
explicitly excluded by the plan. B8 is therefore not actionable as
written.

**Severity:** must-fix. The header is a R3-mitigation deliverable; if
it can't actually ship, the data-anonymization decision becomes more
load-bearing than the plan implies.

**Suggested addition:** In §Key Components, name the implementation
surface explicitly — recommend `web/next.config.mjs` with a small
`headers()` block (smallest config-drift surface, no new file). Update
the "Files explicitly NOT touched" list to remove `next.config.mjs` and
re-classify it as "minimal `headers()` only." B8's acceptance gets a
one-line "verify `curl -I <url>` shows `X-Robots-Tag: noindex`."

---

### M2 — `npm run reseed` script has no owner bead

**Where:** §Key Components lists `web/package.json` — add `"reseed"`
script…`. §Decisions Made and R6 mitigation both reference it. B9
depends on the reseed cycle to verify goal #3.

**Why it's a gap:** No bead in the Implementation Plan (B0–B11) is
assigned to add the script. B2's scope is "Land `dev.db` commit +
un-ignore"; B8 is Vercel setup. The script falls between them. If
nobody owns it, B9's reseed cycle either fails or gets done manually
via the 3-step long form, which defeats the R6 mitigation.

**Severity:** must-fix. It's a single-line addition but it's actively
referenced by another bead's acceptance.

**Suggested addition:** Expand B2's scope to "Land `dev.db` commit +
un-ignore **+ add `reseed` script to `web/package.json`**" in one
atomic commit, OR split a tiny new bead "B2a — add `npm run reseed`
script" that lands before B9. B2 expansion is simpler since both edits
land in the same conceptual unit.

---

### M3 — Anonymization "yes" branch has no implementation bead

**Where:** §Open Questions #2 + R3 mitigation (a) + plan-approval gate
carry-forward item 2.

**Why it's a gap:** The plan-approval gate forces an explicit yes/no
on anonymization. The "yes" branch requires editing
`web/data/seed/grades.json` and `web/prisma/seed.ts` to first-name-only
+ generic school + initials-only teachers, then re-running
`npm run seed`. This work is non-trivial (touches 2 files + regenerates
the binary) and **must land before B8** (first public deploy).
Currently no bead owns it. The "no" branch requires logging a privacy
waiver in PLAN.md, also unowned.

**Severity:** must-fix. The decision-or-action gap means a "yes"
answer at the plan-approval gate is unimplementable from the bead
graph alone — create-beads would have to invent a new bead on the fly.

**Suggested addition:** Add a conditional **B0.5 — Resolve
anonymization disposition** between B0 and B1, with two acceptance
branches:
- (a) overseer says yes → edit `grades.json` + `seed.ts` to
  anonymized form; re-run `npm run seed`; commit (the resulting
  `dev.db` lands later via B2)
- (b) overseer says no → append privacy-waiver entry to PLAN.md
  decision log; no code changes

Either way, B0.5 closes before B1 opens.

---

## SHOULD-FIX

### S1 — B8 is too coarse-grained for clean bisect / re-attempt

**Where:** B8 bundles ~9 distinct sub-items: Vercel account check,
Vercel project creation, GitHub repo linking, Root Directory config,
`DATABASE_URL` env var, Node version verify, `robots.txt` +
`X-Robots-Tag` header, privacy sign-off gate, first deploy, optional
Dependabot fix, build-warning verification.

**Why it's a gap:** A failure at any of these is hard to bisect.
Re-running "B8" after a partial-success leaves ambiguity about which
sub-steps already happened.

**Suggested split:**
- **B8a** — Vercel project create + configure (account, project, GH
  link, Root Directory, `DATABASE_URL`, Node ≥20.9 verify). One-shot
  dashboard work; no code commits.
- **B8b** — `robots.txt` + `next.config.mjs` `headers()` for
  `X-Robots-Tag` (single commit on `main`).
- **B8c** — First production deploy + capture URL (push triggers
  Vercel; verify build log clean of Prisma engine warnings; record
  URL in bead notes).

Privacy sign-off becomes a gate before B8a, not a sub-step.
Optional Dependabot fix remains in B8b's commit if one-line.

---

### S2 — README update for "repo must stay private" is unowned

**Where:** R4 mitigation says "Document 'repo must stay private' as a
project constraint. **Add to README and to the smoke document.**"
Only smoke.md (B9) is in the bead list. README is not.

**Why it's a gap:** Single-place documentation is fragile;
multi-place was specifically chosen by the risk mitigation. No bead
lands the README change.

**Suggested addition:** Fold a one-line README addition into B9
(alongside the smoke.md commit), or into B8b (alongside `robots.txt`).
B9 is the more natural home — it's the project-closure artifact bead.
Add: "B9 also appends a `## Privacy posture` paragraph to
`web/README.md` documenting the private-repo constraint."

---

### S3 — B9 smoke checklist contents are not enumerated

**Where:** B9 says "Walk smoke checklist on production URL" but no
document defines the checklist's items. Capable's round-3 observation
O-1 surfaced the *coverage breadth* question (PRD scenarios vs PRD
goal #7) for the plan-approval gate, but the *contents* of the
checklist are still undefined regardless of breadth.

**Why it's a gap:** B9 cannot be walked until the checklist exists.
Implicitly someone authors `notes/deploy-2026-04-25/smoke.md`'s
skeleton before the polecat runs B9. That authorship task is unowned.

**Suggested addition:** Either (a) inline the smoke-checklist items
in B9's bead text (e.g., "1. `/` → 307 to `/grades`; 2. `/grades`
loads with seeded data; 3. `Grades` link visible in navbar; 4. empty-
assignments subject shows zero-state; 5. `/about` reachable; 6.
forced-error renders kid-readable copy"), or (b) add a small
prerequisite "B8d — draft smoke.md skeleton" that lands the file in
the same commit as B8b.

---

### S4 — B4, B5, B6, B7 have no acceptance criteria

**Where:** B3 specifies "local `npm run build` shows both routes as
`ƒ (Dynamic)`" — clear and verifiable. B4–B7 are described by *what*
they do, not by *what proves them done*.

**Why it's a gap:** Polecat completion becomes judgment-based, and
the witness verification step has no concrete check to apply.
Inconsistent with B3's rigor.

**Suggested addition:** One acceptance line each:
- **B4:** `npm run dev`; navbar shows `Grades | About | DarkMode`
  order; clicking `Grades` navigates to `/grades`; active-state styling
  works on `/grades`.
- **B5:** `curl -I localhost:3000/` returns 307 to `/grades`.
- **B6:** A subject with no assignments shows `"No assignments yet"`
  on both the `/grades` card AND the `/subject/[id]` header (no stale
  letter visible). Verified by temporarily emptying one subject's
  assignments in seed JSON, reseeding, and visiting both pages.
- **B7:** Forcing an error in a route (e.g., temporary `throw` in a
  page server function) renders kid-readable copy with no "Try again"
  button text. Code reverted before commit.

---

### S5 — No rollback procedure for B8 deploy or B9 smoke failure

**Where:** Pivot path is well-documented for B1 failure. B8/B9 failure
modes are not.

**Why it's a gap:** If B8c's first deploy succeeds the build but B9
finds a blocker on the live URL (e.g., privacy-relevant content
exposure, broken route), the recovery path is unspecified. Vercel
provides instant-rollback via dashboard, but the plan never names it.

**Suggested addition:** Add one-line "Rollback" entries:
- **B8c:** "If build fails on Vercel: fix locally, re-push. If build
  succeeds but smoke (B9) reveals blocker: Vercel dashboard →
  Deployments → previous successful → Promote, then file follow-up
  bead; do NOT leave broken build live."
- **B9:** "If reseed cycle fails to refresh data on live URL within
  10 min, troubleshoot (cache?, build log?, env var?), do not stamp
  `reseed cycle: ✅` until resolved. Failure → file follow-up bead;
  do NOT proceed to B10."

---

## Items NOT raised (judgment calls)

- **`engines.node` / `.nvmrc` pinning at package.json level** — Vercel
  project setting check (B8) is the PRD-named constraint; package-level
  pin is defense-in-depth and arguably scope creep. Borderline; left
  out.
- **`/about` build-date line** — explicitly Phase 2 polish per design;
  not a completeness gap.
- **B10 tag-cut actor unresolved** — already on plan-approval
  carry-forward list (round-1 item 1); not a new finding.
- **No automated tests** — explicitly PRD-locked "no test infra";
  not a completeness gap.

## Verdict

**3 must-fix, 5 should-fix.** Plan body and bead graph diverge in
3 places (M1–M3) where work named in the body has no graph owner;
the gap is small in volume but blocks "graph-only" execution. The
should-fix items are quality-of-bead improvements that reduce
ambiguity at create-beads and acceptance time.

Recommend driver applies M1–M3 before promoting to plan-review r2;
S1–S5 can fold in opportunistically or be addressed in parallel
review rounds.

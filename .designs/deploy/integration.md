# Integration Analysis

## Summary

This is the **plan-shaping dimension**. Deploy is small in code surface
(seven files touched, ~10 LOC of edits, one binary commit, one
out-of-repo Vercel project) but rich in ordering constraints: the
DB-on-Vercel probe gates everything, `force-dynamic` must precede the
first deploy or goal #2 silently fails, and a P0 Mayor-worktree
prerequisite must close before any code-touching bead opens. The
integration story is therefore a **probe-gated, fan-out, fan-in bead
graph** with explicit pivot mechanics if the probe fails.

The codebase is exactly the one Modernization left behind: Next 16.2.4
/ React 19.2.5 / Prisma 5.22.0 on the App Router, ~30 files under
`web/`, no test infra, no middleware, an empty `next.config.mjs`,
async `params` already in place at `web/app/subject/[id]/page.tsx:8`.
The four files that need code edits are grep-enumerable; the
correctness fixes are independently mergeable; the deploy itself is
a Vercel UI session plus one or two env-var entries. The risk is
concentrated in **B1 (the Option C probe)** — every other bead is
small and well-understood.

## Analysis

### Key Considerations

**Files touched (concrete enumeration):**

- `web/.gitignore` — remove the line `/prisma/dev.db` (and likely
  `/prisma/dev.db-journal`). Confirmed present at the bottom of the
  current file. Edit already exists in full_stack's stash labelled
  `wu-avk pre-pull: un-ignore dev.db edit`; unstash inside B2 rather
  than re-typing.
- `web/prisma/dev.db` — commit the freshly-seeded SQLite binary.
  Currently gitignored on disk; once B2 lands it's a tracked binary
  artifact. Re-seed via `npm run seed` at commit time so the bundled
  data matches the latest `data/seed/grades.json`.
- `web/app/grades/page.tsx` — add one line at the top:
  `export const dynamic = 'force-dynamic';`. Current file is an async
  RSC reading via `fetchAllSubjects()`; no other change needed here.
- `web/app/subject/[id]/page.tsx` — same one-line `force-dynamic`
  export. `params` is already a `Promise` (Modernization landed the
  Next 15 codemod), so no further edits.
- `web/app/page.tsx` — replace placeholder body with
  `import { redirect } from 'next/navigation'; export default function
  Home() { redirect('/grades'); }`. Current file renders the leftover
  `web_ui` hero + placeholder subtitle.
- `web/components/navbar/Navbar.tsx` — add a `<NavLink href='/grades'>
  Grades</NavLink>` before the existing About link, so order is
  `Grades | About | DarkMode`. The `NavLink` component already exists
  at `web/components/navbar/NavLink.tsx`; no new component needed.
- `web/components/subjects/SubjectCard.tsx` — empty-assignments
  suppression on the `/grades` card subtitle. PRD plan-phase concern
  resolves the scope as **both** `/grades` cards and the subject
  detail header (see §Plan-phase concerns). On the card, when
  `subject.assignments.length === 0` (or the equivalent stored
  signal), render the subject name only and omit the grade letter +
  percentage row. NOTE: `SubjectCard` currently receives the bare
  `Subject` Prisma type with no `assignments` relation. Plan owner
  must decide: (a) widen the type and join in `fetchAllSubjects`, or
  (b) add an `hasAssignments: boolean` field selected at the data
  layer. Option (b) is smaller and matches the read-only model.
- `web/app/subject/[id]/page.tsx` — when `subject.assignments.length
  === 0`, render `"No assignments yet"` in place of the
  `teacher · grade · percent` summary line. The teacher line itself
  can stay — only the stale grade/percent is misleading.
- `web/app/error.tsx` — current file says "Something went wrong / An
  unexpected error occurred." with a "Try again" button. Per PRD
  clarification Q6, replace with kid-readable copy: e.g. *"Hmm, the
  grade tracker isn't working right now. Your dad will fix it
  soon."* Keep the existing client-component shape, useEffect
  console.error, and reset button (the reset is harmless and lets
  Shuhan retry without thinking about it). ~30 lines max.
- `notes/deploy-smoke.md` (new) — mirrors `notes/modernization-smoke.md`
  in structure: CLI setup, smoke checks per route, reseed-cycle
  walkthrough, completion stamp `reseed cycle: ✅ <date>`. Lives next
  to the modernization smoke doc, not under `notes/deploy-2026-04-24/`
  (which is the survey-notes folder).
- `vercel.json` (new, conditional) — only create if needed. Default
  Vercel project settings + dashboard-set Root Directory + env vars
  should be sufficient. If the probe surfaces a need for explicit
  build commands, runtime pinning, or includeFiles for the SQLite
  binary, that's where it lives. Deferred decision; B1 will tell us.
- **Off-repo:** Vercel project creation, GitHub linkage, env vars,
  capture of the production URL.

**Files NOT touched (worth naming, to keep scope narrow):**

- `web/next.config.mjs` — leave empty unless B1 turns up a Prisma
  bundling reason (e.g. `outputFileTracingIncludes` for the SQLite
  binary). Deferred decision.
- `web/prisma/schema.prisma` — no schema change.
- `web/utils/actions.ts` (or wherever `fetchAllSubjects` lives) —
  only modified if the empty-assignments fix chooses option (b)
  above (add an `hasAssignments` selection). Trivial if so.
- `web/app/about/page.tsx`, `web/app/not-found.tsx`,
  `web/app/layout.tsx` — untouched. Smoke-verified only.
- Existing `eslint.config.mjs`, `tsconfig.json`, `package.json` —
  untouched unless Dependabot bead lands inline (see B11).

**Existing repo patterns to mirror:**

- Commit message style from `git log --oneline`: `wu-avk: <short>`,
  `docs(deploy): <short>`, `chore: <short>`, `fix: <short>`. Each
  bead's commit prefix should match its type (task → `chore` or
  `feat`; bug → `fix`; docs → `docs`).
- Smoke checklist pattern: `notes/modernization-smoke.md` is the
  template — CLI setup block, per-page checks with verbatim
  expected strings, console-noise tolerance rules, mutate-probe
  recipe, build-warning delta section. Deploy's smoke is shorter
  (no upgrade delta) but follows the same shape.
- Branch naming is handled by gt (polecat worktree branches).
  Deploy beads land on `polecat/capable-*` style branches and
  go through the merge queue — no direct main pushes, no GitHub
  PRs, per the `CLAUDE.md` Landing Rule.
- Bead-per-fix vs. bundled commits: PRD review's plan-phase concern
  on "fix-bundling policy" resolves to **one bead per fix** for B3,
  B4, B5, B6, B7. Each fix is a small, reviewable, independently
  bisectable commit. B2 bundles two changes (`.gitignore` + `dev.db`
  binary) because they are atomically meaningful — committing the
  binary without un-ignoring is a no-op, and un-ignoring without
  committing the binary leaves a dirty tree.

### Options Explored

#### Option A: Probe-gated fan-out (recommended)

- B0 (Mayor cleanup) → B1 (probe) → fan-out (B2…B7 parallel) →
  fan-in at B8 (Vercel deploy) → B9 (smoke + reseed) → B10 (tag).
- Each fix is its own bead; the probe is a hard gate; pivot is
  explicit (P0 "Switch to Option B" if probe fails).
- **Pros:** Maximum bisect resolution. Parallelizable middle
  layer. Probe failure detected early and cheaply. Pivot mechanics
  documented and out-of-band (separate project, not inline).
- **Cons:** ~10 beads to manage. Mayor cleanup is a coordination
  dependency outside Deploy's control.
- **Effort:** Medium — small per-bead work, more bead overhead.

#### Option B: Single deploy bead with sub-checklist

- One bead "Deploy to Vercel" with all edits + Vercel setup as
  internal checklist; smoke as a follow-up bead.
- **Pros:** Lower bead overhead, single PR/MR.
- **Cons:** Loses bisect resolution. Hides the probe gate inside
  the bead, making the pivot decision implicit. Violates the
  "small, linear commits" repo norm. Smoke verification gets
  blurred with implementation.
- **Effort:** Lower bead count, higher review cost.

#### Option C: Two-bead split (correctness fixes vs. deploy)

- Bead 1: all correctness fixes + force-dynamic + dev.db commit
  on `main`. Bead 2: Vercel project setup + smoke + tag.
- **Pros:** Reduces bead count to two while keeping deploy
  separated.
- **Cons:** Same bisect problem as Option B. No probe gate. If
  the probe would have failed, all the correctness fixes still
  land on `main` for an Option B project that may take weeks.
  Force-dynamic on a still-local app is dead code if the project
  pivots.
- **Effort:** Lower coordination, higher pivot regret cost.

### Recommendation

**Option A.** The probe gate is the load-bearing piece — without it,
the project's primary risk (Prisma + SQLite on Vercel serverless)
materializes after we've already committed `dev.db`, edited four
files, and started a Vercel project. With B1 first, we spend ~30
minutes proving feasibility and either continue confidently or
pivot cleanly with no orphan code on `main`. The fan-out middle
layer (B3-B7) is a coordination win because the polecats can run
in parallel under the witness's normal cadence; each fix is small
enough that a single polecat completes it in one session.

## Implementation Plan (the phased bead graph)

Bead IDs are placeholders; the next molecule (`mol-create-beads`)
materializes real IDs.

### B0 — Pre-Deploy: clean Mayor worktree (P0, prerequisite)

- **Type:** task (coordination)
- **Owner:** Mayor (escalated by overseer)
- **Description:** The Mayor worktree at
  `/Users/rfvitis/gt-personal/web_ui/mayor/rig/` has ~100 files
  staged as deletions. If Mayor wakes and pushes from that state,
  it wipes the GitHub repo. Mayor must reset/clean that worktree
  before any Deploy code-touching bead opens.
- **Blocks:** B1, B2, B3, B4, B5, B6, B7 (everything code-side).
- **Acceptance:** `git status` in Mayor worktree shows clean tree
  on `main`; mayor session restarted; overseer confirms via mail.
- **Source:** PRD clarification Q7.

### B1 — Probe Option C feasibility (P0, gates everything code-side)

- **Type:** task (investigation / probe)
- **Description:** Empirical verification that Prisma + read-only
  SQLite + non-root project directory + Vercel serverless actually
  works. Single bead; explicit 3-item acceptance checklist.
- **Acceptance (each line independently passable, all three required):**
  - **(a) Prisma engine bundling on Vercel with non-root project
    directory.** Build `web/` on Vercel (preview deploy off a
    throwaway branch is fine) with Root Directory = `web`; confirm
    the Prisma query engine is included in the deployed function
    bundle (no "engine not found" runtime error on the first
    request to `/grades`).
  - **(b) `DATABASE_URL` path resolution at runtime.** Confirm one
    of: (i) `file:./dev.db` works as-is from the Vercel function's
    cwd, (ii) `file:./prisma/dev.db` works, or (iii) an absolute
    `file:/var/task/...` path works via env var. Document the
    winning value in the bead notes.
  - **(c) SQLite journal-mode behavior on read-only filesystem.**
    Confirm that under default journal mode, Prisma's first read
    against the bundled `dev.db` does not attempt to create a
    `dev.db-journal` file (which would fail on Vercel's read-only
    fs). If it does, document the mitigation: switch the file to
    `PRAGMA journal_mode=DELETE` or `OFF` at seed time, or open
    the connection with `?mode=ro`.
- **Failure handling:** If any of (a/b/c) cannot be made green
  with reasonable effort (≤ 1 polecat session per item), the
  polecat **stops Deploy, files a P0 bead "Switch to Option B"
  for the next overseer decision**, and exits. Do NOT inline the
  Postgres migration into Deploy. Per PRD clarification Q2.
- **Carve-out:** Prisma 5.x patch/minor bump is allowed if it
  directly resolves a probe failure, with documented evidence in
  this bead. Prisma 6.x major is rejected (Modernization v2
  territory). Per PRD clarification Q3.
- **Blocks:** B2, B3, B4, B5, B6 (all code edits gated on probe
  green). Does NOT block B7 (kid-readable error.tsx is independent
  of DB platform).
- **Depends on:** B0.

### B2 — Land `dev.db` commit + un-ignore (P1)

- **Type:** task
- **Description:** Unstash full_stack's `wu-avk pre-pull:
  un-ignore dev.db edit` stash to remove `/prisma/dev.db` (and
  `/prisma/dev.db-journal`) from `web/.gitignore`. Re-run
  `npm run seed` to ensure the bundled SQLite reflects the latest
  `data/seed/grades.json`. Commit both `web/.gitignore` and
  `web/prisma/dev.db` in a single commit (atomic Option-C plumbing).
- **Acceptance:** `web/prisma/dev.db` is tracked; `git status` clean
  after commit; local `npm run dev` still works against the
  committed binary.
- **Depends on:** B1 (green).
- **Blocks:** B8.

### B3 — Add `force-dynamic` on /grades and /subject/[id] (P1)

- **Type:** task
- **Description:** Add `export const dynamic = 'force-dynamic';`
  at the top of `web/app/grades/page.tsx` and
  `web/app/subject/[id]/page.tsx`. Two one-line edits, one
  commit, one bead.
- **Acceptance:** Local `npm run build` shows both routes as
  `ƒ (Dynamic)` instead of `○ (Static)` in the route table.
- **Depends on:** B1 (green).
- **Blocks:** B8. **Critical ordering rationale:** must precede
  B8 — if `/grades` deploys as static, the first live page serves
  the build-time snapshot and goal #2 silently fails until the
  fix lands and a redeploy occurs.
- **Plan-phase concern absorbed:** "Edge runtime vs Node runtime"
  (see §Plan-phase concerns). If B1 surfaces a need, this bead
  also adds `export const runtime = 'nodejs';`.

### B4 — Navbar Grades link (P2, parallelizable)

- **Type:** task
- **Description:** Add `<NavLink href='/grades'>Grades</NavLink>`
  to `web/components/navbar/Navbar.tsx`, ordered before the
  existing About link. Final order: `Grades | About | DarkMode`.
- **Acceptance:** Visible on every page that renders the navbar
  (`/`, `/grades`, `/subject/[id]`, `/about`); clicking lands on
  `/grades`.
- **Depends on:** B1 (green). Parallel with B5, B6.
- **Blocks:** B8.

### B5 — Root `/` redirect to `/grades` (P2, parallelizable)

- **Type:** task
- **Description:** Replace `web/app/page.tsx` body with a
  server-side `redirect('/grades')` call from `next/navigation`.
- **Acceptance:** `curl -I http://localhost:3000/` returns a
  redirect to `/grades`; browser navigation to `/` lands on
  `/grades`.
- **Depends on:** B1 (green). Parallel with B4, B6.
- **Blocks:** B8.

### B6 — Empty-assignments zero-state (P2, parallelizable)

- **Type:** bug
- **Description:** When a subject has zero assignments, suppress
  the stale grade letter + percentage in two places:
  (i) `SubjectCard` on `/grades` — render subject name + teacher
  only, omit the `<CardContent>` grade block.
  (ii) `/subject/[id]` page header — render `"No assignments yet"`
  in place of the `teacher · grade · percent` summary line.
  The "By category" section is already conditionally rendered
  (`subject.assignments.length > 0`) so no change there.
- **Implementation note:** `SubjectCard` currently takes the bare
  `Subject` Prisma type without the `assignments` relation. Pick
  one: (a) widen the type and add the join in
  `fetchAllSubjects()`, or (b) select an `hasAssignments` boolean
  in the data layer. Recommend (b) — smaller surface, no
  payload bloat.
- **Acceptance:** A subject seeded with empty assignments shows
  the zero-state on both views; subjects with assignments are
  visually unchanged.
- **Depends on:** B1 (green). Parallel with B4, B5.
- **Blocks:** B8.

### B7 — Kid-readable error.tsx (P3, independent)

- **Type:** task
- **Description:** Replace generic copy in `web/app/error.tsx`
  with kid-readable text per PRD clarification Q6. Suggested:
  *"Hmm, the grade tracker isn't working right now. Your dad
  will fix it soon."* Keep the client-component shape,
  `useEffect(console.error)`, and the reset button. ~30 lines max.
  No remote error reporting, no retry styling, no new dependencies.
- **Acceptance:** Manual error injection (temporarily throw in a
  client component on `/grades`) renders the new copy; reset
  button still works.
- **Depends on:** B0 only (independent of probe outcome — even
  under Option B pivot, error.tsx still needs kid-readable copy).
- **Blocks:** B8.

### B8 — Vercel project setup + first deploy (P1, fan-in)

- **Type:** task
- **Description:** Create the Vercel project, link to the
  `shuhan-study/web_ui` GitHub repo, set Root Directory to `web`,
  set `DATABASE_URL` env var to whatever value B1(b) determined,
  trigger first production deploy from `main`, capture the
  resulting `*.vercel.app` URL into the bead notes (and into
  `notes/deploy-smoke.md` header).
- **Acceptance:** Build completes; production URL responds 200 on
  `/grades`; URL captured in bead notes; deploy is auto-triggered
  on push to `main` going forward.
- **Plan-phase concerns folded in (see §Plan-phase concerns):**
  - **Privacy sign-off** — confirm with overseer before the URL
    is bookmarked / shared. URL secrecy IS the access control;
    needs explicit sign-off given the user is a minor.
  - **Branch-to-deploy strategy** — confirm "every push to `main`
    deploys" is the intended posture (default Vercel GitHub
    integration). No protected `production` branch.
  - **Build success as explicit criterion** — Vercel build log
    shows zero Prisma engine warnings.
  - **Dependabot fix (B11)** — fold into B8 if it's a one-line
    bump; defer otherwise.
- **Depends on:** B2, B3, B4, B5, B6, B7.
- **Blocks:** B9.

### B9 — Live-URL smoke + reseed-redeploy verification (P1)

- **Type:** task
- **Description:** Walk the smoke checklist on the production URL;
  perform one full reseed cycle end-to-end (edit
  `data/seed/grades.json` → `npm run seed` → commit `dev.db` →
  push → wait for redeploy → verify live URL reflects the change);
  commit `notes/deploy-smoke.md` with the completion stamp
  `reseed cycle: ✅ <date>` per PRD clarification Q4.
- **Smoke checklist contents (lifted from this design):**
  - `/` redirects to `/grades` (HTTP 307/308 → 200 on `/grades`).
  - `/grades` renders all seeded subject cards with teacher,
    grade letter, percentage matching `data/seed/grades.json`.
  - Click any subject card → `/subject/[id]` renders title,
    summary line (or zero-state), assignments table.
  - Navbar shows `Grades | About | DarkMode` on every page;
    Grades link returns to `/grades`.
  - `/about` renders unchanged.
  - `/subject/<nonexistent-id>` renders styled 404.
  - Subject with empty assignments shows zero-state on both
    `/grades` card and detail header.
  - Dark-mode toggle works; no theme-flash on hard refresh.
  - Reseed cycle: edit one value in `data/seed/grades.json`,
    `npm run seed`, commit `dev.db`, push, wait for Vercel
    redeploy (~1-3 min), reload live URL → new value visible.
- **Acceptance:** All checklist items pass; `notes/deploy-smoke.md`
  committed with the dated stamp.
- **Depends on:** B8.
- **Blocks:** B10.

### B10 — Tag `v0.7-deploy-complete` (P1)

- **Type:** task
- **Description:** Cut the release tag on `main`. Since polecats
  don't push to main, this is either an overseer/maintainer
  action or a Refinery-triggered tag after B9's MR lands.
- **Acceptance:** Tag exists on `main`, points at the merge commit
  containing `notes/deploy-smoke.md` with the reseed stamp.
- **Depends on:** B9.

### B11 (optional) — Dependabot fix

- **Type:** chore
- **Description:** GitHub Dependabot reports 1 moderate
  vulnerability on `shuhan-study/web_ui` (surfaced in `wu-avk`).
- **Decision rule (per PRD OQ #8):** if the fix is a single-line
  patch/minor bump, fold into B8's commit; otherwise file as a
  separate post-Deploy bead.
- **Depends on:** N/A (decision-time bead).

### Bead graph (visual)

```
B0 (Mayor cleanup)
 │
 ├─→ B1 (Probe Option C) ──[fail]──→ STOP, file P0 "Switch to Option B"
 │      │
 │      └─[green]──┬─→ B2 (dev.db commit + un-ignore) ─┐
 │                 ├─→ B3 (force-dynamic) ──────────────┤
 │                 ├─→ B4 (Navbar Grades) ──────────────┤
 │                 ├─→ B5 (Root redirect) ──────────────┤
 │                 └─→ B6 (zero-state) ─────────────────┤
 │                                                       │
 └─→ B7 (kid-readable error.tsx) ───────────────────────┤
                                                         │
                                                         ▼
                                              B8 (Vercel deploy)
                                                         │
                                                         ▼
                                              B9 (smoke + reseed)
                                                         │
                                                         ▼
                                              B10 (tag v0.7)
```

## Constraints Identified

- **B0 must close before any code-touching bead opens.** Mayor
  cleanup is outside Deploy's control; this is a coordination
  dependency, not just a sequencing nicety.
- **B1 must be a real Vercel deploy** (preview branch off a
  throwaway), not a local-only simulation. The whole risk is
  serverless-environment-specific behavior that local builds
  don't exercise.
- **B3 must precede B8.** A static-rendered first deploy serves
  the build snapshot forever; goal #2 silently fails until the
  fix lands and a redeploy occurs.
- **B2 commits a binary.** `web/prisma/dev.db` is a small SQLite
  file; first-time landing should keep it under a few MB.
  Subsequent reseeds will create binary diffs in commit history
  — accepted under Option C.
- **No direct main pushes from polecats.** Every bead's MR goes
  through the Refinery merge queue. B10's tag is an
  overseer/Refinery action.
- **Probe failure pivots to a separate project.** No inline
  Postgres migration. PLAN.md decision log already records this.

## Open Questions

- **Who runs the smoke (B9)?** PRD review surfaced this. Two
  options: (i) a polecat in a verification bead reads the
  checklist and posts results to bead notes; (ii) Rongjun runs
  the checklist on his laptop and the polecat just commits the
  stamped Markdown. **Recommendation:** polecat for the
  text-verifiable items (HTTP responses, page contents),
  Rongjun for the dark-mode flash + reseed cycle (which
  requires editing real seed data and pushing). Hybrid;
  bead notes capture both.
- **Vercel account ownership.** Is the Vercel account already
  created and linked to the GitHub org/user? PRD OQ #7 flagged
  this as "first bead can include it." **Recommendation:** B8
  starts with an account-creation step if needed; that's the
  earliest natural point to find out.
- **Empty-assignments data shape.** Option (a) widen the type
  vs. option (b) add `hasAssignments` boolean in B6 — design
  preference. **Recommendation:** (b) is smaller; pick (b) unless
  the polecat finds a reason during B6.
- **Mid-deploy Mayor wake-up.** B0 closes Mayor's danger; what
  if Mayor wakes mid-Deploy with another dirty worktree? Out of
  Deploy's scope but worth flagging to overseer.
- **Who cuts the tag (B10)?** Polecats don't push to main;
  Refinery merges via MQ. Tag-cutting is either a Refinery
  capability or an overseer manual action. Resolve before B10.

## Integration Points

- **Requirements dimension** — eight goals in PRD map to beads:
  G1 → B8/B9, G2 → B3, G3 → B9 (reseed cycle), G4 → B4, G5 → B5,
  G6 → B6, G7 → B9, G8 → B10. Plus implicit: PRD clarification
  Q6 → B7. No goals map to B0/B1/B2 directly; those are
  prerequisites and infrastructure.
- **Risk dimension** — B1 is the entire project risk. If it's
  green, the rest of the graph is small, well-understood edits.
  If it's red, the project pivots to a separate Postgres
  Migration project.
- **Stakeholders dimension** — Overseer gates B0 and the pivot
  decision; Mayor owns B0; Refinery owns B10's tag and all merge
  ops; Witness monitors polecats throughout; Rongjun (the human)
  signs off on privacy (folded into B8) and likely runs part of
  B9.
- **Pivot mechanics (Option B handoff)** — if B1 fails and the
  project pivots, the Option B project would inherit:
  - Schema change: `provider = "postgresql"` in
    `web/prisma/schema.prisma`.
  - Seed script: `web/prisma/seed.ts` (or wherever it lives) made
    Postgres-compatible — likely a no-op since it uses Prisma
    Client, but verify any SQLite-specific fixtures.
  - Neon project setup: free-tier Postgres, capture connection
    string, set as Vercel `DATABASE_URL` env var.
  - Removal of bundled `dev.db` from the repo (revert B2).
  - Reseed flow changes: `npm run seed` now writes to Neon, not
    local SQLite; redeploy is no longer required for fresh data
    (live mutation possible). `force-dynamic` (B3) becomes more
    valuable but the requirement is unchanged.
  - All other Deploy beads (B4, B5, B6, B7) carry forward
    unchanged — they're DB-platform-agnostic.
  This handoff is a lightweight doc the pivot polecat creates;
  it does not need to be pre-written here.

## Plan-phase concerns from PRD review

The PRD review at `.prd-reviews/deploy/prd-review.md` lines 124–183
listed 11 important-but-non-blocking items the overseer delegated
to the plan phase. Decisions or fold-into-bead recommendations:

1. **Latency expectations.** No hard target; PRD says "page
   eventually renders" is fine. **Decision:** add to B9 smoke as
   a soft check — note cold-start TTFB but no fail threshold.
2. **Privacy sign-off (minor's grades on a public URL).** **Fold
   into B8:** require explicit overseer sign-off before
   bookmarking / sharing the URL. URL secrecy is the access
   control; this needs to be acknowledged.
3. **Empty-assignments scope (cards / detail / both).** **Decision:
   both.** Folded into B6's description.
4. **Subject with reduced (not zero) assignments.** Out of scope
   for Deploy — PRD only addresses the empty case. **Decision:**
   no bead; if discovered, file as a separate bug post-Deploy.
5. **Three correctness fixes — bundled or splittable?** **Decision:
   one bead per fix** (B4, B5, B6, B7 each independent). Per repo
   norm of small linear commits.
6. **Cut-able goals for earlier ship?** **Decision:** v0.7 stays
   atomic — all eight goals or no tag. If the timeline slips,
   cut B11 (Dependabot) first; never cut B7 (error UX is
   user-facing for a kid).
7. **Smoke owner.** **Decision:** hybrid — polecat for text-
   verifiable items, Rongjun for dark-mode flash + reseed cycle.
   See §Open Questions.
8. **Dependabot fix folded or deferred.** **Decision:** B11 is
   conditional — fold into B8 if one-line bump; defer otherwise.
9. **Build success as explicit criterion.** **Fold into B8
   acceptance:** Vercel build log shows zero Prisma engine
   warnings.
10. **Edge vs. Node runtime.** Prisma needs Node. **Decision:**
    if B1 surfaces an edge-default issue, B3 also adds
    `export const runtime = 'nodejs';` to both routes. Otherwise
    rely on Next 16 default (Node for App Router routes that
    use Prisma).
11. **Branch-to-deploy strategy.** Default Vercel behavior:
    every push to `main` deploys. **Decision:** accept the
    default — confirm in B8 acceptance. No `production` branch
    or tag-gating.

---

integration.md written

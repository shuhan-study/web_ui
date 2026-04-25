# Design: Deploy `web_ui` to Vercel

_Synthesis of six dimension analyses for the Deploy project. Inputs:
`api.md`, `data.md`, `ux.md`, `scale.md`, `security.md`,
`integration.md`. Source of truth on locked decisions: `PLAN.md` +
`.prd-reviews/deploy/prd-draft.md` (incl. "Clarifications from Human
Review" section)._

---

## Executive Summary

Deploy is a small, ordering-sensitive project. The end state is `web_ui`
running at a `*.vercel.app` URL backed by a read-only SQLite file
committed to the repo (Option C, locked), with four pre-identified
correctness fixes (navbar `Grades` link, root `/` redirect, empty-
assignments zero-state, kid-readable `error.tsx`) shipped alongside the
first deploy. Roughly seven files change in `web/`, plus one binary
commit (`web/prisma/dev.db`), one `.gitignore` tweak, and one new
checked-in smoke document. No schema changes, no new pages, no auth, no
test infra, no custom domain.

The project's entire risk is concentrated in **one bead, B1: the Option
C feasibility probe**. If Prisma + read-only SQLite + Vercel's serverless
runtime can be made to work (likely yes, with a Prisma `binaryTargets`
adjustment and a `?mode=ro&immutable=1` SQLite open mode), the rest is
small, well-understood edits. If it can't, the project pivots out — Deploy
stops, a separate "Postgres Migration" project gets opened, Deploy
resumes after that lands. The pivot is explicit, out-of-band, and
documented; it does not get inlined.

The recommended shape is a **probe-gated, fan-out, fan-in bead graph**
of 10 beads (B0…B10, plus optional B11 for a Dependabot fix). One P0
prerequisite bead (Mayor-worktree cleanup, B0) blocks all code-touching
work. The probe (B1) gates everything DB-related. Three correctness
fixes (B4, B5, B6) plus the error-boundary rewrite (B7) parallelize
under the witness's normal cadence. A single fan-in bead (B8) does
Vercel setup + first deploy. B9 walks the smoke checklist and verifies
the reseed-redeploy cycle end-to-end. B10 cuts the
`v0.7-deploy-complete` tag.

The most important non-locked design decisions surfaced by this synthesis:

1. **Add `binaryTargets = ["native", "rhel-openssl-3.0.x"]`** to
   `web/prisma/schema.prisma` — almost certainly needed for the Vercel
   build. Most likely B1(a) failure mode and the most likely trigger of
   the documented Prisma 5.x patch-bump carve-out.
2. **Open SQLite as `file:...?mode=ro&immutable=1`** to match the
   read-only filesystem and skip journal-file creation entirely.
3. **Add an `npm run reseed` script** that wraps `prisma db seed` plus
   `git add` of the binary — the single highest-leverage ergonomic
   improvement for the maintainer's weekly loop.
4. **Anonymize seed data to first-name-only** before the first public
   deploy. The `dev.db` currently bundles a real student's full name,
   real school, real teacher surnames, and real grades. URL secrecy is
   the only access control under the locked "no auth" decision; data-
   side mitigation is the cheapest defense-in-depth and stays inside
   PRD scope.
5. **Smoke ownership is hybrid**: polecat does text-verifiable items in
   B9; Rongjun does the dark-mode flash + reseed-cycle end-to-end.

---

## Problem Statement

`web_ui` is a feature-complete, read-only Next 16 / React 19 / Prisma 5
/ SQLite grades dashboard for a single 11-year-old user (Shuhan). It
runs on `localhost:3000` but has never been deployed. Shuhan cannot
open it from her phone without her father (Rongjun) running `npm run
dev`, which means the app is effectively unusable for its intended
purpose. Three pre-identified correctness gaps will be the first thing
a real user sees once the URL is live: no `Grades` link in the navbar,
root `/` is a Next.js placeholder, and subjects with empty assignments
render a stale grade letter from a stored summary field.

Deploy resolves all of this in one project: gets the app to a public
`*.vercel.app` URL, fixes the four correctness gaps along the way, and
verifies that the `edit-seed-commit-push` reseed loop actually produces
fresh data on the live URL inside ~3 minutes.

Soft deadline: end of Trimester 3 (2026-05-30) so Shuhan can track final
grades from her phone.

---

## Proposed Design

### Overview

A **probe-gated deployment** of the existing `web_ui` codebase to a new
Vercel project, with the database shipped as a read-only SQLite file
bundled into the build (Option C). Three runtime correctness fixes
(navbar, redirect, zero-state) and one boundary-component rewrite
(`error.tsx`) ship in the same project. A new checked-in smoke document
(`notes/deploy-2026-04-25/smoke.md`) records the end-to-end reseed
cycle stamp that completes the project.

The shape is a probe-gated fan-out: one P0 prerequisite (Mayor
worktree), one feasibility probe (B1), four parallelizable correctness
beads, one fan-in deploy bead, one verification bead, one tag bead.

### Key Components

**Code edits in `web/` (B2-B7):**
- `web/.gitignore` — un-ignore `/prisma/dev.db`; keep `dev.db-journal`
  ignored; add `dev.db-wal` and `dev.db-shm` to the ignore list
- `web/prisma/dev.db` — committed as a tracked binary blob
  (re-generated via `npm run seed` immediately before the commit so the
  bundled data matches the latest `data/seed/grades.json`)
- `web/prisma/schema.prisma` — add
  `binaryTargets = ["native", "rhel-openssl-3.0.x"]` to the `client`
  generator block
- `web/app/grades/page.tsx` — one-line `export const dynamic =
  'force-dynamic';` at top
- `web/app/subject/[id]/page.tsx` — same one-line export
- `web/app/page.tsx` — replace placeholder with
  `redirect('/grades')` from `next/navigation`
- `web/components/navbar/Navbar.tsx` — add
  `<NavLink href="/grades">Grades</NavLink>` ordered before the
  existing About link (final order: `Grades | About | DarkMode`).
  `NavLink` already implements active-state styling via `usePathname()`,
  so no new component
- `web/components/subjects/SubjectCard.tsx` + the subject-detail header
  in `web/app/subject/[id]/page.tsx` — empty-assignments suppression /
  zero-state copy in both surfaces
- `web/app/error.tsx` — full rewrite (current copy is "Something went
  wrong" + a "Try again" button; needs kid-readable replacement)
- `web/package.json` — add `"reseed"` script: `prisma db seed && git
  add prisma/dev.db ../data/seed/grades.json`
- New: `notes/deploy-2026-04-25/smoke.md` — checked-in smoke checklist
  with `reseed cycle: ✅ <date>` stamp

**Off-repo (B8):**
- New Vercel project, GitHub-linked to `shuhan-study/web_ui`, Root
  Directory = `web`, framework auto-detected as Next.js, single env var
  `DATABASE_URL` set per B1(b)'s findings, deploy on push to `main`
- `*.vercel.app` URL captured into bead notes and into the smoke doc's
  header

**Files explicitly NOT touched** (kept out of scope to keep the project
narrow): `web/next.config.mjs` (stays empty unless B1 forces an
`outputFileTracingIncludes` entry), `web/prisma/seed.ts`,
`web/app/about/page.tsx`, `web/app/not-found.tsx`,
`web/app/layout.tsx`, ESLint / TS config, `package.json` deps (unless
B11's Dependabot fix folds in).

### Interface

**Vercel project setup (one-shot, dashboard-only):**
- New Project → Import GitHub repo → set Root Directory `web` →
  Framework auto-detects Next → add env var `DATABASE_URL` → Deploy.
  No `vercel.json`. ~6 clicks.

**Reseed-to-live developer workflow (weekly, two commands):**
```
edit data/seed/grades.json
cd web && npm run reseed     # runs seed + git-adds dev.db + grades.json
git commit -m "reseed YYYY-MM-DD" && git push
```
Vercel auto-deploys on push; live URL reflects the new data ~1-3 min later.

**Per-route dynamic rendering:** `export const dynamic =
'force-dynamic';` at the top of each page segment that reads from
Prisma. Per-page (not layout, not `route.ts`) for the smallest blast
radius and the most discoverable spot for future maintainers.

**Root redirect:** `app/page.tsx` calls `redirect('/grades')` from
`next/navigation`. Server-side, two lines, RSC-friendly. No
`next.config.mjs` redirect entry (config drift surface kept zero).

**Error UX for the kid user:** kid-readable copy in `app/error.tsx`,
~30 lines, no remote error reporting, no retry stylings beyond what's
already there. Suggested:
> "Hmm, the grade tracker isn't working right now. Your dad will fix it
> soon."

**Smoke artifact:** checked-in markdown at
`notes/deploy-2026-04-25/smoke.md` mirroring
`notes/modernization-baseline.md` format, with the completion stamp
`reseed cycle: ✅ <date>` per PRD clarification Q4.

### Data Model

**Schema unchanged.** No new tables, no new fields, no migrations.
Existing `20260419141556_init` migration stays as-is.

**Storage mechanic (Option C, locked):** `web/prisma/dev.db` is a
single-file SQLite database, generated locally via `prisma db seed`,
committed to the repo, and bundled into the Vercel deploy artifact. At
runtime the serverless function opens it read-only.

**Connection string at runtime:**
- Local dev: `DATABASE_URL=file:./dev.db` (preserved via `.env.local`,
  unchanged from current behavior).
- Vercel production: `DATABASE_URL=file:/var/task/prisma/dev.db?mode=ro&immutable=1`
  (or whatever absolute path B1(b) determines). The
  `?mode=ro&immutable=1` query string is SQLite-native — it tells the
  driver "no journal files needed" which exactly matches Vercel's
  read-only filesystem.

**Prisma engine bundling:** add `binaryTargets = ["native",
"rhel-openssl-3.0.x"]` to `schema.prisma`'s generator block. The default
`["native"]` only emits the build-host target (darwin-arm64 on
Rongjun's Mac), which won't run on Vercel's Linux runtime. This is the
single most likely cause of B1(a) failure and is the most likely
trigger of the PRD-Q3 Prisma-bump carve-out if a 5.x patch is required
to fix related bundling.

**Reseed-cycle integrity:** each reseed regenerates the `dev.db` blob;
git stores it as a binary in pack files. Repo growth is ~50KB per
reseed × ~14 reseeds per trimester ≈ 700KB/term. Negligible at this
scale; revisit if repo ever exceeds 100MB. No `git-lfs`, no
`.gitattributes` change needed.

**Pivot path (if probe fails):** Option B (Postgres on Neon) inherits
this schema with a one-line `provider` switch in `schema.prisma`,
unchanged seed script, unchanged seed JSON. Lightweight handoff —
documented in the pivot bead, not pre-written here.

---

## Trade-offs and Decisions

### Decisions Made

These are decisions either locked by `PLAN.md` / PRD or recommended by
this synthesis. The synthesis-level decisions become inputs to the
plan / create-beads phase.

**Locked upstream (do not relitigate):**
- **DB platform:** Option C. SQLite committed, bundled, redeploy on reseed.
- **Pivot mechanics:** if Option C probe fails → file P0 "Switch to
  Option B", stop Deploy, do NOT inline migration into Deploy.
- **Prisma version:** 5.22.0 pinned; 5.x patch/minor bumps allowed only
  if required to resolve a probe failure with documented evidence; 6.x
  rejected (Modernization v2 territory).
- **Root `/`:** redirect to `/grades`, not a landing page.
- **Stale subtitle:** zero-state copy, not "fix the stored value."
- **`error.tsx`:** kid-readable, ~30 lines, no remote error reporting.
- **Auth:** none. URL secrecy is the access posture.
- **Custom domain:** none. `*.vercel.app` is "landed."
- **Smoke artifact:** checked-in markdown with `reseed cycle: ✅ <date>`
  stamp, mirroring modernization pattern.

**Recommended by this synthesis (subject to plan-phase ratification):**
- **Vercel config:** dashboard-only. No `vercel.json` unless B1 surfaces
  a need for `outputFileTracingIncludes` or runtime pinning.
- **`DATABASE_URL` value on Vercel:** absolute path with
  `?mode=ro&immutable=1` query string. Resolves PRD Open Question #2.
- **Prisma `binaryTargets`:** add `"rhel-openssl-3.0.x"` alongside
  `"native"` in `schema.prisma`.
- **`force-dynamic` placement:** per-page segment, not layout-level.
- **Redirect implementation:** `app/page.tsx` calling `redirect()`, not
  `next.config.mjs`. Resolves PRD Open Question #4.
- **Navbar order:** `Grades | About | DarkMode`. Resolves PRD OQ #5.
- **Empty-assignments scope:** suppress on BOTH `/grades` cards AND the
  subject-detail header. Resolves a PRD-review plan-phase concern.
- **Empty-assignments data shape:** add an `hasAssignments: boolean`
  field selected by `fetchAllSubjects`, rather than widening the type
  to include the assignments relation. Smaller surface, no payload
  bloat. Open in B6 for the implementing polecat to confirm.
- **`npm run reseed` script:** wrap seed + `git add` of the binary.
- **Seed data anonymization:** convert `web/data/seed/grades.json` and
  `web/prisma/seed.ts` to first-name-only, generic school name,
  initials-only teacher names BEFORE the first deploy. Stays within
  PRD scope (no auth) and removes the highest-impact data-sensitivity
  concern. See §Risks.
- **`robots.txt` + `X-Robots-Tag: noindex`:** ship with B8 to discourage
  indexing of the public URL. Cheap, complementary to anonymization.
- **Smoke ownership:** hybrid — polecat for text-verifiable items
  (HTTP responses, page contents), Rongjun for the dark-mode flash
  and the reseed cycle. Resolves PRD-review plan-phase concern.
- **Bead granularity:** one bead per fix (B4, B5, B6, B7 each
  independent). Matches repo's small-linear-commits norm.
- **Dependabot fix:** conditional B11 — fold into B8 if it's a one-line
  bump; defer otherwise. Resolves PRD OQ #8.
- **Edge runtime:** stay on Node runtime (Prisma needs it). No
  `export const runtime = 'edge'`.

### Open Questions

These are real unknowns the plan / implementation phases must resolve.
None block the create-beads phase.

1. **Will the probe (B1) actually pass?** The whole project depends on
   it. Best estimate: yes with the `binaryTargets` + `?mode=ro&immutable=1`
   recommendations above. Worst case: the `binaryTargets` fix requires
   a Prisma 5.x patch bump, which is allowed under the PRD-Q3 carve-out.
   Deeper failure → pivot to Option B project.
2. **Will the seed-data anonymization happen, and who decides?**
   Touches PRD scope tangentially (no schema change, no architectural
   change, but does change displayed copy). Recommend folding the
   decision into B0/B1 timeframe so it lands before B8 (when the URL
   becomes shareable). If overseer prefers to keep real data, document
   that explicitly so the privacy posture is conscious.
3. **Vercel account ownership.** Is the Vercel account already created
   and linked to the GitHub user/org? PRD OQ #7. B8 starts with an
   account-creation step if not — that's the earliest natural point.
4. **Who cuts the `v0.7-deploy-complete` tag (B10)?** Polecats don't
   push to main. Either Refinery has a tag-cutting capability or it's
   an overseer manual action. Resolve before B10.
5. **Mayor mid-Deploy wake-up.** B0 closes the current Mayor-worktree
   danger; what if Mayor wakes mid-Deploy with another dirty worktree?
   Out of Deploy's scope but worth flagging to overseer for monitoring.
6. **`SubjectCard` data shape (`hasAssignments` boolean vs widened
   type).** Recommend `hasAssignments`; let B6's polecat confirm during
   implementation.

### Trade-offs

- **Option C vs Option B (locked):** Option C trades runtime mutability
  for narrow scope. We can't update grades without a redeploy, but a
  redeploy is ~1-3 minutes and is exactly the operator's existing weekly
  cadence. Option B (Postgres) would enable live mutation we don't need
  and would expand Deploy into a DB-migration project. **Net:** correct
  trade-off given the read-only nature of the app and the soft deadline.
- **Bead granularity (one per fix vs bundled):** one bead per fix costs
  ~10 beads of overhead but buys bisect resolution and parallelism.
  Bundling into 1-2 beads would save witness/Refinery cycles but blur
  the probe gate and lose bisect. **Net:** keep one-per-fix; the witness
  handles many small beads well.
- **Dashboard-only Vercel setup vs `vercel.json`:** dashboard wins on
  zero drift surface for a single-maintainer project, loses on
  reproducibility from cold. **Net:** dashboard now; if a future
  maintainer ever onboards, write `vercel.json` then.
- **Per-page `force-dynamic` vs layout-level:** per-page is slightly
  more verbose but vastly more discoverable and doesn't accidentally
  force `/about` dynamic. **Net:** per-page.
- **Anonymization vs accept-real-data:** anonymization is ~10 minutes
  of work and removes the highest-impact data-sensitivity concern.
  Accept-real-data requires explicit overseer sign-off documenting that
  URL secrecy is the entire access control. **Net:** strongly recommend
  anonymization; defer to overseer if real data is required.

---

## Risks and Mitigations

**R1 — Option C probe fails (project's primary risk).**
Prisma + read-only SQLite + Vercel serverless is "known-but-not-loved."
Specific failure modes ranked by likelihood:
- (most likely) Prisma engine target mismatch → fixed by
  `binaryTargets` addition.
- SQLite tries to create a journal file on read-only fs → fixed by
  `?mode=ro&immutable=1` open mode.
- `DATABASE_URL` path resolution diverges between local and Vercel
  serverless cwd → fixed by absolute path in env var.
- Some deeper interaction we haven't surfaced → triggers pivot to
  Option B (Postgres on Neon).

**Mitigation:** Probe is a single bead with explicit 3-item checklist.
Each item independently passable. Failure of any → file P0 "Switch to
Option B", stop Deploy, do NOT inline. Per PRD clarifications Q1+Q2.

**R2 — Mayor worktree wipes the GitHub repo (project-blocking incident).**
Mayor's worktree at `/Users/rfvitis/gt-personal/web_ui/mayor/rig/` has
~100 files staged as deletions. If Mayor wakes and pushes from that
state, the GitHub repo gets wiped — which would also nuke any in-flight
Vercel deploys.

**Mitigation:** P0 prerequisite bead B0 (per PRD Q7). Must close before
any code-touching bead opens. Coordinated by overseer + Mayor.

**R3 — Bundled `dev.db` exposes a minor's grades on a public URL.**
Per the security leg's load-bearing finding, the seed data currently
contains real PII for an 11-year-old: full name, real school, real
teacher surnames, real grades. The locked "no auth" decision means URL
secrecy is the only access control. `*.vercel.app` URLs are scanned
and indexed.

**Mitigation (recommended, three layers):**
- (a) Anonymize seed data to first-name-only + generic school +
  initials-only teachers BEFORE first deploy. Cheapest, highest impact.
- (b) `robots.txt` disallow + `X-Robots-Tag: noindex` HTTP header to
  discourage search-engine indexing.
- (c) Repo stays permanently private (already the case; document the
  constraint — flipping to public would have retroactive disclosure
  consequences via git history).

**R4 — Future repo-visibility flip retroactively discloses every grade
snapshot in git history.**
Once `dev.db` is committed, every reseed lives in git history. If the
repo is ever made public, every historical grade is exposed.

**Mitigation:** Document "repo must stay private" as a project
constraint. Add to README and to the smoke document.

**R5 — Static-rendered first deploy serves a build-time snapshot
forever.**
If `force-dynamic` (B3) doesn't land before B8 (first deploy), the
first live `/grades` is SSG-cached and goal #2 silently fails until the
fix lands and a redeploy occurs.

**Mitigation:** B3 is a hard predecessor of B8 in the bead graph. The
critical-ordering rationale is documented explicitly in B3's bead
notes.

**R6 — Reseed forgotten, live URL stale.**
The reseed flow is "edit JSON → run seed → git add binary → commit →
push." The `git add` step for the binary is the most-likely-forgotten
step. Symptom: live URL stays stale after a reseed.

**Mitigation:** `npm run reseed` script bundles seed + `git add`. Two
commands instead of three; binary is harder to forget.

**R7 — Cold-start latency on infrequent visits.**
Vercel serverless cold start ~1-3s for Next 16 + Prisma. Shuhan visits
once a day, so most visits are cold.

**Mitigation:** None recommended. 1-3s is acceptable for a personal
dashboard; Edge Runtime is incompatible with Prisma; keep-warm crons
are overkill. Smoke checklist includes a "page eventually loads" check
without a hard threshold.

**R8 — Dependabot moderate vulnerability.**
GitHub flagged 1 moderate vuln on the repo (per `wu-avk`). For a public
deploy, ignoring it is poor hygiene.

**Mitigation:** Conditional B11. Fold into B8's commit if it's a
single-line patch/minor bump. Defer to a post-Deploy bead if it pulls
in a major version drift.

---

## Implementation Plan

The phased plan is the integration leg's bead graph, lifted essentially
verbatim. Bead IDs (`B0…B11`) are placeholders; the next molecule
(`mol-create-beads`) materializes real IDs.

### Phase 1: MVP (the project itself)

This IS the entire Deploy project. No partition between MVP and
follow-on within Deploy — every goal in the PRD is required for
`v0.7-deploy-complete`.

**B0 — Pre-Deploy: clean Mayor worktree (P0, prerequisite, blocks all
code-touching beads)**
- Owner: Mayor (escalated by overseer)
- Source: PRD clarification Q7
- Acceptance: `git status` in Mayor worktree clean; mayor session
  restarted; overseer confirms via mail

**B1 — Probe Option C feasibility (P0, gates B2-B6)**
- Single bead, 3-item acceptance checklist:
  - **(a)** Prisma engine bundling on Vercel with non-root project
    directory (Root Directory = `web`). Verified by a preview deploy
    off a throwaway branch returning a non-error response on `/grades`.
    Most likely fix: add `binaryTargets = ["native",
    "rhel-openssl-3.0.x"]` to `schema.prisma`.
  - **(b)** `DATABASE_URL` path resolution at runtime. Document the
    winning value in bead notes. Recommend
    `file:/var/task/prisma/dev.db?mode=ro&immutable=1`.
  - **(c)** SQLite journal-mode behavior on read-only filesystem.
    Verified by no `dev.db-journal` creation attempt. Mitigation if
    needed: `?mode=ro&immutable=1` query string (preferred), or
    explicit `PRAGMA journal_mode=DELETE` at seed time.
- Failure of any item → file P0 "Switch to Option B" and stop Deploy.
  Per PRD Q2.
- Carve-out: Prisma 5.x patch/minor bump allowed if needed to fix a
  probe failure with documented evidence. Per PRD Q3.
- Depends on: B0.

**B2 — Land `dev.db` commit + un-ignore (P1)**
- Unstash full_stack's `wu-avk pre-pull: un-ignore dev.db edit` stash;
  re-run `npm run seed`; commit `web/.gitignore` + `web/prisma/dev.db`
  atomically.
- Depends on: B1 green.

**B3 — Add `force-dynamic` on `/grades` and `/subject/[id]` (P1,
critical ordering: must precede B8)**
- Two one-line edits, single commit.
- Acceptance: local `npm run build` shows both routes as `ƒ (Dynamic)`.
- **Why (PRD Q5 acceptance, verbatim):** Each request to `/grades` and
  `/subject/[id]` reads from bundled `dev.db` shipped with the most
  recent successful deploy. No build-time SSG snapshot, no per-request
  caching beyond standard browser/CDN behavior. Freshness ≠ real-time;
  staleness is bounded by deploy cadence.
- Depends on: B1 green.

**B4 — Navbar Grades link (P2, parallel with B5/B6)**
- Add `<NavLink href="/grades">Grades</NavLink>` before the existing
  About entry.
- Depends on: B1 green.

**B5 — Root `/` redirect to `/grades` (P2, parallel with B4/B6)**
- Replace `web/app/page.tsx` body with `redirect('/grades')`.
- Depends on: B1 green.

**B6 — Empty-assignments zero-state (P2, parallel with B4/B5)**
- Suppress stale grade letter on `SubjectCard` when no assignments;
  render `"No assignments yet"` on the subject-detail header. Add
  `hasAssignments: boolean` to `fetchAllSubjects`.
- Depends on: B1 green.

**B7 — Kid-readable `error.tsx` (P3, independent of probe)**
- Rewrite copy + remove "Try again" wording per PRD Q6. Independent of
  DB-platform outcome, so does not require B1 green; depends only on
  B0.

**B8 — Vercel project setup + first deploy (P1, fan-in)**
- Create Vercel project; link GitHub repo; Root Directory = `web`; set
  `DATABASE_URL` env var per B1(b); deploy from `main`; capture URL.
- Folded plan-phase concerns: privacy sign-off (overseer must
  acknowledge that URL secrecy is the access control before bookmark/
  share); branch-to-deploy strategy (every push to `main` deploys);
  build success criterion (zero Prisma engine warnings in Vercel build
  log); optional Dependabot fix (B11) inlined here if one-line bump.
- Also adds: `robots.txt` + `X-Robots-Tag: noindex` headers (per R3).
- Depends on: B2, B3, B4, B5, B6, B7.

**B9 — Live-URL smoke + reseed-redeploy verification (P1)**
- Walk smoke checklist on production URL; perform reseed cycle
  end-to-end; commit `notes/deploy-2026-04-25/smoke.md` with
  `reseed cycle: ✅ <date>` stamp per PRD Q4.
- Hybrid ownership: polecat for text-verifiable items, Rongjun for
  dark-mode flash + reseed cycle.
- Depends on: B8.

**B10 — Tag `v0.7-deploy-complete` (P1)**
- Cut release tag on `main`.
- **Pre-B10 prerequisite (resolves OQ #4):** the tag-cutting actor must
  be named before this bead opens. Two options: (a) Refinery cuts the
  tag as part of its merge action — requires confirming Refinery
  supports `git tag` and documenting the trigger; (b) overseer cuts
  the tag manually with `git tag v0.7-deploy-complete && git push
  origin v0.7-deploy-complete` — names the human as B10's executor.
  Resolution will be raised at the plan-approval gate (wu-avk
  Blocker-2 contract); B10's acceptance text gets one of these
  options written in before create-beads.
- Depends on: B9.

**B11 (optional) — Dependabot fix**
- Conditional: fold into B8 if one-line bump; defer otherwise.

**Bead graph:**
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

### Phase 2: Polish (post-tag, out of Deploy scope)

The PRD locks the Deploy scope tightly. Polish items that will surface
naturally during implementation but are explicitly NOT part of `v0.7`:
- Custom domain (deferred per PLAN.md).
- "Last updated" timestamp on `/about` for Rongjun's verification (a
  small polish bead post-tag if it proves useful).
- Subject with reduced (not zero) assignments — current PRD only
  addresses the empty case; if discovered post-deploy, file as a
  separate bug.
- Dependabot deferred fixes (if B11 deferred).

### Phase 3: Future (out of project scope, named for hand-off)

These items are future projects, not Phase 3 of Deploy. Named so the
hand-off to "what's next" is grounded:
- **Modernization v2 (`wu-sjk`):** Tailwind 3 → 4. Already filed.
- **Postgres Migration:** the Option B project that gets opened *only*
  if B1 fails. Stays a separate project even if it does happen.
- **Auth + custom domain:** if Shuhan's data sensitivity ever grows or
  the URL leaks, middleware basic-auth with a single env-var password
  is the cheapest "real" gate. Out of Deploy scope per PRD.
- **Aeries / school-system integration:** PLAN.md flags as a possible
  future project that *presupposes* Deploy lands first.

---

## Appendix: Dimension Analyses

Full dimension analyses live alongside this synthesis:

- **`api.md`** — interface design across Vercel setup, reseed loop,
  `force-dynamic` placement, root redirect, navbar, zero-state,
  `error.tsx`, and the smoke artifact. Recommends dashboard-only
  Vercel, `npm run reseed` script, per-page `force-dynamic`,
  `app/page.tsx` redirect.
- **`data.md`** — Option C execution mechanics: `binaryTargets`
  addition, `?mode=ro&immutable=1` SQLite open mode, absolute path in
  `DATABASE_URL`, journal-file handling, Prisma version policy under
  the bump carve-out, schema-unchanged confirmation, repo growth
  estimates, pivot-to-Option-B handoff sketch.
- **`ux.md`** — single-user kid-facing UX: bookmark happy path,
  navbar discoverability + active-link styling, zero-state copy
  recommendations, `error.tsx` copy refinement, cold-start tolerance,
  hybrid smoke ownership, `npm run reseed` rationale, build-date line
  on `/about` for the maintainer.
- **`scale.md`** — sets the "single-user, near-zero RPS" baseline and
  uses it to justify "do nothing, this is fine" on most performance
  questions. Highlights cold-start tolerance, Vercel Hobby tier
  headroom, reseed-build-time SLA (~1-3 min), bundle-size growth
  inflection point (50MB), and concurrency safety of read-only SQLite
  on multiple serverless instances.
- **`security.md`** — load-bearing finding: seed data contains real
  PII for a minor. Recommends anonymization + `noindex` + Dependabot
  fix + permanent-private repo + GitHub 2FA. Explicitly preserves the
  "no auth" PRD lock while raising data-side mitigations that stay in
  scope. Names the future-public-repo retroactive-disclosure risk.
- **`integration.md`** — the bead graph (B0…B10 + optional B11),
  ordering rationale, file-touch enumeration, repo-pattern alignment,
  pivot mechanics handoff details, and explicit dispositions for all
  11 PRD-review plan-phase concerns.

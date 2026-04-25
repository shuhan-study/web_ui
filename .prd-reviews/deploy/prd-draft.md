# PRD: Deploy — web_ui live on Vercel

_Draft. Breadth over depth. Decisions already locked in `PLAN.md` are
treated as fixed; this PRD does not re-open them. Uncertainty is
flagged in Open Questions for the review phase to chew on._

---

## Problem Statement

`web_ui` is a feature-complete, read-only Next 16 / React 19 / Prisma 5
/ SQLite grades dashboard for a single student (Shuhan, ~age 11). After
five development phases plus the modernization sweep
(`v0.6-modernization-complete`), the app runs correctly on
`localhost:3000` but has never been deployed. Shuhan cannot open it
without her father (Rongjun) running `npm run dev`, which means the
app is effectively unusable for its intended purpose: a thing she can
glance at from any device.

Three small, pre-identified correctness gaps will be the first thing a
real user sees the moment the app is live:

1. There is **no `Grades` link in the Navbar** — once you click into
   `/about` or a subject page, there is no in-app way back to the
   grade list.
2. **Root `/` is the default Next.js placeholder** — opening the
   bookmarked URL lands on a near-empty page instead of grades.
3. **Subject subtitles render a stale grade letter / percent** when a
   subject's assignments list is empty, because the subtitle is read
   from a stored summary rather than computed from the live
   assignment list.

**For whom:** Shuhan (sole user), with Rongjun as the maintainer who
reseeds data each week from her school portal.

**Why now:** Modernization closed with the rig "sturdy enough to
deploy." Every plausible follow-on (real Aeries integration, parent
visibility, richer reporting) presupposes a stable live URL. Deploy
is the bottleneck on all of it. There is also a soft deadline of end
of Trimester 3 (2026-05-30) so Shuhan can track her final grades
live.

---

## Goals

1. **Live URL.** `web_ui` resolves to a working public URL on Vercel
   (default `*.vercel.app` is sufficient — custom domain is out of
   scope). Shuhan can open it on her phone without anyone running
   `npm run dev`.

2. **Fresh data on every load.** `/grades` and `/subject/[id]` reflect
   the current contents of the bundled SQLite file at request time, not
   a build-time snapshot. Achieved by `export const dynamic =
   'force-dynamic'` on those route segments. (Option C explicitly
   accepts that "fresh" means "since the last `git push`" — see
   Constraints.)

3. **Reseed → live in one cycle.** Updating `data/seed/grades.json`,
   running `npm run seed`, committing the regenerated `dev.db`, and
   pushing to `main` results in the live URL reflecting the new data
   after Vercel's automatic redeploy completes — verified end-to-end
   at least once before tagging release.

4. **Navbar `Grades` link present and working.** Visible from every
   page that renders the Navbar; clicking it lands on `/grades`.

5. **Root `/` redirects to `/grades`.** No blank Next placeholder is
   user-reachable.

6. **Empty-assignments zero-state.** Subject pages whose `assignments`
   list is empty render `"No assignments yet"` (or equivalent) in
   place of the stale grade letter / percent subtitle. Subject pages
   that *do* have assignments are unchanged.

7. **Smoke-verifiable on the live URL.** The release smoke checklist
   (`/grades`, `/subject/[id]`, `/about`, styled 404, reseed-and-
   redeploy) passes against the production URL.

8. **Tagged release.** `v0.7-deploy-complete` cut on `main` once the
   above are all true.

---

## Non-Goals

Inherited verbatim from `PLAN.md` "Out" list, plus a few clarifying
expansions:

- **No DB platform change.** Postgres / Neon / Supabase / Railway
  migration is explicitly deferred. Option C is locked. (See Open
  Question #1 for the *pivot trigger*.)
- **No custom domain.** Default `*.vercel.app` is "landed."
- **No authentication.** Single user, private repo, public read-only
  app.
- **No mobile drawer / nav redesign.** Two-or-three-item nav stays as
  responsive stacking.
- **No remote error reporting** (Sentry, Axiom).
- **No test infrastructure.** Still deferred (no test suite added in
  this project).
- **No Tailwind 3 → 4.** Deferred to Modernization v2 (`wu-sjk`).
- **No new pages, no schema changes, no new data model fields.**
- **No bundle / performance audit.** 87.3 KB shared First Load JS is
  acceptable.
- **No Aeries / school-system integration.** Demo seed data continues.
- **No mid-session writes.** App stays read-only at runtime; all data
  changes happen offline (reseed → commit → redeploy).

---

## User Stories / Scenarios

**S1 — Shuhan opens the bookmarked URL on her phone.**
1. Taps bookmark → loads `*.vercel.app/`.
2. `/` redirects to `/grades`.
3. Sees current-term subjects with grade letters / percentages.
4. Taps a subject card → `/subject/<id>` → assignment list.
5. Taps `Grades` in Navbar → back to `/grades`.

**S2 — Rongjun reseeds data after Shuhan's school updates her grades.**
1. Edits `data/seed/grades.json`.
2. Runs `npm run seed` locally → `web/prisma/dev.db` updates.
3. `git add web/prisma/dev.db data/seed/grades.json && git commit && git push`.
4. Vercel detects the push, redeploys, ~1–3 min later the live URL
   shows the new data.
5. Shuhan reloads in the browser → fresh grades appear.

**S3 — Shuhan opens `/about`.**
1. Taps About in Navbar → reads brief description.
2. Taps Grades in Navbar → returns to grade list.

**S4 — Shuhan follows a stale bookmark to a removed subject.**
1. Taps bookmark for `/subject/<old-id>` → styled 404 (already shipped
   from `wu-vn5`), not a blank error page.

**S5 — Shuhan opens a subject that has no assignments yet
(start-of-term).**
1. Subject card on `/grades` shows the subject name only (no stale
   letter — see goal #6).
2. Tapping in → `/subject/<id>` shows the zero-state subtitle and an
   empty assignments list.

**S6 (negative) — Shuhan opens the live URL while Rongjun is
mid-reseed-but-hasn't-pushed.**
1. Live URL shows the *previous* grades (last pushed `dev.db`). This
   is acceptable under Option C and is why "fresh" is defined as "as
   of last push" in goal #2.

---

## Constraints

**Stack (from `notes/deploy-2026-04-24/survey.md`):**
- Next 16.2.4 (Turbopack), React 19.2.5, Tailwind 3.4.1, Prisma
  5.22.0.
- Node engine ≥ 20.9.
- `DATABASE_URL = file:./dev.db` (SQLite).
- `next.config.mjs` is currently empty — no redirects, no custom
  settings yet.
- App lives in the `web/` subdirectory; **Vercel Project Root
  Directory must be `web`** or builds will fail.

**Locked decisions (do NOT relitigate, per `wu-avk`):**
- **DB: Option C** — `dev.db` committed to the repo, bundled
  read-only into the Vercel build, redeploy on every reseed.
  - Pivot trigger: if Prisma + SQLite proves flaky on Vercel
    serverless (see Open Question #1), fall back to **Option B**
    (Postgres on Neon). This is the only acceptable pivot; Option A
    (Railway / Render with persistent disk) is out.
- **Root `/` → redirect to `/grades`** (not a landing card).
- **Stale subtitle → zero-state** (`"No assignments yet"`), not "fix
  the stored value" or "accept as-is."

**Technical correctness:**
- `/grades` and `/subject/[id]` are currently SSG (`○ Static`). They
  must be flipped to dynamic *before or alongside* the first deploy,
  or the live page serves the build-time snapshot forever and goal
  #2 silently fails.
- Prisma version stays pinned at 5.22.0; no version drift introduced
  by this project.
- The `web/.gitignore` currently un-ignores `/prisma/dev.db` on
  Rongjun's local working tree (stashed by full_stack as `wu-avk
  pre-pull: un-ignore dev.db edit`). The deploy implementation bead
  is the right place to land that change *together* with committing
  `dev.db` itself.
- Vercel's serverless filesystem is read-only; the bundled `dev.db`
  must be opened in read-only mode (or Prisma must never attempt to
  write to it during request handling). This needs verification —
  see Open Question #2.

**Process / resource:**
- Solo maintainer (Rongjun) on a school-schedule cadence.
- Two human gates in Path B (`mol-idea-to-plan`): clarification after
  PRD review, approval after plan review.
- Soft deadline: before end of Trimester 3 (2026-05-30).
- One non-blocking surfaced blocker from `wu-avk`: GitHub Dependabot
  reports 1 moderate vulnerability on `shuhan-study/web_ui`. Pick up
  as a small bead during implementation; not gating Deploy.

**Out-of-band hazard (from survey):**
- Mayor worktree at `/Users/rfvitis/gt-personal/web_ui/mayor/rig/`
  has ~100 files staged-as-deletion. If mayor wakes and pushes from
  that state, it wipes the repo on GitHub. Anything that triggers a
  mayor commit/push from that worktree before mayor cleans it up is a
  Deploy-blocking incident. Out of this project's scope to fix, but
  in scope to *not trigger.*

---

## Open Questions

The PRD review phase will surface more. Known unknowns at draft time:

1. **Does Prisma + read-only SQLite actually work on Vercel
   serverless?** Option C assumes it does. If the Vercel build
   bundles `dev.db` into the deployment artifact and Prisma can open
   it via `file:./dev.db` at request time without ever attempting a
   write, we are fine. If Prisma's startup or query path tries to
   open the SQLite journal in read-write mode, requests will fail at
   runtime. Needs an empirical probe early in implementation; if it
   fails, pivot to Option B (Neon Postgres).

2. **What is the right `DATABASE_URL` on Vercel?** Locally it is
   `file:./dev.db` relative to `web/`. On Vercel the working
   directory at runtime is not the repo root. Options:
   - Keep `file:./dev.db` and rely on Vercel preserving the relative
     layout — confirm this works.
   - Switch to an absolute path resolved at build time
     (`file:/var/task/web/prisma/dev.db` or similar).
   - Use a `DATABASE_URL` environment variable in Vercel's project
     settings that resolves correctly in the serverless runtime.
   This is a small but real configuration question.

3. **How do we trigger the redeploy on reseed?** Vercel's GitHub
   integration auto-deploys on push to `main`. If `dev.db` is part
   of the commit, this is automatic. Confirm: does Vercel rebuild
   even when the only changed files are SQLite binaries (which are
   technically not source)? It should, but worth verifying.

4. **Where does the redirect for `/` live?** Two natural options:
   - `app/page.tsx` calling `redirect('/grades')` — RSC-friendly,
     two lines of code.
   - `next.config.mjs` `redirects()` entry — config-level, separates
     routing from app code.
   Default to the `app/page.tsx` variant unless the review surfaces
   a reason otherwise. Either is small.

5. **Is `Grades` the right Navbar label?** The existing nav has
   `About`. `Grades` is the most obvious second item, but should we
   also confirm with the overseer that the *order* is `Grades | About`
   (not `About | Grades`)? Probably yes — `Grades` is the primary
   destination. Trivial, but flagging.

6. **Smoke automation vs. manual smoke?** PLAN.md's completion
   criteria require a manual smoke pass. Should the smoke checklist
   be a checked-in Markdown file like
   `notes/modernization-smoke.md` (which already exists for the
   prior project), or just a checklist in the deploy bead? Default:
   committed Markdown, mirroring the modernization pattern.

7. **Vercel project ownership / GitHub link.** `wu-avk` flags this
   as "prerequisite, not blocking — first bead can include it." Is
   the Vercel account already created and linked to the GitHub repo,
   or is account creation also part of this project? Affects the
   first implementation bead.

8. **Dependabot moderate vulnerability — fix in this project or
   defer?** Surfaced by `wu-avk` as non-blocking. If the fix is a
   one-line dependency bump it is cheaper to fold in than to track
   separately. If it pulls in a major-version drift, defer.

---

## Rough Approach

Not a plan — just the shape we expect the plan phase to harden.

**Phase ordering (tentative, the plan phase will refine):**

1. **Probe Option C feasibility (gate before everything else).**
   Locally, build the Next app in production mode, confirm Prisma can
   read from a read-only `dev.db` bundled into `.next/`. If this is
   green, proceed. If red, escalate to overseer with the Option B
   pivot proposal *before* writing implementation beads.

2. **Land the un-ignore of `web/prisma/dev.db` + commit `dev.db`.**
   Single bead. This is the Option-C plumbing point that
   `notes/deploy-2026-04-24/survey.md` flags as the "right place" for
   the stashed `.gitignore` edit.

3. **Add `force-dynamic` on `/grades` and `/subject/[id]`.** Two
   one-line edits. Small bead. Independently mergeable, but ordered
   before the first deploy so the first live `/grades` does not
   serve a static snapshot.

4. **Three correctness fixes in parallel-able beads:**
   - Add `Grades` Navbar link.
   - Root `/` redirect to `/grades`.
   - Empty-assignments zero-state subtitle.

5. **Vercel project setup.** Connect GitHub, set Root Directory to
   `web`, configure `DATABASE_URL` env var (per Open Question #2),
   trigger first deploy, capture the URL.

6. **Live-URL smoke pass.** Walk the smoke checklist (`/grades`,
   `/subject/[id]`, `/about`, 404). Then perform a reseed-and-
   redeploy cycle end-to-end and verify the live URL reflects the
   change.

7. **Tag `v0.7-deploy-complete` on `main`.**

**What we are explicitly NOT shaping in this approach:**
- No new pages, components, or schema changes.
- No CI/CD work — Vercel's GitHub integration is the entire pipeline.
- No test scaffolding.
- No domain / DNS work.
- No mayor-worktree cleanup (out of scope; flag only).

**Risk shape:**
- The single non-trivial unknown is Open Question #1 (Prisma + Vercel
  + read-only SQLite). Everything else is small, well-understood
  edits.
- If Option C fails the probe, the project is materially larger
  (Option B = Postgres migration + Neon provisioning + schema sync +
  re-seed strategy). Worth surfacing this as the project's primary
  risk in the plan-review phase.

---

*Draft authored 2026-04-24 by polecat `web_ui/polecats/furiosa`
(`wu-wfs-rpmqi`). Inputs: `PLAN.md`, `notes/deploy-2026-04-24/
survey.md`, `archive/prd-reviews/p6-deploy-discarded-draft.md`
(seed framing), and the wu-avk dispatch instructions.*

# Project: Deploy

_Opened 2026-04-24 after `v0.6-modernization-complete`._

## North star

Get `web_ui` to a public URL on Vercel so Shuhan can open her grades from
any device without `npm run dev` running. Make the deployed app reflect
current seed data on every page load. Fix a small set of pre-identified
correctness gaps (navbar link, root `/`, stale subtitle) along the way.
Narrow project — deploy the existing app, not deploy + reshape.

## Problem statement (for Path B intake)

> Deploy `web_ui` (a read-only Next 16 / React 19 / Prisma 5 / SQLite
> grades dashboard for one student) to Vercel. The deployed `/grades`
> page must reflect current seed data — pair `force-dynamic` on data-
> reading routes with a Vercel redeploy on every reseed (the SQLite
> file is committed to the repo and bundled read-only at build).
> Add the missing `Grades` navbar link, redirect `/` to `/grades`,
> and resolve the stale subject subtitle by rendering a "No assignments
> yet" zero-state when the assignments list is empty. Verify the live
> URL renders `/grades`, `/subject/[id]`, `/about`, and the styled 404
> after a deploy and after a reseed-and-redeploy cycle. No DB platform
> change, no auth, no new pages, no custom domain.

The intake polecat should treat the **DB-on-Vercel decision (Option C:
read-only SQLite, committed and bundled, redeploy on reseed)** as
locked. See decision log below.

## Scope

**In:**
- Vercel project setup (GitHub-connected, Root Directory = `web`)
- Option C database approach: commit `dev.db`, bundle read-only, redeploy on reseed
- `export const dynamic = 'force-dynamic'` on `/grades` and `/subject/[id]`
- Grades navbar link
- Root `/` redirect → `/grades`
- Stale subject subtitle: zero-state ("No assignments yet")
- Smoke verification of live URL: `/grades`, `/subject/[id]`, `/about`, 404, reseed-redeploy

**Out:**
- Postgres / Neon / Supabase migration (separate future project if mid-session DB writes are ever needed)
- Custom domain (default `*.vercel.app` is fine for "landed")
- Authentication
- Mobile drawer / additional navbar items
- Remote error reporting (Sentry, Axiom)
- Test infrastructure (still deferred)
- Tailwind 3 → 4 (still deferred to "Modernization v2")

## Methodology

**Path B** — `gt formula run mol-idea-to-plan --rig web_ui`.

The discarded P6 deploy PRD at
`archive/prd-reviews/p6-deploy-discarded-draft.md` is the **seed PRD**
for the intake polecat — it identified the same gaps and surfaced the
DB decision; only the DB-platform options need to be replaced with
Option C as the locked choice. This `PLAN.md` is the north-star input;
Path B produces the execution detail.

## Completion

Git tag `v0.7-deploy-complete` on `main` when:
- `web_ui` resolves to a working public URL on Vercel.
- `/grades`, `/subject/[id]`, `/about`, and the 404 page all render at the live URL.
- A reseed-and-redeploy cycle is verified end-to-end (update `grades.json` → `npm run seed` → commit `dev.db` → push → live URL reflects).
- Navbar shows `Grades` link from every page.
- Root `/` redirects to `/grades`.
- Subject pages with empty assignments show the zero-state subtitle.

## Artifacts

Filled in by Path B once the pipeline runs.

- **PRD draft:** _(intake step output, seeded from discarded P6 draft)_
- **PRD review synthesis:** _(prd-review step output)_
- **Design doc:** _(generate-plan step output)_
- **Beads:** _(create-beads step output)_
- **Session log:** `archive/sessions/2026-04-24-deploy-kickoff.md`

## Decision log

### 2026-04-24 — DB platform locked: Option C (SQLite committed, bundled, redeploy on reseed)

**Decision:** Read-only SQLite, `dev.db` committed to the repo, bundled
into the Vercel build. Reseeds happen at the JSON level, regenerate
`dev.db` locally via `npm run seed`, commit, push — Vercel auto-redeploys.

**Why:**
1. Narrow scope. Option B (Postgres) is its own project; introducing it now expands Deploy into a DB-migration project.
2. Architectural fit. The app reads, never writes at runtime — Option B's main benefit (live mutation) isn't earned.
3. Workflow fit. Edit `grades.json` → run seed → push. Vercel redeploys in ~1 min. That IS the reseed flow.
4. Pivot remains open. If Prisma + SQLite on Vercel turns out flaky during execution, we can switch to Option B incrementally without re-architecting the app.

**What's not free:**
- Build bundle grows with the SQLite file (negligible at this data scale).
- No mid-session updates — every reseed is a small redeploy.
- Prisma + SQLite on Vercel serverless is a known-but-not-loved setup; needs verification during the deploy bead.
- **Pivot trigger:** if Prisma engine bundling fails on Vercel after reasonable troubleshooting, switch to Option B (Postgres on Neon).

**Carve-outs (added 2026-04-25 from wu-avk human-clarify gate):**
- **Pivot mechanics:** if Option C probe fails, **stop Deploy, file P0 bead "Switch to Option B" as the next overseer decision, resume Deploy after Postgres Migration lands.** Do NOT inline the migration into Deploy.
- **Prisma version bump under the Option C lock:** allowed for Prisma 5.x patch/minor IF it directly resolves a probe failure, with documented evidence in the probe bead. Rejected for 6.x major (that's Modernization v2 territory).

### 2026-04-24 — Root `/` behavior: redirect to `/grades`

**Decision:** Root `/` redirects to `/grades`. Not a landing page.

**Why:** Narrow scope. Single user opens the app to see grades — anything between the URL and the grades is friction. A landing page is its own design exercise; defer to a future polish project if ever needed.

### 2026-04-24 — Stale subtitle: zero-state ("No assignments yet")

**Decision:** When a subject has zero assignments, render a zero-state subtitle ("No assignments yet") instead of computing or hiding the stored grade/percent.

**Why:** Honest UI. The stored grade is technically correct but visually misleading when there's no underlying assignment data. A zero-state is unambiguous and matches the empty-state pattern already established in P5.

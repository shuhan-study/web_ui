# PRD: P6 — Deploy and Complete

## Problem Statement

Shuhan's grade tracker has passed five phases of development and is feature-complete for its
initial scope. P5 shipped the final polish layer (error boundaries, loading skeletons, empty
states, About page). The app now runs correctly locally but has never been deployed — Shuhan
cannot use it. There are also three small correctness gaps that will be visible to real users
the first time they open it.

**For whom:** Shuhan Geng (sole user, age ~11), with her father (Rongjun) as the maintainer.

**Why now:** P5 explicitly closed with "the rig is now sturdy enough to deploy." Every subsequent
phase of real use (real data pipeline, parent visibility, richer reporting) requires a live URL
as its foundation.

---

## Goals

1. The app is live at a stable public URL (Vercel or equivalent), accessible without running
   `npm run dev`.
2. `/grades` reflects current data on every page load — not a build-time snapshot.
3. The Navbar has a working `Grades` link so users can navigate from any page to the grade list.
4. The root `/` page either shows useful content or redirects to `/grades`; it is not a blank
   Next.js placeholder.
5. Stale subject subtitle (grade/percent when assignments list is empty) is resolved or
   explicitly accepted.

---

## Non-Goals

- Real Aeries / school-system integration — still deferred; demo seed data continues.
- Authentication / login — single-user, private repo, no login needed this phase.
- Multi-student support.
- Mobile-drawer nav — current responsive stacking is fine for 2–3 nav items.
- Remote error reporting (Sentry/Axiom) — deferred until real users hit real errors.
- Shared `<Skeleton>` component extraction — deferred until third consumer.
- `global-error.tsx` — deferred (low priority, covers only root layout errors).
- Any new data model fields or schema changes.
- Performance optimization / bundle size audit (87.3 KB shared First Load JS is fine today).

---

## User Stories / Scenarios

**Shuhan opens the app from her phone (primary flow):**
1. Clicks a bookmarked URL → lands on `/grades` (or is redirected there from `/`).
2. Sees all current-term subjects with grade letters and percentages.
3. Taps a subject card → lands on `/subject/math_6_advanced` → sees assignment list.
4. Navigates back via Navbar "Grades" link.

**Rongjun reseeds the DB with new term data:**
1. Updates `data/seed/grades.json` and runs `npm run seed`.
2. Shuhan reloads her browser → sees updated data without a redeploy.
   *(Requires `force-dynamic` on the `/grades` route — see Constraints.)*

**Shuhan opens `/about`:**
1. Clicks About in Navbar → sees a brief description of what the app is.
2. Clicks "Grades" link in Navbar → returns to grade list.

**Shuhan follows a bookmark to a subject that no longer exists:**
1. Gets the styled 404 page (already ships from wu-vn5) — not a blank error.

---

## Constraints

**Technical:**
- **`/grades` is currently `○ Static`** (pre-rendered at build, frozen at deploy). Adding
  `export const dynamic = 'force-dynamic'` on the `/grades` and `/subject/[id]` route
  segments is mandatory before or alongside deployment; without it, the deployed page
  serves build-time data forever.
- **SQLite as the DB** — Vercel's serverless runtime does not support SQLite with write access
  because the filesystem is read-only. Options:
  - (A) Keep SQLite, deploy to a platform with persistent disk (Railway, Render, Fly.io).
  - (B) Migrate the Prisma datasource to a hosted Postgres (Neon, Supabase, PlanetScale free
    tier) — larger change, but Vercel-compatible.
  - (C) Treat the DB as read-only at runtime, rebuild on every seed update (serverless-safe
    if data never changes mid-session). Easiest path; accepted if Rongjun manually triggers
    redeploys after reseed.
  - This is the single most consequential technical decision for P6. Decision needed before
    deployment bead is written.
- **Prisma version** — no dependency changes through P5. P6 must not introduce version drift.
  If migrating to Postgres, use `@prisma/adapter-neon` or equivalent compatible with the
  current Prisma version already installed.
- **No Clerk, no Stripe** — confirmed excluded from all phases.

**Timeline / resource:**
- Solo maintainer (Rongjun) on a school-schedule cadence.
- No hard deadline, but "before end of Trimester 3" (2026-05-30) is the natural target so
  Shuhan can track her final grades live.

---

## Open Questions

1. **DB platform choice** — Which option (A/B/C above)? This gates the deployment bead.
   - If (A): which platform? Railway is simplest for SQLite with volume.
   - If (B): which hosted Postgres? Neon (generous free tier, Vercel-native) is the natural
     pick but requires migration work.
   - If (C): acceptable for a low-update-frequency app; Rongjun triggers redeploy after
     each seed update.

2. **Root `/` behavior** — Redirect to `/grades`, or build a simple landing page?
   - Redirect: 2-line change (`next.config.js` redirect or `page.tsx` with `redirect()`).
   - Landing: small "Welcome, Shuhan" card with a Grades button — more personal, slightly
     more work.

3. **Stale subtitle fix direction** — Which approach for zero-assignment subject subtitle?
   - (a) Compute live from `assignments` at query time (ignore stored `currentGrade`/
     `currentPercent` when list is empty).
   - (b) Render a zero-state subtitle variant ("No assignments yet").
   - (c) Accept as-is — the data is technically correct (it's the seeded grade); the
     discrepancy only appears when someone deletes assignments in isolation.

4. **Custom domain?** — `shuhan-grades.vercel.app` vs a real domain (e.g., `grades.shuhan.app`).
   Low priority; ignore for P6 unless trivial via Vercel dashboard.

5. **Seed-on-deploy vs seed-as-data** — Should the seed step run as part of the build/deploy
   pipeline, or is the SQLite file committed to the repo (if option C)?

---

## Rough Approach

**Ordering (tentative):**

1. **Decide DB platform** (human decision, gates everything else).

2. **Add `force-dynamic`** to `/grades` and `/subject/[id]` — small, safe, merge-able
   independently of platform decision.

3. **Add Grades navbar link** — one `<NavLink>` call; wu-tay is already filed.

4. **Fix root `/`** — redirect or simple landing; small bead.

5. **Stale subtitle** — fix whichever approach is chosen; small bead.

6. **Deploy** — depends on platform decision.
   - If SQLite/Railway: provision Railway service, set env vars, configure deploy.
   - If Postgres/Neon: migrate datasource, update schema, migrate data, deploy to Vercel.
   - If SQLite/Vercel readonly: commit DB file or build step, configure `vercel.json`.

7. **Smoke test live URL** — verify `/grades`, `/subject/[id]`, `/about`, 404 behavior
   all work at the live URL.

**What P6 does NOT include:**
- Any new page or data model.
- Test infrastructure (still no test suite; deferred).
- CI/CD pipeline changes (Vercel's GitHub integration handles deploys automatically).

---

*Draft written from P5 retrospective + PLAN.md carry-forwards. DB platform decision is the
blocking unknown; all other items are small and can be paralleled once the deploy target is set.*

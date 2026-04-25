# PRD-Align Round 3 — User-Stories Coverage Check

_Date: 2026-04-25 · Reviewer: web_ui/polecats/capable · Bead: wu-3e2._

Plan reviewed: `.designs/deploy/design-doc.md` (post round 1 + round 2 fixes).
PRD: `.prd-reviews/deploy/prd-draft.md` (incl. "Clarifications from Human Review").
Scope: walk every USER STORY and SCENARIO in the PRD, trace the
end-to-end user journey through the plan, verify every step is covered.

This is review-only — no plan edits made.

---

## Scope: 6 PRD scenarios

S1 (bookmark happy path), S2 (reseed cycle), S3 (/about navigation),
S4 (stale bookmark to removed subject), S5 (empty-assignments
zero-state), S6 (negative — mid-reseed staleness).

---

## COVERED

### S1 — Shuhan opens the bookmarked URL on her phone

| PRD step | Plan task |
|---|---|
| 1. Taps bookmark → loads `*.vercel.app/` | **B8** — Vercel project setup, GitHub link, Root Directory `web`, deploy on push to `main`, capture URL into bead notes + smoke doc header |
| 2. `/` redirects to `/grades` | **B5** — replace `web/app/page.tsx` body with `redirect('/grades')` from `next/navigation` |
| 3. Sees current-term subjects with grade letters / percentages | **B2** (commits `dev.db`) + **B3** (`force-dynamic` on `/grades` so route reads bundled `dev.db` at request time, not SSG snapshot) |
| 4. Taps a subject card → `/subject/<id>` → assignment list | **B3** (`force-dynamic` on `/subject/[id]`); existing `SubjectCard` link to `/subject/<id>` is preserved (B6 only modifies the empty-state subtitle, not the link) |
| 5. Taps `Grades` in Navbar → back to `/grades` | **B4** — `<NavLink href="/grades">Grades</NavLink>` ordered before About; ordering is `Grades \| About \| DarkMode` |

End-to-end runtime verification: **B9** smoke walks `/grades` and
`/subject/[id]` on the production URL.

### S2 — Rongjun reseeds data after Shuhan's school updates her grades

| PRD step | Plan task |
|---|---|
| 1. Edits `data/seed/grades.json` | Existing flow; no plan task required (file path preserved at repo-root `data/seed/grades.json`; `web/package.json`'s reseed script git-adds `../data/seed/grades.json`) |
| 2. Runs `npm run seed` locally → `web/prisma/dev.db` updates | Existing `npm run seed` script preserved (no plan task removes it). Plan additionally adds `npm run reseed` ergonomics wrapper (Decisions Made; R6 mitigation) — does not break the PRD-named flow |
| 3. `git add web/prisma/dev.db data/seed/grades.json && git commit && git push` | **B2** un-ignores `web/prisma/dev.db` (plus stashed `wu-avk pre-pull` un-ignore edit landed atomically) so subsequent `git add` + commit work; `data/seed/grades.json` is already tracked |
| 4. Vercel detects push, redeploys, ~1–3 min later live URL shows new data | **B8** — Vercel GitHub integration auto-deploys on every push to `main`; `force-dynamic` (B3) ensures the redeploy actually changes what is served |
| 5. Shuhan reloads → fresh grades appear | **B3** verbatim acceptance: "Each request to `/grades` and `/subject/[id]` reads from bundled `dev.db` shipped with the most recent successful deploy. No build-time SSG snapshot, no per-request caching beyond standard browser/CDN behavior." |

End-to-end runtime verification: **B9** explicitly performs a reseed
cycle end-to-end and stamps `notes/deploy-2026-04-25/smoke.md` with
`reseed cycle: ✅ <date>` per PRD Q4.

### S3 — Shuhan opens `/about`

| PRD step | Plan task |
|---|---|
| 1. Taps About in Navbar → reads brief description | Existing About link preserved; navbar order per B4 is `Grades \| About \| DarkMode`; `web/app/about/page.tsx` is in "Files explicitly NOT touched" (design §Key Components) |
| 2. Taps Grades in Navbar → returns to grade list | **B4** — `Grades` link added before About; design lifts PRD goal #4 verbatim ("Visible from every page that renders the Navbar"), so visibility from `/about` is structurally guaranteed |

### S4 — Shuhan follows a stale bookmark to a removed subject

| PRD step | Plan task |
|---|---|
| 1. Taps bookmark for `/subject/<old-id>` → styled 404 | Already shipped in `wu-vn5`; `web/app/not-found.tsx` is in "Files explicitly NOT touched". B3's `force-dynamic` addition to `web/app/subject/[id]/page.tsx` does not interfere with the existing `notFound()` trigger (force-dynamic and notFound() are orthogonal Next features) |

End-to-end runtime verification: **B9** smoke explicitly walks "404"
on the production URL per PRD goal #7's parenthetical.

### S5 — Shuhan opens a subject that has no assignments yet (start-of-term)

| PRD step | Plan task |
|---|---|
| 1. Subject card on `/grades` shows the subject name only (no stale letter) | **B6** — "Suppress stale grade letter on `SubjectCard` when no assignments." Adds `hasAssignments: boolean` projection to `fetchAllSubjects` (design §Decisions Made; query-result projection, NOT a stored data-model field, so non-goal "no new data model fields" is preserved per round-2 review) |
| 2. Tapping in → `/subject/<id>` shows zero-state subtitle and an empty assignments list | **B6** — "render `'No assignments yet'` on the subject-detail header." Plan covers BOTH surfaces (card + subject-detail), which exceeds PRD goal #6's narrow "subject pages" wording but matches scenario S5 step 1's card-side requirement |

### S6 (negative) — Shuhan opens the live URL while Rongjun is mid-reseed-but-hasn't-pushed

| PRD step | Plan task |
|---|---|
| 1. Live URL shows the *previous* grades (last pushed `dev.db`); acceptable under Option C | **B3** verbatim acceptance criterion: "Freshness ≠ real-time; staleness is bounded by deploy cadence." Mechanic: Option C bundles `dev.db` at build time; without a `git push`, Vercel does not redeploy, so the live URL serves the previous build's `dev.db`. Architecturally inevitable from B1+B2+B3+B8 — no separate task required |

This is a *negative* scenario describing *acceptable* behavior; the
absence of a redeploy trigger is what produces it. Verifying it would
require explicitly *not pushing* during a smoke run, which isn't a
useful test. PRD itself does not request it in goal #7's smoke list.
COVERED by architectural inevitability + B3's verbatim acceptance.

---

## GAP

**None.** Every step in S1–S6 maps to a concrete plan task or to a
preserved existing-app behavior the plan explicitly does not touch.

---

## PARTIAL

**None must-fix or should-fix.**

One observation worth surfacing (logged for completeness, not a
should-fix):

### Observation O-1: B9 smoke contents not pre-specified at design time

B9's acceptance is "Walk smoke checklist on production URL" with the
checklist itself defined later in `notes/deploy-2026-04-25/smoke.md`
(authored by B9's polecat). The PRD's goal #7 parenthetical lists 5
items: `/grades`, `/subject/[id]`, `/about`, styled 404, reseed-and-
redeploy.

Scenario steps that fall *outside* that narrow list and therefore are
not guaranteed to be smoke-verified at the live URL:
- S1 step 2 (root `/` redirect to `/grades`) — verified by code review
  + B5 acceptance, but goal #7 does not name `/` explicitly.
- S3 step 2 (Grades-from-/about navbar click) — covered by B4's
  visibility guarantee, but goal #7 names routes, not navbar
  interactions.
- S5 (empty-assignments rendering) — testable at implementation time
  in B6, but verifying at the live URL requires a subject with empty
  assignments in the bundled `dev.db`.

**Why this is observation, not partial:** The PRD itself defines goal
#7's smoke contents narrowly; the plan inheriting that narrow list is
faithful to the PRD. Each underlying mechanic (B5 redirect, B4 navbar,
B6 zero-state) is independently acceptance-tested at implementation
time. End-to-end *live-URL* verification is a smoke-doc design choice
that B9's polecat will make when authoring the checklist.

**If the overseer wants every scenario step verified end-to-end at the
live URL,** the simplest fix would be a one-line addition to B9's
description: *"Smoke checklist must walk all 6 PRD scenarios end-to-end
on the production URL, not only the routes named in PRD goal #7's
parenthetical."* Logged here so the option is visible at the
plan-approval gate; not flagging as should-fix because it expands the
PRD's own smoke definition.

---

## Carry-forward to plan-approval gate

No new items from this round. Round 1 and round 2 carry-forwards stand
unchanged:
- B10 tag-cut actor (round 1)
- Seed-data anonymization yes/no (round 2 strengthened)
- Three borderlines: `npm run reseed`, `robots.txt + noindex`,
  whichever way anonymization lands (round 2)
- Acknowledge R9 deadline as soft (round 2)

This round adds the *option* (not requirement) of:
- Expanding B9's smoke contents to walk all 6 PRD scenarios at the
  live URL (Observation O-1 above)

---

## Round 3 verdict

**0 gaps, 0 partials, 0 must-fix, 0 should-fix, 1 observation.**

Plan-vs-PRD user-stories alignment is **high**. Every scenario step in
S1–S6 maps to a concrete plan task or a preserved existing-app behavior
the plan explicitly does not touch. The plan exceeds PRD goal #6's
narrow "subject pages" wording by also handling the SubjectCard surface
(matches scenario S5 step 1 verbatim).

Combined with round 1 (requirements + goals) and round 2 (constraints
+ non-goals), the prd-align stack converges with **0 must-fix across
all three rounds** and only documented overseer-decisions remaining for
the plan-approval gate.

Recommend: proceed to plan-approval mail.

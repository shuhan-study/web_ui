# User Experience Analysis

## Summary

There are two users of this deploy: **Shuhan** (~age 11, sole end user, phone
bookmark, read-only glance once a day) and **Rongjun** (her father, weekly
reseed operator). Both UX surfaces are tiny and well-bounded — Shuhan touches
four routes (`/`, `/grades`, `/subject/[id]`, `/about`) plus the styled 404 and
the new `error.tsx`; Rongjun touches an edit-seed-push pipeline. The risk is
not "complex flows breaking" — there are no flows. The risk is **friction**:
extra hops, dead ends, kid-unfriendly copy, and stale-but-confident UI.

The four shipped fixes (root redirect, `Grades` navbar link, empty-assignments
zero-state, kid-readable `error.tsx`) collectively turn the live URL from
"technically deployed" into "Shuhan-can-actually-use." The recommendations
below are all small concrete copy and styling calls, plus one operator-UX
ask: a one-command `npm run reseed` script so Rongjun does not have to remember
the four-step pipeline each Sunday.

## Analysis

### Key Considerations

- **Shuhan is 11 and on a phone.** Every word the app shows must be readable
  by a kid. Browser back gestures are unreliable on mobile (accidental edge
  swipes back to a previous tab, not a previous page) — the navbar `Grades`
  link is the only durable in-app return path.
- **Read-only, single-user, glance-once-a-day.** No retry buttons, no error
  reporting, no preference UI, no auth state. Every interactive control we
  add is overhead with no payoff for the only user.
- **The bookmark IS the entry.** Shuhan does not type URLs; she taps a
  bookmark on her phone home screen. Whatever `/` does on cold start, she
  sees on every visit. PLAN.md locks `/` → `/grades` redirect; the UX point
  is to make the redirect feel like "loaded grades," not "bounced."
- **Stale data is invisible by default.** Under Option C, "fresh" means "as
  of last `git push`." Between Rongjun editing the JSON and pushing, Shuhan
  sees the previous numbers. There is no native signal of staleness — the
  PRD accepts this. The UX question is whether to *add* a signal.
- **The existing components set the consistency bar.** `not-found.tsx` is
  short, styled, has a single underlined back-link, no buttons. The new
  `error.tsx` should match that voice and weight (today's `error.tsx` has a
  `<Button>` "Try again" that's wrong for the audience and the failure
  mode).
- **The actual current state matters.** The existing `not-found.tsx` already
  links to `/grades`. The existing `EmptyState` component (one line of
  muted text) is the right primitive to reuse for the empty-assignments
  zero-state. The existing `NavLink` already does active-link styling
  (`text-foreground` vs `text-muted-foreground`). Most of this is wiring,
  not new design.

### Options Explored

#### Option 1: Bookmark target — `/` (with redirect) vs `/grades` (direct)

- **Description**: The PLAN locks the `/` → `/grades` redirect. The UX
  question is whether Rongjun should also bookmark `/grades` directly on
  Shuhan's phone to skip even the redirect hop.
- **Pros (bookmark `/grades`)**: One fewer round-trip; on a cold serverless
  start the difference is the cost of the 307 itself (~50–200 ms over LTE
  on top of the cold-start ~1–3 s). Bookmark survives if the redirect is
  ever removed.
- **Pros (bookmark `/`)**: Future-proof if a real landing page is ever
  added; matches what a sibling/relative typing the URL would experience.
- **Cons (bookmark `/grades`)**: Two URLs to remember if the bookmark is
  ever lost.
- **Effort**: Zero — this is a one-time bookmark choice, not a code change.
- **Recommendation**: Have Rongjun set Shuhan's phone bookmark directly to
  `/grades`. The `/` redirect remains as the safety net for any other
  entry path (typed URL, link in a future text message, etc.). Note this
  in `notes/deploy-smoke.md`.

#### Option 2: Navbar — order, contents, and active styling

- **Description**: Add `Grades` link to navbar. Two decisions: order and
  active-state.
- **Pros (`Grades | About` order)**: Primary destination first; matches
  reading order; matches the brand promise (this is a *grades* tracker).
- **Pros (active styling kept as-is)**: Already implemented in
  `NavLink.tsx` (current page = `text-foreground`, others =
  `text-muted-foreground`). Free orientation cue. No new code.
- **Cons**: None significant. The existing pattern is good enough.
- **Effort**: Single edit to `web/components/navbar/Navbar.tsx` — add one
  `<NavLink href='/grades'>Grades</NavLink>` before the existing About
  link.
- **Recommendation**: Order `Grades | About`. Keep active-link styling
  unchanged (it already works correctly via `usePathname()`). The Logo
  remains the secondary path home; the navbar `Grades` link is the
  primary path home.

#### Option 3: Empty-assignments zero-state copy

- **Description**: PLAN locks the wording family ("No assignments yet").
  Two surfaces need it: the subject detail subtitle, and the subject card
  on `/grades` which currently shows the stale grade letter and percent.
- **Subject detail page (`web/app/subject/[id]/page.tsx`)**:
  - Today: `{subject.teacher} · {subject.currentGrade} · {subject.currentPercent.toFixed(1)}%`
    even when `assignments.length === 0`.
  - Recommended: when `assignments.length === 0`, render the subtitle as
    `{subject.teacher} · No assignments yet`. Drop the grade letter and
    percent entirely (rendering `F · 0.0%` is the misleading status
    quo). Keep the existing `AssignmentsTable` empty rendering as-is.
  - Copy alternatives considered: "No assignments yet — check back after
    the next class" (longer, slightly warmer, but adds a
    soft-promise the app cannot keep — what if the next class is in a
    week?). "Nothing yet" (too terse, loses the noun). "No assignments
    yet" wins on the kid-readable + truthful + concise axis.
- **Subject card on `/grades` (`web/components/subjects/SubjectCard.tsx`)**:
  - Today: every card renders the big `{subject.currentGrade}` digit and
    `{subject.currentPercent}%`.
  - Recommended: when `subject.assignments.length === 0`, replace the
    grade-letter-and-percent block with a single muted line
    `No grades yet`. Keep the card title and teacher description so the
    card stays tappable and visually balanced with sibling cards. Do
    **not** hide the card.
  - Effort caveat: `SubjectCard` currently receives `Subject` from
    `@prisma/client`, not `Subject + assignments`. Either include an
    assignments count in `fetchAllSubjects` (smallest change: select
    `_count: { select: { assignments: true } }` on the query) or pass a
    separate `hasAssignments` boolean. Hand off the data-shape decision
    to the data dimension; UX recommendation is for the card to *visibly
    surrender* the grade letter rather than show `F · 0.0%`.
- **Effort**: Low for the subtitle (one ternary in `subject/[id]/page.tsx`),
  small-but-nonzero for the card (Prisma query tweak).
- **Recommendation**: Ship both. The card and the detail page must agree
  — having a card that confidently shows `A · 95.0%` for a subject whose
  detail page says "No assignments yet" is the worst of both worlds.

#### Option 4: `error.tsx` rewrite

- **Description**: PRD Q6 spec: kid-readable, no retry button, no error
  reporting, ~30 lines max, palette-consistent.
- **Current state** (`web/app/error.tsx`):
  - Heading `"Something went wrong"` — fine but generic.
  - Body `"An unexpected error occurred."` — too technical for an
    11-year-old.
  - `<Button onClick={reset}>Try again</Button>` — wrong for the failure
    mode. If Prisma-on-Vercel chokes on a request, hammering `reset`
    won't help; it just trains Shuhan to bash a button when sad.
- **Recommended copy**:
  - Heading: `"The grade tracker isn't working right now"` (tells her
    what the app is, tells her the state, no jargon).
  - Body: `"Your dad will fix it soon. Try again later."` (sets the
    expectation that a human is responsible, removes the implicit ask
    that *she* do something).
  - No button. A single muted underlined `<Link href="/grades">Back to
    grades</Link>` mirroring `not-found.tsx`. If grades is what's
    broken, the link round-trips and re-fires the error boundary —
    which is fine; it does not pretend the app is healthy.
- **Visual consistency**: match `not-found.tsx` exactly — same `h1`
  classes (`text-3xl font-semibold`), same muted body
  (`mt-2 text-sm text-muted-foreground`), same `mt-8` link block. No
  icon, no theme-specific styling. The styled-but-restrained 404 is the
  voice; copy this voice verbatim.
- **Keep `useEffect(console.error)`** so a browser-devtools-curious
  Rongjun can still see the underlying error during a debug session. No
  remote reporting per PRD.
- **Effort**: One file rewrite, ~25 lines.
- **Recommendation**: Ship as above. Drop `Button` import.

#### Option 5: Reseed staleness window — visible "last updated" or silent?

- **Description**: Should the app surface *when* the data was last
  refreshed (e.g., a footer "Updated 2026-04-22")?
- **Pros (visible timestamp)**: Honest. If Shuhan looks Sunday morning
  and sees "Updated last Friday" she knows new grades from the weekend
  haven't landed yet. Cheap to compute (build time or `git rev-parse
  HEAD` at build).
- **Cons**: Adds noise for an audience that does not need it. Shuhan is
  11 — "Updated 2026-04-22" reads as clutter. Worse, it invites the
  question "why isn't it newer?" which Shuhan cannot answer.
- **Cons of silence**: Shuhan trusts whatever's on screen. If Rongjun
  forgets a Sunday push, she sees a week-old A− and might conclude
  reality matches.
- **Effort (visible)**: Low — a `<footer>` in `layout.tsx` reading
  `process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,7)` or build-time `Date`.
- **Effort (silent)**: Zero.
- **Recommendation**: **Silent for Shuhan, visible for Rongjun.** Do not
  add a timestamp to the user-visible UI. *Do* add the build SHA / build
  time to the About page (Rongjun checks About when verifying a deploy
  landed). Concretely: append a small muted line to `app/about/page.tsx`
  reading `Last updated: {new Date(BUILD_TIME).toLocaleDateString()}`
  where `BUILD_TIME` is injected at build time. Shuhan sees About maybe
  twice a year; Rongjun reads it post-deploy. Best of both.

#### Option 6: Cold-start latency — accept or pre-warm?

- **Description**: Vercel serverless cold starts run ~1–3 s for a
  Next + Prisma route. For a once-a-day phone tap, is that acceptable?
- **Pros (accept)**: Loading spinner already exists
  (`web/app/grades/loading.tsx`, `web/app/subject/[id]/loading.tsx`).
  The user is a kid — she is not benchmarking. ~2 s feels normal on
  mobile.
- **Pros (pre-warm)**: A scheduled cron ping every 5 min would keep the
  Lambda warm. Faster perceived load.
- **Cons (pre-warm)**: Unnecessary engineering for one user. Vercel
  Hobby has cron limits. Adds ops surface.
- **Recommendation**: Accept. Add a single line to the smoke checklist:
  *"Cold tap — bookmark from a closed browser, time to first paint
  should be under 4 s on LTE."* If it ever exceeds that, revisit.

#### Option 7: 404 (S4) — verify post-deploy

- **Description**: `not-found.tsx` is already shipped from `wu-vn5`.
  Smoke checklist must verify it still triggers in production.
- **Recommendation**: One smoke step: visit
  `*.vercel.app/subject/does-not-exist`, confirm styled 404 + `Back to
  grades` link works. If it falls through to a Vercel-default 404, the
  routing is wrong.

#### Option 8: Mobile rendering smoke

- **Description**: PRD explicitly excludes mobile redesign, but a phone
  is the primary device. We need a quick visual confirmation that what
  ships does not break at narrow widths.
- **Recommendation**: Two smoke items:
  1. Open `*.vercel.app/grades` in Chrome DevTools "iPhone 14" preset
     (or just on Rongjun's phone). Confirm subject cards stack
     vertically, navbar wraps cleanly, no horizontal scroll.
  2. Open `*.vercel.app/subject/<id>` with multiple assignments.
     Confirm the assignments table either fits or scrolls horizontally
     within the container (no page-level horizontal scroll).
- This is a smoke item, not a redesign. If it fails, file a separate
  bead — do not block deploy on it.

#### Option 9: About page — does it need updating?

- **Description**: Current copy says "Grades are updated by family
  members from Aeries." Two issues: (a) it is no longer just localhost,
  (b) the maintenance model (reseed + redeploy) is invisible.
- **Recommendation**: Minimal edit. Keep the current three paragraphs,
  optionally replace "from Aeries" with "from her school portal." Do
  **not** explain Vercel, deploys, or the reseed cycle to Shuhan — she
  does not care. Optionally append a fourth paragraph for Rongjun's
  benefit only: a single muted line `Last updated: {build date}` (see
  Option 5).
- **Effort**: One copy tweak, optional one timestamp line.

#### Option 10: Maintainer (Rongjun) operator UX — discoverability

- **Description**: Rongjun's reseed flow today (per PRD S2) is:
  1. Edit `data/seed/grades.json`.
  2. `cd web && npm run seed`.
  3. `git add web/prisma/dev.db data/seed/grades.json`.
  4. `git commit -m "..."`.
  5. `git push`.
  6. Wait ~1–3 min for Vercel.
  7. Reload live URL.
  Six manual steps with two `cd`s and one git-add of a binary file. He
  does this weekly. Forgetting `git add web/prisma/dev.db` is the most
  likely failure (the `.gitignore` un-ignore lands in this project, but
  there's no enforcement that the binary actually gets staged).
- **Options**:
  - **(a) README only.** Document the steps in `notes/deploy-smoke.md`
    or top-level `README.md`. Cheap, but Rongjun must re-read each
    time.
  - **(b) `npm run reseed` script.** Add a script in
    `web/package.json` that chains `npm run seed && git add prisma/dev.db
    ../data/seed/grades.json && echo "Now: git commit -m '...' && git
    push"`. One command, prints the next two manual steps. Avoids the
    stage-the-binary footgun.
  - **(c) Full git automation.** Script also commits and pushes.
    Tempting, but hides the commit message and removes the human
    review step before publishing data. Rejected.
- **Recommendation**: **(b)**. Concretely, add to `web/package.json`
  scripts:
  ```json
  "reseed": "npm run seed && git add prisma/dev.db ../data/seed/grades.json && echo '\\n[reseed] Staged. Next: git commit -m \"reseed YYYY-MM-DD\" && git push'"
  ```
  Document in a new `notes/deploy-smoke.md` (per PRD Q4 "checked-in
  smoke checklist"). The smoke doc serves dual purpose: post-deploy
  verification *and* reseed runbook.

### Recommendation

Ship the four locked fixes plus the navbar reorder (Option 2), the
two-surface zero-state (Option 3), the rewritten `error.tsx` (Option 4),
the silent-for-kid + visible-for-dad timestamp (Option 5), the cold-start
acceptance (Option 6), the 404 + mobile smoke items (Options 7 + 8), the
minimal About copy tweak (Option 9), and the `npm run reseed` script
(Option 10b). Total UX-visible deltas in the deploy:

| Surface | Change | File |
|---|---|---|
| Bookmark | Phone bookmark → `/grades` directly | (manual, document in smoke) |
| `/` redirect | 307 → `/grades` | `app/page.tsx` (data dim) |
| Navbar | Add `Grades` link before About | `components/navbar/Navbar.tsx` |
| Subject card | Suppress letter + show "No grades yet" when empty | `components/subjects/SubjectCard.tsx` (+ data-dim query change) |
| Subject detail | Subtitle becomes "{teacher} · No assignments yet" when empty | `app/subject/[id]/page.tsx` |
| `error.tsx` | Kid-readable copy, drop button, add back-link | `app/error.tsx` |
| About | Optional "from her school portal" + build-date line | `app/about/page.tsx` |
| Reseed | `npm run reseed` chained command | `web/package.json` |

## Constraints Identified

- **Single user, single device class.** No A/B, no responsive redesign,
  no preference toggles, no analytics.
- **Read-only at runtime.** No buttons that mutate data; no retry that
  could mask a real failure.
- **Kid-readable copy.** No "An unexpected error occurred." No "500."
  No "Internal Server Error." No "Try again."
- **Existing visual language must not regress.** All new copy lives
  inside the existing `text-3xl font-semibold` / `text-sm
  text-muted-foreground` palette. No new icons, no new colors.
- **Bookmark-driven entry.** Whatever `/` does, it does on every visit
  — keep the redirect cheap.
- **Staleness is honest by deploy cadence.** No fake "real-time" cues.

## Open Questions

- **Does `SubjectCard` need an assignments count in its props?** The
  card currently receives `Subject` only; the empty-aware rendering
  needs at minimum a count. Cheapest path: extend `fetchAllSubjects` to
  return `{ ...subject, assignmentCount }`. Hand off to the data
  dimension.
- **Where does build-time get injected?** Two options for the About-page
  timestamp: (a) `process.env.VERCEL_GIT_COMMIT_SHA` + a Vercel-provided
  build-time env, (b) compile-time `Date.now()` baked into a constant.
  (a) is more honest; (b) survives off-Vercel. Default to (a). Hand off
  to the integration dimension.
- **Should the smoke checklist include a "Shuhan device" probe?** That
  is, does Rongjun load it on Shuhan's actual phone before tagging
  release, or just on his own phone? Recommend "Shuhan's actual phone
  once before tag, then his own phone for weekly reseed verification."
- **Should `/about` be added as a smoke route?** It will not regress
  from a deploy (no data, no Prisma), but if the build-date line lands,
  About becomes the post-deploy verification surface. Yes — add it to
  smoke.

## Integration Points

- **API dimension** — root redirect lives in `app/page.tsx`
  (`redirect('/grades')`); the `force-dynamic` segments determine
  whether the empty-assignments check actually runs at request time.
- **Data dimension** — `fetchAllSubjects` and `fetchSubjectById` need
  to return enough info for the empty-state rendering on both the card
  (count is sufficient) and the detail page (already returns
  `assignments`). Build-date timestamp source (Vercel env vs build
  constant) is a data-injection decision.
- **Integration dimension** — `notes/deploy-smoke.md` (the
  PRD-Q4-mandated checklist) is the artifact that owns the UX smoke
  items above (`/grades`, `/subject/<id>`, `/about`, 404,
  reseed-cycle, cold-tap latency, mobile-width visual). The
  `npm run reseed` script lives in `web/package.json` and is exercised
  by the reseed-cycle smoke item.

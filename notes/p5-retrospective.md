# P5 retrospective — Polish pass (error/loading/empty/about)

Four beads, one session, four commits, no reverts. P5 turned the
rig from "happy-path only" into a deploy-survivable surface.

## P5 shipped

| Bead    | Commit   | What                                                               |
|---------|----------|--------------------------------------------------------------------|
| wu-vn5  | 7172c08  | Root `not-found.tsx` (Server) + `error.tsx` (Client) — rig-styled  |
| wu-901  | 1067351  | `loading.tsx` skeletons for `/grades` and `/subject/[id]`          |
| wu-7p6  | 30fc834  | Friendly empty states for `/grades`, assignments table, breakdown  |
| wu-dte  | 647235f  | Static `/about` page + first text nav link (`NavLink` pattern)     |

Ship order (error → loading → empty → about) held through the whole
arc. It paid off: once `error.tsx` was in, every subsequent bead
could assume failures wouldn't blank the page; once `loading.tsx`
was in, every subsequent render test could distinguish "data still
fetching" from "data intentionally empty."

## What went well

- **Intent-first escort loop is fluent now.** Four beads ran the
  same shape: recon → write `notes/wu-XXX-intent.md` → overseer
  approves → execute → eyeball / curl-verify → `notes/wu-XXX-
  completion.md` → commit + push + `bd close`. No mid-bead
  revisions, no approach changes. The intent file stopped being
  overhead once I started treating it as the scratch-pad for
  my own mental model rather than a formality — "if I can't
  write it down clearly, I don't understand it yet."
- **curl + rendered-DOM inspection was a near-complete
  substitute for browser eyeball** on server-rendered content.
  Every bead verified the happy-path HTML via curl-grep of the
  rendered body (outside `<script>` tags); overseer eyeball
  was reserved for visual-only concerns (pulse sync in wu-901,
  active-state transition in wu-dte). The distinction between
  RSC script payload and rendered DOM is load-bearing —
  several greps would have been false-positives otherwise.
- **`sqlite3 prisma/dev.db` + `npm run seed` is the verified
  empty-state pattern.** wu-7p6 used it three times cleanly:
  `DELETE FROM Subject`, `DELETE FROM Assignment WHERE
  subjectId='history_6'`, full-table wipe. Seed's
  upsert-based restore makes partial deletes safe. This is
  the tool for any future data-shape bead.
- **Version restraint held.** No dependency changes in P5.
  Everything built on Next 14.2.35 + shadcn primitives
  already pulled in P3/P4 (Card, Button, Table). Zero
  compound-drift risk from the feedback memory on pinned
  versions.

## What surprised me

- **Bead descriptions drift from the tree.** wu-vn5's scope
  said `web/src/app/not-found.tsx`; actual layout is flat
  `web/app/` with no `src/`. wu-dte's scope assumed "existing
  nav conventions" — today's navbar has no text links at all.
  Bead descriptions are snapshot-in-time and can lag the
  code. Habit to keep: recon first, confirm paths and
  assumptions, note discrepancies in intent before acting.
- **Nested `web/.git` from `create-next-app`.** Running
  `git status` from inside `web/` reported phantom
  modifications against the nested repo (deletions of
  `components.json`, mods to `button.tsx`). The outer repo
  at `full_stack/` was clean. Rule I adopted mid-P5: always
  run git commands from repo root.
- **Dolt on port 3307 is cross-rig-shared.** PID 14610 was
  the shuhan rig's server hosting *our* `web_ui` database.
  `bd dolt status` reported "not running" because this
  crew doesn't manage the process; `bd dolt test` confirmed
  the connection works. Sharing is fine — but status ≠
  reachability.
- **RSC payload serializes fallback + resolved trees.**
  wu-901 saw 2× the `animate-pulse` count in streamed HTML
  because Next embedded the loading.tsx skeleton alongside
  the resolved page. wu-7p6 saw "By category" appear in
  curl output even after I hid the section — same reason.
  Lesson: grepping curl output is fuzzy; grep the rendered
  body only (the slice before the first `<script>` block)
  when verifying actual visible content.
- **`{cond && (<JSX>)}` serializes to literal `false` in
  RSC.** wu-7p6 confirmed "By category" was fully hidden by
  finding `... [section], false]` in the payload. React
  writes `false` rather than omitting the slot. Handy
  debugging signal.
- **Stale subject subtitle when assignments go empty.**
  `subject.currentGrade` and `currentPercent` live on the
  Subject row (seed-computed), not derived at read time. So
  a subject with zero assignments still rendered "Fryer · A+
  · 97.0%." Not broken — but stale. Filed as a P6 candidate.

## New conventions this phase set

- **`NavLink` pattern** (`web/components/navbar/NavLink.tsx`).
  Minimal Client Component wrapping `next/link` with
  `usePathname()` for exact-match active state. Color idiom
  is shadcn-canonical: inactive `text-muted-foreground`,
  active `text-foreground`, hover `text-foreground`. Scales
  to any future nav entry without forcing the whole Navbar
  client-side. First consumer: wu-dte's About link.
  Recommended second consumer: a `Grades` link (see
  carry-forwards).
- **Skeleton mirroring** (`web/app/grades/loading.tsx`,
  `web/app/subject/[id]/loading.tsx`). Keep static text
  real — page h1s, section h2s — and placeholder-block only
  the data-derived content. Card skeletons copy the real
  Card's outer classes (`rounded-lg border bg-card
  shadow-sm`) and inner padding (`flex flex-col space-y-1.5
  p-6`, `p-6 pt-0`) so spacing aligns exactly on the
  fallback → resolved swap. Minimizes layout shift. Inline
  the skeletons per route until a third consumer appears,
  then extract.
- **Hide-whole-section pattern for derived-empty data.**
  wu-7p6: when `subject.assignments.length === 0`, hide the
  entire "By category" section rather than showing a second
  empty message. Rationale — Categories are derived from
  Assignments; the Assignments empty state already carries
  the user-visible signal, so a second "No categories"
  message is redundant noise. The derivation-source empty
  state wins; the derivation-target section vanishes.
  Applicable whenever section B's content is a pure function
  of section A's data.
- **Two-file escort artifact** (`notes/wu-XXX-intent.md` +
  `notes/wu-XXX-completion.md`). Intent captures the
  approach before approval; completion captures surprises
  and carry-forwards after ship. Both committed with the
  code. Makes beads searchable by decision rather than just
  by diff.

## Carry-forwards to P6

- **`Grades` / `Home` nav link missing.** Flagged explicitly
  in wu-dte completion. Today: Logo → `/`, About → `/about`,
  DarkMode toggle, no path to `/grades`. The `NavLink`
  pattern is ready — adding `<NavLink
  href='/grades'>Grades</NavLink>` next to About is the
  smallest correct change.
- **Landing `/` is a placeholder.** Either flesh out the
  root page or redirect/rewrite `/` → `/grades`. Either
  way, it's a companion bead to the Grades-link fix — both
  are about "where do users actually go first."
- **Stale subtitle on zero-assignments subject.** Two
  reasonable fixes: compute subtitle stats at query time
  from live assignments (ignore the stored
  `currentGrade`/`currentPercent`), or render a zero-state
  subtitle variant when `assignments.length === 0`. Either
  is small; pick whichever the overseer prefers when filing.
- **`global-error.tsx`** — explicitly deferred from wu-vn5.
  Current `error.tsx` catches errors within a rendered
  layout; `global-error.tsx` covers errors *in* the root
  layout itself. Low priority until the app hits real
  users; trivial to add (it's the same pattern).
- **Shared `<Skeleton>` component extraction.** Two
  loading.tsx files currently ship inline skeletons.
  Extract into `components/global/Skeleton.tsx` when a
  third consumer appears, not before.
- **Table-shell skeletons.** wu-901's subject-page table
  rows are plain divs (`h-10`), not shadcn `<Table><Table
  Body><TableRow>` shells. Small layout shift (~4-8px per
  row) on swap. Upgrade if eyeball ever calls it annoying.
- **Remote error reporting (Sentry / Axiom).** Deferred
  from wu-vn5. Current `error.tsx` just `console.error`s.
  Relevant when the rig reaches real users.
- **Mobile-menu drawer.** Current responsive Navbar stacks
  vertically on narrow widths. Fine for 2-3 nav items;
  revisit if nav grows past 4.
- **Force-dynamic on list routes** (from P4 retrospective,
  still open). `/grades` is currently `○ Static` — rendered
  once at build, serves stale data forever on deploy. Add
  `export const dynamic = 'force-dynamic'` before first
  deploy, or accept that `/grades` is build-time-frozen.

## Open watch-flags

- **RSC stream ≠ rendered DOM.** When verifying a render
  with curl, filter to the body before the first `<script>`
  or grep for DOM-specific patterns (`<h1 class="...">`)
  rather than bare strings. Script payload contains fallback
  trees, resolved trees, and client module references — all
  three can carry strings that aren't on-screen.
- **Cross-rig Dolt server sharing.** `bd dolt status` can
  say "not running" when the DB is perfectly reachable via
  a peer rig's server. If `bd` commands start failing on
  resume, run `bd dolt test` before any remediation. Do NOT
  `bd dolt start` without checking PIDs on port 3307 first
  — killing the peer rig's server is a destructive act.
- **Stale dev ports** (from P4 retrospective, didn't re-bite
  in P5 but discipline held). `lsof -i :3000` before `npm
  run dev` on every start.
- **Shadcn version pin drift.** P5 added no new shadcn
  components. NavLink uses only `cn()` and the
  muted-foreground / foreground utility classes, both
  stable across 0.9.x. When we eventually bump shadcn (P6
  or later), the hand-seeded Card/Button/Table/DropdownMenu
  need re-verification. Don't bump without a dedicated
  bead.
- **Bead description drift** (discovered in wu-vn5 and
  wu-dte). Paths, conventions, and prior-art claims in
  bead descriptions can lag the tree. Recon first, note
  discrepancies in intent before acting.

## One thing to watch in P6

P6 is likely deployment + feedback loop. Two load-bearing
items the whole P5 polish pass was secretly preparing for:

1. **`/grades` is `○ Static`.** All the empty-state copy and
   loading skeletons are great — but if the route is
   pre-rendered at build time, the EmptyState gets frozen
   into the deployed HTML for whatever state the seed DB was
   in at build. First P6 bead that touches deploy will need
   to either `force-dynamic` the route or accept build-time
   freezing as the design.
2. **Client bundle is still small but growing.** P5 added
   `error.tsx` (Client) and `NavLink.tsx` (Client) to the
   client bundle. Current `First Load JS` is 87.3 KB
   shared. Fine today. Worth watching as P6 adds whatever
   interactivity comes next — if the number jumps, ask
   what's pulling in.

The rig is now sturdy enough to deploy. P6 can focus on
actually shipping it.

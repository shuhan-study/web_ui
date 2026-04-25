# API & Interface Design

## Summary

The "API" for Deploy is a stack of small, interlocking interfaces rather than a
single surface: the Vercel project-setup clicks Rongjun makes once, the
edit-seed-commit-push loop he repeats every week, the per-route
`force-dynamic` directive Next 16 needs to honor freshness, and three thin
in-app hooks (root redirect, navbar entry, error boundary, zero-state). None of
these introduce new HTTP routes or new data contracts. The design goal is
**ergonomic minimalism** — every interface choice should add zero recurring
cognitive load on the single maintainer (Rongjun) and zero discoverability tax
on the next polecat.

We recommend: skip `vercel.json` (use dashboard-only configuration), add a
single `npm run reseed` script that wraps seed + git-add of the binary,
co-locate `force-dynamic` at the page-segment level (not layout, not route.ts),
implement `/` redirect via `app/page.tsx`, render the navbar `Grades` link
before `About`, push the empty-assignments decision down into a single
component conditional, and ship a checked-in
`notes/deploy-2026-04-25/smoke.md` mirroring `notes/modernization-baseline.md`.

## Analysis

### Key Considerations

- **Single-maintainer ergonomics.** Rongjun reseeds weekly. Each step in the
  reseed flow that requires recall (which file to `git add`? did I run seed?)
  is a future failure mode. The interface should collapse the reseed loop into
  two commands at most.
- **Dashboard vs. config-as-code.** `vercel.json` adds a file to maintain and
  drifts against the dashboard if Rongjun ever changes a setting in either
  place. With one project, one user, one env var, the dashboard is the
  source-of-truth interface. `vercel.json` is overhead without payoff.
- **`force-dynamic` discoverability.** Three places this could live: route
  segment (`page.tsx`), layout, or `route.ts`. The PRD locks it to the two
  data-reading routes. Putting it at layout level over-broadens (would force
  the `/about` static page dynamic too if a layout ever wraps it). Per-page
  is the smallest blast radius and the most discoverable spot when a future
  maintainer asks "why is this dynamic?".
- **Redirect status code matters less than persistence.** A `307` from
  `redirect()` vs a `308` from `next.config.mjs` `permanent: true` is a real
  caching difference for browsers and CDNs, but for a single-user dashboard
  bookmarked once, neither will cause visible behavior. Maintainability of
  the redirect *location* matters more than the status code.
- **Stale-grade subtitle has two surfaces.** PRD scenario S5 calls out
  *both* `/grades` (subject card hides stored letter when assignments empty)
  *and* `/subject/[id]` (zero-state subtitle). The design must touch both
  components, and the data fetch needs to know assignment count for the
  card — but `fetchAllSubjects` does not currently include assignments.
  Either add a count, fetch assignments, or push the conditional down via a
  per-card lookup.
- **Error boundary is read by an 11-year-old.** Standard "An unexpected
  error occurred" copy fails the audience. The PRD locks kid-readable copy
  and ~30 lines max.
- **Smoke checklist as artifact.** PRD Q4 locks a checked-in markdown file
  matching `notes/modernization-baseline.md`. The interface here is
  filename + format consistency with the prior project so future polecats
  recognize the pattern.

### Options Explored

#### 1. Vercel project setup interface

**Option 1A: Dashboard-only setup (recommended).**
- **Description**: In Vercel dashboard: New Project → Import GitHub repo
  `shuhan-study/web_ui` → set Root Directory to `web` → Framework Preset
  auto-detects Next.js → Build Command `next build` (default) → add env var
  `DATABASE_URL=file:./dev.db` (or whatever Open Question #2's probe
  resolves to) → Deploy. ~6 clicks once.
- **Pros**: No file to maintain, no drift risk, settings are visible in
  one place (dashboard). Matches Vercel's recommended Next.js flow.
- **Cons**: Settings live outside the repo — recovery from "what was
  configured?" requires Vercel-account access. For a single-maintainer
  project this is acceptable.
- **Effort**: ~10 minutes one-time, no ongoing cost.

**Option 1B: Check in `vercel.json`.**
- **Description**: Add `web/vercel.json` with `framework`, `buildCommand`,
  `installCommand`, etc.
- **Pros**: Configuration is reproducible, visible in repo, survives
  Vercel-account loss.
- **Cons**: Two sources of truth (dashboard env vars still live outside).
  Adds maintenance surface for a one-shot setup. Most settings would just
  re-state Vercel's auto-detection.
- **Effort**: Low to write, but ongoing drift risk.

**Option 1C: Vercel CLI (`vercel link` + `vercel deploy`).**
- **Description**: Use the CLI from Rongjun's laptop instead of dashboard.
- **Pros**: Scriptable, doesn't require browser context.
- **Cons**: Still requires linking a Vercel account; doesn't replace
  dashboard for env-var management cleanly. Adds a CLI dependency.
- **Effort**: Higher than dashboard for a one-shot setup.

**Recommendation: 1A.** Dashboard-only. Skip `vercel.json` entirely. The
only thing in-repo that touches Vercel is the existing `.vercel`
gitignore line.

---

#### 2. Reseed-to-live developer workflow

**Option 2A: Document the manual sequence (status quo).**
- **Description**: PRD S2 spells it out: edit `data/seed/grades.json` →
  `npm run seed` → `git add web/prisma/dev.db data/seed/grades.json` →
  commit → push. Document this in `README.md` or
  `notes/deploy-2026-04-25/reseed-runbook.md`.
- **Pros**: Zero new code, zero abstraction.
- **Cons**: Three command lines, easy to forget the `git add` for the
  binary. Future "why is the live URL stale?" debugging often traces to
  forgetting to commit `dev.db`.
- **Effort**: Documentation-only.

**Option 2B: Add `npm run reseed` script (recommended).**
- **Description**: New script in `web/package.json`:
  ```json
  "reseed": "prisma db seed && git add prisma/dev.db ../data/seed/grades.json"
  ```
  Then the reseed loop is: edit JSON → `npm run reseed` → `git commit
  -m "reseed YYYY-MM-DD" && git push`. Two commands, one of them
  domain-specific.
- **Pros**: Collapses three steps to one; the `git add` of the binary is
  no longer a memory item; the script name is self-documenting; aligns
  with the existing `seed` script convention.
- **Cons**: Mixes data-layer (Prisma) and version-control concerns in one
  npm script. Some maintainers consider this an anti-pattern.
- **Effort**: One line in `package.json` plus a sentence in the
  reseed-runbook doc.

**Option 2C: Pre-commit hook to auto-`git add` `dev.db` after seed.**
- **Description**: Husky/lefthook hook detects modified `grades.json`
  and stages `dev.db`.
- **Pros**: Fully automatic.
- **Cons**: Adds a tooling dependency for one weekly action; hooks are
  invisible (low discoverability); over-engineered for one user.
- **Effort**: Highest for least payoff.

**Recommendation: 2B.** Add `npm run reseed`. Document it in a new
`notes/deploy-2026-04-25/reseed-runbook.md` (~20 lines). The two-command
ceiling matters because Rongjun does this weekly; halving the surface
halves the future "I forgot a step" rate.

---

#### 3. Route-level dynamic-rendering interface

**Option 3A: Per-page `export const dynamic = 'force-dynamic'` (recommended).**
- **Description**: Add a single line at the top of
  `web/app/grades/page.tsx` and `web/app/subject/[id]/page.tsx`:
  ```ts
  export const dynamic = 'force-dynamic';
  ```
  Two files, two lines.
- **Pros**: Smallest blast radius — only the routes that need it. Most
  discoverable: a future maintainer reading the page file sees the
  directive immediately. Standard Next.js App Router pattern.
- **Cons**: Two places to maintain. If a future page is added that
  also reads from Prisma, the maintainer must remember to add the line
  (or it'll silently SSG).
- **Effort**: Trivial.

**Option 3B: Layout-level dynamic.**
- **Description**: Put `export const dynamic = 'force-dynamic'` in
  `web/app/layout.tsx`.
- **Pros**: Single place; covers any future data-reading page automatically.
- **Cons**: Forces `/about` (and any future static page) to also render
  dynamically. Wasted server time, larger CDN footprint, harder to opt
  back into static for a specific page. Surprising default.
- **Effort**: Trivial, but wider blast radius.

**Option 3C: `revalidate = 0` instead of `force-dynamic`.**
- **Description**: `export const revalidate = 0;`
- **Pros**: Same effect via the cache axis instead of the rendering axis.
- **Cons**: Less semantically obvious — reads as "cache for 0 seconds"
  rather than "render every request." Higher cognitive load for the
  same outcome.
- **Effort**: Equivalent.

**Recommendation: 3A.** Per-page directive on `app/grades/page.tsx` and
`app/subject/[id]/page.tsx`. Document the directive in a brief code
comment so future maintainers understand the freshness guarantee:
```ts
// Read live SQLite contents at request time, not at build time.
export const dynamic = 'force-dynamic';
```

---

#### 4. Root `/` redirect mechanism

**Option 4A: `app/page.tsx` calling `redirect('/grades')` (recommended).**
- **Description**: Replace current `web/app/page.tsx` with:
  ```tsx
  import { redirect } from 'next/navigation';
  export default function Home() {
    redirect('/grades');
  }
  ```
  RSC-level redirect, returns HTTP 307.
- **Pros**: Two lines, co-located with the route it redirects from. Most
  discoverable: a polecat looking for "what does `/` do?" finds it in
  the obvious file. Default 307 (temporary) is correct — if Rongjun
  ever wants `/` to be a landing page later, no CDN-cache fight.
- **Cons**: 307 is uncached; every visit to `/` is a server hit. For a
  single-user app, irrelevant.
- **Effort**: Two-line edit.

**Option 4B: `next.config.mjs` `redirects()` entry.**
- **Description**: Add to `web/next.config.mjs`:
  ```js
  redirects: async () => [{ source: '/', destination: '/grades', permanent: false }]
  ```
- **Pros**: Routing concerns separated from app code. Status code
  configurable via `permanent: true` (308) for CDN caching.
- **Cons**: Splits routing across two locations (config + app dir).
  `next.config.mjs` is currently empty — first non-empty config is a
  decision to start using config-as-code, which the PRD Non-Goals list
  doesn't really warrant.
- **Effort**: Equivalent.

**Recommendation: 4A.** Per PRD Open Question #4 default. Use 307 (the
default from `redirect()`). Delete the existing placeholder copy from
`page.tsx`.

---

#### 5. Navbar `Grades` link

**Option 5A: Insert `Grades` before `About` (recommended).**
- **Description**: Edit `web/components/navbar/Navbar.tsx`:
  ```tsx
  <NavLink href='/grades'>Grades</NavLink>
  <NavLink href='/about'>About</NavLink>
  ```
  Order matches PRD OQ #5 default ("Grades is the primary destination").
- **Pros**: Existing `NavLink` component already supports active-state
  styling via `usePathname()` (verified at
  `web/components/navbar/NavLink.tsx`) — zero new component work.
- **Cons**: None.
- **Effort**: One-line addition to one file.

**Active-link behavior verified.** `NavLink.tsx` already checks
`pathname === href` and switches `text-foreground` / `text-muted-foreground`.
Works for `/grades` exact match. If a future deep route like
`/grades/subject/X` is introduced (not in scope), the active state would
break — but flag for future, don't fix now.

---

#### 6. Empty-assignments zero-state

This dimension has two render surfaces (per PRD scenario S5). Both must
be addressed.

**Option 6A: Push assignment count into `fetchAllSubjects` + branch in
both components (recommended).**
- **Description**:
  1. Modify `web/utils/actions.ts`:
     ```ts
     export const fetchAllSubjects = () => db.subject.findMany({
       orderBy: { name: 'asc' },
       include: { _count: { select: { assignments: true } } },
     });
     ```
  2. In `web/components/subjects/SubjectCard.tsx`: when
     `subject._count.assignments === 0`, render the subject name and
     teacher only — suppress the `currentGrade` / `currentPercent`
     display. Replace with subdued "No assignments yet" copy.
  3. In `web/app/subject/[id]/page.tsx`: when `subject.assignments.length
     === 0`, replace the `{teacher} · {grade} · {percent}%` subtitle
     with `{teacher} · No assignments yet`.
- **Pros**: Single Prisma query addition handles both surfaces. Type-safe
  via Prisma's generated `_count` relation. Honest UI per PLAN
  decision log.
- **Cons**: Slightly widens the `Subject` payload type — `SubjectCard`
  has to accept `Subject & { _count: { assignments: number } }`.
- **Effort**: Low — three small edits across three files.

**Option 6B: Compute the conditional inside the component via a separate
fetch.**
- **Description**: Each `SubjectCard` calls a server action to count
  assignments.
- **Pros**: Keeps `fetchAllSubjects` unchanged.
- **Cons**: N+1 query pattern (7 cards = 7 round-trips); higher
  serverless cost; pointless for the data scale.
- **Effort**: Higher.

**Option 6C: Fix the stored value (compute `currentGrade` from
assignments).**
- **Description**: At seed time, set `currentGrade` to null when no
  assignments. Render conditionally.
- **Pros**: Fixes the data, not the UI.
- **Cons**: Schema change (currentGrade nullable) — out of scope per
  PRD Non-Goals ("no schema changes"). Doesn't help existing seed
  files until reseed.
- **Effort**: Schema migration.

**Recommendation: 6A.** Modify `fetchAllSubjects` to include
`_count.assignments`, branch in both `SubjectCard` and the subject page.
Zero-state copy: `"No assignments yet"` (verbatim from PLAN decision
log).

---

#### 7. `error.tsx` interface

**Current state.** `web/app/error.tsx` exists but renders technical copy
("An unexpected error occurred") with a "Try again" button. This fails
the PRD Q6 spec.

**Option 7A: Rewrite global `web/app/error.tsx` with kid copy
(recommended).**
- **Description**: Replace with:
  ```tsx
  'use client';
  import { useEffect } from 'react';
  export default function Error({ error }: { error: Error & { digest?: string } }) {
    useEffect(() => { console.error(error); }, [error]);
    return (
      <>
        <h1 className="text-3xl font-semibold">Hmm, something's not working</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The grade tracker isn't working right now. Your dad will fix it soon.
        </p>
      </>
    );
  }
  ```
  ~15 lines. No `reset` button (PRD: "no retry buttons"). `console.error`
  preserved so Rongjun can read the Vercel logs.
- **Pros**: Matches PRD copy spec verbatim. Global boundary catches all
  per-segment errors. Below the 30-line ceiling.
- **Cons**: A global boundary means the navbar still renders (good — gives
  Shuhan a way out), but if the error is in the layout itself, Next falls
  back to `global-error.tsx` which doesn't exist. Acceptable for v0.7;
  flag for follow-up.
- **Effort**: One file rewrite (~15 lines).

**Option 7B: Per-segment `error.tsx` in `app/grades/` and `app/subject/[id]/`.**
- **Description**: Two error boundaries, scoped per route.
- **Pros**: Different copy per route possible.
- **Cons**: Same copy duplicated; no obvious benefit for an 11-year-old
  audience that doesn't care about the URL.
- **Effort**: Two files instead of one.

**Recommendation: 7A.** Rewrite the existing global `web/app/error.tsx`.
Drop the `Button` import and the `reset` prop usage to satisfy "no retry
button."

---

#### 8. Smoke-checklist artifact

**Option 8A: `notes/deploy-2026-04-25/smoke.md` checked-in (recommended).**
- **Description**: New file at `notes/deploy-2026-04-25/smoke.md`. Format
  mirrors `notes/modernization-baseline.md` — one section per checked
  surface, observed behavior in plain prose, and a footer line:
  ```
  reseed cycle: ✅ 2026-MM-DD
  ```
  Sections: `live URL`, `/`, `/grades`, `/subject/<id>`, `/about`,
  `/subject/<bogus>` (404), `reseed cycle`.
- **Pros**: Pattern recognition with prior project. Version-controlled
  (PRD Q4 spec). Future polecats know exactly where to look. No
  screenshots required (PRD Q4 spec).
- **Cons**: One more file to maintain — but smoke is one-shot per
  release, not recurring.
- **Effort**: Author once during deploy bead execution.

**Filename precedent.** Existing `notes/modernization-baseline.md` and
`notes/modernization-smoke.md` use the `<project>-<role>.md` pattern at
the `notes/` root. The Deploy session has already created
`notes/deploy-2026-04-24/`, so the per-session subdirectory is the new
pattern. Recommend `notes/deploy-2026-04-25/smoke.md` — date is the
session-kickoff date for this design's beads, mirrors how survey lives
in `notes/deploy-2026-04-24/survey.md`.

---

### Recommendation (overall)

The interface stack for Deploy:

1. **Vercel setup**: dashboard-only, no `vercel.json`.
2. **Reseed loop**: add `npm run reseed` to `web/package.json`; document
   in `notes/deploy-2026-04-25/reseed-runbook.md`.
3. **`force-dynamic`**: per-page directive on
   `web/app/grades/page.tsx` and `web/app/subject/[id]/page.tsx`, with a
   one-line code comment explaining why.
4. **Root redirect**: `web/app/page.tsx` calls `redirect('/grades')`.
5. **Navbar**: insert `<NavLink href='/grades'>Grades</NavLink>` before
   `About` in `web/components/navbar/Navbar.tsx`. No NavLink changes
   needed.
6. **Empty zero-state**: extend `fetchAllSubjects` with
   `_count.assignments`, branch in `SubjectCard.tsx` and
   `app/subject/[id]/page.tsx`. Copy: `"No assignments yet"`.
7. **error.tsx**: rewrite `web/app/error.tsx` with kid-readable copy, no
   reset button, ≤30 lines.
8. **Smoke**: ship `notes/deploy-2026-04-25/smoke.md` mirroring the
   modernization baseline format with a `reseed cycle: ✅` footer.

## Constraints Identified

- **Vercel Project Root Directory must be `web/`** (per
  `notes/deploy-2026-04-24/survey.md`). Setting it wrong is the most
  likely first-deploy failure. Captured in the Vercel-setup bead's
  acceptance criteria.
- **`web/.gitignore` currently ignores `/prisma/dev.db`** (verified via
  Read). The un-ignore edit is stashed locally as `wu-avk pre-pull:
  un-ignore dev.db edit`. The deploy implementation bead must un-ignore
  AND commit `dev.db` in the same commit, or Vercel builds with no DB
  and SSR fails at request time.
- **PRD locks Option C, locks zero-state copy, locks per-page redirect,
  locks kid-readable error copy, locks checked-in smoke markdown.** This
  design must not relitigate any of these.
- **No `vercel.json`** is a recommendation, not a hard rule — but adding
  it imposes ongoing drift cost. If the Vercel-setup bead discovers a
  setting that needs config-as-code (e.g., custom Node version), `vercel.json`
  becomes justified.
- **`fetchAllSubjects` payload shape change** (Option 6A) is the only
  cross-component contract change in this design. Type-safe via Prisma
  generation; no schema migration.
- **The `Container` wrapper in `layout.tsx` already gives `error.tsx`
  the same chrome as other pages.** No layout work needed.

## Open Questions

- **Should the `web/app/page.tsx` redirect be replaced by a `next.config.mjs`
  redirect to spare the server hit on every `/` visit?** For one user this
  is irrelevant; if Vercel analytics ever shows non-trivial `/` traffic,
  reconsider. **Default: keep the page-level redirect.**
- **Where exactly should `npm run reseed` live and what should the path
  to `data/seed/grades.json` look like from `web/`?** The seed JSON lives
  at `../data/seed/grades.json` from `web/`. The script needs to handle
  that, or the `git add` should use absolute repo-root paths from
  `web/` (`git add prisma/dev.db ../data/seed/grades.json`). Verified
  with the data-leg analysis; minor.
- **Is there a `global-error.tsx` follow-up worth filing?** If
  `layout.tsx` itself ever throws, the in-scope `error.tsx` won't catch
  it. Out of scope for v0.7. Recommend filing a P3 bead `wu-XXX`
  "Add web/app/global-error.tsx fallback" for future, not blocking.
- **For the Vercel-setup bead, does Rongjun already have a Vercel
  account linked to GitHub?** Per PRD OQ #7, account creation may or
  may not be part of bead 1. Affects the Vercel-setup bead's "first
  click" — but doesn't change the interface design.

## Integration Points

- **Data dimension** — Option 6A requires a `_count.assignments` field
  in the `fetchAllSubjects` Prisma query; data leg should confirm the
  query plan and SQLite cost is negligible. The `dev.db`-committed and
  `force-dynamic` interfaces both depend on the data leg's freshness
  guarantee.
- **UX dimension** — Navbar order, zero-state copy, error.tsx copy, root
  redirect — every visible interface decision in this leg surfaces in
  the UX leg's scenario walkthroughs. Zero-state copy especially needs
  cross-leg agreement (PLAN says `"No assignments yet"` — UX leg should
  confirm and own the typography / placement).
- **Integration dimension** — The `npm run reseed` script, the
  Vercel-setup steps, and the smoke checklist are all the integration
  leg's "build pipeline" surface. The reseed runbook is the maintainer-
  facing documentation; the smoke checklist is the verification artifact.
  Bead-graph ordering (Option C probe → un-ignore + commit dev.db →
  force-dynamic → correctness fixes → Vercel setup → smoke) belongs to
  integration; this design provides the per-bead interface specs they
  consume.

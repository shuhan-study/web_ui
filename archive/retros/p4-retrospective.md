# P4 retrospective — Subject detail page

## What went well

- **Prisma's typed `include` paid off immediately.** wu-1mk's
  `findUnique({ include: { assignments: { orderBy: { date: 'asc' } } } })`
  produced a fully-inferred `Subject & { assignments: Assignment[] }`
  return type that fed directly into every downstream consumer (route,
  table, breakdown) with zero manual annotations.
- **Hand-seed pattern is muscle-memory now.** Pulling Table from 0.9.4
  (wu-h1q) was identical to pulling Card (wu-32c) and Button/
  DropdownMenu (wu-9xz). Source-diff gate, drop in, done.
- **Functional probes before render probes** caught both real issues.
  wu-1mk's `fetchSubjectById` probe verified sort order and null-on-
  miss before any UI consumed the shape; wu-orr's inline compute
  verified every percent value before any curl was fired.

## What surprised me

- **Timezone bug in wu-h1q.** `new Date("2026-02-20")` + local-TZ
  `toLocaleDateString()` shifted every assignment date back one day
  under the server's PDT. Fix was one line (`timeZone: 'UTC'`) but
  the category of bug was instructive: when you store a seed-
  derived date as midnight UTC, **render in UTC too**, or the date
  silently changes per deployment region. Applies to any future
  date-rendering component — `Term.start`/`Term.end` on an as-yet-
  unbuilt header, for instance.
- **Dynamic routes are free-dynamic.** `/subject/[id]` built as
  `ƒ Dynamic` out of the box — no `force-dynamic` export needed.
  Contrast with `/grades`, which quietly became `○ Static` and
  would serve stale data on deploy. Makes me think the right
  first-deploy pass is to add `force-dynamic` on every list route
  that doesn't have dynamic params.
- **Port conflicts from stale dev servers don't surface loudly.**
  `npm run dev` silently bound to 3001 when 3000 was held by a
  zombie from a killed bash; curl hit 3000 and got 404s from
  whatever occupied it. Two-minute detour; worth a gate-hygiene
  habit of either checking `/tmp/*-dev*.log` for port warnings or
  pre-`pkill`'ing stale servers.
- **Server components stay free on the client.** Both Table and
  CategoryBreakdown have `0 B` client-bundle impact on the
  `ƒ Dynamic` route. Reminder that "pure presentational + server-
  rendered" means the whole component tree lives on the server.

## Patterns to carry into P5

- **Functional-probe gate** (ephemeral tsx -e inline compute) for
  anything with non-trivial data transformation. Faster feedback
  than render-verify, and independent of port/dev-server issues.
- **TZ = 'UTC' on any `Date` column** derived from seed `YYYY-MM-DD`
  strings. Bake into future intent docs so we don't re-discover.
- **Layout convention:** stacked `<section>` blocks with `mt-8` gap
  and `<h2 text-xl font-semibold mb-4>` headings. Three consumers
  now (Grades, Assignments, By category); treat it as the rig's
  page-section pattern.
- **Gate-grep discipline** (started in wu-amy, exercised in wu-h1q
  and wu-orr): prefer discrete-token greps over phrase greps when
  verifying RSC-rendered HTML, because React splits text nodes at
  JSX expression boundaries.

## One thing to watch in P5

P5 is polish: Suspense / LoadingContainer / friendly empty state /
about page / 404 boundary. Two of those (Suspense and not-found)
run into Next 14 App Router mechanics we haven't touched yet —
`loading.tsx` and `not-found.tsx` file conventions. Reading a quick
doc section before the first P5 bead is likely a good use of 10
minutes to avoid guessing at file placement. The current default
404 (wu-amy) works fine but will get replaced by a rig-styled one
in P5.

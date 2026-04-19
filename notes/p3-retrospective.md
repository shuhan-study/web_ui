# P3 retrospective — Grades page with real data

## What went well

- **Manual-aligned architecture held up.** `utils/actions.ts` →
  async server component → grid of cards mapped cleanly from the
  e-commerce original to a gradebook. Zero fights with the Prisma
  types; wu-tll's schema camelCase paid off at the call site.
- **Hand-seeding is a repeatable pattern now.** wu-32c's Card pull
  used the exact same `gh api | diff` gate as wu-9xz. Adding a
  shadcn primitive outside the CLI is a 2-gate operation (pull +
  diff); no drama.
- **Splitting "build component" from "wire into route"** (wu-32c vs
  wu-88w) kept each bead verifiable + narrow. First visual render
  happened in a bead that was *only* doing the render, making QA
  easy to reason about.

## What surprised me

- **Next defaults `/grades` to `○ Static` prerender.** With an async
  fetch from Prisma, the page gets baked at build time. Fine in dev
  (always dynamic), but would bite us on first deploy. Noted as a
  carry-forward for a future polish/deploy bead; simple fix
  (`export const dynamic = 'force-dynamic'`).
- **Renaming `dev.db` doesn't produce an empty state — it produces
  a 500.** Prisma auto-creates a fresh DB file on connect with no
  schema applied. The "DB missing" and "DB empty" paths are
  different failure modes; only the latter is handled by EmptyState.
- **Bundle growth on first card** was `+8.7 kB First Load JS`
  (87.4 → 96.1) — mostly Card + Link + whatever Radix pulls through
  `asChild`. Manageable, but worth watching in P4 when more shadcn
  primitives land.

## Patterns to carry into P4

- **Keep hand-seeding from 0.9.4 tag** (`shadcn-ui@0.9.4`, commit
  `729b9ec`). Each new shadcn primitive = one source-diff gate.
  Adjust the memory file `project_shadcn_cli_drift.md` if this
  starts to get tedious, but so far it's fine.
- **`heading: React.ReactNode` over `heading: string`** — tiny API
  choice, paid for itself instantly by letting us pass `<code>` in
  the default grades empty-state. Worth doing by default for any
  prop that carries human-readable content.
- **Test the empty path with `prisma migrate deploy` on a parked
  DB**, not by renaming files. The former produces the state we
  want to verify; the latter produces a different failure.

## One thing to watch in P4

P4 adds `/subject/[id]` — a dynamic route that fetches a Subject +
its Assignments. First use of `params` in a server component, first
`include: { assignments: true }` in the Prisma layer, first call site
that needs the `Assignment` type. The 404-until-P4 links already
exist in wu-32c's SubjectCard; they'll come alive the moment the
route file lands. Useful signal: if we break the Subject→Assignment
relation type anywhere, the build will fail at the `include` call,
not at render time.

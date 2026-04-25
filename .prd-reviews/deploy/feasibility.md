# Technical Feasibility

## Summary

Most of the work is genuinely small (two `force-dynamic` exports, one
Navbar link, one root redirect, one zero-state branch). The single
concentrated risk is Open Question #1 — whether Prisma 5.22 + read-only
SQLite + Vercel serverless is a working combination. This is not a
hypothetical: Prisma's SQLite engine attempts to open a `-journal`
sidecar by default, Vercel's Lambda filesystem is read-only outside
`/tmp`, and Prisma's engine binary needs to be correctly bundled by the
Vercel build's Prisma plugin (which has historical sharp edges in
monorepo / non-default-root configurations). If any of those three
mechanics fails, the entire Option C strategy fails and the project's
materially-larger Option B fork is triggered. The PRD acknowledges this
and treats it as a single probe; the reality is at least three distinct
failure modes that need separate verification.

## Findings

### Critical Gaps / Questions

- **Prisma + SQLite read-only on Vercel: at least three subproblems, not
  one.** The PRD treats Open Question #1 as a single probe, but the
  failure modes are:
  1. **Engine bundling.** Vercel's Prisma plugin needs to detect a
     non-root `web/prisma/schema.prisma`. If it doesn't, the engine
     binary isn't shipped and runtime fails immediately.
  2. **Filesystem path.** `file:./dev.db` resolves relative to
     `process.cwd()` at runtime; on Vercel that's typically
     `/var/task/web` if Root Directory is `web`, but it has changed
     between Next versions and Vercel runtimes.
  3. **Read-only journal handling.** SQLite opens journal sidecar
     files unless explicitly disabled. Prisma's connection string
     supports `?mode=ro` (read-only) on some drivers but not all; the
     default behavior may attempt journal creation on every open.

  Each needs a separate "is it green" check.
  - *Suggested clarifying question:* Should the Option C probe be a
    single bead or three separate verifications? If the probe finds
    one of three failing, is the pivot trigger still all-or-nothing?

- **Vercel "Root Directory = web" interaction with Next 16's monorepo
  detection.** Next 16 added stricter monorepo handling. The build
  path may resolve differently than expected — Vercel's Next preset
  expects certain layouts. Setting Root Directory to `web` while
  having `next.config.mjs` and `package.json` inside it should work,
  but is not the conventional layout (which puts `package.json` at
  repo root).
  - *Suggested clarifying question:* Has anyone tried a Vercel deploy
    of *any* Next 16 app with a non-root project directory? If not,
    the build itself is a probe before the runtime probe.

- **Prisma 5.22 is a year-old version line that doesn't include some
  Prisma + Vercel fixes from the 5.x → 6.x transition.** If Option C
  fails due to a known engine bug in 5.22 that's fixed in 5.x.x or 6.x,
  do we bump Prisma (against "no version drift" constraint) or pivot
  to Option B? PRD says "no version drift introduced by this project"
  which appears to forbid the bump-to-fix path.
  - *Suggested clarifying question:* If the Option C probe fails *only*
    because Prisma 5.22 has a known fix in a later patch, is bumping
    Prisma allowed as a sub-decision under the Option C lock?

- **`force-dynamic` interaction with route prefetching.** Setting `export
  const dynamic = 'force-dynamic'` disables ISR but Next's link prefetch
  may still cache the response client-side. If Shuhan navigates between
  `/grades` and `/subject/[id]` on the same browser session, the first
  load might be fresh but subsequent ones served from prefetch cache.
  - *Suggested clarifying question:* Is per-navigation freshness
    required, or is per-page-load freshness sufficient? The latter is
    what `force-dynamic` provides; the former needs additional opt-out
    from the prefetch path.

### Important Considerations

- **No deploy-time integration test before tag.** The smoke checklist
  is the only protection between a green build and a tagged release.
  If Vercel's first build succeeds but request handling fails (Prisma
  engine missing), the smoke pass catches it — but only after merge.
  Consider whether a Vercel preview deploy is the verification gate
  rather than `main`.

- **The build cache may serve stale `dev.db`.** Vercel aggressively
  caches `node_modules/` between deploys. If Prisma engines are
  cached, that's good. If `dev.db` is somehow swept into a cache
  layer, that's bad. Likely fine because `dev.db` lives in `prisma/`
  not `node_modules/`, but worth verifying.

- **Edge runtime vs Node.js runtime.** Default Next 16 routes can
  run on Edge (V8 isolate, no filesystem). If the build defaults
  `/grades` to Edge, Prisma fails immediately (Prisma needs Node).
  An explicit `export const runtime = 'nodejs'` may be needed
  alongside `force-dynamic`.

- **Vercel's deploy log may obscure Prisma errors.** Build-time
  errors are visible; runtime engine-load errors may surface only on
  the first request as 500s. The implementer needs to know to check
  Vercel's Function Logs panel after deploy, not just the build log.

- **Cold start latency.** First request after idle hits a cold
  Lambda. Prisma engine load + DB open is typically 1–3 seconds. The
  PRD has no latency target; if Shuhan opens the URL fresh and waits
  3 seconds for `/grades` to render, is that acceptable? Probably,
  but the implementer should know what the "acceptable" envelope is.

- **Reseed redeploy timing.** PRD says "1–3 min" for redeploy. Vercel's
  free tier on a small Next app is typically 30–90s, so this is
  conservative — but free tier has occasional queue waits during
  high-traffic periods. Worth noting "may be longer during Vercel
  outages."

### Observations

- All four of the in-app changes (Navbar link, root redirect,
  zero-state, force-dynamic) are <10 lines of code each. They are not
  the project's risk surface.

- The mayor-worktree hazard is technically out of scope but is a real
  risk — if mayor wakes during this project and pushes its
  100-deletion staging area, the deploy is moot because the repo is
  gone. The deploy implementer cannot mitigate this from inside their
  worktree, but should verify mayor remains down before tagging.

- The `web/.gitignore` un-ignore + `dev.db` commit step is well-
  scoped and bundling them into one bead is correct (the survey
  explicitly recommends this).

- "Vercel auto-deploy on `dev.db`-only commit" (Open Question #3) —
  Vercel deploys on any push to a tracked branch by default, including
  binary-only commits. This is almost certainly fine and probably not
  worth its own probe; observation in passing.

- Prisma's engine for SQLite is statically bundled in Prisma 5.x;
  it does not need a separate `query-engine-*` binary at runtime
  (unlike Postgres). That removes one of the historical
  "engine missing" failure modes. Worth noting in the probe plan
  to scope expectations.

## Confidence Assessment

**Medium-Low for the Option C probe; High for everything else.** The
in-app fixes are textbook small. The deploy itself rests on a single
non-trivial unknown (Prisma + SQLite + Vercel) which the PRD correctly
identifies but underspecifies. If the probe is structured to test the
three sub-mechanics independently rather than as a single binary check,
the project's risk drops substantially. If the probe is run as "deploy
and see," each failure burns a re-investigation cycle.

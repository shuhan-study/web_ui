# Data Model Design — Deploy

## Summary

**Option C is locked: `web/prisma/dev.db` is committed to the repo, bundled
into the Vercel build artifact, and opened read-only at request time.** No
schema changes, no migrations added, no new fields. The data dimension's job
in this project is to **execute Option C's plumbing correctly** — un-ignore
the DB file, choose a journal mode that ships clean, resolve the bundle path
on Vercel's serverless filesystem, open SQLite in read-only mode so the
runtime never tries to spawn a `-journal` sidecar, and define probe pass/fail
criteria a polecat can mechanically evaluate.

The single non-trivial unknown is whether Prisma 5.22.0 + read-only SQLite
actually survives Vercel's `@vercel/next` builder with Root Directory = `web`.
That risk is concentrated in **one probe bead** (PRD clarification Q1) with
a **3-item checklist** corresponding to the three failure modes: engine
bundling, path resolution, and read-only filesystem behavior. Pivot path
to Option B (Postgres on Neon) is documented but out-of-project per PRD
clarification Q2.

## Analysis

### Key Considerations

- **`web/.gitignore` currently ignores both `/prisma/dev.db` and
  `/prisma/dev.db-journal`** (lines 33–34). Un-ignoring `dev.db` is the
  Option-C plumbing point flagged by survey.md; the stashed `wu-avk`
  edit does exactly this. **Do NOT un-ignore `-journal`/`-wal`/`-shm`
  sidecars** — those are runtime artifacts of an open SQLite handle and
  must never enter the bundle.
- **SQLite journal mode determines what files exist on disk at commit
  time.** Default is `DELETE` mode: `dev.db-journal` exists only while a
  transaction is mid-flight and is deleted at COMMIT. After `npm run seed`
  completes cleanly and Prisma disconnects, the journal file should be
  gone. WAL mode (`PRAGMA journal_mode=WAL`) leaves `-wal` and `-shm`
  sidecars permanently and would poison the commit. The seed script
  (`web/prisma/seed.ts`) does not change journal mode, so DELETE is the
  default — verify no sidecars present pre-commit.
- **Vercel serverless filesystem is read-only outside `/tmp`.** Any SQLite
  open call that defaults to read-write will fail when SQLite tries to
  create a `-journal` file next to the DB. Prisma's default open mode is
  read-write. This is the real risk of Option C and the reason for probe
  item (c).
- **Bundle path at runtime is not the same as cwd at dev time.** Local dev
  resolves `file:./dev.db` against `process.cwd() = web/`. On Vercel
  serverless, the working directory inside `/var/task/` is not guaranteed
  to be the project root, and the `web/` prefix collapses (Root Directory
  = `web` makes Vercel treat `web/` as the deploy root). Path resolution
  must be deterministic, not cwd-dependent.
- **Prisma engine bundling on Vercel.** Prisma's binary engine
  (`libquery_engine-{platform}.so.node`) lives in
  `node_modules/.prisma/client/` after `prisma generate` and must be
  traced into the serverless function's deploy artifact by Next's file-
  tracing (`outputFileTracingIncludes`). With Root Directory = `web`,
  Vercel's `@vercel/next` builder runs `npm ci` and `next build` inside
  `web/`, so `web/node_modules/.prisma/client/` is the source of truth.
  Whether file-tracing automatically picks up the engine is the failure
  mode probed by item (a).
- **Schema is unchanged.** `web/prisma/schema.prisma` provider stays
  `sqlite`. Existing migration `20260419141556_init` is the only one; no
  new migrations are added by this project. The `seed.ts` script is
  unchanged.
- **Reseed cycle is the deploy mechanism.** `npm run seed` rewrites
  `dev.db` in place; `git diff` sees a binary blob change; commit and push
  triggers Vercel auto-deploy. SQLite file size is tiny (~50KB at current
  scale, well under any practical limit). At one reseed/week × 14-week
  trimester × ~50KB = ~700KB total repo growth per term. Acceptable.
- **Prisma version policy is now part of Option C's lock** (PRD Q3): 5.x
  patch/minor allowed if it directly resolves a probe failure with
  documented evidence; 6.x rejected as Modernization v2 territory.

### Options Explored

#### Option A: `?mode=ro&immutable=1` in `DATABASE_URL`, absolute build-time path

- **Description**: Set the deployed `DATABASE_URL` to
  `file:/var/task/prisma/dev.db?mode=ro&immutable=1`, configured via
  Vercel project env vars (Production environment only). Local dev keeps
  `.env.local` with `DATABASE_URL=file:./dev.db`. The `?mode=ro` query
  string instructs SQLite (via libsqlite/Prisma's better-sqlite path) to
  open read-only; `&immutable=1` further promises SQLite the file will
  not change while open, which suppresses journal-file creation
  attempts entirely.
- **Pros**:
  - Solves probe items (b) and (c) in one shot.
  - `immutable=1` is the SQLite-blessed way to declare "this file is
    bundled read-only" — exactly Option C's contract.
  - Explicit absolute path eliminates cwd ambiguity at runtime.
  - Local dev unaffected (different `DATABASE_URL` via Vercel env var
    scoping).
- **Cons**:
  - `/var/task/prisma/dev.db` assumes Vercel preserves the `web/`-as-root
    layout as `/var/task/prisma/dev.db` (not `/var/task/web/prisma/dev.db`).
    With Root Directory = `web`, `web/` collapses into `/var/task/`, but
    this needs probe verification.
  - Prisma 5.x's SQLite connector must honor `?mode=ro` query params.
    Prisma documents `?connection_limit` and a few others; `?mode=ro` is
    SQLite-native and Prisma passes through unrecognized params to the
    underlying driver. **Verify in probe item (c).**
- **Effort**: Low. One env var, one `.gitignore` line, no code change.

#### Option B: Resolve absolute path at build via `__dirname`-relative URL

- **Description**: In `web/lib/prisma.ts` (or wherever `PrismaClient` is
  instantiated), construct the URL at runtime:
  ```ts
  import path from 'node:path';
  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  const prisma = new PrismaClient({
    datasources: { db: { url: `file:${dbPath}?mode=ro&immutable=1` } },
  });
  ```
- **Pros**:
  - No reliance on Vercel env-var configuration.
  - Self-documenting in code.
- **Cons**:
  - `process.cwd()` is still the variable we're trying to pin down. On
    Vercel serverless this is typically `/var/task/` but is not
    contractually guaranteed.
  - Mixes datasource configuration into application code, which goes
    against Prisma's "schema declares datasource" pattern.
  - Requires editing the Prisma client construction site, which currently
    uses the env-var pattern in both `seed.ts` and (presumably) the
    server actions.
- **Effort**: Medium — touches application code in addition to env config.

#### Option C: Copy `dev.db` to `/tmp` on cold start, point Prisma there

- **Description**: At serverless function init (top of the module, before
  Prisma client construction), copy the bundled `dev.db` from its read-
  only location into `/tmp/dev.db`. Open Prisma against `/tmp/dev.db`
  in normal read-write mode.
- **Pros**:
  - Sidesteps all read-only-filesystem questions: `/tmp` is writable.
  - Prisma needs no special URL handling.
- **Cons**:
  - Cold-start cost: ~50KB file copy adds milliseconds, negligible at
    this scale but still non-zero.
  - Per-invocation `/tmp` is shared within a warm container but isolated
    across cold starts; behavior is correct but the mental model is
    unnecessarily complicated for a read-only app.
  - Defeats the intent of `immutable=1` — we're now opening a writable
    DB that just happens to be a copy.
  - Adds initialization code that has to run before any request handler,
    increasing the surface for bugs.
- **Effort**: Medium — requires init-side-effect module + ordering care.

### Recommendation

**Option A is recommended for the runtime open path. Pair it with the
default DELETE journal mode (no change) and the un-ignore-`dev.db`-only
gitignore edit.** Concrete plumbing:

1. **`web/.gitignore` edit** (the stashed `wu-avk` change):
   ```diff
   # prisma / sqlite
   -/prisma/dev.db
   -/prisma/dev.db-journal
   +# /prisma/dev.db is committed (Option C — read-only bundle on Vercel)
   +/prisma/dev.db-journal
   +/prisma/dev.db-wal
   +/prisma/dev.db-shm
   ```
   Keep the journal/wal/shm ignores — those are runtime sidecars that
   must never enter the repo.

2. **Pre-commit checkpoint verification** (manual, included in the seed
   workflow): after `npm run seed`, confirm no `dev.db-journal`,
   `dev.db-wal`, or `dev.db-shm` files exist in `web/prisma/`. If any
   do, the seed didn't checkpoint cleanly — re-run or
   `sqlite3 web/prisma/dev.db 'PRAGMA wal_checkpoint(TRUNCATE);'`
   before committing.

3. **Vercel project env var**: set `DATABASE_URL` (Production scope) to
   `file:/var/task/prisma/dev.db?mode=ro&immutable=1`. Probe item (b)
   confirms the absolute path; if `/var/task/prisma/dev.db` is wrong,
   the probe fails fast with a `SQLITE_CANTOPEN` and the polecat tries
   `/var/task/web/prisma/dev.db` next.

4. **Local dev untouched**: `.env.local` keeps `DATABASE_URL=file:./dev.db`,
   no `?mode=ro` (so seed can write). Vercel env var only applies in the
   deployed runtime.

5. **`schema.prisma` engine target**: add explicit binary targets if probe
   item (a) fails:
   ```prisma
   generator client {
     provider      = "prisma-client-js"
     binaryTargets = ["native", "rhel-openssl-3.0.x"]
   }
   ```
   Vercel's serverless runtime is currently AL2/AL2023 with OpenSSL 3.x;
   `rhel-openssl-3.0.x` is the matching Prisma binary. Default `native`
   only emits the build-host target (likely `darwin-arm64` for Rongjun's
   M-series Mac), which would NOT run on Vercel. **This is the most
   likely cause of a probe-item-(a) failure** and the most likely
   trigger for the documented Prisma patch-bump policy (PRD Q3).

6. **Output location**: do NOT add a custom `output` field to the
   generator. Default `node_modules/.prisma/client` is what Next's
   `outputFileTracingIncludes` expects to find; a custom output breaks
   tracing and is the second-most-common Prisma-on-Vercel failure mode.

#### Probe-bead acceptance criteria (concrete pass/fail)

The probe bead implements one Vercel deploy of a `probe/` route that
exercises all three items. Each item is independently graded.

**(a) Prisma engine bundling on Vercel with Root Directory = `web`**
- **Pass**: `GET /probe` returns 200 with body
  `{ "engine": "ok", "version": "<prisma 5.22.0>" }`. Vercel function
  logs show no `Cannot find module '.prisma/client'`, no
  `PrismaClientInitializationError: Query engine library for current
  platform "rhel-openssl-3.0.x" could not be found`.
- **Fail**: any of:
  - 500 with `Cannot find module '.prisma/client/default'`
  - 500 with engine-not-found error citing `rhel-openssl-3.0.x` or
    `linux-musl`
  - cold-start exceeds 10s (engine missing forces fallback resolution)
- **Documented evidence template** (for the Prisma patch-bump policy):
  paste the exact error string from the Vercel function log, link to
  Prisma GitHub issue or release notes describing the fix, name the
  exact 5.x.y version that resolves it.

**(b) `DATABASE_URL` path resolution at runtime**
- **Pass**: `GET /probe` successfully runs `prisma.term.count()` and
  returns `{ "termCount": 1 }`. The resolved path printed in the
  response (`file:/var/task/prisma/dev.db?mode=ro&immutable=1`) matches
  what Vercel actually serves.
- **Fail**: `SQLITE_CANTOPEN: unable to open database file` with the
  attempted absolute path in the error message. Polecat then tries the
  alternate path (`/var/task/web/prisma/dev.db`); if neither works, this
  item fails and triggers the Option B pivot (PRD Q2).

**(c) SQLite journal-mode behavior on read-only filesystem**
- **Pass**: `GET /probe` runs **two sequential reads** without error.
  Vercel logs show no `attempt to write a readonly database`, no
  `unable to open database file` on the second call (which would
  indicate journal-file creation failed and corrupted the handle).
- **Fail**: any error matching `readonly database`, `journal`,
  `SQLITE_READONLY`, or `SQLITE_IOERR_WRITE` in the Vercel logs.
  Mitigations to try in order before declaring probe failure:
  1. Confirm `?mode=ro&immutable=1` is in the URL Prisma actually
     receives (log it).
  2. Try `?mode=ro` only (drop `immutable=1`) in case Prisma's URL
     parser strips it.
  3. Fall back to Option C (copy-to-`/tmp`) as a last-resort patch
     before pivoting.

**Probe bead exit decision tree**:
- All 3 pass → close probe, proceed with deploy.
- (a) fails AND a 5.x.y bump fixes it with documented evidence → bump,
  re-probe, proceed.
- Any item fails after reasonable mitigation → file P0 bead "Switch to
  Option B", stop Deploy per PRD Q2.

## Constraints Identified

- **Schema is frozen.** No fields, no models, no migrations added by
  this project. `web/prisma/schema.prisma` and
  `web/prisma/migrations/20260419141556_init/` stay byte-identical.
- **Prisma version pinned at 5.22.0** with the documented carve-out for
  patch/minor bumps that resolve probe failures. 6.x is rejected.
- **`dev.db` must be checkpointed before commit** — no `-journal`,
  `-wal`, or `-shm` files in `web/prisma/` at commit time. Default
  DELETE journal mode + clean Prisma disconnect handles this; verify
  with `ls web/prisma/*.db*` pre-commit.
- **Local dev `DATABASE_URL` ≠ deployed `DATABASE_URL`.** Local must be
  read-write (so seed can write); deployed must be read-only (so
  Vercel's read-only filesystem doesn't reject open). Enforced by
  scope-separating env vars (`.env.local` vs Vercel project settings).
- **No `output` field in the Prisma generator.** Default location is
  required for Next file-tracing to pick up the engine.
- **Seed JSON path stays `web/data/seed/grades.json`.** The seed script
  resolves it via `__dirname`-relative path, which is robust.
- **Reseed workflow is fixed**: edit `grades.json` → `npm run seed` →
  verify no journal sidecars → `git add web/prisma/dev.db
  web/data/seed/grades.json` → commit → push → Vercel auto-deploys.

## Open Questions

- **Is `/var/task/prisma/dev.db` actually where Vercel puts the bundled
  file when Root Directory = `web`?** Probe item (b) is the empirical
  answer. Plausible alternatives: `/var/task/web/prisma/dev.db`,
  `/vercel/path0/prisma/dev.db`. The probe must log the actual cwd and
  `__dirname` so the polecat can pick the right absolute path.
- **Does Prisma 5.22.0 strip or pass through SQLite's `?mode=ro` and
  `?immutable=1` URL parameters?** Per Prisma docs, unrecognized SQLite
  URL params are passed to the underlying driver. Probe item (c)
  verifies. If stripped, Option C ("copy to `/tmp`") becomes the
  fallback inside Option C, before any pivot to B.
- **Does `npm run seed` ever leave a `-journal` sidecar behind in
  practice?** Default DELETE mode + clean Prisma `$disconnect()` (called
  in `seed.ts:128`) should always clear it, but a crashed seed could
  leave a stale journal. **Add a pre-commit `ls` check or git hook?**
  Out of scope for the data dimension to enforce, but flag as an
  integration point with the dev-workflow / commit-hygiene concern.
- **Should `*.db` files have an explicit `.gitattributes` entry as
  binary?** Git correctly auto-detects SQLite as binary, so this is
  cosmetic. Recommendation: **skip for now**, add only if `git diff` on
  a reseed commit ever produces noisy "binary files differ" warnings
  someone wants to suppress with `binary` attribute. Not a Deploy
  blocker.
- **Does Vercel rebuild when only `dev.db` changes (no `.ts`/`.tsx`
  source edits)?** PRD Open Question #3. Vercel's GitHub integration
  rebuilds on any push to the configured branch by default — file
  filtering would be opt-in via "Ignored Build Step" config. As long
  as that's left at default, a `dev.db`-only push triggers a full
  rebuild. Verify during reseed-and-redeploy smoke (PRD goal #3).

## Integration Points

- **API/route dimension** owns whether `export const dynamic =
  'force-dynamic'` lands on `/grades` and `/subject/[id]`. Without it,
  Next 16 will SSG the routes at build time and Option C's "fresh per
  request" promise silently breaks. The data layer's contract — "every
  request reads from the bundled `dev.db`" — depends on that route
  flag. Cross-reference with `routes.md`.
- **API/route dimension** also owns the empty-assignments zero-state
  rendering. The data-layer question is: should the subject subtitle
  be **computed from the assignments list at render time** (which is
  a render-layer change, no schema/data change) or **derived from a
  new "computed grade" column** (which would be a schema change and
  is therefore rejected by the schema-frozen constraint)? **Answer:
  render-layer only.** The existing `Subject.currentGrade` and
  `Subject.currentPercent` fields stay; the rendering component
  conditions on `assignments.length === 0` and substitutes the
  zero-state string. This is an API/UX integration concern; data
  dimension's only contribution is to confirm no schema change is
  needed to enable it.
- **Build/deploy dimension** owns the Vercel project config (Root
  Directory = `web`, env var `DATABASE_URL`, build command). Data
  dimension supplies the exact `DATABASE_URL` value.
- **Pivot path to Option B** (Postgres on Neon) inherits from this
  layer:
  - `schema.prisma` `provider = "sqlite"` becomes `provider =
    "postgresql"`.
  - `web/prisma/migrations/` is reset (`prisma migrate reset` against
    a fresh Postgres DB; existing SQLite migration is provider-
    specific and not reusable).
  - `seed.ts` runs unchanged (it's provider-agnostic, uses Prisma
    Client).
  - `web/data/seed/grades.json` is unchanged (data is the
    source-of-truth).
  - `DATABASE_URL` becomes the Neon-issued connection string.
  - Reseed workflow changes from "commit `dev.db` and push" to "run
    `npm run seed` against the production Postgres URL"; loses the
    nice "git is the deploy mechanism" property of Option C.
  Per PRD Q2, all of this lives in a separate "Postgres Migration"
  project, not inlined into Deploy. The data dimension's deliverable
  for the pivot is: schema and seed-script are already provider-
  abstracted, so the pivot is mostly Vercel-config + Neon-provisioning
  work, not a data-model rewrite.
- **Repo-growth concern**: at one reseed/week × ~14 weeks/trimester ×
  ~50KB binary blob = ~700KB/term, ~2MB/year. Acceptable indefinitely.
  No Git LFS needed. If the data scale ever 100x's (e.g. multi-student,
  multi-year history), revisit.

---

data.md written

# Scalability Analysis

## Summary

The "scale" axis for this project is a one-line baseline: **one user
(Shuhan, ~age 11), 1–3 page loads/day, during a single ~14-week school
trimester, read-only**. That is effectively zero RPS. Almost every
classical scaling lever — CDN tuning, connection pooling, ISR
re-validation windows, autoscaling — is irrelevant. The honest
deliverable for this dimension is **explicit permission to not
optimize**: state the baseline plainly so other dimensions don't
accidentally calibrate against an imagined production workload.

That said, Vercel's serverless model has a few real concerns even at
trivial RPS: every infrequent visit will pay a Prisma engine cold-start
cost, the bundled `dev.db` lives inside the deployment artifact (so
it shares the 250MB compressed limit), and `force-dynamic` means
each request hits Prisma rather than the CDN. None of those bite at
1 user × 3 loads/day, but they all have inflection points worth
naming so a future Rongjun (or a future polecat picking up Modernization
v2) knows when "do nothing" stops being the right answer.

## Analysis

### Key Considerations

- **Load profile baseline.** ~1 user × 1–3 loads/day during the
  school year. Trimester 3 ends 2026-05-30. Effective RPS:
  ~3 / 86,400 ≈ 3.5e-5. Peak concurrency: 1. There is no second
  user. There is no robot. There is no warm-up traffic. Calibrate
  every other recommendation against this.
- **Cold-start dominates perceived latency.** Vercel Hobby
  serverless functions cold-start when idle. With 1–3 visits/day
  spread across waking hours, **every visit is effectively a cold
  start.** Prisma engine init on a serverless function is
  ~200–500ms (binary engine must be unpacked / loaded;
  `@prisma/client` runtime instantiated; SQLite connection opened).
  Add Next 16 RSC render + initial HTML stream and the realistic
  TTFB for `/grades` is roughly 600–1500ms cold. Warm: <100ms.
  Shuhan will almost always see cold.
- **`force-dynamic` removes the CDN cache for `/grades` and
  `/subject/[id]`.** Per PRD goal #2 (locked), this is correct —
  SSG would freeze grades at build time and silently break the
  reseed cycle. The cost is the cold-start above, paid every visit.
  This trade is the right one for this product.
- **Bundle size of `dev.db`.** The seed JSON drives an SQLite file
  that grows roughly linearly with assignment count: estimate
  ~50KB × 14 weeks ≈ <1MB by end of trimester. Vercel deployment
  artifact limit (Hobby): **250MB compressed / ~500MB uncompressed.**
  Headroom: 500×. No action. Inflection point: if `dev.db` ever
  exceeds ~50MB (e.g., expanding to multi-year history or
  rich-media assignments), reconsider — but that is a different
  product, not this one.
- **Memory.** Vercel Hobby serverless function default: **1024MB.**
  Prisma engine + SQLite read-only + Next 16 RSC: comfortably
  <200MB. No concern.
- **Build time.** Next 16 production build with Prisma generate +
  Tailwind 3 JIT: rough estimate **60–120s on Vercel** for a project
  this size. Each reseed triggers a full rebuild → ~1–3 min from
  `git push` to the new data being live. PRD goal #3 explicitly
  accepts this cycle. State the SLA so the smoke step has a
  known wait window.
- **SQLite concurrency / locking.** Read-only mode (no journal
  writes) means no lock contention. Each serverless instance opens
  its own file handle into the bundled `dev.db`. With ~1 RPS peak
  and read-only access, lock contention is impossible. The probe
  bead (locked, per PRD Open Question #1) verifies the journal-mode
  behavior on Vercel's read-only filesystem; that is the gate.
- **Vercel Hobby tier limits, sanity-checked:**
  - Monthly invocations: **100,000.** Actual: ~90/month. Headroom: 1100×.
  - Function execution timeout: **10s.** Actual: <500ms cold, <100ms warm. Fine.
  - Build minutes: **6,000/mo.** Actual: ~1 reseed/week × 2min = 8min/mo. Fine.
  - Egress bandwidth: **100GB/mo.** Actual: ~1MB/page × 90 loads = ~90MB/mo. Fine.
  - Concurrent builds: **1.** Actual: 1 reseed cycle at a time. Fine.
  None of these are within an order of magnitude of being threatened.
- **Build-time vs request-time work.** Prisma `generate` runs at
  build (via `postinstall`). Engine binaries ship in the deployment.
  Schema is fixed. None of this is in the request path — the
  request path is purely `prisma.subject.findMany()` against an
  open SQLite handle.
- **CDN / static assets.** Default Next 16 behavior. Fonts via
  `app/fonts` (Next-managed). Tailwind output is hashed and
  immutable-cached. No tuning required.
- **Long-term repo growth from binary `dev.db` commits.** Git
  stores binary blobs in pack files; weekly reseeds over years
  will accumulate. At ~1MB per commit × 14 weeks ≈ ~14MB/trimester
  of pack growth (uncompressed). Repo currently ~tens of MB.
  Inflection: if repo total ever exceeds ~100MB, consider git LFS
  or pruning history. **Not a current concern.** Note as a future
  trigger; do not act now.

### Options Explored

#### Option 1: Accept cold-start, no caching layer, no warmup (recommended)

- **Description**: Deploy with `force-dynamic` per PRD. Every
  visit pays ~600–1500ms cold-start TTFB. Do nothing. Document
  the expected timing in the smoke notes so it isn't mistaken
  for a regression.
- **Pros**: Zero added complexity. Honest to the product (kid
  checks grades, waits 1 second, sees grades). Matches the PRD
  freshness contract exactly.
- **Cons**: First-load TTFB is visibly slower than a static page.
  For an 11-year-old on a phone, 1.5s is at the edge of "feels
  slow" but well inside "still works."
- **Effort**: None.

#### Option 2: ISR with `revalidate: 0`

- **Description**: Replace `force-dynamic` with `revalidate: 0`
  to allow per-request regeneration with potential ISR caching.
- **Pros**: Marginally cleaner Next 16 idiom in some readings.
- **Cons**: Functionally identical to `force-dynamic` — still
  pays cold-start, still hits Prisma every request. No throughput
  gain at 1 user. Adds confusion vs. the PRD's locked
  `force-dynamic` decision. Net: nothing won.
- **Effort**: Low, but pointless.

#### Option 3: Keep-warm cron pinging `/grades` every 5 minutes

- **Description**: Vercel Cron (or external cron) fires GET
  `/grades` every N minutes to keep the function warm.
- **Pros**: Eliminates cold-start for human visits.
- **Cons**: 12/hour × 24h × 30d = 8,640 invocations/month just
  for warmup, vs. ~90 real visits — 99% of compute spent on
  warm-keeping. Burns Hobby quota for nothing. Worse: makes
  the deploy feel "production" in a way that invites
  over-engineering on the next pass. **Premature optimization
  with negative ROI.**
- **Effort**: Low to add, easy to forget about.

#### Option 4: Edge Runtime instead of Node serverless

- **Description**: Set `export const runtime = 'edge'` on
  `/grades` and `/subject/[id]` to get sub-100ms cold-start.
- **Cons**: **Incompatible with Prisma's Node engine.** Prisma 5
  on Edge requires Prisma Accelerate or the Driver Adapter pattern,
  neither of which works with bundled SQLite. Non-starter under
  Option C lock.
- **Effort**: N/A — blocked by Option C.

### Recommendation

**Option 1.** Do nothing. Accept the cold-start. The user is one
11-year-old checking a page 1–3 times per day; sub-second cold-start
is fine, sub-2-second cold-start is acceptable. Document the
expected TTFB band (~600–1500ms cold, <100ms warm) in the smoke
checklist so the first measurement isn't misread as broken.

The single scalability action item is **measurement, not
optimization**: capture cold-start TTFB once during the live
smoke pass, write it down, move on. If a future use case expands
the load profile (a sibling joins, parents check too, etc.), revisit
Option 3 with real numbers.

#### Pivot-to-Option-B scaling notes (informational)

If the Option C probe fails and the project is paused for a
"Switch to Option B" project (per PRD locked carve-out), the
scaling shape changes:

- **Neon free tier compute** auto-suspends after ~5min idle. At
  1–3 visits/day, **every visit also pays a Neon cold-start**
  (~500ms–2s wake), on top of Prisma engine init. Net TTFB:
  comparable to Option C cold, possibly worse on first visit
  after a long idle window.
- **Connection pooling** matters for serverless + Postgres in a
  way it doesn't for SQLite. Prisma Accelerate or a PgBouncer
  endpoint becomes the right call to avoid connection exhaustion
  at scale — but at 1 user, a direct connection is fine.
- **Free tier limits** (Neon Hobby): 0.5GB storage, ~191
  compute-hours/mo. Storage: massive headroom. Compute: with
  auto-suspend and ~3 visits/day waking the compute briefly,
  well within budget.

This paragraph exists so the pivot estimate is realistic, not for
execution here. **Option B does not change the recommendation for
this project.**

## Constraints Identified

- **Cold-start TTFB band: ~600–1500ms.** Soft expectation, not a
  hard gate. Record once during the live smoke pass. Anything
  >3s on a warm function is a signal something is wrong.
- **`dev.db` <50MB inflection.** Below 50MB, ship as-is. Above,
  reconsider Option C entirely (storage, build artifact, repo
  bloat all converge).
- **Reseed-to-live SLA: ~1–3min build time.** Documented so the
  smoke checklist's reseed step has a known wait window.
- **No caching layer added.** No `'use cache'`, no ISR with TTL,
  no in-memory memoization. PRD goal #2 says fresh per request;
  honor it.
- **No keep-warm scheduling.** Cold-start is acceptable; warming
  burns more compute than it saves.
- **Repo size watch trigger: 100MB total.** Below this, no action.
  Above, consider git LFS for `dev.db` history.

## Open Questions

- **Is the cold-start TTFB band realistic for this exact stack?**
  ~200–500ms Prisma init is folklore-level accurate but not
  measured for this app. Recommend: capture one timed cold load
  during the Option C probe bead and note it in
  `notes/deploy-smoke.md`. Don't make it a gate — make it a
  data point.
- **Does Vercel's build cache shorten reseed-redeploy time?** A
  rebuild where the only changed file is `dev.db` should still
  reuse the `node_modules`, Prisma generate output, and Next
  build cache, dropping the 60–120s estimate to maybe 30–60s.
  Worth observing on the first reseed cycle, but not worth
  engineering for. If the second reseed comes in noticeably
  faster than the first, the cache is doing its job.
- **Does the `dev.db` change actually trigger a Vercel rebuild?**
  This is also PRD Open Question #3 (data dimension owns it).
  Mentioned here only because if the answer is "no," the entire
  reseed cycle is broken and the scaling story needs revisiting
  (manual redeploy trigger added). Defer to data leg.

## Integration Points

- **Data dimension** — owns the Option C probe and the
  reseed-trigger verification. Scaling depends on those working;
  if either fails, this analysis is moot and the pivot
  scaling-note paragraph activates.
- **UX dimension** — cold-start TTFB is load-time UX. The
  ~600–1500ms band is "acceptable for an 11-year-old on a
  phone" but worth flagging if UX wants to add a loading
  shimmer or splash to make the first second feel intentional.
- **Integration / smoke dimension** — the reseed-to-live SLA
  (~1–3min) and cold-start TTFB measurement both live on the
  smoke checklist. They are observations, not gates.
- **Pivot decision (overseer)** — the Option-B scaling note is
  pre-positioned so the "Switch to Option B" project, if it
  ever opens, doesn't have to re-derive Neon's cold-start
  characteristics from scratch.

# Scalability Analysis

## Summary

This is a single-user grade-tracker with a ~30-file App Router surface,
a local SQLite DB, and no concurrent-user story. Classical scale
concerns (QPS, data size, cache hit rate) are effectively irrelevant.
The one scale-adjacent concern is **Next 16's caching model change**:
the implicit fetch cache that P1–P5 relied on is replaced by opt-in
`'use cache'` / `cacheLife` / `cacheTag`. The PRD explicitly scopes
the caching redesign out, but the *behavioral* implication — whether
`/grades` serves stale data by default post-upgrade — is in scope for
verification, not redesign. The other scale dimension worth naming is
**build performance**: Turbopack-in-prod vs. webpack changes bundle
shape, and a 2× blow-up would violate invisibility at load time.

## Analysis

### Key Considerations

- **No load-scale axis.** App is local-dev + Shuhan's laptop. No
  production traffic, no concurrent writes, no CDN.
- **Caching-model change is the scale-adjacent landmine.** Next 14's
  implicit fetch cache and `force-dynamic` conventions are replaced
  in Next 16 by: default static rendering where possible, opt-in
  `'use cache'` directive for explicit caching, `cacheLife` and
  `cacheTag` for invalidation. `/grades` and `/subject/[id]` today
  use Prisma calls (not `fetch`), so the implicit fetch cache does
  not apply. But Next 16's default static-rendering heuristic may
  freeze a Server Component that reads from Prisma at build time,
  causing stale data on subsequent requests.
- **Build time and bundle size.** Turbopack is production-grade in
  Next 16. Build-time faster; bundle shape may differ. Review
  flagged "record `.next/static` sizes in Phase 1 baseline" as
  cheap and non-blocking. Bundle regression matters for initial
  paint — invisible at runtime but visible at load time.
- **Memory / CPU.** Local dev only. Not a factor.
- **Degradation at scale.** The app will never scale. If Deploy
  eventually serves Shuhan over the public internet, the scale story
  becomes "one user, one DB, one request at a time." Caching matters
  only for freshness, not throughput.
- **Cold-start latency.** `npm run dev` cold start is the developer
  experience scale axis. Turbopack claims 2–10× faster cold starts.
  Verify in baseline; regression would be a signal something else
  broke.

### Options Explored

#### Option 1: Baseline bundle + cold-start, verify data-freshness, no caching redesign (recommended)

- **Description**: Phase 1 baseline captures `.next/static` directory
  size, first-paint bundle size (from build output), and `npm run
  dev` cold-start wall-clock. Phase 5 smoke includes the mutate-probe
  for `/grades` freshness. No `'use cache'` annotations added.
- **Pros**: Non-intrusive. Detects bundle regression. Detects
  freshness regression. Respects Non-Goal.
- **Cons**: If Next 16 does freeze `/grades` as static, the
  mutate-probe will catch it but the fix (`force-dynamic` or
  `'use cache'` semantics) is technically a caching-redesign
  boundary hop. See data leg for the fallback rule.
- **Effort**: Low.

#### Option 2: Add `'use cache'` + `cacheLife` annotations to `/grades` preemptively

- **Description**: Adopt the new caching model as part of the
  upgrade.
- **Pros**: Lands at a clean, on-current-model state.
- **Cons**: Violates Non-Goal. Adds decision surface to what's
  supposed to be a mechanical upgrade.
- **Effort**: Medium — requires cache-semantic decisions (TTL,
  invalidation triggers).

#### Option 3: Punt all caching/freshness verification to Deploy

- **Description**: Ignore mutate-probe here. Trust that Next's
  default behavior works. If Deploy finds a regression, fix it
  there.
- **Pros**: Sharpest scope for this project.
- **Cons**: Silent regression risk. Polecat can declare success
  while `/grades` permanently serves seed data. Contradicts the
  "invisible" success criterion.
- **Effort**: Lowest — regression-unsafe.

### Recommendation

**Option 1**. Baseline the bundle, cold-start time, and build wall-clock
in Phase 1. Run mutate-probe in Phase 5. If mutate-probe shows stale,
apply the minimum fix (`force-dynamic` on `/grades`) and file a bead
documenting the caching-redesign handoff to Deploy. Do not proactively
add `'use cache'` anywhere.

## Constraints Identified

- Bundle size must not regress by >2× (soft gate — record, don't
  hard-fail).
- `npm run dev` cold-start must not regress materially (record only).
- `/grades` must reflect DB mutations within one reload (hard gate
  per data leg).
- No new `'use cache'` directives added as part of this project.

## Open Questions

- **What counts as "material" cold-start regression?** Turbopack
  default means cold-start is expected to get faster. A 2× slowdown
  is a signal; a 10% slowdown is noise. Proposed: flag anything >50%
  slower than baseline for investigation, but do not block on it.
- **Does `.next/static` size include all chunk types the baseline
  should capture?** Recommend `du -sh web/.next/static` +
  `web/.next/analyze/*` if build-analyze runs. Keep it to one line
  in the baseline doc.

## Integration Points

- **Data dimension** — mutate-probe is the shared freshness check.
- **UX dimension** — bundle regression is load-time UX.
- **Integration dimension** — bundle diff is a signal for bisect if
  something feels "off" post-merge.

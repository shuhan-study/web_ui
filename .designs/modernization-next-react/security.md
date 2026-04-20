# Security Analysis

## Summary

This is a local, single-user app with no authentication, no external
API surface, no network-exposed inputs, and no production deployment.
The security dimension is **narrow** and mostly reduces to (a) supply-chain
hygiene during the dep bump, (b) ensuring the upgrade does not inadvertently
expose a server-action or route handler that shouldn't exist, and (c)
making sure the lockfile regeneration does not pull in known-vulnerable
transitive versions. Threat model is effectively "careless or unlucky
dependency picks," not an active adversary.

## Analysis

### Key Considerations

- **No auth, no sessions, no secrets.** The app has no login, no JWT,
  no cookies-with-auth-data, no API keys stored at runtime. Prisma
  connects to a local SQLite file. The upgrade does not change this.
- **Supply chain is the primary attack surface.** Every dep bumped
  brings its transitive graph with it. The PRD's ban on transitive
  majors narrows this, but minors can still introduce compromised
  versions (historical e.g., `ua-parser-js` typosquats).
  Verification: `npm audit` before and after, flag delta.
- **Server actions.** `utils/actions.ts` exports async functions with
  `'use server'`. React 19 does not change the serialization format
  or the bundler's origin-check enforcement, but Next 16 ships
  stricter default origin validation for server actions (inherited
  from 15.x). Verify no regression on form submissions — there
  aren't any today, but a silent `'use server'` file that no longer
  works would be a failure.
- **`eval`, `dangerouslySetInnerHTML`, `Function()` constructors.**
  Grep-confirmed none in the app. Upgrade should not introduce any.
  If codemod output contains a `dangerouslySetInnerHTML`, reject the
  diff.
- **Sourcemaps in production bundle.** Next 16 defaults here may
  differ. If maps leak to production, no real attack (local-only app)
  but a signal something changed.
- **`engines.node` pinning (API leg).** Node 20.9+ floor excludes a
  tier of older Node versions with known CVEs. Pinning is a small
  positive security outcome, not a primary motivation.
- **`postinstall` scripts in transitive deps.** Each new dep version
  can ship a postinstall. `npm ci` with `--ignore-scripts=false`
  (default) will run them. Cheap hygiene: run `npm ci
  --ignore-scripts` first to verify lockfile resolves, then a second
  `npm ci` to actually install with scripts enabled. Slight
  paranoia, proportional to the supply-chain dimension.

### Options Explored

#### Option 1: `npm audit` delta + lockfile review (recommended)

- **Description**: Phase 1 baseline captures `npm audit` output.
  Phase 4 after lockfile regeneration captures it again. Any new
  High or Critical is a hard gate: stop, investigate, file a bead.
  Moderate and low noted in the final tag notes. Polecat spot-checks
  the regenerated lockfile for any dep that jumped a major without
  being in the audited set.
- **Pros**: Free (ships with npm). Falsifiable. Deltas are
  actionable.
- **Cons**: `npm audit` is noisy and has false positives. Requires
  judgment on dev-dep vs. runtime-dep severity.
- **Effort**: Low.

#### Option 2: Snyk / socket.dev / external scanner

- **Description**: Plug in a third-party supply-chain scanner.
- **Pros**: More signal, better known-bad detection.
- **Cons**: New tool dependency, auth surface, out of spirit for a
  maintenance project.
- **Effort**: Medium.

#### Option 3: No security check

- **Description**: Trust the maintainer's judgment. Skip audit.
- **Pros**: Fastest.
- **Cons**: Loses a cheap signal.
- **Effort**: Lowest — but misses free wins.

### Recommendation

**Option 1**. `npm audit` before and after. Hard gate on new High/Critical
in runtime deps. Soft note on everything else. This is proportional to
the project's actual threat model.

## Constraints Identified

- No new High or Critical runtime CVEs introduced.
- No new `dangerouslySetInnerHTML` / `eval` usage in codemod output.
- No new network origin in the bundled code (e.g., a CDN-fetch helper
  drifted in via a Radix bump).
- Lockfile must be reproducible — `npm ci` from a clean `node_modules`
  produces the same tree every time.

## Open Questions

- **Are moderate CVEs in dev-dependencies blockers?** Recommend: no,
  note them only. Dev deps do not ship to the (non-existent)
  production surface. If Deploy eventually exposes the app publicly,
  reassess there.
- **Should `engines.node` be pinned for a security reason or an
  ergonomics reason?** Both. But framing: pin it as an ergonomics
  move per the API leg; security is a bonus.

## Integration Points

- **API dimension** — lockfile hygiene and `engines.node` pinning
  are shared surface.
- **Integration dimension** — `npm audit` delta goes into the
  baseline doc and the tag notes.
- **Data dimension** — no overlap; Prisma stays pinned, no new
  DB-driver CVEs expected.

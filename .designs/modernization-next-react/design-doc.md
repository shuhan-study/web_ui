# Design: Modernization — Next 14.2.35 → 16 + React 18 → 19

## Executive Summary

`web_ui` is a ~30-file App Router grade-tracker on Next 14.2.35 / React 18.
The upgrade is structurally tractable — grep-confirmed absence of `React.FC`,
`useFormState`, and `PropsWithChildren`, empty `next.config.mjs`, no
middleware, no Edge runtime, Node v22.16.0 (well above Next 16's 20.9 floor).
The real risk concentrates in **three surfaces**, all named in the PRD review
and now pinned by this design:

1. **`dropdown-menu.tsx` + Radix forwardRef composition.** The `types-react-
   codemod preset-19` rewrite is likely correct for flat `forwardRef` files
   (`card.tsx`, `table.tsx`, `button.tsx`) and risky for `dropdown-menu.tsx`
   because it composes Radix's own `forwardRef` primitives. Hand-review
   required; be prepared to hand-write the React 19 version.
2. **Caching-model change on `/grades`.** Next 16's default-static-where-
   possible + `'use cache'` opt-in model replaces the implicit fetch cache.
   `/grades` reads from Prisma (not `fetch`), so the risk is default-static
   freezing of seed-time data. Mutate-probe in Phase 5 is a hard gate.
3. **Reproducibility for the maintainer.** End-user invisibility requires
   the maintainer to cleanly `git pull && npm ci && npx prisma generate &&
   npm run dev` without manual recovery. `postinstall` script and
   `engines.node` pin are cheap enablers.

Recommended path: **atomic 14 → 16 + 18 → 19 bump** (per the problem
statement) executed as **~8-12 linear commits** anchored by
`v0.5-pre-modernization` on `main`. Commits split codemod output, hand
fixes, and transitive dep bumps so bisect is trivial later. Success is
falsifiable via a committed baseline artifact (`notes/modernization-
baseline.md`) and a named-route smoke checklist exercised by the
maintainer post-merge.

## Problem Statement

Upgrade `web_ui` from **Next 14.2.35 → 16** (direct, skipping 15) and
**React 18 → 19** without user-visible regression. Tailwind 3 stays,
Prisma stays, shadcn hand-seeded components stay unless build / runtime /
peer-dep conflict. Maintenance project — no new features, no new routes,
no data-model changes. Phase 1 must produce a committed baseline artifact.
Stop if blocked >4 hours. No transitive major upgrades.

## Proposed Design

### Overview

Atomic framework bump driven by codemods, with disciplined commit
granularity. Pre-upgrade anchor tag enables one-command rollback. Phase 1
baseline and Phase 5 smoke checklist make the "looks identical" criterion
falsifiable. Caching-model change is addressed by a targeted mutate-probe,
not a caching redesign.

### Key Components

- **Pre-upgrade anchor tag** `v0.5-pre-modernization` on `main` (cut by
  the maintainer — see Tag ownership decision).
- **Baseline artifact** `notes/modernization-baseline.md` capturing build
  output, dev startup log, per-route browser-console snapshot, `tsc
  --noEmit` error count, `.next/static` bundle size, `npm audit` output,
  `prisma migrate status`, row counts.
- **Atomic codemod chain** — `types-react-codemod preset-19` first, then
  `@next/codemod@latest upgrade latest`, then hand-fixes for anything the
  codemods missed (notably `dropdown-menu.tsx`).
- **Transitive dep audit** — one commit per dep bump, bounded by the
  "no transitive majors" rule.
- **Smoke checklist** — `notes/modernization-smoke.md` committed with the
  named-route probes; maintainer executes browser probes post-merge.
- **Freshness fallback** — if `/grades` serves stale data after upgrade,
  add `export const dynamic = 'force-dynamic'` to
  `web/app/grades/page.tsx` as the minimum fix, file a bead documenting
  the caching-redesign handoff to Deploy. Applying `force-dynamic`
  overrides PRD OQ5's deferral instinct **only when the smoke mutate-
  probe shows a live regression**; if freshness is intact post-upgrade,
  no annotation is added and the caching question remains Deploy's.

### Interface

**Fresh-clone bootstrap** (do once per clone — applies to maintainer clones AND polecat workspaces):

```
cd web                       # all npm/npx commands in this doc run from web/
cp .env.example .env         # creates DATABASE_URL=file:./dev.db
npx prisma db push           # creates tables in dev.db
npx prisma db seed           # loads seed data (or hand-seed if script not configured)
```

Skip any step already done in the current clone. `.env` and `dev.db` are gitignored, so a fresh clone always needs this.

**Maintainer's post-upgrade CLI path** (the only user-facing API surface):

```
git pull --rebase
npm ci                      # must complete with no peer-dep warnings
npx prisma generate         # manual, unless postinstall is added
npm run dev                 # must cold-start without server errors
# …then browser smoke checklist
```

**Optional `postinstall` addition** (recommended — see API leg Q):

```json
"scripts": {
  "postinstall": "prisma generate"
}
```

**Optional `engines` pin** (recommended — see API leg Q):

```json
"engines": { "node": ">=20.9" }
```

### Data Model

**Frozen.** Prisma schema, seed data, `utils/actions.ts` signatures
unchanged. Data-freshness verified via mutate-probe, not schema change.

## Trade-offs and Decisions

### Decisions Made (by this design, given problem-statement constraints)

- **Atomic 14 → 16 path.** Pinned by problem statement. No intermediate
  green build at Next 15; only anchor is `v0.5-pre-modernization`.
  (Resolves review Q6.)
- **React + Next bumped together**, not "React 19 first on Next 14."
  The latter requires `--legacy-peer-deps` (banned). Collapse into one
  atomic `package.json` edit, one commit. (Resolves review ambiguity-leg
  critical #2.)
- **Baseline artifact is a Phase 1 hard gate.** Committed as
  `notes/modernization-baseline.md`. (Resolves review Q1.)
- **"Runtime error" bar**: fail on `console.error` in browser, fail on
  any new server-log entry **class** not present in the baseline
  (timestamps and request IDs drift naturally; only error/warning-
  level classes count), tolerate dev-only `console.warn` deprecations.
  Capture all three buckets in the baseline for later diff. (Resolves
  review Q2.)
- **Build-warning delta bar.** New build-time warning *classes*
  relative to the Phase-1 baseline must be explicitly acknowledged in
  the smoke delta or filed as a follow-on bead. Numerical-count drift
  on pre-existing warning classes is tolerated. (Extends Q2 bar to
  build output.)
- **Smoke includes mutate-probe for `/grades` data freshness.**
  (Resolves review Q3.)
- **Smoke includes prod-bundle smoke.** `npm run build && npm run
  start` exercised on all three routes before tag. (Resolves review
  Q4.)
- **`--legacy-peer-deps` is banned.** Any peer-dep conflict is either
  resolved by bumping the conflicting dep to a React-19-compatible
  minor, or the project stops per the 4-hour abort rule. (Resolves
  review Q8 / ambiguity-leg critical.)
- **Transitive majors are banned.** If a transitive requires its own
  major migration to support React 19, stop and file a bead. Pin to the
  latest compatible minor of the current major. (Resolves review Q7 /
  consistent with problem statement.)
- **"Unless it breaks" = build fails OR runtime error on smoke routes
  OR peer-dep needs `--legacy-peer-deps`.** Deprecation warnings or
  theme flash alone do NOT count as "breaks" — file a bead, keep the
  pin. (Resolves review Q8.) Theme flash falls outside C6's "user-
  visible regression" bar because C6's worked example is "lost theme
  toggle" (loss, not degradation); flash is a cosmetic mount-time
  glitch tolerated here and owned by the deferred `next-themes` bead.
- **4-hour blocker abort rule.** Pinned by problem statement. On abort:
  park branch, file bead, leave `main` untouched, no `v0.6` tag.
  (Resolves review Q5.)
  **Park procedure:** `git push origin HEAD:polecat/modernization-parked-<YYYYMMDD>`;
  `gt done --status DEFERRED` with the park branch name and
  last-completed-phase noted in the MR payload; file a bead titled
  "Resume modernization from phase <N>" linking the park branch.
  Do NOT delete local commits before pushing the park branch.
- **Soft recovery (under the 4-hour bar).** Three concrete recipes for
  mid-phase failures that don't trigger the abort rule:
  1. **Codemod partial-apply** (codemod errored mid-pass, leaving some
     files rewritten and others not): `git checkout -- .` to discard
     all working-tree changes, then re-run the codemod with the same
     non-interactive invocation.
  2. **`npm install` produced inconsistent tree** (lockfile and
     `node_modules` disagree, or peer warnings differ from the prior
     run): `rm -rf web/node_modules web/package-lock.json web/.next`
     and re-run `npm install` (same recipe as Phase 2 step 2 —
     includes `.next` because a stale build cache compiled against
     the old tree compounds the confusion).
  3. **Hand-fix commit needs revert**: `git revert <sha>` (NOT
     `git reset` — preserves bisect history, which the per-file commit
     discipline depends on).
- **Post-merge regression recovery.** If the maintainer's post-merge
  smoke checklist fails after Refinery has merged the modernization
  commit range to `main`, the maintainer opens a revert PR (or
  `git revert` of the merged range) targeting `v0.5-pre-modernization`
  rather than hot-fixing on `main`. Then files a "Resume modernization
  from <phase>" bead linking the reverted commit range. Explicit
  parallel to the pre-merge park procedure: `main` is always the
  rollback anchor, never the WIP surface. `v0.6` tag does not cut.
- **Tailwind-3 + Next-16 incompatibility is a scope escalation, not an
  auto-abort.** If the blocker is specifically Tailwind 3 compatibility
  on Next 16 and no PostCSS-level workaround exists, escalate to the
  maintainer for a scope decision (include Tailwind 4 in this project
  vs. abort) *before* invoking the 4-hour rule. Tracks PRD Constraint
  C3: "escalate to include Tailwind 4."
- **Tag ownership + browser-console baseline.** The **maintainer** cuts
  `v0.5-pre-modernization` on `main`, **captures the browser-console
  baseline on `/`, `/grades`, `/subject/[id]` into
  `notes/modernization-baseline.md`, and commits that baseline to
  `main`** — all **before dispatching the polecat**. After merge, the
  maintainer runs the smoke checklist and cuts
  `v0.6-modernization-complete`. Refinery does NOT cut either tag.
  Rationale: tags and the browser-console baseline all require a GUI
  browser + release-readiness judgment that the polecat doesn't have;
  grouping them with tag ownership puts the full human-side
  pre-dispatch duty in one place.
- **Polecat stops at the machine-verifiable gate** (tsc clean + build
  green + dev-boot + start-boot + curl probes on all three routes — see
  Phase 5 step 2 for the full list). Maintainer owns browser smoke.
  `gt done` fires at the polecat's gate; the maintainer's smoke is a
  pre-tag gate, not a polecat gate. (Resolves review "browser smoke
  ownership".)
- **No `'use cache'` annotations added.** Pinned by Non-Goal. The
  caching redesign is a future project.

### Open Questions (need maintainer decision before Phase 1 starts)

1. **Add `postinstall: "prisma generate"` and `engines.node: ">=20.9"`
   in this project?** Both are cheap, in-spirit with the Modernization
   theme, technically beyond the literal framework bump. Recommend:
   yes to both. Please confirm or veto. **If unresolved at dispatch
   time, the polecat does NOT add `postinstall` or `engines.node`**;
   defaults stay out and a follow-on bead "Add postinstall +
   engines.node pin" is filed under Modernization v2.
2. **ESLint 8 → 9 disposition if forced by `eslint-config-next@16`.**
   Three options: (a) in-scope migrate to flat config; (b) pin older
   `eslint-config-next` (defeats upgrade); (c) accept broken `npm
   run lint` and file follow-on bead (does not break Goal 3, since
   `build` doesn't run lint). Recommend (c) unless (a) is near-free
   after seeing the actual break.
3. **Browser target naming.** Recommend: Chrome stable on the
   maintainer's laptop, named explicitly. Please confirm.
4. **Error-boundary smoke throw location.** Recommend: Client Component
   throw on `/grades`, exercises the client-boundary render path that
   changed most between React 18 → 19. Please confirm.

### Trade-offs

- **Atomic bump vs. phased bump.** Atomic is more cognitively demanding
  mid-project but has a single rollback anchor. Phased would give a
  Next-15 bisect anchor but requires two codemod chains. Atomic wins
  for a ~30-file app; phased would win for a larger surface.
- **Granular commits vs. one mega-commit.** Granular adds commits but
  preserves bisect resolution. The PRD already requires small and
  linear; granular is the right answer.
- **Maintainer-owns-browser-smoke vs. polecat-owns.** Maintainer-owns
  breaks the "zero approval" aesthetic but respects the technical
  reality that polecats lack GUI browsers. The pre-tag gate adds
  latency (maintainer availability) but the alternative is a verifica-
  tion hole (curl+grep misses theme flash, FOUT, focus regressions).
- **Baseline verbosity.** A thorough baseline takes 15-30 min to
  capture and a commit of ~100 lines of markdown. Skipping it saves
  time today and loses the only falsifiable anchor for "no new
  warnings." Baseline wins.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Radix dropdown-menu React 19 peer block | Medium | High | Audit before starting (Phase 1 transitive-dep check). **Polecat does NOT hand-rewrite `dropdown-menu.tsx`** — if codemod output fails hand-review, escalate to maintainer (who has Radix docs + browser access) for the rewrite. Maintainer either commits the rewrite directly to the polecat's branch via worktree, or makes the rewrite a pre-dispatch task and resumes the polecat. If Radix itself blocks, invoke 4-hour abort rule. |
| Codemod miscompiles `dropdown-menu.tsx` (Radix composition) | Medium | High | Isolated commit for codemod output; hand-review specifically for this file. If hand-review passes, commit as-is. **If it fails, escalate per row 1 — polecat does not hand-rewrite.** |
| `/grades` serves stale data post-upgrade (silent) | Medium | High | Mutate-probe in Phase 5 smoke. Fallback: add `force-dynamic` to `/grades`. |
| `next-themes` theme-flash on React 19 | Medium | Medium | Hard-refresh in dark mode as explicit smoke step. If flash observed, file bead; evaluate `next-themes` minor bump only if it doesn't cross a major. |
| Async-`params` missed in `web/app/subject/[id]/page.tsx` | Low | High | Explicit grep + hand-fix commit even if codemod reports handled. |
| Font-loader regression on `next/font/local` | Low | Medium | Network-panel check for `.woff2` 404 in smoke. |
| Bundle size 2× blow-up | Low | Low-Med | Baseline capture; diff at Phase 5. **Single regression-detection data point, not a bundle audit — no optimization work performed regardless of value.** Any action deferred to a follow-on bead under Modernization v2. |
| ESLint 8 → 9 forced | Medium | Low | `build` doesn't run lint; accept broken `npm run lint` and file bead. |
| `npm audit` regression (new High/Critical runtime CVE) | Low | Medium | Hard gate on Phase 4 lockfile commit. |
| Supply-chain surprise in a bumped transitive | Low | Medium | `npm audit` delta + lockfile spot-check. |
| Prisma generated-client resolution under Turbopack | Low | High | Baseline captures `prisma generate` output; include `/grades` in mutate-probe which exercises Prisma runtime. |

## Implementation Plan

The PRD's Phase numbering (1-5) is retained with small revisions.

### Phase 1: Baseline (hard gate, MUST commit artifact)

0. **Pre-flight:** verify `git fetch origin --tags && git rev-parse --verify
   origin/v0.5-pre-modernization` succeeds and points at `origin/main`,
   AND `notes/modernization-baseline.md` already exists on `main` with
   the maintainer's browser-console sections populated. If either
   check fails, `gt escalate -s HIGH "Modernization: pre-dispatch
   prerequisites missing"` and stop — do not proceed.
1. Confirm Node version, record in baseline doc.
2. `npm run build` on current stack — capture stdout+stderr.
3. `du -sh web/.next/static` — capture bundle size **before** any
   `npm run dev` run (dev would pollute `.next/` with HMR chunks and
   contaminate the prod-build measurement).
4. `npm run dev` cold-start — capture 10s of server log, then exercise
   `/`, `/grades`, and `/subject/[id]` once each using
   `curl -sS -o /tmp/baseline-<route>.html -w '%{http_code}\n'` and
   capture the full server log covering cold-start plus route-serving.
   Phase 5 diffs against this cold-start-plus-route-serving window.
   **Abort condition for this step:** process exits non-zero within
   10s of cold-start, OR the captured log window contains a line
   matching `^\s*(⨯|Error:|UnhandledPromiseRejection|FATAL)` — Next
   16's cross-mark error prefix + explicit Error/rejection lines, NOT
   the word "error" incidentally appearing in normal log summaries.
   (Browser-console baseline was verified in step 0 pre-flight; no
   polecat action here.)
5. `npx tsc --noEmit` — capture error count.
6. `npm audit --json` — capture vulnerability summary.
7. Transitive-dep React-19 peer audit — note each current version and
   latest React-19-compatible minor, without bumping yet.
8. Commit: polecat-added sections to `notes/modernization-baseline.md`
   + `notes/modernization-smoke.md` skeleton. The smoke-doc skeleton
   must include these headings (bodies filled in Phase 5): `## CLI
   setup`, `## Maintainer smoke checks`, `## Build-warning delta`,
   `## Server-log delta`, `## Bundle-size delta`, `## Follow-on
   beads filed`.

**Abort condition:** if any current-stack build/dev step fails, STOP.
Upgrading on a broken baseline is incoherent.

### Phase 2: React 19 + Next 16 atomic bump

1. Edit `web/package.json`:
   - `next` → latest `^16`
   - `react`, `react-dom` → latest `^19`
   - `@types/react`, `@types/react-dom` → latest `^19`
   - `eslint-config-next` → latest `^16`
   - (optional) `@types/node` → `^20` (match Next 16 Node floor;
     bump only if a specific Next 16 / React 19 type dependency
     forces `^22`)
   - (optional) add `"engines": { "node": ">=20.9" }`
   - (optional) add `"postinstall": "prisma generate"`
2. Delete `web/node_modules`, `web/package-lock.json`, **and
   `web/.next`** (cross-major Next build caches can cause false
   positives and false negatives on the new framework's build).
3. `npm install` — no `--legacy-peer-deps`. **Acceptance:** exit code 0
   AND `npm install 2>&1 | grep -E 'WARN (ERESOLVE|peer dep)'` returns
   no matches. On any peer-warn match → step 4. On non-zero exit → step
   4 if the error names exactly one conflicting package, else invoke
   4-hour rule.
4. If peer-dep resolution fails with a **single blocker** — defined as
   the `ERESOLVE`/`could not resolve` stanza citing exactly one
   package name in its `found:` / `required by:` hops (verify:
   `npm install 2>&1 | grep -E '^(found|required by):' | sort -u | wc -l`
   equals 1) — bump just that transitive to its latest React-19-
   compatible minor (one extra `package.json` edit). Re-run `npm
   install`. Otherwise invoke 4-hour rule.
5. **`npx prisma generate`** — required unless OQ #1 opted into
   `postinstall` (in which case step 3 already ran it). Without this,
   Phase 4 build and Phase 5 dev/start will fail on a stale or missing
   Prisma client with a confusing runtime error.
6. Commit: `chore: bump next 16 + react 19 + types`.

**Abort condition:** if `npm install` cannot resolve cleanly within a
single transitive bump pass, invoke 4-hour rule.

### Phase 3: Codemods

**Non-interactive invocation:** both codemods below prompt by default
(target selection, version pick, confirmation). **Maintainer determines
the exact non-interactive incantation pre-dispatch** (during the
`v0.5-pre-modernization` tag-cut + baseline-capture window) and inlines
the literal commands here as part of the baseline commit. If
incantations are NOT inlined at dispatch time, polecat treats it as a
pre-flight failure: `gt escalate -s HIGH "Modernization: codemod
incantations not inlined"` and stop. Recovery if a codemod hangs at
runtime: Ctrl-C, `git checkout -- .`, escalate.

1. `npx types-react-codemod@latest preset-19 .` (scope to `web/`;
   non-interactive per note above).
2. Hand-review every diff. Flag any rewrite inside a file that imports
   a Radix primitive.
3. Commit: `chore: apply types-react-codemod preset-19`.
4. `npx @next/codemod@latest upgrade latest` (scope to `web/`;
   non-interactive per note above).
5. Hand-review every diff. Particular attention: `web/app/subject/
   [id]/page.tsx` — confirm `params` became `Promise` with `await`.
6. Commit: `chore: apply @next/codemod upgrade latest`.
7. Grep for `params.`, `searchParams.`, `cookies()`, `headers()`,
   `draftMode()`. For any touch point not rewritten, hand-fix.
8. Commit (if any): `fix: await async params/searchParams/headers`.

### Phase 4: Hand-fixes and transitive-dep cleanup

1. Run `npm run build`. Fix any **non-shadcn** compile errors that
   block the build (shadcn components are deferred to step 2 below).
   Commit each conceptual triage-fix as its own commit (bisect
   granularity). If no triage-fixes are needed, skip this commit.
2. For each broken shadcn component (`card.tsx`, `table.tsx`,
   `button.tsx`):
   - Verify codemod output; hand-patch if Radix composition is wrong.
   For `dropdown-menu.tsx`:
   - Verify codemod output. If hand-review passes, commit normally
     (its own isolated commit — highest-risk file).
   - **If hand-review fails, do NOT attempt rewrite.** Escalate:
     `gt escalate -s HIGH "Modernization: dropdown-menu rewrite
     needed"` with a summary of the codemod-review failure, then
     `gt handoff -s "Waiting on dropdown-menu rewrite" -m "<summary>"`
     — the polecat does NOT sit idle. On resume, `git pull` the branch
     fresh (maintainer may have pushed the rewrite directly) and
     proceed from Phase 4 step 3.
3. **Tailwind 3 on Next 16 compatibility probe.** After shadcn
   hand-fixes land and `npm run build` is green (so Tailwind probe
   failures can't be misattributed to shadcn TS errors): grep
   `.next/server/app/grades/` HTML output for utility classes
   `bg-card` and `text-muted-foreground`. Both must be present in
   the compiled HTML — if absent despite the green build, the
   PostCSS + Tailwind pipeline silently dropped Tailwind processing.
   Follow the Tailwind escalation rule in §Trade-offs and Decisions
   → Decisions Made.
4. Bump any remaining transitives flagged in Phase 1 audit — one
   commit per dep, each with a React-19-compatible minor.
5. `npm audit` — compare against baseline, hard-gate on new
   High/Critical **runtime** CVE. Runtime-only recipe:
   `jq '.vulnerabilities | to_entries | map(select(.value.severity | IN("high","critical"))) | map(.key)' < <(npm audit --omit=dev --json)`
   diffed against the same jq expression applied to Phase 1's
   `npm audit --json` baseline (run the baseline version through
   `--omit=dev` at diff time since step 6 captured the full audit).
   Hard-gate on any net-new entry.
6. `npm run build` — must be green. Commit any residual hand-fixes
   not already committed above.

### Phase 5: Smoke + tag prep

1. **If resuming from a killed session, re-run `npx prisma generate`**
   first (unless OQ #1 opted into `postinstall`). Then `npm run dev`
   cold-start; `curl -sS -o /tmp/smoke-dev-<route>.html -w '%{http_code}\n'`
   against `/`, `/grades`, and `/subject/<first-seed-id>` once each
   (matches the Phase-1 baseline scope AND satisfies the 200-check —
   this is a single dev session covering both purposes). Capture the
   full server log covering cold-start plus route-serving. **Stop the
   dev server after capture so step 2's `npm run start` can bind to
   port 3000.**
2. Polecat smoke (machine-verifiable):
   - `tsc --noEmit` clean (or documented-unchanged error count).
   - `npm run build` green.
   - Step-1 dev curls: HTTP 200 for all three routes **and** each
     response body contains its route-specific marker:
     - `/` → grep for a text anchor present in the current
       `web/app/page.tsx` (polecat reads the file to pick the anchor;
       a heading or CTA string).
     - `/grades` → grep for at least one subject title present in the
       Prisma seed AND at least one of `%` or a letter-grade
       character (`A`/`B`/`C`/`D`/`F`).
     - `/subject/<first-seed-id>` → grep for the matching subject
       title.
   - `npm run start` (post-build) — repeat the same curl+marker probe
     against all three routes; markers must match dev output.
2a. **Build-warning delta.** Diff `npm run build` stdout+stderr against
    the Phase-1 baseline capture in `notes/modernization-baseline.md`.
    Class-extraction recipe (strip noise before sort/diff):
    `sed -E 's/\x1b\[[0-9;]*m//g; s#/[A-Za-z0-9_./-]+/web/#<PATH>/web/#g; s/:[0-9]+:[0-9]+//g' | sort -u`
    — strips ANSI color, absolute paths under `web/`, and line:col
    numbers. Any new warning *class* (not count) after this
    normalization must be acknowledged under `## Build-warning delta`
    in `notes/modernization-smoke.md` — either rationalized-and-
    accepted or filed as a follow-on bead. Net-new class without
    acknowledgement fails the smoke gate.
2b. **Server-log delta.** Diff the step-1 cold-start-plus-route-serving
    capture against the Phase-1 step-4 cold-start-plus-route-serving
    baseline in `notes/modernization-baseline.md` (apples-to-apples;
    same scope on both sides). Filter+normalize before diff:
    `grep -Ei '^\s*(err|error|warn|warning|⨯|✗)\b' | sed -E 's/\x1b\[[0-9;]*m//g; s#/[A-Za-z0-9_./-]+/web/#<PATH>/web/#g; s/:[0-9]+:[0-9]+//g; s/\[[0-9]+ms\]//g' | sort -u`
    — keeps only error/warning-level lines, strips ANSI color,
    absolute paths under `web/`, line:col numbers, and ms-timings
    (request IDs and timestamps are naturally excluded by the
    error/warning-level filter). Any new class counts as a runtime
    error per §Decisions Made "Runtime error bar." Record any
    acknowledged net-new class under `## Server-log delta` in
    `notes/modernization-smoke.md`. Net-new class without
    acknowledgement fails the smoke gate.
3. Populate `notes/modernization-smoke.md` with the maintainer smoke
   checklist. **Lead the populated doc with a "CLI setup" block**
   reproducing the maintainer prerequisites from §Interface, because
   the smoke doc is what the maintainer actually reads during smoke
   (not the design-doc):

   ```
   # CLI setup (run before smoke checks)
   git pull --rebase
   npm ci                      # must complete with no peer-dep warnings
   npx prisma generate         # required unless postinstall was opted in (see design OQ #1)
   npm run dev
   ```

   Then follow with the bulleted smoke checks:
   - `/` renders.
   - `/grades` renders all seeded subjects with letters + percentages.
   - Click subject → `/subject/[id]` renders detail.
   - Dark-mode toggle flips; hard-refresh in dark mode — no light
     flash.
   - Open DevTools Console on each of `/`, `/grades`, `/subject/[id]`;
     confirm no new `console.error` entries beyond the baseline
     capture in `notes/modernization-baseline.md`. Deprecation
     `console.warn` entries are tolerated but noted.
   - GeistVF fonts load, no `.woff2` 404 in Network panel.
   - Force a throw in a Client Component on `/grades`, confirm
     `error.tsx` renders.
   - Mutate one row via Prisma Studio or direct SQL; refresh
     `/grades`; confirm new value appears within one reload. Revert
     the mutated row to its seeded value after the probe, or re-run
     `npx prisma db seed`.
4. **Bundle-size data point (informational only; no threshold, no
   action — see Risks-table "Bundle size 2× blow-up" row).** Record
   absolute pre/post `.next/static` sizes and the ratio in
   `notes/modernization-smoke.md` under `## Bundle-size delta`.
5. File follow-on beads:
   - "Modernization v2 — Tailwind 3 → 4."
   - If OQ #1 was unresolved at dispatch and `postinstall` /
     `engines.node` were not added: "Add postinstall + engines.node
     pin" under Modernization v2.
   - If ESLint 8 → 9 forced and punted: "Migrate to ESLint 9 flat
     config."
   - If `/grades` needed `force-dynamic`: "Caching redesign inherits
     force-dynamic on `/grades`, Deploy to reassess."
6. Commit: `docs: modernization smoke checklist + baseline diff`.
7. `gt done`.

**Maintainer's post-merge gate** (pre-tag):
- Pull, install, run, execute smoke checklist.
- If all green, cut `v0.6-modernization-complete`.

### Future (out of scope, filed as beads)

- Tailwind 3 → 4 (deferred by PRD).
- Caching redesign using `'use cache'` / `cacheLife` / `cacheTag`.
- Test infrastructure (still deferred).
- Deploy project (next in sequence).

## Appendix: Dimension Analyses

- [API & Interface Design](api.md) — codemod chain, lockfile
  hygiene, `postinstall`, `engines`.
- [Data Model](data.md) — schema frozen, mutate-probe, freshness
  fallback rule.
- [User Experience](ux.md) — invisibility bar, theme flash, font
  load, smoke ownership split.
- [Scalability](scale.md) — caching-model-change verification,
  bundle and cold-start baseline.
- [Security](security.md) — `npm audit` delta, supply-chain
  hygiene, no auth surface.
- [Integration](integration.md) — touch-point grep map, commit
  granularity, pre-upgrade anchor, `dropdown-menu.tsx` as the
  highest-risk file.

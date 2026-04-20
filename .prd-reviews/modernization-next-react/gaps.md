# Missing Requirements

> Review dimension: **gaps** (leg wu-leg-sf7qs). Output slug in the hook template
> was `uuq66`; actual review dir per `state.env` is `modernization-next-react`,
> so this file is written there.

## Summary

The PRD is unusually thorough on the **happy-path mechanics** of the bump
(phase sequencing, codemods, success criteria, risk ranking) and already
anticipates the obvious React-19 / Next-16 rename traps. The gaps are not
in the upgrade mechanics — they are in the **boundary conditions around the
upgrade**: what state the rig must be in before we start, what "no regression"
actually means, who owns the final tag, and what the post-upgrade app must
continue to do for the (deferred but already-scoped) Deploy project.

The single most load-bearing omission: success criterion #2 says "no new
warnings beyond the current baseline," but no step captures that baseline.
Without a pre-upgrade snapshot, "no regression" is unfalsifiable and the
reviewer has nothing to diff against.

## Findings

### Critical Gaps / Questions
(Things that MUST be answered before implementation can start)

- **No pre-upgrade baseline is captured.**
  - Goal #2 requires "no new warnings beyond the current baseline," Goal #3
    requires "without runtime errors in the browser console," and the Non-Goals
    ban "user-visible regressions." All three need a recorded baseline —
    current `npm run build` output, current dev-server console noise,
    current browser-console state on each route, current TS error count
    (`tsc --noEmit`). Phase 1 says "confirm build passes today" but does not
    say to *record* the output for diffing.
  - Why this matters: without the baseline, the polecat will either
    (a) reject the upgrade for warnings that already exist on 14/18, or
    (b) accept regressions because nobody knows what the pre-state sounded
    like. Both are silent failure modes.
  - Suggested clarifying question: "Should Phase 1 emit a committed artifact
    (e.g., `notes/modernization-baseline.md`) with build output, dev-server
    log, browser-console output per route, and `tsc` error count? If so,
    does 'no regression' mean byte-for-byte identical or 'no *new* entries'?"

- **Tag ownership and branch discipline are unspecified.**
  - Goal says "tag `v0.6-modernization-complete` on `main` after all Path B
    beads land." But polecats explicitly do NOT push to main — Refinery does.
    So: does the polecat create the tag on its branch (before merge)?
    Does Refinery tag after merge? Does the maintainer tag by hand?
    There is also no pre-upgrade safety tag (`v0.5-pre-modernization`) mentioned,
    which is the rollback anchor if Phase 2/3 has to be reverted after Phase 4.
  - Why this matters: "landed" has a specific meaning in the polecat model
    (in Refinery MQ). The tag boundary is a merge-process question that
    the polecat can't answer alone. And without a pre-upgrade anchor,
    rollback = "revert N commits" instead of "git reset --hard <tag>".
  - Suggested clarifying question: "Who cuts `v0.6-modernization-complete`,
    and at what point (pre-merge branch HEAD, post-merge main, or
    maintainer action)? And should a `v0.5-pre-modernization` anchor tag
    be cut on main before Phase 2 starts?"

- **Rollback plan is asked about but not answered (Open Q 9).**
  - The PRD surfaces "what if the upgrade is structurally infeasible?"
    as an open question but does not commit to an answer. The polecat cannot
    execute without one, because the escape-hatch at the bottom of "Rough
    Approach" says "escalate to Witness and park the branch" — but parking
    produces no artifact for the next attempt. What *state* is acceptable
    to park in (React 19 landed, Next 16 reverted? Nothing landed? Partial
    with dep bumps kept?) is undefined.
  - Why this matters: this is the difference between a failed project
    that leaves the rig better-positioned for a retry vs. one that wastes
    the work entirely.
  - Suggested clarifying question: "If Phase 3 (Next 16) blocks but Phase 2
    (React 19) is clean, do we ship Phase 2 alone under a partial-success
    tag, or do we revert everything? What's the definition of 'acceptable
    parked state'?"

- **`force-dynamic` on `/grades` is a silent-regression landmine (Open Q 5).**
  - The PRD flags that Next 16's caching-model change may alter freshness
    on `/grades` post-upgrade. I confirmed via grep that no `export const
    dynamic` exists anywhere in `web/` today — so `/grades` is currently
    implicitly cached under Next 14's fetch-cache. Under Next 16's new
    `'use cache'` / default-dynamic model, the behavior *will* differ; the
    PRD leaves it as "verify during smoke test" without specifying the
    verification procedure. A smoke test of "click → see subjects" does
    not detect staleness; only "mutate DB, refresh, see new value" does.
  - Why this matters: this is specifically the "medium" risk the PRD already
    named, but the smoke-test checklist under Phase 5 does not include a
    freshness probe. The success criterion as written can be met by a
    permanently-stale app.
  - Suggested clarifying question: "Should the Phase 5 smoke test include
    a freshness step (mutate a seed row via `prisma studio` or direct SQL,
    refresh `/grades`, confirm new value visible without restart)?
    If `/grades` goes stale, is that acceptable-and-Deploy-will-fix, or
    a modernization-blocker?"

### Important Considerations
(Things that should be addressed but aren't blockers)

- **Lockfile strategy is implicit.** Goal #5 says "lockfile regenerated
  cleanly" but doesn't say: is `package-lock.json` deleted before
  `npm install`, or do we let npm reconcile? Is `--legacy-peer-deps`
  banned entirely or tolerated if a specific dep needs it? The existence
  of `package-lock.json` (observed in `web/`) plus the "no silencing"
  requirement implies fresh-install, but it isn't stated.

- **No mention of `node_modules` / `.next` hygiene.** Between phases,
  stale `.next` build caches can mask real failures (especially with
  Turbopack dev on Next 16, where the cache invalidation story is
  still quirky). Phase-by-phase "rm -rf node_modules .next && npm ci"
  isn't mandated anywhere.

- **Node runtime version is "should be fine" rather than pinned.**
  Constraints say "rig already runs Node 20+" but doesn't specify a
  minimum (Next 16 requires Node 20.9+, not just 20.0). No `.nvmrc`
  or `engines` pin is mentioned. If Shuhan ever clones the repo on
  her own laptop (or a future contributor does), a Node 20.5 install
  breaks silently. Would propose committing an `engines.node` field
  in `package.json` or a `.nvmrc`.

- **`forwardRef` audit is implied but not required.** Open Q 8 says
  "each hand-seeded file should be re-examined" but doesn't promote
  this to a Phase-2 step. I confirmed via grep that
  `components/ui/{card,table,button,dropdown-menu}.tsx` all use
  `forwardRef`. React 19 doesn't break them, but the codemod may
  rewrite them; without an explicit "review the forwardRef → ref-prop
  diff before committing" step, these get silently rewritten into a
  different idiom than the rest of the codebase.

- **Font loader breakage is not on the radar.** `app/layout.tsx` uses
  `next/font/local` with GeistVF files. Next 16 changed the font loader's
  internal resolution (moved to SWC-native in some paths). This belongs
  in the Phase-3 smoke checklist: "fonts still load, no FOUT, no 404
  on `.woff2` in Network panel." Not captured today.

- **Accessibility smoke is entirely missing.** "Looks the same" does not
  equal "accessible the same." React 19's ref-as-prop and form-action
  semantics change focus/keyboard behavior in subtle ways. Non-Goals bans
  user-visible regressions — arguably a screen-reader regression is
  user-visible to users who use screen readers. Minimal ask: keyboard-nav
  through `/grades` table + dropdown menu, color-contrast unchanged,
  `prefers-reduced-motion` honored on any animation (tailwindcss-animate
  is in the dep list).

- **Theme-flash regression (Open Q risk "Medium") has no detection plan.**
  `next-themes 0.4.6` + React 19 is named as a potential theme-flash
  vector, but the smoke test says "theme toggle still works" — flash
  happens on *initial mount*, not on toggle. Needs a "hard-refresh
  `/grades` in dark mode, verify no light-mode flash" step.

- **Browser target is unstated.** Smoke test says "in a real browser"
  without naming which. Next 16 bumped the Browserslist default
  (drops some older Safari/Chrome). If Shuhan uses Safari on an older
  iPad, this matters. Ask: which browser(s) is the smoke test
  authoritative on?

- **Prisma generate / migrate steps after dep bump.** Non-goal: "no
  data-model changes." Good — but when `node_modules` is blown away
  and reinstalled, does `postinstall` re-run `prisma generate`?
  I don't see a `postinstall` script in `package.json`. If a polecat
  blows away `node_modules` and skips `prisma generate`, the
  build will fail with a confusing "Cannot find module
  '.prisma/client'" error and waste time.

- **ESLint 8 → 9 scope-creep decision is unresolved (Open Q 3).**
  If `eslint-config-next@16` peer-depends on ESLint 9 flat-config,
  the PRD's "no scope creep" stance collides with "`npm run build`
  must succeed" if build invokes `next lint`. Currently `build` in
  `package.json` is just `next build` (no `next lint` prepended),
  so build may pass with a broken lint. Acceptable? If lint stays
  broken post-upgrade, the `eslint-config-next ^16` dep is dead
  weight until someone schedules the ESLint 9 migration.

- **Follow-on bead trigger condition is unscoped.** Goal #6 says
  "file a follow-on bead for Tailwind 3 → 4." Priority? Blocker for
  Deploy or not? Needs to be declared at file time so the bead isn't
  stranded at P5.

### Observations
(Non-blocking notes, suggestions, things to watch)

- The PRD's own "Note on version numbering" paragraph is a gap
  disclosure in its own right — it flags that PLAN.md says "15 → 16"
  but actual is "14 → 16." That discrepancy should be resolved at
  intake, not discovered mid-upgrade.

- No mention of i18n, multi-tenancy, rate limiting, audit logging, admin
  tooling, or offline/PWA behavior. All are correctly N/A for a
  single-user local-dev grade tracker. Worth stating explicitly in
  Non-Goals so the next-engineer-touching-this-code doesn't assume
  they were missed.

- No mention of `draftMode` / `preview`, `headers()`, `cookies()`,
  or route handlers — grep confirms none are used today. Safe to
  declare "no server-side Next APIs beyond `app/` pages and server
  components" as an explicit inventory in Phase 1, so we know the
  surface area we're certifying.

- Constraints section is silent on **CI**. There's no GitHub Actions
  in the repo (visible here) and no CI-break risk is named. If CI
  gets added later (pre-Deploy), an old-Node CI runner would miss
  the Node 20+ constraint. Worth a one-liner: "No CI today; future
  CI must pin Node ≥ 20.9."

- Constraints section is silent on **deploy target compatibility**.
  Non-goal: "no deploy." But the upgrade ends with the rig positioned
  for Deploy. If Deploy targets Vercel and Vercel's Next 16 support
  is still rolling out on a specific plan tier, this is a Deploy-PRD
  blocker rooted in a modernization-PRD choice. Worth flagging:
  "Modernization does not independently verify Deploy-target
  compatibility; Deploy project owns that check."

- Open Q 10 ("one polecat or phased") — I'd suggest answering at
  intake even if the answer is "planning will decide," because the
  scope/risk of a single-polecat all-phase run vs. multi-polecat-per-phase
  differs (context window pressure, bisect granularity).

## Confidence Assessment

**Medium-High.** The PRD is well-scoped and the author already surfaced
most of the second-order dragons (transitive deps, caching model,
rollback). The gaps that remain are mostly **procedural** (baseline
capture, tag ownership, rollback definition) and **verification**
(freshness probe, a11y, theme-flash, fonts) rather than scoping or
feasibility. Rationale for not giving High: the baseline-capture,
tag-ownership, and rollback-plan gaps are all on the critical path
and would cause a polecat to either stall or ship a silently-regressed
app. Those need explicit answers before Phase 2 starts.

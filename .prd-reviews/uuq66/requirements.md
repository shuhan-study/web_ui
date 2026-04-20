# Requirements Completeness

## Summary

The PRD (Modernization — Next.js 14→16 + React 18→19) has unusually well-scoped
goals, non-goals, and an adversarial section. Success criteria are *enumerated*
(Goals 1–6 + the four manual smoke checks) and framed around a single, clear
endpoint: the `v0.6-modernization-complete` tag. For a solo-maintainer project
with no automated test suite, this is above average.

The weakness is in *verifiability*. Several acceptance conditions rely on
comparative phrases ("no new warnings beyond current baseline", "looks
identical", "works the same") without capturing the baseline itself as a
prerequisite. Without a pre-upgrade snapshot (warning counts, screenshots,
functional checklist state), the polecat cannot objectively prove the
post-upgrade invariants hold — they can only *assert* they hold. In a project
whose entire success criterion is "nothing changed", the absence of a
pre-measurement is the dominant gap.

## Findings

### Critical Gaps / Questions

- **No captured pre-upgrade baseline.** Goal 2 says "no new warnings beyond
  what exists on the current baseline", and Goal 3 says "without runtime errors
  in the browser console or the server log." But the PRD never says: *before
  Phase 2, record the exact output of `npm run build`, `npm run dev` startup
  log, and the browser console on each of the three routes.* Without this
  artifact, "no new warnings" is not falsifiable — the polecat can claim
  success and no reviewer can refute it.
  - Why this matters: the entire project's success criterion is invisibility.
    Invisibility is provable only against a snapshot.
  - Suggested clarifying question: *"Should Phase 1 produce a checked-in
    baseline artifact (e.g., `.baseline/pre-upgrade.txt` with build output,
    dev-server log, per-route console dump) that Phase 5 diffs against?"*

- **"Runtime errors" not defined.** Goal 3 bans runtime errors in the browser
  console and server log. Is a React 19 dev-mode warning a "runtime error"? Is
  a hydration warning? A `next-themes` mount flash logged as `console.warn`?
  The PRD mentions the theme-flash risk in Phase 3 but doesn't tie it to a
  pass/fail criterion.
  - Why this matters: React 19 adds/changes several dev-only warnings. Without
    a definition, either the polecat blocks on benign warnings or silently
    ships real ones.
  - Suggested clarifying question: *"Define the error bar: any console output
    at `error` level? any `warn`? only `error` in prod build? What about
    hydration warnings specifically?"*

- **Dev vs. prod parity is not required.** User Story step 3 mentions
  `npm run build` and `npm run dev`. Goal 3 only names `npm run dev`. Nothing
  in acceptance exercises `npm run start` (production bundle). Next 16's
  Turbopack-in-dev vs. production-build divergence is exactly the kind of
  place silent regressions hide (e.g., RSC bundling differences, caching
  defaults changing only in prod).
  - Why this matters: if Deploy is the next project, shipping a build that was
    only ever exercised in dev mode is a recipe for first-deploy surprise.
  - Suggested clarifying question: *"Should smoke test also include
    `npm run build && npm run start` against the same three routes, or is
    dev-mode verification sufficient for this project and deploy-mode
    verification deferred to the Deploy project?"*

- **"No user-visible regression" has no verification procedure.** The final
  constraint ("No user-visible regressions allowed … the whole point is
  invisibility") is the project's north star, but Goal 4's smoke list is only
  four bullets. It excludes obvious regression surfaces: font/metric shifts,
  layout shifts on load, empty-state rendering, 404/error boundary copy,
  light/dark theme initial render, loading skeletons firing at the right time.
  - Why this matters: "invisibility" is an *assertion* the PRD makes but does
    not discharge.
  - Suggested clarifying question: *"Is the manual smoke list in Goal 4
    exhaustive, or is it a minimum? If minimum, what's the full regression
    checklist, and should it be codified before Phase 2 starts (while the
    baseline is still easy to observe)?"*

- **Rollback plan is an Open Question, not a Decision.** Open Question #9
  acknowledges rollback is undefined. But rollback criteria govern *when to
  stop*, which is an acceptance-boundary concern, not a backlog concern.
  Without a rule ("if Phase 3 blocks for >N hours → park branch, file
  follow-on bead, exit without tag"), the polecat has no defined failure mode
  and the project has no defined "failed" outcome.
  - Why this matters: without a failure definition, "done" is only defined on
    the happy path. Path B projects need an explicit abort condition.
  - Suggested clarifying question: *"What's the abort rule? E.g., 'if any
    single phase blocks for 4+ hours on a transitive peer-dep we can't
    resolve, stop, file a bead, leave main untouched, no tag.' Please
    promote this from Open Question #9 to a hard acceptance condition."*

### Important Considerations

- **Lockfile criterion is ambiguous.** Goal 5 says "no `npm install` warnings
  about peer-dep conflicts we're silencing with `--legacy-peer-deps`." Reading
  charitably: the polecat must *not* use `--legacy-peer-deps`. But the PRD
  never explicitly forbids it, and Open Question #2 anticipates Radix/transitive
  blockers that could force it. If `--legacy-peer-deps` becomes necessary to
  unblock, is that a failed Goal 5, or acceptable compromise?

- **Node version requirement is a confirm-step, not an acceptance gate.**
  Constraints says "Next 16 requires Node 20+. … worth confirming on the rig's
  actual Node version." This should be promoted to Goal 0 / precondition:
  *before Phase 2 starts, confirm `node --version` ≥ 20 and record it.* If
  the rig is on Node 18, the project is infeasible — that's not something to
  discover in Phase 3.

- **Tailwind 3 + Next 16 compatibility is load-bearing but unverified.**
  Constraints flag Tailwind 3 breakage as a "hard stop" but there's no
  discovery step. Phase 1's baseline inventory should probably include
  "confirm Tailwind 3.x + Next 16 stable combo is supported per Next 16
  release notes" before anyone bumps anything.

- **"No bundle-size audit" may hide acceptance failure.** Non-goals rule out
  perf work, but React 19 + Next 16 could *regress* bundle size materially.
  Without a before/after `build` size check, a 2× bundle regression ships
  silently. Cheap mitigation: capture `.next/static` sizes in the baseline
  artifact (Gap #1), compare in Phase 5. Not a hard gate — but a visible
  delta.

- **Theme-flash regression has no stated test.** Risk ranking calls out
  "`next-themes 0.4.6` on React 19 flashes wrong theme on mount" as Medium.
  But Goal 4's "light/dark theme toggle still works" is a *functional* check,
  not a *flash* check. A toggle can work perfectly while the initial paint
  flashes the wrong theme. Acceptance should include: "load a fresh tab,
  observe first paint, confirm no theme flash."

- **`/grades` data-freshness is split between projects ambiguously.** Open
  Question #5 defers `force-dynamic` to Deploy but also notes "Next 16's
  caching model change means the current behavior may already differ
  post-upgrade." If post-upgrade `/grades` silently serves stale data, does
  this project accept that, or is "same data-freshness semantics as pre-
  upgrade" an implicit requirement? Right now it's implicit — make it
  explicit.

### Observations

- **Goal 6 (file Tailwind 4 bead) is a process artifact, not a product
  outcome.** It's fine as-is, but worth noting the polecat will mark it
  complete by running `bd create` — zero ambiguity there.

- **Monitoring/alerting/observability are legitimately N/A** for this
  project (no deploy), and the PRD correctly scopes them out via Non-Goals.
  Flag: re-check when the Deploy PRD lands, since observability becomes
  in-scope there and modernization may have pre-positioned (or not) for it.

- **Adversarial scenarios section is strong.** Both named scenarios
  (`useFormState` rename, Radix peer-dep) have concrete detection signals
  (build error with rename, peer-dep resolution error). These are effectively
  lightweight acceptance sub-criteria.

- **Risk ranking table implicitly defines severity, but is not cross-
  referenced with acceptance criteria.** A polecat working the checklist
  won't naturally consult it unless told to. Consider making Phase 5
  verification explicitly walk the risk table: "for each Medium/High risk,
  what smoke step proves it didn't happen?"

- **User Story step 4 ("looks identical to pre-upgrade") is the soft spot.**
  Without a screenshot baseline, "identical" is subjective. A 30-second
  screen recording of the pre-upgrade app, stored alongside the baseline
  artifact, would resolve most ambiguity at trivial cost.

## Confidence Assessment

**Medium.** Goals are enumerated, non-goals are aggressive and clear, and
adversarial/risk sections are above average for a solo-maintainer project.
The testability story is coherent given the explicit no-test-infra scoping —
manual smoke is a legitimate choice here.

However, the PRD asks the polecat to prove *invariance* without prescribing
how to capture the pre-state. That is the dominant gap: a QA engineer would
flag "no new warnings beyond baseline", "looks identical", "works the same",
and "no user-visible regressions" as currently untestable in principle
because the baseline is not an artifact. Promote baseline capture from
Phase 1 prose to an explicit deliverable, define the "runtime error" bar,
and promote Open Question #9 (rollback) to a hard acceptance criterion, and
confidence moves to High.

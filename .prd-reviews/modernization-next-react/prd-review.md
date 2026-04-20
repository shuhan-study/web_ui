# PRD Review: Modernization — Next 14.2.35 → 16 + React 18 → 19

## Executive Summary

The PRD is unusually well-disciplined for an intake draft — Non-Goals are
enumerated with rationale, an adversarial scenarios section pre-empts common
React-19 rename traps, and a risk ranking is present. Five review legs
(requirements, gaps, ambiguity, feasibility, scope) independently rated
confidence **Medium** to **Medium-High**. The shared conclusion: this is a
buildable project, but acceptance is currently **not falsifiable** and two
concrete breaking changes are under-scoped relative to their blast radius.

The three highest-leverage risks, each flagged by 3+ legs:

1. **No pre-upgrade baseline is captured**, so "no new warnings", "looks
   identical", and "no user-visible regressions" cannot be objectively
   verified. The whole project's success criterion is invisibility, and
   invisibility requires a snapshot to compare against.
2. **Next 16's caching-model change + existing `/grades` page** can silently
   ship stale data. The smoke test as written ("renders subjects") passes
   regardless. Feasibility confirmed `/grades` has no `force-dynamic` today.
3. **Rollback, tag ownership, and the 14-vs-15-vs-16 path are all Open
   Questions**, not decisions. A polecat cannot execute without decisions
   on these — they govern when to stop and what "landed" means.

**Stakeholders leg was not delivered** (no `stakeholders.md` in the review
directory). Given the two-person scope (Rongjun + Shuhan) this is a low-risk
omission but should be noted for the process audit.

**Overall readiness: Medium.** The PRD is close to dispatch-ready. Answering
the 8 critical questions below (most are one-sentence decisions) moves it
to High.

---

## Before You Build: Critical Questions

These must be answered before Phase 1 begins. Each comes from ≥2 legs unless
noted.

### Acceptance & Verification

**Q1. Should Phase 1 produce a committed baseline artifact?**
- Proposed: `notes/modernization-baseline.md` capturing (a) `npm run build`
  stdout+stderr, (b) `npm run dev` startup log, (c) per-route browser-console
  snapshot for `/`, `/grades`, `/subject/[id]`, (d) `tsc --noEmit` error
  count, (e) `.next/static` bundle size.
- Why this matters: Goals 2, 3, and the "no user-visible regressions"
  constraint are currently unfalsifiable. Without a snapshot, the polecat
  can claim success and no reviewer can refute it.
- Found by: requirements, gaps, ambiguity (3 legs).

**Q2. Define the "runtime error" and "warning" bar.**
- Is a React 19 dev-mode warning a runtime error? A hydration warning? A
  `next-themes` mount flash logged at `console.warn`? Next's own
  deprecation warnings? A peer-dep warning without `--legacy-peer-deps`?
- Proposed default: fail on `console.error` in browser, fail on any new
  entry not present in the Phase-1 baseline, tolerate dev-only
  deprecation-style `console.warn`.
- Why this matters: React 19 changes several dev warnings. Without a
  definition the polecat either blocks on benign warnings or silently
  ships real ones.
- Found by: requirements, ambiguity (2 legs).

**Q3. Does the smoke test include a data-freshness probe on `/grades`?**
- Proposed: "Mutate a row in seed DB (direct SQL or `prisma studio`),
  refresh `/grades` without restarting dev server, confirm new value
  appears." If stale, either add `export const dynamic = 'force-dynamic'`
  to `/grades` in this project, or explicitly accept stale-in-modernization
  and hand the problem to Deploy.
- Why this matters: Next 16's caching model change replaces the implicit
  fetch cache (which P1–P5 relied on) with `'use cache'` / `cacheLife` /
  `cacheTag`. `/grades` has no `force-dynamic` today; feasibility-leg
  grep confirmed. A "click → see subjects" smoke passes against stale
  data, so the current acceptance criteria can be met by a permanently
  stale app.
- Found by: feasibility (critical), gaps (critical), scope (important),
  requirements (important), ambiguity (important) — 5 legs, highest
  signal.

**Q4. Does the acceptance smoke include `npm run build && npm run start`
(production bundle), or is `npm run dev` enough?**
- Proposed: add prod-build smoke to Phase 5 on the same three routes.
  Next 16's Turbopack-in-dev vs. production-build divergence is exactly
  where silent regressions hide; Deploy is the next project and will
  exercise prod-mode first in CI.
- Found by: requirements (critical).

### Scope & Stop Rules

**Q5. Promote Open Question #9 (rollback) to a hard acceptance rule.**
- Proposed: "If any single phase blocks >4 hours on a transitive peer-dep
  that can't be resolved by bumping to a compatible minor, stop: park the
  branch, file a bead, leave `main` untouched, no `v0.6` tag." Also define
  acceptable partial-success states — if React 19 is clean but Next 16 is
  blocked, do we ship React-19-only under a partial tag, or revert all?
- Why this matters: Path B needs an explicit abort condition. Without one,
  "done" is defined only on the happy path, and a stuck polecat will either
  spiral trying to fix or bail without a clean trail.
- Found by: requirements (critical), scope (critical), gaps (critical) —
  3 legs.

**Q6. Decide the path: atomic 14 → 16, or 14 → 15 → 16 with checkpoint?**
- Proposed: pick explicitly and record in PRD before Phase 1. Path (a)
  atomic: one `@next/codemod@latest upgrade latest` run that chains the
  Next 15 codemods internally; no intermediate green build at Next 15.
  Path (b) phased: two sequential Next majors with a bisect anchor at
  Next 15. Path (b) is more work but gives a bisect anchor if Phase 3
  explodes.
- Why this matters: open Q1 acknowledges PLAN.md says "15 → 16" while
  `package.json` pins 14 — this is load-bearing because it decides
  which codemod chain runs and whether Phase 2 ("React 19 first, on
  Next 14") is even feasible.
- Found by: feasibility (critical), scope (important), ambiguity
  (referenced critical #2).

**Q7. What's the rule for transitive upgrades that are themselves majors?**
- Proposed: "If a transitive upgrade requires its own major-version
  migration (e.g., Radix 2 → 3 if it exists), stop and file a separate
  bead. Pin to the latest React-19-compatible minor of the current
  major; do not cross a second major boundary inside this project."
- Why this matters: Radix majors have historically reshaped component
  APIs (`asChild`, portals). A liberal "bump it to unblock" reading
  silently voids the Non-Goal protecting the hand-seeded shadcn
  components.
- Found by: scope (critical).

**Q8. Define "unless it breaks" uniformly across all four soft Non-Goals.**
- Non-Goals currently say "No Prisma bump unless it breaks", "No
  next-themes bump unless it breaks", "No shadcn re-seed unless a
  specific component breaks", and implicitly "No Radix bump unless
  peer-dep blocks."
- Proposed definition of "breaks": `npm run build` fails, OR runtime
  error (per Q2) on the smoke routes, OR peer-dep resolution requires
  `--legacy-peer-deps`. Anything short of that (deprecation warnings,
  theme flash on mount, `console.warn` deprecations) does NOT count as
  broken — file a follow-on bead, keep the pin.
- Why this matters: without this bar, Goal 5's peer-dep ban and
  "don't silence with `--legacy-peer-deps`" collides with any
  Non-Goal's "unless it breaks" — Prisma or next-themes emitting a
  benign peer warning on React 19 can trigger either an unnecessary
  bump (scope balloon) or Goal-5 failure (Prisma-stays violation).
- Found by: ambiguity (critical), requirements (important), scope
  (important).

---

## Important But Non-Blocking

These should be resolved, but implementation can start with the critical
questions answered.

### Process & Ownership

- **Tag ownership and pre-upgrade anchor.** Polecats don't push to `main`;
  Refinery does. Who cuts `v0.6-modernization-complete` — Refinery, the
  maintainer by hand, or is there automation? Also: cut a
  `v0.5-pre-modernization` anchor tag on `main` *before* Phase 2 starts,
  so rollback is `git reset --hard v0.5-pre-modernization` rather than
  "revert N commits." (gaps, scope, ambiguity.)

- **Browser smoke ownership breaks the self-cleaning invariant.** The PRD
  says "the polecat must actually exercise the app in a browser" but
  polecats typically cannot launch GUI browsers. Options: (a) `curl` + grep
  rendered HTML (automatable, weak); (b) ad-hoc Playwright (probably out
  of scope given "no test infra"); (c) maintainer smokes post-merge
  (breaks "no approval step"). Pick one explicitly, or declare `npm run
  build` + server-log-clean as sufficient for `gt done` and make
  maintainer smoke a separate bead. (ambiguity.)

- **`--legacy-peer-deps` explicit ban.** Goal 5 implies the flag is
  forbidden but never says so directly. Proposed one-liner:
  "`--legacy-peer-deps` must not be used; all peer-dep conflicts must
  be resolved by bumping the conflicting dep to a React-19-compatible
  version OR by stopping per Q5's abort rule." (ambiguity, requirements,
  gaps.)

- **ESLint 8 → 9 flat-config migration in scope or not?** Feasibility
  leg argues `eslint-config-next@16` has likely dropped `.eslintrc`
  support, making flat-config migration forced-not-optional. Decide:
  (a) in scope, migrate to `eslint.config.js`; (b) out of scope, pin
  older `eslint-config-next` (defeats upgrade); (c) out of scope,
  accept broken `npm run lint` and file follow-on bead. Note that
  `build` script is `next build` (not `next lint && next build`), so
  option (c) does not break Goal 3. (feasibility, scope.)

### Verification Gaps

- **Phase 2 assumes React 19 works on Next 14.** Rough Approach Phase 2
  is "React 19 first, in place on Next 14" — but Constraints explicitly
  bans Next 15 + React 19 / Next 16 + React 18 as unsupported combos,
  and Next 14.2.35's `react` peerDep is `^18`. Either confirm Next 14
  + React 19 builds (possibly with `--legacy-peer-deps` *for Phase 2
  only*, explicitly authorized as an exception), or collapse Phases 2
  + 3 into one atomic bump. Load-bearing sequencing choice — decide
  before Phase 1. (ambiguity critical, scope important.)

- **Async `params` / `searchParams` is a guaranteed hit, not a maybe.**
  `web/app/subject/[id]/page.tsx:7-11` reads `params.id` synchronously.
  Next 15 made `params` a Promise. Needs an explicit Phase-3 sub-step:
  "grep for `params.`, `searchParams.`, `cookies()`, `headers()`,
  `draftMode()`; verify codemod rewrote every touch point to `await`."
  (feasibility.)

- **`forwardRef` audit as a distinct commit.** `card.tsx`, `table.tsx`,
  `button.tsx`, `dropdown-menu.tsx` all use `React.forwardRef`.
  `types-react-codemod preset-19` may rewrite these to ref-as-prop.
  `dropdown-menu.tsx` composes with Radix's own forwardRef — if Radix
  still uses `forwardRef` internally, the codemod's rewrite may be
  incorrect for that wrapper. Review the codemod diff in its own
  commit before committing. (feasibility, gaps.)

- **Theme-flash regression has no detection plan.** Medium risk per
  risk ranking. "Theme toggle works" (Goal 4) is a functional test,
  not a flash test. Add: "hard-refresh `/grades` in dark mode, verify
  no light-mode flash on initial paint." (requirements, gaps,
  ambiguity.)

- **Forced-throw error-boundary test underspecified.** Goal 4 says the
  error boundary must trigger but doesn't specify where the throw
  goes. Server Component vs. Client Component vs. `useEffect` vs.
  route handler exercise different error paths. Pick one and stick
  to it, or accept "any forced throw on any route." (ambiguity.)

### Scope Edges

- **Font loader breakage on `next/font/local`.** `app/layout.tsx` uses
  GeistVF files via `next/font/local`. Next 16 changed the font
  loader's internal resolution. Add to Phase-3 smoke: "fonts load, no
  FOUT, no 404 on `.woff2` in Network panel." (gaps.)

- **Prisma generate hygiene.** No `postinstall` script is present, so
  a `rm -rf node_modules && npm ci` between phases will not re-run
  `prisma generate`. Either add a `postinstall` (arguably scope creep
  but trivial), or document "run `npx prisma generate` after every
  clean install" in Phase 1. Silent failure mode:
  `Cannot find module '.prisma/client'`. (gaps.)

- **Node version should be pinned, not just "confirmed".** Next 16
  requires Node 20.9+. Rig runs Node 22.16.0 (feasibility confirmed),
  so Phase 1 confirmation is cheap — but an `engines.node` field in
  `package.json` or a `.nvmrc` would protect future clones. Cheap
  and in the spirit of the project. (gaps, requirements.)

- **Bundle size regression.** Non-Goals explicitly rule out perf work,
  but a 2× bundle blow-up would violate "no user-visible regressions"
  at load time. Cheap mitigation: record `.next/static` sizes in the
  Phase-1 baseline (Q1) and diff in Phase 5. Not a hard gate — just
  visible. (requirements.)

---

## Observations and Suggestions

- **The Non-Goals section is exemplary** and should be held up as the
  model for future PRDs. Every exclusion is justified, and the
  dimension reviewers unanimously called this out as the PRD's
  strongest feature. (scope, ambiguity, requirements.)

- **The Adversarial Scenarios section is a strong pattern.** Both
  named scenarios (`useFormState` rename, Radix peer-dep) have
  concrete detection signals. More PRDs should include "here's a
  thing that probably won't happen but if it does, here's the
  triage." Feasibility leg grep-confirmed that `React.FC`,
  `useFormState`, and `PropsWithChildren` are not used anywhere in
  `app/`, `components/`, or `utils/` — so several PRD-anticipated
  breaks are pre-empted by the actual code shape.

- **Risk ranking isn't cross-referenced with acceptance criteria.**
  Phase 5 verification doesn't explicitly walk the risk table. A
  polecat won't naturally consult it. Consider: "for each Medium/High
  risk, what smoke step proves it didn't happen?" (requirements.)

- **Rig concretely: Node v22.16.0, empty `next.config.mjs`, no
  middleware, no Edge runtime, no custom App Router config.** This
  is a ~30-file app with a very small framework-surface area —
  feasibility leg's strongest signal that the project is mechanically
  tractable. (feasibility.)

- **`lucide-react ^0.359.0` is ~18 months old**; peer-dep check is
  cheap and the bump is structurally low-risk (icon imports are
  type-checked names). Include in Phase 4 audit. (feasibility.)

- **`@types/node` is `^20` but runtime is Node 22.** Non-blocking,
  but bumping to `^22` in the same pass is consistent with the
  Modernization theme. (feasibility.)

- **User Stories step count (5 narrative steps) vs. Rough Approach
  phase count (5 named Phases)** don't line up 1:1 — User Story
  step 2 collapses Phases 2–4. A polecat parsing "what phase am
  I in?" will notice. Low-cost fix: reconcile the numbering.
  (ambiguity.)

- **Accessibility regression surface unscoped.** Minimal ask:
  keyboard-nav through `/grades` table + dropdown menu, color
  contrast unchanged, `prefers-reduced-motion` honored (there's
  `tailwindcss-animate` in deps). (gaps.)

- **Browser target unstated.** Smoke says "real browser" without
  naming one. Next 16 bumped the Browserslist default. If Shuhan
  uses an older iPad Safari, this matters. Name the authoritative
  browser. (gaps.)

- **Stakeholders leg was not delivered.** No `stakeholders.md`
  exists in the review directory. Given the two-person scope
  (maintainer + single end user, no ops/support/compliance surface)
  this is a low-risk omission — scope leg noted "no stakeholder
  surprise risk" — but should be recorded as a process gap. If the
  leg was supposed to run, the convoy dispatch is missing a step;
  if it was intentionally skipped, the formula should be explicit.

---

## Confidence Assessment

| Dimension                  | Score | Notes |
|----------------------------|-------|-------|
| Requirements completeness  | M     | Goals enumerated; baseline capture & "runtime error" bar missing. |
| Technical feasibility      | M     | Buildable; two under-scoped mechanical items (async params, caching). |
| Scope clarity              | M-H   | Non-Goals exemplary; transitive-major rule + caching boundary un-decided. |
| Ambiguity level            | M-H   | "Unless it breaks" cluster + "looks identical" mechanism unclear. |
| Missing requirements       | M-H   | Baseline, rollback, tag-ownership, freshness probe all load-bearing. |
| Stakeholder analysis       | N/A   | Leg not delivered; low risk given two-person scope. |
| **Overall readiness**      | **M** | 8 critical questions; most are one-sentence decisions. |

**Rationale for Medium (not High):** the PRD's four load-bearing
verification criteria ("no new warnings", "looks identical", "works the
same", "no user-visible regressions") are currently unfalsifiable because
no baseline artifact is captured. The rollback rule is an Open Question
rather than a decision. The Next-16 caching-model change can silently
regress `/grades` and the smoke test as written will not catch it.

**Rationale for not lower:** the PRD's Non-Goals discipline is unusually
strong, the adversarial scenarios section pre-empts a real class of
risks, and the risk ranking is roughly correctly-shaped. The path is
known; the gaps are procedural and verification-design, not scoping or
feasibility. Answers to Q1–Q8 (most one sentence) move this to High.

---

## Next Steps

- [ ] Rongjun answers Q1–Q8 (critical questions) above — inline on the
      PRD or as reply to the review mail.
- [ ] Updated PRD bead committed with answers, baseline-capture step
      promoted into Phase 1, freshness-probe step added to Phase 5,
      rollback rule promoted from Open Question to Constraint.
- [ ] Decide stakeholders-leg disposition: re-run if desired, or mark
      N/A in the formula for two-person projects.
- [ ] Pour `design` convoy to generate implementation plan once the
      critical questions are answered.

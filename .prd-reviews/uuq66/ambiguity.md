# Ambiguity Analysis

## Summary

The PRD is unusually tight for an intake draft — goals are concrete, non-goals are
enumerated with rationale, and the "adversarial scenarios" already pre-empt a class of
ambiguity. The remaining ambiguity is concentrated in two places: (1) the **exit criteria
for manual verification** (what counts as a warning, what counts as "broken", what "looks
identical" means operationally), and (2) the **elasticity of non-goals** — several
non-goals are phrased as "no X *unless* X breaks," and "break" is never defined, so the
scope can silently expand to include Prisma, next-themes, ESLint, or even Tailwind
depending on a polecat's judgement. A third, smaller cluster is about process: who
actually runs the browser smoke, who tags `v0.6`, and whether Phase 2 (React 19 on Next
14) is a supported intermediate state given the "framework pairing is fixed" constraint.

The biggest risk isn't unknown unknowns — the PRD is candid about what it doesn't know
(Open Questions section). The risk is that the polecat reads the "unless it breaks"
clauses liberally and quietly rewrites scope during Phase 4, or reads them strictly and
ships a half-upgraded app whose peer-dep warnings violate Goal 5.

## Findings

### Critical Gaps / Questions

**1. "Unless it breaks" is undefined across four dependencies.**
The PRD uses "unless it breaks" as the scope escape valve for Prisma, next-themes,
shadcn components, and (implicitly) Radix/lucide-react. But "breaks" is never scoped.
Concretely, does any of the following count as "broken"?
- `npm install` emits a peer-dep warning for `react@19` but the app still builds and runs.
- Build passes but a `console.warn` appears in dev about a deprecated API.
- Build passes; `next-themes` flashes the wrong theme for ~100ms on mount (literally
  called out as a Medium risk in "What could go wrong") but recovers.
- A `forwardRef` shadcn component emits a React 19 deprecation warning but functions.

*Why this matters:* Goal 5 says "no peer-dep conflicts we're silencing with
`--legacy-peer-deps`", which implies peer-dep warnings *are* a failure. But Non-Goals say
"No Prisma major bump. Stay on `@prisma/client ^5.22.0` unless it breaks" — if Prisma 5
emits a peer warning on React 19 (plausible), Goal 5 forces a bump that Non-Goals forbid.
These two clauses can collide.

*Suggested clarifying question:* For each of the four "unless it breaks" non-goals,
define the bar. Suggested default: "breaks" = `npm run build` fails OR runtime error in
browser console on the smoke-test routes OR peer-dep resolution requires
`--legacy-peer-deps`. Anything short of that is accepted and the version stays pinned.

**2. Phase 2 (React 19 on Next 14) may violate the "Framework pairing is fixed" constraint.**
Constraints say: *"Next 16 ships with React 19 support. We are not trying Next 16 + React
18 or Next 15 + React 19 — neither is a supported combo."* Rough Approach Phase 2 says:
*"React 19 first, in place on Next 14."* That is a third unsupported combo. Either the
constraint needs a carve-out for in-flight intermediate states, or Phase 2 needs to be
collapsed into Phase 3 (bump both in one step).

*Why this matters:* If Next 14.2.35 + React 19 fails to build at all (e.g., React 19
types don't satisfy Next 14's internal typings, or Next 14's own peerDeps say
`react: ^18`), Phase 2 never completes, the polecat gets stuck, and the smaller-surface
debugging argument collapses. This is the load-bearing sequencing choice of the whole
project — it deserves a Yes/No decision before work starts.

*Suggested clarifying question:* Confirm that Next 14.2.35 peerDeps accept `react@19`
(or set `--legacy-peer-deps` intentionally for Phase 2 only), OR drop Phase 2 and bump
both frameworks atomically.

**3. "Identical to pre-upgrade" — by what mechanism?**
User Stories step 4 says Rongjun confirms `/grades` and `/subject/[id]` "looks
identical to pre-upgrade." No pre-upgrade artifact is specified. No screenshots, no
reference build, no DOM snapshot. Two engineers will disagree on what "identical"
permits — e.g., does slightly different font-rendering on a Turbopack dev build count?
Different CSS ordering that produces the same visual output?

*Why this matters:* "No user-visible regressions" is stated as a hard constraint, but
the verification mechanism is "by eye, from memory." That's the weakest link in the
project. If a regression lands and Rongjun doesn't spot it in the smoke, it ships to the
Deploy project and becomes a production bug.

*Suggested clarifying question:* Before Phase 2 starts, does Phase 1 require capturing
a baseline screenshot set (or a `curl` of rendered HTML) of `/`, `/grades`, and
`/subject/[id]` at Next 14 / React 18? Or is "from memory" sufficient and we accept the
risk?

**4. Who runs the browser smoke, and does it gate `gt done`?**
Constraints: *"the polecat must actually exercise the app in a browser."* User Stories:
*"I pull the branch, run `npm run dev`..."* — "I" = Rongjun. These are in tension. Can a
polecat launch a browser in its worktree? If yes, polecat self-smokes. If no, the
polecat runs `npm run dev` and declares done based on server output alone — which the
PRD explicitly calls out as insufficient ("not declare victory when `tsc` is quiet"). If
Rongjun must smoke before `gt done`, that violates the self-cleaning polecat model
(polecats don't wait for human approval).

*Why this matters:* This is a workflow-level ambiguity that affects whether `gt done`
can be run after Phase 3, or whether the branch is parked waiting for Rongjun, or
whether polecat + Rongjun run separate smokes. Also affects definition of done for each
phase if the work is phased (Open Question 10).

*Suggested clarifying question:* What does the polecat do for browser verification?
Options: (a) `curl` the dev server and grep for expected content (automatable, weak);
(b) headless browser/Playwright spun up ad-hoc (probably out of scope given "no test
infrastructure"); (c) trust `npm run build` + `npm run dev` server output, and Rongjun
does manual browser smoke post-merge (breaks the self-cleaning invariant).

### Important Considerations

**5. "No new warnings beyond what exists on the current baseline" — which warnings?**
Goal 2. Warning categories: TypeScript (`tsc`), ESLint (`next lint`), npm peer-dep,
webpack/Turbopack build warnings, Next runtime warnings in the server log, React
dev-mode warnings in the browser console. Not all of these are captured by `npm run
build`. The baseline set is not inventoried anywhere I can see.

*Suggested:* Phase 1 (baseline inventory) should explicitly produce a `warnings-baseline.txt`
artifact by running `npm run build 2>&1` on main, so Phase 3's "no new warnings" has
something concrete to diff against.

**6. "Forced throw" error-boundary test — where?**
Goal 4: *"The error boundary still triggers on a forced throw (don't ship a broken
`error.tsx`)."* No test page exists for this. P1–P5 retrospectives may have one, but
the PRD doesn't point to it. Two polecats will pick two different routes/mechanisms
(throw in a Server Component vs. a Client Component vs. a `useEffect` vs. a route
handler) — each exercises a different code path in `error.tsx`.

*Suggested:* Specify the throw location, or accept "any forced throw on any route"
as sufficient.

**7. `--legacy-peer-deps` — forbidden or just un-silenced?**
Goal 5 says "no `npm install` warnings about peer-dep conflicts we're silencing with
`--legacy-peer-deps`." Read literally, this bans silencing *with* the flag but is silent
on whether using the flag at all is acceptable. A reasonable polecat reading: "use it if
you must, but don't let it hide warnings" — but that's a null condition, the flag's
whole purpose is to hide/downgrade the warnings. Effectively the goal seems to ban the
flag, but it doesn't say so directly.

*Suggested:* State directly: "`--legacy-peer-deps` must not be used; all peer-dep
conflicts must be resolved by bumping the conflicting dep to a React-19-compatible
version."

**8. "Latest stable Next.js 16.x and React 19.x" — pinned when?**
Goal 1. If the polecat starts the project on Tuesday and Next 16.1 ships on Wednesday,
does the polecat re-bump mid-flight? Also, `^16.0.0` vs `^16.x` vs an exact pin are
three different answers and the PRD doesn't choose.

*Suggested:* Pin to the latest stable at the moment Phase 1 is executed, using carets
(`^16.0.0`, `^19.0.0`). Record the resolved versions in the phase-1 inventory.

**9. Non-goal: "patch *that* component, don't re-run the CLI."**
For shadcn breakage — but Open Question 8 says "Each hand-seeded file should be
re-examined." "Re-examined" is weaker than "patch only on break." If re-examination
surfaces a React 19 deprecation warning that isn't actually broken today but will be in
React 20, does the polecat patch it preemptively (scope creep) or leave it (tech debt)?

*Suggested:* Only patch on observable failure, not on deprecation warnings. Re-examined
files that "work but warn" get a follow-on bead, not a commit.

**10. Tag ownership.**
Goals: *"A tag `v0.6-modernization-complete` created on `main`."* Polecats don't push
to main; Refinery merges from MQ. Who creates the tag — Rongjun after Refinery merges,
or is there an automation? Not a blocker for the upgrade itself but affects "how we'll
know we're done."

*Suggested:* Clarify that tagging is a Rongjun-manual step post-merge, and goal 6
(follow-on bead) must be filed *before* `gt done` so the tag step isn't blocked on bead
creation after the fact.

**11. "Next 16 caching model change breaks `/grades` data freshness silently" — detection?**
Risk ranking (Medium). Smoke test in Goal 4 says "renders all seeded subjects" — which
would pass with stale cached data. If the whole point of the risk is that the failure is
silent, the smoke test needs to explicitly break the silence (e.g., "add a row to the
seed DB mid-session, refresh, confirm it appears"). As written, the smoke will not catch
the risk it names.

*Suggested:* Add to the smoke checklist: "Modify a row in seed DB, refresh `/grades`,
confirm new value appears without dev-server restart."

### Observations

- "Same-day fix" in the escape hatch (bottom of Rough Approach) — hours-scale? Polecat
  session-scale? A polecat's definition of a day differs from Rongjun's.
- "Small and linear" commits (Constraints) — subjective. One-commit-per-dep in Phase 4
  is spelled out; other phases aren't. Acceptable given the rationale (bisect).
- "Rig" is used freely but never defined in-PRD. Fine for insider audiences; flag only
  because the PRD is addressed to a polecat, who reads the PRD cold.
- Non-goal "No test infrastructure" and Constraint "no test suite to lean on" both
  agree — no tension there. But this means Goal 4's four verification steps ARE the
  test suite for this project; they deserve to be treated as formally as tests
  (scriptable, repeatable) rather than prose.
- User Stories and Rough Approach use slightly different phase counts (User Stories has
  5 narrative steps; Rough Approach has 5 named Phases, but they don't line up
  1:1 — User Stories step 2 collapses Rough Approach's Phases 2–4). Minor, but a
  polecat parsing "what phase am I in" will notice.
- Open Question 10 ("one polecat or phased") is explicitly deferred to planning. Noted
  and not a blocker for intake, but worth flagging that the phased vs. single-shot
  decision will re-open some of the ambiguities above (e.g., "who smokes between
  phases" question 4).

## Confidence Assessment

**Medium-High.** The PRD is well-structured and pre-empts most of its own ambiguity via
the Open Questions section. The ambiguities I found are real but mostly resolvable with
one or two sentences each — there's no fundamental misalignment between the problem and
the proposed approach. The exception is Critical finding #2 (Phase 2 supported-combo
question), which if answered "no" forces a structural rewrite of the Rough Approach
sequencing. Finding #1 (the "unless it breaks" cluster) is the most likely source of
mid-project scope drift and deserves the strictest definition before work starts.

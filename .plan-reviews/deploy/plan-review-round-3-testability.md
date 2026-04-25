# Plan-Review Round 3 — testability check

_Date: 2026-04-25 · Reviewer: web_ui/polecats/capable (bead `wu-ig7`)._
_Plan reviewed: `.designs/deploy/design-doc.md` post r1+r2 fixes
(commit `f2948a5`)._

## Scope

For each phase (B0, B1, B1.5, B2, B3, B4, B5, B6, B7, B8a, B8b, B8c,
B9, B10, B11) check:
- Clear acceptance criteria? (How do we know it's done?)
- Auto-verifiable? (test/script/query/command output)
- Tests planned vs assumed? (PRD locks **no test infrastructure**.)
- Integration / e2e? (B9 smoke is the de-facto e2e.)
- Each phase independently verifiable before the next?

PRD-locked "no test infrastructure" is honoured: no unit/integration
test tasks are expected, only that every bead has *something*
verifiable. Findings are framed against that bar.

## Per-bead testability table

| Bead | Acceptance present? | Auto-verifiable? | Notes |
|------|---------------------|------------------|-------|
| B0   | yes (`git status` clean + overseer mail) | partial — `git status` automatable, mail is human gate | OK; SLA fallback (48h) explicit |
| B1   | yes (4-item checklist a-d) | mostly | (b) "document winning value" is a note not an acceptance; (c) verification mechanism unstated |
| B1.5 | yes (yes branch only) | partial | "first-name + generic school + initials-only" — patterns vague |
| B2   | yes (3 commands) | yes (`git status`, `npm run reseed`, `npx prisma validate`) | clean |
| B3   | yes (`npm run build` shows `ƒ (Dynamic)`) | yes | clean |
| B4   | yes (link visible, active, ordered) | unstated whether manual or scripted | |
| B5   | yes (`curl -I` 307 to `/grades`) | yes | clean |
| B6   | yes (zero-state behaviour) | conditional — assumes seed has empty-assignments subject | |
| B7   | yes (kid-readable copy, no Try again, no stack) | partial — exact copy not locked, trigger ("forced via dev tools") loose | |
| B8a  | yes (`vercel env ls`, settings text/screenshot, Node ≥ 20.9) | partial — env-list automatable, screenshot manual | privacy waiver wording explicit ✅ |
| B8b  | yes — but acceptance is **live-URL curl** | NO at commit time | live URL doesn't exist until B8c → independent verification breaks |
| B8c  | yes (deploy log + curl + Function Logs) | yes | clean; rollback path explicit |
| B9   | yes (smoke.md exists with stamps + README line) | partial — checklist items have no per-item pass criteria | this IS the e2e; criteria matter |
| B10  | implicit — "cut release tag on `main`" | unstated as acceptance | |
| B11  | conditional criterion only; acceptance unstated | unclear | |

## Findings

### Must-fix (1)

**M1 — UNTESTABLE: B8b acceptance is unverifiable at the bead's
own commit time.**

B8b's acceptance is `curl -I https://<live-url>/grades` showing
`x-robots-tag: noindex` and `curl https://<live-url>/robots.txt`
returning the disallow-all body. But B8b lands code only; the live
URL doesn't exist until B8c's first deploy. The plan-note
"(Will be exercised by B8c's first deploy.)" acknowledges this but
the **acceptance itself** is still phrased as a live-URL check — a
polecat working B8b can't close it without a live URL, which means
the bead either stays open across B8c (breaking "each phase
independently verified before moving to the next") or is closed on
trust (defeating the acceptance).

This is the only phase in the graph where the acceptance gate sits
in a different bead than the work.

**Suggested rewrite — split into commit-time + deploy-time:**

> B8b acceptance (commit-time):
> - `web/next.config.mjs` exports a `headers()` async function whose
>   list contains `{source: '/(.*)', headers: [{key: 'X-Robots-Tag',
>   value: 'noindex'}]}` — verifiable by reading the file.
> - `web/app/robots.ts` exists, exports default function returning
>   `{rules: [{userAgent: '*', disallow: '/'}]}` — verifiable by
>   reading the file.
> - `npm run build` exits 0 with no new warnings.
>
> B8c acceptance gains two new lines (the moved live-URL checks):
> - `curl -I https://<live-url>/grades` shows `x-robots-tag: noindex`.
> - `curl https://<live-url>/robots.txt` returns
>   `User-agent: *\nDisallow: /`.

### Should-fix (7)

**S1 — MISSING-TEST: B9 smoke checklist items lack per-item pass
criteria.**

B9 is the de-facto e2e validating the whole feature. The 5-item
checklist (`/grades`, `/subject/[id]`, `/about`, styled 404,
reseed-and-redeploy) is named, but the plan never writes down what
counts as `✅` for each item. Acceptance is "all 5 (or 6) checklist
items show ✅ with a short note" — circular. Smoke.md will define
the items but the plan doesn't pin them, which is exactly the kind
of definition that should land at plan time, not be left to the
B9 polecat to invent.

**Suggested rewrite — inline per-item criteria into B9:**

> Smoke item criteria (B9 polecat verifies on the live URL):
> - `/grades` → HTTP 200; HTML contains current trimester subject
>   names + grade letters from latest `dev.db`.
> - `/subject/[id]` → HTTP 200 for each subject id present in
>   `dev.db`; HTML lists assignments for non-empty subjects, shows
>   "No assignments yet" header for any empty-assignments subject.
> - `/about` → HTTP 200; kid-readable; renders without Prisma
>   touch.
> - styled 404 → `curl -I https://<live-url>/nonexistent` returns
>   404 and HTML uses the app's `not-found.tsx` (not Vercel's
>   default).
> - reseed-and-redeploy (Rongjun owns) → bump one grade in
>   `web/data/seed/grades.json`, run `cd web && npm run reseed`,
>   `git commit -m "smoke reseed"`, `git push`. Wait for Vercel
>   auto-deploy. Reload `/grades` — bumped value appears within
>   ~3 minutes.

**S2 — VAGUE-CRITERIA: B10 has no explicit acceptance.**

"Cut release tag on `main`" is the action, not the acceptance. The
pre-B10 prerequisite (tag-cutting actor) is well-specified, but
"done" for B10 itself is implicit.

**Suggested rewrite:**

> B10 acceptance:
> - `git ls-remote --tags origin v0.7-deploy-complete` returns a SHA
>   matching `git rev-parse origin/main`.
> - Tag visible in GitHub UI under Releases / Tags.
> - Tag SHA captured in B10 bead notes.

**S3 — VAGUE-CRITERIA: B7 `error.tsx` "kid-readable copy verbatim"
without a locked copy + loose trigger.**

§Proposed Design has `Suggested:` copy ("Hmm, the grade tracker
isn't working right now. Your dad will fix it soon.") but it isn't
locked anywhere a B7 polecat can compare against. Acceptance also
says "forced via dev tools" — a non-deterministic trigger.

**Suggested rewrite:**

> B7 acceptance:
> - `web/app/error.tsx` body matches the copy locked at the
>   plan-approval gate (default: the §Proposed Design `Suggested:`
>   string verbatim).
> - Verification trigger: temporarily set `DATABASE_URL=file:/nonexistent.db`
>   in `.env.local` and hit `/grades` locally. Page renders the
>   locked copy verbatim, no "Try again" button, no stack trace.
> - File ≤ 30 lines per PRD.

(Or: route the copy-lock as a 7th plan-approval-gate item with a
default-yes fallback, mirroring the existing 6-item table.)

**S4 — VAGUE-CRITERIA: B1.5 "first-name + generic school +
initials-only" lacks precise patterns.**

A polecat reviewing B1.5 has no machine-checkable definition of
"anonymized." Is keeping "Shuhan" OK (already first-name)? What
generic school name? What initials format ("K." vs "Ms. K." vs "MK")?

**Suggested rewrite:**

> B1.5 acceptance (yes branch):
> - Students: first name only, no surnames anywhere in
>   `web/data/seed/grades.json` or `web/prisma/seed.ts`.
> - School: literal string `"Middle School"` (or another generic
>   noun chosen at plan-approval gate); no real school name in
>   either file.
> - Teachers: `"Ms. <Initial>."` or `"Mr. <Initial>."` format,
>   single-letter initial. No surnames.
> - Grades: unchanged (numerical scores are not PII at this scope).
> - `npm run seed` exits 0; resulting `dev.db` is staged for B2.
> - `git grep -i "<real-school-name>\|<real-teacher-surname>"`
>   returns nothing in tracked files.

**S5 — MISSING-TEST: B6 acceptance assumes a seed fixture that may
not exist.**

"subjects with `assignments.length === 0` show no letter on
`/grades` cards" — but if no such subject exists in `dev.db`, the
acceptance is vacuously verified and the change is untested.

**Suggested rewrite:** add a precheck step to B6 that confirms (or
introduces, behind B1.5's anonymization decision) at least one
empty-assignments subject in `data/seed/grades.json`. If the
current seed already has one (e.g., a subject newly added to a
trimester before any assignments are recorded), name it explicitly
in B6 notes so the polecat verifies against the right row.

**S6 — VAGUE-CRITERIA: B4 "link visible from every Navbar-rendering
route" — verification mode unstated.**

Manual eyeball or scripted? `usePathname()` active styling — how
verified?

**Suggested rewrite:**

> B4 acceptance:
> - `curl -s http://localhost:3000/grades | grep -c '>Grades</a>'`
>   returns ≥ 1; same for `/about`. (Root `/` redirects to
>   `/grades` so curl with `-L` covers both.)
> - On `/grades`, the rendered Navbar's `Grades` `<a>` carries
>   the active-state class (verifiable via DOM inspect or by
>   grepping the SSR'd HTML for the active class on the Grades
>   `href`).
> - Final order in DOM: `Grades` precedes `About` precedes the
>   `DarkMode` toggle.

**S7 — VAGUE-CRITERIA: B11 conditional criterion only, no acceptance.**

The "patch-level only AND no transitive lockfile changes" criterion
gates whether B11 folds in or defers — but if it folds in, what
counts as **done**?

**Suggested rewrite:**

> B11 acceptance (folded-in branch):
> - GitHub Dependabot moderate-severity alert is closed (auto by
>   the bump, or manually marked resolved with the linked commit).
> - `cd web && npm audit --json | jq '.metadata.vulnerabilities.moderate'`
>   reports 0.
> - Lockfile diff shows only the patched package's tree (verifiable
>   via PR diff scope).

### Observations (not classified)

- **O1 — B1(b) is a note not a test.** "Document the winning value
  in bead notes" is an artifact, not an acceptance. Keep as-is —
  the acceptance is implicit in B1(a) returning a non-error response
  on `/grades`. Worth a one-line note in B1's spec calling that out
  ("(b) is documentation, not a separate gate — gated by (a)").

- **O2 — B1(c) verification mechanism unstated.** "Verified by no
  `dev.db-journal` creation attempt" is loose. Suggested concrete
  test: in the B1 probe page (already implied by (d)), `fs.readdir`
  `process.cwd()/prisma/` after a request and assert no `*-journal`
  entries. Costs nothing extra given (d) already proposes a probe
  page.

- **O3 — Vercel UI checks are unavoidable.** B8a "settings
  screenshot or text confirmation" and "Node ≥ 20.9 in Project
  Settings" are manual by necessity (no Vercel CLI surface for these
  cleanly). `vercel env ls` is the strongest automatable proof and
  is already in the acceptance — fine as-is.

- **O4 — PRD-lock honoured.** No bead asks for unit/integration
  tests; verification leans on commands, curl, and the B9 smoke
  walk. The "no test infrastructure" lock is consistent with the
  plan; the gaps above are about *acceptance precision*, not about
  smuggling test infra back in.

- **O5 — Each phase independently verifiable** — passes everywhere
  except B8b (M1). After M1's split, the plan satisfies the property
  fully.

## Verdict

**1 must-fix · 7 should-fix · 5 observations.**

The plan's testability story is mostly tight: 9 of 15 beads have
crisp, command-level acceptance. The weak spots cluster in two
places:

1. **B8b's acceptance straddles a phase boundary** — the only
   structural testability bug, and the only must-fix.
2. **Acceptance text drifts toward "what we'll do" rather than
   "what we'll check"** in B7, B10, B11, and (to lesser extent) B4
   and B1.5. None of these block create-beads, but tightening them
   now is much cheaper than finding out at bead-close time that two
   polecats had different ideas of "done."

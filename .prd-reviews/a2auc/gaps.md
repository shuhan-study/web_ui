# Missing Requirements

## Summary

The PRD is honest about its main technical unknown (Prisma + read-only
SQLite on Vercel) and surfaces it well in Open Questions. The blind spots
cluster elsewhere — at the *boundary between the app and the platform*,
and at the *boundary between this user and the public internet*. Three
themes recur: (1) **data classification and privacy** are never stated,
even though the deliverable is "minor's grades on a public URL"; (2)
**Vercel-side configuration choices** (account ownership, region, plan
tier, env vars, deploy notifications) are largely absent, leaving the
implementer to invent them; (3) **failure-mode signals** — how Rongjun
finds out a deploy broke, when free-tier ceilings are hit, or when the
live URL is silently serving stale data — are not specified. Because
this is a one-user app, several of these can be acceptably hand-waved,
but the PRD should *say* that, rather than leaving them unspoken.

## Findings

### Critical Gaps / Questions

- **Data classification is not declared anywhere.** `dev.db` will be
  committed to the repo and bundled into a publicly-reachable URL. The
  user is an 11-year-old. The PRD never says whether the seed data
  represents real student records, lightly-anonymized records, or
  fully-fabricated demo data. This is a load-bearing distinction for
  privacy obligations (FERPA-adjacent norms, COPPA for under-13s) and
  for whether the `*.vercel.app` URL can be shared without thought.
  - *Suggested clarifying question:* Is the seed data in
    `data/seed/grades.json` real school-portal data, anonymized, or
    fabricated? If real, do we accept that any reseed-then-push exposes
    that data on a public (if unguessable) URL?

- **No statement on who can push to `main` and therefore deploy.**
  Reseed-by-push means write access to the GitHub repo equals write
  access to what Shuhan sees as her grades. Single-maintainer today,
  but the PRD does not state branch protection, required reviews, or
  the (accepted) risk model. The mayor-worktree hazard from `wu-avk`
  is the same class of risk and gets a mention; this one doesn't.
  - *Suggested clarifying question:* Should `main` have branch
    protection (no force-push, no direct push from non-Rongjun
    accounts) before the first deploy, or do we accept "the maintainer
    is the only writer" as the access-control model?

- **Vercel account ownership is undefined.** The PRD names "Vercel"
  ~12 times but never says *whose* Vercel account, whether it's a
  personal hobby account or a team account, who has admin access, or
  what happens if that account is locked / billing fails / 2FA is
  lost. For a project whose entire deploy pipeline is "Vercel's GitHub
  integration," this is the single largest unstated dependency.
  - *Suggested clarifying question:* Whose Vercel account hosts the
    project, and is there a documented recovery path if that account
    is unavailable (e.g., transfer to a backup account, or willingness
    to redeploy from scratch)?

- **No deploy-failure notification path.** Vercel emails the project
  owner by default on failed builds, but the PRD does not require this
  be configured nor verified. If a reseed pushes a malformed `dev.db`
  and the build fails, the live URL keeps serving the *previous*
  successful deploy — Shuhan reloads, sees yesterday's data, no signal
  to anyone. The reseed→live flow silently degrades into reseed→
  *nothing-changes*.
  - *Suggested clarifying question:* What is the channel by which
    Rongjun learns a deploy failed (Vercel email, GitHub status check,
    manual dashboard refresh)? Is verifying that signal works part of
    the smoke checklist?

- **Empty *subjects* list is not specified.** Goal #6 covers the
  empty-assignments zero-state inside a subject page. But the PRD
  never says what `/grades` shows if the entire subjects list is empty
  (start of school year, between terms, fresh seed). The current
  `/grades` page may render an empty grid, a blank state, or a Prisma
  error depending on the implementation.
  - *Suggested clarifying question:* What should `/grades` render
    when zero subjects exist? Is "current term" filtering by date, by
    flag, or by presence-of-data? (S5 hints at "current-term" but
    never defines what "current" means.)

### Important Considerations

- **Vercel function region is unstated.** Default region for hobby
  accounts is `iad1` (US-East). Cold-start latency for someone in
  California opening on a phone over LTE is materially different from
  a co-located ping. Not a blocker, but the PRD treats "the site
  loads" as binary; for an 11-year-old on a school-issued device,
  perceived speed is part of "works."

- **Vercel plan tier (Free vs Pro) is unstated.** Free tier caps:
  ~100 GB-month bandwidth, 100k serverless invocations, 6000 build
  min. One user well under all of these — but the PRD doesn't say
  "we accept Free tier limits as our SLO." If the URL is shared
  unexpectedly (Shuhan posts it, search engine indexes it, Rongjun's
  PR description includes it), a single bad weekend could exhaust
  bandwidth and silently take the site down. No requirement for Pro,
  but state the choice.

- **Preview deploys are not addressed.** Vercel's GitHub integration
  builds preview URLs for every PR by default. Each preview bundles
  the `dev.db` from that branch. Two questions: (a) are preview
  deploys *desired* (useful for verifying changes before merge to
  `main`) or *disabled* (privacy / cost)? (b) if enabled, do they
  also need `force-dynamic`? They almost certainly do or the preview
  shows stale data and gives a false sense of "looks fine."

- **Required Vercel environment variables are not enumerated.** Open
  Question #2 hints at `DATABASE_URL` configuration but the PRD
  doesn't give a definitive list of env vars that must be set in the
  Vercel project settings before the first build. Implementer has to
  reverse-engineer this from `web/.env*` files.

- **Node.js runtime version is not pinned.** `package.json` engines
  says `>= 20.9` per the survey. Vercel's default may be Node 20 or
  Node 22 depending on when the project was created. Not specifying
  pins us to "whatever Vercel decides today," and a Node bump can
  break Prisma engine bundling without warning.

- **Browser / device support matrix is missing despite S1.** Scenario
  S1 specifies "her phone" but never says *which* phone. iOS Safari
  and Android Chrome have different SSR-hydration quirks; mobile
  Safari historically cached redirects aggressively. If she's on a
  school-issued Chromebook, that's a third axis. For a one-user app
  this is testable in five minutes — but the smoke checklist should
  name the devices, not be silent.

- **Reseed cycle's "happy path" timing is unstated.** S2 step 4 says
  "Vercel detects the push, redeploys, ~1–3 min later." That's a
  prediction, not a requirement. Is "more than 5 min" a defect? Is
  the reseed flow considered acceptable if it takes 8 min on a slow
  build day? Defining the upper bound matters because Rongjun and
  Shuhan need to know whether to wait or to assume something broke.

- **Rollback / known-good procedure is implicit.** Goal #7 verifies
  the *forward* reseed-and-redeploy. But there is no equivalent
  requirement for "if a bad commit lands, what restores the site."
  `git revert` + push works for code; for a corrupt `dev.db`, the
  recovery is the same but the diagnosis is harder (the build
  succeeded; the data is wrong). The PRD should at least state that
  the recovery path is "revert the offending commit on `main`" so
  the implementer doesn't invent a separate rollback mechanism.

- **First-deploy vs subsequent-deploy procedures are conflated.** The
  PRD's Rough Approach treats Vercel project setup (step 5) as a
  single bead that produces "a URL." First-deploy involves account
  setup, GitHub linking, root-directory config, env vars, region,
  protected-branch toggles. Subsequent deploys are git-push-driven.
  The implementer needs to know which artifacts (screenshot of
  Vercel project settings? checked-in `vercel.json`?) preserve the
  first-deploy decisions so they're reproducible.

### Observations

- **Audit logging.** Vercel's deployment log is the de facto audit
  trail (which commit deployed, when, by whom-pushed). PRD doesn't
  reference it; would be a one-liner under Constraints to say "we
  rely on Vercel's built-in deployment history for audit purposes."

- **Internationalization / accessibility.** Both fine to skip for one
  user, but they should appear in Non-Goals so the next engineer
  doesn't wonder if they were forgotten or excluded.

- **Out-of-scope but plausible-to-be-asked: a "last updated" timestamp
  on `/grades`.** Under Option C, fresh = "as of last push." Without
  a visible timestamp, Shuhan cannot tell whether what she sees is
  from this morning's reseed or last week's. Not in scope, but worth
  flagging because users *will* ask.

- **Soft deadline (2026-05-30) has no contingency clause.** PRD says
  "before end of Trimester 3" but never says what happens if we miss
  it. Probably "Shuhan opens it on her dad's laptop instead, oh well"
  — but stating that explicitly de-stresses the deadline.

- **Local development parity is not stated.** The committed `dev.db`
  is *the* production database. If Rongjun runs `npm run seed` to
  experiment locally, his working tree diverges from prod. PRD does
  not warn against this nor mandate "always commit reseeds you ran"
  vs "never commit experimental reseeds." Easy to write a one-line
  rule; easy to silently forget without it.

- **HTTPS / certificate.** Vercel handles this automatically and
  transparently, but the PRD never names HTTPS. Worth a single
  sentence under Constraints (or an explicit non-goal) so future
  readers don't have to infer.

- **Build cache invalidation behavior with binary `dev.db`.** Vercel
  caches dependencies aggressively; a `dev.db`-only commit may or
  may not invalidate the build cache depending on heuristics. If it
  doesn't, the new `dev.db` lands but the build artifact still has
  the old one. Open Question #3 asks whether redeploys trigger; this
  observation is its quiet sibling — they may *trigger* but bundle
  the wrong file.

- **Vercel deploy-protection / preview-deploy auth.** Vercel's
  default for hobby accounts leaves preview URLs publicly reachable.
  Vercel offers password protection on Pro. Not a requirement, but
  worth declaring "preview URLs are public" as an accepted
  consequence.

## Confidence Assessment

**Medium.** The PRD is strong on the inside-the-app surface area
(force-dynamic, three correctness fixes, smoke checklist) and honest
about the central technical risk (Open Question #1). Where it thins
out is at the *seams*: between the app and the Vercel platform,
between the maintainer and the deploy pipeline, and between the
single-user design and a publicly-addressable URL. None of the gaps
above are individually project-killing — most are one-line additions
or non-goal expansions — but their cumulative effect is that the
implementer will hit ~5–10 small "wait, what should I do here?"
moments that aren't covered by either the PRD or `PLAN.md`.

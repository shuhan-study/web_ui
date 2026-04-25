# Missing Requirements

## Summary

The PRD captures the obvious surface area (Vercel setup, force-dynamic,
three correctness fixes) but several plausibly-load-bearing concerns are
not addressed at all. The most material absences cluster around three
themes: (1) what happens on the *very first* request to a cold function
(Prisma engine cold-start, journal-mode side-effects); (2) what happens
when reseeds *fail* (corrupt `dev.db`, partial commit, push that doesn't
trigger a redeploy); and (3) what happens to the public URL between
deploys (no monitoring, no canary, no smoke automation). For a one-user
app these may all be acceptably "we'll see" — but the PRD currently
doesn't *say* they are.

## Findings

### Critical Gaps / Questions

- **No mention of Prisma client generation in the Vercel build.** Prisma
  requires `prisma generate` at build time; the engines are a separate
  binary download. Vercel's Next preset does this for many stacks but
  may need an explicit `postinstall` or `build` hook for monorepo-rooted
  Prisma schemas. The PRD assumes `npm run build` works on Vercel out
  of the box. It might not.
  - *Suggested clarifying question:* Has anyone confirmed `prisma generate`
    runs in the Vercel build for `web/`, given that `web/` is the project
    root? If not, this is a probe that belongs alongside Open Question #1.

- **`dev.db` journal files (`-journal`, `-wal`, `-shm`) are not addressed.**
  SQLite in WAL mode creates sidecar files. If the read path tries to
  create `-journal` on a read-only filesystem, requests fail. The
  decision to "open read-only" needs a concrete `?mode=ro` or
  `connection_limit` directive in the connection string — neither is
  mentioned.
  - *Suggested clarifying question:* What exact `DATABASE_URL` format
    will be used in production to force read-only and disable journaling?

- **No "what version of `dev.db` is bundled?" check.** The PRD assumes
  `git push` triggers redeploy. But if `dev.db` is in `.gitignore` on
  *some* committers' machines but not others (the survey notes flag
  exactly this case for Rongjun's working tree), reseeds could silently
  not be committed. There's no pre-deploy guard.
  - *Suggested clarifying question:* Should the build (or a pre-commit
    hook) emit the `dev.db` mtime / row count so a stale bundled copy
    is visible at deploy time?

- **No requirement around concurrent reads.** Vercel serverless will spin
  up multiple function instances. Each opens `dev.db` independently. SQLite
  read concurrency is fine but Prisma's connection pooling on serverless is
  notoriously tricky. The PRD doesn't say "we expect single-digit concurrent
  reads" or set any expectation. Probably fine for one user, but worth
  stating so the implementer doesn't over-engineer.

- **Reseed cycle has no rollback procedure.** If a reseed pushes a broken
  `dev.db` (e.g., schema-drift between migrations), the live URL breaks
  for everyone until Rongjun notices and reverts. PRD treats reseed as
  always-succeeding.
  - *Suggested clarifying question:* If a bad reseed lands, what's the
    recovery path? `git revert` + push? Maintain a known-good tag?

### Important Considerations

- **No mention of build-time vs runtime file paths.** The PRD's Open
  Question #2 acknowledges path uncertainty but doesn't enumerate the
  failure mode: if `file:./dev.db` resolves relative to *the wrong cwd*
  on Vercel, every request 500s. The implementer needs a concrete
  fallback (try-three-paths) plan.

- **No warm-up / first-request strategy.** First request after a deploy
  hits a cold Lambda; Prisma engine load + DB open could be several
  seconds. Is that acceptable, or do we want a Vercel cron / warmup ping?
  The non-goal "no test infrastructure" doesn't preclude a 1-line cron.

- **No requirement for the `404` page on the live URL.** Goal #7 lists
  it in the smoke checklist, but goal-list itself doesn't mention 404
  must work in production (vs. just dev). Static 404s are usually fine
  but Next 16 + force-dynamic interaction has tripped people before.

- **Mayor worktree hazard is acknowledged but no mitigation is listed.**
  PRD notes "in scope to *not trigger.*" Concretely, what does that mean?
  The deploy implementer needs a "do not approach mayor worktree"
  guardrail — preferably written down where they'll see it.

- **No mention of branch protection on `main`.** If reseed-via-push is
  the deploy trigger, anyone with write access can deploy. Not a real
  concern with one maintainer, but should be stated as an accepted risk.

- **`web/.gitignore` un-ignore needs a build-time check.** If somehow
  `dev.db` is *missing* from the deployed bundle (gitignore reverted,
  filter applied), the build succeeds but every request 500s. A simple
  `ls web/prisma/dev.db || exit 1` step in the build would catch this.

### Observations

- **No accessibility requirement.** Single user with known device, fine
  to skip — but worth a sentence in non-goals.

- **No mobile-specific testing requirement** despite "Shuhan opens it on
  her phone" being scenario S1. Implicit "view it on phone before tag"
  belongs in the smoke checklist.

- **No mention of HTTPS / cert.** Vercel handles this automatically, but
  the PRD doesn't acknowledge it. Worth a one-liner under Constraints.

- **No analytics requirement.** Probably out of scope but Vercel's free
  tier includes basic page-view analytics; opting in or out is a real
  choice that should be documented.

- **No data-retention requirement.** Vercel preview deploys persist by
  default. Each preview will have a `dev.db` snapshot. Is that fine?

## Confidence Assessment

**Medium.** The PRD covers the visible work but has multiple unstated
assumptions about Prisma + Vercel + SQLite that, if wrong, individually
make goal #1 unreachable. The largest unspoken risks are journal-mode /
read-only-filesystem interaction and Prisma engine bundling — both real
production gotchas with this stack. The "we'll discover this in
implementation" Open Question #1 covers them in spirit but the PRD
treats them as a single binary probe rather than several specific
configuration decisions.

# Security Analysis

## Summary

The honest one-line threat model: **private app, public URL, child's real
grades.** Once `web_ui` is on Vercel under `*.vercel.app`, it is reachable by
anyone on the internet who guesses or stumbles onto the URL. The PRD locks
"no auth" and that is fine for the user-facing posture, but the contents of
the bundled `dev.db` are not synthetic — `web/data/seed/grades.json` ships
Shuhan's full name (`Shuhan Geng`), her school (`Albany Middle School`),
her grade level (6), her teachers' surnames, and her actual letter grades
and percentages per subject. That is mildly sensitive PII about a minor.
The combination "URL is public + data identifies a real 11-year-old + repo
history is forever" is the one place this otherwise-tiny security review
has to push back.

The mitigations are correspondingly cheap. The strongest single move
available without breaking the "no auth" lock is **anonymizing the seed**
(first-name-only or `Subject A` style) — it shifts the data toward the
"single user, private, public URL" assumption the PRD already makes. The
secondary moves (`noindex`, keep the repo permanently private, treat the
mayor-worktree hazard as a P0 prerequisite, run the Dependabot fix while
the polecat is in the Vercel UI anyway) are all small and stack
additively. None of them require re-opening the auth decision, and none
expand scope beyond the PRD.

## Analysis

### Key Considerations

- **Trust boundary recap.** Source: private GitHub repo
  (`shuhan-study/web_ui`) → Vercel build pipeline → bundled artifact
  containing `dev.db` → public `*.vercel.app` URL → open internet. The
  only "private" segment is `repo → Vercel`. The instant the URL exists,
  the data behind it is reachable by anyone who knows or guesses the
  URL. There is no auth, no IP allowlist, no rate-limit beyond Vercel's
  defaults.
- **Real PII for a minor.** Verified by reading
  `web/data/seed/grades.json`: full name, school, grade level, teacher
  last names, per-assignment scores, term dates. Not synthetic. Not
  anonymized. A random visitor who hits the live URL learns who Shuhan
  is, where she goes to school, and how she's doing in Math 6. This is
  the single material data-sensitivity finding of this review.
- **`*.vercel.app` URLs are not secret.** They are scanned by certificate
  transparency log monitors, by random subdomain enumerators, and
  occasionally by search engines. URL obscurity is real but weak —
  treat it as a speed bump, not a control.
- **The committed `dev.db` becomes permanent in git history.** Option C
  un-ignores `web/prisma/dev.db` and commits it. From that commit
  onward, every reseed adds another snapshot of the SQLite binary to
  `git log`. If the repo is ever flipped to public — accidentally or
  deliberately — every historical grade snapshot is exposed at once,
  including ones that have since been "deleted" by reseed. **Future
  repo-visibility change has retroactive disclosure consequences.**
- **Read-only filesystem is a security positive.** Vercel's serverless
  runtime mounts everything except `/tmp` read-only. Combined with
  Prisma opening the SQLite file with `?mode=ro&immutable=1` (or
  equivalent), the database cannot be tampered with at request time.
  No injection-via-SQL-write, no journal poisoning. State this as a
  benefit of Option C, not just a constraint.
- **Mayor-worktree hazard.** The survey
  (`notes/deploy-2026-04-24/survey.md`) flags ~100 files staged-as-
  deletion in the mayor worktree. If mayor pushes from that state, the
  repo on GitHub is wiped → Vercel redeploys an empty project →
  deployed app serves nothing, possibly nukes the deployment branch
  reference. This is a process-side security/integrity concern, not a
  network one, but it is the single largest unforced-error risk in the
  Deploy graph. PRD Q7 already names the P0 prerequisite bead
  ("Pre-Deploy: clean mayor worktree"); this leg confirms the threat
  model and the mitigation scope are correct.
- **Dependabot moderate vuln.** PRD constraints note 1 moderate-severity
  vulnerability open on `shuhan-study/web_ui`. PRD OQ #8 leaves the
  fix-vs-defer call to the plan. For a public-facing deploy, even on a
  read-only app, ignoring an open moderate is not great hygiene; the
  cost of `gh pr` from the Dependabot tab during the Vercel-setup bead
  is near-zero if the bump is a patch/minor.
- **`error.tsx` info disclosure.** Next.js production builds suppress
  stack traces by default; PRD Q6 specifies a kid-readable `error.tsx`
  which by construction reveals nothing technical. Both layers
  combined: low risk of stack-trace leak. Worth a one-line check during
  smoke (open the URL while a deliberate breakage is live, confirm no
  internals shown).
- **Vercel account + GitHub account hygiene.** Single-developer
  account. 2FA on GitHub is the lock that protects "private repo"; if
  it's not on, that's the single highest-leverage account-security
  improvement. Vercel deploy hooks (if any) and build env vars should
  not be committed or echoed in build logs — Option C currently needs
  *no* secrets (no Postgres URL, no API keys), which is itself a
  positive security property.
- **Supply chain.** `web/package-lock.json` is committed; PRD locks
  "no version drift introduced by this project." `npm ci` on Vercel
  resolves from the lockfile. No new exposure beyond what the
  modernization project already accepted. Existing security analysis
  at `.designs/modernization-next-react/security.md` covers the
  baseline.
- **Subdomain takeover.** `*.vercel.app` is owned by Vercel; not a
  dangling-DNS scenario. If we ever add a custom domain (out of
  scope), revisit.
- **Future authentication path.** Out of scope for Deploy, but worth
  flagging as a P3-ish follow-on if the data sensitivity grows or if
  the URL is observed to leak. Cheapest workable gate: a Next
  middleware that checks `Authorization: Basic <base64>` against a
  single env-var password. ~20 lines, no new deps, no DB. Mentioned
  here only so the option is on the shelf — not proposed for this
  project.

### Options Explored

The four data-sensitivity mitigations the PRD's "no auth" lock leaves
on the table:

#### Option 1: Accept current posture (URL obscurity is the only defense)

- **Description**: Deploy as-is with the real seed data. Rely on the
  fact that nobody is going to guess the random `*.vercel.app`
  subdomain. Add `noindex` to discourage search-engine indexing.
- **Pros**: Zero work. Matches PRD intent literally.
- **Cons**: Real-name + real-grades + child = the one combination this
  review can't wave away. Subdomain enumeration is real. CT log
  monitors will see the cert.
- **Effort**: None.

#### Option 2: Vercel Password Protection

- **Description**: Vercel's built-in deployment password protection
  gates all routes behind a shared password.
- **Pros**: Zero application code; managed by Vercel.
- **Cons**: **Pro plan feature ($20/month)**. PRD constraints don't
  mention upgrading from free tier; this would be a budget decision
  the overseer hasn't made. Out of scope to assume.
- **Effort**: Trivial if on Pro; impossible (without paying) if not.

#### Option 3: Basic-auth via Next middleware + env-var password

- **Description**: ~20-line `middleware.ts` that checks
  `Authorization: Basic` against a `SITE_PASSWORD` env var set in
  Vercel project settings. Browsers prompt natively.
- **Pros**: Real authentication, free, no new deps, defeats every
  drive-by enumeration scenario. Conservative.
- **Cons**: **Re-opens the "no auth" PRD lock.** Even though it's
  cheap, it's a scope expansion that needs overseer signoff. Also
  adds a UX friction step Shuhan would hit on every device.
- **Effort**: Low (1 bead, small).

#### Option 4: Anonymize the seed (recommended)

- **Description**: Stop shipping real PII in the bundled `dev.db`.
  Smallest viable change: edit `web/data/seed/grades.json` so
  `student.name` becomes `"Shuhan"` (first-name only) or `"Student"`,
  `student.school` becomes empty/`"School"`, teacher fields become
  `"Mr. A" / "Ms. B"` or empty. Subject names (`Math 6`, `Reading 6`)
  can stay — they aren't identifying. Grades stay — they're the
  point of the app. Re-run `npm run seed` to regenerate `dev.db`.
- **Pros**: **Does NOT re-open the no-auth PRD lock** — it's a
  data-side mitigation, not an access-control mitigation. Strips the
  identifiability that makes the "public URL" assumption uncomfortable.
  Single JSON edit + reseed; mechanical. No code change. Survives
  reseeds because the source-of-truth is the JSON Rongjun edits each
  week, so the anonymization pattern is enforced once and re-applied
  by habit.
- **Cons**: Slightly less satisfying for Shuhan to see "Student"
  instead of her name on a card. (Mitigation: first-name-only is the
  natural compromise — recognizable to her, not identifying to a
  stranger.) Teacher names go away or become initials; she may notice.
  Doesn't address the *historical* repo-snapshot problem if real
  data was committed before this change lands.
- **Effort**: Very low (1 bead, 5 minutes, no code).

### Recommendation

**Option 4 (anonymize the seed, first-name-only) as the primary
mitigation, stacked with the always-on hygiene below.** Anonymization
is the only option that respects the "no auth" lock while materially
shrinking the blast radius of "public URL is hit by a stranger."

If the overseer *would* accept re-opening the auth decision: **Option 3
(middleware basic-auth)** is the better answer outright — it's the
cheapest real gate and makes anonymization optional rather than load-
bearing. Flag this as a one-line overseer question rather than
silently expanding scope.

**Always-on, regardless of which data option lands:**
- Add `X-Robots-Tag: noindex, nofollow` HTTP header (one line in
  `next.config.mjs` `headers()`) and a `public/robots.txt` with
  `Disallow: /`. Won't stop enumerators, will stop Google.
- Keep the repo permanently private. Document this constraint
  explicitly so a future maintainer doesn't flip it without
  understanding the retroactive disclosure consequence.
- Apply the Dependabot moderate fix during the Vercel-setup bead if
  it's a one-line bump; otherwise file a follow-on bead and defer.
  Don't merge a major-version drift just to clear it.
- Treat the P0 mayor-worktree-cleanup bead (PRD Q7) as a hard
  prerequisite to any code-touching Deploy bead. This protects the
  GitHub state that everything else depends on.
- Confirm 2FA on the GitHub account that owns
  `shuhan-study/web_ui`. Out of code-change scope, but the single
  highest-leverage account-security check.

## Constraints Identified

- **No new auth-system dependencies.** PRD locks "no authentication."
  Anonymization (Option 4) honors this; basic-auth middleware
  (Option 3) does not and would require overseer re-signoff.
- **No PII in the deployed bundle beyond what the overseer accepts.**
  This is the one new constraint this leg adds. Concretely: if Option 4
  lands, the seed JSON's `student.name` must not be the full real
  name; school/teacher fields must be anonymized or empty.
- **Repo must remain private indefinitely** for the Option C committed-
  `dev.db` model to remain safe. Document in PLAN.md decision log
  alongside the existing Option C entry.
- **`X-Robots-Tag: noindex` and `robots.txt` Disallow** ship with the
  first deploy. They are weak controls, but they are free.
- **Production builds suppress stack traces.** Verify during smoke.
- **No build-time secrets required.** Option C uses only
  `DATABASE_URL=file:./dev.db`, which is not a secret. If a future
  pivot to Option B (Postgres) introduces a real connection string,
  re-evaluate secret handling at that time.
- **Read-only SQLite open mode** (`?mode=ro&immutable=1` or Prisma
  equivalent) is required for both correctness *and* tamper-resistance.
  Probe bead's checklist item (c) covers the correctness side; this
  leg notes it's also the security side.

## Open Questions

- **Will the overseer accept anonymization (Option 4) without re-
  opening "no auth"?** Best-case path. Recommended default unless told
  otherwise — the change is data-side, not access-control-side.
- **Does the overseer want to re-open "no auth" in light of the
  real-PII finding?** If yes, Option 3 (middleware basic-auth) is the
  right answer and Option 4 becomes optional. This is a one-line
  question to send via mail before the implementation beads open.
- **Has the seed data already been committed to GitHub before
  this leg lands?** If yes, anonymization going forward still leaves
  history exposed. The remediation (rewriting git history) is
  expensive and out of scope; living with the historical exposure
  while keeping the repo private is the realistic answer. Worth
  confirming the timeline.
- **Dependabot vuln — is the moderate a runtime dep or a dev dep, and
  is the fix a one-line bump?** Polecat with `gh` access can answer
  during the Vercel-setup bead. Do not preemptively merge.
- **Vercel account 2FA status.** Out of code scope; worth a one-line
  check during the Vercel-setup bead.
- **Future-auth follow-on bead?** Recommend filing a P3 bead now
  describing the middleware basic-auth sketch, so the option is
  shelf-ready if URL-leak evidence ever appears. Do not implement.

## Integration Points

- **Data dimension** — overlaps directly. The anonymization
  recommendation (Option 4) is a data-leg implementation detail.
  Coordinate seed JSON shape decisions there. Also: the data leg
  owns the reseed cycle, which is the moment anonymization could
  silently regress (real names re-introduced into JSON during a
  reseed). Add an anonymization check to the reseed checklist.
- **Integration dimension** — `noindex` header lives in
  `next.config.mjs`; `robots.txt` lives in `web/public/`. Both are
  Vercel-config-adjacent; integration leg owns the file placement.
  Dependabot fix coordination also lives here.
- **UX dimension** — anonymized names show up on the card grid and
  subject pages. UX leg should confirm that "Shuhan" (first-name) on
  the dashboard reads correctly to an 11-year-old user; if the leg
  proposes a "Welcome, <name>" header anywhere, anonymization needs
  to flow through it consistently.
- **Process / PLAN.md** — two new entries:
  1. Decision-log addendum under Option C: *"Repo must remain
     permanently private; flipping it to public retroactively
     exposes every historical reseed snapshot."*
  2. New P0 prerequisite (already covered by PRD Q7): mayor-worktree
     cleanup before any code-touching Deploy bead.

# Stakeholder Analysis

## Summary

This is a one-user app with one maintainer, so the stakeholder picture is
genuinely small — but the PRD's "for whom" section captures only the two
human stakeholders (Shuhan, Rongjun) and stops there. Several
non-obvious stakeholders are implicitly affected: the Vercel platform
(its build pipeline, its quotas), GitHub (the deploy trigger), the
mayor agent (whose worktree state is a Deploy-blocking hazard), and the
future-Sherpa / handoff polecat who will inherit this work. Conflicts
are mild but real: Rongjun's "ship it before Trimester 3 ends" and
Shuhan's "always works on my phone" are aligned but the implementer
agent's "do this rigorously" runs into the deadline. The biggest
unstated stakeholder is the *next* project — anything Deploy ships
becomes a foundation that constrains future work (parent visibility,
real data integration), and decisions made now ripple forward.

## Findings

### Critical Gaps / Questions

- **The "future maintainer" stakeholder is invisible.** Rongjun is the
  current maintainer. If Rongjun stops maintaining (vacation, illness,
  loss of interest), the deployed URL and reseed cycle continue to
  exist as obligations. The PRD should at minimum acknowledge that
  the deploy is owned by exactly one person and the bus factor is 1.
  - *Suggested clarifying question:* Is "Rongjun maintains forever"
    an accepted constraint, or is there an exit plan if reseeds stop
    happening? (e.g., does the URL gracefully degrade, get archived,
    redirect to a "this app is dormant" page?)

- **Mayor agent is a stakeholder with a destructive-action capability
  but no explicit role in this project.** The PRD acknowledges mayor's
  worktree as a hazard but doesn't say what coordination is needed.
  Should mayor be explicitly stopped/disabled during deploy execution?
  Notified at handoff?
  - *Suggested clarifying question:* What's the mayor coordination
    plan — does mayor stay down for the duration of Deploy, get
    notified pre-tag, or is "stay out of mayor/rig/" the entire
    interaction?

- **The school (Aeries / source of truth for grades) is implicitly a
  stakeholder.** Reseed cadence is "weekly when Shuhan's school
  updates." If the school changes its grading API, login flow, or
  data format, the reseed flow breaks regardless of the deploy. PRD
  doesn't acknowledge this dependency.
  - *Suggested clarifying question:* Is school/Aeries breakage in
    scope as "Deploy worked but reseed pipeline broke"? Or do we
    treat reseed as a separate concern (manual JSON edit only)?

- **The Witness/Refinery agents are implicit stakeholders.** Deploy
  changes git push behavior (now triggers a Vercel deploy as side
  effect). Refinery's MQ merge will trigger production deploys
  automatically. Is that desired, or do we want a "tag to deploy"
  gate so MQ merges don't deploy?
  - *Suggested clarifying question:* Should every merge to `main`
    deploy to production, or do we want a separate `production`
    branch / tag-to-deploy workflow?

### Important Considerations

- **The "Shuhan as user" persona is mostly invisible in technical
  decisions.** She is described as "~age 11," which has UX
  implications (font size, mobile-first, low-cognitive-load
  navigation) but the PRD's three correctness fixes don't tie back
  to her UX needs. The Navbar link is for her; root redirect is for
  her; zero-state is for her. None are stated as such — they're
  stated as bug fixes. Worth re-anchoring.

- **Conflicting needs: implementer rigor vs. deadline.** Trimester
  3 ends 2026-05-30. If the Option C probe takes longer than
  expected and the implementer wants to fully verify three
  sub-mechanics, that bumps into the deadline. PRD doesn't say
  "ship by deadline even if probe is incomplete" or "delay tag past
  deadline if needed." Default behavior unclear.

- **Vercel as a platform stakeholder.** Vercel's free tier has
  quotas (100 GB-hours/month build, bandwidth limits). For a
  one-user app, none will bite. But if the URL gets shared (Shuhan
  shows friends, mom forwards to grandparents), bandwidth could
  matter. Not a 2026-04-24 problem; worth flagging as a future
  concern.

- **GitHub as a stakeholder.** The repo `shuhan-study/web_ui` is
  presumably a personal repo. If Shuhan or Rongjun ever want to
  hand the project to someone else, the GitHub ownership and
  Vercel project link are coupled. Not in scope to fix; flagging.

- **The intake polecat (`wu-wfs-rpmqi`, current author) is a
  stakeholder.** This polecat wrote the PRD. The review feedback
  loop should explicitly include them — does the synthesis go back
  to the PRD-author polecat for revision, or does it go to a fresh
  plan-generation polecat?

- **The privacy stakeholder (Shuhan).** Grades are sensitive
  educational data. PRD says "private repo, public read-only app"
  — but the URL itself is publicly accessible. If anyone discovers
  the URL, they see Shuhan's grades. PRD treats this as acceptable
  (no auth in non-goals). It's a real privacy choice that should
  be made consciously by Rongjun, not by an agent.
  - *Suggested clarifying question:* Confirm explicit consent: a
    publicly-accessible URL displaying Shuhan's grades is acceptable
    because URL secrecy is the access control? Worth a written
    sign-off given the user is a minor.

### Observations

- "Solo maintainer (Rongjun) on a school-schedule cadence" is
  honestly stated in Constraints. Rare and useful.

- The PRD distinguishes Shuhan-as-user from Rongjun-as-maintainer
  cleanly in user stories. Good practice.

- The "every plausible follow-on" framing in the Problem Statement
  implicitly invokes future stakeholders (parents, possibly other
  family). Worth keeping that lens in design decisions even if
  they're out of scope.

- Mayor's role is unique in this town: a stakeholder whose
  *inaction* is the requirement (don't push the broken state).
  This is a strange-but-real stakeholder pattern.

- The "shuhan-study/web_ui" GitHub repo name suggests a
  Shuhan-owned repo. Worth confirming who owns the GitHub account
  the Vercel project will be linked to — Rongjun's or Shuhan's. If
  it's Shuhan's, parent control of the deploy needs explicit
  consideration.

- No mention of how Shuhan finds out the URL. Bookmark on phone
  presumably, but who installs the bookmark? Rongjun, presumably.
  Trivial detail, but worth one sentence so it's not forgotten at
  launch.

- No accessibility / vision-impaired user persona because there
  isn't one. Confirmed-acceptable but worth a non-goal line.

## Confidence Assessment

**High** for the explicit two-person stakeholder model, **Medium** for
unstated stakeholders. The most important under-acknowledged
stakeholders are mayor (Deploy-blocking hazard, needs coordination),
the future-maintainer (bus factor 1), and Shuhan-as-data-subject
(privacy of a minor's grades on a public URL). None of these block
v0.7 implementation but each deserves explicit treatment in either
the PRD or a follow-on bead.

# wu-avk — Intent

**Bead:** wu-avk · Run mol-idea-to-plan for Deploy project (PLAN.md on main, decisions locked)
**Owner:** shuhan/crew/shuhan · **Assignee:** web_ui/crew/full_stack
**Date:** 2026-04-24

## Goal

Run the `mol-idea-to-plan` workflow formula end-to-end for the Deploy
project so it produces (a) a draft PRD, (b) a reviewed/aligned/refined
implementation plan, and (c) a beads graph ready for execution.

## Inputs

- `PLAN.md` — north-star + scope + 3 locked decisions (DB Option C, root
  → /grades, zero-state subtitle).
- `archive/prd-reviews/p6-deploy-discarded-draft.md` — seed PRD (adopt
  framing; replace DB-options section with Option C as locked).
- `notes/deploy-2026-04-24/survey.md` — stack/repo context.
- Problem statement to lift verbatim into `{{problem}}`: PLAN.md §
  "Problem statement (for Path B intake)" lines 13–25.

## Pre-flight (done)

- [x] Stashed overseer's morning gitignore-edit (label
  `wu-avk pre-pull: un-ignore dev.db edit`) — preserves Option C plumbing
  for a later proper Deploy bead, doesn't ad-hoc it now.
- [x] `git pull --rebase` succeeded; on `b7cd2b0..1ecb688`, tree clean
  (only `.DS_Store` untracked, harmless).
- [x] Read PLAN.md, survey.md, discarded P6 PRD draft, and the
  formula's TOML.

## Two blockers found in pre-flight — NEED OVERSEER ANSWER

### Blocker 1: bead's prescribed CLI flag does not exist

The bead's Action step 2 says:

```
gt formula run mol-idea-to-plan --rig web_ui --problem "<lift verbatim>"
```

`gt formula run --problem` errors: **unknown flag**. Confirmed via
`gt formula run mol-idea-to-plan --rig web_ui --problem "test"`. The
`--problem` flag exists only on the sub-formula `mol-prd-review` invoked
inside the `prd-review` step.

Top-level `gt formula run mol-idea-to-plan --rig web_ui` accepts no
problem flag. The intake step's TOML description tells the polecat to
read `{{problem}}` from "the human's raw idea description" plus
"prior conversation context" — but polecats spawn in fresh sessions
with no carry-over (P6 discarded-draft incident proved this).

**Resolution options:**
- (a) Pass the problem statement via `--files PLAN.md` so the intake
  polecat reads the file and lifts the Problem Statement section
  itself. (Formula explicitly mentions `{{.files}}` is a templating
  variable.)
- (b) Wrap the problem in an env var (`GT_PROBLEM=...`) if the formula
  template substitutes from env. (Unverified — would need to test.)
- (c) Edit the formula TOML to declare a CLI flag, then `gt formula
  run --problem ...`. **Out of scope** — this is a `.beads/formulas/`
  global change, not a web_ui rig change.
- (d) Run with no `{{problem}}` and write the lifted problem into
  `.prd-reviews/<review-id>/prd-draft.md` myself before kicking off
  `prd-review`. Defeats the formula's intent (intake polecat is
  supposed to draft the PRD; we'd be doing intake's job).

**Lean:** option (a) — pass `--files PLAN.md` and let intake read it.
This matches the spirit of the bead (problem statement lives in
PLAN.md) without ad-hoc'ing intake's job.

### Blocker 2: bead says two human gates, formula says one

Bead: "Path B has two human gates (clarification after PRD review,
approval after plan review) — pause and mail overseer at each."

Formula (TOML + `gt formula show` + step graph): only **one** human
gate, `human-clarify` after `prd-review`. Steps `prd-align-1..3` and
`plan-review-1..3` and `create-beads` and `verify-beads-pass-1..3` all
run autonomously.

**Resolution options:**
- (a) Run the formula as-defined (one gate). Honor only the
  PRD-clarification gate. The bead's "approval after plan review" was
  written from a stale or imagined version of the formula.
- (b) Run the formula with a manual interrupt: stop after
  `plan-review-3` (i.e., before `create-beads`), mail overseer for
  plan approval, resume manually. Honors bead intent; requires me to
  injectsomething the formula doesn't provide.
- (c) Defer to overseer's call.

**Lean:** option (b) — bead text is the contract for THIS run. Insert
an ad-hoc approval mail before `create-beads`. The cost is one extra
overseer round-trip; the benefit is human eyes on the plan before
beads materialize and start consuming polecat slots.

## Plan (pending overseer answers above)

1. **Mail overseer** with this intent file path and the two blockers
   (already happening in this turn).
2. **Wait for resolution** on both blockers.
3. **Kick off the formula** with the agreed `--files`/`--problem`
   convention. Step `intake` produces draft PRD at
   `.prd-reviews/<review-id>/prd-draft.md`.
4. **Step `prd-review`** spawns 6 polecats; await synthesis mail.
5. **Step `human-clarify`** — present clarifying questions to overseer
   via mail (per `feedback_human_gates_via_mail.md`), capture answers,
   write into the PRD.
6. **Steps `generate-plan` → `prd-align-1..3` → `plan-review-1..3`** —
   autonomous, polecat fan-out, await synthesis mails between rounds.
7. **(If blocker 2 resolved as option b)** Mail overseer for plan
   approval before `create-beads`. Wait.
8. **Step `create-beads`** — convert the refined plan into beads with
   dependencies.
9. **Steps `verify-beads-pass-1..3`** — autonomous coverage checks.
10. **Completion** — mail `shuhan/crew/shuhan` and `mayor/` per bead's
    closing instruction; close bead; commit notes/PRD/plan
    artifacts; push.

## Out of scope for this bead

- **Implementation** of any plan item (force-dynamic, navbar link,
  redirect, zero-state, Vercel setup, dev.db un-ignore + commit). All
  of that lives in the *generated* beads, executed in subsequent runs.
- **Tailwind 3 → 4** (wu-sjk, deferred).
- **Dependabot moderate vuln** on shuhan-study/web_ui (heads-up in
  bead; small bead during implementation, not now).

## Heads-up (preserved from bead text)

- Mayor worktree at `/Users/rfvitis/gt-personal/web_ui/mayor/rig/` has
  ~100 files staged-as-deletion. Do **not** trigger any mayor action
  that would commit/push from there.
- Dependabot 1 moderate vuln on shuhan-study/web_ui — file as small
  bead during implementation phase.

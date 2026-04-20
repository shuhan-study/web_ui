# Session log — P6 kickoff via Path B (2026-04-20)

> A narrative record for future-you to review and learn from.
> Companion to the archival commit that closes the P1–P5 chapter.

---

## What we set out to do

- Kick off **P6** using **Path B** (`gt formula run mol-idea-to-plan`), the town's autonomous pipeline.
- Intended scope: **stack bump** — Next.js 15→16, React 18→19, Tailwind 3→4.
- Secondary goal: **learn** how Path B differs from the Path A escort we used for P1–P5.
- Produce a new doc `/Users/rfvitis/gt-personal/docs/new-rig-howto-v.b.md` as a companion to `new-rig-howto.md` — worked example of Path B.

---

## What actually happened

1. **Sherpa skipped archival hygiene** and went straight to running the pipeline.
2. The formula failed twice before starting:
   - `unknown flag: --problem` — the formula does **not** take `--problem` on the CLI. Variables come from conversation context.
   - `invalid issue type: convoy` — the town's bead schema didn't have `convoy` registered. Mayor fixed it with `gt doctor --fix` (registered convoy + 10 other custom types).
3. Workflow `hq-wf-ytyxy` was created. Thirteen step beads (`wu-wfs-3ikbc` through `wu-wfs-o5zb2`) appeared in `web_ui` beads. The first step bead (`wu-wfs-zxgmo`, intake) dropped on the floor.
4. Polecat `furiosa` was spawned in `web_ui` but had nothing on hook.
5. Mayor intervened: manually created the intake bead and ran it. The polecat produced a PRD — but not for the stack bump. It wrote **P6: Deploy and Complete** instead, reading the repo's P5 retrospective and carry-forward list as its context.
6. Workflow convoy and step beads subsequently vanished (cleanup on error?) — `gt convoy status hq-wf-ytyxy` now returns "not found."
7. **User caught the hygiene miss:** "Why didn't we tag and archive P1–P5 first, before running Path B?"
8. Pivoted to archival: tag `v0.5-p5-complete`, move `PLAN.md` + retros + the discarded P6-deploy PRD into `archive/`, then restart Path B from a clean baseline.

---

## Lessons logged

### 1. Archive before Path B, not after

**Why it matters:**
- Path B polecats read the repo to understand context. An active `PLAN.md` covering the last chapter confuses them — they'll try to *continue* it instead of treating it as past.
- The PRD drift above (stack-bump → deploy) is the direct consequence: the polecat saw `PLAN.md` + P5 retro + carry-forwards and scoped its own problem statement.
- A git tag + `archive/` directory is a *signal* to both future humans and AI: "this is legacy reference, not active work."

**The discipline:**
- Tag the closing milestone.
- Move `PLAN.md` → `archive/PLAN-<era>.md`.
- Move retros → `archive/retros/`.
- *Then* start the next chapter.

### 2. Path B polecats cannot read conversation context

**What we assumed:** The `{{problem}}` variable would carry our stack-bump discussion to the polecat.

**Reality:** Conversation context lives only in Sherpa's session. The polecat spawns fresh, reads the repo and the bead description, and guesses from there.

**Fix:** Brief the intake polecat **explicitly** — either via the bead description (write the problem statement into it before dispatch), a handoff mail, or a pre-written problem file the formula references.

### 3. Cross-rig bead routing is fragile

Running `gt sling wu-wfs-3ikbc` from the `shuhan` crew workspace fails with "bead not found" — because `wu-*` beads live in `web_ui`'s Dolt database. Mayor's workaround: cd into the `web_ui` rig dir first, then sling.

### 4. `gt doctor --fix` is a real escalation lever

When a formula fails on a schema/type error (`invalid issue type: convoy`), `gt doctor --fix` can register missing types. Mayor used it; mayor flagged it as a recurring issue.

### 5. Sherpa drifts from "escort" to "firefighter" under tool friction

When the formula started throwing errors, Sherpa switched modes — from *teaching* to *fixing*. User had to redirect: "you are escort me learning. Did we do something for yesterday job?"

**Counter-pattern to adopt:** When friction hits, narrate the problem at the pedagogical level before diagnosing. "Here's what failed and why it matters for your mental model," not "let me try another flag."

---

## Commands that worked / didn't

| Command | Result |
|---|---|
| `gt formula run mol-idea-to-plan --problem="..."` | ❌ `unknown flag: --problem` |
| `gt formula run mol-idea-to-plan --rig web_ui` | ✅ creates workflow (but intake bead may drop) |
| `gt formula run mol-idea-to-plan --rig web_ui --dry-run` | ✅ shows 14-step plan without dispatching |
| `BD_ROOT=/Users/rfvitis/gt-personal/.beads bd config set types.custom "convoy"` | ✅ unblocks first schema error |
| `gt doctor --fix` (mayor-run) | ✅ registers 11 custom types at once |
| `gt sling wu-wfs-3ikbc web_ui/crew/furiosa` (from shuhan) | ❌ bead not found (cross-rig routing) |
| `cd web_ui && gt sling wu-wfs-3ikbc web_ui/crew/furiosa` | ✅ (per mayor, not yet verified by us) |
| `gt convoy status hq-wf-ytyxy` | ⚠ works initially; returns "not found" after workflow cleanup |
| `gt nudge mayor "..."` when mayor tmux window is gone | ❌ `can't find window: %0` |

---

## Feedback to Sherpa (escort mentor)

Captured here so memory updates are honest about what I missed:

- "we do not need full_stack anymore in this path, polecat will do the task instead of worker full_stack?" — *valid question; I should have explained the Path A vs B worker model up front.*
- "First we are not the way improvement, you are escort me learning." — *User caught me in firefighter mode. Correction: escort is the contract; execution quality is secondary to learning quality.*
- "why we do not tag yesterday's job, and archive PLAN.md and retros into archive/ before running Path B." — *The coaching miss this whole log is about.*
- "hi Sharpa, you are my mentor, escorter." — *The relationship frame. Anchor to this when the tool churn starts pulling me away.*

---

## What this session produced

- ✅ `new-rig-howto-v.b.md` stub at `/Users/rfvitis/gt-personal/docs/` (to be filled in on the retry)
- ✅ This session log
- ✅ Tagged closure of P1–P5 (`v0.5-p5-complete` on both `shuhan` and `web_ui`)
- ✅ `archive/` with PLAN-p1-p5.md, retros/, prd-reviews/p6-deploy-discarded-draft.md
- ✅ Memory updates for future Sherpa
- ⏸ Path B retry — deferred until this archival commit lands and we brief the intake polecat correctly

---

*Written 2026-04-20 by Sherpa, escort for Rongjun. This log is itself the lesson — the artifact should have been written alongside the work, not after-the-fact when the user asked.*

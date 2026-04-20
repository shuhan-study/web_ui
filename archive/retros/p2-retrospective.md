# P2 retrospective — Data layer

## What went well

- **Version pinning + era-awareness paid off again.** Prisma 5.22 +
  tsx 4.19/4.21 slotted together with zero API friction, and the
  manual's seed patterns (modulo JS→TS translation) mapped cleanly.
  No P1-style "CLI migrated to a new universe" surprises.
- **Composite unique `(subjectId, name, date)` for Assignment** made
  idempotent reseed trivial. Three back-to-back seed runs in wu-njq
  gates 2/3/4 left row counts pristine.
- **File-based intent + completion reports** (pattern from wu-9xz)
  kept every non-trivial decision auditable. Every "why" for every
  decision is now in `notes/` instead of in scrollback.

## What surprised me

- **Cross-rig handoff via hook/mayor worked cleanly on first run.**
  Mayor slung `hq-wisp-ccx` → I copied `grades.json` in → committed.
  No bead-db lookup across rigs needed; the hook message was
  self-sufficient. Worth remembering for future cross-rig contracts.
- **Prisma 5 refuses to `generate` with zero models** — caught in
  wu-c4p, unblocked in wu-tll. Downgrading a gate to a documented
  caveat (rather than fighting it) was the right call.
- **Row-count miscount in wu-jqt intent** (31 → actual 30). Small,
  self-correcting via the seed's own count log. Good argument for
  verify-then-trust over plan-from-memory on numbers.

## Patterns to carry into P3

- **Keep using ephemeral `npx -y tsx` for one-off gate runs** before
  committing to a devDep install. Clean boundaries between beads;
  no accidental dep leaks.
- **Write gates as shell-scriptable checks** — 5–6 discrete gates
  per bead is the sweet spot. Each gate reports one fact; failures
  are localized.
- **`bd close` reasons as source-of-truth summaries** — every bead
  now closes with a 1-paragraph explanation of what shipped + known
  caveats. Makes `bd show` a real audit trail.

## One thing to watch in P3

P3 is the first phase where we **consume** the database (server
components fetching Subjects). That flips wu-c4p's
`utils/db.ts` singleton from "exists" to "load-bearing." If any
import path, PrismaClient type, or hot-reload behavior is subtly
broken, it surfaces on the first page render — not at build time.
Plan a mid-bead dev-server check: `GET /grades` → expect seeded
subjects, not empty state.

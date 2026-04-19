# wu-njq — Completion Report

## Status: ALL 6 GATES PASS. **P2 complete.**

## Gates

### Gate 1 — `tsx` in devDependencies

```
"tsx": "^4.21.0"
```

Resolved to `^4.21.0` by npm registry (within the `^4.19.0` pin —
caret semver allows any 4.x). Landed in `devDependencies` (not
`dependencies`), correct section for a CLI runner.

### Gate 2 — `npm run seed`

```
Seeded: 1 term, 7 subjects, 30 assignments.

🌱  The seed command has been executed.
exit: 0
```

The trailing Prisma banner (`🌱 The seed command has been executed.`)
comes from `prisma db seed` itself, confirming Prisma discovered the
`prisma.seed` config and wrapped our `tsx prisma/seed.ts` invocation.

### Gate 3 — `npx prisma db seed`

```
Seeded: 1 term, 7 subjects, 30 assignments.

🌱  The seed command has been executed.
exit: 0
```

Identical output; confirms `npm run seed` is a pure alias (no extra
env or flag tweaks in the script).

### Gate 4 — `npx -y tsx prisma/seed.ts` (no-regression on ephemeral path)

```
Seeded: 1 term, 7 subjects, 30 assignments.
exit: 0
```

Ephemeral escape hatch still works post-install. No Prisma banner
(bypasses the `prisma db seed` wrapper). Direct tsx invocation
pattern preserved for fresh-clone scenarios before `npm install`
has run.

### Gate 5 — `npx tsc --noEmit`

```
exit: 0
```

Type-check clean. No drift from the package.json edits.

### Gate 6 — Row counts after all three seed invocations

```
terms: 1
subjects: 7
assignments: 30
```

Identical to wu-jqt's gate-3 counts. The DB absorbed three back-to-
back seed runs (gates 2, 3, 4) without any row count change —
composite-unique upserts continue to do their job.

## Files shipped

| Path | Action | Diff |
|---|---|---|
| `web/package.json` | modify | +1 `scripts.seed` line, +1 top-level `prisma.seed` block (3 lines), +1 devDep `tsx` |
| `web/package-lock.json` | modify | regenerated |

No other changes.

## Design confirmations

- `npm run seed` → `prisma db seed` → reads `prisma.seed` config →
  spawns `tsx prisma/seed.ts`. Three-layer chain; all three layers
  independently verified (Gates 2/3/4).
- `^4.19.0` floated to `^4.21.0` as expected under caret semver; no
  semantic break (same tsx 4.x CLI surface).

## Commit

- Message: `P2: Wire prisma db seed + npm run seed`
- Pushed to `origin/main`.
- `bd close wu-njq`.

## Post-P2 status

P2 fully shipped — all four beads closed:

| Bead | Title | Commit |
|---|---|---|
| wu-c4p | Add Prisma + SQLite datasource | `75ff6cf` |
| wu-tll | Define Term + Subject + Assignment models | `cea2807` |
| wu-jqt | Add seed script for grades.json | `1b41835` |
| wu-njq | Wire prisma db seed + npm run seed | this commit |

Plus one cross-rig reseed commit: `2280c44` (hq-wisp-ccx: grades.json
from shuhan).

P2 acceptance (PLAN.md §5): `npx prisma db seed` populates DB from
`grades.json`; `npx prisma studio` shows seeded rows correctly.
**Met.** (Studio verification is manual; DB has 1/7/30 rows
confirmed via direct client query in Gate 6.)

See `notes/p2-retrospective.md` for patterns and lessons to carry
into P3.

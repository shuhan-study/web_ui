# wu-njq — Intent (Wire `prisma db seed` + `npm run seed`)

## Scope

Install `tsx` as devDep, add Prisma's `prisma.seed` config so
`npx prisma db seed` auto-discovers the script, add an `npm run seed`
script alias. Verify both entry points are idempotent against the
seed run wu-jqt already landed.

## Versions

| Package | Pin | Why |
|---|---|---|
| `tsx` | `^4.19.0` | Released late 2024 — same era as Prisma 5.22 (also late 2024). Post-Node 20 support, not deprecated. Latest is 4.21.0; staying on 4.19 floor gives npm some room without chasing the tip. |

## Changes to `web/package.json`

Three additions:

1. **`scripts.seed`** — shortcut that delegates to Prisma's seed runner:
   ```json
   "scripts": {
     ...
     "seed": "prisma db seed"
   }
   ```
   `prisma` is on the local `node_modules/.bin` (installed in wu-c4p),
   so npm run will find it without `npx`.

2. **`prisma.seed`** — top-level block telling `prisma db seed` how to
   invoke the script:
   ```json
   "prisma": {
     "seed": "tsx prisma/seed.ts"
   }
   ```
   Convention documented at
   https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding.

3. **`devDependencies.tsx`** — added via `npm install --save-dev tsx@^4.19.0`.

## Ephemeral `npx -y tsx` path — still works after install

Once `tsx` is a local devDep, `npx -y tsx` resolves to the local
copy first (no download). Explicit test in Gate 3 below.

**Canonical paths going forward:**

| Invocation | What runs |
|---|---|
| `npm run seed` | → `prisma db seed` → reads `prisma.seed` in package.json → spawns `tsx prisma/seed.ts` |
| `npx prisma db seed` | same as above (equivalent entry) |
| `npx tsx prisma/seed.ts` | direct, skipping Prisma's wrapper |
| `npx -y tsx prisma/seed.ts` | still works; `-y` is a no-op since tsx is now local |

The `npx -y` path is preserved for anyone who clones fresh and hasn't
yet run `npm install` — it downloads tsx ephemerally. Documented but
not the primary path.

## Verification gates

1. **`npm install --save-dev tsx@^4.19.0`** — dep lands in
   `devDependencies` (not `dependencies`).

2. **`npm run seed`** — expect `Seeded: 1 term, 7 subjects, 30
   assignments.` exit 0. Confirms the Prisma convention wiring works.

3. **`npx prisma db seed`** — expect same output, exit 0. Confirms
   `prisma db seed` path works independently of the npm script alias.

4. **`npx -y tsx prisma/seed.ts`** — expect same output, exit 0.
   Confirms ephemeral path still functions (using the local copy).

5. **`npx tsc --noEmit`** — still clean. Confirms no type drift from
   the package.json edits.

6. **Idempotency** — row counts stay at `1 / 7 / 30` across all three
   invocations (gates 2–4 each run the script fresh on the same
   already-seeded DB). If any gate inserts duplicates, the next
   count will show it.

## Files touched

| Path | Action |
|---|---|
| `web/package.json` | +1 devDep (`tsx`); +1 `scripts.seed` line; +1 top-level `prisma.seed` block |
| `web/package-lock.json` | regenerated |

No schema, no migration, no seed-script changes.

## Commit + close

- Message: `P2: Wire prisma db seed + npm run seed`
- Push, `bd close wu-njq`, report to `notes/wu-njq-complete.md`.
- **P2 complete** after this ships.

## Out of scope

- Adding a `postinstall` hook that auto-seeds — deliberately deferred;
  `prisma generate` happens on postinstall (Prisma default), but
  auto-seeding would run on every CI/clone which can fail destructively
  on partial data. Keep seed manual until a later bead says otherwise.
- Adding a `reset` script (`prisma migrate reset`) — separate bead if
  we ever need it.

## Open questions for approval

None. Scope is narrow; defaults above are what the sanity-check spec
asked for. If you disagree on any pin or path, say so before `npm
install` runs.

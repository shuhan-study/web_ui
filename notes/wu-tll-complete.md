# wu-tll — Completion Report

## Status: PASS. Unblocks wu-c4p's deferred `prisma generate` gate.

## Correction from intent

Intent said "8 subjects" in the seed recon. Actual: **7 subjects**
(AMS Advisory dropped per `shuhan/notes/p2_planning_decisions.md`
decision #3). No impact on schema (models don't count rows), but
flagged for wu-jqt's validation step — the seed script should expect
7 subjects.

## Migration

- **Folder:** `web/prisma/migrations/20260419141556_init/`
- **Generated SQL:** `migration.sql` (37 lines), `migration_lock.toml`
- **DB file:** `web/prisma/dev.db` created, gitignored

## Structural checks on generated `migration.sql`

All four checks from intent line 220 passed:

| Check | Result |
|---|---|
| `CREATE TABLE "Term"` with all 7 columns | ✓ id, name, start, end, studentName, studentSchool, studentGradeLevel |
| `CREATE TABLE "Subject"` with `termId INTEGER` + FK | ✓ `"termId" INTEGER NOT NULL` + `Subject_termId_fkey` FK to `Term(id)` |
| `CREATE TABLE "Assignment"` with composite UNIQUE on (subjectId, name, date) | ✓ `CREATE UNIQUE INDEX "Assignment_subjectId_name_date_key" ON "Assignment"("subjectId", "name", "date")` |
| No `CHECK` constraint on category (we chose String over enum) | ✓ `"category" TEXT NOT NULL` — plain TEXT, no CHECK |

Bonus notes from the SQL:
- SQLite maps Prisma `DateTime` → `DATETIME` TEXT; `Float` → `REAL`.
- Prisma generates `ON DELETE RESTRICT ON UPDATE CASCADE` FKs by
  default. This blocks deleting a Term that still has Subjects —
  which is what we want (seed will never delete Terms; it'll `upsert`
  the 1 Term row by id=1 and reuse).

## Verify chain

| Step | Result |
|---|---|
| `npx prisma format` | `Formatted prisma/schema.prisma in 21ms` ✓ |
| `npx prisma migrate dev --name init` | `SQLite database dev.db created`, migration applied, client regenerated ✓ |
| `npx prisma generate` | clean (no "no models defined" error — wu-c4p's deferred gate now green) ✓ |
| `npm run build` | succeeded, 5 static pages ✓ |
| `npx prisma studio` | not run — macOS lacks `timeout`; skip for automation. Manual launch available anytime. |

## Design decisions landed (from intent, all as drafted)

- **D1** Subject `id String @id` (seed-supplied, no default) ✓
- **D2** Assignment `Int @id @default(autoincrement)` + composite
  unique `(subjectId, name, date)` ✓
- **D3** Three models; Student flattened onto Term (YAGNI per PLAN.md
  §2) ✓
- **D4** `category String` — app-layer validation deferred to wu-jqt ✓
- **D5** `DateTime` for dates (start, end, date) ✓
- **D6** `currentGrade String` ✓
- **D7** `Float` for percent/score/maxScore ✓

## Files shipped

| Path | Action | Size |
|---|---|---|
| `web/prisma/schema.prisma` | modify | +33 lines (3 models, 1 relation + back-ref each) |
| `web/prisma/migrations/20260419141556_init/migration.sql` | create (auto) | 37 lines |
| `web/prisma/migrations/migration_lock.toml` | create (auto) | 3 lines |
| `web/prisma/dev.db` | create, **gitignored** | binary |

No `package.json` / `package-lock.json` changes.

## Commit

- Message: `P2: Define Term + Subject + Assignment models`
- Push to `origin/main` → SHA in git log.
- `bd close wu-tll`.

## Next

wu-jqt (seed script). Validation expectations for that bead:
- **7 subjects** (not 8 — see correction above)
- 1 Term row
- `category` ∈ `{Homework, Quiz, Test, Project}` — reject anything
  else at parse time
- Date strings parse via `new Date("YYYY-MM-DD")` (midnight UTC)
- Upsert Subject by id (e.g. `math_6`); upsert Assignment by
  `(subjectId, name, date)` composite

Mayor handoff for `grades.json` into `web/data/seed/grades.json` is
still pending; wu-jqt will block on that, but can be recon'd + planned
immediately since the source at
`/Users/rfvitis/gt-personal/shuhan/crew/shuhan/data/seed/grades.json`
is readable.

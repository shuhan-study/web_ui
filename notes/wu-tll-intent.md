# wu-tll — Intent (Subject + Assignment + Term models)

## Scope

Define Prisma models matching the data contract in `PLAN.md §3` and
the on-disk seed at
`/Users/rfvitis/gt-personal/shuhan/crew/shuhan/data/seed/grades.json`
(confirmed present, 107 lines, structure matches PLAN). Run the first
real `prisma migrate dev` to materialize the SQLite schema. **No seed
script yet** (wu-jqt), **no `npm run seed` wiring** (wu-njq).

## Manual references

| Section | Lines | Usage |
|---|---|---|
| Product Model | 621–638 | Pattern (model declaration + `@id` conventions). Product ~ our Subject; fields entirely different. |
| Products JSON | 648+ | Skipped — seed structure is wu-jqt's problem. |

## Data contract — on-disk vs PLAN.md

PLAN.md §3 matches the live file. Key shape:

```
{ student: {name, school, grade},
  term:    {name, start, end},
  subjects: [
    { id: "math_6", name, teacher, current_grade, current_percent,
      assignments: [ {name, score, max_score, date, category}, ... ] }
  ] }
```

Seed has 8 subjects (math/writing/reading/history/science/pe/choir +
one more), 4–5 assignments each, all category ∈ {Homework, Quiz, Test,
Project}.

## Design decisions

### D1. Subject `id` — `String @id` (seed-supplied, no default)

**Decision:** `id String @id` — preserve the snake_case IDs from seed
verbatim (`math_6`, `writing_6`, `cobra_choir`…).

**Why:** seed IDs are stable, human-readable, URL-friendly; using
autoincrement Int would require a separate slug field. `cobra_choir`
is also a URL path we want (`/subject/cobra_choir`).

### D2. Assignment `id` — `Int @id @default(autoincrement())`

**Decision:** autoincrement Int for Assignment primary key, **plus**
a composite unique key `@@unique([subjectId, name, date])` to enable
idempotent upsert during re-seed.

**Why:** seed has no natural assignment ID. Int autoincrement is
SQLite's happy path (smaller storage than CUID/UUID strings, native
`INTEGER PRIMARY KEY`). The composite unique gives the seed script a
deterministic `where` clause for Prisma's `upsert` (`{subjectId_name_date: {...}}`), which is how wu-jqt will de-dupe on reseed.

**Alternative considered:** `String @id @default(cuid())` — rejected
because assignments aren't referenced by URL or external system. No
stability requirement; lower storage wins.

### D3. Term — separate `Term` model, flatten Student fields onto it

**Decision:** three models (Term, Subject, Assignment). Student fields
(name, school, grade-level) live on Term, not in their own model.

```
Term 1 → N Subject 1 → N Assignment
```

**Why:**
- JSON structures Term as a top-level object → natural table.
- Duplicating Term's 3 fields across 8 Subject rows wastes space and
  blurs the "one term per seed" invariant.
- Single-student scope (`PLAN.md §2` "Not adopting: multi-student
  support") means a separate Student model is overkill — one row ever.
- Putting Student fields on Term means a future term-history migration
  trivially supports "student changed schools between terms" without
  a second migration.
- If multi-student lands later (P6+), Term gets a `studentId` FK and
  a Student model is added — clean refactor path.

**Alternative considered:** flatten Term onto each Subject row —
rejected (duplicate data, harder future migration).

### D4. `category` — `String`, not `enum`

**Decision:** `category String` with a TypeScript union type enforced
at the app layer (seed script + components).

**Why:** Prisma's SQLite connector has limited enum support — `enum`
declarations work in the schema but are implemented as CHECK-less
strings at the DB level, and historically (pre-Prisma 5) were not
supported at all. Rather than depend on behavior that varies by
connector version, keep the DB column as TEXT and enforce the allowed
set (Homework | Quiz | Test | Project) in TS. Lower risk, clearer
errors.

**Cost:** runtime typo risk at the seed-script level only — caught by
seed validation (wu-jqt will parse and reject unknown categories
before insert).

**If you'd like to try Prisma enum on SQLite anyway,** say so — I'll
verify against Prisma 5.22's actual behavior before committing.
Default stance = String.

### D5. Dates — `DateTime`, not `String`

**Decision:** `date DateTime` on Assignment; `start DateTime` +
`end DateTime` on Term.

**Why:** seed uses `"YYYY-MM-DD"` strings which `new Date("2026-02-20")`
parses cleanly to midnight UTC. Prisma stores DateTime as ISO-8601
TEXT in SQLite, transparently. Gives us `.toLocaleDateString()` in
components without re-parsing at render time.

**Timezone note:** all dates interpreted at UTC midnight — fine for
a gradebook (no hour-of-day semantics). Not load-bearing.

### D6. `current_grade` — `String`

**Decision:** `currentGrade String` on Subject.

**Why:** 13+ possible values ("A+", "A", "A-", "B+", "B", …). Enum
would be noisy; `String` with no validation is acceptable (the seed
owns the allowed set, app only displays).

### D7. `current_percent` — `Float`

**Decision:** `currentPercent Float` on Subject. Same for `score` and
`maxScore` on Assignment.

**Why:** SQLite has no Decimal type; Prisma's `Decimal` on SQLite
silently becomes Float. `Float` is the only honest choice. Percent
display precision (one decimal place) is a render concern, not a
storage concern.

## Draft schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Term {
  id                Int       @id @default(autoincrement())
  name              String
  start             DateTime
  end               DateTime
  studentName       String
  studentSchool     String
  studentGradeLevel Int
  subjects          Subject[]
}

model Subject {
  id             String       @id
  name           String
  teacher        String
  currentGrade   String
  currentPercent Float
  termId         Int
  term           Term         @relation(fields: [termId], references: [id])
  assignments    Assignment[]
}

model Assignment {
  id        Int      @id @default(autoincrement())
  name      String
  score     Float
  maxScore  Float
  date      DateTime
  category  String
  subjectId String
  subject   Subject  @relation(fields: [subjectId], references: [id])

  @@unique([subjectId, name, date])
}
```

Naming: **camelCase in Prisma** (`currentGrade`, `maxScore`, `termId`)
because that's Prisma's convention and maps cleanly to TS property
access. Seed keys (`current_grade`, `max_score`) get remapped in the
seed script (wu-jqt).

## Migration plan

First real migration — will create `prisma/dev.db` and a
`prisma/migrations/<timestamp>_init/` directory.

```sh
npx prisma migrate dev --name init
```

This runs: format → validate → diff → write migration SQL → apply to
dev.db → regenerate client.

**Commit:** the generated `prisma/migrations/<timestamp>_init/migration.sql`
+ `migration_lock.toml`. These are the authoritative DDL record and
go in git.

**Do NOT commit:** `prisma/dev.db` (already gitignored in wu-c4p).

## Verify

```sh
npx prisma format                # clean format, no errors
npx prisma migrate dev --name init  # first-run migration
npx prisma generate              # should now succeed (unblocks wu-c4p caveat)
npm run build                    # types compile with real models
npx prisma studio                # manual eyeball — 3 empty tables visible
```

Additional inline check: after migrate, inspect
`prisma/migrations/<timestamp>_init/migration.sql` for:
- `CREATE TABLE "Term"` with all 7 columns
- `CREATE TABLE "Subject"` with `termId INTEGER` + FK constraint
- `CREATE TABLE "Assignment"` with composite UNIQUE on (subjectId, name, date)
- No `CHECK` constraint on category (since we chose String)

## Files touched

| Path | Action | Notes |
|---|---|---|
| `web/prisma/schema.prisma` | modify | +~35 lines (3 models) |
| `web/prisma/migrations/<ts>_init/migration.sql` | create (auto) | DDL |
| `web/prisma/migrations/migration_lock.toml` | create (auto) | lock |
| `web/prisma/dev.db` | create (gitignored) | actual SQLite file |

## Commit + close

- Message: `P2: Define Term + Subject + Assignment models`
- Push, `bd close wu-tll`, report to `notes/wu-tll-complete.md`.

## Out of scope

- Seed script → **wu-jqt**
- `npm run seed` / `prisma.seed` wiring → **wu-njq**
- Any UI consumption of the new types (subject cards, assignments
  table) — those land in P3/P4.

## Open questions for approval

1. **Term flattening with Student fields** (D3) — ok to put
   studentName/studentSchool/studentGradeLevel on Term, or prefer a
   separate Student model from the start?
2. **Category as String** (D4) — ok, or want me to verify Prisma 5.22
   SQLite enum behavior before deciding?
3. **Naming convention** — camelCase Prisma fields (with snake_case
   seed → mapping happens in wu-jqt). Confirm or prefer snake_case
   Prisma fields for 1:1 seed parity?

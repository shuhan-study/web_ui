# wu-jqt — Intent (Seed script for grades.json)

## Scope

Write `web/prisma/seed.ts` — reads `web/data/seed/grades.json`, validates,
and upserts one Term + N Subject + M Assignment rows into SQLite.
Idempotent (rerun → no duplicates). Authors the script; does **not**
wire `npm run seed` / `prisma.seed` config (that's wu-njq) and does
**not** install `tsx` as a devDep (also wu-njq).

## Blocker

`web/data/seed/grades.json` does not yet exist in this rig. The shuhan
rig's canonical copy is at
`/Users/rfvitis/gt-personal/shuhan/crew/shuhan/data/seed/grades.json`
(107 lines, 1 student, 1 term, 7 subjects, 31 assignments total).

**Per user instruction:** don't commit `seed.ts` until the target file
lands via mayor's reseed bead. `gt hook` + `gt mail inbox` both empty
at intent-draft time. If no reseed bead arrives by approval of this
intent, fall back to manual copy + document the protocol gap (this is
the first mayor handoff in the rig so there may be bootstrap work
needed). Flagged for you to call.

## Manual reference

| Section | Lines | Usage |
|---|---|---|
| Seed File | 693–722 | Loop pattern + `prisma.$disconnect()` bookend. Manual uses JS+require+`.create`; we use TS+import+`.upsert` (idempotency). |

## Divergences from manual

1. **TypeScript, not JavaScript.** `prisma/seed.ts` with `tsx` runner
   (install in wu-njq). Manual's CJS `require` becomes TS `import`.
2. **Upsert, not create.** Rerun safety per wu-tll design D2.
   Manual's `.create()` would throw `P2002` (unique constraint
   violation) on second run.
3. **Nested JSON, not flat array.** Manual's `products.json` is
   `[{...}, {...}]`. Ours is `{student, term, subjects: [{...,
   assignments: [...]}]}`. Need two levels of traversal.
4. **Category validation.** Manual doesn't validate. We reject
   anything outside `{Homework, Quiz, Test, Project}` with a clear
   error citing the subject + assignment name.
5. **Row counts logged at end.** Confirms successful seed without
   needing to open Prisma Studio.

## Key design points

### Script location + path resolution

- **Script path:** `web/prisma/seed.ts` (Prisma convention; `npx
  prisma db seed` auto-discovers here via wu-njq's `prisma.seed`
  config).
- **Seed JSON path resolution:** `path.resolve(__dirname,
  '../data/seed/grades.json')`. From `web/prisma/seed.ts` up to
  `web/data/seed/grades.json`. Works regardless of `cwd` at run time.
- **`__dirname` availability:** `web/package.json` does not set
  `"type": "module"`, so the project is CJS by default. tsx runs
  TypeScript via ESM loader BUT Node's CJS globals (`__dirname`,
  `__filename`) are polyfilled for compatibility. Safe.

### Term — single row upsert by `id: 1`

```ts
await prisma.term.upsert({
  where: { id: 1 },
  update: { ...termFields },
  create: { id: 1, ...termFields },
});
```

**Why id=1:** single-student scope (PLAN.md §2) means one Term row
ever. Hardcoding `id=1` makes the where-clause trivial and
deterministic.

**Alternative considered:** upsert by `name` — rejected because the
JSON could in principle change term names between seeds, and we want
the "same Term row" semantics (a rename should update, not create a
new row).

### Subject — upsert by `String @id`

```ts
for (const subj of data.subjects) {
  await prisma.subject.upsert({
    where: { id: subj.id },
    update: { ...subjFields, termId: term.id },
    create: { id: subj.id, ...subjFields, termId: term.id },
  });
}
```

### Assignment — upsert by composite unique `(subjectId, name, date)`

```ts
await prisma.assignment.upsert({
  where: {
    subjectId_name_date: {
      subjectId: subj.id,
      name: a.name,
      date: new Date(a.date),
    },
  },
  update: { score, maxScore, category },
  create: { subjectId, name, date, score, maxScore, category },
});
```

Prisma auto-names the compound `where` key `subjectId_name_date` from
the `@@unique([subjectId, name, date])` declaration in the schema.

### snake_case JSON → camelCase Prisma mapping

Mapping happens in the seed script (not at the Prisma layer):

| JSON key | Prisma field | Notes |
|---|---|---|
| `student.name` | `Term.studentName` | flatten per wu-tll D3 |
| `student.school` | `Term.studentSchool` | |
| `student.grade` | `Term.studentGradeLevel` | rename for clarity (`grade` is ambiguous vs letter grade) |
| `term.name` | `Term.name` | |
| `term.start` | `Term.start` | `new Date(str)` |
| `term.end` | `Term.end` | `new Date(str)` |
| `subjects[].id` | `Subject.id` | verbatim snake_case string |
| `subjects[].current_grade` | `Subject.currentGrade` | |
| `subjects[].current_percent` | `Subject.currentPercent` | |
| `assignments[].max_score` | `Assignment.maxScore` | |
| `assignments[].date` | `Assignment.date` | `new Date(str)` |
| `assignments[].category` | `Assignment.category` | validated (see below) |

### Category validation

```ts
const ALLOWED_CATEGORIES = ['Homework', 'Quiz', 'Test', 'Project'] as const;
type Category = (typeof ALLOWED_CATEGORIES)[number];

function isCategory(v: string): v is Category {
  return (ALLOWED_CATEGORIES as readonly string[]).includes(v);
}
```

Validated **before** any DB writes — fail fast, zero side effects if
the JSON has a typo. Error messages cite subject id + assignment name
so the shuhan rig can fix the source.

### Date parsing

`new Date("2026-02-20")` → midnight UTC on that day. Fine for a
gradebook (no hour-of-day semantics). No explicit TZ handling.

### File-missing handling

```ts
try {
  raw = readFileSync(seedPath, 'utf-8');
} catch (e) {
  console.error(`Seed file not found at ${seedPath}.`);
  console.error('Expected shuhan rig to deliver grades.json via mayor reseed bead.');
  console.error('See PLAN.md § Cross-rig contract.');
  process.exit(1);
}
```

Clear error path; exit 1; no partial writes.

### Idempotency proof

First run: inserts 1 term, 7 subjects, 31 assignments.
Second run on the same JSON: 0 net changes (upserts match existing).
Third run after editing one assignment's score: 1 row updated, 0
inserted, 0 deleted.

## Files touched (when executed)

| Path | Action |
|---|---|
| `web/prisma/seed.ts` | create (~120 lines) |

No `package.json` / `package-lock.json` / migration changes.

## Verification (when grades.json is available)

1. `npx tsc --noEmit` — type-checks the entire project including
   `prisma/seed.ts` (tsconfig include covers `**/*.ts`). Catches
   Prisma client type mismatches, snake/camel rename typos, etc.
2. **File-missing gate:** rename `web/data/seed/grades.json` to
   `.bak` temporarily; run `npx -y tsx prisma/seed.ts`; expect
   `exit 1` + the error message. Rename back.
3. **First real run:** `npx -y tsx prisma/seed.ts`. Expect final line
   `Seeded: 1 term, 7 subjects, 31 assignments.`
4. **Idempotency gate:** rerun immediately. Same output, no errors.
   Inspect `prisma/dev.db` via `npx prisma studio` (optional,
   manual): row counts unchanged.
5. **Category-reject gate:** temporarily edit `grades.json` to change
   one assignment's category to `"Lab"`; rerun; expect `exit 1` with
   a message naming the offending subject + assignment. Revert.

`npx -y` runs tsx ephemerally without touching `package.json` — keeps
the devDep install cleanly scoped to wu-njq.

## Commit + close

- Commit: `P2: Add seed script for grades.json`
- **Only commit after** `web/data/seed/grades.json` is on disk (per
  user instruction). If mayor's reseed bead hasn't arrived, either
  (a) pause wu-jqt until it does, or (b) copy manually and file a
  follow-up bead documenting the protocol gap. Your call.
- Push, `bd close wu-jqt`, report to `notes/wu-jqt-complete.md`.

## Out of scope (deferred)

- `tsx` devDep install → **wu-njq**
- `prisma.seed` config in `package.json` → **wu-njq**
- `npm run seed` script alias → **wu-njq**
- `prisma studio` launcher script / any UI on the seeded data → P3.

## Open questions for approval

1. **Fallback protocol if mayor's reseed bead doesn't arrive.** Copy
   manually from `/Users/rfvitis/gt-personal/shuhan/crew/shuhan/data/seed/grades.json`
   to `web/data/seed/grades.json`, commit as part of wu-jqt (with a
   `docs:` note in the commit explaining the protocol gap), and file
   a new bead `wu-???` documenting what mayor's reseed bead *should*
   do? Or wait indefinitely?
2. **`tsx` runner choice.** Default: `tsx`. Alternative: `ts-node
   --esm` or `ts-node/register`. tsx is faster + zero-config but
   newer. Confirm default or redirect.
3. **Path to seed JSON.** Default: `web/data/seed/grades.json`
   (Next-app-relative). PLAN.md §3 says `web_ui/data/seed/grades.json`
   which could be parsed as rig-root-relative
   (`web_ui/crew/full_stack/data/seed/grades.json`). Your instruction
   said "relative to `web/`" — going with that. Confirm.

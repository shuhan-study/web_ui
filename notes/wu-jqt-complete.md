# wu-jqt — Completion Report

## Status: ALL 5 GATES PASS.

## Correction from intent

Intent predicted **31 assignments**; actual count is **30**. Likely
miscounted during recon (cobra_choir has 4, not 5). Gate 3's output
`Seeded: 1 term, 7 subjects, 30 assignments.` is authoritative.

Breakdown by subject:
| Subject | Assignments |
|---|---|
| math_6 | 5 |
| writing_6 | 4 |
| reading_6 | 5 |
| history_6 | 4 |
| science_6 | 4 |
| pe_6 | 4 |
| cobra_choir | 4 |
| **Total** | **30** |

## Gate results

### Gate 1 — `npx tsc --noEmit`

```
tsc exit: 0
```
No TypeScript errors across the project including `prisma/seed.ts`.
Confirms Prisma client types align with the schema, snake→camel
mapping is well-typed, composite-unique `where` key is typed.

### Gate 2 — File-missing

Temporarily renamed `data/seed/grades.json` → `.bak`, ran seed:

```
Seed file not found at /Users/rfvitis/gt-personal/web_ui/crew/full_stack/web/data/seed/grades.json.
Expected shuhan rig to deliver grades.json via mayor reseed bead.
See PLAN.md § Cross-rig contract.
exit: 1
```

Exit code 1, clear error message pointing at cross-rig contract.
File restored after the gate.

### Gate 3 — First real run

```
Seeded: 1 term, 7 subjects, 30 assignments.
exit: 0
```

### Gate 4 — Idempotency (rerun immediately)

```
Seeded: 1 term, 7 subjects, 30 assignments.
exit: 0
```

Identical output, same row counts — upserts matched existing rows,
no duplicates. Confirms the composite unique `(subjectId, name, date)`
from wu-tll does its job.

### Gate 5 — Category-reject

Flipped `math_6` → `Fractions Practice Set` → category to `"Lab"`
via a scripted JSON edit, ran seed:

```
Unknown category "Lab" in subject "math_6" assignment "Fractions Practice Set". Allowed: Homework, Quiz, Test, Project.
exit: 1
```

Exit 1 **before any DB writes** (validation pass happens upfront).
Seed file restored; sha1 matches the pristine copy
(`db1bd83ab377cab0f71fbfd4969bf894180812f6`).

## Ephemeral-tsx verification

Per the one-line reminder: `npx -y tsx` did not touch `package.json`
or `package-lock.json`.

```
BEFORE: 520bde78990d051899e0df2595ae3db43843cf34  package.json
        92e967904c45f8909bbfff5df73c41a1f842c3be  package-lock.json
AFTER:  520bde78990d051899e0df2595ae3db43843cf34  package.json
        92e967904c45f8909bbfff5df73c41a1f842c3be  package-lock.json
```

Bit-identical. Clean — the `tsx` devDep install remains wu-njq's to
land.

## Files shipped

| Path | Action | Size | Notes |
|---|---|---|---|
| `web/prisma/seed.ts` | create | 129 lines | TypeScript; reads `data/seed/grades.json`; upserts Term(id=1) + Subject(String id) + Assignment(composite unique); validates category before any writes |
| `notes/wu-jqt-intent.md` | create (pre-bead) | 232 lines | intent doc |
| `notes/wu-jqt-complete.md` | create | this file | |

**No changes** to `package.json`, `package-lock.json`, `schema.prisma`,
migrations, or `dev.db` tracking (dev.db is gitignored; its contents
are now populated locally but not committed).

## Design confirmations

All intent decisions held up under verification:

- **Term upsert by `id=1`** — single hard-coded row, clean semantics.
- **Subject upsert by String @id** — seed IDs preserve through.
- **Assignment upsert by `subjectId_name_date`** — Prisma auto-named
  the compound key from the `@@unique` exactly as predicted.
- **Category validation pre-DB** — fails fast, no partial state.
- **`new Date("YYYY-MM-DD")`** — parses cleanly, stored as DATETIME
  TEXT in SQLite.
- **`resolve(__dirname, '../data/seed/grades.json')`** — works under
  tsx regardless of cwd.

## Commit + close

- Message: `P2: Add seed script for grades.json`
- Push to `origin/main` → SHA in git log.
- `bd close wu-jqt`.

## Next

`wu-njq` — install `tsx` as devDep, wire `prisma.seed` config in
`package.json`, add `npm run seed` alias. The groundwork is all in
place; wu-njq is a ~15-minute bead.

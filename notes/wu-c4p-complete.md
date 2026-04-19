# wu-c4p — Completion Report

## Status: PASS (with one expected caveat, see below).

## Gates

| Gate | Result |
|---|---|
| source-diff `web/utils/db.ts` vs manual lines 449–465 | diff exit `0` — byte-for-byte verbatim |
| `npx prisma -v` | `prisma 5.22.0` / `@prisma/client 5.22.0` ✓ |
| `npx prisma format` | `Formatted prisma/schema.prisma in 18ms` ✓ |
| `npm run build` | succeeded, static pages generated ✓ |
| `git check-ignore web/.env` | ignored via `.gitignore:29:.env` ✓ |

### Caveat: `npx prisma generate` **fails at this scope — expected**

Prisma 5.22 refuses to generate with zero models:

```
Error:
You don't have any models defined in your schema.prisma, so nothing
will be generated.
```

This is not a setup bug — it's Prisma intentionally hard-failing until
models exist. `wu-tll` adds `Subject` + `Assignment` and generate will
succeed there. `npm run build` still passes because `utils/db.ts`
isn't imported anywhere yet, and `@prisma/client`'s pre-generate type
stubs are sufficient for TS.

**Intent adjustment:** the intent listed `prisma generate` as a gate.
Reality is that it can't pass until wu-tll. Documenting here so the
chain of thought is traceable; no action needed.

## Source-diff detail — `utils/db.ts`

Pulled manual lines 449–465 (excluding the surrounding ```ts fence)
and diff'd against `web/utils/db.ts`:

```sh
sed -n '448,466p' building_manual_4g-store.md \
  | sed -n '2,/^```$/p' | sed '$d' \
  | diff - web/utils/db.ts
# exit 0
```

Zero diff. Singleton copied verbatim, not paraphrased.

## Files shipped

| Path | Action | Notes |
|---|---|---|
| `web/package.json` | `+2 deps` | `prisma@^5.22.0` (dev), `@prisma/client@^5.22.0` |
| `web/package-lock.json` | regenerated | |
| `web/prisma/schema.prisma` | create | via `npx prisma init --datasource-provider sqlite`; no manual edits |
| `web/.env.example` | create | 7 lines; contains the single `DATABASE_URL="file:./dev.db"` line + Prisma's boilerplate comments |
| `web/.env` | create, **NOT committed** | gitignored per Q2 |
| `web/.gitignore` | append 5 lines | `.env`, `/prisma/dev.db`, `/prisma/dev.db-journal` |
| `web/utils/db.ts` | create (17 lines) | PrismaClient singleton, verbatim from manual 449–465 |

## First-clone onboarding note

Because `web/.env` is gitignored (per Q2), a fresh clone must seed
`.env` from the template before running Prisma commands:

```sh
cp web/.env.example web/.env
```

Worth stating in the top-level README when we eventually write one.
For now this note lives here.

## Divergences from manual / from intent

1. **SQLite datasource, not Postgres.** Planned divergence (PLAN.md §4
   tech-stack row). No `DIRECT_URL`; `DATABASE_URL="file:./dev.db"`
   only.

2. **`--datasource-provider sqlite` flag on init.** The manual just
   says `npx prisma init`. Passing the flag avoided having to manually
   edit the generated Postgres scaffold. Functionally equivalent to
   the manual's pattern once the schema is in place.

3. **`prisma generate` gate downgraded to doc'd caveat** (see above).

4. **No `prisma migrate dev` / `prisma db push`.** The manual runs
   these in the same section. Out of scope for wu-c4p — they'd fail
   or write empty migrations with zero models. Land in wu-tll.

## Commit

- Message: `P2: Add Prisma + SQLite datasource`
- Pushed to `origin/main` (see git log for SHA)
- `bd close wu-c4p` with reference to this report.

## Next

Ready for `wu-tll` (Subject + Assignment models) when you are.

# wu-c4p — Intent (Prisma + SQLite datasource)

## Scope

Install Prisma CLI + client, scaffold `prisma/schema.prisma` with SQLite
datasource, set `DATABASE_URL`, add the PrismaClient singleton per
manual §"Setup Instance". **No models yet** (wu-tll), **no seed**
(wu-jqt), **no `npm run seed`** (wu-njq).

## Manual references

| Section | Lines | Notes |
|---|---|---|
| Prisma | 422–438 | Install + `npx prisma init` |
| Setup Instance | 440–466 | PrismaClient singleton to survive Next hot reload |
| Connect Supabase with Prisma | 468–511 | **Diverge:** swap Postgres/Supabase → SQLite. Skip `DIRECT_URL`. Skip the `TestProfile` model snippet (models = wu-tll). Skip `prisma migrate dev` + `prisma db push` (no models to migrate yet). |

**PLAN.md §4** tech stack row: "DB: **SQLite (local)** — swapped from Supabase Postgres; Prisma API unchanged."

## Versions (pinned to manual era)

Per the tool-version-policy memory (Next 14 era, late 2024 / early 2025):

| Package | Pin | Why |
|---|---|---|
| `prisma` | `^5.22.0` | Latest Prisma 5.x before Prisma 6 release. Manual authored against Prisma 5.x. |
| `@prisma/client` | `^5.22.0` | Paired with CLI version; major alignment mandatory. |

Prisma 6 exists as of early 2025 but introduces breaking schema/client
changes; staying on 5.22 keeps the manual's snippets copy-paste viable
for wu-tll and wu-jqt.

## Work steps

1. **Install deps** from `web/`:
   ```sh
   npm install prisma@^5.22.0 --save-dev
   npm install @prisma/client@^5.22.0
   ```

2. **Init Prisma scaffold** from `web/`:
   ```sh
   npx prisma init --datasource-provider sqlite
   ```
   This creates:
   - `web/prisma/schema.prisma` (scaffold with sqlite datasource block)
   - `web/.env` (with `DATABASE_URL="file:./dev.db"` — default for sqlite)

   The `--datasource-provider sqlite` flag avoids the default Postgres
   template so we don't have to edit `provider` manually.

3. **Inspect + tidy `schema.prisma`** — expected after init:
   ```prisma
   generator client {
     provider = "prisma-client-js"
   }

   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
   No edits expected unless init writes extra boilerplate; keep
   verbatim if clean.

4. **Verify `.env`** — confirm it contains:
   ```
   DATABASE_URL="file:./dev.db"
   ```
   If Prisma init wrote a different default, edit to this exact value.
   (`file:./dev.db` = SQLite DB file at `web/prisma/dev.db` — path is
   relative to the schema.prisma location, per Prisma's convention.)

5. **Update `web/.gitignore`** to include:
   ```
   # prisma / sqlite
   /prisma/dev.db
   /prisma/dev.db-journal
   ```
   **Commit `.env`** — contains only a relative file path, no secrets.
   Acceptable for a local-only private rig.

6. **Create `web/utils/db.ts`** — PrismaClient singleton verbatim from
   manual lines 448–466:
   ```ts
   import { PrismaClient } from '@prisma/client';

   const prismaClientSingleton = () => {
     return new PrismaClient();
   };

   type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

   const globalForPrisma = globalThis as unknown as {
     prisma: PrismaClientSingleton | undefined;
   };

   const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

   export default prisma;

   if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
   ```
   Path note: manual uses `utils/db.ts` (not `lib/db.ts`). We keep
   manual's convention — `lib/` is reserved for shadcn-shaped helpers
   (`lib/utils.ts` with `cn`). `utils/` is for app helpers (db, links,
   actions) per manual.

   TypeScript alias `@/utils/db` will resolve via the existing
   `tsconfig.json` `"@/*": ["./*"]` path mapping — no config change.

## Verify

Run from `web/`:

```sh
npx prisma -v           # CLI version report — catches broken install
npx prisma format       # validates schema.prisma syntax
npx prisma generate     # generates @prisma/client for the (empty) schema
npm run build           # catches import-time errors in utils/db.ts
```

All four must pass with no errors. `prisma generate` with zero models
produces a valid (but empty) client — that's expected.

**Skip** `prisma migrate dev` and `prisma db push` — no models yet, so
migrations land in wu-tll. Running migrate now would create an empty
DB + empty migration file we'd have to rewrite.

## Out of scope (deferred to P2 follow-up beads)

- `Subject` + `Assignment` models → **wu-tll**
- Seed script reading `grades.json` → **wu-jqt**
- `npm run seed` / `prisma.seed` wiring → **wu-njq**

## Files touched

| Path | Action | Source |
|---|---|---|
| `web/package.json` | +2 deps | |
| `web/prisma/schema.prisma` | create | `npx prisma init --datasource-provider sqlite` |
| `web/.env` | create | Prisma init default |
| `web/.gitignore` | append | 2 lines for dev.db + journal |
| `web/utils/db.ts` | create (16 lines) | Manual lines 448–466 verbatim |

## Commit + close

- Commit: `P2: Add Prisma + SQLite datasource`
- Push, `bd close wu-c4p`, brief report to `notes/wu-c4p-complete.md`.

## Open questions for approval

1. **Prisma version pin** — ok with `^5.22.0`, or prefer exact (`5.22.0`)
   or latest major (`^5`)?
2. **`.env` commit policy** — ok to commit `.env` containing only
   `DATABASE_URL="file:./dev.db"`? (Local-only private rig; no secrets
   in it. If not, I'll add `.env` to `.gitignore` and document the
   required value in a committed `.env.example`.)
3. **`utils/db.ts` vs `lib/db.ts`** — manual says `utils/`. Ok to
   follow manual?

# web_ui — Plan

Follows Path A from `../../../docs/path_a_template.md`. Drafted from
shuhan rig by the escort agent; handed off to the `full_stack` crew at
bootstrap.

---

## 1. Goal

Visualize Shuhan's study performance as a private web app, starting
with current-term grades, using fake/demo seed data until a real data
pipeline exists.

---

## 2. Scope

**In — first release:**
- `/grades` page: current-term subjects and their grades
- `/subject/[id]` detail page: assignments list + category breakdown
- `/about` static page: what this is, data sources
- Navbar + dark-mode toggle (shadcn/ui)
- Fake seed data loaded via Prisma seed script from JSON
- Local SQLite for dev; no hosted DB

**Out — deferred or explicitly excluded:**
- Authentication (single user, private repo — no login)
- Real Aeries / school-system integration (future phase)
- Multi-student support
- Payments, cart, orders, reviews, favorites (not applicable)
- Image uploads / Supabase Storage
- Production deployment (local-only for now; Vercel optional later)

---

## 3. Data contract

The **shuhan rig** (content owner) produces a JSON seed at
`web_ui/data/seed/grades.json`, following this shape:

```json
{
  "student": {
    "name": "Shuhan Geng",
    "school": "Albany Middle School",
    "grade": 6
  },
  "term": {
    "name": "Trimester 3",
    "start": "2026-02-01",
    "end": "2026-05-30"
  },
  "subjects": [
    {
      "id": "math_6_advanced",
      "name": "Math 6 Advanced",
      "teacher": "Ms. Example",
      "current_grade": "A",
      "current_percent": 94.3,
      "assignments": [
        {
          "name": "Quiz 5 — Ratios",
          "score": 92,
          "max_score": 100,
          "date": "2026-03-12",
          "category": "Quiz"
        }
      ]
    }
  ]
}
```

**Handoff protocol:** shuhan rig commits updates to this file and mails
mayor with `path@sha`. Mayor slings a "reseed" bead onto the `full_stack`
crew's hook. See `path_a_template.md` → Cross-rig handoffs.

---

## 4. Tech stack

Adopted from
`/Users/rfvitis/gt-personal/shuhan/crew/shuhan/building_manual_4g-store.md`
(also available at `/Users/rfvitis/temp/4g-store/building_manual.md` —
identical content). 5,390-line Next.js e-commerce course. Same stack,
minus e-commerce.

| Layer | Technology | Source section (of manual) |
|---|---|---|
| Framework | Next.js App Router | "Next App" (lines 1–34) |
| Language | TypeScript | baseline |
| Styling | Tailwind CSS | baseline |
| UI kit | shadcn/ui | "Shadcn DarkMode" (262+) |
| Theming | next-themes | "DarkMode Component" (305+) |
| ORM | Prisma | "Prisma", "Setup Instance" (422+) |
| DB | **SQLite (local)** | swapped from Supabase Postgres; Prisma API unchanged |
| Seed | JSON from shuhan rig (not Faker) | "Products JSON", "Seed File" (648+) |
| Deploy | Local-only for now | "Deploy On Vercel" (1519+) — skipped |

**Not adopting from the manual:** Clerk (auth), Stripe (payments),
Supabase Storage (images), Cart / Orders / Reviews / Favorites models.
Their manual sections are skipped.

---

## 5. Phases + first slice

### P1 — Scaffold  ← **first slice**

Ship an empty Next.js app with Navbar, dark mode, and a blank
`/grades` route reachable at `localhost:3000/grades`. No data yet.

**Borrows from manual:** "Next App" → "DarkMode Component" (lines 1–350).

**Beads (file at P1 start):**
- `wu-*` Scaffold Next.js app with TypeScript + Tailwind
- `wu-*` Remove default boilerplate; add Container component
- `wu-*` Add Navbar with Logo placeholder + theme toggle
- `wu-*` Install + wire shadcn/ui + next-themes
- `wu-*` Add `/grades` route (empty placeholder)

**Acceptance:** `npm run dev` serves the app; `/` and `/grades` render;
dark mode toggles; no console errors.

---

### P2 — Data layer

Add Prisma + SQLite, define `Subject` and `Assignment` models, and seed
from the shuhan rig's `grades.json`.

**Borrows:** "Prisma" → "Seed File" (lines 422–725). Swap Supabase
Postgres → SQLite in `datasource db`.

**Beads:**
- `wu-*` Add Prisma; configure SQLite datasource
- `wu-*` Define `Subject`, `Assignment` models matching data contract
- `wu-*` Add seed script reading `data/seed/grades.json`
- `wu-*` Wire seed into `npm run seed` / `prisma db seed`

**Acceptance:** `npx prisma db seed` populates DB from `grades.json`;
`npx prisma studio` shows seeded rows correctly.

---

### P3 — Grades page

`/grades` renders all subjects from DB as cards, each linking to its
detail page.

**Borrows:** "Home Page" → "ProductsList Component" (lines 747–1264),
renamed Products→Subjects.

**Beads:**
- `wu-*` Fetch subjects from DB (server component)
- `wu-*` `SubjectCard` component (name, teacher, grade letter, percent)
- `wu-*` Grid layout; responsive
- `wu-*` `EmptyState` when DB has no subjects

**Acceptance:** `/grades` lists all seeded subjects with correct data,
in both dark and light mode.

---

### P4 — Subject detail

`/subject/[id]` shows the subject's assignments and a category
breakdown.

**Borrows:** "Single Product" sections (lines 1363–1519).

**Beads:**
- `wu-*` Dynamic route `/subject/[id]`
- `wu-*` Fetch subject + assignments
- `wu-*` `AssignmentsTable` component
- `wu-*` `CategoryBreakdown` (% of grade by category)

**Acceptance:** clicking a subject card opens its detail page; all
assignments render; category totals sum correctly.

---

### P5 — Polish

Loading, empty states, and the about page.

**Borrows:** "Suspense Component" → "LoadingContainer" (lines 1053–1140),
"About Page".

**Beads:**
- `wu-*` `LoadingContainer` + `Suspense` wrapping on list + detail pages
- `wu-*` Friendly empty state for no data
- `wu-*` `/about` static page
- `wu-*` 404 + error boundary

**Acceptance:** every page has a Suspense loader; empty DB shows a
friendly empty; `/about` renders; unknown subject id shows 404.

---

## Reference

- Path A template: `../../../docs/path_a_template.md`
- Course manual (canonical, in-repo): `/Users/rfvitis/gt-personal/shuhan/crew/shuhan/building_manual_4g-store.md`
- Course manual (mirror): `/Users/rfvitis/temp/4g-store/building_manual.md`
- Rig how-to: `../../../docs/new-rig-howto.md`
- Town sync + escort: `../../../docs/town-sync-and-escort.md`
- Two-rig architecture (memory): written by shuhan rig's escort

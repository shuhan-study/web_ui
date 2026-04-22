# Modernization Baseline

Pre-upgrade UI baseline for the Next.js modernization work.  
Purpose: provide concrete, diffable anchors before upgrading so post-upgrade checks can distinguish real regressions from normal dev-mode noise.

## Scope

Pages checked locally in dev mode:

- `/`
- `/grades`
- `/subject/reading_6`

---

## `/`

Observed on local render:

- Header shows app logo at top-left.
- Header shows `About` link and theme toggle at top-right.
- Main hero area shows title `web_ui`.
- Subtitle reads: `Shuhan's study performance — placeholder landing page.`
- No visible cards, tables, or charts on this page.
- No console errors or warnings observed on hard refresh.

Interpretation:

- Landing page renders successfully.
- Layout shell, header, and theme control are present.

---

## `/grades`

Observed on local render:

- Page title is `Grades`.
- Subject cards visible:
  - Cobra Choir
  - History 6
  - Math 6
  - P.E. 6
  - Reading 6
  - Science 6
  - Writing 6
- Each card shows:
  - subject name
  - teacher name
  - letter grade
  - percentage
- Specific visible values at capture time:
  - Cobra Choir — Huizinga — `A+` — `97.0%`
  - History 6 — Fryer — `A+` — `97.0%`
  - Math 6 — Angeloni — `A` — `94.0%`
  - P.E. 6 — Mann — `A+` — `98.0%`
  - Reading 6 — Fryer — `B` — `86.3%`
  - Science 6 — Angeloni — `A+` — `96.0%`
  - Writing 6 — Fryer — `A` — `93.0%`
- No console errors or warnings observed in the captured state.

Interpretation:

- Grades overview page renders successfully.
- Subject-card grid is present and populated.
- Reading 6 card links to a working detail page.

---

## `/subject/reading_6`

Observed on local render:

- Page title is `Reading 6`.
- Summary line shows `Fryer · B · 86.3%`.
- `Assignments` section is visible.
- Assignments table columns visible:
  - Assignment
  - Date
  - Category
  - Score
- Five assignment rows visible:
  - Reading Log — Week 1
  - Vocabulary Quiz
  - Night Diary Book Test
  - Book Report — Character Analysis
  - Reading Log — Week 10
- Visible score values at capture time:
  - Reading Log — Week 1 — `9/10 (90.0%)`
  - Vocabulary Quiz — `14/15 (93.3%)`
  - Night Diary Book Test — `38/50 (76.0%)`
  - Book Report — Character Analysis — `42/50 (84.0%)`
  - Reading Log — Week 10 — `10/10 (100.0%)`
- `By category` section is visible.
- Category totals visible:
  - Homework — `19/20` — `95.0%`
  - Quiz — `14/15` — `93.3%`
  - Test — `38/50` — `76.0%`
  - Project — `42/50` — `84.0%`
- No console errors or warnings observed in the captured state.

Interpretation:

- Subject detail page renders successfully.
- Assignment table data and category summary data are present.
- Route parameter resolution for `reading_6` works in current dev mode.

---

## Console / dev-mode note

Benign Next 14 dev-mode RSC prefetch log may appear in console during navigation, for example `fetch-server-response.js` entries with `?_rsc=...`, including aborted or failed prefetches caused by in-flight navigation changes.

This behavior is treated as dev-mode noise, not a product regression by itself.

Post-upgrade rule:

- Presence of these RSC prefetch log lines is **not** by itself a regression.
- Absence of these RSC prefetch log lines is **not** by itself a regression.

Only treat console output as a regression if it indicates an actual render failure, uncaught runtime error, data-fetch failure affecting page content, or user-visible breakage.

---

## Baseline comparison rule for post-upgrade check

After upgrade, verify at minimum:

1. `/` still renders the same shell elements and landing copy.
2. `/grades` still shows all seven subject cards with teacher + grade + percentage.
3. `/subject/reading_6` still shows:
   - title
   - summary line
   - assignments table
   - five visible rows
   - by-category summary
4. No user-visible data loss, missing cards, broken route rendering, or runtime error overlays.

Minor dev-mode differences in fetch timing, prefetch logs, or non-user-visible request behavior should not be flagged unless they cause visible regressions.
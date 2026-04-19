# wu-901 completion — loading.tsx skeletons

## What shipped

Two Server-Component loading files:

1. **`web/app/grades/loading.tsx`** — skeleton grid, 6 cards,
   `animate-pulse` on each card container (outer-container
   pattern, shimmer in-sync within each card). Card shell
   classes (`rounded-lg border bg-card shadow-sm` +
   CardHeader/CardContent padding) copied so placeholder block
   positions match the real SubjectCard.
2. **`web/app/subject/[id]/loading.tsx`** — skeleton h1
   (`h-9 w-48`), subtitle (`h-5 w-64`), then real section
   headings ("Assignments" / "By category") with 5 row
   placeholders (`h-10`) and 3 category row placeholders. Each
   placeholder carries its own `animate-pulse` (per-block
   pattern, not outer-container).

Static text preserved to minimize layout shift: page h1
"Grades", section h2s "Assignments" / "By category".

## Verification

Build: `npm run build` clean. No type errors. Route table
unchanged — `/grades` still ○ Static, `/subject/[id]` still ƒ
Dynamic. No regression vs P4.

Curl sanity: both routes return 200 with `animate-pulse` +
`bg-muted` classes present in the streamed HTML (Next 14 emits
the Suspense fallback as part of the RSC stream, even when the
final response is fully resolved).

Overseer eyeball (with temp 1500ms `setTimeout` in both
server actions):
- `/grades` — 6 skeleton cards paint for ~1.5s, then real cards
  swap in. Pulse in-sync within each card. ✓
- `/subject/history_6` — skeleton header + 5 table rows + 3
  category rows paint for ~1.5s, then real content. Pulse
  drift across independent blocks on the subject page was
  **not visible** — per-block `animate-pulse` was acceptable
  as-is, so no hoist to section containers was needed. ✓

Temp `setTimeout(1500)` in both server actions was reverted
before commit; `git status` showed no `actions.ts`
modification in the final staging set.

## What surprised me

- **`animate-pulse` count in the streamed HTML was 2× what
  I emit.** I rendered 6 cards with one pulse each → curl
  showed 12 occurrences. 13 elements on subject page → 26.
  The doubling is Next's RSC stream: it serializes the
  fallback tree AND the resolved tree in the same response
  payload, even when data resolves immediately on the server.
  Not a bug, just a detail I didn't know. Useful for future
  loading-state debugging: count-parity in curl grep doesn't
  equal count in the rendered DOM.
- **Per-block vs outer-container `animate-pulse` was a
  non-issue at 1500ms delay.** The concern was that
  independently-animated blocks would go out of phase and feel
  twitchy. In practice all `animate-pulse` instances on a page
  start at the same paint frame, so they pulse in lockstep
  regardless of which element owns the class. The outer-
  container pattern matters more for (a) reducing markup noise
  and (b) preventing phase drift if skeletons mount at
  different times (e.g., streaming in sub-Suspense boundaries).
  In a single-Suspense loading.tsx, per-block is fine.

## Carry-forward

- **Shared `<Skeleton>` component** — still deferred. Current
  inline placeholders are readable and small. If a third
  loading boundary appears (P6 or later) with the same shape,
  extract then.
- **Table shell skeletons** — current subject-page rows are
  plain div blocks with `h-10`, not a real shadcn Table shell
  with fake TableRow children. Slight layout shift on the
  real → fake swap (~4-8px per row). If it becomes visibly
  annoying, upgrade the skeleton to import Table/TableHeader
  and render only the TableBody rows as blocks. Low priority.
- **Loading state for `/about`** — bead 4 of P5 is a static
  page with no async data, so no loading.tsx needed. Confirmed.
- **Slow-data testing pattern.** Temp `setTimeout` in server
  actions is the cleanest way to verify skeleton paint without
  DevTools network throttling. Would be worth codifying as a
  gate-test helper (e.g., a `DEV_DELAY_MS` env var wrapped
  around actions) if testing loading states becomes a
  recurring need. Not needed yet.

## Commit

```
P5: Add loading.tsx skeletons for /grades and /subject/[id]
```

Files: `web/app/grades/loading.tsx`,
`web/app/subject/[id]/loading.tsx`, `notes/wu-901-intent.md`,
`notes/wu-901-completion.md`.

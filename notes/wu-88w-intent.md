# wu-88w — Intent (Responsive grid + wire SubjectCard)

## Scope

Replace wu-dw9's `<ul>/<li>` render in `/grades` with a responsive
grid of `<SubjectCard>` components (wu-32c). First bead where
SubjectCard actually renders in the browser.

## Manual reference

| Section | Lines | Usage |
|---|---|---|
| ProductsGrid | 874–925 | Pattern for `grid gap-4 md:grid-cols-2 lg:grid-cols-3`. We keep that exact breakpoint set — standard Tailwind responsive grid. |

## Changes — `web/app/grades/page.tsx`

Current (wu-dw9):

```tsx
<ul className="mt-4 space-y-1">
  {subjects.map((s) => (
    <li key={s.id}>
      <span className="font-medium">{s.name}</span>
      <span className="text-muted-foreground"> — {s.teacher}</span>
    </li>
  ))}
</ul>
```

Replace with:

```tsx
<div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {subjects.map((s) => (
    <SubjectCard key={s.id} subject={s} />
  ))}
</div>
```

Plus `import SubjectCard from '@/components/subjects/SubjectCard';`
at the top.

**Kept:**
- `<h1>Grades</h1>` header
- Inline empty-state `<p>` — wu-noz replaces it with a proper
  component

**Breakpoints:** 1 col <768px, 2 cols 768–1024px, 3 cols ≥1024px.
Mobile-first, manual-aligned.

**Gap:** `gap-4` (16px) — matches manual.

**Top margin:** `mt-8` (32px) to separate from the `<h1>` (was `mt-4`
for the tight `<ul>`; cards need more breathing room).

## Files touched

| Path | Action | Size |
|---|---|---|
| `web/app/grades/page.tsx` | modify | +2 / -7 lines (swap `<ul>` for grid, add import) |

No other changes.

## Verification gates

1. **`npx tsc --noEmit`** — catches the SubjectCard import + prop
   typing.
2. **`npm run build`** — SubjectCard + Card now tree-included in the
   bundle; watch for size bump. Expect `/grades` size to grow
   modestly from wu-dw9's `142 B` to a few KB (Card + SubjectCard
   adds to First Load JS).
3. **`npm run dev` + `curl /grades`** — HTTP 200; HTML contains:
   - All 7 subject names (same as wu-dw9 — no data change)
   - `class="…grid…md:grid-cols-2…lg:grid-cols-3…"` somewhere
   - `/subject/math_6` (or any `/subject/` href) — confirms Link
     rendered
   - `group-hover:shadow-xl` — confirms SubjectCard's hover class
     made it through
4. **No hydration warnings** in dev log.
5. **Visual eyeball (optional)** — start dev server in background,
   let user open `localhost:3000/grades` in browser, confirm:
   - Cards arrange in 3 columns on desktop width
   - Hover any card → shadow grows
   - Click "Math 6" → 404 on /subject/math_6 (expected until P4)
   - Toggle dark mode → cards flip colors (hsl tokens working)
   - Resize to tablet → 2 cols; phone → 1 col

## Out of scope

- `<EmptyState>` component → **wu-noz**
- `/subject/[id]` route → P4
- Any SubjectCard design tweaks (typography, spacing, hover
  intensity) → polish bead if needed; design is "good enough" per
  wu-32c.

## Commit + close

- Message: `P3: Wire SubjectCard into /grades with responsive grid`
- Push, `bd close wu-88w`, report to `notes/wu-88w-complete.md`.

## No open questions

Scope is narrow + fully prescribed by the sanity-check pattern.
Proceeding on your ok.

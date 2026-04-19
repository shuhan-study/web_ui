# wu-901 intent — loading.tsx skeletons

## Scope

Two files, both Server Components (no `'use client'`, no props):

1. `web/app/grades/loading.tsx` — skeleton grid of subject cards
2. `web/app/subject/[id]/loading.tsx` — skeleton subject header +
   table rows + category list

Next 14 wraps these automatically in `<Suspense>` at the segment
root — no manual Suspense wiring needed. The file's presence IS
the wiring.

## Design principle

**Minimize layout shift.** Anywhere the real page shows static
text (page titles "Grades", section headings "Assignments" / "By
category", table column headers), I render the *real* text in
the skeleton too. Anywhere the real page shows data-derived
content (subject name, card titles, table rows, breakdown rows),
I render a muted-block placeholder.

Why: on the Suspense → real-content swap, static elements don't
move. Only the placeholders dissolve into content. That matches
how shadcn-style skeletons feel on 4g-store and similar rigs.

## Primitives

Only existing Tailwind utilities — no new deps, no new shadcn
components, no shared `<Skeleton>` component (bead says defer
extraction until a third consumer appears).

Placeholder block = `animate-pulse bg-muted rounded-md` with an
explicit height/width (h-N w-N). `animate-pulse` goes on the
outermost container so sibling blocks pulse in sync — matches
shadcn convention.

Card skeleton mimics real Card classes (`rounded-lg border
bg-card shadow-sm`) so the border/background is identical; only
the inner text becomes blocks.

## File 1: `web/app/grades/loading.tsx`

```tsx
export default function Loading() {
  return (
    <>
      <h1 className="text-3xl font-semibold">Grades</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border bg-card shadow-sm animate-pulse"
          >
            <div className="flex flex-col space-y-1.5 p-6">
              <div className="h-6 w-2/3 rounded-md bg-muted" />
              <div className="h-4 w-1/2 rounded-md bg-muted" />
            </div>
            <div className="p-6 pt-0">
              <div className="h-10 w-24 rounded-md bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
```

- Real `<h1>Grades</h1>` kept (static text).
- Grid classes copied verbatim from `grades/page.tsx:20`.
- Card skeleton reproduces real Card shell + CardHeader padding
  (`flex flex-col space-y-1.5 p-6`) and CardContent padding (`p-6
  pt-0`) so placement of inner blocks matches real content.
- Inner blocks: `h-6 w-2/3` for CardTitle, `h-4 w-1/2` for
  CardDescription, `h-10 w-24` for the big grade display.
- 6 cards — matches the expected subject count comfortably.

## File 2: `web/app/subject/[id]/loading.tsx`

```tsx
export default function Loading() {
  return (
    <>
      <div className="h-9 w-48 rounded-md bg-muted animate-pulse" />
      <div className="mt-2 h-5 w-64 rounded-md bg-muted animate-pulse" />
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Assignments</h2>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-md bg-muted animate-pulse"
            />
          ))}
        </div>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-4">By category</h2>
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-baseline justify-between"
            >
              <div className="h-5 w-20 rounded-md bg-muted animate-pulse" />
              <div className="h-4 w-32 rounded-md bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
```

- Subject name is dynamic → skeleton heading `h-9` (matches
  `text-3xl` line-height ≈ 36px).
- Subtitle skeleton `h-5` (matches `text-sm` line-height ≈ 20px).
- Section headings "Assignments" / "By category" kept as real
  text — no shift when real content arrives.
- 5 table-row placeholders (`h-10` ≈ shadcn row height). Slight
  layout shift vs real rows is acceptable per bead ("roughly
  match").
- 3 category rows. Actual category list has 2–4 rows depending
  on data; 3 is median.

## What I deliberately will NOT do

- Import Table / TableHeader / TableRow / Card in the skeletons.
  That would give pixel-perfect no-layout-shift but pulls in
  more code for a loading view. Bead says "no new shadcn
  components" — I read that to include not pulling them into
  skeletons either. Plain divs with matching classes are enough.
- Render a real "Grades" h1 skeleton vs plain-text version — I'd
  rather keep the real heading text so users see the page
  identity immediately, even while the grid hasn't hydrated.
- Skip the big-grade placeholder in card skeletons. The real
  card's `text-4xl font-bold` grade is the visual anchor; an
  empty card would feel broken. Placeholder block there is the
  whole point.

## Acceptance walk-through

1. `npm run build` — clean, no type errors, both routes still
   `ƒ Dynamic` (no regression from P4 build output).
2. Dev server, throttle network in DevTools to "Slow 4G" or add
   a deliberate `await new Promise(r => setTimeout(r, 1500))` in
   `fetchAllSubjects` / `fetchSubjectById` temporarily, then
   reload `/grades` and `/subject/<id>` → skeleton paints for
   ~1s then swaps to real content. Revert the sleep before
   committing.
3. Eyeball check: skeleton dimensions look like the real
   content's shape (no giant empty gaps, no wildly-sized
   placeholders).

## Risks

- **Testing loading states without a real slow network.** I can
  add a temporary `setTimeout` in the server actions. But if
  that's fiddly, I can also rename `loading.tsx` → ask Next to
  show it via a cold start. Pragmatic answer: temp `setTimeout`
  in the action, curl won't show the skeleton (it waits for the
  final HTML), but the browser shows it immediately on
  navigation. I'll ask the overseer to eyeball rather than trying
  to prove it via curl.
- **`text-3xl` line-height = 36px, but `h-9` is 36px nominal.**
  In practice the real `<h1>` may render at 40-44px including
  margins. Small y-axis jitter acceptable.
- Typing: `loading.tsx` exports have no props. Next's convention
  is looser than page.tsx — I've double-checked Next 14 docs.

## Out of scope (confirming)

- No `LoadingContainer` shared component
- No spinner / third-party skeleton libs
- No `/about` loading state (P5 bead 4 is static)

## Commit plan

```
P5: Add loading.tsx skeletons for /grades and /subject/[id]
```
Files: `web/app/grades/loading.tsx`, `web/app/subject/[id]/loading.tsx`,
plus intent + completion notes.

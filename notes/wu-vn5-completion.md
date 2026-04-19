# wu-vn5 completion — not-found.tsx + error.tsx

## What shipped

Two files under `web/app/` (not `web/src/app/` — bead description
had a stale `src/` in the path; project uses flat `app/`):

1. **`web/app/not-found.tsx`** — Server Component.
   `<h1 "Not found">` + muted paragraph + underlined `next/link`
   back to `/grades`.
2. **`web/app/error.tsx`** — `'use client'`. `{ error, reset }`
   props, `useEffect(console.error, [error])`, shadcn
   `<Button onClick={reset}>Try again</Button>`.

Typography mirrors existing pages: `h1 text-3xl font-semibold`,
subtitle `text-sm text-muted-foreground`, block spacing `mt-8`.

## Verification

Build: `npm run build` clean. `/_not-found` appears as a ○ Static
route. No type errors — the local `Error` identifier didn't
clash with the global type in the props annotation (hoisting
resolves `Error & { digest?: string }` against the global before
the function declaration takes effect).

Server-side:
- `/subject/nonexistent-id` → HTTP 404, custom UI body
- `/totally-fake-route` → HTTP 404, custom UI body
- Grep-matched "Not found", "That page", "Back to grades" in both
  responses

Error boundary (temp `throw new Error('wu-vn5 error-boundary
smoke test')` in `grades/page.tsx`):
- HTTP 500
- RSC payload registered `error.tsx` as the segment error slot
- Thrown message propagated as the payload error digest
- Reverted the throw, grades returned to 200

Browser eyeball (overseer-confirmed):
- `/subject/x` renders custom 404
- `/subject/history_6` still good (existing route unaffected)

## What surprised me

- **Nested `.git` inside `web/`.** Running `git status` from
  `web/` showed a flood of phantom modifications — deletes of
  `components.json`, mods to `button.tsx`, etc. None of those
  were real; the repo root showed clean state. The nested repo
  is almost certainly a leftover from `create-next-app`'s default
  `git init`. From now on I'll run `git status` from the repo
  root (`full_stack/`), not from `web/`, to avoid reading stale
  state from an unused nested repo. If a future bead benefits
  from a clean house I'll file one to delete `web/.git`.
- **HTML escape on apostrophe.** First draft used
  `That page doesn't exist.` — react-in-jsx-scope ESLint flags
  raw `'` in JSX text as `react/no-unescaped-entities`. Swapped
  to `doesn&apos;t`. Small thing, but a build failure I dodged
  by checking build output before curl.
- **Dolt server was cross-rig-shared.** Port 3307 was held by
  PID 14610, which turned out to be the **shuhan** rig's Dolt
  server hosting multiple DBs including `web_ui`. Not a conflict
  — a shared resource. `bd dolt status` reports "not running"
  from the crew workspace because it's looking for a
  crew-managed server, but `bd dolt test` confirmed the
  connection works. Lesson: `bd dolt status == "not running"` is
  not the same as "DB unreachable" — always test before
  escalating.

## Carry-forward

- **`global-error.tsx`** — explicitly out of scope (deferred to
  P6 per bead). Covers errors thrown in the root layout itself;
  the current `error.tsx` only catches within a rendered layout.
  File a bead in P6 if root-layout error handling becomes a real
  need.
- **Remote error reporting** — no Sentry/Axiom wiring. Current
  `error.tsx` just `console.error`s. If the app ever goes live
  to real users, this needs revisiting.
- **Toast notifications on error** — deferred. shadcn `sonner`
  or `toast` would be a candidate if P6 wants a less-intrusive
  error signal than the full-page boundary.
- **Path doc drift** — bead description said `web/src/app/`. No
  harm done, but future beads should use `web/app/` in file
  references. Not worth a correction PR on closed beads.

## Commit

```
P5: Add root not-found.tsx and error.tsx for graceful 404 and error boundary
```

Files: `web/app/not-found.tsx`, `web/app/error.tsx`,
`notes/wu-vn5-intent.md`, `notes/wu-vn5-completion.md`.

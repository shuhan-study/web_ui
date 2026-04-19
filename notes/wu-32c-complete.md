# wu-32c — Completion Report

## Status: ALL 3 GATES PASS.

## Gates

### Gate 1 — source-diff `card.tsx` vs 0.9.4 registry

```
diff exit: 0
```

`web/components/ui/card.tsx` byte-matches
`apps/www/registry/default/ui/card.tsx` at tag `shadcn-ui@0.9.4`
(commit `729b9ec`). Verbatim, no edits.

### Gate 2 — `npx tsc --noEmit`

```
exit: 0
```

`Subject` type imported from `@prisma/client`, Card/CardHeader/
CardTitle/CardDescription/CardContent types align, Link href typed
as string template. No drift.

### Gate 3 — `npm run build`

Clean. `/grades` still `○ (Static)` per wu-dw9's caveat (no
behavior change). SubjectCard tree-shaken out of the bundle because
it's not yet imported from any route — that's expected; wu-88w will
pull it in.

## Files shipped

| Path | Action | Size | Source |
|---|---|---|---|
| `web/components/ui/card.tsx` | create | 79 lines | 0.9.4 registry, verbatim |
| `web/components/subjects/SubjectCard.tsx` | create | 36 lines | hand-written per intent |

Zero changes elsewhere.

## Design confirmations

- Card primitive hand-seeded cleanly — no peer deps (registry entry
  declared none; the component is pure `<div>` wrappers + `cn()`).
  `@/components/ui/card` alias resolves via tsconfig's `"@/*"` path
  mapping.
- `Subject` prop type pulled in; if the schema renames a field, this
  file breaks compile — fast-fail guarantee.
- Percent formatting: `.toFixed(1)` — `"94.0%"`, `"86.3%"`.
  Consistent, one-decimal.
- Link target `/subject/${subject.id}` is a dead-ended URL until P4
  wires the route. Hover affordance still meaningful; P4 flip to
  live is a pure routing add.

## Visual verification — deferred

No render happens in this bead — wu-88w is the first bead where
SubjectCard enters the tree (when it replaces the `<li>` list on
`/grades`). Visual QA (hover shadow, typography, dark-mode contrast)
lands there.

## Commit

- Message: `P3: Add SubjectCard component (hand-seed shadcn Card)`
- Push, `bd close wu-32c`.

## Next

wu-88w — responsive grid on `/grades`, wire SubjectCard in place of
the `<ul>`. First visual render of the card.

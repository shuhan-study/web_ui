# Modernization Smoke Checklist

Post-upgrade verification for the Next 14.2.35 → 16 + React 18 → 19 modernization. This is the doc the maintainer reads during the post-merge smoke — it must stand alone without reaching into the design-doc.

Populated contents land in Phase 5 of `wu-8eo.5`. This file is committed in Phase 1 as a skeleton so the post-Phase-5 diff only adds content to the marked sections.

## CLI setup

_(filled in Phase 5 step 3 — includes `git pull --rebase`, `npm ci`, `npx prisma generate` (conditional), `npm run dev`)_

## Maintainer smoke checks

_(filled in Phase 5 step 3 — route renders, dark-mode toggle + hard refresh, DevTools console diff, font/network check, error-boundary throw, `/grades` mutate-probe)_

## Build-warning delta

_(filled in Phase 5 step 2a — classes of new build warnings post-upgrade, or "no net-new classes")_

## Server-log delta

_(filled in Phase 5 step 2b — classes of new error/warning log lines on cold-start + route-serving, or "no net-new classes")_

## Bundle-size delta

_(filled in Phase 5 step 4 — absolute pre/post `.next/static` + ratio; informational only)_

## Follow-on beads filed

_(filled in Phase 5 step 5 — links to follow-on beads: Tailwind 3→4, conditional postinstall/engines, conditional ESLint 9, conditional force-dynamic)_

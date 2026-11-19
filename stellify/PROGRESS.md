# Progress

Status: todo / in progress / done / blocked. Updated after every commit.

## Phase 0–1
- [x] done: Audit (`AUDIT.md`)
- [x] done: Proposal (`PROPOSAL.md`), prototype (`prototypes/hex-path.html`), `IDEAS.md`, `NEEDS-OWNER.md`, `DECISIONS.md`

## Phase 2: build
- [x] done: 1. Design system: tokens, fonts, icons for emoji, SVG stars, typesetting, banned words, shortcut cheat sheet, trust pages. Then, at the owner's request, more colour (domain and area colours, gold stars) and rounder shapes.
- [x] done: 2. Path (owner-directed redesign: touching 3D hexagon chains per unit, climbed bottom-up and zig-zagging, with arrows and one "Start here"; list view; keyboard), star rules, engine, Today panel, Path sets, storage migration, star rules, next-step engine, Today panel, Path sets, storage migration v1→v2 (tests: tests/path.test.ts, tests/migrate.test.ts, e2e/path.spec.ts)
- [x] done: 3. Score Lever (N10): lib/engine/lever.ts, LeverChart on the Path; feeds the engine
- [x] done: 4. Psychometrics: first-attempt events, cleaning rules, classical item statistics with flags, item lifecycle (calibrated difficulty feeds routing), anonymous item-data export, maintainer dashboard (#/maintainer), submission stub OFF (tests/psych.test.ts, e2e)
- [x] done: 5. Test-day hub (#/test-day): dated, saved, printable checklist; Bluebook steps; sleep and stress guide with a when-things-go-wrong playbook; policy explainer; "should I send?"; a school list with the student's own dated notes. College Board specifics link to their source and say "Needs verification" (CB site blocked here). College Scorecard snapshot: script ready, needs the owner's key.
- [ ] todo: 6. Worked Examples mode (N11)
- [ ] todo: 7. Predict-First mode (N8)
- [ ] todo: 8. Fatigue and pacing curve (N6)
- [ ] todo: 9. Desmos Lab (N7)
- [ ] todo: 10. Hosted web build (code splitting, service worker), CI, content linter, docs

## Phase 3: QA
- [ ] todo: Lighthouse, axe, keyboard, 320 px, 200% zoom, reduced motion, offline, migration, export/import
- [ ] todo: Personal copy rebuilt and pushed to `satstudy` (after verifying it is private)

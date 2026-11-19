# Progress

Status: todo / in progress / done / blocked. Updated after every commit.

## Phase 0–1
- [x] done: Audit (`AUDIT.md`)
- [x] done: Proposal (`PROPOSAL.md`), prototype (`prototypes/hex-path.html`), `IDEAS.md`, `NEEDS-OWNER.md`, `DECISIONS.md`

## Phase 2: build
- [x] done: 1. Design system: tokens, fonts, icons for emoji, SVG stars, typesetting, banned words, shortcut cheat sheet, trust pages. Then, at the owner's request, more colour (domain and area colours, gold stars) and rounder shapes.
- [x] done: 2. Hex Path (map, zigzag, list, keyboard), star rules, next-step engine, Today panel, Path sets, storage migration v1→v2 (tests: tests/path.test.ts, tests/migrate.test.ts, e2e/path.spec.ts)
- [x] done: 3. Score Lever (N10): lib/engine/lever.ts, LeverChart on the Path; feeds the engine
- [ ] todo: 4. Psychometrics: events, cleaning, item stats, lifecycle, maintainer dashboard, consent stub (OFF)
- [ ] todo: 5. Test-day hub
- [ ] todo: 6. Worked Examples mode (N11)
- [ ] todo: 7. Predict-First mode (N8)
- [ ] todo: 8. Fatigue and pacing curve (N6)
- [ ] todo: 9. Desmos Lab (N7)
- [ ] todo: 10. Hosted web build (code splitting, service worker), CI, content linter, docs

## Phase 3: QA
- [ ] todo: Lighthouse, axe, keyboard, 320 px, 200% zoom, reduced motion, offline, migration, export/import
- [ ] todo: Personal copy rebuilt and pushed to `satstudy` (after verifying it is private)

# Progress

Status: todo / in progress / done / blocked. Updated after every commit.

## Phase 0–1
- [x] done: Audit (`AUDIT.md`)
- [x] done: Proposal (`PROPOSAL.md`), prototype (`prototypes/hex-path.html`), `IDEAS.md`, `NEEDS-OWNER.md`, `DECISIONS.md`

## Phase 2: build
- [x] done: 1. Design system: tokens, fonts, icons for emoji, SVG stars, typesetting, banned words, shortcut cheat sheet, trust pages. Then, at the owner's request, more colour (domain and area colours, gold stars) and rounder shapes.
- [x] done: 2. Path (owner-directed: a map of grouped 3D hexagon tiles; each domain one touching cluster, branches relate, arrows show what builds on what, one raised "Start here" tile; list view; keyboard), star rules, engine, Today panel, Path sets, storage migration, star rules, next-step engine, Today panel, Path sets, storage migration v1→v2 (tests: tests/path.test.ts, tests/migrate.test.ts, e2e/path.spec.ts)
- [x] done: 3. Score Lever (N10): lib/engine/lever.ts, LeverChart on the Path; feeds the engine
- [x] done: 4. Psychometrics: first-attempt events, cleaning rules, classical item statistics with flags, item lifecycle (calibrated difficulty feeds routing), anonymous item-data export, maintainer dashboard (#/maintainer), submission stub OFF (tests/psych.test.ts, e2e)
- [x] done: 5. Test-day hub (#/test-day): dated, saved, printable checklist; Bluebook steps; sleep and stress guide with a when-things-go-wrong playbook; policy explainer; "should I send?"; a school list with the student's own dated notes. College Board specifics link to their source and say "Needs verification" (CB site blocked here). College Scorecard snapshot: script ready, needs the owner's key.
- [x] done: 6. Worked Examples mode (N11): #/worked, 12 math families × 4-rung backward-fading ladders with self-explanation prompts; finishing a skill's ladders earns ★1; engine recommends it after 2+ conceptual misses; answers independently verified. Not yet: Reading & Writing ladders.
- [x] done: 7. Predict-First mode (N8): #/predict, per-type prediction prompts and quick picks, choices hidden until a prediction is written, self-grade, the student's own match-vs-accuracy pattern, optional soft timer; never in mocks
- [x] done: 8. Fatigue and pacing curve (N6): difficulty-adjusted accuracy by thirds of each module, needs 3+ modules, "possible drop-off" wording, time-per-question strip against 71 s / 95 s; on Analytics, mock reports and a Today stamina note (tests/fatigue.test.ts)
- [x] done: 9. Desmos Lab (N7): #/desmos/lab, 7 techniques with algebra vs Desmos side by side and timers, when-not-to notes, exercises checked on the built-in grapher (typed expressions checked for equivalence, then the answer), decision guide, timed method drill, offline message. Desmos API state checking behind flag OFF (needs key).
- [x] done: 10a. Hosted web build (../sat): landing 96/100/100/100, app Path page 89 (median of 3)/100/100/100 on Lighthouse mobile (uncompressed local server); offline after one visit (e2e/web.spec.ts)
- [ ] todo: 10b. CI, content linter, docs

## Phase 3: QA
- [ ] todo: Lighthouse, axe, keyboard, 320 px, 200% zoom, reduced motion, offline, migration, export/import
- [ ] todo: Personal copy rebuilt and pushed to `satstudy` (after verifying it is private)

# Animated lessons and AP Calculus (branch claude/stellify-animated-lessons) — status 2026-11-26

| Item | Status |
|---|---|
| Phase 0 audit, ENVIRONMENT.md, docs/LESSONS-AUDIT.md | done |
| Phase 1 decisions (DECISIONS 49), licenses verified | done |
| Narrated player (audio-driven, captions, transcript, chapters, step-through, resume, end card) | done |
| Scene types morph / pause / formula graph lines | done |
| SymPy verifier (key, steps, facts, trap, shown steps, graph lines) + self-tests (20/20 caught) | done |
| Build pipeline (verify, lint, voice changed only, MP3 48 kbps two-pass -16 LUFS target, manifests) | done |
| Pilots sys-w1, circ-w1, inf-w1 built (2:45, 2:25, 2:00) | done |
| 30 skill lessons re-voiced and built as narrated lessons (v-<skill>) | done, not reviewed (Gate 2) |
| Critic Gate 1 (pilots), 3 loops | done: sys-w1 approved; circ-w1 approved by the owner after B4 was fixed; inf-w1 SHIP pending an English teacher |
| Site opens with the fly-over film, then the choice: Google sign-in or guest | done |
| Batch scale-out (one walkthrough per remaining 27 skills) | todo: resume here, Algebra and Advanced Math first |
| AP Calculus: 30 hard AP-style MC (3 per unit) with checks and walk-throughs | done |
| AP Calculus: College Board sample booklet in the private pack + /calc/official page | done locally; NOT pushed (satstudy Pages question) |
| Landing page redesign | done |
| Landing fly-over film | done (marketing/flyover, 4 subframes, software GL) |

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
- [x] done: 10b. CI (.github/workflows/stellify.yml), content linter (e2e/content-lint.spec.ts), README, DESIGN.md, METHODOLOGY.md, CONTRIBUTING.md

## Phase 4: critique and custom plan (owner request, 2026-11-19)
- [x] done: Harsh critique of every feature (`CRITIQUE.md`): a walk-through on a phone and 400 synthetic students run through the app's own code (`scripts/sim/`)
- [x] done: Start-up questions before anything else (grade, math class, scores, test date, goal, time, what feels hard, situation), all used by the plan
- [x] done: Adaptive 16-question placement check (replaces the fixed 28-question diagnostic)
- [x] done: Student model for every skill; the coach builds one custom plan per student, re-planned every morning; one Today list on the dashboard, the Path and My plan
- [x] done: Practice, review and redos aimed at the student's level; out-of-reach questions held back
- [x] done: Menu reordered, extras folded (nothing deleted)
- [ ] owner decision: no Easy tier (written, then removed on request)
- [x] done: pop-ups no longer cover headings on phones
- [ ] not done: a contents list for Grammar and Hacks; a level-aware hard-questions quest; real students

## Phase 5: owner's list (2026-11-20)
- [x] done: 72 new College Board-style questions (60 math, 12 Reading and Writing; 20/40/40 medium/hard/very hard; every math answer checked; every wrong R&W choice tagged), bank 517 → 589
- [x] done: one score estimate; Smart Practice follows the plan; setup in two screens with a resumable placement check
- [x] done: Path in route order, scrolled to the student's step
- [x] done: Nova replaces the egg and companions
- [x] done: practice tests scored by difficulty with "what each miss cost you"
- [x] done: one Desmos page; Predict-First inside R&W practice; remix every miss; daily challenge per student; 324 vocabulary words; formulas-only sheet
- [ ] later (owner): Firebase accounts; more questions toward OnePrep's scale (about 3,900 official questions)

## Phase 3: QA
- [x] done: Lighthouse (landing 96/100/100/100; app Path 86–90/100/100/100, local uncompressed), axe 0 serious/critical on 49 routes × 2 themes, keyboard tests, no overflow or console errors at 320 and 640 px (200% zoom), reduced motion (global rule; not separately re-tested on the new Path animation), offline (web build e2e), migration (unit tests), export/import (existing e2e)
- [x] done: Personal copy rebuilt and pushed to `satstudy` branch claude/sweet-gates-ev8uj4 (privacy checked twice right before)
- [ ] blocked: Firefox, Safari, iOS Safari, Android Chrome: only Chromium is installed here
- [ ] owner: see NEEDS-OWNER.md

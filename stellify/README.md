# Stellify — free Digital SAT prep in one HTML file

Open `stellify.html` (in the repository root, also built to `stellify/dist/stellify.html`) in any modern
browser. That is the whole product: no install, no server, no account, no internet connection.

## What is inside

- 380 original questions: SAT-calibrated Math and Reading & Writing (about 20% medium, 40% hard,
  40% very hard), a Beyond SAT tier that is deliberately harder than the real test, and a 40-question
  official-pattern Reading & Writing set modelled on the structures of the hardest released items. Each has a step-by-step solution, a rationale for every answer choice, the concept,
  the fastest method, the common trap, a takeaway and three levels of hints.
- 30 interactive lessons, one per official skill: a picture per idea (graphs with sliders, sentence
  diagrams, step reveals, tables that highlight), quick checks, a worked example and a boss question,
  with 1 to 3 stars each and a skill map. The long-form notes remain one click away.
- 35 one-idea "hack" cards shown on lessons and questions, a 28-rule Grammar Masterclass, a Desmos-style graphing
  academy, a formula/grammar/transition reference, 123 vocabulary words with spaced repetition.
- Smart (adaptive) practice, spaced review, Mistake Bucket with pattern detection and earned
  resolution, mastery levels, score-range estimates, analytics, weekly report.
- Diagnostic, timed modules, full-length mock exams with module routing, 30-day study plan and calendar.
- Lumi the companion: XP, levels, shop, achievements, three daily quests with a chest, answer combos,
  optional sound effects, daily challenge, speed training, battle arena.
- Offline tutor in seven modes, with an optional Gemini free-tier connection (student's own key).
- Notebook, saved questions, search, progress sharing, data export / import / delete, dark and light themes.

## Rebuilding

```bash
npm install
```

```bash
npm run build
```

`npm run build` validates the question bank, then inlines JavaScript, CSS, fonts and data into one file.

## Checks

```bash
npm run test
```

```bash
npm run test:e2e
```

- `npm run validate:questions` — per-question and bank-level rules; every math answer is re-derived by an
  independent computation; KaTeX must render; only validated questions are shipped.
- `npm run test` — 43 unit tests of the learning engine and content.
- `npm run test:e2e` — 8 browser tests against the built file opened from disk.
- `npm run check:links` — verifies the official-resource URLs (needs open internet; not run in the build environment).

## Honest limits

- Questions are original, not official College Board items (none are copied from official material), and Reading & Writing items have not been
  reviewed by an outside SAT expert. Score ranges are an unofficial model.
- Official-resource links and the Gemini connection could not be tested from the build environment.
- Storage is the browser's local storage for this file; export a backup to move devices.
- There is no cloud account or sync in the single-file version.

SAT® is a trademark registered by the College Board, which is not affiliated with and does not endorse Stellify.

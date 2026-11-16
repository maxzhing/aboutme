# Stellify — free Digital SAT prep in one HTML file

Open `stellify.html` (in the repository root, also built to `stellify/dist/stellify.html`) in any modern
browser. That is the whole product: no install, no server, no account, no internet connection.

## What is inside

- 474 original questions: SAT-calibrated Math and Reading & Writing (about 20% medium, 40% hard,
  40% very hard), a Beyond SAT tier that is deliberately harder than the real test, and a 40-question
  official-pattern Reading & Writing set modelled on the structures of the hardest released items. Each has a step-by-step solution, a rationale for every answer choice, the concept,
  the fastest method, the common trap, a takeaway and three levels of hints.
- A full course for every one of the 30 skills: 88 step-by-step chapters. Each chapter has picture
  lessons, a numbered method, a hard problem worked one step at a time, the traps (what each looks
  like and the fix) and three hard practice questions; pass at 2 of 3. After any miss you name the trap,
  and the Mistake Bucket keeps a trap list with a targeted drill for each.
- 30 quick interactive lessons, one per official skill: a picture per idea (graphs with sliders, sentence
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

## AP Calculus BC

A self-study course under **AP Calculus BC**: all ten units in the College Board's order with exam
weights, a pacing plan from your exam date, and teacher-style lessons (intro, goals, notes with
definitions, tips and common mistakes, step-by-step worked examples, practice with hints and full
solutions, a mastery check at 75%, and unit reviews). Units 1–2 are written in full (15 lessons,
116 problems, every numeric answer verified by an independent calculation in the tests); Units 3–10
are outlined topic by topic. Lessons and problems are original.

## Official College Board questions

Open **Official Questions** and drop in a PDF exported from the College Board's free SAT Suite
Question Bank (with answers and explanations). The app reads it in the browser with pdf.js:
Reading & Writing questions become text, while math and questions with tables, graphs or underlining
keep the exact page image of the question and of the explanation. Imported questions are stored in
that browser only (IndexedDB), lead the matching course chapters, and make up timed official tests.

## Test-day mode and your own official questions

Every timed exam starts with a lock-in prompt: allow full screen (the test then covers the whole
screen, keeps it awake, and counts each time you leave) or start without it. A web page cannot
truly lock a device; leaving is always possible and is shown in the report.

If you have a College Board question-bank PDF of your own, you can make a personal copy of the app
that includes those questions as a timed practice test:

```bash
python3 scripts/make-pack.py path/to/export.pdf private/pack.json
```

```bash
node scripts/build.mjs --pack private/pack.json
```

This writes `private/stellify-personal.html`. Official questions are the College Board's copyrighted
work, so `private/` is git-ignored: the pack and the personal copy are for your own study and are
never committed or published. The public `stellify.html` contains none of them.

## Checks

```bash
npm run test
```

```bash
npm run test:e2e
```

- `npm run validate:questions` — per-question and bank-level rules; every math answer is re-derived by an
  independent computation; KaTeX must render; only validated questions are shipped.
- `npm run test` — 50 unit tests of the learning engine and content.
- `npm run test:e2e` — 11 browser tests against the built file opened from disk.
- `npm run check:links` — verifies the official-resource URLs (needs open internet; not run in the build environment).

## Honest limits

- Questions are original, not official College Board items (none are copied from official material), and Reading & Writing items have not been
  reviewed by an outside SAT expert. Score ranges are an unofficial model.
- Official-resource links and the Gemini connection could not be tested from the build environment.
- Storage is the browser's local storage for this file; export a backup to move devices.
- There is no cloud account or sync in the single-file version.

SAT® is a trademark registered by the College Board, which is not affiliated with and does not endorse Stellify.

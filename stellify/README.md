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

## AP courses: Calculus BC, Computer Science A, Microeconomics, Macroeconomics

Four self-study AP courses, written so that a beginner can learn each subject from scratch and then
teach it. Every course follows the College Board's current units in order, shows each unit's exam
weight, and builds a pacing plan from your exam date.

| Course | Units | Lessons | Worked examples | Practice problems |
| --- | --- | --- | --- | --- |
| AP Calculus BC (with a Math Toolkit unit 0) | 10 + toolkit | 67 | 134 | 428 |
| AP Computer Science A (Java) | 4 | 19 | 38 | 114 |
| AP Microeconomics | 6 | 15 | 30 | 90 |
| AP Macroeconomics | 6 | 19 | 38 | 114 |

- **Calculus BC** starts with fractions, equations, functions, slope, exponents, logarithms and trig,
  then runs from limits through infinite series.
- **Computer Science A** follows the four-unit course (Using Objects and Methods; Selection and
  Iteration; Class Creation; Data Collections). Lessons trace real Java code line by line, and answers are
  graded as exact program output, so `3` and `3.0` are different answers, just as on the exam.
- **Microeconomics** covers scarcity and trade, supply and demand with elasticity and taxes, costs and
  perfect competition, monopoly and game theory, factor markets and monopsony, and externalities,
  public goods and inequality.
- **Macroeconomics** covers GDP, unemployment and inflation, the AD-AS model and the multipliers,
  fiscal policy, money and banking, the money market (both the limited and ample reserves
  frameworks), loanable funds, the Phillips curve, the quantity theory, deficits and crowding out,
  growth, the balance of payments and exchange rates.

Every lesson has a teacher's intro, goals and notes, plus a tutor layer for complete beginners:

- **The big idea in plain words**, with an everyday picture that makes it stick
- **Words to know** (550 terms across the four courses) and **tools you will use**, each with a
  quick refresher and a link to the lesson that teaches it, even if it is in another course
- a **why** for every step of every worked example
- a slow, step-by-step **walk-through for every practice problem** (746 in all)
- **Now you teach it**: a mini lesson plan for teaching a friend, the questions a student will ask
  (with answers), and a box to write your own explanation, checked against the key points

Practice has hints, a mastery check at 75%, and unit reviews. The tests check every course
automatically:

- every typed-answer problem's answer is recomputed independently (calculus: limits, derivatives,
  Simpson's rule integrals, Runge–Kutta, partial sums; CSA: a JavaScript model of each Java program
  with Java's integer division, overflow and `compareTo` rules; economics: the tables and equations in
  each lesson)
- `npm run verify:csa-java` goes further for CSA: it turns all 93 typed-answer problems into real Java
  programs (reusing the lesson's own code where a question refers to it), compiles and runs them with
  `javac`, and checks that the output matches the key exactly. All 93 match.
- where a table could produce a tie (two outputs with the same profit, for example), the check
  requires a single best answer
- every multiple-choice walk-through names the keyed letter, every link between lessons
  resolves, every formula renders, and no stray dollar sign can turn into broken math
- every lesson has its full tutor layer

Lessons and problems are original.

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

## Reading & Writing questions written to the College Board specifications

Every Reading & Writing question passes an automated review modeled on the College Board's
item-development process before the app will serve it (`src/data/questions/rules.ts`):

- **Skill alignment:** the stem must be the official wording for its skill (for example "Which choice
  completes the text with the most logical transition?" for Transitions).
- **Appropriate length:** each passage, or each text of a pair, is 25–150 words.
- **One best answer and no unintentional clues:** four choices, one key, a rationale for every choice, and
  the key may not stand out as by far the longest choice.
- **Plausible distractors:** every wrong answer is tagged with the reasoning error it represents (goes beyond
  the text, reverses the relationship, ignores a qualification, misuses the data, comma splice, and so on;
  `distractors.ts`). The app shows that trap next to each wrong answer's explanation.
- **Coverage:** the four content domains appear in Digital SAT proportions (about 26/28/20/26%), with a
  20/40/40 medium/hard/very hard mix and correct answers spread evenly across A–D.

Statistical pretesting, discrimination and differential item functioning analyses need responses from
thousands of real test takers, so they are outside what an offline study app can do.

## Checks

```bash
npm run test
```

```bash
npm run test:e2e
```

- `npm run validate:questions` — per-question and bank-level rules; every math answer is re-derived by an
  independent computation; KaTeX must render; only validated questions are shipped.
- `npm run test` — unit tests of the learning engine and content, including the College Board specification checks.
- `npm run test:e2e` — 12 browser tests against the built file opened from disk, including mastering the first and last lesson of each new AP course through the real interface.
- `npm run verify:csa-java` — compiles and runs every typed-answer CSA problem with a real Java compiler (skips if `javac` is missing).
- `npm run check:links` — verifies the official-resource URLs (needs open internet; not run in the build environment).

## Honest limits

- Questions are original, not official College Board items (none are copied from official material), and Reading & Writing items have not been
  reviewed by an outside SAT expert. Score ranges are an unofficial model.
- Official-resource links and the Gemini connection could not be tested from the build environment.
- The AP courses are original study material, not official College Board content, and have not been
  reviewed by an outside AP teacher. The CSA multiple-choice questions are conceptual and are checked
  by review, not by running code. AP® is a trademark registered by the College Board.
- Storage is the browser's local storage for this file; export a backup to move devices.
- There is no cloud account or sync in the single-file version.

SAT® is a trademark registered by the College Board, which is not affiliated with and does not endorse Stellify.

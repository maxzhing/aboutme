# Stellify — free Digital SAT prep in one HTML file

Open `stellify.html` (in the repository root, also built to `stellify/dist/stellify.html`) in any modern
browser. That is the whole product: no install, no server, no account, no internet connection.

## What is inside

- 474 original questions: SAT-style Math and Reading & Writing (about 20% medium, 40% hard,
  40% very hard), a Beyond SAT tier that is deliberately harder than the real test, and a 40-question
  Reading & Writing set whose structures mirror the hardest College Board-released items (original questions, not official ones). Each has a step-by-step solution, a rationale for every answer choice, the concept,
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
  resolution, mastery levels, analytics, weekly report.
- An honest score estimate: separate Math and Reading & Writing estimates shown as 80% ranges with a
  confidence level (low, medium, high), built only from first tries without hints, weighted by question
  difficulty, hidden until a section has 20 such answers (it says how many more are needed), and labelled
  everywhere as an unofficial Stellify estimate, never an SAT score. Analytics shows how the estimate and its
  range changed day by day, and each recent session's result against what was expected for its difficulty.
- A skill mastery heatmap: all 30 SAT skills by domain, colored by difficulty-weighted mastery, with sample size,
  an 80% uncertainty (±), a confidence level (dashed when low) and the recent trend; tap one to practice it.
  Next to it, "Where your points are" ranks the skills whose improvement would add the most points (questions
  per test from the SAT blueprint × accuracy still to gain × points per question at your level), and a forecast
  says whether the estimate is really moving: it needs 4+ days over 2+ weeks, calls a trend clear only when it is
  bigger than twice its own noise, and only then projects it to your test date, as a widening range.
- Diagnostic, timed modules, full-length mock exams with module routing, 30-day study plan and calendar.
- An exam simulator that follows the test-day workflow: a lock-in screen, directions at the start of each section
  (reopenable), a "Question X of Y" navigator showing answered, unanswered and flagged questions, mark for review,
  answer elimination, highlights and notes, a calculator docked beside Math questions instead of covering them, a
  reference sheet, a hideable timer that stays visible with a one-time alert at 5 minutes left, a review page before
  submitting, a 10-minute break, and a module-by-module report (set, right, blanks, time and pace per question).
- Module 2 routing that weighs Module 1 answers by difficulty, checked by a simulation study (below).
- Lumi the companion: XP, levels, shop, achievements, three daily quests with a chest, answer combos,
  optional sound effects, daily challenge, speed training, battle arena.
- A soft, calm feel: every press gives a quiet synthesized "pop" (and a tiny vibration on phones), a ripple
  spreads from where you touched, buttons spring back, right answers sparkle and wrong ones give a gentle
  shake, and a slow aurora with twinkling stars sits behind every page. Sound can be turned off, and
  "Reduce motion" stills all of it.
- Highlights & Notes, as on test day: select any words in a passage or question and pick yellow, blue,
  pink or underline, or attach a note; click a highlight to recolor or remove it. On official questions
  shown as College Board page images, drag across the printed words: the image's pixels are scanned for
  its printed lines, so the highlight snaps to them like a text selection. Every timed test attempt starts
  with a clean slate (and keeps its highlights for the review afterwards); practice highlights are kept.
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

## AP courses: Calculus BC, Computer Science A, Microeconomics, Macroeconomics, Statistics

Five self-study AP courses, written so that a beginner can learn each subject from scratch and then
teach it. Every course follows the College Board's current units in order, shows each unit's exam
weight, and builds a pacing plan from your exam date.

| Course | Units | Lessons | Worked examples | Practice problems |
| --- | --- | --- | --- | --- |
| AP Calculus BC (with a Math Toolkit unit 0) | 10 + toolkit | 67 | 134 | 428 |
| AP Computer Science A (Java) | 4 | 19 | 38 | 114 |
| AP Microeconomics | 6 | 15 | 30 | 90 |
| AP Macroeconomics | 6 | 19 | 38 | 114 |
| AP Statistics | 9 | 20 | 40 | 120 |

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
- **Statistics** follows all nine units: describing data (SOCS, boxplots and the 1.5 × IQR rule, z-scores
  and normal curves), two-way tables, correlation and least-squares regression, sampling methods, bias
  and experimental design, probability rules and tree diagrams, random variables, binomial and geometric
  distributions, sampling distributions and the central limit theorem, confidence intervals and
  significance tests for proportions and means (one-sample, paired and two-sample t), Type I and II errors
  and power, chi-square tests, and inference for a regression slope from computer output. Answers are
  typed as decimals, and sensible roundings (0.106 or 0.1056) are accepted.

Every lesson has a teacher's intro, goals and notes, plus a tutor layer for complete beginners:

- **The big idea in plain words**, with an everyday picture that makes it stick
- **Words to know** (629 terms across the five courses) and **tools you will use**, each with a
  quick refresher and a link to the lesson that teaches it, even if it is in another course
- a **why** for every step of every worked example
- a slow, step-by-step **walk-through for every practice problem** (866 in all)
- **Now you teach it**: a mini lesson plan for teaching a friend, the questions a student will ask
  (with answers), and a box to write your own explanation, checked against the key points

Practice has hints, a mastery check at 75%, and unit reviews. The tests check every course
automatically:

- every typed-answer problem's answer is recomputed independently (calculus: limits, derivatives,
  Simpson's rule integrals, Runge–Kutta, partial sums; CSA: a JavaScript model of each Java program
  with Java's integer division, overflow and `compareTo` rules; economics: the tables and equations in
  each lesson; statistics: a small built-in statistics engine with normal, t and chi-square
  distributions, binomial and geometric probabilities, AP-style quartiles and regression, whose results
  are pinned in `tests/stats-lib.test.ts` to reference values from SciPy, to about seven decimal places)
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

## Official full practice tests, an adaptive SAT-style test, scores and a study plan

**Import a full College Board practice test.** The College Board publishes its practice tests
free as PDFs for students taking the SAT on paper. On **Official Questions**, drop in one test's
three files (the practice test, its scoring guide and its answer explanations). pdf.js reads them
in the browser, with no API key and nothing uploaded, in about five seconds:

- every question in all four modules, in the printed order (Reading & Writing questions as text
  when the scan reads cleanly; Math, figures and underlining as exact page images)
- the answer key from the scoring guide (every accepted form of each student-produced answer), cross-checked
  against the College Board's explanation for every question
- the College Board's explanation for every question (Math explanations as exact images, so the
  math stays typeset)
- the test's raw-score conversion table and its real time limits (39 and 43 minutes per module)
- each question sorted into its official skill: Reading & Writing from the College Board's fixed question
  wording, Math from the wording of the question and its explanation. Difficulty is estimated from position,
  because these booklets do not print it.

All seven free tests (Practice Tests 4–10, 840 questions) are checked in the tests whenever a local copy is
present: every question found in order, every key complete and agreeing with its explanation, every table read.

**Take it as the real thing.** The official test runs exactly as printed: two Reading & Writing
modules, a 10-minute break, two Math modules, with the graphing calculator and reference sheet. It
is scored the way the College Board scores it: the number right in each section is looked up in
that test's own conversion table, which gives the section score range (the large number shown is
its middle), and the two add up to the total.

**Adaptive SAT-style test from your official questions.** An adaptive test built the way the digital SAT is built:
27 + 27 Reading & Writing and 22 + 22 Math questions in the official skill proportions and order,
with Module 2 harder or easier depending on Module 1, at the real time limits (32 and 35 minutes per
module). Every slot takes an official question (Question Bank imports and full tests), preferring ones
you have not seen and saving questions from full tests you have not taken yet. Only when a skill has no
official question left is the slot filled with a Stellify hard or very hard question for that skill; the
report labels each question Official or Stellify, and the Mock Exams page shows how much of each section
your library covers. It gives an unofficial estimated range on the College Board scale, not an SAT
score: harder questions count for more (item-response scoring), and ability is converted through the average of
the official conversion tables of Practice Tests 4–10.

**Original remix tests.** From the whole official library (every imported practice test and Question Bank
question), the app builds new full-length adaptive SATs, "Original Remix Test 1, 2, …", on the same blueprint,
order, routing and timing. Each has its own Module 1 and both possible Module 2s, and no question appears in two
remix tests, so each one is new to you even after the official tests. A remix is fixed for a given library, so it
can be retaken to measure progress; when official questions run low for a skill, a slot borrows from the same
domain, and the list shows each test's share of official questions. The adaptive SAT-style test above is the shuffled version (a
new combination every time), and **Blend** gives about half its slots to Stellify original questions written to the
College Board specifications. The original Stellify mock exams (Practice Test A, B and Fresh Mix) remain alongside.

**Explanations: checked, and in simple words.** Every explanation in the seven practice tests was checked against
its own question (each fits its question better than its neighbors', with no page text from elsewhere and every key
agreeing), and the Math explanation images were checked for completeness. Each official question now opens with
**In simple words**: the answer, the reason, one line on why each other choice is wrong, and how to do that kind of
question. For Reading & Writing, the reason is rewritten from the College Board's own explanation by fixed rules that
keep its meaning: the formal opening goes, the evidence and conclusion stay, everyday words replace formal ones,
grammar rules get a plain definition, and quotations from the passage are never changed. This makes the explanations
about 40% shorter, but reasons for the harder reading questions still use the College Board's own sentences. Math
explanations are not rewritten, because their text loses exponents and fractions when it is read from the PDF; they
show the answer, a plain method for that kind of question (written at about a 6th-grade reading level) and the College
Board's exact worked solution. The College Board's full explanation always follows.

**A study plan from what you missed.** After any test, each missed skill is ranked by the points at stake
(misses × the scaled points one more right answer is worth near your score, read from the conversion curve),
with the trap you fell for where it is known, and notes on pacing (ran out of time, left blanks, or rushed).
One click turns it into your day-by-day plan until your exam date: a lesson for each focus skill, official
practice you have not solved, redoing your own misses, timed modules if time was the problem, and a full test
each week.

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

To build full practice tests into a personal copy, import them in the app, export them from the browser, and
merge them (images are shrunk on the way: grayscale question scans, sharp 8-shade explanation images):

```bash
python3 scripts/pack-tests.py private/pack-qb-only.json export.json -o private/pack.json
```

The build embeds the pack as a JSON block, which phones parse much faster than a large script.
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

## Validating routing and scoring (simulation study)

`tests/simulation.test.ts` sends 300 simulated students per section through Practice Tests A and B, using the
app's real engine (Module 1, routing, Module 2, scoring). Each student has a known true ability. Their answers come
from a different model than the one the app scores with: every question gets its own random difficulty shift,
discrimination and guessing rate. The test fails if routing or scoring gets worse than these limits.

| | Before (raw 60% rule) | Now (difficulty-aware routing) |
| --- | --- | --- |
| Strong students (true 650+) sent to the easier Module 2 | 6–17% (17% on Form A Math) | 0–4% |
| Weak students (true 450 or less) sent to the harder Module 2 | 0% | 0% |
| Correlation of estimate with true score | 0.95–0.97 | 0.95–0.97 |
| Typical error (RMSE) per section | 43–49 points | 44–49 points |
| Share of true scores inside the "80%" range | 90–92% | 90–94% (ranges are cautious) |

This checks internal validity only: that routing sends students the right way and that the estimates and their
ranges behave as described when the world does not exactly match the model. It cannot show how Stellify's scale
lines up with real SAT scores; that needs real students' score reports.

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
- `npm run test:e2e` — 18 browser tests against the built file opened from disk, including mastering the first and last lesson of each new AP course through the real interface, and the soft-feel effects (ripples, sparkles, the night sky) with and without reduced motion.
- `npm run verify:csa-java` — compiles and runs every typed-answer CSA problem with a real Java compiler (skips if `javac` is missing).
- `npm run check:links` — verifies the official-resource URLs (needs open internet; not run in the build environment).

## Honest limits

- Questions are original, not official College Board items (none are copied from official material), and Reading & Writing items have not been
  reviewed by an outside SAT expert.
- Score estimates are an unofficial model with hand-set item settings. They have never been checked against real
  students' SAT results, so no claim is made about how well they predict an actual score; the ranges include an
  explicit allowance for that. Validating them would need real score reports from real students.
- Resource links were opened and checked on 2026-11-18 (`npm run check:links` repeats it). Three were only partly confirmed: the
  Student Question Bank search now asks for a College Board sign-in, and Khan Academy's course content could not be loaded by
  the check. The Gemini connection could not be tested from the build environment.
- The AP courses are original study material, not official College Board content, and have not been
  reviewed by an outside AP teacher. The CSA multiple-choice questions are conceptual and are checked
  by review, not by running code. AP® is a trademark registered by the College Board.
- Text highlighting uses the browser's CSS Custom Highlight API (current Chrome, Edge, Safari and Firefox). In an
  older browser, text cannot be highlighted; page-image highlighting still works.
- Storage is the browser's local storage for this file; export a backup to move devices.
- There is no cloud account or sync in the single-file version.
- Scores on an imported official practice test come from that test's own College Board table. The adaptive SAT-style
  test's score is an estimate, not a College Board score: the College Board's digital scoring uses item parameters it
  does not publish, and the seven official tables themselves differ by about 25–40 points at the same raw score.
- Skills and difficulty for questions read from a practice-test booklet are inferred, not printed by the College
  Board: on the seven free tests the Math domain shares come out at about 35% Algebra, 28% Advanced Math, 19% Data,
  19% Geometry, against the official 35/35/15/15.
- Official practice tests are the College Board's copyrighted work: imported tests stay in your browser, and a
  personal copy that includes them must stay private.

SAT® is a trademark registered by the College Board, which is not affiliated with and does not endorse Stellify.

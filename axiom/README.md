# Axiom

An AI learning platform. You tell it what you want to learn; it works out what
you already know, teaches only the gap, makes you prove it, and keeps adapting
until you have actually learned the thing.

Everything a learner sees — lessons, worked examples, diagrams, practice sets,
worksheets, quizzes, tests, flashcards, study guides, multi-day plans, feedback,
grades — is generated live by Claude against that learner's current mastery
state. There are no canned lessons and no hardcoded question banks anywhere in
this repository.

```bash
cd axiom
npm install
cp .env.example .env      # add your ANTHROPIC_API_KEY
npm start                 # http://localhost:8787
```

---

## Whole courses, and the score you would actually get

Name an exam — *AP Physics 1*, *IB Chemistry HL*, *A-level Economics* — and
Axiom builds the real syllabus: units in teaching order, every concept inside
them, and crucially **each unit weighted by what the exam actually rewards**.
Every concept in the course becomes trackable immediately, not just the ones you
happen to ask about.

From there it answers the only question that matters before an exam:

**"What would I score if I sat it today, and what is the shortest path to a 5?"**

The prediction is built from demonstrated performance, not activity:

1. Per concept, the probability of getting an *exam-level* item right, from your
   ability estimate against the difficulty the exam actually asks at, blended
   with your observed accuracy as evidence accumulates.
2. Rolled up to a unit, weighted by how central each concept is (`core` counts
   for more than `peripheral`).
3. Rolled up to a paper, weighted by the exam blueprint — a unit worth 4% cannot
   move your score much however shaky it is.
4. Reported with a **confidence interval that widens when the evidence is thin**,
   so a prediction from three attempts is never dressed up as a measurement.
5. **Calibrated against real practice papers.** Sit a mock and the model moves
   toward what you actually scored, weighted by how recently you sat it.

That produces the thing a student actually needs: *"You are 12 points of the
paper short of a 5. Kinematics is 25% of the exam and you are projecting 41% on
it — about 15 marks, more than anything else on the table. Do that next."*

The course view shows the projected score against the exam's own grade
boundaries, the units ranked by **marks still available**, the whole syllabus as
a mastery matrix, pacing against your exam date, and one button that generates
whatever the model says is worth the most marks right now.

## What makes it a learning system rather than a chat box

**It diagnoses before it teaches.** A request is routed first: what is the goal,
what level is this person at, how long have they got, what concepts does this
break into, and is a short diagnostic worth the time? Only then does teaching
start — and it starts from what the learner already has.

**Every turn ends with the learner doing something.** The tutor explains one
idea, then hands the work back. A turn that is pure exposition is a failed turn.

**Answers are graded for reasoning, and every mistake is classified.** The
system keeps an explicit error taxonomy — conceptual, prerequisite gap,
procedure, reasoning, transfer, vocabulary, memory, misread, calculation,
careless, incomplete — because what happens next depends entirely on which one
it was. A slipped minus sign gets one line and the same difficulty again. A
broken mental model stops the session, drops to the prerequisite, re-teaches in
a different representation, and re-tests in a new surface form.

**Mastery is earned, not clicked.** Each concept carries a 0–5 level backed by
five kinds of evidence — recall, explain, solve, apply, transfer. Level 5
additionally requires success on hard items *and* a correct answer at least a
day after the first one. Reading a lesson can never move a concept past
"introduced".

**Difficulty tracks a live ability estimate.** Every graded attempt updates an
Elo-style estimate on the same 1–5 scale the generator uses, and the next item
is pitched just above it. Streaks push up; conceptual misses pull down.

**Old material comes back before it is forgotten.** Learn → 1 day → 3 → 7 → 14 →
30, with each interval scaled by an ease factor that moves with performance. A
lapse steps the ladder back.

**It notices patterns you cannot see.** "Four of your last six misses involved
negative exponents." "You can do this when it is worded the way I worded it, and
not otherwise — here are transfer problems."

**Nothing broken ships.** Generated question sets pass two gates before a
learner sees them: deterministic structural checks (does the answer key name a
real option, do rubrics sum, are two questions the same, does the numeric answer
parse, does a hint give the game away) and an independent model pass that
re-solves every question. Repairable defects are repaired, irreparable ones are
regenerated, and anything still broken is dropped rather than shown.

---

## Using it

The homepage is one box. Type anything:

- *Teach me AP Physics 1 momentum*
- *I don't understand derivatives*
- *Make me a 20-question biology worksheet on cellular respiration*
- *I have a physics test in three days*
- *I keep getting APUSH SAQs wrong*
- *I have 30 minutes — teach me something useful*

You can attach your own material (PDF, images, notes) and Axiom will teach from
*that* rather than around it.

| Where | What it does |
|---|---|
| **Session** | The teaching loop. Streamed turns, live activities, an "I'm stuck" ladder (hint → bigger hint → explanation → worked example → start over), "make it harder", and a mode switcher (learn, practice, quiz, master, homework, review, exam prep, crash course, explore). |
| **Studio** | Generate any resource on demand: worksheet, practice set, quiz, test, homework, lesson, study guide, flashcards, plan, exam prep, mastery check, review — with control over level, difficulty, question count, question types and time budget. Solve it, submit it, get it graded and analysed, then generate remediation aimed at exactly what you missed. |
| **Dashboard** | Continue learning, mastery by subject, weak areas, upcoming reviews, recent work, learning goals with generated roadmaps, open misconceptions, and a generated read of what your history shows. |
| **Courses** | A whole syllabus with its exam weighting: projected score against the real grade boundaries, units ranked by marks available, the syllabus as a mastery matrix, pacing against your exam date, full practice papers built to the real blueprint, and a next-action button justified in marks. |
| **Review** | The spaced-repetition queue, with one-click interleaved retrieval practice across everything that is due. |
| **Mastery** | Concept-by-concept levels, ability estimates, accuracy, what each concept still needs before it counts as mastered, and full attempt history. |
| **My material** | Upload documents, have them read and analysed, and turn them into lessons, study guides, tests or plans. |

---

## Architecture

```
server/
  index.js            Express app: static site + JSON/SSE API
  config.js           Env-driven config; the API key lives here and nowhere else
  db.js  store.js     SQLite (node:sqlite) schema and repository
  llm/
    anthropic.js      Real provider: streaming, structured output, retries,
                      rate-limit backoff, typed errors, refusal handling
    partial-json.js   Tolerant JSON-prefix parser — what makes live rendering
                      of a still-being-written lesson possible
    mock.js           Deterministic stand-in, used ONLY by the test suite
  prompts/*.md        Every prompt, versioned as a file. None are buried in code.
  schemas/index.js    JSON schemas the model is constrained to
  engine/
    router.js         Goal / level / time / concept decomposition
    tutor.js          The adaptive teaching loop
    generate.js       One generator behind every resource kind, with QC
    evaluate.js       Grading + folding results into the learner model
    mastery.js        Evidence model and the 0-5 levels
    difficulty.js     Ability estimation and strategy recommendation
    review.js         Spaced-repetition scheduling
    errors.js         The error taxonomy and what each error implies
    course.js         Course blueprints, practice papers, exam calibration
    readiness.js      Score prediction, leverage ranking, pacing, next action
    validate.js       Schema validation + educational defect inspection
    insights.js       Proactive pattern detection
    profile.js        Assembles the learner model for the model's context
public/               No build step. ES modules, a hand-written Markdown+LaTeX
                      renderer, structured SVG diagram renderers, and a
                      component per resource family.
```

**Streaming.** Resources and tutor turns are generated as structured JSON under
`output_config.format`, streamed as text deltas, and parsed at every chunk by a
tolerant prefix parser. That is why a lesson renders as it is written instead of
appearing all at once at the end.

**Caching.** The stable pedagogical system prompt carries a cache breakpoint;
the volatile learner model sits after it, so the expensive prefix is reused
across every call.

**Diagrams** are generated as structured specs (flow, cycle, concept map,
timeline, bar, function graph, comparison) and rendered by hand-written SVG
renderers — the model chooses what to show, the client decides how it looks, and
no model-authored markup is ever injected into the page.

**Charts are built to a spec, not to taste** (`public/js/render/charts.js`).
Colour is assigned by the job it does: mastery 0–5 is ordered magnitude, so it
uses a single-hue ordinal ramp with level 0 as a neutral "no data" step;
concept identity uses a fixed categorical order; and good / warning / serious /
critical come from a reserved status palette that always ships with an icon or
a label, so state never rides on colour alone. Every palette was run through a
validator for CVD separation, normal-vision separation, lightness banding and
contrast against this app's own surfaces, in both themes. Marks follow one
spec everywhere — bars capped at 24px with a 4px rounded data-end and a square
baseline, a 2px surface gap between touching marks, markers with a 2px surface
ring, hairline gridlines, selective direct labels — and every chart carries a
hover tooltip, a legend where identity matters, and a "show the numbers" table
view for the non-visual read.

**What is stored** is learning state and nothing else: concepts, mastery,
ability, attempts, misconceptions, schedules, goals, and the resources you
generated. There is no personal profiling.

---

## Testing

```bash
npm test          # 103 unit + end-to-end tests (no API key needed)
npm run test:ui   # drives the real UI in Chromium, 41 checks
npm run test:live # the product brief's scenarios against the real model
```

`npm test` covers the learning engine directly (mastery gates, ability updates,
review scheduling, the error taxonomy, defect inspection, answer comparison, the
partial-JSON parser), the readiness model (that untaught concepts sit at the
guess rate, that reading a lesson is not evidence, that the heavy unit dominates
the prediction, that a real paper pulls the estimate toward reality and a stale
one counts for less, that leverage ranks by marks rather than by weakness), the
whole HTTP surface end to end including a course whose projection provably rises
as concepts are demonstrated, and — in
`test/provider.test.js` — the real Anthropic SDK path against a stub that speaks
the Messages API streaming protocol, so request shape, cache breakpoints,
streaming, retry/backoff, rate limiting, refusals and truncation repair are all
verified without a key.

`npm run test:live` needs `ANTHROPIC_API_KEY` and costs real tokens. It runs the
six scenarios from the brief and asserts on behaviour: that a worksheet's answer
keys are actually valid, that difficulty rises across a set, that a repeated
mistake changes the teaching approach, that "make it harder" produces something
genuinely harder, that a three-day plan fits its time budget and includes
retrieval.

### The mock provider

`server/llm/mock.js` is a test double, not a fallback. It synthesises objects
from the same schemas the live model is constrained to, so the suite exercises
the real routing, validation, quality control, grading, mastery and rendering
code without network access. The server refuses to start with it unless
`AXIOM_ALLOW_MOCK=1` is set explicitly, and no code path falls back to it.

---

## Configuration

See `.env.example`. The only required value is `ANTHROPIC_API_KEY`, which is
read server-side and never reaches the browser — the frontend talks only to this
app's own API.

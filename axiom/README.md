# Axiom

An AI learning platform. You tell it what you want to learn; it works out what
you already know, teaches only the gap, makes you prove it, and keeps adapting
until you have actually learned the thing.

Everything a learner sees — lessons, worked examples, diagrams, practice sets,
worksheets, quizzes, tests, flashcards, study guides, multi-day plans, feedback,
grades — is generated live by Claude against that learner's current mastery
state. There are no canned lessons and no hardcoded question banks anywhere in
this repository.

## Two ways to run it

**As a single HTML file.** `axiom.html` is the whole product in one file. Open
it from your desktop — no server, no install, no build. It asks for an Anthropic
API key once, keeps it in that browser's local storage, and talks straight to
the API. Everything else — the learning engine, your mastery record, your
courses — runs and persists in the browser.

```bash
npm run build            # regenerates axiom.html
open axiom.html          # or just double-click it
```

**As a server**, which is the right way to run it for anyone but yourself,
because the key stays in the environment and never reaches a browser:

```bash
cd axiom
npm install
cp .env.example .env      # add your ANTHROPIC_API_KEY
npm start                 # http://localhost:8787
```

### Providers

The server build runs on Claude or on OpenAI:

```bash
AXIOM_LLM_PROVIDER=openai OPENAI_API_KEY=sk-... npm start
```

Everything above the provider is unchanged — same engine, same routes, same
interface. `OPENAI_BASE_URL` points the same code at anything else that speaks
the chat-completions API (Azure, a gateway, a local server).

Two things are genuinely different on OpenAI, and both are visible rather than
silent:

**Structured outputs are only guaranteed for the smaller schemas.** OpenAI's
strict mode caps a schema at roughly 100 properties and five levels of nesting.
Axiom's short schemas — routing, grading, quality control, flashcards, insights,
source analysis — fit, and get the hard guarantee. Its teaching schemas do not:
a lesson is blocks containing diagrams containing nodes, and a tutor turn is an
activity containing a question containing steps, which run six or seven deep.
Flattening them to satisfy one provider would make the product worse on both, so
those requests fall back to JSON mode with the schema stated in the prompt. That
is a weaker promise, not a broken one — the tolerant prefix parser, the coercion
pass and the question-level quality gate all still run — and the server says
which schemas landed where at boot:

```
WARN [server] structured outputs: 8 of 14 schemas fit strict mode; course,
lesson, plan, practice, studyGuide, tutorTurn use JSON mode instead
(validated and repaired downstream rather than guaranteed).
```

**The single-file build is Claude-only.** Anthropic publishes a header —
`anthropic-dangerous-direct-browser-access` — that lets a page call the API
directly, which is the whole reason `axiom.html` can exist. OpenAI has no
equivalent and does not permit browser-origin requests, so the browser build
ships only the provider it can actually deliver rather than one that would fail
on CORS for anyone who chose it.

### About the key

There is no key bundled with this, and there cannot be: an Anthropic API key
bills whoever owns it, so a shared one is someone else's credit card. Create
your own at [console.anthropic.com](https://console.anthropic.com/settings/keys)
— new accounts start with free credit.

The single-file build is a real trade against the hosted one. The key lives in
`localStorage`, which means anything running in that browser profile can read
it, and a copy of `axiom.html` saved after you enter a key is a copy of your
key. That is the price of having no server, and the app says so before it asks.
If you want the key kept away from the browser entirely, run the server build.

---

## Whole courses, and the score you would actually get

Name an exam — *AP Physics 1*, *IB Chemistry HL*, *A-level Economics* — and
Axiom builds the real syllabus: units in teaching order, every concept inside
them, and crucially **each unit weighted by what the exam actually rewards**.
Every concept in the course becomes trackable immediately, not just the ones you
happen to ask about.

### The curriculum library

Unit weightings are the whole basis of the score prediction, so for the courses
people actually take they are transcribed rather than guessed. `curriculum/`
holds twelve syllabuses taken from their published course frameworks — real unit
titles, the exam board's own weightings, the real structure of the paper, and
728 concepts between them, each with a difficulty and a criticality:

| Course | Units | Concepts | Course | Units | Concepts |
|---|--:|--:|---|--:|--:|
| AP Biology | 8 | 81 | AP Macroeconomics | 6 | 44 |
| AP Chemistry | 9 | 78 | AP Physics 1 | 8 | 62 |
| AP Calculus AB | 8 | 60 | AP Psychology | 5 | 55 |
| AP Computer Science A | 4 | 46 | AP Statistics | 5 | 54 |
| AP English Language | 5 | 35 | AP United States History | 9 | 75 |
| AP Environmental Science | 9 | 75 | AP World History: Modern | 9 | 63 |

These are current frameworks, including the recent redesigns: Physics 1 with
Fluids as Unit 8, Computer Science A collapsed from ten units into four, and
Statistics restructured into five units for 2026-27.

Matching is deliberately conservative. "Teach me AP Biology" gets the
transcribed syllabus; "teach me about cells" does not, because that is a topic,
not a course. "AP Physics C" and "AP Calculus BC" are not in the library and are
not allowed to fall into their neighbours — they fall through to model
generation, and the course header says **Generated syllabus** rather than
**Verified syllabus** so you know which of the two you are planning around.

Two honest details. Published weights are ranges, and the midpoints of a set of
ranges do not add to 100 — AP Chemistry's add to 89 — so the working weight is
the midpoint scaled to partition the paper, with the published range kept
alongside it and shown on hover. And AP English Language has no published
per-unit weighting at all, because its units are a skill progression; that
blueprint is built from the exam's own scored parts instead, which *are*
published, and says so.

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
curriculum/           Transcribed syllabuses: real units, real exam weightings
browser/              The handful of modules the single-file build swaps in —
                      localStorage instead of SQLite, fetch instead of the SDK,
                      an Express-shaped router shim, an in-page transport
build.mjs             Emits axiom.html
server/
  index.js            Express app: static site + JSON/SSE API
  config.js           Env-driven config; the API key lives here and nowhere else
  db.js  store.js     SQLite (node:sqlite) schema and repository
  llm/
    anthropic.js      Claude provider: streaming, structured output, retries,
                      rate-limit backoff, typed errors, refusal handling
    openai.js         OpenAI (and OpenAI-compatible) provider, same contract
    openai-schema.js  Decides per schema whether strict mode can carry it
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
npm test              # 164 unit + end-to-end tests (no API key needed)
npm run test:ui       # drives the real UI in Chromium against a server, 41 checks
npm run test:standalone  # builds axiom.html and drives it from file://, 30 checks
npm run test:live     # the product brief's scenarios against the real model
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

It also checks the curriculum library as data: that every blueprint survives the
schema the model is held to, that weights partition the paper and stay close to
what was published, that score bands descend and bottom out at zero, that no
concept is duplicated and every prerequisite resolves to a concept in the same
course, that a blank learner projects the bottom band on all twelve and a
learner who has proved everything projects the top one, and that a request for
one course is never matched to its neighbour.

Both providers are tested the same way, against stubs speaking their real wire
protocols: `test/provider.test.js` for the Anthropic SDK path and
`test/provider-openai.test.js` for chat-completions. That matters more for
OpenAI, because `api.openai.com` was unreachable from the environment this was
written in, so a faithful stub is the only verification available — it covers
the request shape, the schema adapter, streaming, usage mapping, truncation
repair, refusals, retries, and the difference between a rate limit (retry) and
an exhausted quota (do not). `test/openai-integration.test.js` then boots the
real app on that provider and drives a session, a graded worksheet, a mastery
update and a course through it, asserting that both the strict and the
JSON-mode request shapes were genuinely exercised.

`npm run test:standalone` builds the single-file edition and drives it in
Chromium as a `file://` URL, with `api.anthropic.com` intercepted and answered
in the Messages API's own streaming protocol. It covers the parts that only
exist in that build: that the file opens with no server, that it refuses to
start on a rejected key, that the key and the learning record survive a reload,
that the transcribed syllabus is what actually gets built, and that the settings
page tells the truth about where everything lives.

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

See `.env.example`. The only required value is an API key for whichever provider
is configured — `ANTHROPIC_API_KEY`, or `OPENAI_API_KEY` with
`AXIOM_LLM_PROVIDER=openai`. In the server build it is read server-side and
never reaches the browser; the frontend talks only to this app's own API. In the
single-file build there is no server to hold it, so it is the learner's own key,
held in their own browser; see *About the key* above.

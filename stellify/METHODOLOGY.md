# Methodology

Every number Stellify shows is computed on the student's device from their own answers. Nothing here has been
validated against real SAT score reports; where that matters, the app says so. The in-app version is `#/methodology`.

## Score estimates

- **Basis:** first tries without hints, weighted by difficulty, shown as an 80% range with a confidence label.
- **When shown:** hidden until a section has 20 such answers.
- **Routing check:** a 300-student simulation checks Module 2 routing and scoring for internal consistency only.

## Path stars (`src/lib/path/stars.ts`)

- **Credit per answer:** 1, or 0.75, 0.5 or 0.25 after 1–3 hints; 0 when wrong. Hints lower credit and never
  block progress.
- **★1 Learned:**
  - all chapters passed;
  - or the 5-minute quick lesson finished with 2 or more of its stars;
  - or the worked-example ladders finished;
  - or the 5-question skip check passed (4 or more credit);
  - or Proficient.
- **★2 Practiced:**
  - the 6-question practice set passed on its first attempt (4.5 or more credit);
  - or Proficient;
  - or the skip check passed.
- **★3 Retained:** both of these:
  - the 4-question hard set passed (3 or more credit), or Mastered;
  - and a right, hint-free answer on the skill in a Gauntlet at least 7 days after ★2.
- **Kept:** stars once earned are kept, with their dates.

## Next-step engine (`src/lib/path/next.ts`)

**Priority** (the first that applies wins):

1. Due reviews: at most one 8-card block a day.
2. Confident errors: up to 3.
3. An unfinished chapter.
4. The highest Score Lever skill whose prerequisites have ★1, adjusted:
   - +15% per recent conceptual miss (up to 3);
   - −30% for brand-new skills within 14 days of the test.
5. Curriculum order.

**Format:** worked examples after 2+ conceptual misses in 14 days. At ★2, the hard set, then a Gauntlet.
Otherwise chapter 1 for a brand-new skill, then the practice set. Every step states its reason in plain words.

## Score Lever (`src/lib/engine/lever.ts`)

```
accuracy  = (first-try credit + 4 × 0.6) / (first tries + 4)
headroom  = max(0, target − accuracy)            target 0.85, or 0.90 for 1450+ goals
rate      = 0.06 / 0.04 / 0.025 accuracy per focused hour (below 60% / to 80% / above)
points/hr = questions per test × scaled points per extra right answer × rate   (while headroom > 0)
ceiling   = headroom × questions per test × points per question
```

- **Range:** low–high comes from the 80% uncertainty in accuracy and ±40% on the learning rate.
- **Thin data:** under 6 first tries the skill shows "needs a diagnostic".
- **Questions per test:** from the blueprint used to assemble mocks.
- **Points per question:** read from the averaged conversion curve near the student's level.
- **Coarseness:** the learning rates are coarse assumptions, not measurements.

## Item statistics (`src/lib/psych`)

- **Events:** one row per first attempt (item, random person id, session, choice, correct, time, position, context,
  skill, device class, timestamp), derived from saved attempts and mock modules.
- **Cleaning:** drops rapid guesses (under 3 s, or under 10% of the item's median time with 10+ responses),
  abandoned attempts, hinted answers, and pretest, draft or retired items.
- **Statistics:**
  - percent correct;
  - corrected point-biserial (item vs the person's proportion correct on their other items);
  - option counts by ability third;
  - time quartiles;
  - every number shown with its n.
- **Thresholds:** nothing is decided under 100 responses; "stable" at 200.
- **Flags:**
  - p < .10 or > .95;
  - r_pb < .10;
  - r_pb < 0 is URGENT (check the key);
  - a distractor beats the key in the top third (ambiguous);
  - a misconception-tagged option no one picks.
- **Life cycle:** draft → pretest → calibrated → live → flagged or retired (`src/data/itemLifecycle.ts`). Calibrated
  difficulty replaces the author tag, including in Module 2 routing. Nothing is calibrated yet.
- **Data collection:** option B ships, meaning on-device statistics plus a manual anonymous export (a fresh random
  id per file) that maintainers pool on `#/maintainer`. Option A (anonymous submission) is stubbed and OFF, with
  no endpoint; it needs a backend and a COPPA/FERPA review first. A Rasch calibration is future work, only once
  sample sizes justify it.

## Fatigue and pacing (`src/lib/engine/fatigue.ts`)

- **Expected accuracy:** the student's own first-try accuracy at each item's difficulty outside mocks, shrunk
  toward 70/55/40/25%.
- **Comparison:** observed vs expected, by thirds of each finished mock module.
- **When it speaks:** "possible drop-off" only with 3+ modules and a 10-point fall from the first to the last third.
- **Pacing targets:** 71 s per Reading & Writing question and 95 s per Math question (32 min ÷ 27 and 35 min ÷ 22,
  from the published structure; marked as needing verification in the test-day hub).

## Student model (`src/lib/model/ability.ts`)

Every skill gets an ability estimate on a logit scale (0 ≈ a 500 section score, 1 unit ≈ 110 points) with an
uncertainty. Each first try counts by how surprising it was for its difficulty tier (medium −0.5, hard 0.3, very hard
1.0, Beyond SAT 1.8; slope 1.6; a 25% guessing floor on four-choice questions). Answers lose half their weight every 21
days, a hinted correct answer counts half, and a wrong answer in under 4 seconds is ignored. A skill borrows strength
from its section (prior: section estimate plus the skill's offset, spread 0.6), so one or two answers already give a
sensible estimate. Start-up answers set the starting point: a past section score (spread 0.5), grade, a topic that
"feels hard" (−0.45), a topic the student's math class has not reached or that they marked "not learned yet" (−0.9),
English as an additional language (−0.25 on three reading skills). Evidence quickly outweighs all of these.

**Within reach.** A question is held back from practice, review and mistake redos when the chance of knowing how is
under 25%, even after adding one standard deviation to the estimate, so nothing is held back after one or two
answers. A set aimed at one skill always contains at least four of its most approachable questions.

## Placement check (`src/lib/model/placement.ts`)

Sixteen questions: two per SAT domain, alternating Reading and Writing and Math, never Beyond SAT. Within a domain it
asks first about skills the student said feel hard, then the most tested. Each question's tier is the one closest to
a 65% chance of knowing it at the current estimate. It can be stopped at any point.

## Coach (`src/lib/engine/coach.ts`)

- **Stage** from the estimated total: Foundations (under 950), Building (under 1200), Sharpening (under 1400),
  Polishing. The stage sets the share of time for review (12–14%) and timing work (3–22%, +6 points for "I run out of
  time").
- **Allocation:** the study minutes up to the test (at most 6 weeks ahead) go out 30 minutes at a time, each to the
  skill with the highest expected points for that half hour:
  questions per test × (accuracy after − accuracy before) × 10 points. Learning per half hour is
  0.02 + 0.35 × (accuracy still missing), 30% slower for the first hour of a topic not yet taught, and smaller as a
  skill gets more time. A skill clearly below the student's own level in its section is boosted
  (× up to 2.6). A skill whose prerequisite is much weaker waits, and a weak prerequisite is moved ahead of the skill
  that builds on it.
- **Days:** inside the student's minutes and rest days. Teaching comes first for a topic not yet learned, a weak
  skill, or a student who said they do not know where to start. Practice is sized to the questions within reach.
  Worked examples come after 2 or more conceptual misses. Timed modules come later in the plan (from the start for
  "I run out of time"). Full practice tests only with 90 or more minutes a day. The last two days before the test are
  light, and there is nothing after test day.
- **Stability:** today is planned from what was known at the start of the day (or just after a placement check), so
  it does not change while the student works. Tasks are marked done from activity.
- **Honesty:** when the goal is above the estimate plus the modelled gain, the plan says so and gives the daily
  minutes that would make it realistic. The modelled gain is shown as a range (0.5× to 1.3× the model's figure).

## Study simulator (`scripts/sim/`)

`npx tsx scripts/sim/run.ts 400` runs 400 synthetic students through the app's own code (session building,
answering, Path sets and stars, the plan or coach) for up to 28 days. Assumptions, all in `scripts/sim/model.ts`:
- the score distribution roughly matches real test takers (median about 1040);
- each student has two to four weak skills, and topics their math class has not reached are much weaker;
- self-reports are imperfect: a third of students misname one weak area;
- a practice question teaches most at about a 70% chance of knowing it, and almost nothing far above or below that;
- seeing the same question again teaches 30% as much;
- lessons help weak skills most;
- the chance of quitting rises with the share of far-too-hard questions in a day.

The results compare versions under the same assumptions. They are not predictions for real students. Results:
CRITIQUE.md.

## Practice-test scoring (`src/lib/engine/mock.ts`, `src/lib/fullTest/score.ts`)

Every practice test is scored by which questions were right, not just how many. Each question's difficulty
enters a three-parameter item-response model with a guessing allowance. Official tests and calibrated forms go on
the College Board scale through the average official curve of Practice Tests 4–10 (within about 30 points of the
College Board's own tables on those tests), and the printed raw-score table is shown beside it. Tests of Stellify
questions use Stellify's item model and the 500 + 100θ scale. "What each miss cost" rescores the section with that one
answer marked right, before rounding. Because a wrong answer on a question most students get right is strong
evidence of a lower level, missing an easier question costs more than missing a hard one.

## Not verified

College Board specifics in the test-day hub (device rules, arrival, setup timing, pretest items per module) link
to their source and are labelled "Needs verification" until someone reads those pages (NEEDS-OWNER.md #6).

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

## Not verified

College Board specifics in the test-day hub (device rules, arrival, setup timing, pretest items per module) link
to their source and are labelled "Needs verification" until someone reads those pages (NEEDS-OWNER.md #6).

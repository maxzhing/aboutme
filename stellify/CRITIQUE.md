# Critique: does Stellify help a student raise their score?

Written 2026-11-19 as a deliberately harsh review. Each finding says what was wrong, how we know, and what happened
to it: **fixed**, **partly fixed**, **not fixed** or **owner decision**.

## How this was checked, and what it cannot show

- **A walk-through on a phone** (Chromium, iPhone 13 size): a first visit, the old diagnostic answered by guessing,
  then the dashboard, calendar, Path, Learn and Smart Practice. Every menu page was also opened and measured
  (heading, length, controls).
- **400 synthetic students** (`scripts/sim/`) run through the app's own decision code for up to 28 days each. They
  differ in grade, math class, ability by skill (with real weak spots), English as an additional language, pace,
  daily minutes, rest days, test date and goal. When asked about themselves they answer imperfectly: a third
  misjudge one of their weak areas. Both versions of the app were run on the same final simulator, with the same
  students.
- **What this cannot show:** these are not real students. How students learn and when they give up are assumptions
  (written in `scripts/sim/model.ts` and METHODOLOGY.md). The measures that depend least on those assumptions are
  how personal the plan is, whether it aims at the right skills, and whether questions fit the student's level.
  The modelled score change depends most on them, so treat it as a rough comparison, not a prediction. Real
  students using the app is still the missing test.

## Results: before and after, same 400 students

| | Before: calendar plan | Before: Today panel | After: coach |
| --- | --- | --- | --- |
| Different first-three-skill sequences | 17 (top one: 21% of students) | **1 (100% of students)** | **245 (top one: 4%)** |
| App's skill ranking vs true weak skills (0 = no relation, 1 = perfect) | 0.20 | 0.20 | **0.44** |
| First two weeks' time on the student's 5 biggest true gaps | 27% | 12% | **60%** |
| Questions far too hard (under 30% chance), all students | 53% | 54% | **37%** |
| … for students starting under 900 | 85% | 80% | **50%** |
| Days that asked for more than the student's minutes (+10) | 2% | 12% | **0%** |
| Modelled quitting within 4 weeks | 45% | 46% | **35%** |
| Modelled score change, everyone who started | +12 | +2 | +10 |

The plan is now personal and aimed at each student's weak skills, and questions fit students far better. **The
modelled score gain is not better than the old calendar plan**, and this review does not claim it is. Beginners
still get too many questions above their level, because the question bank has nothing easier than medium (see C6).

## A. The first five minutes

1. **The first screen sold a pet, not help.** The headline was "Meet your study companion", with an egg; the first
   question was a nickname. A worried 11th grader learns nothing about how the app will help them. **Fixed:** the
   first screen explains what will happen and why it matters.
2. **It asked questions and ignored the answers.** "Strongest subject" and "weakest subject" were saved and never
   used anywhere in the code. The current score only fed a progress bar. **Fixed:** every start-up answer is used, and
   the screen says how (`FLAGS[].usedFor`). Past scores set the starting estimate, the math class separates "not
   learned yet" from "weak", and "what feels hard" sets which topics the check asks about first.
3. **Everyone's goal defaulted to 1500.** **Fixed:** the default is about 100 points above a known score, and the plan
   says plainly when a goal does not fit the time available, and how many minutes a day would make it realistic.
4. **It never asked the questions that matter.** Grade, math class, when the test is, how many days a week, timing
   trouble, test nerves, English as an additional language, accommodations. An Algebra 1 student was tested on
   trigonometry as if they had forgotten it. **Fixed:** six short screens, all optional.
5. **The diagnostic was a 40-minute wall, and the same for everyone.** It had 28 fixed questions (a fixed random
   seed), 71% of them hard, mostly one per skill, which cannot diagnose anything. A guesser with a lucky streak "aced"
   the medium questions. **Fixed:** a 16-question placement check that adapts (two per SAT domain, alternating
   sections, difficulty following the answers, asking first about what the student said feels hard). It has an
   "I have not learned this yet" button, and the student can stop at any point.
6. **The diagnostic gave hints.** Each question showed its skill, difficulty and sub-skill ("Words in context ·
   Medium · Secondary meanings"). **Fixed:** the placement check shows no labels.
7. **Guessing went unnoticed.** All 28 answers in 7 seconds still produced a "starting range". **Fixed:** a wrong
   answer in under 4 seconds is not counted as evidence, and the check asks the student to take their time.

## B. The plan: the central failure

1. **The "personalized" plan was one template.** Week 1 Foundation, 2 Advanced, 3 Hard, 4 Exam, for everyone. The
   diagnostic only reordered skills inside fixed slots (grammar on day 1 even for a student who scored 1/14 in Math
   and 4/14 in Reading and Writing). **Fixed:** the coach (`lib/engine/coach.ts`) shares out the student's real
   minutes, half an hour at a time, to where the next half hour should add the most points for them. It leads with
   skills clearly below the student's own level, puts weak prerequisites first, and gives every task a reason
   grounded in the student's own answers.
2. **The Path ignored the diagnostic entirely.** Its Score Lever waits for 6 answers per skill, and the diagnostic
   gave at most 2, so every student got the same route: Linear equations first (400 of 400 in the simulation).
   **Fixed:** a student model (`lib/model/ability.ts`) estimates every skill from the first answers by borrowing
   strength from the section and from what the student said. The Path's highlighted step now follows the coach.
3. **There were four "do this now" lists on one screen.** The Today panel (Path), the Study plan card (calendar),
   "Your lesson path" (always Math, even for a student weak in Reading and Writing) and "Biggest opportunity". In the
   walk-through, two of them disagreed. **Fixed:** one Today list, the same on the dashboard and the Path.
4. **The plan was built once and never changed.** Missed days were simply lost, and "done" was a checkbox on the
   honour system. **Fixed:** the plan re-plans every morning from the newest results (today stays put while the
   student works), and tasks tick themselves from what the student actually did.
5. **It planned past test day.** With a test 3 days away, the plan still ran 7 days, with mock exams after the test.
   **Fixed:** the plan stops at test day, keeps the last two days light and ends with the test-day checklist.
6. **It ignored the student's time.** It scheduled 2-hour-14-minute mocks for students with 15 minutes a day (264
   skipped mocks in the simulation) and very hard questions in week 3 for everyone. **Fixed:** full mocks only for
   students with 90 or more minutes a day, timed modules otherwise; difficulty follows the student.

## C. Questions at the wrong level

1. **"High challenge" was on by default and removed every medium question.** Beginners got only hard questions or
   harder. **Fixed:** each question is aimed at about a 70% chance of knowing how; medium questions are skipped only
   for students who would almost certainly get them right.
2. **Practice sets for a weak student drained the skill all the way to Beyond SAT.** In the simulation, students under
   900 were served 1,075 Beyond-SAT and 3,634 very hard questions. **Fixed:** questions the model is fairly sure are
   out of reach wait until the skill catches up. A set can end short, and the coach sends the student to a lesson
   instead.
3. **Spaced review and mistake redos brought back questions two levels above the student** (77–84% far too hard for
   beginners). **Fixed:** the same within-reach rule. Held-back mistakes stay saved, and the redo screen says why
   they are waiting.
4. **The rule must not trap anyone:** practising a skill on purpose always gives at least four of its most
   approachable questions, so the estimate can move. **Done**, with a test.
5. **Speed Training and the Blitz modes promised medium and hard questions but included Beyond SAT ones.** **Fixed.**
6. **The bank has no easy questions.** Medium is the lowest tier (13% of the bank, 1–6 per skill), and most skills
   have 9–20 questions in all. Students starting below about 900 run out of questions at their level, which is why
   half of what they see is still far too hard. An Easy tier of 63 original questions was written and then removed
   at the owner's request. **Owner decision.** Lessons, worked examples and "start from zero" primers are the route
   for these students meanwhile.
7. **Path practice sets are the same for everyone** (2 medium, 2 hard, 2 very hard). **Not changed:** they define what
   a star means, so changing them changes every student's stars.

## D. Things with little purpose for an SAT student, and clutter

1. **45 menu links in seven groups**, including six AP courses and a music studio in an SAT app; "Math Academy" and
   "Reading & Writing Academy" duplicated the full curriculum; Daily, Speed, Arena and Hardest overlapped; "Study
   Calendar" and "Weekly Report" were filed under Performance. **Partly fixed:** 39 items. The daily loop (Today, My
   plan, Path, Lessons, Practice) comes first, and Challenges, Tools, Companion and AP Courses are folded groups. The
   two academies are off the menu but still reachable from Lessons. Nothing was deleted.
2. **The companion competes with studying.** The pet takes a full-width card on the dashboard. One daily quest,
   "Get 3 Hard or tougher questions right", pushes weak students towards questions above their level. **Not
   changed:** an owner feature (DECISIONS #8). Suggestion: make the hard-questions quest level-aware, and move the pet
   card below the fold on phones.
3. **Level-up and achievement pop-ups covered the page heading on phones** in every screenshot taken right after the
   diagnostic. **Fixed:** on phones they now appear at the bottom of the screen.
4. **Some reading pages are walls.** On a phone, the Grammar Masterclass is about 20,000 px tall (about 30 screens)
   and SAT Hacks about 15,000 px. **Not fixed:** they need a contents list or one rule per screen.
5. **The old diagnostic results page was about 8 phone screens long.** **Replaced** by a plan page that leads with
   the three things that matter: where you are, what the plan works on and why, and today.
6. **Keyboard shortcut hints showed on phones** ("A–D choose · Enter check"). **Not fixed.**
7. **Remix Studio, Predict-First, Official Questions** (empty in the public build) are niche for a first-time
   student. **Moved** lower in the Practice group.

## E. What still needs real students

- Whether students who follow the coach actually score higher. The simulation says the plan is far better aimed, but
  not that the score gain is larger; only a real cohort can answer that.
- Whether 16 placement questions are enough. The skill ranking from them matches true weak skills at 0.44 (up from
  0.20), which is useful but far from perfect; the plan keeps correcting itself as answers come in.
- Whether the start-up questions are answered honestly and quickly by 14- to 17-year-olds. Nothing is required, and
  the plan works without them.

## Since this critique (2026-11-20)

Fixed at the owner's request: one score estimate everywhere; two-screen setup with a placement check that can be
finished later; the Path in route order and scrolled to the student's step; Nova replaces the egg; practice tests
scored by difficulty, with what each miss cost; one Desmos page; Predict-First inside Reading and Writing practice;
remix every miss; a Daily Challenge per student; 324 vocabulary words; a formulas-only Formula Sheet; and 72 new
College Board-style questions (bank 517 → 589).

**Against Crackd and OnePrep, honestly.** OnePrep's bank is built from the College Board's own question bank
(about 1,500 Reading and Writing and 2,400 Math questions, with harder "challenge" sets) and includes full practice
tests. Crackd offers practice tests, a challenge mode, Desmos explanations, an AI tutor and paid tutoring. Stellify is
free, works offline, plans around each student, and teaches with lessons and worked examples. But its public bank
of 589 original questions is far smaller than OnePrep's. Volume is the biggest remaining gap. The personal copy adds
920 official questions and 7 full tests. Growing the original bank further, and accounts (Firebase, planned), are
the next steps.

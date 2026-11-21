# Decisions

Each entry records what was decided, why, and the alternatives considered.

1. **Docs live in `stellify/`**, next to the app's README, not at the repository root (which is the owner's
   personal site). Alternative: the repository root. Rejected because it mixes the site and the app.
2. **Pushing the personal copy (official College Board questions) to a public repository was declined.** It would
   publish copyrighted College Board material and break the "never reproduce College Board content" rule. The owner
   made `maxzhing/satstudy` private on 2026-11-19 (verified twice), so the personal copy goes there.
3. **Math hex layout:** radius-2 hexagon. The layout was found by an exhaustive search that requires every skill to
   touch at least one prerequisite and every prerequisite to sit on the same ring or an inner one. It scores 17 of 20
   prerequisite edges adjacent. Circles sits at the bottom, next to Equivalent expressions (completing the square),
   not beside Trigonometry: no arrangement gives both. Alternative: a free-form layered layout. Rejected because the
   brief prefers the radius-2 shape when it does not distort order, and it does not.
4. **Stars are earned and kept.** Stored with dates and never removed, even if accuracy later drops, so there is no
   guilt mechanic. Retention is checked by the ★3 delayed-retrieval rule instead.
5. **Theme default:** new students get the light "paper" theme. Existing students keep whatever theme they saved. The
   old default was dark, and someone who never touched the setting had `theme: 'dark'` saved, so they keep dark.
   The new dark theme is a proper warm "lamp-lit" palette, not an inversion.
6. **The dashboard (`/`) keeps its URL.** Path is a new top-level `#/path`, and onboarding now ends there. The
   dashboard leads with the Today panel. This avoids breaking bookmarks and saved links.
7. **Daily streak shown as a weekly rhythm.** The stored streak data stays (no data loss). The top bar shows "N of M
   study days this week" against the student's own plan, not a streak count.
8. **Companions stay** (owner-built feature, never deleted) but leave the dashboard hero and the Today panel. They
   are still in the navigation under Companion.
9. **Typography is fixed at render time** (`lib/typeset.ts`): curly quotes, apostrophes, en-dash ranges and real
   minus signs, applied only to prose tokens, never to math, code or user input. Alternative: rewriting about 60k
   lines of content. Rejected as error-prone, especially for Java code and punctuation questions.
10. **Field-test items:** a mechanism, not content. `flags.fieldTest` stays OFF until items exist in the `pretest`
    lifecycle state.
11. **Data collection option B** (on-device analytics plus manual export) ships now. Option A is designed and
    stubbed, OFF, with no endpoint.
12. **Desmos Lab validates on Stellify's built-in grapher** (offline, state readable). The embedded College Board
    Desmos calculator stays for free practice. Validating Desmos graph state needs the Desmos API key (NEEDS-OWNER).
13. **More colour and rounder shapes (owner request, 2026-11-19).** This overrides the brief's "one accent" and
    "radius at most ~6px" rules. Each content domain has its own colour (Math: teal, orange, gold, rose;
    Reading & Writing: sky, rose, green, orange) and so does each app area (navigation icons, page labels). Stars are
    gold. Blue stays the colour of actions and of the recommended next step. Hexagons have rounded corners. Cards use
    16px, controls 12px, chips are pills. Colour still never carries meaning alone: every state has a word, an icon
    or a star count, and contrast is checked by axe.
14. **Format choice refined.** For a brand-new skill (no stars, chapters not done), the engine starts with chapter 1
    rather than a practice set. The brief's "practice set otherwise" applies once ★1 is earned. Starting a new topic
    with a test is the opposite of what the brief wants for learning.
15. **Path stars backfill.** On the first load after the update, skills that already meet a star's rule (for
    example Proficient) get that star dated at that moment. Their 7-day retention clock starts then, not
    retroactively. Recomputing the historical date was possible but slow on big histories, for little benefit.
16. **The Path is a climb, not a honeycomb (owner requests, 2026-11-19).** The owner asked for a clear line in
    lesson order, climbed like a ladder, zig-zagging, with each topic's hexagons grouped together and heading one
    way. The result: each unit (one SAT domain) is a touching chain of tall 3D hexagons, climbed from the bottom
    and drifting right, then left in the next unit. Each shared edge carries an arrow to the next step, and units
    are joined through their floor labels. Lesson order is now unit by unit in the SAT's domain order, which still
    puts every prerequisite earlier (tested). The radius-2 honeycomb coordinates stay in the data but are no
    longer drawn. The recommended step stands taller, with one "Start here" tag.
17. **The Path map follows the owner's hexagonal-thinking reference (2026-11-19).** It copies the layout only:
    each SAT domain is one touching cluster, clusters branch out from related skills, and anything that touches
    relates (a prerequisite, or a named branch anchor such as Ratios growing from linear functions). Arrows on
    shared edges show what builds on what. The map grows upward from the first skill. The positions came from a
    search over those rules: math has 18 of 20 prerequisite pairs touching, Reading & Writing 9 of 10, and every
    domain is connected (tested). It replaces the zig-zag climb (#16). The 3D tiles, colours, stars, the single
    raised "Start here" tile, the list view and the keyboard support are kept. On a phone the map pans inside its
    box at a readable size instead of shrinking the tiles.
18. **Worked Examples content is generated from formulas** (scripts kept outside the repo; the output is
    committed) and every final answer is recomputed independently in tests/worked.test.ts. There are 12 math
    families so far, one per skill for 12 of the 19 math skills; Reading & Writing ladders are not written yet.
19. **Path, final form (owner direction, 2026-11-19):** grouped hexagon clusters, one per SAT domain, laid along
    a path that goes down the page. Inside a cluster, tiles snake in step order so each step touches the next.
    A dotted trail and the unit's name lead to the next cluster. There are no arrows: step numbers show the
    order. Only the next step is highlighted (blue, gold ring) and raised above the rest. This replaces #17's
    branching map. The branch anchors stay in the data for possible later use.
20. **Hosted web build in `sat/` at the repository root** (for GitHub Pages once merged: /aboutme/sat/). The owner's
    existing homepage (index.html) is not touched. It has a static landing page with a real question, the app
    split into per-page chunks behind a one-line loader entry (an entry that chunks import from caused an
    init-order crash), fonts and the PDF worker as files, a strict CSP, a web manifest and a service worker that
    precaches the app core (page chunks are cached on first visit). The single offline file is unchanged and still
    built.
21. **One system for the Path and the lessons (owner request, 2026-11-19).** The Path's order is exactly Learn's lesson
    order (Linear functions now builds on Linear equations, so the order stays valid). Each Path step opens its real
    lesson page, which shows the same Path card (stars, next step, practice set, hard set, skip check). Learn and the
    dashboard show the Path's stars and next step. Finishing the 5-minute quick lesson with 2 or more of its stars
    now counts toward ★1, so earlier quick-lesson progress still shows.
22. **One custom plan per student: the coach (owner request, 2026-11-19).** The template calendar plan and the Path's
    separate Today list are replaced by one plan (`lib/engine/coach.ts`). It comes from a per-skill student model,
    start-up questions and an adaptive placement check. The dashboard, the Path and My plan all show the same Today
    list. The Path's highlighted step follows the coach once it knows something about the student; with nothing known,
    the route starts at the beginning. The old 28-question diagnostic address now runs the placement check. The old
    `plan` field stays in saved data but is no longer used. Alternative: keep the template and reorder it more cleverly.
    Rejected: in the simulation, the template gave 17 different openings for 400 students, and the Path gave 1.
23. **Questions far above a student's level are held back** from practice, review and mistake redos until the skill
    catches up (under 25% chance of knowing how, allowing one standard deviation for uncertainty). Practising one skill
    on purpose always gets at least four questions. The "High challenge" setting now only skips medium questions the
    student would almost certainly get right. Alternative: keep serving everything. Rejected: beginners were getting
    80–85% questions they had almost no chance with.
24. **The menu is ordered by the daily loop, and extras are folded** (Challenges, Tools, Companion, AP Courses). Nothing
    was deleted. The two Academies stay reachable from Lessons.
25. **No Easy tier (owner decision, 2026-11-19).** An Easy tier of original questions was written and then removed at
    the owner's request. The bank's lowest tier stays medium. Consequence, stated in CRITIQUE.md: students starting
    below about 900 run out of practice at their level sooner and are sent to lessons instead.
26. **Speed Training and the Blitz modes use only medium and hard questions**, as their descriptions always said. They
    had been including Beyond SAT questions.
27. **Nova, one mascot (owner request, 2026-11-20).** The egg, hatching and ten random companions are replaced in
    everything students see by Nova, a small gold star drawn in the existing flat-colour style, so every shop
    accessory still fits. The old companion data stays so saved progress loads.
28. **The Path is a route, in order (owner request).** Its next step is the first skill along the route the student
    has not secured (★2, or clearly strong in their answers), and the map scrolls the page to it. The Today list
    still follows the coach's weakness-first plan; the Path shows where the student is along the whole route.
29. **Practice tests are scored by difficulty, like the real test (owner request).** Official tests now use the
    item-response scoring on the official curve (the College Board's printed raw-score table is shown beside it for
    comparison). Tests of Stellify questions keep Stellify's item model, which already weights difficulty with a
    guessing allowance and recovers known scores more closely in the simulation tests. The report shows what each
    miss cost, to the nearest point: a missed easier question costs more than a missed hard one.
30. **Merges (owner request).** One Desmos page with two tabs (the old addresses open the right tab); Predict-First is
    an option inside Reading and Writing practice and off the menu; Remix Studio stays and is offered for every miss at
    the end of a set. The Formula Sheet shows formulas only (the grammar entries still feed search and the tutor).
31. **72 new questions are appended to the bank and left out of Practice Tests A and B**, so a retake of a fixed form
    has exactly the same questions as before (checked against the previous version). Nine drafts that turned out
    to be near-copies of existing questions were replaced before release.
32. **One score estimate everywhere.** The answer-based estimate that Analytics uses, once a section has enough
    answers; before that, the student model's starting estimate, labelled as such.
33. **Setup is two screens, and the placement check can be finished later** (it resumes where it stopped, and Today
    shows it until it is done). **The Daily Challenge is chosen per student**, from their weakest skills, at about a
    50% chance, and fixed for the day.
34. **Computers only (owner decision, 2026-11-20).** No more work for phones; existing phone tests stay as they pass.
35. **The difficulty mix target moves from 20/40/40 to 15/40/45 (medium/hard/very hard, ±5 points).** The owner
    asked for many more questions written at the College Board's hard level. The number of medium questions does not
    shrink (about 100 per section), so beginners keep the same reachable pool; only the share changes as hard and very
    hard questions are added. New questions are labeled honestly: roughly half hard and half very hard per batch.
36. **Hard Reading and Writing questions must reach the College Board's own hard level, measured.** The owner said
    our hard questions read a full level easier than the College Board's. Measured against the College Board's hard
    items (kept locally, never committed), their non-literary passages average 26 words per sentence with 16% of words
    nine or more letters long, and reading-question choices average about 20 words; ours averaged 23 words, 11% and 15.
    `cbBarIssues` in rules.ts now sets the bar at the easier quarter of the College Board's hard items (22 words per
    sentence, 13% long words; literary excerpts 15 and 6%; choices 17 words for inference, central-idea, evidence and
    cross-text questions, 14 for structure and synthesis). `tests/cb-bar.test.ts` holds a count of hard questions still
    below the bar that may only go down, so new questions must meet it. `scripts/cb-audit.ts` lists what is left.
    The measures are proxies for wording difficulty; the logic of each question and its wrong answers is reviewed by hand.
37. **Calculus BC gets a fast track and real tests (owner request).** The owner asked for a course that can be
    learned quickly with many hard tests at the end, modeled on MCPS (Winston Churchill High School). MCPS
    publishes the course only as a two-semester sequence (AP BC Calculus A/B) that follows the College Board
    framework; no unit pacing guide or test is public, so the split is ours: Semester A = Units 1–5, Semester B =
    Units 6–10. Each unit has a timed, hint-free test of hard problems with no-calculator and calculator parts
    (pass at 80%), then a semester exam for each half and cumulative finals. All answers are checked in tests.
38. **Guided free-response workouts explain every step in full, and formulas are taken apart piece by piece.**
    The owner asked that each formula be broken into its parts and used in more than one way, and that every
    step be explained in full, not in a few words. `src/data/calc/formulas.ts` lists 22 formulas. For each one it
    gives how to read it aloud, what each symbol means, the different ways it gets used, and its usual trap. The page
    is at `/calc/formulas`, and each workout step links to the formula it uses. Every step explanation says what is
    found, why that method fits, what each number means and how to state it; a test sets a 160-character floor. Past
    College Board free-response questions the owner uploaded are worked the same way, but only in the personal
    copy (through the git-ignored pack, `scripts/calc-frq-pack.ts`). They are never committed or published.
39. **Every Calculus BC test problem is at or above the College Board's hard level, and is solved like a tutor
    would solve it (owner request).** All 152 test problems (10 unit tests, 2 semester exams, 4 finals) were
    rewritten. The easy one-step items are gone (plain limits, a single rule applied once, discs about an axis).
    In their place are problems with unknown constants, tables, two ideas at once, "which must be true" reasoning,
    axes that are not the x-axis, and endpoint traps. Each problem has three parts. `ask` says what the question is really asking.
    The `solution` steps each say what to do, why, and the arithmetic in full. `trap` names the mistake that costs
    the point. Tests enforce a minimum for each, and every answer is still checked numerically. Five of the
    original free-response workouts gained a part that is harder than the exam. A bold step label may now contain math.
40. **Every question re-checked; all hard Reading and Writing questions now reach the College Board's measured
    level (owner request).** The owner asked that every question be checked and be College Board level before
    any new ones are added. The 117 hard Reading and Writing questions that were below the measured bar (sentence
    length, long-word share, answer-choice length) were rewritten in a denser academic register with their logic
    and keys unchanged; `MAX_BELOW_BAR` is now 0, so none may fall below it again. Reading each one surfaced real
    errors, which were fixed: a quotation question whose wrong answer was in fact also correct (Rossetti’s
    “Up-Hill”: the line called the traveler’s question is the reassuring voice’s answer), and invented literary
    works presented with a fake author and date (“a 1923 poem by …”), now labeled as original works. Official
    College Board questions shown as page images can now carry the exact text of each choice (`choiceText`),
    used where the printed image clips a fraction at its bottom edge.
41. **AP Chemistry gets the same exam kit as Calculus BC (owner request).** Nine unit tests, two semester exams
    and a cumulative final (84 original problems), five guided free-response workouts and a 13-formula anatomy
    page, served by the same pages as Calc BC through a per-course registry (`src/data/kits.ts`; routes
    `/(calc|chem)/test|frq|formulas`). A calculator is allowed on every chemistry problem, as on both sections of
    the AP Chemistry exam since 2023, so a chemistry test is one part, not a no-calculator part and a calculator
    part. Chemistry answers with three or more significant figures accept ±1 in the last digit (`lastDigit`),
    because a student who rounds an intermediate value is not wrong; Calc BC stays strict. Every keyed number is
    recomputed in code from the problem's own data; every problem was also read for chemistry errors, and the
    items that were too easy for a "hard" test (an R_f division, a plain HCl dilution, a same-cuvette Beer's-law
    ratio) were replaced with harder ones.
42. **Explanation re-audit (owner request: "make sure each explanation is good").** An automated pass over all
    1,549 questions looked for thin, templated or mismatched explanations and for duplicate questions. 308 wrong-answer
    rationales in Reading and Writing were rewritten: 52 that were boilerplate repeated across questions ("A comma alone
    between two complete sentences is a comma splice") now quote the exact text the choice produces, and 256 that
    stated a fact without the reason ("'Carve' is present tense") now say why that makes the choice wrong in this text.
    Four near-duplicate questions were replaced with new items (r-fss-n62, r-syn-n14, r-tsp-n12, r-fss-n64). Every
    math solution was checked to reach its keyed answer. Measured against the College Board's own rationales in the
    private pack, our hard-math solutions are much shorter (median about 35 words of steps against 172 for College
    Board Hard), and some items labeled V read like College Board Medium; expanding those solutions and re-checking
    those labels is the next piece of work.
43. **Every hard, very-hard and beyond-SAT math question is solved like a tutor would solve it (owner request).**
    The 2-step solutions (median 33–35 words, against 172 words in College Board's own Hard rationales) were
    rewritten for all 682 items: one move per step, each with its reason, a check, and where it helps, which
    wrong choice a slip leads to (each such claim was verified against the choices). Medians are now 4 steps and
    63 (hard) to 77 (very hard) words of steps, about 100 words with the rationale and strategy notes. A test
    requires at least 3 steps and 40 words for every non-medium math question. Reading every item also showed
    that about 110 of the 342 items labeled very hard read like College Board Medium (for example a circle
    through the origin, a rhombus from its diagonals). Relabeling them would break the bank's enforced 15/40/45
    difficulty mix, so they keep their labels for now; making those items harder is the next piece of work.

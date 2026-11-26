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
44. **The very-hard math items that read like College Board Medium were rewritten as genuinely harder problems (owner request).**
    110 of the 111 flagged items were replaced in place, keeping each id, skill, subskill and label so the
    enforced difficulty mix and answer-position balance hold. Each new item needs an extra idea a Medium item
    does not: a second case to find (a quadratic factor that adds one new zero either as a double root or by
    sharing a zero), a substitution before the algebra works (a system in 1/x and 1/y), a hidden step before the
    asked quantity (solve a cubic from a volume, then find surface area), a conditional probability instead of a
    plain one, or a reading of a whole margin-of-error interval. Every key is computed by the item's own check, every
    wrong choice's rationale was re-checked against the choice it describes, and solutions follow the tutor style of
    entry 43. m-prob-n5 was not replaced because its figure would also need redrawing. The quality-control pass then
    raised 14 flags: three answer-length giveaways (the long answer was the key) were fixed by rewriting the
    choices to similar lengths; two new items too close to existing ones were rewritten; the remaining 11 are
    different problems that share College Board's standard stem wording, and each is recorded in qcReviewed.ts with
    its reason. The difficulty of these items is our own judgment against the College Board's published Hard items;
    no students have answered them yet, so the labels are not yet confirmed by data.
45. **Pre-launch check and competitive gaps (owner request: the site is going public).**
    Checked before launch: no College Board question text, ids or images and no official AP free-response text in any
    public file (4,328 text samples and 325 FRQ strings searched), nothing from private/ ever committed, no personal
    details in the repository. First app visit is about 1.6 MB compressed, roughly 2–3 seconds on 4G, then served
    offline by the service worker; left as is. Changed only what a public launch needed: the trademark notice now
    names AP as well as SAT (the site has AP Calculus BC and AP Chemistry); link-preview tags for shared links; a
    visible warning when the browser is not saving progress (private browsing, blocked storage, full disk), which
    before failed silently, plus a request that the browser keep the site's data once a student has 10 answers
    (Safari can clear unvisited sites' data after 7 days). Compared with Bluebook, Khan Academy, UWorld and OnePrep,
    the one test-day tool missing from practice tests was Bluebook's Line Reader; it is added (drag or arrow keys,
    1–3 lines, clicks pass through). Gaps left open on purpose, because they need a server, money or the owner's
    decision: no accounts or cross-device sync (export and import instead), no video lessons, the AI tutor needs the
    student's own free key, question reports stay on the student's device, and the bank (1,549) is near UWorld's
    size but well below OnePrep's (about 3,900–4,900).
    Importers: the practice-test importer keeps compound hyphens split across lines, strips leaked page furniture
    and credit lines, ends the last crop on a page above the STOP banner, and falls back to the exact page image when
    text cannot be cut cleanly; against the earlier hand audit it reproduced 28 fixes exactly, sent 8 to the image
    and touched nothing undamaged. make-pack.py repairs compounds split as "long- headed" (5 of 7 earlier cases).
    The 9 quarantined questions still need the College Board PDFs.
46. **Video lessons for the SAT, and two-column questions in the practice-test importer (owner request).**
    Video Lessons (menu: Learn → Video Lessons, /videos) has one video for each of the 30 SAT skills, the same skills
    as the lessons. They are narrated, animated explainers drawn in the browser, not recorded video files: each
    sentence of narration is a beat that reveals the next part of the picture (graphs that draw themselves, lines of
    work, highlighted passages, answer choices crossed out one by one with the reason, two-way tables), so all 30
    add about 140 KB of source instead of the hundreds of megabytes real video would add to a single-file, offline app. Each
    video has the idea, a worked question, the trap to avoid, a pause-and-try question that stops the video until the
    student answers, and a recap, and runs about 1–2 minutes. The voice is the browser's built-in speech (it sounds
    different on each device, and some browsers have none); captions are always available, with speed, keyboard
    controls and full screen. Narration is plain words because it is read aloud; the math is typeset in the
    pictures. All passages and questions are original; tests/videos.test.ts checks the structure of every video
    and recomputes every number in the math scripts. "Watched" marks are kept in this browser only (they are a
    convenience, not progress), so they are not in the export file. AP courses have no videos yet, as asked.
    Importer: a left-column question whose text runs across the gutter (a wide table row or line) now gets a
    full-width crop, and the right column's items beside it are given to it instead of to the right column. Tested
    on a made-up page with the same layout; not yet tested on the College Board PDFs, which are not on this machine,
    and a figure drawn as an image with no text in it is still not detected. The 9 quarantined questions stay set
    aside until the PDFs and private/pack.json are available.
47. **The video lessons are real videos with a recorded voice (owner request).**
    Each of the 30 SAT video lessons is now an MP4 (1280 × 720, 30 frames a second, H.264 with AAC sound) with a
    natural-sounding voice, made here from the same scripts: Kokoro, an open-weight text-to-speech model (Apache-2.0,
    voice "Michael", chosen by the owner) reads every line; headless Chromium plays the animation in real time and its
    screen stream is recorded; ffmpeg joins picture and voice (scripts/videos/). Each video stops by itself at its
    pause-and-try question and waits for the student's answer; skipping plays the video's own spoken answer after a
    five-second countdown, so the file also works as a plain video. Captions (WebVTT) and chapters come from the script
    and its timing, so they always match the narration. The files (about 1–2 MB each, 49 MB in all) live only in sat/videos/,
    which the web build keeps, and are streamed rather than stored in the offline cache. The single-file
    builds stream them from the hosted site (https://maxzhing.github.io/aboutme/sat/, assumed to be the GitHub Pages
    address; not checked from here) and, when that cannot be reached, fall back to the animated version from entry 46,
    which also stays available on request.
48. **Optional Google accounts with saved progress (owner request); hosting on Firebase.**
    On the website the first screen now offers "Continue with Google" or "Continue as guest". Guests work exactly as
    before (everything on the device; nothing sent). Signed in, the same snapshot that Export writes is gzip-compressed
    and saved to the student's own Firestore record (users/{uid}) about 20 seconds after a change and when the tab is
    hidden; another device loads it on sign-in. If both the device and the account changed, the student chooses which
    to keep, and the other is kept as a backup on the device. Security rules let a student read and write only their
    own record, with a fixed shape and a size cap. Settings has the account card (save now, sign out, delete the
    account copy). The Firebase library (about 150 KB compressed) downloads only when someone signs in; the offline
    single file and the personal copy contain none of it and stay guest-only, because Google sign-in needs a real web
    address. Google Analytics, offered in Firebase's sample code, is deliberately not used. Accounts are for ages 13+.
    The Privacy, About, Settings and landing texts say this. Tested end to end against the Firebase emulators (guest,
    sign-in and save, second device, conflict, rules refusing another user, sign-out); the real Google pop-up could not
    be tested here (its script host is unreachable from this machine) and needs one check on the live site.
49. **Animated lessons: format, voice and scene format (owner brief "animated lessons", Phase 1).**
    (A) Animation: native browser tech only: SVG, CSS and the app's existing framer-motion (MIT, already in the bundle,
    so no new library) plus KaTeX (MIT, bundled with fonts). GSAP was suggested by the owner but its repository is
    blocked here and the brief rules out heavy animation libraries, so it is not used.
    (B) Voice: option 1 works here. Kokoro-82M v1.0, Apache-2.0 per its model card (checked on huggingface.co
    2026-11-26), voice am_michael (owner's choice). Engine wrapper kokoro-onnx; onnxruntime MIT. phonemizer/espeak-ng
    (GPL-3.0) run only at build time to turn text into phonemes; they are not shipped, and generated speech is output,
    not a copy of the program. The player says the narration is computer-generated. Human recordings dropped into a
    lesson's recordings/ folder replace the generated line with no other change.
    (C) Scenes: the existing declarative scene list (JSON-compatible) plus new actions: morph (equation steps whose
    matching terms glide via shared layout ids), pause (silent, skippable "try it first" overlay), and per-lesson
    narration cues. A lesson = problem.json (verified math) + scene.json (narration and directives) + manifest.json.
    Audio: one MP3 per lesson, mono 48 kbps, loudness -16 LUFS integrated (the common target for spoken word on phones
    and podcasts; loud enough on a phone speaker without clipping at -1.5 dBTP). Cue offsets come from per-sentence
    synthesis, so no forced alignment is needed.
    Rendered MP4s stay (not deleted) as a fallback/download, but the in-browser lesson is now the primary format, as
    the brief decides: sharper on phones, about 1 MB per lesson instead of 1.6 MB, captions and reduced motion built in.

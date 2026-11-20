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


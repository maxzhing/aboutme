# Lesson audit (Phase 0)

**What exists (branch claude/gallant-edison-5pr7i7, carried here).**
- 30 SAT video lessons, one per skill (19 Math, 11 R&W), scripted in `src/data/videos/{math,rw}.ts` as declarative
  scenes (title, lines, passage, choices, plot, table, tiles, versus, quiz, recap). 1–2 min each, 686 narration lines.
- Player 1, `VideoPlayer.tsx`: in-browser animation (SVG, KaTeX via the site's RichText, framer-motion), narration
  through the browser's speech synthesis (voice varies by device; many phones sound robotic). Captions, speed,
  keyboard, pause-and-try. This is the "slideshow with lifeless narration" the brief describes.
- Player 2, `LessonVideo.tsx`: 30 rendered MP4s in `sat/videos` (48 MB, Kokoro voice "am_michael"), captions from the
  script, chapters, pause at the question. Falls back to player 1 offline.
- Math renderer: KaTeX 0.19 (MIT), bundled locally with its fonts. Design tokens: `src/styles.css` + DESIGN.md
  (one accent, ok/bad/warn feedback colours, IBM Plex Sans + Source Serif 4, both OFL).
- Routing: hash routes (`app.html#/videos/<skill>`); service worker precaches only the app shell and skips `/videos/`.
- Skill ids: lin1 linf lin2 sys ineq · equiv nleq nlf · ratio pct data1 data2 prob infer claims · area lines trig circ ·
  cid coet coeq inf · wic tsp ctc · tra syn · bnd fss (`src/lib/types.ts`).
- Misconception/trap tags: `src/data/traps` style ids on each question (`trap` text per question; TrapCheck in Question.tsx).

**Keep.** The scene format and SceneView renderer (sharp text and vectors at any size), the scripts, the caption
pipeline, the Kokoro voice tracks and their timing (`timing.json`), the MP4s (not deleted; still a fallback and a
download).

**Replace.** Browser speech synthesis as the default voice; fixed 1280×720 frames on phones (text about 6 px wide on a
360 px screen); worked steps that appear as new lines instead of terms moving; questions that are mid-level, not
hard-problem walkthroughs.

**Blockers / risks.**
1. The brief names https://maxzhing.github.io/satstudy/ as the live site. satstudy holds the *personal* build with
   College Board questions; if GitHub Pages serves it, that content is public. Not verifiable from here (API path and
   github.io are blocked). Nothing new with College Board content is pushed there until the owner confirms Pages is
   off for satstudy (NEEDS-OWNER).
2. The public Stellify code lives in `maxzhing/aboutme` (`sat/` is the hosted build; `firebase.json` hosts it on
   Firebase for stellifyprep.net). Lesson work happens there; base-path handling is tested from a sub-path.
3. GitHub Pages size and bandwidth limits cannot be checked from here (NEEDS VERIFICATION).
4. No real phone, no GPU, no listening: the owner checklist covers these.

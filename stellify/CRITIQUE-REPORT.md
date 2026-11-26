# Critique report — Gate 1 (three pilot hard-problem walkthroughs, player, pipeline)

Date: 2026-11-26 · Reviewer: the Critic (independent; judged artifacts only) · Branch: claude/stellify-animated-lessons

## Verdict

**Overall: NO-SHIP.** Leave `content/lessons/approvals.json` unchanged (no `criticApproved`).

| Lesson | Verdict | Blocking reason |
|---|---|---|
| sys-w1 | **NO-SHIP** | B1 (the try-it-first pause hides the problem), B2 (narration says the parallel lines are "three units apart", which is false) |
| circ-w1 | **NO-SHIP** | B1 |
| inf-w1 | **NO-SHIP** | B1 (the passage is on screen for about 9 s and is gone during the 20 s prediction) |

The math in all three is correct. I derived each solution myself before checking it against the files. The audio is clean and in sync, and gating, lazy loading and privacy are good. The failures are in teaching flow, one false spoken fact, and the player's accessibility. All of them can be fixed in a day.

Screenshot evidence is in `/tmp/claude-0/-home-user/8a9046fd-6e66-5327-8568-be364c8db889/scratchpad/critic/` (abbreviated as `SS/` below). It is a scratchpad folder and may be cleared.

## What I ran
- `verify.py content/lessons`: 3 lessons checked, 0 problems. `test_verify.py`: 14/14 broken lessons caught and 6/6 broken scenes caught. `lint.ts`: 0 errors and 0 warnings. `vitest tests/videos.test.ts`: 40/40 pass. `tsc --noEmit`: clean.
- **My own mutation test of the verifier** (`SS/mut.py`): of 15 extra breakages, **12 got through**. Details are under M10.
- ffmpeg checks: ebur128, astats, silencedetect, and cue offsets compared with detected speech onsets.
- Playwright against the built site, served from `/aboutme/sat/` with byte ranges: 360 px light and dark, 1280 px, reduced motion, keyboard only, the accessibility tree, the network log and cookies.

## Independent math (A)
- **sys-w1.** The coefficients are proportional when 2·8 = k·k, so k = ±4. At k = 4 the second equation is 2 × the first, so there are infinitely many solutions (the trap). At k = −4, multiplying the first equation by −2 gives −4x + 8y = −12, but the second says = 12, so there is no solution. **Key A (−4) is correct.** k = 0 gives x = 3 and y = 1.5, one solution. k = 16 gives 16 − 256 ≠ 0, one solution. The graph lines y = x/2 ∓ 3/2 are correct.
- **circ-w1.** Completing the square gives (x−3)² + (y+5)² = 34 − c. The center (3, −5) is 5 below the x-axis, so the radius is 5 and 34 − c = 25, which gives **c = 9 (correct)**. The trap value c = −25 (squares completed on the left only) is correct. The wrong value 25 (radius 3, tangent to the y-axis) is correct. The figure (center (3, −5), r = 5, touching the axis at (3, 0)) is correct.
- **inf-w1.** **B is the best answer**: "useful backup" is supported by the replanting sentence, and "cannot keep adapting" by the frozen-in-time sentence. A is reversed, C is too extreme, D goes beyond the text. One wording gap is listed under m6.
- **Trap tags resolve to real entries.** sys-3.1 is "Forgot the constants". circ-1.3 is "Added to one side only". qualifier, reversed and beyond exist in `distractors.ts`.

## Blockers

**B1 — The "Try it first" pause hides the problem (all three lessons).** The pause scene shows only a prompt ("Find $c$.", "Find the value of $k$…", "Predict how the blank ends…"). The equations, answer choices and passage are not on screen while students are told to work it out.
- In inf-w1 the 80-word passage is visible for about 9 s at 1× (shot 0 runs 0.6–9.8 s) before it disappears.
- Evidence: `SS/sys-w1-360-light-shot02.png`, `SS/circ-w1-360-light-shot02.png`, `SS/inf-w1-360-dark-shot02.png`. Source lines: `scene.json:8` in each lesson; `VideoPlayer.tsx:320-327`.
- Why it blocks: a required step of the lesson anatomy cannot be done, so the core lesson flow is broken.
- **Fix:** have the `pause` scene render the problem. Either add `stem`/`passage`/`choices` to the directive, or show the preceding passage scene with the prompt beneath it. Keep the problem visible for the whole countdown. For R&W, also hold the first passage scene until the student taps Continue (or allow at least 30 s of reading).

**B2 — False math in the sys-w1 narration.** `sys/sys-w1/scene.json:27` says: "the two lines are parallel, three units apart."
- The distance between 2x − 4y = 6 and −4x + 8y = 12 (that is, x − 2y = ±3) is 6/√5 ≈ 2.68. Only the vertical gap (the difference in y-intercepts) is 3.
- **Fix:** say "parallel, with y-intercepts negative three halves and three halves" or "three units apart vertically". Then rebuild the audio.

## Majors

- **M1 — The transcript is not a full text alternative (all three).** It lists only the `say` lines. It never states the system, the circle equation, the answer choices, or the R&W passage or choices. "C is the trap" refers to text the transcript never gives.
  - Evidence: Playwright transcript dump for circ-w1 (no equation anywhere); `NarratedLesson.tsx:194-202`.
  - **Fix:** put the problem (stem, passage, choices, written out in readable math) at the top of the transcript, and add short descriptions of the graphs.
- **M2 — Two player buttons have no accessible name at phone width.** Below the `sm` breakpoint, "Captions" and "Transcript" are `hidden` spans, so the buttons have no name. The accessibility tree at 360 px shows `button [pressed]` and `button`. This fails WCAG 4.1.2 (level A), and these are the accessibility controls themselves.
  - Evidence: `NarratedLesson.tsx:175-176`.
  - **Fix:** add `aria-label`, or use `sr-only sm:not-sr-only` instead of `hidden sm:inline`.
- **M3 — The focus ring on the Play overlay is invisible.** `lesson-start` takes focus with a 2 px outline at a 2 px offset. The parent is `overflow-hidden` and the button covers the whole frame, so the outline is clipped. This fails WCAG 2.4.7 (AA).
  - Evidence: `SS/inf-focus-1280.png` (the overlay is focused and no ring shows); `NarratedLesson.tsx:123,138`.
  - **Fix:** use an inset ring on the overlay, such as `focus-visible:ring-4 ring-inset`, or ring the round play disc.
- **M4 — Single-key shortcuts are global and cannot be turned off.** `k` and `c` act anywhere on the page and there is no setting to disable them. This fails WCAG 2.1.4 (level A), which matters for speech-input users.
  - Evidence: `NarratedLesson.tsx:101-112`.
  - **Fix:** only handle the keys when focus is inside the player, or add a shortcuts-off setting.
- **M5 — Screen readers will talk over the narration.** The caption bar (`NarratedLesson.tsx:159`) and the morph box (`VideoPlayer.tsx:305`) have `aria-live="polite"`, so a screen reader reads every line while the voice is reading it too.
  - **Fix:** remove `aria-live` from both. The transcript and the paused DOM already serve screen-reader users.
- **M6 — Lesson state collides with the skill videos.** Resume position and "watched" are keyed by skill (`posKey = stellify-lesson-pos-${video.skill}` and `markWatched(video.skill)`), so sys-w1 shares state with v-sys.
  - Reproduced: with a stored v-sys position of 60, the sys-w1 overlay said "resumes at 1:00".
  - Finishing circ-w1 wrote `{"circ": …}` to `stellify-videos-watched`, so the circ skill video shows as watched.
  - Evidence: `NarratedLesson.tsx:33,122`.
  - **Fix:** key both by the lesson id (`w.id` or `v-<skill>`), with a separate watched store for walkthroughs.
- **M7 — The sys-w1 graphing advice is wrong for the digital SAT.** The narration says "If you have a graphing calculator…" and "graphing only checks a value you already have. It won't find k for you." (`sys-w1/scene.json:27`).
  - Every math question on the digital SAT has the built-in Desmos calculator. A slider on k finds the value at which the lines become parallel and distinct.
  - This app teaches that slider method elsewhere (`src/data/questions/math-adv-2.ts:60`).
  - **Fix:** "Use the built-in graphing calculator: graph both lines with a slider for k and watch them become parallel; then check that they are not the same line."
- **M8 — Math layout and legibility at 360 px.**
  1. Equations wrap in the middle of an expression:
     - sys "Now check the constants": "4x +" / "8y = 12" and "−4x + 8y =" / "−12" (`SS/sys-mont2.png`).
     - circ problem: "x² +" / "y² − 6x…" (`SS/circ-mont1.png`).
     - circ morph: "…=" / "34 − c", and an earlier step ends "−c +" / "34" (`SS/circ-mont2.png`).
  2. The sys problem runs the system and the choices inline in one paragraph ("…A) −4 B) 0 C) 4 D)" / "16"). The test stacks both equations and lists the choices on separate lines (`SS/sys-mont1.png`).
  3. The circ diagram renders at about half the frame width, because the tall square window makes it narrow. Its labels are about 10 px and its axis numbers about 7.6 px on a 360 px screen (`SS/circ-plot-zoom.png`).
  4. Choice notes use `text-xs` (12 px) and passage-mark labels are 11 px. STYLE.md:16 sets 14 px as the minimum.
  - **Fix:**
    - Wrap each equation in a no-break span, or put line breaks only at "and" or between rows.
    - Render the system as a stacked `aligned` block and the choices as a list in the problem scene.
    - Give circ a wider window (for example x from −4 to 10) or let the plot fill the frame height.
    - Raise SVG labels to 16 units and axis numbers to 12 units; set notes and labels to at least 14 px.
- **M9 — inf-w1: the choices appear without the passage.** `inf/inf-w1/scene.json:14` has no `passage` field, so students eliminate choices without the text in view. The SAT shows both together.
  - **Fix:** add `"passage"` to the choices scene; the player already supports it at `VideoPlayer.tsx:224`.
- **M10 — The verifier checks less than its documentation claims.**
  - `verify.py:10` says traps are "tagged with an existing misconception", but only checks that the tag is non-empty. The tags `zzz-9.9` and `nonsense` passed.
  - The stem is never parsed. Changing `8y` to `6y` in the sys stem, or `+10y` to `−10y` in the circ stem, still passed, because the keys and checks are typed by hand.
  - These are not checked at all: the on-screen problem text and choices, the circle and point positions in plots (radius 4 and center (−3, 5) both passed), `lines` rows, choice notes, `versus` cards, and numbers spoken in the narration.
  - Some checks can never fail: `"34 - 34 == 0"` and `"sqrt(34 - 9) == 5 and abs(-5) == 5"` (circ-w1 problem.json).
  - **Fix:**
    - Resolve tags against `TRAP` and `TRAPS`.
    - Store the stem's equations as SymPy-readable source in problem.json, and derive the key and checks by substituting into them.
    - Compare the scene's problem text and choices with problem.json.
    - Check plot circles and points against the derived center and radius.
    - Add the mutation cases above to `test_verify.py`.
- **M11 — Human recordings would land on the wrong lines.** RECORDING-GUIDE.md says transcript lines are "numbered from 000 in order" and that silent pauses are not recorded. But `voice.py:32` numbers recordings by shot index, which includes the countdown shot. Every line after a pause is therefore off by one (in sys-w1, "Read it the way…" is shot 003, not 002). The transcript also shows no numbers at all.
  - **Fix:** number recordings by spoken-line index (skip countdowns) or show the shot numbers in the transcript. Add a test for this.

## Minors
- **m1 — Audio peaks and loudness are outside spec.** True peak is −0.8 dBTP on all three files; DECISIONS 49 says −1.5 dBTP and `build.mjs:47` targets −2. Integrated loudness is −16.9 LUFS against a −16 target. There is no clipping. Fix: measure the encoded MP3 in the build and fail outside −16 ± 0.5 LUFS or above −1.5 dBTP, or target −3 dBTP before encoding.
- **m2 — Pace is fast for dense math.** Speech rate is 158 / 159 / 165 wpm (sys / circ / inf), measured from the manifest cues minus the built-in gaps. inf is above the guide's 140–160. Some lines reach 210–237 wpm, and dense computing lines (circ shot 11) run at about 169. Fix: synthesize walkthroughs at speed about 0.92, or add a 0.8 s pause after each key result.
- **m3 — One step is skipped in sys-w1.** The first morph step jumps straight to 2·8 − k·k = 0 with the note "cross products are equal". Show 2/k = k/8 first (same slope), then cross-multiply.
- **m4 — Crossed-out choices and the answer rely on weak cues.** The strike-through covers only the letter: the KaTeX numbers in "B) 0" and "D) 16" are not struck (`SS/sys-mont3.png`). The correct answer is marked by a green border alone. Fix: put a line through the whole box, or use an "Eliminated" label, and add a check icon with the word "Answer".
- **m5 — The two sys-w1 graph lines differ by colour only.** They are blue and gold, with no labels on the lines. Label each line with its equation (STYLE.md:8).
- **m6 — inf-w1 choice B does not quite match the passage.** The key says "preserve a crop's ability to keep adapting", but the passage says the crop's *wild relatives* adapt. Fix: tighten either the passage or the key, and have an English teacher confirm.
- **m7 — inf-w1 has no check step.** Add a final step that re-reads the full sentence with B in the blank.
- **m8 — The "Read it like the test-writer" scene in inf-w1 shows a paraphrase that looks like the original text.** Use the original wording, or label it "In short".
- **m9 — Unsupported claims about students and difficulty.**
  - sys-w1 `hook` (scene.json:4): "avoid the most common wrong answer". No data exists for an original item. It is in the bundle but not currently rendered.
  - circ-w1 (scene.json:35): "Students complete the squares on the left and forget…"
  - sys-w1 (scene.json:7): "that's what makes it easy to miss".
  - Fix: "A tempting slip is…", "a tempting wrong answer". "Built to be challenging" is fine as a statement of intent; do not add difficulty ratings without data.
- **m10 — The offline message is wrong.** `Videos.tsx:130` says the narration "needs an internet connection the first time". `sw.js` never caches `/videos/`, so every offline visit fails. Fix: say "needs an internet connection".
- **m11 — The lesson never finishes loading offline.** `WalkthroughPage`'s `w.load()` has no catch, and offline the service worker returns app.html for the chunk, so the page stays on "Loading the lesson…". Fix: catch the error and `setFailed(true)`.
- **m12 — The end card is mislabelled.** "Practice this skill" links to `#/learn/<skill>`, the course page. Point it at `/practice/session?mode=skill&skill=…` or relabel it "Open the course".
- **m13 — Some highlight colours contradict STYLE.md.** Red (the "bad" tone) marks "asked", "the value of c" and "the limit", which are not errors. Gold marks "given". STYLE.md:4 reserves red for traps and errors and gold for try-it moments.
- **m14 — Two pilots repeat existing questions.** sys-w1 is nearly the same as bank item `m-sys-08` (right sides 6 and 12, answer −4, trap 4). circ-w1's answer circle is the same circle as in `m-c-circ-01` and `m-circ-n2` (center (3, −5), r = 5). This is not a legal problem, but students will recognise them. Change the numbers.
- **m15 — The build tools are not fully pinned or inventoried.** `requirements.txt` leaves out the transitive pins that matter for licensing and reproducibility: phonemizer 3.6.0 (GPL-3.0+), espeakng-loader 0.2.4 (bundles GPL libespeak-ng), numpy. The model and voice file hashes are not recorded either.
- **m16 — Plot labels for screen readers say nothing.** The plot's `aria-label` is just the scene heading ("Check on a graph"). Describe the graph, for example "Circle centered at (3, −5), radius 5, touching the x-axis at (3, 0)".
- **m17 — Reduced motion forces step-through.** With reduced motion set, the lesson stops after every line, which means about 24 taps. Turn motion off but keep playback continuous by default, and leave step-through as an option.

## Nits
- n1 — circ-w1 commonWrong "34" ("took the radius as 0") is not a plausible student error. Replace it, or drop it.
- n2 — The `build.mjs` header says −1.5 dBTP but the code targets −2. The `types.ts:9` comment still says "read aloud by the browser's voice".
- n3 — The start overlay says "narrated" but not "computer voice". The disclosure sits below the controls; add it to the overlay.
- n4 — inf-w1's pause says "Work it out on paper", which suits math, not a prediction. A stray space appears before "." after a mark label (sys-w1 Read-it scene).

## Scorecard (P = pass, C = concerns: Minor or Major, F = Blocker)

| | A Math | B SAT fidelity | C Pedagogy | D Visual | E Audio | F Access | G Tech | H Legal/privacy | I Claims |
|---|---|---|---|---|---|---|---|---|---|
| sys-w1 | **F** (B2) | C (M7, M8.2, m14) | **F** (B1), m3 | C (M8, m4, m5) | P (m1, m2) | C (M1–M5) | C (M6) | P | C (m9) |
| circ-w1 | P | P (m14) | **F** (B1) | C (M8.1, M8.3) | P (m1) | C (M1–M5) | C (M6) | P | C (m9) |
| inf-w1 | P (teacher to confirm, m6) | C (M9) | **F** (B1), m7 | C (M8.4) | P (165 wpm, m2) | C (M1–M5) | C (M6) | P | P |

**Evidence for what passed**
- **E (audio).** No clipping. The only long silences are the intended pauses (16–21 s) and a 1.75 s tail. Every cue is 23–150 ms ahead of its detected speech onset, which is good sync. Negative numbers are read as "negative" and subtraction as "minus". Lint finds no banned filler words ("easy to miss" is not condescending). Reading level is about grade 4–5 with 7–9 words per sentence. The synthetic voice is disclosed.
- **G (technical).** The audio files are 992 / 874 / 718 KB, inside the budget. Each scene is a lazy chunk of about 4–5 KB, not part of `SHELL`, and `sw.js` skips `/videos/`. The manifests' bytes, sha256, scriptHash, cue counts and durations all match the files. The relative audio path works from the `/aboutme/sat/` sub-path. There is no `autoplay`; play starts from a tap. No console errors. Without `?preview=1` the page shows "not available yet".
- **H (legal and privacy).** The player makes requests to its own origin only, sets no cookies, and stores only convenience settings in localStorage. Kokoro-82M is Apache-2.0 (confirmed today on huggingface.co for hexgrad/Kokoro-82M and onnx-community/Kokoro-82M-v1.0-ONNX). kokoro-onnx is MIT and onnxruntime is MIT. phonemizer and espeak-ng are GPL-3.0 and are used only at build time; the generated audio is output, not a copy of them. The SAT® trademark disclaimer appears on the walkthrough page and in the site footer.

## What I could not verify
- **How the voice sounds.** I cannot listen. That covers pronunciation of "k", "c", "x squared" and "three, negative five", the prosody, and whether 160 wpm feels rushed.
- **Originality against the web.** Web search was not available; only Hugging Face was reachable. I could not check the stems or the seed-bank passage against published SAT or prep material. "The problem is original" is the author's claim, not something I confirmed.
- **Real phones.** I did not test iOS Safari audio unlock, resuming a position before metadata loads on iOS, or how it feels on mid-range Android. Headless Chromium was the only browser.
- **Screen readers.** I did not test with VoiceOver, TalkBack or NVDA. I inspected the accessibility tree only.
- **Motion quality.** I sampled token positions and confirmed that terms glide and do not blink (the 16 and k² tokens swap sides). I did not judge the result as art direction across the whole lesson.
- **Hosting.** I could not check GitHub Pages or Firebase size and bandwidth limits.

## Owner must check
1. **A teacher's listening pass.** Listen to all three lessons on a phone speaker and on earbuds, at 1× and 0.75×. Note mispronunciations, rushed lines and dead air.
2. **A math teacher spot-checks every step** in sys-w1 and circ-w1, including each distractor explanation and the graph captions.
3. **An English teacher confirms the inf-w1 key** (B), the three trap tags, and whether "a crop's ability to keep adapting" is supported (m6).
4. **3–5 real students on their own phones** (both iOS and Android). Watch whether they can use the try-it pause once B1 is fixed, whether they can read the equations and the circle diagram, whether the captions keep up, and whether they reach the end card.
5. **Search the web for originality**: the three stems and the seed-bank passage.
6. **A screen-reader pass** with VoiceOver or TalkBack, after M1–M5 are fixed.
7. **Re-submit to the Critic** after B1 and B2 (and ideally M1–M11) are fixed and the audio is rebuilt. Only then set `criticApproved`.

---

# Gate 1 — loop 2 (2026-11-26)

Re-review of commit `44ee148` ("Gate 1 fixes") on `claude/stellify-animated-lessons`. I checked the artifacts themselves, not the commit message. Evidence is in `/tmp/claude-0/-home-user/8a9046fd-6e66-5327-8568-be364c8db889/scratchpad/critic2/` (written `SS2/` below; it is a scratchpad folder and may be cleared).

## Verdict (loop 2)

| Lesson | Verdict | Why |
|---|---|---|
| sys-w1 | **SHIP** | B1 and B2 are fixed. No Blocker remains. The open Majors and Minors below should be fixed in the next pass. |
| circ-w1 | **NO-SHIP** | **New B3**: on every phone width, the key "add to BOTH sides" step is cut off. At 360 px it reads "… = −c", which is the trap equation. |
| inf-w1 | **SHIP** | B1 is fixed (the reading pause holds until Continue) and M9 is fixed. This still needs the owner's English-teacher check of key B. |

Only `sys-w1` and `inf-w1` may get `criticApproved: true`. I did not edit `approvals.json`. `circ-w1` needs B3 fixed and then a quick re-check (B3 only).

## What I ran
- `verify.py content/lessons`: 3 lessons, 0 problems. `test_verify.py`: 19/19 broken lessons and 12/12 broken scenes caught. `lint.ts`: 0 errors and 0 warnings. `vitest tests/videos.test.ts`: 41/41 pass. `tsc --noEmit`: clean.
- **My own 18 verifier mutations** (`SS2/mut2.py`): 1 caught, 17 missed. Most of the misses are outside the scope the verifier now declares; see M10.
- **Audio.** I measured ebur128 (integrated loudness and true peak) and silencedetect on the encoded MP3s. I checked the manifest bytes, sha256 and duration against the files, and re-ran `dump.ts` to compare script hashes: **0 stale**, so the audio matches the current narration.
- **Playwright** on the built site, served at `/aboutme/sat/` with byte ranges, with no console errors:
  - every shot of all three lessons at 360 px;
  - the morph box measured at 320, 360, 375, 390, 412, 430 and 1280 px;
  - keyboard and focus, the accessibility tree at 360 px, and keys pressed outside the player;
  - the inf pause reached in real time;
  - the full transcript, resume and watched storage, the end card, and reduced motion.

## Prior Blockers and Majors

| # | Status | Evidence |
|---|---|---|
| **B1** problem hidden during try-it-first | **Fixed** | `pause` now carries `stem`/`choices`/`passage` (`VideoPlayer.tsx:320-334`). At 360 px the sys system and A–D are stacked and visible for the whole countdown (`SS2/sys-w1-light-shot02.png`), and circ shows its stem (`SS2/circ-w1-light-shot02.png`). inf shows the full passage and `hold: true`. I let playback reach the pause in real time: the audio paused at 17.96 s and was still paused at 17.96 s 6 s later. The button reads "Continue", and pressing it moved on to the next scene (39.7 s, "Mark what the text says…"). `verify.py` enforces that the pause shows the stem, choices and passage. |
| **B2** "three units apart" | **Fixed** | `sys-w1/scene.json` now says "their y-intercepts three units apart". The alt text says "three units apart up and down". Both are true (the intercepts are −3/2 and 3/2). The audio was rebuilt (hash matches). |
| M1 transcript not a text alternative | **Fixed** | The transcript writes out each scene's problem, choices (with "(the answer)" and the notes), steps, rows, graph descriptions and recap (`NarratedLesson.tsx:224-240`). The blank is `aria-label="blank"`. Small leftover: the "On screen" box is 13 px with an 11 px label (STYLE minimum is 14 px). |
| M2 unnamed buttons at 360 px | **Fixed** | Accessibility tree: `button "Captions" [pressed]`, `button "Transcript"`, `button "Step-through: …"`, `combobox "Speed"`. |
| M3 invisible focus on Play overlay | **Fixed** | 4 px inset brand ring (`SS2/inf-focus-360.png`). |
| M4 global single-key shortcuts | **Fixed** | Keys work only when focus is inside the player (`NarratedLesson.tsx:109`). Pressing `k` with focus outside did nothing. |
| M5 live regions talking over the voice | **Fixed** | No `aria-live` on the caption bar or the morph box. (The old browser-voice `VideoPlayer` caption still has `aria-live`, line 149. That is outside these lessons.) |
| M6 state shared with skill videos | **Fixed** | The position key is `stellify-lesson-pos-<lesson id>`. A seeded `pos-sys` / `pos-v-sys` = 60 did not appear on sys-w1 ("2:49 · narrated, with captions"). After finishing sys-w1, `stellify-videos-watched` stayed null. |
| M7 graphing advice | **Fixed** | "On the test you have Desmos built in. Type both equations with a slider for k…" This is correct. |
| M8 math layout at 360 px | **Partially fixed. The morph change caused B3.** | (1) Mid-expression wraps **remain** in the same places I cited before: circ problem and pause "x² + y² −" / "6x + 10y + c = 0" (`SS2/circ-w1-light-shot00.png`, `shot02`); sys "Now check the constants" "4x +" / "8y = 12" and the note "−4x + 8y =" / "−12" (`SS2/sys-w1-light-shot16.png`); circ "Earlier steps" "…= −c +" / "34" (`shot12`). The morph box was made `nowrap`, and that now clips it (B3). (2) The system is stacked and the pause lists the choices, but the sys hook still shows "A) −4 B) 0 C) 4 D) 16" on one line. (3) The circle diagram is wider and its labels are now 15 and 12 units (about 11 and 9 px on a phone). That is better but still under 14 px. (4) Notes and mark labels are now 14 px. |
| M9 inf choices without the passage | **Fixed** | `SS2/inf-w1-light-shot14.png`. |
| M10 verifier weaker than claimed | **Partially fixed** (the rest is now a Minor) | **Now checked:** tags against the live lists (a vitest keeps `misconceptions.json` equal to `TRAP`/`TRAPS`); the stem parsed with `parse_latex` and the key derived from it; morph steps shown on screen; graph lines checked against both their `check` and the stem at the key; the drawn circle and marked points; the hook, pause and choices scenes checked against problem.json. **Still passes when broken (my mutations):** a wrong equation in a `lines` row ("= −10"); a wrong hook choice ("D) 8"); equations changed in the "Read it like the test-writer" scenes; wrong math in choice notes, morph notes and versus cards ("c = 25"); plot point and segment labels ("center (3, 5)", "r = 4") and the radius segment drawn to (3, 2); the circ stem changed to "tangent to the y-axis" (the `derive.type` is typed by hand, so the key stays 9); inf `hold` removed. The docstring is now honest about narration and wording. `docs/LESSON-PIPELINE.md:24` still says "20 broken lessons". |
| M11 recording numbers off by one | **Fixed** | `voice.py:28-34` counts spoken lines only, and the transcript shows `000 · 0:00 …` with the same count. For sys, "Read it the way…" is 002 in both. There is no test for this yet, and the `voice.py:16` comment still says "shot number". |

## New Blocker

**B3 — circ-w1: the "add to BOTH sides" step is cut off on every phone, and at 360 px it shows the trap.** The morph box (`VideoPlayer.tsx:305`) is now `flex-nowrap … justify-center overflow-x-auto`. Step 2, `(x² − 6x + 9) + (y² + 10y + 25) = −c + 34`, is 365 px wide in a 300 px box at 360 px. It also overflows at 375 (372 > 315), 390 (380 > 330), 412 (391 > 352) and 430 (400 > 370). At 320 px step 3 also overflows. At 1280 px it fits.
- Because the content is `justify-center`ed, the left overflow is negative. The opening "(x² −" cannot be scrolled into view at all. At rest, the right end "+ 34" is cut off.
- At 360 px the box reads "6x + 9) + (y² + 10y + 25) = −c" (`SS2/circ-360-morph-clipped.png`). At 390 px it reads "… = −c +" (`SS2/circ-390-morph-default.png`).
- That is the trap equation, shown while the note says "Add 9 and 25 to BOTH sides" and the voice says "add both to each side". The scroll region is also not keyboard-focusable.
- This breaks the lesson's main step on the main device, and it breaks STYLE.md's "nothing may cause sideways scrolling".
- **Fix:**
  - Make the morph equation fit instead of scroll. Either use a smaller step size below `sm` (`text-base`, or `font-size: clamp(14px, 4.2vw, 24px)`), or measure the row and scale it down to the box width.
  - Use `justify-content: safe center`, so any overflow can never be unreachable.
  - Or split circ step 2 into two rows: x-part and y-part, then `= −c + 34`.
  - Add an e2e assertion: for every shot of every walkthrough at 360 px, `morph-step.scrollWidth <= clientWidth`.

## Other open items (Minors and Nits)

- **m1 (audio): peak fixed, loudness drifted.** True peak is now −2.3, −2.0 and −2.0 dBTP, under −1.5. Integrated loudness is **−17.4, −17.4 and −17.8 LUFS** (loop 1 measured −16.9), against the documented −16. The skill videos match (v-circ is −17.5), so the library is consistent, just quiet. The cause is probably the `alimiter=limit=0.66` stage (about −3.6 dBFS). Fix: raise the limit, then re-normalise, and have the build also fail outside −16 ± 1 LU.
- **M8 leftovers** (wraps, sys hook choices inline, diagram text about 11 / 9 px). Wrap each inline math span as nowrap (`.katex { white-space: nowrap }` inside lesson scenes). Put the hook choices on separate lines.
- **M10 leftovers.** Check `lines` rows and all `$…$` in passage, notes and versus scenes against the stem at the key (substitute and evaluate the equations). Derive tangency (x- or y-axis) from the stem text, or assert it. Check plot labels and segment endpoints. Have vitest assert `hold` on R&W pauses. Update the "20 broken lessons" doc line.
- **m-new-1 — 15 s for a hard math try.** The math pauses run 15 s, with no hint that Pause keeps the problem up. Use `hold: true` for math as well, or say "Pause if you need longer". Also, pressing Play while the inf pause is holding just re-holds; make Play act as Continue there.
- **m-new-2 — inf choices scene passage is 14 px on phones** (`text-sm`). STYLE says passages are 16 px.
- **m-new-3 — offline load still hangs.** The `Videos.tsx:130` failure text was improved, but `w.load()` still has no `catch` (m11 is open), so offline the page stays on "Loading the lesson…".
- **m12 — end card is still mislabelled, now more so.** The button reads "Open this skill's practice set" but goes to `#/learn/sys`, the course page. Use `/practice/session?mode=skill&skill=<skill>&n=8`, which the skill page already uses.
- **m9 — claims mostly fixed.** circ's "Students complete…" and the sys hook claim are gone. sys line 1 still says "that's what makes it easy to miss". `problem.json` `trap.why` says "Students make the slopes match…", but it is not rendered. Suggest "It looks routine. That's the danger."
- **m6 — fixed.** B now reads "a useful backup that cannot, on its own, keep pace with the adapting that happens in the field". The passage supports both halves.
- **Still open, not claimed fixed:**
  - m3: the 2/k = k/8 step.
  - m4: the strike-through misses the KaTeX numbers, and the answer is marked by colour and border only.
  - m5: the sys lines are unlabelled.
  - m7: no inf check step.
  - m8: the inf paraphrase is not labelled "In short".
  - m13: tone colours.
  - m14: near-duplicates m-sys-08 and the (3, −5) r = 5 circle.
  - m15: phonemizer, espeakng-loader and numpy unpinned; no model hashes.
  - m16: fixed through `alt`.
  - m17: reduced motion still stops after every line.
  - n1: the "34" commonWrong.
  - n2: the `types.ts:9` comment.
  - n3: no "computer voice" on the overlay.
- **Nits.**
  - STYLE.md "Phones" still quotes 13 and 10 unit labels and 20 px steps; the code uses 15 / 12 units and 18 px.
  - `+(y²` has no space before the parenthesis (the morph token begins with "+").
  - The "center (3, −5)" label and the "−8" axis number are crossed by the circle stroke.
  - A `__pycache__/verify.cpython-313.pyc` was committed; add it to .gitignore.

## Scorecard (loop 2)

| | A Math | B SAT fidelity | C Pedagogy | D Visual | E Audio | F Access | G Tech | H Legal/privacy | I Claims |
|---|---|---|---|---|---|---|---|---|---|
| sys-w1 | P | C (hook choices inline, m14) | P (m3, m-new-1) | C (M8 wraps, m4, m5) | P (m1 loudness) | P (minor leftovers) | P (m11, m12) | P | C (m9 one line) |
| circ-w1 | P | P (m14) | **F** (B3) | **F** (B3) | P (m1) | C (B3: scroll region not focusable) | P | P | P |
| inf-w1 | P (teacher to confirm) | P | P (m7, m8) | C (14 px passage) | P (m1) | P | P | P | P |

## What I could not verify
- How the voice sounds (prosody, pronunciation, pace), as in loop 1.
- Originality against the web.
- Real iOS and Android devices, and real screen readers.
- Dark mode this loop: emulating `prefers-color-scheme: dark` rendered the light theme, because the app's theme appears to be its own toggle.
- The Playwright e2e suite (`e2e/web.spec.ts`). I did not run it. I reproduced its steps by hand instead.

## Owner must check
1. Fix B3 and re-submit circ-w1. I will re-check only B3 and the 360 px morph assertion.
2. An English teacher confirms inf-w1 key B and the A/C/D tags before setting `criticApproved` for inf-w1.
3. A listening pass on a phone (all three lessons), as in loop 1. Note the level is about 1.5 LU below target.
4. Set `criticApproved: true` for **sys-w1** and **inf-w1** only, after item 2 for inf.
5. Plan the M10 leftovers before any batch of new lessons. For these three lessons I checked by hand all the on-screen math the verifier does not check.

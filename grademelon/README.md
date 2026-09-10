# 🍉 Grade Melon — MCPS grade calculator

A single-file web app that takes a copy-and-paste of a StudentVUE / Synergy gradebook
and calculates the grade the way MCPS does.

Open `index.html` in a browser — there is no build step, no dependencies, and no server.
Published on GitHub Pages at `/grademelon/`.

## How grades are calculated

This matches `utils/grades.ts` in the original Grade Melon (`tinuh/grade-melon`) — same cut-offs,
same category re-normalisation, same GPA rule.

Categories are weighted, and each is scored on its own points before they are combined:

```
Practice / Preparation   =  PP points earned ÷ PP points possible   → weight 10%
All Tasks / Assessments  =  AT points earned ÷ AT points possible   → weight 90%

Marking period grade = (PP% × 10 + AT% × 90) ÷ 100
```

* A category with no graded points drops out and the remaining weights are re-scaled,
  exactly the way Synergy does it (all AT and no PP means AT carries 100% of the grade).
* Category weights are editable per class, and extra categories can be added for courses
  that count something else — a state test, a county final, a lab grade.
* Grading scale: **A** 89.5+, **B** 79.5+, **C** 69.5+, **D** 59.5+, **E** below 59.5.
* Semester grade: quality points (A=4 … E=0) from the two marking periods are averaged and
  a tie rounds **up** — which reproduces the MCPS semester chart exactly (A+C=B, B+E=C, A+D=B…).

## What it does

* **Gradebook of every class.** Add as many classes as you like; each keeps its own assignments,
  category weights, marking period and grade. Card view or table view, per the original.
* **Paste one class or all of them.** Press Ctrl/⌘+V anywhere. If the paste contains several
  courses, they are split into separate classes with their names and periods picked out.
* **Per-class grade** with a ring, a trend chart, category donuts and a sparkline on its card.
* **GPA across all classes**, weighted and unweighted, with a per-course *Weighted?* toggle that is
  auto-ticked from AP / IB / Honors / Magnet in the name — the same rule the original uses.
* **Target optimiser** — enter the points still to come in each category and it solves for the
  lowest score you can average on all of it and still land the grade you want.
* **What-ifs** — type a score, drag the slider on any row, add an assignment that does not exist
  yet, or fill in everything ungraded at once. *Reset* puts your real grades back.
* **Impact** per assignment, **undo** on delete, search and sort, semester calculator and
  state-test blend.

## Look & feel

* **10 themes** (Watermelon, Midnight, Sunset, Ocean, Grape, Matcha, Candy, Ember, Mint, Slate)
  plus **any custom accent colour** — the whole app re-tints around it, neutrals included, because
  every surface token is a `color-mix` of the accent.
* Light / dark / auto, independent of the theme.
* Graphics are all hand-drawn — SVG, Canvas and CSS, no chart or animation library — so it works
  offline and inside a strict CSP: animated grade ring with the letter cut-offs notched on, trend
  chart over A/B/C/D/E bands with a crosshair tooltip, category donuts, per-card sparklines, a
  shared-element (FLIP) transition from card to class, staggered entrances, and a watermelon-seed
  confetti burst when a letter grade goes up. All of it honours `prefers-reduced-motion`.

### Grade colours

A–E are the app's main colour code, so the five were re-stepped until they passed a
colour-vision-deficiency check (adjacent-pair ΔE, normal-vision floor, lightness band, chroma floor
and contrast, in both themes). The obvious green/blue/amber/orange/red set fails badly — amber,
orange and red collapse into one colour for deuteranopes. The set in use is
`#15803d #2563eb #a16207 #c026d3 #9f1239` on light and `#19a855 #3b82f6 #bd8c0c #d946ef #fb4a68`
on dark. **Look & feel → Classic grade colours** switches back to the StudentVUE set if you prefer
it. Colour is never the only signal: the letter is printed everywhere it is used.

## Privacy

Everything lives in `localStorage` in the browser. Nothing is uploaded, there is no account,
and the app never asks for a StudentVUE login — it only reads what you paste in.

## Tests

`tests/` is a headless-browser suite covering the parser, the MCPS math (cutoffs, the semester
chart, weighted categories, empty-category re-scaling), and the UI flows.

```
npm i playwright-core
node tests/run.js
```

---

Unofficial. Not affiliated with, endorsed by, or connected to Montgomery County Public Schools
or Synergy/StudentVUE. The official grade is the one in StudentVUE.

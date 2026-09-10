# 🍉 Grade Melon — MCPS grade calculator

A single-file web app that takes a copy-and-paste of a StudentVUE / Synergy gradebook
and calculates the grade the way MCPS does.

Open `index.html` in a browser — there is no build step, no dependencies, and no server.
Published on GitHub Pages at `/grademelon/`.

## How grades are calculated

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

## Features

* **Paste anywhere** — press Ctrl/⌘+V on the page and it imports. The parser anchors on the
  `Category | N points` line, so menus, week headers and other junk are ignored. Handles ungraded
  work, `Not Graded`, `Missing`, `Excused`, `17 / 20` scores, extra credit (0 points possible), `pts`.
* **Drag a score** — every row has a slider; the grade, the ring, the donuts, the trend line and
  each assignment's impact all move as you drag.
* **What-if assignments**, **fill-ungraded**, and one-tap **Reset** back to your real grades.
* **Impact** — how much each assignment is moving the grade right now.
* **What do I need?** — the minimum score on an upcoming assignment to reach a target.
* **Undo** on delete (toast button or Ctrl/⌘+Z).
* **Multiple classes** with an overview grid, semester calculator, state-test/final blend, and
  GPA (weighted and unweighted).
* Dark mode that follows the OS until you pick a side, works offline, responsive to phone width,
  export/restore backup.

## Graphics

All drawn in-page — SVG, Canvas and CSS, no chart or animation library, so it works offline and
inside a strict CSP.

* **Grade ring** — SVG arc with the letter cut-offs notched onto it, animated on change.
* **Trend chart** — hand-drawn SVG of your grade after each assignment, over A/B/C/D/E bands with
  the cut-off values (89.5, 79.5, …) down the left and the letters on the right. Crosshair and
  tooltip on hover; the current grade is labelled directly on the last point.
* **Category donuts**, staggered row entry, spring buttons, an animated tick, an aurora backdrop,
  and a watermelon-seed confetti burst when your letter grade goes up.
* Everything respects `prefers-reduced-motion`.

### Grade colours

A–E are the app's main colour code, so the five were re-stepped until they passed a
colour-vision-deficiency check (adjacent-pair ΔE, normal-vision floor, lightness band, chroma
floor and contrast, in both themes). The obvious green/blue/amber/orange/red set fails badly —
amber, orange and red collapse into one colour for deuteranopes. The set in use is
`#15803d #2563eb #a16207 #c026d3 #9f1239` on light and `#19a855 #3b82f6 #bd8c0c #d946ef #fb4a68`
on dark. Colour is never the only signal: the letter is printed everywhere it is used.

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

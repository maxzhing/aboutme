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

* **Paste import** — anchors on the `Category | N points` line, so menus, week headers and
  other junk in the copied text are ignored. Handles ungraded assignments, `Not Graded`,
  `Missing`, `Excused`, `17 / 20` scores, extra credit (0 points possible), and `pts`.
* **Live editing** — change any score and the grade, category bars and per-assignment impact
  update as you type. Edited assignments get an `EDITED` tag and a ↺ to restore the real score.
* **What-if assignments** — add hypothetical assignments; *Clear what-ifs* undoes all of it.
* **Impact column** — how much each assignment is moving the grade right now.
* **What do I need?** — the minimum score on an upcoming assignment to reach a target grade.
* **Fill ungraded** — assume a score on everything not graded yet.
* **Multiple classes**, semester calculator, state-test/final blend, and GPA (weighted and unweighted).
* Dark mode, works offline, responsive down to phone width, export/restore backup.

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

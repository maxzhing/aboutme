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

It does not stop at calculating a grade — it tells you what the grade means and what to do about it.

**Dashboard**
* **At a glance** — a plain-language verdict, weighted and unweighted GPA, and your letter tally.
* **What matters most right now** — your classes ranked by how much your time can actually move them,
  not by which is lowest. Each row says why it is there, with the numbers behind it.
* **Goal mode** — maximise GPA, get all A's, raise my lowest, protect my A's, or just understand.
  The ranking re-orders to match.
* **Study plan** — say how long you have and it splits the time across the classes where it counts.
* **Filter chips** — needs attention, close to next, A's, below 90%, trending down, what-if active.

**Every class gets a status**, judged on where it is actually heading rather than the worst thing
imaginable: **Safe**, **Close**, **At risk** (your recent scoring, projected onto the work left,
drops the letter), or **Locked in** (no remaining work can change the letter). The label is a word,
never colour alone.

**Class page**
* **What this means** — insights generated from the gradebook. Every one carries the number it is
  based on; none of it is motivational filler.
* **What if…** — one slider for "if I average X% on everything still ungraded", showing
  `94.15% A → 60.65% D` and a plain verdict, plus one-tap 100 / 90 / 80 / 70 / zero.
* **What is still in play** — ungraded work ranked by how far it can swing the grade, showing the
  upside of a 100 and the cost of a 0 side by side.
* **Target solver** across all categories at once, which tells you the required average — or says
  plainly that the goal is unreachable and names your real ceiling instead.
* **How is this calculated?** folded away until you ask.

**Ask anything** — a command bar (`/` to focus) that answers from your own gradebook:
*what should I study*, *how close am I to an A in bio*, *what do I need for an A*, *which assignment
matters most*, *why did my grade drop*, *classes below 90*, *what if I get 100 on everything*. It is
rules-based, not a language model — it never invents a number, and when the data cannot answer it
says so.

**Import** reports what it recognised — classes, assignments, the resulting grade — and flags
ungraded, missing, excused, duplicate and un-weighted categories rather than failing silently. When a
paste changes a grade it names the single assignment most responsible. **Check my data** audits for
weights that do not add up, duplicates and impossible scores.

**Also:** multiple classes with edit and delete from anywhere, undo on every deletion, multi-class
paste, semester calculator, GPA planning ("what if I get all A's"), a printable grade report,
export/restore, 10 themes plus a custom accent, and light/dark/auto.

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

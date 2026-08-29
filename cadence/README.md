# Cadence

A calendar, task manager, notebook and planning assistant that behave as one
system rather than six apps sharing a sidebar.

Open `cadence/index.html` in a browser. There is no build step and no server —
it is plain HTML, CSS and JavaScript. Everything is stored in `localStorage` on
the device; nothing is sent anywhere.

**`cadence.html` is the whole app in one file** (~650 KB) — every stylesheet and
script inlined, nothing external to load. Use it to email the app to someone,
drop it on a USB stick, or host it as a single static file. Regenerate it after
any change with `node build-single-file.mjs`; it reads the load order out of
`index.html`, so it can't drift from the real app.

## What it does

The app is organised around seven concepts that are deliberately kept distinct:

| Concept  | Means |
|----------|-------|
| Event    | Something happening at a specific time |
| Task     | Something that needs to be completed |
| Deadline | The point by which something must be done |
| Note     | Information worth keeping |
| Project  | A collection of related work |
| Goal     | A long-term outcome |
| Habit    | Something repeated on a rhythm |

### Calendar
Day, 3-day, week, work week, month, year, agenda and timeline views. Click a
slot to create, drag to move, drag an edge to resize. Editing a repeating event
asks whether you mean this occurrence, this and future, or the whole series.
Working hours are shaded, conflicts are marked, and travel time blocks the
minutes either side of an event that has a location.

### From a messy thought to a scheduled action
- **Quick add** (`C`) parses plain language — "study biology tomorrow from 4-6",
  "practice piano for 45 minutes every weekday" — and shows what it understood
  before saving anything.
- **Organize this** takes a paragraph ("Math test Friday, need to buy poster
  board, meeting with Sarah Wednesday at 4, science project due next month")
  and sorts it into deadlines, tasks, events and projects for you to approve.
- **Quick capture** takes a raw thought with no fields to fill in; the inbox
  holds it until you want to deal with it.

### Planning
- **Plan my day / week** proposes a schedule from your tasks, deadlines,
  priorities and free time, explains why each block is there, and stops before
  the day is full — it protects a floor of unscheduled time you set.
- **Find time** ranks candidate slots for a block of work and never books one
  without you picking it.
- **What should I do now?** looks at the gap before your next commitment and
  recommends one thing, with its reasoning shown.
- **Focus mode** is a timer, the current task, and a way out.
- Missing something opens a recovery sheet — do it today, move it, break it into
  steps, or drop it — rather than a scolding.

### Everything else
Universal fuzzy search, a ⌘K command palette, weekly and monthly reviews,
insights that describe your time without grading it, habit streaks that a single
missed day cannot break, undo on every destructive action, and a full keyboard
map (press `?`).

## Layout

```
index.html          loads everything in order
css/
  base.css          tokens, themes, reset, accessibility
  layout.css        app shell, sidebar, top bar, mobile nav
  components.css    buttons, forms, dialogs, toasts, charts
  calendar.css      time grid, month, year, agenda, timeline
  views.css         per-page styling, focus mode, assistant flows
  design.css        the visual layer: palette, type, elevation, motion
js/core/
  time.js           wall-clock/UTC conversion, formatting, timezone support
  model.js          entity definitions and defaults
  store.js          state, persistence, undo, change notification
  recurrence.js     series expansion, this/future/all edits, habit streaks
  query.js          derived reads every view uses
  actions.js        every mutation, each one undoable
  nlp.js            natural language parsing and brain-dump splitting
  scheduler.js      free time, ranking, planning, suggestions, reviews
  search.js         the universal index
  seed.js           realistic sample data
js/ui/              DOM helpers, dialogs, form controls, drag, editors,
                    quick add, assistant flows, focus mode, command palette
js/views/           one file per page
js/app.js           routing, navigation, keyboard, theming, reminders
```

## The look

The visual layer lives entirely in `css/design.css`, on top of the functional
stylesheets. It changes how the app looks and never what it does, so it can be
removed or replaced without touching behaviour.

It is built from the [UI/UX Pro Max](https://www.npmjs.com/package/uipro-cli)
design library:

| Choice | From the library | Why |
|---|---|---|
| Style | Soft UI Evolution × Dimensional Layering × Micro-interactions | Depth and feedback without the contrast cost of true neumorphism |
| Palette | Productivity Tool — teal focus, amber for attention | One brand hue; amber reserved for deadlines and over-scheduling |
| Type | Friendly SaaS — Plus Jakarta Sans, plus JetBrains Mono | Geometric and legible at 11px; a mono for keys and counts |

Four things it holds to:

- **The palette was measured, not assumed.** The library's teal fails WCAG AA
  as a button fill, so it is darkened until white on it reaches 5.9:1 and the
  accent as text on its own wash reaches 4.6:1. Every text/background pair the
  app renders across eight pages and both themes passes AA.
- **Motion is decoration on a state the app already reaches**, so
  `prefers-reduced-motion` removes it and loses nothing.
- **The ambient wash stays behind the shell.** A gradient crossing seven day
  columns would make identical columns look unequal, so the calendar sits on a
  flat surface.
- **The web fonts are a `<link>`, not an `@import`.** Both stacks fall back to
  system fonts, so the app is unchanged offline and in the single file.

## Principles held throughout

- **Nothing important is assumed silently.** Anything inferred is shown before
  it is saved, and marked as an assumption.
- **Every suggestion explains itself** and can be dismissed.
- **Nothing schedules itself.** The app proposes; you accept.
- **Colour is never the only signal** — every state also has a label or an icon.
- **The planner refuses to fill your day.**

# Outreach Bench

A working board of **15,000 outreach opportunities** for a FIRST robotics team's
outreach lead. Pick your area, tap what you're after, and every card gives you a **real date**, a
**real link**, the **exact steps to apply**, and a pre-written email.

Open `index.html` in a browser. No build step, no dependencies, no server.

## Every link goes somewhere real

There are **no search-engine links anywhere on this board**. Each card links to
one of two things, and says which on its face:

| Kind | Count | What the link is |
|---|---:|---|
| **The organisation itself** | 1,830 | Its own website. 41 national programmes, 1,084 dated-event slots, and 705 slots across 141 universities. |
| **Official directory** | 13,170 | The government or trade-body page whose entire job is to hand you the local contact — NCES school search, HUD's housing authority list, Feeding America's food bank locator, FIRST's team and event search, and 35 more. |

## Dates are computed, not typed in

45 recurring events are stored as **rules**, and the page resolves each one
against the real calendar when it loads. So they are right every year, and the
rule is printed on the card so you can check it rather than trust it:

| Event | Rule | Resolves to |
|---|---|---|
| Engineers Week | Sunday–Saturday week containing 22 February | 21–27 Feb 2027 |
| Introduce a Girl to Engineering Day | the Thursday of that week | 25 Feb 2027 |
| National Robotics Week | first full week of April | 4–10 Apr 2027 |
| Giving Tuesday | 5 days after the fourth Thursday of November | 1 Dec 2026 |
| FIRST Kickoff | first Saturday of January | 2 Jan 2027 |
| Computer Science Education Week | week containing 9 December | 6–12 Dec 2026 |

Everything else shows its real season window. **Every card then computes an
"ask them by" date**, working back from the start by that venue's real lead time,
so the board can be sorted by what is actually urgent rather than by what is soon.

## Exactly how to apply

Every card carries a procedure written for its venue type — 44 of them, 220 steps
in total. Each gives the ordered steps, **what they will ask you for**, **how long
a reply takes**, and **what usually kills the booking** (insurance left to the last
week for museums; contacting camps in spring when the summer is already printed;
emailing a professor instead of the outreach office).

203 distinct destination domains in total.

### Where the data came from, and what it is not

- **University URLs** are taken from the public
  [`Hipo/university-domains-list`](https://github.com/Hipo/university-domains-list)
  dataset of real institutions. Their **cities and states are hand-checked**, not
  inferred — name-matching universities to cities was tried and rejected because
  it produced real errors (it put *St. Johns River State College*, which is in
  Florida, in State College, Pennsylvania). Only universities whose location is
  known confidently are included, which is why there are 141 and not 2,348.
- **Directory URLs** are recorded from knowledge of the organisations. They are
  chosen as top-level pages rather than deep paths, because deep paths rot.
- **US federal directories are scoped to US metros.** A Calgary card never links
  to NCES; non-US metros only use the worldwide directories in `finders.GLOBAL`.
- **Nothing here was fetched to confirm it still resolves** — this project was
  built in a sandbox whose network egress is limited to GitHub. Links are
  believed-real, not verified-live. If one has moved, fix it in `finders.py` or
  `sources/universities.json` and rerun the build.
- **Hours, reach and impact are planning estimates**, not measurements. Replace
  them with your real numbers as you go; those are the numbers a judge asks about.
- **No card holds a date for you.** Confirm before you promise anything.

## Using it

1. **Where are you?** Country → state → metro. National programmes stay visible
   at every level, because they run everywhere.
2. **What are you after?** One tap sets several filters: one afternoon, biggest
   impact, costs nothing, elementary kids, right now this season, can do
   remotely, deadline within 60 days, has a fixed date, straight to the
   organisation. Sort by deadline soonest, happening soonest, or by area.
3. **Ask Claude** to find more, grouped by area, each with a link, a recurrence
   rule and its own application steps. If Claude isn't sure a website is real it
   returns null and picks a directory from the registry instead, so an AI result
   never carries an invented URL.

Track each card saved → contacted → confirmed → done; the ribbon totals your
outreach hours and people reached. Export the pipeline as CSV.

## Files

```
vocab.py            223 metros, 44 venue types, 50 activities
calendar.py         45 recurring events stored as date rules
howto.py            44 application procedures, 220 steps
verified.py         41 national programmes, hand-written, with real URLs
finders.py          the directory registry: US directories + a GLOBAL set
sources/            universities.json — real URLs from the public dataset
build.py            composes the dataset and inlines it into the page
opportunities.json  the generated dataset
template.html       the app, with a /*__DATA__*/null placeholder
index.html          BUILT — standalone page
artifact.html       BUILT — fragment for publishing on claude.ai
```

Edit `template.html`, never `index.html` or `artifact.html` — those are
overwritten. Rerun after any change:

```sh
python3 build.py
```

## Storage

Your area, pipeline, logged hours and team profile live in `localStorage` in that
one browser. Nothing is uploaded.

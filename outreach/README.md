# Outreach Bench

A working board of **1,000 outreach opportunities** for a FIRST robotics team's
outreach lead: filter by region, season, audience, effort and activity type;
track each one from saved → contacted → confirmed → done; export the pipeline as
CSV; and ask Claude for suggestions tailored to your city and calendar.

Open `index.html` in a browser. No build step, no dependencies, no server.

## The two tiers, and why they exist

Nobody can produce 1,000 *verified* listings with live application links and real
deadlines. Inventing them would mean emailing dead addresses and missing real
dates, so the dataset is explicitly split and every row is labelled:

| Tier | Count | What it is | The apply button does |
|---|---:|---|---|
| **Verified** | 41 | A real, nationally operating organization or program, with its real website and its real recurring calendar. | Opens the organization's own site. |
| **Lead** | 959 | A real activity paired with a real category of venue in a real metro area — a prospect to work, not a booking that exists. | Runs a live search that finds the actual local contact. |

**No row contains a fabricated address, phone number, email, staff name or URL.**
Where a contact is needed and not known, the page hands you a search query instead
of a made-up link. Hours, reach and impact are planning estimates, not
measurements — replace them with your real numbers as you go, because those are
the numbers a judge will ask you about.

## What's in the box

```
vocab.py            126 metro areas, 44 venue types, 31 activities a team can run
verified.py         41 real organizations, hand-written, with notes on how each one works
build.py            composes the dataset and inlines it into the page
opportunities.json  the generated dataset, readable and reusable
template.html       the app, with a /*__DATA__*/null placeholder for the dataset
index.html          BUILT — standalone page for a browser or GitHub Pages
artifact.html       BUILT — same page as a fragment, for publishing on claude.ai
```

Regenerate after editing `vocab.py`, `verified.py` or `template.html`:

```sh
python3 build.py
```

Edit `template.html`, never `index.html` or `artifact.html` — those are overwritten.

## Adding your own opportunities

Real ones you've confirmed go in `verified.py` as a tuple following the shape
documented at the top of that file. New activities or venue types go in
`vocab.py`; because leads are composed from the cross product, adding one
activity with eight compatible venue types adds hundreds of prospects. Then
rerun `build.py`.

## The AI panel

Three modes, powered by the artifact runtime's `sample` capability:

- **Find opportunities near me** — describe your team, city and constraints; get
  structured suggestions you can add straight onto the board.
- **Write my outreach email** — rewrites the generated email for a specific
  opportunity, streaming as it goes.
- **Plan my season** — turns your saved pipeline into a month-by-month plan
  keyed to the FIRST calendar, including what to drop.

Claude **does not browse the web** here; it answers from what it knows. Its
suggestions land on the board tagged `ai lead` and are prompted never to invent
contact details — they carry a search query instead. Treat every one as a lead to
confirm.

Outside claude.ai the panel disables itself with an explanation; everything else
on the page works offline.

## Storage

Your pipeline, logged hours and team profile live in `localStorage` in that one
browser. Nothing is uploaded. Export the CSV if you want it anywhere else.

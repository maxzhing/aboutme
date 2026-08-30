# Grant Match Engine

An AI grant research analyst. It searches live funding sources, reads the
funders' own pages, and works out which grants an applicant is genuinely
eligible for — showing the evidence behind every claim, and the reason behind
every rejection.

It is built around one rule: **a fact reaches the user only if the words
supporting it are literally present on a page we downloaded.** Everything else
follows from that.

```bash
npm start          # http://localhost:8787 — the real thing, searches live sources
npm test           # 162 tests, no network or API keys required
npm run build      # dist/grant-match-engine.html — one file, opens from disk
```

## Two builds

**The engine server** (`npm start`) is the product: it searches live sources,
reads funder pages, and verifies what it finds.

**The single file** (`npm run build`) is a demonstration you can open by
double-clicking. It runs the *same* analysis engine in your browser — quote
grounding, requirement inference, the eligibility gate, the eight-factor score,
the quality filter, source confidence — but it cannot search the internet: a page
opened from a file has no API keys and cannot fetch funder sites across origins.
Its opportunities come from a bundled set of **fictional** funders on
`.demo.invalid` domains, which can never resolve. The file says so in a banner
that is part of the document, and the alerts feature reports itself unavailable
rather than pretending to work. The analysis is genuine; the opportunities are not.

---

## What makes this different from a grant search box

**Eligibility is a gate, not a ranking signal.** A grant can be a 98% topical
match and still score **0 overall** if the applicant fails a mandatory
requirement. The interface shows both numbers side by side so the contradiction
is visible rather than averaged away.

**Nothing is filled in.** Every fact on a grant record is a *field with
provenance* — read from an official API, backed by a verbatim quote, computed by
our own code from verified inputs, or explicitly absent. There is no default
value anywhere in the system. "We don't know" is a first-class answer.

**Fabricated evidence is destroyed, not flagged.** When a model reads a funder
page it must point at the span supporting each fact. Those quotes are re-checked
against the text actually downloaded. A quote that isn't found doesn't lower a
score — the fact is deleted and the value becomes unreadable to every downstream
consumer. A source that fabricates more than a third of its quotes is dropped
entirely.

**Rejections are auditable.** Every excluded opportunity is shown with the rule
it failed and the funder's own sentence stating that rule.

---

## The example from the brief

> *"I'm a high school student interested in robotics. I want funding to start a
> STEM outreach program for younger students in Maryland and need about $5,000."*

parses — with no language model configured — into:

```
applicantType: student        educationLevel: high_school     state: MD
fundingNeeded: 5000           fundingPurpose: [program_delivery]
fieldIndustry: [stem_education, education]
age: null   citizenship: null   is501c3: null      ← never guessed
```

and produces ten distinct search strategies:

| Strategy | Query |
|---|---|
| Exact project description | `robotics. start a STEM outreach program for younger students in Maryland grant` |
| Funder terminology | `STEM education grant program` |
| Field or industry | `stem education grant funding opportunity` |
| Location-specific | `Maryland STEM education grant` |
| Applicant type | `grants for students STEM education` |
| Foundations | `foundation grant youth development Maryland` |
| Government | `Maryland government grant STEM education program funding` |
| Corporate philanthropy | `corporate giving program STEM education community grants` |
| Award size | `STEM education grant mini grant $1,000 to $5,000` |
| Related vocabulary | `STEM outreach OR out-of-school time programs OR informal science education` |

Against a fixture funding landscape, a matching foundation grant is returned as
a verified strong match, while a 501(c)(3)-only STEM grant with an *86% mission
match* is excluded at **0 overall** — quoting "Individuals are not eligible to
apply." An expired grant, a loan, and a fee-charging scam page are all rejected
with their reasons shown.

---

## Architecture

```
server/
  lib/
    evidence.mjs      ← the anti-hallucination core: fields with provenance,
                        and the quote-grounding verifier everything passes through
    config.mjs          capability detection and honest degradation reporting
    http.mjs            timeouts, backoff, per-host throttling, robots.txt
    store.mjs           zero-dependency persistence with atomic writes
  sources/
    grantsgov.mjs       official federal API (no key needed)
    websearch.mjs       Brave / Serper / Tavily / Google CSE / SearXNG
    page.mjs            fetch + HTML→text; the text every quote is checked against
    registry.mjs        domain trust tiers, decided before any content is read
  ai/
    llm.mjs             Anthropic adapter with a standing no-invention contract
    interpret.mjs       natural language → structured criteria (rules win ties)
    extract.mjs         page → grant record, by pattern and/or by model
  engine/
    profile.mjs         applicant model + rule-based natural-language parsing
    concepts.mjs        applicant vocabulary → funder vocabulary
    queries.mjs         ten distinct search strategies
    requirements.mjs    funder prose → structured, citable rules
    eligibility.mjs     ELIGIBLE / UNCERTAIN / NOT ELIGIBLE, with evidence
    score.mjs           the transparent 0–100 score and its eligibility gate
    quality.mjs         expired / loan / scam / aggregator / unverifiable filter
    confidence.mjs      source confidence — never combined with match score
    deadline.mjs        countdowns, urgency bands, timelines
    assessment.mjs      difficulty and competition (Unknown when unpublished)
    dedupe.mjs          merge duplicates, authoritative source wins
    strategy.mjs        five distinct funding roles
    followups.mjs       the fewest questions that unlock the most grants
    assistant.mjs       the application packet
    alerts.mjs          saved-profile sweeps and change detection
    evaluate.mjs        ground → requirements → quality → eligibility → score,
                        shared verbatim by the server and the browser build
    pipeline.mjs        orchestration + progress stages
  index.mjs             HTTP server: JSON API, SSE, static dashboard
public/                 the dashboard; transport-server.js talks to the API
browser/                the single-file build: in-page engine, demo corpus,
                        and a transport that runs the engine locally
tools/                  the single-file bundler
test/                   162 tests including a full offline pipeline run
```

Discovery differs between the two builds; evaluation does not. `evaluate.mjs` is
the one implementation of the verdict path, so a grant cannot be judged
differently depending on where the code ran.

No runtime dependencies. Node 20+.

---

## The evidence model

Every fact carries how it is known:

| Provenance | Meaning | Trusted without a quote? |
|---|---|---|
| `api` | read from an official funder/government API response | yes — no model touched it |
| `quote` | a span the extractor claims appears on a fetched page | **no** — re-checked, or destroyed |
| `derived` | computed by our code from verified fields | yes — records its inputs |
| `absent` | the source was read and does not state this | n/a — carries no value |

`valueOf(field)` returns the value **only** if it is verified. Unverified fields
read as `null` everywhere, so no code path can accidentally act on an
unsupported claim.

Quote matching normalizes whitespace, curly quotes, unicode dashes and entities,
so it is strict about *content* and tolerant of *formatting*. A paraphrase does
not pass.

---

## Match score

A transparent 0–100 built from eight weighted components:

| Component | Weight |
|---|---|
| Eligibility certainty | 30% |
| Project / mission alignment | 25% |
| Geographic alignment | 10% |
| Applicant-type alignment | 10% |
| Funding-purpose alignment | 10% |
| Award-size suitability | 5% |
| Deadline feasibility | 5% |
| Historical funding alignment | 5% |

Two properties are enforced by tests:

1. **The gate.** `NOT ELIGIBLE` forces the overall score to 0. The ungated score
   and every component stay visible so the user can audit the decision.
2. **Honest unknowns.** A component we cannot assess is scored at a neutral 0.5,
   labelled `unassessed` in the interface, and listed as *not counted as a
   strength* — never quietly treated as a pass.

**Source confidence is a separate number and is never combined with the match
score.** A grant can legitimately be `Match: 96/100` with `Source confidence: 🔴 Low`,
and the interface makes that contradiction obvious.

---

## Eligibility

Three verdicts, and the middle one is used honestly:

- **🟢 ELIGIBLE** — a requirement was stated, we hold the applicant's answer, and
  the answer satisfies it. Never awarded on similarity, and never on the mere
  absence of a conflicting rule.
- **🟡 UNCERTAIN** — a requirement exists but the applicant's answer is unknown,
  or the funder's rules could not be read at all. Each uncertainty carries the
  single question that would resolve it.
- **❌ NOT ELIGIBLE** — a mandatory requirement is definitively failed, quoting
  the sentence that says so.

Answering a follow-up re-runs the search and can promote a grant from UNCERTAIN
to ELIGIBLE. In the fixture run, answering *"I'm 16"* moves the Youth STEM grant
from 66/100 UNCERTAIN to 75/100 ELIGIBLE with four confirmed requirements.

---

## Sources and trust

Domain trust is decided before any content is read:

| Tier | Example | Can it verify a fact? |
|---|---|---|
| 1 — Official government | `grants.gov`, `*.gov` | yes |
| 2 — Funder's own site | `gatesfoundation.org` | yes |
| 3 — Institutional | `*.edu` | corroboration only |
| 4 — Listing site | `grantwatch.com` | **no** — a lead, never proof |
| 5 — Untrusted | scam-pattern domains | rejected outright |

Opportunities known only from tier-4+ sources are rejected for lacking a primary
source. The crawler identifies itself, honours `robots.txt`, throttles per host,
and caps response size.

---

## Configuration

Copy `.env.example` to `.env`. Everything is optional:

- **No keys at all** — federal opportunities from the official Grants.gov API,
  with rule-based parsing and pattern-based page reading. Fully functional.
- **+ a web search key** (Brave, Serper, Tavily, Google CSE, or a self-hosted
  SearXNG) — adds foundations, state and local programs, and corporate giving.
- **+ `ANTHROPIC_API_KEY`** — better interpretation of free-text descriptions and
  better reading of awkwardly structured funder pages. Its output is held to the
  same grounding standard as everything else.

Whatever is missing is stated plainly in the interface and in every search
result, so a degraded run is never mistaken for a complete one.

---

## Testing

```bash
npm test
```

162 tests, no network and no API keys. `test/fixtures/server.mjs` stands in for
the internet with a Grants.gov-shaped API, a search endpoint, and funder pages
covering a clean match, a 501(c)(3)-only grant, an expired grant, a loan, an
advance-fee scam, and an aggregator. `test/pipeline.test.mjs` runs the real
pipeline end to end against it.

Run the fixture landscape by hand to explore the dashboard:

```bash
npm run fixtures &
GRANTS_GOV_SEARCH_URL=http://127.0.0.1:8899/api/search2 \
GRANTS_GOV_FETCH_URL=http://127.0.0.1:8899/api/fetchOpportunity \
SEARXNG_URL=http://127.0.0.1:8899 \
npm start
```

---

## What this system will not do

It will not tell you that you are guaranteed to receive a grant. It will not
invent a deadline, an award amount, an eligibility rule, an application URL, a
funder, or an acceptance rate. It will not present an expired opportunity as
open, a loan as a grant, or a listing site as a primary source. When it cannot
verify something it says so, and when it excludes something it tells you why.

The funding decision always belongs to the funder.

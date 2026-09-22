# Pathway AI

**Tell us where you want to go. We'll help you build the path.**

An all-in-one college admissions, academic planning, extracurricular discovery, AP study and
SAT preparation platform. One student profile drives every feature — saying *"I want to study
computer science"* changes major matching, college fit, the AP plan, activity suggestions,
project ideas, research programmes, summer planning, practice targeting, the four-year plan
and the AI counselor, together and immediately.

It is not a collection of tools that happen to share a login. It is one system.

---

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npm run preview  # serve the built bundle
npm run check    # TypeScript, no emit
```

No API keys, no environment variables, no backend. It runs entirely in the browser.

Try it with the demo account — the landing page has a **"See it with a real profile"** button
that loads a complete grade-11 student (Maya Okonkwo: biology and computer science, three
activities, SAT practice history, a college list in progress) so every screen has real data in
it immediately.

---

## What it does

| Area | What's there |
|---|---|
| **Onboarding** | Eight steps, skippable, that build the profile everything else reads from |
| **My Path** | Student DNA, blind spots, four-year plan, what-if scenarios, interest graph, weekly review |
| **AI Counselor** | Intent-routed answers grounded in engine output, with the evidence attached |
| **Colleges** | 56-college catalog, four-dimension matching, list, comparison board, fit map, cost planning |
| **Majors & Careers** | 54 majors and 44 careers, matched to the profile, with a comparison board |
| **AP Center** | 30 courses, 200 units, a grade-by-grade plan with readiness checks, study modes, weakness tracking |
| **SAT Lab** | Adaptive practice, timed modules, question bank, weakness analysis, score history, study plan |
| **Beyond class** | Opportunity finder, activity record, depth analysis, research routes, scholarships, project studio |
| **Planner** | Deadlines with blockers, calendar, weekly study plan, summer planning |
| **Applications** | Per-college checklists, essay workshop, activity list, recommendation packets |
| **Settings** | Profile, appearance and accessibility, what the AI remembers, notifications, sharing, data export and deletion |
| **Admin & Parent** | Content provenance auditing; a read-only parent summary the student controls |

---

## The honesty constraints

These are structural, not cosmetic. They are enforced in the type system and the engine, not
added as disclaimers at the end.

**Fit is never admission probability.** The engine computes four independent fit dimensions —
academic, personal, opportunity, financial — and deliberately never combines them into one
number. Nothing anywhere estimates a chance of admission, because that depends on an
application nobody has read, in a process with real randomness in it. Every selectivity figure
carries a framing string saying so.

**Information kinds stay visually distinct.** Every record carries a `Provenance` of
`verified | ai | user | demo | unverified` with its sources and a verification date.
`ProvenanceChip` renders it, and a `DemoDataBanner` sits on every data-bearing page. Verified,
AI-generated and user-entered information never blur together.

**Gaps are shown as gaps.** Where a figure is not published, the app prints `—` and says so.
It does not interpolate, estimate, or fill in a plausible number.

**Every catalog record is demo data.** Realistic, internally consistent, modelled on the shape
of IPEDS, College Scorecard and common data sets — and labelled as demo everywhere, with links
to the official source. `/app/admin` audits the whole catalog: what is in it, what is missing
per record, and a correction log where a revision without a source is rejected.

**Practice questions are original.** All 74 are written for Pathway AI, carry `original: true`
in the type, and are labelled "original practice question" wherever they appear. No College
Board content is reproduced, licensed or otherwise. Written responses are self-assessed against
a rubric — the app does not auto-grade prose.

**Practice accuracy is not a score.** The SAT Lab shows accuracy per domain and refuses to
convert it into a predicted score.

**The AI does not write the student's essay.** The workshop brainstorms strictly from material
the student already recorded — activities, awards, their own notes on why those matter — and
runs an authenticity check that measures specificity, flags stock phrases, and names claims
nothing in the profile corroborates. It never drafts a paragraph or rewrites a sentence.

**It never invents an accomplishment.** Activity descriptions can be compressed to the ~150
characters an application allows, with the diff visible; nothing is added. Recommendation
packets contain only what the student entered.

**Depth over quantity.** The activity engine never suggests joining another club. The depth
analyser suggests ways to take an existing commitment further. Research pages lead with
cold-emailing local labs rather than the selective programmes that dominate listings, and say
plainly that most expensive prestige summer programmes are revenue businesses.

**It is not a game.** There are streaks and achievements, but nothing leaderboards students
against each other, and nothing manufactures urgency about admissions. Rest is presented as a
legitimate summer plan.

**Privacy is real.** Everything lives in the browser. `/app/settings/data` exports the complete
account as JSON and deletes it permanently with no retention period. `/app/settings/memory`
shows every rule the app has inferred, in plain language, each one switchable and deletable.
Counselor conversations, individual practice attempts and private notes are never shared, even
when parent sharing is on.

---

## Architecture

```
src/
  domain/
    types.ts            every entity type; AccountState is the persisted shape
    engine/             the recommendation engine — deterministic, no LLM calls
      context.ts        builds EngineContext from account state; computes constraints
      dna.ts            strengths, interest profile, major and career matching
      collegeMatch.ts   four independent fit dimensions
      apPlanner.ts      grade-by-grade AP plan with readiness and a workload ceiling
      opportunities.ts  opportunity, research and scholarship scoring
      practice.ts       topic stats, error patterns, adaptive question selection
      planning.ts       blind spots, deadlines, study plans, summer paths, next actions
      projects.ts       project generation and activity depth analysis
      writing.ts        essay brainstorming, authenticity checking, packets
      whatIf.ts         scenario modelling
      graph.ts          interest graph and four-year plan
      counselor.ts      intent routing and grounded answer composition
      briefing.ts       daily briefing and weekly review
      explain.ts        the Explanation type and band/priority vocabulary
  data/                 the demo catalog, all provenance-tagged
  store/                Zustand store over a repository abstraction
  components/           design system: primitives, charts, provenance, layout
  features/             one folder per area, lazily loaded per route
  lib/                  ids, dates, formatting, storage, crypto, search, export
  styles/               tokens, base, utilities, components, landing, print
```

**The engine is deterministic.** Given the same profile it produces the same recommendations
every time — same ordering, same wording, same evidence. There is no language model choosing
which college to show. That is what makes every suggestion explainable: each one carries an
`Explanation` (`whyThis`, `whyNow`, `connection`, `requires`, `alternatives`, `uncertainty`,
`evidence`) built from named inputs, and it is why the behaviour is testable.

**Persistence goes through a repository.** `LocalRepository` uses IndexedDB with a localStorage
fallback. Swapping in an `HttpRepository` is the only change needed to move to a server — which
is where password verification and content verification belong before real accounts exist.

**No UI or chart dependencies.** React, React Router and Zustand are the only runtime
dependencies. The design system, all six chart types, the fuzzy search and the command palette
are written for this project.

---

## Accessibility

Keyboard reachable throughout, with a visible focus ring on every interactive element. Semantic
landmarks and headings; charts carry text alternatives; no information is conveyed by colour
alone. Theme (system/light/dark), high contrast, four text sizes and reduced motion are all
settable in `/app/settings/appearance` and honoured from system preferences by default.
Touch targets meet 44px on mobile, and layouts reflow rather than clip at any text size.

---

## Known limits

Honest ones, since the whole app is built on saying what it does not know:

- **The catalog is demo data.** 56 colleges, not thousands. Every figure needs verifying
  against its official source before anyone acts on it.
- **74 practice questions.** Enough to demonstrate adaptive selection and weakness tracking;
  not enough to prepare for an exam. Repeated accuracy here measures memory, not ability.
- **No server.** No cross-device sync, no password recovery, no email. Clearing browser data
  deletes the account — which is why export exists and is one click.
- **Client-side password hashing** (PBKDF2-SHA256, 150k iterations) is a convenience, not real
  security against someone with device access. Verification belongs on a server.
- **No calendar sync or .ics export.** Deliberately not faked: a calendar that silently fails
  to sync is worse than none.
- **Deadline dates are demo dates.** Every screen that shows one says so, because a missed
  deadline cannot be undone.

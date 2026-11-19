# Stellify proposal (Phase 1)

**Owner decision:** none needed to proceed. The owner pre-approved Sections 1–6 (autonomous mode). Anything that
needs the owner is in `NEEDS-OWNER.md`, behind a flag that is OFF.

## (a) Design direction: "exam booklet, editorial"

Warm paper, near-black ink, hairline rules, a serif for reading, a quiet sans for controls, and one blue accent used
like a booklet's printed second colour. Data is the decoration.

| Token | Light | Dark ("lamp-lit") | Use |
| --- | --- | --- | --- |
| `bg` (paper) | `#F6F3EA` | `#14120E` | page |
| `surface` (sheet) | `#FFFDF7` | `#1C1914` | cards, inputs |
| `raised` (tint) | `#EEE9DC` | `#26221B` | quiet panels, table heads |
| `line` (rule) | `#D6CDBB` | `#3B352B` | 1 px hairlines |
| `ink` | `#1B1915` | `#EFE9DD` | text |
| `muted` | `#4E483F` | `#C4BBAA` | secondary text |
| `faint` | `#655E53` | `#A69D8C` | captions (AA on paper and sheet) |
| `accent` | `#1F4AA8` | `#93B2F4` | links, primary buttons, recommended hex, filled stars |
| `ok` / `bad` / `flag` | `#276237` / `#9E2F27` / `#7F5300` | `#80C893` / `#F28C82` / `#E6B65C` | always with an icon or a word |

- **Type:** Source Serif 4 (headings and passages) and IBM Plex Sans (UI), both inlined and offline. Passages are 19 px with 1.6 line height and a 68-character measure. Timers, scores and tables use tabular numerals. Curly quotes, en dashes and real minus signs are applied at render time (`lib/typeset.ts`), so authors keep typing plain ASCII. Code and math are never touched.
- **Space and shape:** 4 px scale; two radii only (`6px`, pill); hairline borders; one shadow, reserved for floating layers.
- **Icons:** Lucide only, 1.75 stroke. Emoji become Lucide icons through one mapping (`lib/glyphs.tsx`). Stars are an SVG star.
- **Motion:** 160 ms ease-out, only for meaning (a pressed hex, a revealed answer). Reduced motion turns it off.
- **Rejected:** (1) *Night sky* (the current dark, star-strewn look): it reads as gamified and template-like, and it fights long reading. (2) *Swiss monochrome*: clean, but cold, and its grotesk passages are tiring at SAT length.

## (b) The hex Path

- `#/path` (Math) and `#/path/rw`, with a switcher. Learn stays the library. Path is "what next" and is the default after onboarding.
- **Shape:** Math's 19 skills form a radius-2 hexagon without bending prerequisite order. Linear equations sits in the centre. Ring 1 holds the skills whose only prerequisite is the centre, or that have none (lines in two variables, inequalities, equivalent expressions, ratios, one-variable data, area and volume). Ring 2 holds the other 12, each placed next to its prerequisite. A unit test checks that every prerequisite sits on an equal or inner ring and that every hex touches at least one of its prerequisites. Reading & Writing uses an 11-hex cluster built from the same rules.
- **Look:** pointy-top SVG hexes with a flat top face and a darker 6 px base edge that drops 4 px on press. No WebGL and no glow. Stars fill inside each hex. Faint constellation lines join completed neighbours.
- **States:** not started (outline, muted); **recommended next** (solid accent, the only animated hex, a slow 2 s pulse of the base edge that reduced motion turns off); in progress (1–2 stars); proficient or mastered (2–3 stars, filled); due for review (a dot plus "review due" in its label). Every state also has text.
- **Soft locks:** every hex opens. Each skill offers a 5-question **skip check**: 4 or more credit earns ★1 and ★2.
- **Star rules** (credit per answer: 1, or 0.75, 0.5 or 0.25 after 1, 2 or 3 hints; hints never block):
  - ★1 **Learned**: every chapter passed, or the Worked Examples ladder finished, or the skip check passed.
  - ★2 **Practiced**: the 6-question practice set passed on its first attempt (at least 4.5 credit), or the skill reaches **Proficient**, or the skip check passed.
  - ★3 **Retained**: the 4-question hard set passed (at least 3 credit), or the skill reaches **Mastered**, **and** a correct answer on this skill in an interleaved Gauntlet at least 7 days after ★2.
  - Stars once earned are kept: they are stored with dates and never taken away.
- **Next-step engine** (`lib/path/next.ts`, pure and unit-tested). It walks a fixed priority order, and every result carries a plain reason:
  1. due reviews (at most 1 review block per day, 8 cards);
  2. confident errors (at most 3);
  3. an unfinished chapter;
  4. the highest Score Lever skill with prerequisites met (mistake journal, trap profile, test date and target as modifiers);
  5. curriculum order.

  **Format:** Worked Examples after 2 or more conceptual misses on the skill in the last 14 days; a Gauntlet when the skill is at Proficient or higher; otherwise a practice set.
- **Today panel:** about 15 minutes (a lesson, a set and a review), with a weekly rhythm ("4 of 5 study days this week") instead of a daily streak, and no mascot. Its text equivalent is the same list.
- **Mobile:** below 640 px, a vertical zigzag of the same hexes in route order, with a sticky Next button. Tap targets are at least 44 px.
- **Accessibility:** map/list toggle over the same data; roving tabindex with arrow keys moving to neighbouring hexes; labels like "Linear systems, 2 of 3 stars, recommended next".
- **Data:** `path/skills.ts` holds `{ id, domain, title, prereqs, hex: { q, r } }`. Progress lives in the existing versioned store, with a new `migrate()` chain (v1 to v2), and export/import goes through the same migration.
- **Budget:** Path page JS of 40 KB or less minified (actual size reported in Phase 3).

Prototype: `prototypes/hex-path.html` (throwaway, not wired into the app).

## (c) Psychometrics and test day

**Data collection: recommend B now, with A designed but OFF.** (A) opt-in anonymous submission to a free-tier endpoint, (B) on-device item analytics plus a manual export teachers can pool, (C) both. B ships now, with no server and no consent risk. A is a schema, a consent screen and a `submit()` stub behind `flags.collect = false`, with no endpoint configured. COPPA/FERPA: **needs review by someone qualified before A is turned on.**

- **Events:** derived, never duplicated. They come from `attempts` and mock modules (which already store per-question time and order), with the brief's fields. Only first attempts count. Cleaning drops: answers under 3 s or under 10% of the item's median time; abandoned sessions; repeats; field-test items (from student stats).
- **Item statistics:** p, point-biserial (corrected item–rest), distractor counts by ability third, and time quartiles, each with its n. No decisions under 100 responses; "stable" at 200+. Flags: p < .10 or > .95; r_pb < .10; r_pb < 0 is **urgent**; a top-third student picks a distractor more often than the key; a misconception tag no one picks.
- **Lifecycle:** draft → pretest → calibrated → live → flagged/retired. Empirical difficulty replaces the author tag once an item is calibrated, with the author tag as fallback, and feeds Module 2 routing.
- **Field-test items:** the Digital SAT includes unscored pretest questions in each module (NEEDS VERIFICATION: 2 per module, 25+2 R&W and 20+2 Math). Stellify mirrors this behind `flags.fieldTest` (OFF until there are pretest items): they are revealed after the session and never count.
- **Maintainer dashboard:** `#/maintainer` loads exported JSON files (one or many) and shows the flag queue and distractor tables, with "mark reviewed".
- **Later, only with enough data:** a Rasch script in `scripts/` (documented, not run).

**Test-day hub (`#/test-day`):**
- a dated timeline checklist (4 weeks, 1 week, night before, morning of, in the room), saved and printable;
- a Bluebook walkthrough where every College Board specific carries a source link and "last verified", or is marked NEEDS VERIFICATION;
- a modest sleep and stress guide, with a "when things go wrong" playbook and a counsellor pointer;
- a Score Choice, superscoring and testing-policy explainer, with no hard-coded school policies;
- a school list tool: links to each school's own admissions page, plus a College Scorecard snapshot JSON fetched at build time. Fetching needs an api.data.gov key (NEEDS-OWNER); until then the tool ships with no ranges and says so.

## (d) New features

| | What | Effort | Risks | Depends on |
| --- | --- | --- | --- | --- |
| N10 Score Lever | points per hour per skill = shrunk headroom × test share × points per question ÷ hours to gain, as a low–high range; "needs a diagnostic" when n < 6 | S | false precision (handled by ranges and confidence labels) | existing `insights.ts` |
| N11 Worked Examples | a backward-fading ladder (worked, last step blank, more blanks, independent) per problem family, with a "why this step?" prompt | M | content volume (start with 10 math families and grow) | Path ★1 |
| N8 Predict-First | R&W training only: choices hidden; per-type prediction prompt; self-grade; match rate vs accuracy | S | self-grading bias (shown as the student's own pattern, never a score) | question types |
| N6 Fatigue curve | accuracy minus expected accuracy by position bucket; time strip against 71 s and 95 s pacing; shown only with 3+ full modules | M | over-reading noise (needs 3+ sessions, an n label and "possible drop-off" wording) | mock data |
| N7 Desmos Lab | 7 techniques: algebra way vs Desmos way, validated on the built-in grapher (offline), plus a decision guide and a timed method drill | M | the Desmos API needs a key, so live Desmos state validation stays OFF | Grapher |

## (e) Extra ideas

In `IDEAS.md`, not built.

## (f) Build order and risks

1. Design system
2. Path and engine
3. Score Lever
4. Psychometrics
5. Test-day hub
6. N11
7. N8
8. N6
9. N7
10. Hosted web build (code splitting, service worker) for speed

**Risks:**
- **Lighthouse ≥ 95 is out of reach for the 6.4 MB single file.** The fix is the hosted build, and even then the app pages, which need the question bank, may land below 95. This will be reported honestly.
- Visual regressions across about 60 screens.
- Content volume for N11.

Owner questions are batched in `NEEDS-OWNER.md`.

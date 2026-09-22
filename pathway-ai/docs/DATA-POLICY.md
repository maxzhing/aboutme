# Data policy

This file is the contract behind `ProvenanceKind` in `src/domain/types.ts`.
Every catalog record carries a `Provenance`, and the five kinds are never
blurred — in the type system, in the engine, or on screen.

## The five kinds

| Kind | Means | Where it appears today |
|---|---|---|
| `verified` | Copied from a named official source and checked by a human on `lastVerified` | **Nothing in this build.** Claiming it without having done the check is the failure mode this whole file exists to prevent |
| `demo` | Realistic placeholder modelled on the shape of public sources. Not a factual claim | Colleges, majors, careers, opportunities, scholarships, research programmes, project templates |
| `unverified` | Structure we believe is right but have not checked against the source | AP course outlines, unit lists and exam formats |
| `ai` | Produced by Pathway AI's engine from the student's profile. Guidance, not fact | Every recommendation, fit dimension, explanation and analysis |
| `user` | Typed in by the student | Activities, awards, scores, essays, notes, deadlines they added |

## Rules

**A missing figure is shown as missing.** Where a college publishes no net
price, the app prints `—` and says the figure is not published. It never
interpolates from similar colleges, never estimates from sticker price, and
never fills a gap because a blank looks unfinished. `/app/admin` lists, per
record, exactly which fields are missing.

**Demo data is labelled at the point of use.** A `DemoDataBanner` sits on every
page that displays catalog figures, and a `ProvenanceChip` sits next to
individual records. Labelling it once in a footer would not be labelling it.

**AI output is visually distinct from data.** Anything generated carries the
`ai` treatment — a distinct tint, the sparkle glyph, and an `AIGuidanceNote`
where the guidance could be mistaken for fact.

**User input is never modified or inferred from.** The app can compress a
student's own activity description to fit an application's character limit,
showing the before and after. It cannot add an accomplishment, a number or an
outcome the student did not write. Recommendation packets and essay
brainstorming draw only from recorded input.

**Time-sensitive data says when it was checked.** Deadlines, aid policies and
test policies all change between cycles. Every one of them links to the
official source and carries a warning to confirm before acting.

**Corrections require a source.** `/app/admin` records a `ContentRevision` with
the previous value, the new value, a source and a verification date. A change
submitted without a source is rejected — otherwise the log records opinions.

## Practice questions

All 74 items in `src/data/questions/` are written for Pathway AI and carry
`original: true` in the type. No College Board content is reproduced, licensed
or otherwise. Every item renders with an "original practice question" badge
wherever it appears, and the app does not convert practice accuracy into a
predicted exam score.

## What would be needed to ship `verified`

Automated ingestion from IPEDS and College Scorecard refreshed each cycle;
per-college deadline collection with human review; a verification timestamp per
field rather than per page; a correction path a student can use; and, for AP
content, either a College Board licence or fully independent content labelled
as such. This build took the last route and verified nothing else — which is
why no record here claims to be verified.

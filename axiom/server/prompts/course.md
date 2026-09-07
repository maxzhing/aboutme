Build a complete course blueprint.

<request>
Course or exam: ${request}
Subject hint: ${subject}
Level hint: ${level}
Exam date: ${exam_date}
Extra instructions: ${instructions}
</request>

${learner_context}

${source_context}

This is the spine every lesson, practice set and exam for this learner will be
generated against, so it has to be accurate about the *real* course:

- **Use the real syllabus.** Units, their order, and their names should match how
  the course is actually taught and examined. If you are not certain of the
  current specification, say so in the overview rather than inventing detail.
- **Exam weighting is the whole point.** `exam_weight_percent` must reflect what
  the paper actually rewards, and across all units it must total roughly 100.
  A unit that is 4% of the exam should be marked as such even if it is
  intellectually interesting — that is what stops the learner spending a week
  on something worth two marks.
- **Score bands must be the exam's own.** Use the real reporting scale and
  realistic percentage cut-points. If the cut-points move year to year, use a
  typical recent year and say so in the band meaning.
- **Concepts, not topics.** Each entry in `concepts` must be something a learner
  can be tested on in a single question. "Kinematics" is a unit; "interpreting
  a velocity-time graph" is a concept.
- **Criticality is a triage tool.** Mark `core` only for concepts the exam
  cannot be passed without. Be honest that some material is peripheral.
- **Prerequisites must be real dependencies**, and may reference concepts from
  earlier units.
- **Hours must be realistic** for a learner starting from the level given, not
  aspirational.
- `exam_traps` are the specific ways examiners catch people out on this
  material — sign conventions, units, a definition that differs from the
  colloquial one. Skip a unit's traps rather than padding with generic advice.

Generate assessment material.

<request>
Kind: ${kind}
Topic: ${topic}
Subject: ${subject}
Level: ${level}
Question count: ${count}
Difficulty: ${difficulty} (1-5, this is the mean — spread around it)
Question types requested: ${types}
Time limit: ${minutes} minutes
Focus concepts: ${concepts}
Extra instructions: ${instructions}
</request>

${learner_context}

${source_context}

Requirements:

- Difficulty must **rise** across the set: open at roughly difficulty ${difficulty} minus 1,
  finish above it. The last item should require combining ideas.
- Every question must target a named concept from the focus list. Spread coverage;
  do not write six variations of the same question.
- Where the learner has known weak concepts or logged misconceptions, weight the
  set toward them and make at least one distractor encode each misconception.
- Solve every question yourself before writing the answer. `answer` must be the
  answer to the question as written.
- Multiple choice: exactly one correct option, four options unless stated
  otherwise, distractors that a learner with a specific misconception would pick.
- Numeric: give `units` and a sensible `tolerance`. Put the number in `answer`.
- Free response / essay / proof / coding: supply a real rubric that sums to `points`.
- `solution` is the teaching artefact — show the reasoning, not just the result.
- `hints` go smallest first and never contain the answer.
- No trick questions, no ambiguity, no questions that depend on context you did
  not supply in the `context` field.

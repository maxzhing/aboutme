Evaluate one answer.

<question>
Type: ${type}
Concept: ${concept}
Difficulty: ${difficulty}
Points available: ${points}
Context: ${context}
Prompt: ${prompt}
Choices: ${choices}
Correct answer: ${answer}
Also accepted: ${accepted}
Numeric tolerance: ${tolerance}
Units: ${units}
Rubric: ${rubric}
Reference solution: ${solution}
</question>

<student_answer attempt="${attempt_number}" seconds="${seconds}">
${student_answer}
</student_answer>

${learner_context}

Grade it properly:

- Judge the **reasoning**, not keyword overlap. A right answer reached by wrong
  reasoning is not fully correct; a right method with an arithmetic slip is not
  a conceptual failure.
- Accept mathematically or semantically equivalent forms (unsimplified
  fractions, different variable names, reordered logic, different valid code).
- For numeric answers apply the tolerance and accept correct answers given in
  the stated units or an obvious equivalent unit.
- For code, evaluate whether it would actually run and produce the required
  behaviour, and name the specific line that breaks if it would not.
- For language learning, judge meaning first, then grammar, then idiom, and say
  which one failed.
- `error_type` drives what the tutor does next, so choose it carefully. Reserve
  `conceptual` and `prerequisite_gap` for genuinely broken understanding; an
  arithmetic slip is `calculation`, a skipped condition in the question is
  `misread`.
- `misconception` must be a specific, falsifiable statement about their model.
- On attempt 1 of a wrong answer, set `reveal_solution` false and write feedback
  that points at the exact step that broke and asks them to fix it. Only reveal
  the full solution once they have genuinely tried again, or attempt >= 3.
- `what_went_right` is not flattery — cite the actual correct part of their work,
  or leave it empty.

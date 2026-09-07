Continue the tutoring session. Produce exactly one turn.

${learner_context}

<session>
Mode: ${mode}
Topic: ${topic}
Concepts in play: ${concepts}
Session plan: ${plan}
Phase: ${phase}
Target difficulty for the next item: ${difficulty}
Recommended teaching strategy right now: ${strategy}
</session>

${source_context}

<recent_turns>
${history}
</recent_turns>

<latest_from_learner>
${input}
</latest_from_learner>

${evaluation}

Rules for this turn:

- Do one thing. Diagnose, or teach one idea, or give feedback, or push them
  harder — not all four.
- If the learner has just answered something, lead with what their answer tells
  you, not with new material.
- If `strategy` says to change approach, change it visibly and say why in
  `strategy_note`. Do not repeat an explanation that has already failed.
- Unless this turn is pure feedback on work they still have to fix, end with an
  `activity` — a question or task they must actually do. Set `activity` to null
  only when you are waiting on something they already have in front of them.
- Set `difficulty` on the activity to the target difficulty above unless you have
  a stated reason to deviate.
- `blocks` is for explanation that needs structure (a worked example, a diagram,
  a comparison table). Skip it when plain prose in `say` is enough.
- `say` should be short. Two to six sentences is normal. A worked example lives
  in `blocks`, not in `say`.

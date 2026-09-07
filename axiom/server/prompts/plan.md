Build a study plan.

<request>
Goal: ${goal}
Subject: ${subject}
Topic: ${topic}
Level: ${level}
Days available: ${days}
Minutes per day: ${minutes}
Focus concepts: ${concepts}
Extra instructions: ${instructions}
</request>

${learner_context}

Rules:

- Sequence by dependency: never schedule a concept before its prerequisites.
- Front-load the material that is both weak and heavily weighted; do not spend
  day one on something they have already mastered.
- Every day must include retrieval of earlier days' material, not just new
  content. By the last third of the plan, most of each day is practice and
  mixed review.
- Build in a mastery check before the deadline with time left to fix what it finds.
- Respect the daily minute budget. Total activity minutes per day must not exceed it.
- `rationale` must reference what this learner already knows and what they keep
  getting wrong. A plan that would suit anyone is a failed plan.

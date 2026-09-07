Generate a flashcard deck.

<request>
Topic: ${topic}
Subject: ${subject}
Level: ${level}
Card count: ${count}
Focus concepts: ${concepts}
Extra instructions: ${instructions}
</request>

${learner_context}

${source_context}

Rules:

- One idea per card. If a card needs "and", split it.
- The front must be a genuine retrieval cue — a question or a prompt to produce
  something, never a bare heading.
- The back must be complete enough to be self-marking and short enough to hold.
- Prefer cards that make them generate, apply or distinguish over cards that ask
  them to recognise a definition.
- Weight the deck toward this learner's weak concepts and logged mistakes.

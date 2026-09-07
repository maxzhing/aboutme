A learner has just told you what they want. Work out what learning experience
should actually be built for them — not what they literally typed.

<request>
${request}
</request>

${learner_context}

${source_context}

Decide:

1. **Goal** — what they actually want out of this (understand / memorise / master /
   prepare for a test / get through homework / review / practise / apply / start
   from scratch / go beyond where they are).
2. **Level** — subject, course, and the level they are working at. Use their
   history when you have it; otherwise infer from how they phrased the request
   and name your assumption.
3. **Time** — how long they have. If they said, use it. If not, infer something
   sensible (a "quick" request is 10-15 minutes; "teach me X" is 25-40; a test in
   N days is a multi-day plan).
4. **Concepts** — decompose the topic into the concepts you would actually teach,
   in teaching order. This is the spine of the session.
5. **Diagnostic** — set `needs_diagnostic` true only when knowing what they can
   already do would genuinely change how you teach this. Never probe a learner
   who asked for a worksheet.
6. **Clarify** — only ask a question if the request is unteachable without it.
   Prefer to assume and say what you assumed. "Teach me derivatives" needs no
   clarification; "help me with my project" does.

`opening_note` is the first thing the learner reads. Tell them what you are about
to do and why it fits what they asked. No preamble, no restating their question
back to them.

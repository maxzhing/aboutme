# Contributing

## Writing original questions

- **Never copy or adapt College Board material.** Write from the skill, not from an official item.
- **Where questions live:** in `src/data/questions/*.ts`, in the compact `RawQuestion` format (`src/lib/types.ts`).
  Each needs:
  - a skill and sub-topic;
  - a difficulty (M/H/V/E);
  - four choices with one key, or accepted answers for a student-produced response;
  - step-by-step `steps`;
  - a `why` for every choice;
  - `concept`, `strategy`, `trap` and `remember`.
- **Math:** add `check: () => boolean`, which recomputes the key independently.
- **Reading & Writing:**
  - use the official stem wording for the skill;
  - keep passages to 25–150 words;
  - tag every wrong choice with a misconception in `src/data/questions/distractors.ts`.
- **Validate:** run `npm run validate:questions`. Only validated questions ship.
- **Life cycle:** new questions should start as `pretest` in `src/data/itemLifecycle.ts`. They do not count toward
  any student's stats until they are live.

## Worked examples and the Desmos Lab

- **Worked examples:** families live in `src/data/worked/` (a four-rung ladder of three-step problems).
  `tests/worked.test.ts` recomputes every final answer from `params`, so add your family's formula there.
- **Desmos Lab:** exercises live in `src/data/desmosLab.ts`; `tests/desmoslab.test.ts` rechecks their answers.

## Item analysis

Ask students or teachers for Settings → Export anonymous item data, load the files on `#/maintainer`, work the
flag queue, and record decisions with "Mark reviewed". Do not change an item's key or difficulty under 100
responses.

## Code

- **Style:** design tokens only (DESIGN.md). Keyboard-operable, never colour alone, honest about uncertainty.
- **Saved data:** a schema change needs a new step in `src/lib/migrate.ts` and a test in `tests/migrate.test.ts`.
- **Checks:** `npm run check` runs the typecheck, unit tests, both builds and the browser tests (accessibility and
  the content linter included).
- **Commits:** small commits; record anything ambiguous in DECISIONS.md.

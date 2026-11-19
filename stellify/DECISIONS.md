# Decisions

Each entry records what was decided, why, and the alternatives considered.

1. **Docs live in `stellify/`**, next to the app's README, not at the repository root (which is the owner's
   personal site). Alternative: the repository root. Rejected because it mixes the site and the app.
2. **Pushing the personal copy (official College Board questions) to a public repository was declined.** It would
   publish copyrighted College Board material and break the "never reproduce College Board content" rule. The owner
   made `maxzhing/satstudy` private on 2026-11-19 (verified twice), so the personal copy goes there.
3. **Math hex layout:** radius-2 hexagon. The layout was found by an exhaustive search that requires every skill to
   touch at least one prerequisite and every prerequisite to sit on the same ring or an inner one. It scores 17 of 20
   prerequisite edges adjacent. Circles sits at the bottom, next to Equivalent expressions (completing the square),
   not beside Trigonometry: no arrangement gives both. Alternative: a free-form layered layout. Rejected because the
   brief prefers the radius-2 shape when it does not distort order, and it does not.
4. **Stars are earned and kept.** Stored with dates and never removed, even if accuracy later drops, so there is no
   guilt mechanic. Retention is checked by the ★3 delayed-retrieval rule instead.
5. **Theme default:** new students get the light "paper" theme. Existing students keep whatever theme they saved. The
   old default was dark, and someone who never touched the setting had `theme: 'dark'` saved, so they keep dark.
   The new dark theme is a proper warm "lamp-lit" palette, not an inversion.
6. **The dashboard (`/`) keeps its URL.** Path is a new top-level `#/path`, and onboarding now ends there. The
   dashboard leads with the Today panel. This avoids breaking bookmarks and saved links.
7. **Daily streak shown as a weekly rhythm.** The stored streak data stays (no data loss). The top bar shows "N of M
   study days this week" against the student's own plan, not a streak count.
8. **Companions stay** (owner-built feature, never deleted) but leave the dashboard hero and the Today panel. They
   are still in the navigation under Companion.
9. **Typography is fixed at render time** (`lib/typeset.ts`): curly quotes, apostrophes, en-dash ranges and real
   minus signs, applied only to prose tokens, never to math, code or user input. Alternative: rewriting about 60k
   lines of content. Rejected as error-prone, especially for Java code and punctuation questions.
10. **Field-test items:** a mechanism, not content. `flags.fieldTest` stays OFF until items exist in the `pretest`
    lifecycle state.
11. **Data collection option B** (on-device analytics plus manual export) ships now. Option A is designed and
    stubbed, OFF, with no endpoint.
12. **Desmos Lab validates on Stellify's built-in grapher** (offline, state readable). The embedded College Board
    Desmos calculator stays for free practice. Validating Desmos graph state needs the Desmos API key (NEEDS-OWNER).
13. **More colour and rounder shapes (owner request, 2026-11-19).** This overrides the brief's "one accent" and
    "radius at most ~6px" rules. Each content domain has its own colour (Math: teal, orange, gold, rose;
    Reading & Writing: sky, rose, green, orange) and so does each app area (navigation icons, page labels). Stars are
    gold. Blue stays the colour of actions and of the recommended next step. Hexagons have rounded corners. Cards use
    16px, controls 12px, chips are pills. Colour still never carries meaning alone: every state has a word, an icon
    or a star count, and contrast is checked by axe.
14. **Format choice refined.** For a brand-new skill (no stars, chapters not done), the engine starts with chapter 1
    rather than a practice set. The brief's "practice set otherwise" applies once ★1 is earned. Starting a new topic
    with a test is the opposite of what the brief wants for learning.
15. **Path stars backfill.** On the first load after the update, skills that already meet a star's rule (for
    example Proficient) get that star dated at that moment. Their 7-day retention clock starts then, not
    retroactively. Recomputing the historical date was possible but slow on big histories, for little benefit.

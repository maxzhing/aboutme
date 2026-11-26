# Animated lesson style (one page)

**Tokens.** Use the site's tokens from `src/styles.css` and DESIGN.md only: one accent (`--accent`/brand) for the thing
being solved for; `--muted` for context; `--ok` for the answer; `--bad` for the trap or an error; `--gold` (warn) for
"try it" moments. Fonts: IBM Plex Sans (UI) and Source Serif 4 (headings), both OFL, bundled. Math: KaTeX (bundled),
real minus signs, never images of text.

**Meaning is never colour alone.** Highlights carry a text label; the trap card says "The trap"; the answer is named in
words and in the caption; crossed-out choices are struck through and explained.

**Motion.** Things move, they do not blink: equation steps are token-matched (`morph`): a term present in two steps
glides (0.55 s, ease 0.4/0/0.2/1), removed terms fade, new terms enter. Scene changes slide 24 px over 0.4 s. All easing
0.4–0.8 s. One idea per scene. No glow, particles, neon, gradient text, spins, zooms, whooshes, mascots, stock
footage or background music. Nothing flashes more than 3 times a second (no animation repeats at all).

**Phones (360 px wide), as built.** Passages and question stems 16 px; tile and note text 14 px (the minimum); worked
steps 20 px (`text-xl`); captions 14 px. Diagram labels are 13 units in a 400-unit-wide SVG, about 10.7 px on a 360 px
screen; axis numbers are 10 units, about 8 px: small, a known Minor to fix (raise to 12 units). Scenes scroll
vertically inside the frame; nothing may cause sideways scrolling (checked in tests).

**Geometry.** Diagrams are drawn from the problem's numbers with equal x/y scale (`square`), or marked "not drawn to
scale" when they cannot be.

**Reduced motion.** The system setting (or Step-through) turns animation off and stops after each narrated line.

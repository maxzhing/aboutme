# Stellify design system

The direction is an exam booklet with editorial typography: warm paper, near-black ink, hairline rules and
generous space. At the owner's request it is more colourful and rounder than the original brief (DECISIONS.md
#13). Every value lives as a token in `src/styles.css` and `tailwind.config.ts`; components use tokens only.

## Colour

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `bg` | `#F6F3EA` | `#14120E` | page |
| `surface` | `#FFFDF7` | `#1C1914` | cards, inputs |
| `raised` | `#EEE9DC` | `#26221B` | quiet panels |
| `line` | `#D6CDBB` | `#3B352B` | hairlines |
| `ink` / `muted` / `faint` | `#1B1915` / `#4E483F` / `#655E53` | `#EFE9DD` / `#C4BBAA` / `#A69D8C` | text |
| `accent` | `#1F4AA8` | `#93B2F4` | actions, links, the recommended Path tile |
| `ok` / `bad` / `warn` | correct / incorrect / flagged | | always paired with an icon or a word |
| `star` | `#D6970A` | `#F5C446` | earned stars |
| `--d-*` domain colours | teal, orange, gold, rose (Math); sky, rose, green, orange (R&W) | lighter in dark | Path clusters, skill icons |
| `--sec-*` area colours | one per navigation group | | nav icons, page eyebrows |

- **Contrast:** every text colour is AA on paper, sheet and panel. The light domain colours were darkened until
  they reached at least 4.7:1. axe runs on 38 routes in both themes.
- **No gradients, glow or glass.** A browser test fails on any gradient.

## Type

- **Families:** Source Serif 4 for headings and passages; IBM Plex Sans (400/500/600) for the interface. Both are
  inlined in the single file and served as files on the web.
- **Passages:** 19 px, 1.6 line height, 68-character measure.
- **Numbers:** timers, scores and tables use tabular numerals.
- **Typography:** curly quotes, en-dash ranges, real minus signs and ellipses are applied at render time
  (`lib/typeset.ts`). AP Computer Science A is exempt because its prose holds Java strings. The content linter
  (`e2e/content-lint.spec.ts`) fails on straight quotes, banned words or emoji in rendered copy.

## Shape, space, motion, icons

- **Shape and space:** a 4 px spacing scale. Radii are 12 px for controls, 16 px for cards, and pills for chips.
  Borders are hairlines. The only shadow is on floating layers.
- **Icons:** Lucide at 1.75 stroke. Emoji in older content are drawn as Lucide icons through `components/Glyph.tsx`.
  Stars are SVG.
- **Motion:** 160 ms ease-out, only where it means something: a pressed tile, a revealed answer, and the next
  step rising and bobbing on the Path. `prefers-reduced-motion` and the in-app setting turn it off.

## The Path

- **Layout:** grouped 3D hexagon clusters (one per SAT domain) laid along a path going down the page. Tiles snake in
  step order so each step touches the next. A dotted trail and the unit's name lead to the next cluster.
- **States:** a pale domain tint means not started; a stronger tint, in progress; solid colour, proficient or
  mastered. The next step is solid blue with a gold ring, raised above the rest, and says "START HERE". There are
  no arrows: step numbers show the order.
- **Access:** arrow keys move to the previous or next step. A list view shows the same data as text.

## Banned

Gradients, glassmorphism, glow, Inter, a centred "Unlock your potential" hero, three-column icon grids, fake
testimonials, the words seamless, empower, elevate, unlock, supercharge and journey (in interface copy), and
emoji as icons.

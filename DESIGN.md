---
version: 1
name: Cadence-JARVIS
description: "A dense, keyboard-first planning tool with a warm agent layer living inside it. The shell is cool, quiet and technical — a neutral surface ladder carried by hairline borders, one cool chromatic accent chosen by the user, no drop shadows and no decorative gradients. The assistant is the single warm surface: a muted terracotta marks everything JARVIS said, reasoned, or wants to do, so the agent never gets confused with the app's own chrome. Type is a system humanist sans with negative tracking on display sizes only. Both themes are first-class; the light theme is the default and neither is an afterthought."

colors:
  # Shell — inherited from Cadence, user-selectable accent.
  canvas: "var(--bg)"
  surface-1: "var(--surface)"
  surface-2: "var(--surface-2)"
  surface-3: "var(--surface-3)"
  hairline: "var(--border)"
  hairline-strong: "var(--border-strong)"
  ink: "var(--text)"
  ink-muted: "var(--text-2)"
  ink-subtle: "var(--text-3)"
  accent: "var(--accent)"

  # Agent layer — the one warm register. Light / dark.
  agent: "#c2673f"
  agent-dark: "#d98b6d"
  agent-strong: "#a9583e"
  agent-soft: "rgba(194, 103, 63, 0.10)"
  agent-line: "rgba(194, 103, 63, 0.28)"

  # Semantic — state never rides on colour alone.
  ok: "var(--ok)"
  warn: "var(--warn)"
  danger: "var(--danger)"

typography:
  display:
    fontSize: 21px
    fontWeight: 600
    letterSpacing: -0.015em
  title:
    fontSize: 17px
    fontWeight: 600
    letterSpacing: -0.01em
  body:
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontSize: 12.5px
    lineHeight: 1.45
  caption:
    fontSize: 11px
    lineHeight: 1.4
  eyebrow:
    fontSize: 11px
    fontWeight: 600
    letterSpacing: 0.06em
    textTransform: uppercase
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: 10.5px

rounded:
  sm: 5px
  md: 8px
  lg: 12px
  xl: 16px
  pill: 9999px

spacing:
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 20px
  6: 24px
  7: 32px
  8: 44px
---

## Overview

Cadence is a calendar, task manager and notebook. JARVIS is an agent that lives
inside it. The design problem this file answers is a single question: **how does
a person tell, without thinking about it, which parts of the screen are their
own data and which parts are a machine's suggestion?**

The answer is temperature. The shell is cool and quiet. The agent is warm. Every
surface JARVIS authors — its replies, its reasoning trace, the tools it can run,
and above all the card asking permission to change something — carries a muted
terracotta that appears nowhere else in the product. Nothing else distinguishes
the layers: no separate typeface, no different radius scale, no shadow, no
gradient. One temperature shift, applied consistently.

**Sources.** Structure follows `linear.app` (surface ladder, hairline borders in
place of shadows, 8px controls / 12px cards, one accent used scarcely, no
atmospheric gradients). The agent surface follows `claude` — specifically its
warm coral used *scarce on individual elements and generous only on the
full-bleed callout*. Two systems, one supplying structure and one supplying a
single surface. Deviations from both are listed at the end.

**Key characteristics:**
- One warm accent for the agent layer, one cool accent for the app. Never mixed
  in the same component.
- Depth comes from the surface ladder plus 1px hairlines. There are no shadows
  in the JARVIS surface except the mobile overlay rail.
- Coral is a *hairline and a mark* almost everywhere; it fills only the approval
  card and the send button.
- Every destructive or data-changing action states its own reversibility in
  words, next to the button.
- Colour never carries meaning alone — agent health, priority and status all
  pair colour with a label or a shape.

## The agent layer

### Where warm is allowed

| Surface | Treatment |
|---|---|
| JARVIS mark, byline mark, empty-state mark | `{colors.agent}` glyph on `{colors.agent-soft}`, 1px `{colors.agent-line}` |
| Agent reply bubble | `{colors.surface-1}` with a 2px left rule in `{colors.agent-line}` |
| Reasoning trace phase labels | `{typography.mono}` in `{colors.agent}` |
| Write-capable tool chips | 1px `{colors.agent-line}`, text `{colors.agent}` |
| Composer focus ring | border `{colors.agent}`, 3px `{colors.agent-soft}` halo |
| Send button | filled `{colors.agent}` |
| **Approval card** | filled `{colors.agent-soft}`, 1px `{colors.agent-line}`, filled Apply button |

### Where warm is forbidden

- Any surface showing the user's own events, tasks or notes. Those stay on the
  app accent, always.
- Result cards. A list of the user's real data rendered by JARVIS is still the
  user's data: `{colors.surface-2}` with a neutral hairline, no warm tint.
- Navigation. The JARVIS sidebar entry and top-bar button are ordinary nav
  items in the app accent; the assistant is a room in the app, not a guest.
- Error and success states. Those use `{colors.danger}` and `{colors.ok}` —
  overloading the agent colour with severity would make the warmth meaningless.

### The approval card

This is the one place the warm colour goes generous, and it earns it: it is the
moment the agent asks to change the user's data. The card fills
`{colors.agent-soft}`, lists every item it would create in individual
`{colors.surface-1}` chips so nothing is hidden behind a summary, and pairs a
filled **Apply** with a ghost **Discard**. The sentence *"Nothing changes until
you approve."* sits beside the buttons — not in a tooltip, not in a settings
page.

After a decision the card keeps its position and states the outcome
(*"Applied. Undo from the top bar or Ctrl+Z."* / *"Discarded — nothing was
changed."*). It never disappears; a person scrolling back must be able to see
what they agreed to.

## Layout

The shell is a CSS grid: `sidebar · main · [task dock] · [JARVIS dock]`. The
JARVIS console is a declared grid track, never an absolutely-positioned overlay,
until the viewport is too narrow to hold four columns — below 1179px it becomes
a fixed right rail, and below 560px it takes the full screen and hides the app's
bottom navigation, because at that size it *is* the screen.

The console is always three stacked regions in a column: a fixed head, a
scrolling thread, and a fixed composer. The thread scrolls; the page never does.

The routed full view reuses every component at a wider measure and adds a
268px rail of panels — agents, tools, behaviour. It is the same console, not a
second design.

## Motion

- Transitions run at `140ms` on the app's shared easing curve. Only colour,
  border-colour and transform are animated.
- The single looping animation is the three-dot thinking indicator, and it is
  disabled under `prefers-reduced-motion` rather than merely shortened.
- Nothing slides, fades in on scroll, or animates on mount. A planning tool that
  moves while you read it is a planning tool you stop trusting.

## Accessibility

- The thread is an `aria-live="polite"` region; answers announce themselves
  without stealing focus.
- Escape closes the console from anywhere, including from inside the composer
  where the app's global handler deliberately ignores keys.
- `J` opens JARVIS from anywhere, matching the app's existing single-key
  navigation; the shortcut is listed in the app's own shortcut sheet.
- Agent health is a coloured dot **and** a name **and** a class — never colour
  alone.
- Warm and cool accents both meet 4.5:1 against their surfaces in both themes.

## Do's and Don'ts

### Do
- Keep the agent's warmth to a hairline, a mark, or a fill on the approval card.
- Render the user's data in neutral surfaces even when JARVIS fetched it.
- Say what a button will do, and whether it can be undone, next to the button.
- Show the reasoning trace as a collapsed row that expands in place — visible by
  default would be noise, hidden entirely would be a black box.
- Let both themes be complete. Define every colour at `:root` and override only
  what changes under `[data-theme="dark"]`.

### Don't
- Don't tint a result card warm because the assistant produced it.
- Don't use the agent colour for errors, warnings or success.
- Don't add a shadow to a JARVIS surface. Hierarchy is the surface ladder.
- Don't animate anything on mount or on scroll.
- Don't let the agent apply a change without an explicit, visible approval —
  the auto-apply setting exists, is off by default, and says so in the composer.
- Don't introduce a third accent. Two temperatures is the whole system.

## Deviations from the sources

- **Linear is a dark-only marketing system.** Cadence is a light-default product
  with a real dark theme, so the surface ladder is expressed through the app's
  existing tokens rather than Linear's near-black canvas.
- **Linear's display tracking** (-3.0px at 80px) belongs to a marketing page.
  The largest type here is 21px, so tracking tops out at -0.015em.
- **Claude's serif display and cream canvas are not used at all.** Importing
  them would have made the assistant a second product inside the first. Only the
  coral, and only the rule governing how scarcely to spend it, was taken.

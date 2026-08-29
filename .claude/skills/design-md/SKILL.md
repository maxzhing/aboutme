---
name: design-md
description: Design-system reference library of 74 DESIGN.md files extracted from real production websites (Linear, Superhuman, Stripe, Vercel, Notion, Raycast, Apple, Figma, Cal, Anthropic/Claude and more). Use when building or restyling any UI — a page, an app shell, a dashboard, a component — and you want it to follow a coherent, production-grade design language instead of ad-hoc choices. Also use when the user names a brand's look ("make it feel like Linear", "Superhuman-style"), asks for a DESIGN.md, or asks to make an interface look designed rather than generic.
---

# DESIGN.md — design systems as plain markdown

A `DESIGN.md` is a plain-text design system document that agents read to generate
consistent UI. It is the visual counterpart to `AGENTS.md`:

| File | Who reads it | What it defines |
|------|--------------|-----------------|
| `AGENTS.md` | Coding agents | How to build the project |
| `DESIGN.md` | Design agents | How the project should look and feel |

This skill vendors the [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)
collection: 74 DESIGN.md files reverse-engineered from real sites, each with exact
tokens (colors, type ramp, spacing, radii, elevation) plus prose rules explaining
*why* the system holds together.

## How to use it

1. **Pick a source system** that matches the product's job — not just its vibe.
   Look in `references/<name>/DESIGN.md`. See the index below.
2. **Read the whole file.** The YAML front matter carries the tokens; everything
   after the second `---` carries the rules, which are the part that actually
   makes output look designed. Skipping the prose gets you a palette, not a design.
3. **Port tokens into the project's own variable names.** Never hardcode hexes
   into components. If the project already has a token layer (CSS custom
   properties, Tailwind config), map into it rather than bolting a second one on.
4. **Obey the restraint rules, not just the values.** Most of these systems are
   defined by what they refuse: one chromatic accent, no decorative gradients,
   hairline borders instead of drop shadows, negative tracking only on display
   sizes. Copying the colors while ignoring the restraint produces the generic
   look the skill exists to avoid.
5. **State which system you used** and where you deviated, so the choice is
   reviewable.

## Choosing a source system

| If you're building… | Start from |
|---|---|
| A dense keyboard-driven productivity tool | `linear.app`, `superhuman`, `raycast`, `warp` |
| A calendar / scheduling surface | `cal`, `superhuman`, `notion` |
| A document or knowledge workspace | `notion`, `mintlify`, `sanity` |
| A developer platform or dashboard | `vercel`, `stripe`, `supabase`, `posthog`, `sentry`, `clickhouse` |
| An AI product surface | `claude`, `x.ai`, `mistral.ai`, `cohere`, `elevenlabs`, `together.ai`, `minimax` |
| Consumer / marketing / editorial | `airbnb`, `spotify`, `pinterest`, `theverge`, `wired`, `nike` |
| Fintech / trust-forward | `stripe`, `wise`, `revolut`, `coinbase`, `mastercard`, `kraken` |
| Something with physical-product gravity | `apple`, `tesla`, `bmw`, `ferrari`, `playstation`, `nintendo-2001` |

Mixing two systems works when one supplies structure and the other supplies a
single surface — e.g. Linear's surface ladder for the shell plus Superhuman's
command-surface rules for a palette. Mixing more than two reliably reads as noise.

## Full index

`references/` contains: airbnb, airtable, apple, binance, bmw, bmw-m, bugatti,
cal, claude, clay, clickhouse, cohere, coinbase, composio, cursor, dell-1996,
elevenlabs, expo, ferrari, figma, framer, hashicorp, hp, ibm, intercom, kraken,
lamborghini, linear.app, lovable, mastercard, meta, minimax, mintlify, miro,
mistral.ai, mongodb, nike, nintendo-2001, notion, nvidia, ollama, opencode.ai,
pinterest, playstation, posthog, raycast, renault, replicate, resend, revolut,
runwayml, sanity, sentry, shopify, slack, spacex, spotify, starbucks, stripe,
supabase, superhuman, tesla, theverge, together.ai, uber, vercel, vodafone,
voltagent, warp, webflow, wired, wise, x.ai, zapier.

## Writing a project DESIGN.md

When a project should keep a design language across many future sessions, distill
the chosen system into a `DESIGN.md` at the project root. Keep the same shape as
the references — YAML tokens first, then rules — but describe *this* product's
surfaces, not the source brand's marketing pages. A project DESIGN.md that just
restates the source file has not been written yet.

Upstream collection is MIT licensed; see `references/LICENSE.upstream`.

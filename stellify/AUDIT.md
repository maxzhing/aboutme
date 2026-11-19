# Stellify audit (Phase 0, 2026-11-19)

Read-only audit of `claude/sweet-gates-ev8uj4` at `a97c526`. Evidence: `npm run typecheck`, `npx vitest run`
(287 pass), `npm run build`, Playwright (27 pass, 5 skipped), the full axe audit (0 serious or critical issues on 38
routes in both themes), Lighthouse 13.4 (mobile), 40 screenshots (10 screens at 320, 390, 768 and 1280 px), and a bundle analysis.

## The facts that shape the plan

| Area | Finding | Evidence |
| --- | --- | --- |
| Speed | **Lighthouse mobile Performance 29.** First paint about 34 s on simulated slow 4G. The product is one 6.4 MB HTML file (2.2 MB gzipped) containing 4.9 MB of JS: question bank 838 KB, AP Calculus 566 KB, pdf.js 370 KB, Recharts 273 KB, KaTeX 264 KB. | Lighthouse JSON; esbuild metafile |
| Accessibility | Lighthouse a11y 100; axe 0 serious or critical on 38 routes; keyboard-only answering is tested; no horizontal overflow at 320 px. | e2e suite, screenshot script |
| SEO / Best practices | SEO 91 (no robots.txt); Best practices 100. | Lighthouse |
| Hosting | GitHub Pages builds from `main` (last deploy `cc73783`, 2026-07-03). The new app is not on `main`, so it is not live. There is no service worker or web manifest, so the reported "PWA" does not exist. The single file works offline because it is one file, not because of a PWA. | Actions run history; source grep |
| Browsers | Only Chromium is installed in this environment. Firefox, Safari and iOS cannot be tested here. | `/opt/pw-browsers` |

## Strong: keep it

- **Honest engine work.** Score estimates are ranges with a confidence level and are hidden until there are 20 first-try answers. Routing is checked by a 300-student simulation. Mastery needs consistency across days. Remix questions never count toward scores.
- **Already built, and mostly good:** wrong options tagged with misconceptions and a trap list in the Mistake Bucket (N1); a confidence check before checking an answer, which feeds spaced review (N2); three hint levels (N3); a study plan from a finished test (`analyzeTest` and `planFromTest`; this is the "Test Autopsy", N5); export/import plus automatic daily and safety backups (N9).
- Bluebook-style exam simulator, Desmos College Board calculators with an offline grapher fallback, an item-quality page (`/qc`), and a trademark disclaimer in `BRAND.disclaimer`.

## Broken or inconsistent

1. **"· 0%" inconsistency** (`pages/Learn.tsx:62`): accuracy shows only when a skill has answers, so an untouched skill shows nothing while an attempted one with no right answers shows "· 0%". Fix: a consistent "no answers yet" or "x of n right".
2. **Emoji as icons:** ⭐ in the Learn header and domain totals, 🔥🧠🎯🏟📝🧹 in quests and the dashboard, 🖼⚡✍⚔ in lesson chips, and about 110 emoji in lesson "tiles" (`visual-lessons.ts`, `courses-*.ts`). Screen readers announce them inconsistently, and they render differently on every phone.
3. **N4 "Gauntlet" is not interleaved retrieval.** It is "ten very hard questions" in the Battle Arena, with no skill coverage, no delay rule, and no link to stars.
4. **Straight quotes and hyphen ranges** throughout rendered copy ("25-150", "don't").
5. **No "N = next" shortcut and no shortcut cheat sheet.** A–D, F, H, Enter and the arrow keys work but are not discoverable.
6. **No teacher/class mode** (it was reported to exist; it does not).

## Generic, "template-looking"

- Violet primary on a lavender-white page, Inter on everything, a different accent per area (seven section colours plus six course colours), "glow" shadows (`shadow-glow`), `.glass` backdrop blur, rounded-everything (22–28 px cards), twinkling-star backdrop, and a mascot egg as the dashboard hero.
- The dashboard leads with streak, stardust and XP tiles (guilt and streak mechanics) instead of "what to do next."
- The answer to "what next?" is split across the dashboard Next-up card, the Learn "Next stop" card, the study plan and Smart Practice. They use different logic and give no reason.

## Inaccessible or at risk

- Colour-only state in places: the star rows (fill colour only), domain heatmap cells (number plus colour; acceptable) and the "Start" ring.
- Motion: the global twinkle and the "soft feel" ripples and springs follow reduced motion (verified in e2e), but they are decoration.

## Tech debt that blocks the plan

| Blocker | Why it matters | Plan |
| --- | --- | --- |
| One monolithic bundle; the store imports the whole question bank | No chance of a fast first paint on low-end Android | Add a hosted web build: a static landing page, code-split routes and a service worker. Keep the single-file offline build. |
| No storage schema migrations (`STATE_VERSION = 1`, merge only) | New Path, consent and lifecycle data need a versioned migration | Add a `migrate()` chain with tests, and make import go through the same migration |
| Item difficulty is author-tagged only | Psychometrics needs empirical difficulty with an author fallback | Item statistics module plus a lifecycle field |
| No first-attempt event view | Calibration and the fatigue curve need clean first attempts | Derive events from `attempts` and `mocks` (the data is already there, including per-question time in mocks) |
| Desmos is embedded as an iframe | Graph state cannot be read, so the Lab cannot validate a student's graph | Use the built-in grapher for validated exercises. The Desmos API needs a key (NEEDS-OWNER). |

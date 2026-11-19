# Needs the owner

Each item below has a placeholder, or a flag that is OFF by default. Nothing here blocks the build.

| # | What | Why it needs you | Where it waits |
| --- | --- | --- | --- |
| 1 | Real names (and roles) for the About page | Real people only; I will not invent names | `src/pages/Trust.tsx` About section shows "Names to be added by the owner" |
| 2 | Merge to `main` to go live | GitHub Pages publishes from `main`; I do not merge or open PRs without you | branch `claude/sweet-gates-ev8uj4` |
| 3 | Anonymous data collection (option A) | Needs a backend account (Cloudflare D1 or Supabase), a privacy review and a COPPA/FERPA review by someone qualified | `flags.collect = false`; no endpoint configured |
| 4 | College Scorecard API key (api.data.gov) | Free key, but it is yours to request; it is used only at build time and never shipped to browsers | `scripts/fetch-scorecard.mjs`; the school tool shows "score ranges not loaded yet" |
| 5 | Desmos API key | Desmos requires a key for its embeddable API (graph-state checking). The College Board testing calculators embedded today need no key | `flags.desmosApi = false`; the Lab validates on the built-in grapher instead |
| 6 | College Board facts marked NEEDS VERIFICATION | I could not open College Board pages from this environment. Every such fact has a source link and the label | test-day hub, Methodology |
| 7 | An AP or SAT teacher review of content | Original content has not been reviewed by an outside expert | README "Honest limits" |
| 8 | Field-test items | Mixing in unscored items only makes sense once new items exist in "pretest" | `flags.fieldTest = false` |

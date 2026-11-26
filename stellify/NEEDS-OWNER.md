# Owner checklist: animated lessons and AP Calculus (2026-11-26) — newest first

1. ~~Is GitHub Pages on for `maxzhing/satstudy`?~~ **Done:** you turned Pages off there (2026-11-26).
2. ~~circ-w1 approval~~ **Done:** you approved it (2026-11-26); it is live in Narrated lessons.
2b. **Listen** to the three pilot lessons and two of the re-voiced lessons on a phone (voice, pace, pronunciation).
3. **A math teacher** spot-checks every pilot solution; **an English teacher** confirms the Reading & Writing key
   (inf-w1, answer B and its three trap tags). The Critic gave inf-w1 SHIP pending exactly this; after the teacher
   agrees, set `"inf-w1": { "criticApproved": true }` in content/lessons/approvals.json.
4. **3–5 students** try a lesson on their own phones; note anything confusing.
5. **Check GitHub Pages / Firebase limits** for site size and bandwidth (could not be checked from here).
6. **Click through every skill page and play one lesson on a phone** after you merge.
7. **Watch the site's opening film on a real phone** (it plays muted, then asks: Google or guest). If it feels too long
   for repeat visitors, say so: it could play only on the first visit.
7. **AP Calculus sample questions (College Board):** they are in your private copy only, built on this machine and not
   pushed. Confirm item 1 (Pages off for satstudy), then ask for the push.
9. **Film soundtrack**: add your 15-second track (hit at 9.97 s, whooshes at 8.66 s and 9.80 s) with
   `ffmpeg -i stellify-flyover.mp4 -i track.mp3 -c:v copy -shortest out.mp4`.
8. **A calculus teacher** looks over the 30 new hard AP-style questions (src/data/calc/exam-style.ts): every key is
   checked numerically, but the trap explanations are teaching judgments.

# Needs the owner

Each item below has a placeholder, or a flag that is OFF by default. Nothing here blocks the build.

| # | What | Why it needs you | Where it waits |
| --- | --- | --- | --- |
| 1 | Real names (and roles) for the About page | Real people only; I will not invent names | `src/pages/Trust.tsx` About section shows "Names to be added by the owner" |
| 2 | Merge to `main` to go live | GitHub Pages publishes from `main`; I do not merge or open PRs without you | branch `claude/sweet-gates-ev8uj4` |
| 3 | Anonymous data collection (option A) | Needs a backend account (Cloudflare D1 or Supabase), a privacy review and a COPPA/FERPA review by someone qualified | `flags.collect = false`; no endpoint configured |
| 4 | College Scorecard API key (api.data.gov) | Free key, but it is yours to request; it is used only at build time and never shipped to browsers | `scripts/fetch-scorecard.mjs`; the school tool shows "score ranges not loaded yet" |
| 5 | Desmos API key | Desmos requires a key for its embeddable API (graph-state checking). The College Board testing calculators embedded today need no key | `flags.desmosApi = false`; the Lab validates on the built-in grapher instead |
| 6 | College Board facts marked NEEDS VERIFICATION | This session's network blocks satsuite.collegeboard.org. Your saved environment "Stellify (aboutme + satstudy)" allows it, but a session cannot switch to it while its name contains "(" or "+": rename it, or start the next session in it. Then set `verified` dates in `src/data/testDay.ts` after reading each page | test-day hub, Methodology |
| 7 | An AP or SAT teacher review of content | Original content has not been reviewed by an outside expert | README "Honest limits" |
| 8 | Field-test items | Mixing in unscored items only makes sense once new items exist in "pretest" | `flags.fieldTest = false` |

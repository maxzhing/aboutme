# Signal Ledger

A dual-horizon quantitative analysis desk. One self-contained HTML file — no build step, no
dependencies, no server. Open `index.html` in a browser, or serve the folder from GitHub Pages.

It implements the short-term and long-term algorithms, the risk rules, the sentiment layer and
the behaviour rules as an executable engine rather than as prose: every verdict prints the
readings and arithmetic that produced it.

## What it computes

**Short horizon — intraday to two weeks.** Eleven detectors run on every bar and each casts one
weighted vote: RSI(14) with swing divergence, MACD(12,26,9), slow Stochastic(14,3,3), ADX(14)
with ±DI, OBV slope, VWAP, volume spikes, MFI(14), Bollinger bandwidth, clustered swing
support/resistance, and candlestick patterns at those levels. Votes are aggregated, gated, and
turned into an entry, a stop, two targets, a size and an invalidation condition.

**Long horizon — one month to two years.** The fundamental rubric is scored exactly as specified
(raw −5…+7, mapped to ten points by `round(10 × (raw + 5) / 12)`, and that arithmetic is printed).
Fair value blends up to three methods — sector multiple, PEG-anchored, and a five-year DCF —
naming each method and its weight. Moat, valuation-vs-peers, institutional flows and a macro
overlay feed a recommended position size.

**Risk.** All seven hard rules are enforced, not just displayed: the 5% position cap and 25%
sector cap bind sizing, a 10% drawdown from peak halts new entries, correlated pairs above 0.85
are blocked, earnings inside five trading days halve the size, and stops cannot be widened —
an edit away from price is rejected at the input.

## Where it refuses to act

- Fewer than three aligned signals → **NO TRADE**
- Reward-to-risk below 2:1 at T1 → **NO TRADE**. T1 comes from the level stack or a volatility
  projection, never from a multiple of the risk — deriving the target from R would make the
  2:1 gate test its own output. There is a regression test for exactly this.
- ADX ≤ 25 strikes out every trend-following vote; only mean reversion survives, capped at
  confidence 6
- A move over 5% in one session with no pullback and no level to lean on → no chase
- Fundamental score under 5/10 → no accumulation, size prints 0%
- Anything you did not supply is reported **unknown** and scored zero. It is never invented.

## Data

Three sources, chosen in the **Data** tab:

| Source | Notes |
|---|---|
| **Simulated** | A seeded random walk with volatility clustering. Deterministic, and labelled as fiction everywhere it appears — it exists to exercise the engine, not to describe a company. |
| **CSV / paste** | `date, open, high, low, close, volume` in any order, oldest or newest first, comma or tab separated. Needs 40+ bars (ADX(14) alone consumes 28). |
| **Live API** | Alpha Vantage, Finnhub, or any CSV URL. Requires a page allowed to make network calls — served from GitHub Pages, a local server, or opened from disk. A published Artifact sandbox blocks outbound requests and the desk says so rather than showing stale numbers. |

Fundamentals, catalysts and sentiment are entered by hand in the **Inputs** tab. Nothing there
is fetched automatically.

## Output

The **Cycle Report** panel emits the full analysis as plain text or JSON for an executing bot to
consume. The **Spec** tab holds the operating spec with a one-click copy for the bot's system
prompt. The **Journal** persists trades to `localStorage` and exports CSV.

## Tests

The **Data** tab has an engine self-test — 32 assertions covering the indicator math against
hand-checked values (Wilder smoothing, the ADX warm-up index, degenerate flat tapes where a
naive RSI would return 100 and read as a short signal), the rubric mapping, position sizing,
and the reward-to-risk guard. Run it after any change.

## Caveats

This is analysis tooling, not advice. Every figure is derived from the data and estimates you
load into it; vendor data still carries gaps, splits and revisions the engine cannot see.
Indicator thresholds, the fair-value blend and the scoring rubric are conventions rather than
truths. Position-sizing arithmetic assumes your stop fills at your stop, which real markets do
not guarantee.

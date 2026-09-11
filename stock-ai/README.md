# Stock AI Analyzer

A browser app that pulls **real daily market data**, works out where a stock sits in
its own range, and tells you whether this is a low, whether it is high for what it is,
and whether to buy, sell or hold — with the price levels behind the call. A free AI
narrates and judges the numbers, and a **paper-money portfolio** trades its calls and
scores them afterwards, so the weights behind the next verdict are shaped by what
actually worked.

No build step, no server, no bundler. Open `index.html` (or the GitHub Pages URL) and
it runs. Everything is stored in your own browser.

---

## The question it is built to answer

> IREN is usually over 40. It's at 35. Is that low, and should I buy?

The app answers that literally, from the stock's own history:

> IREN at $35.10 is in the bottom 6% of its 1-year range, 22.1% below its typical price
> of $45.02, at or under the lower Bollinger band, RSI 31, oversold. It closed above
> $40.00 on 78% of the last year's sessions, and only 6% of that year was spent below
> today's price. The trend is intact, which is what makes this a dip rather than a decline.

and the other way round:

> At $52.40 it is in the top 4% of its 1-year range, 16.4% above its typical price,
> pinned to the upper Bollinger band, RSI 74. Historically, buying this name at this
> point of its range returned a median −5.3% over the next 20 sessions (n=53, 32%
> positive). This is high for what it is — its normal band is $38.20–$48.90.

Every number in those sentences is computed from real bars. Nothing is hand-waved.

---

## What it does

### Finds the lows, in the stock's own terms

- **Percentile of its own year** — how much of the last 252 sessions traded below today.
- **Typical price** — the 1-year median, and how far under (or over) it price sits.
- **The round number it usually trades above**, and what share of the year it held it.
  This is the "IREN is usually over 40" measure, made precise.
- **Distance from its own 50-day norm**, in standard deviations of that gap — so
  "stretched" means something measurable rather than a feeling.
- Oversold / overbought, band position, pullback depth from the 52-week high.

Two or more of those firing together is what makes the app say *this is a low*.

### Says when to buy, and at what price

Three tiered **buy zones** built from real levels — the lower quartile, the 50-day,
the lower Bollinger band, pivot lows, the 200-day, the cheapest decile — deduplicated,
ordered by price, and sized 40 / 35 / 25 so you scale in rather than lump in. Plus
targets, a stop placed under the nearest support and 2 ATR of noise, and the share
count that stop implies at your risk budget.

### Measures what this price level has actually paid

For every bar in the stock's history, the app works out which decile of its *then*
trailing year it was trading in, and what happened over the following 20 and 60
sessions. So "is this a good entry" becomes a measured question about this specific
stock. Out-of-sample by construction: each bar is only ever judged against prices that
came after it.

### Guards against the obvious ways this goes wrong

A value score on its own will happily buy every step of a collapse. Two gates sit
between the score and the verdict:

- **Falling knife** — cheap, in a downtrend, momentum still negative, no stabilisation.
  The verdict is downgraded and the app names the trigger that would change its mind
  (a close back above the 20-day, or a higher low holding).
- **Don't chase** — a strong uptrend stretched more than 2.3σ above its own 50-day
  mean with RSI over 75. Downgraded to hold, with the pullback level to wait for.

### Runs fake money, and learns from it

$100,000 of paper cash, positions at average cost, realised and unrealised P&L, an
equity curve, and a trade log with the reasoning attached to every fill. Fills pay
slippage, so the record is not flattering. **Autopilot** lets the AI execute its own
recommendation — inside the risk budget and position cap, which override anything the
model asks for.

Every call is written down with the price and the factor scores behind it. Once its
horizon has passed, the real price is fetched and the call is marked right or wrong
against a bar that scales with the stock's volatility *and* the length of the call.
Then two things happen:

1. **The weights move.** A signal that keeps pointing the wrong way gets scaled down;
   one that keeps being right gets scaled up. The engine consumes those multipliers
   directly, so the arithmetic behind the next verdict is literally different. A signal
   needs 5 opinionated calls before its weight moves at all and 12 before it moves fully.
2. **The AI reads its own record.** Every analysis is handed a journal: hit rate by call
   type, reliability per signal, calibration by the conviction it claimed, and how its
   past calls on *this* name turned out. It is told to lean on what has worked and say
   when it is doing so.

---

## The AI, and the credits

Two providers need **no API key at all**, so there is a working AI the moment you open
the page:

| Provider | Key? | Notes |
|---|---|---|
| **Pollinations** | none | Free community endpoint. The default. |
| **Puter.js** | none | Free credits per signed-in user; a sign-in window opens once. |
| OpenRouter | free key | Every model ending in `:free` costs nothing. |
| Groq | free key | Generous free tier, fastest of the options. |
| Google Gemini | free key | Free AI Studio key with a daily allowance. |
| Anthropic / OpenAI | paid key | Your own key, billed to you. |

If the chosen provider fails, the app falls back to the next keyless one and tells you
it did. If they all fail, **the analysis, the zones, the levels and the verdict are
still there** — they are computed in your browser and never needed the AI.

The **credits meter** in the header is your own local daily cap on AI calls (default
60), there so a free endpoint is not hammered by an accidental loop. It is not the
provider's limit; raise it in Settings. Real upstream rate limits are shown verbatim
when they happen.

Keys are kept in your browser's local storage and sent only to the provider they
belong to.

---

## Market data, and the CORS problem

Data comes from **Yahoo Finance** (full OHLCV, no key), **Stooq** (daily CSV, no key),
or — if you add a free key — Alpha Vantage, Twelve Data, Financial Modeling Prep or
Polygon.

The catch: browsers block cross-origin reads from most finance APIs, because those APIs
do not send CORS headers. The app tries direct first, then walks a chain of public CORS
relays, remembering whichever worked last. Public relays are rate-limited and come and
go, so there are three durable fixes, in order of preference:

**1. Add a free API key** (Settings → Market data). Keyed sources go direct and skip
relays entirely. This is the most reliable option and takes a minute.

**2. Run your own relay.** Twenty lines on Cloudflare Workers, free tier:

```js
export default {
  async fetch(request) {
    const target = new URL(request.url).searchParams.get('url');
    if (!target) return new Response('missing ?url=', { status: 400 });
    const allowed = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com', 'stooq.com'];
    const host = new URL(target).hostname;
    if (!allowed.includes(host)) return new Response('host not allowed', { status: 403 });

    const upstream = await fetch(target, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    });
  },
};
```

Deploy it, then paste `https://your-worker.workers.dev/?url=` into
Settings → *Your own CORS relay*.

**3. Paste the history in.** Connections → *Paste history instead*. Export daily bars
from Yahoo, Stooq or your broker as `Date,Open,High,Low,Close,Volume` and the full
analysis runs on them exactly as it does on live data.

The **Connections** tab probes every source, every relay and every AI provider from
your own browser and shows what worked, how fast, and why the rest failed.

---

## Using it

1. Type a ticker, press Enter.
2. Read the two callouts first — *is this a low* and *is it high for what it is*. They
   are the answer; everything below is the working.
3. Check the guards. If one fired, the app is telling you the price is right and the
   timing is not, and what to wait for.
4. Buy zones are tiers, not a single number. The first one is the shallowest dip.
5. Turn on **Autopilot** in Paper Portfolio if you want the AI to trade its own calls.
6. Come back later and press **Score matured calls**. That is when it learns.

Keyboard: `Enter` analyses, `↑`/`↓` move through the ticker suggestions, `Esc` closes them.

---

## Layout

```
stock-ai/
├── index.html          the shell
├── css/app.css         dark-first theme, light mode selected not inverted
└── js/
    ├── util.js         storage, formatting, quantiles, DOM helpers
    ├── indicators.js   SMA/EMA/RSI/MACD/Bollinger/ATR/stochastic/OBV/pivots
    ├── data.js         market data: sources, relay chain, cache, CSV ingest
    ├── engine.js       the analyzer — ranges, zones, guards, verdict
    ├── ai.js           providers, credit ledger, prompt, strict-JSON parsing
    ├── portfolio.js    paper cash, positions, fills, risk sizing
    ├── learning.js     prediction ledger, out-of-sample scoring, weights
    ├── chart.js        canvas charts, no chart library
    └── app.js          wiring and rendering
```

Plain ES modules. No dependencies, nothing to install, nothing to build.

---

## What it cannot do

It reads **price and volume**. That is all it reads. It does not know about earnings,
guidance, filings, dilution, debt, insiders, sector rotation or the news, and it will
not find out. A stock can be in the cheapest decile of its range because something
broke — the app cannot tell you which, only that the price is low and whether the trend
has stopped falling.

The forward-return study is a description of the past, on sample sizes that are often
small; the app shows you `n` every time precisely so you can discount it.

The portfolio is fake money. **None of this is financial advice.**

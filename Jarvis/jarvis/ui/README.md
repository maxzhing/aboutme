# `jarvis.ui` — Web chat interface

A single self-contained `index.html` chat app served by the REST server at `/`.

- **No external dependencies** — no CDN fonts, scripts, or styles — so it works
  offline and over a LAN.
- **Responsive** — one layout that adapts from phone to desktop.
- **Theme-aware** — follows the device's light/dark preference.
- Talks to the same server's `/ask`, `/status`, and `/remember` endpoints via
  same-origin `fetch` (no CORS).

Features: chat with the assistant, an expandable **reasoning trace** per reply,
a **Status** panel (provider/model, agent health + confidence, memory counts,
tools), and a **Remember** action to teach it a fact.

`index_html()` returns the page; the server reads it fresh each request so edits
show on reload during development. Run it with `jarvis-serve` (see the top-level
[README](../../README.md#use-it-on-your-computer-and-phone)).

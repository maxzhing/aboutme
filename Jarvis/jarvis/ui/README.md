# `jarvis.ui` — JARVIS HUD web interface

A single self-contained `index.html` served by the REST server at `/`. Dark,
futuristic HUD with a **voice-reactive reactor orb**; no external dependencies
(no CDN fonts/scripts/styles), so it works offline and over a LAN. Responsive
and theme-aware (light/dark follow the device).

## Features

- **Chat** with an expandable per-reply reasoning trace.
- **Voice in** — tap the orb or 🎙 to speak (browser `SpeechRecognition`);
  the orb pulses green while listening.
- **Voice out** — the 🔊 toggle reads replies aloud (`speechSynthesis`); the
  orb pulses while speaking.
- **Shell output** — `!command` replies render in a terminal-style bubble.
- **Status** panel — provider/model, full-access state, agent health +
  confidence, memory counts, tools.
- **Remember** — teach it a fact.
- **Token auth** — reads `?token=…` from the URL and sends it as
  `X-Jarvis-Token` on every request, for remote full-access mode.

Talks to same-origin `/ask`, `/status`, `/remember` (no CORS).

## Voice browser notes

The Web Speech API is built into the browser, so there's nothing to install.
Coverage: Chrome/Edge (desktop + Android) and Safari (macOS + iOS). Speech
**recognition** often requires a secure context — it works on `localhost` and
over `https`, but some browsers block it on a plain `http://<LAN-ip>` origin.
If the mic doesn't start on your phone, either use it on the computer, or put
the server behind `https` (a reverse proxy / tunnel). Text and voice *output*
work everywhere.

`index_html()` returns the page; the server reads it fresh each request so
edits show on reload during development.

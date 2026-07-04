# Full-Access Mode & Computer Control

Full-access mode is the "give JARVIS my whole computer" switch. It is **off by
default** and every dangerous capability stays inert until you opt in.

## What it enables

| Tool | Permission | Off by default | In full-access |
|------|-----------|----------------|----------------|
| `system_info` | `system.read` | ✅ available (read-only, safe) | ✅ available |
| `shell` | `shell.exec` | present but **disabled** | **enabled**, runs through a real shell (pipes, `&&`, redirects, globbing) |
| `open_app` | `desktop.control` | present but **disabled** | **enabled**, launches apps/files/URLs with the OS default handler |

Enable it:

```bash
jarvis-serve --full-access            # localhost
jarvis-serve --host 0.0.0.0 --full-access   # + your phone (token required)
```

Or in code: `Jarvis(full_access=True)`.

## Two ways to drive the computer

1. **Direct commands** — any message starting with `!` runs immediately as a
   shell command: `!ls -la`, `!git log --oneline -5`, `!df -h | sort`. This
   works even with the offline Echo model, so control is tangible with no
   external dependencies.
2. **Agentic** — a natural-language goal goes through the full plan→execute
   loop. With a **real model** (Claude, GPT, or a local Ollama model) the
   Executor agent chooses tools on its own. Point at one with
   `JARVIS_LLM__PROVIDER` / `JARVIS_LLM__MODEL`.

## The safe-vs-real shell distinction

The shell tool has two modes, chosen automatically:

- **Default / config-`allow_shell`** → argv mode (`shell=False`, `shlex`-split).
  Immune to shell-injection, but no pipes or chaining.
- **Full-access** → real shell (`shell=True`). Full power, because in this mode
  you have *deliberately* handed over control. Commands still run with a
  timeout and captured output.

## Security model

Handing an agent your shell is powerful and dangerous. The guardrails:

- **Opt-in only.** No flag → no shell, no app-launch. The tools refuse to run.
- **Localhost is unauthenticated but unreachable.** Bound to `127.0.0.1`,
  nothing but your own machine can connect, so no token is needed.
- **Remote requires a token.** The instant the bind address is non-local
  *and* full-access is on, the server generates a `secrets.token_urlsafe`
  token. Every action/data endpoint (`/ask`, `/remember`, `/status`) checks it
  with `hmac.compare_digest`; the static UI page is the only unauthenticated
  route (so it can load and then present the token from its URL). The startup
  banner prints the exact `http://<ip>:<port>/?token=…` link to open.
- **Filesystem tools stay sandboxed** to their workspace root regardless of
  mode — full-access widens *shell*, not the sandboxed file tools.

### What this does NOT protect against

- A malicious command you (or a compromised model) actually ask it to run.
  Treat full-access like your own terminal.
- Public-internet exposure. The token defends a home LAN; for anything
  internet-facing put real authentication and TLS (a reverse proxy) in front,
  and consider running inside the provided Docker container or a VM.
- Anyone who obtains the token URL. It is a bearer secret — only open it on
  your own device.

## Recommended posture

- Everyday use: `jarvis-serve` (localhost, no full-access).
- Phone as a remote for your computer: `jarvis-serve --host 0.0.0.0
  --full-access`, open the tokenized link on your phone, keep both on your home
  Wi-Fi.
- Untrusted network or exposure: don't — or wrap it in your own auth/TLS.

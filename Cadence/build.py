#!/usr/bin/env python3
"""Assemble Cadence + JARVIS into one self-contained HTML file.

Cadence ships as a single file with its modules concatenated behind section
banners. This script keeps that shape: it splices the JARVIS stylesheet into
the existing <style> block, the JARVIS modules in ahead of js/app.js, and
applies a short list of surgical patches to the shell so the assistant is
reachable from the sidebar, the top bar, the command palette and the keyboard.

Every patch asserts that it matched. A silent no-op would ship a file that
looks right and is missing a seam, so a failed anchor is a hard error.
"""

from __future__ import annotations

import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
JARVIS = SRC / "jarvis"
OUT = ROOT.parent / "cadence-jarvis.html"

JS_MODULES = [
    "01-core.js",
    "02-memory.js",
    "03-tools.js",
    "04-domain.js",
    "05-scheduler.js",
    "06-projects.js",
    "07-optimize.js",
    "07b-goals.js",
    "07c-ideas.js",
    "08-toolbelt.js",
    "09-reasoner.js",
    "09b-edits.js", "09c-slots.js",
    "10-converse.js",
    "11-voice.js",
    "12-agents.js",
    "13-orchestrator.js",
    "14-assistant.js",
    "15-ui.js",
]

BANNER = """

/* ========================================================================
   {name}
   ======================================================================== */
"""

# Files 15-ui.js and jarvis.css carry their own banner already.
SELF_BANNERED = {"15-ui.js"}


class PatchError(RuntimeError):
    pass


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise PatchError(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)


def build() -> str:
    html = (SRC / "cadence.html").read_text(encoding="utf-8")

    # ---------------------------------------------------------------- css
    css = (JARVIS / "jarvis.css").read_text(encoding="utf-8")
    html = replace_once(html, "\n  </style>", "\n" + css + "\n  </style>", "css insert")

    # ----------------------------------------------------------- js modules
    bundle_parts = []
    for name in JS_MODULES:
        body = (JARVIS / name).read_text(encoding="utf-8")
        if name in SELF_BANNERED:
            bundle_parts.append("\n" + body)
        else:
            label = "js/jarvis/" + name.split("-", 1)[1]
            bundle_parts.append(BANNER.format(name=label) + body)
    bundle = "\n".join(bundle_parts)

    app_marker = (
        "/* ========================================================================\n"
        "   js/app.js"
    )
    html = replace_once(html, app_marker, bundle + "\n\n" + app_marker, "js insert")

    # -------------------------------------------------------------- routes
    html = replace_once(
        html,
        "    { id: 'planning', label: 'Planning', icon: 'compass', view: 'planning' },",
        "    { id: 'planning', label: 'Planning', icon: 'compass', view: 'planning' },\n"
        "    { id: 'jarvis', label: 'JARVIS', icon: 'sparkle', view: 'jarvis' },",
        "route",
    )

    # ------------------------------------------------------------- top bar
    html = replace_once(
        html,
        """      D.h('button.btn.btn--ghost.btn--sm.topbar__whatnow', {
        type: 'button', onclick: function () { UI.whatNowDialog(); },
        title: 'What should I do now? (G)'
      }, [D.icon('compass', 15), D.h('span.topbar__label', { text: 'What now?' })]),""",
        """      D.h('button.btn.btn--ghost.btn--sm.topbar__whatnow', {
        type: 'button', onclick: function () { UI.whatNowDialog(); },
        title: 'What should I do now? (G)'
      }, [D.icon('compass', 15), D.h('span.topbar__label', { text: 'What now?' })]),
      D.h('button.btn.btn--ghost.btn--sm.topbar__jarvis', {
        type: 'button', onclick: function () { UI.jarvis(); },
        title: 'Ask JARVIS (J)'
      }, [D.icon('sparkle', 15), D.h('span.topbar__label', { text: 'JARVIS' })]),""",
        "topbar button",
    )

    # --------------------------------------------------------------- icons
    # Cadence's set has no microphone or speaker, and a lightning bolt on the
    # mic button reads as "fast", not "talk".
    html = replace_once(
        html,
        "    more: '<circle cx=\"5\" cy=\"12\" r=\"1.6\"/>",
        "    mic: '<rect x=\"9\" y=\"3\" width=\"6\" height=\"11\" rx=\"3\"/>"
        "<path d=\"M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6\"/>',\n"
        "    speaker: '<path d=\"M4 9v6h4l5 4V5L8 9H4z\"/><path d=\"M16.5 8.5a5 5 0 0 1 0 7\"/>',\n"
        "    speakerOff: '<path d=\"M4 9v6h4l5 4V5L8 9H4z\"/><path d=\"M17 10l4 4M21 10l-4 4\"/>',\n"
        "    more: '<circle cx=\"5\" cy=\"12\" r=\"1.6\"/>",
        "icons",
    )

    # ------------------------------------------------------------ keyboard
    html = replace_once(
        html,
        "      case 'g': e.preventDefault(); UI.whatNowDialog(); return;",
        "      case 'g': e.preventDefault(); UI.whatNowDialog(); return;\n"
        "      case 'j': e.preventDefault(); UI.jarvis(); return;",
        "keyboard",
    )

    html = replace_once(
        html,
        "      ['G', 'What should I do now?'],",
        "      ['G', 'What should I do now?'],\n      ['J', 'Ask JARVIS'],",
        "shortcut table",
    )

    # -------------------------------------------------------------- palette
    html = replace_once(
        html,
        "      { id: 'what-now', label: 'What should I do now?', icon: 'compass', shortcut: 'W', "
        "run: function () { UI.whatNowDialog(); } },",
        "      { id: 'what-now', label: 'What should I do now?', icon: 'compass', shortcut: 'W', "
        "run: function () { UI.whatNowDialog(); } },\n"
        "      { id: 'jarvis', label: 'Ask JARVIS', hint: 'Plan, schedule and review in plain language', "
        "icon: 'sparkle', shortcut: 'J', run: function () { UI.jarvis(); } },\n"
        "      { id: 'jarvis-optimize', label: 'Optimize my schedule', hint: 'Find conflicts, overloads and gaps', "
        "icon: 'zap', run: function () { UI.jarvis('optimize my schedule this week'); } },\n"
        "      { id: 'jarvis-brief', label: 'Morning briefing', hint: 'Today, what matters, and free time', "
        "icon: 'sun', run: function () { UI.jarvis('give me my morning briefing'); } },\n"
        "      { id: 'jarvis-project', label: 'Plan a project', hint: 'Turn a deadline into scheduled sessions', "
        "icon: 'target', run: function () { UI.jarvis(); } },\n"
        "      { id: 'jarvis-review', label: 'How did I do today?', icon: 'chart', "
        "run: function () { UI.jarvis('how did I do today'); } },\n"
        "      { id: 'jarvis-plan', label: 'JARVIS: plan my day', icon: 'sparkle', "
        "run: function () { UI.jarvis('plan my day'); } },\n"
        "      { id: 'jarvis-overdue', label: 'JARVIS: what is overdue?', icon: 'alert', "
        "run: function () { UI.jarvis('what is overdue'); } },",
        "palette",
    )

    # ----------------------------------------------------------------- boot
    html = replace_once(
        html,
        "    startReminders();",
        "    JV.boot();\n"
        "    if (S.settings().jarvisDockOpen) UI.toggleJarvisDock(true);\n\n"
        "    startReminders();",
        "boot",
    )

    # ----------------------------------------------------------- metadata
    html = replace_once(
        html,
        "<title>Cadence</title>",
        "<title>Cadence · JARVIS</title>",
        "title",
    )
    html = replace_once(
        html,
        'content="Cadence — a calendar, task manager, notebook and planning assistant that work as one system.">',
        'content="Cadence — a calendar, task manager and notebook with JARVIS, an agent that plans '
        'before it acts and never changes anything without asking.">',
        "description",
    )

    return html


def main() -> int:
    try:
        html = build()
    except PatchError as exc:
        print(f"build failed: {exc}", file=sys.stderr)
        return 1
    OUT.write_text(html, encoding="utf-8")
    kb = len(html.encode("utf-8")) / 1024
    print(f"wrote {OUT} ({kb:.0f} KB, {html.count(chr(10)) + 1} lines)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

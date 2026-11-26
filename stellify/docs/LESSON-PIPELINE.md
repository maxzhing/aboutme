# Lesson pipeline

**Add a lesson**
1. `content/lessons/<skill>/<id>/problem.json`: the problem, the key, machine-checkable steps and facts, the trap
   (wrong answer + misconception tag from the course's traps or the R&W trap codes), and every distractor's reason.
2. `content/lessons/<skill>/<id>/scene.json`: narration (`say`, one sentence group per beat) and scene directives:
   `passage` (marks `{{text|tone|label}}`), `pause` (try it first), `tiles`, `morph` (steps as `[key, LaTeX]` tokens;
   `verify.over` names the variable), `lines`, `plot` (`expr` lines carry the `check` equation they must lie on),
   `choices`, `versus`, `recap`. Follow the anatomy: hook → pause → read like the test-writer → plan → solve → trap
   → check → pattern card (the player adds the end card).
3. Register it in `src/data/narrated/content.ts`.
4. Build: `PYTHON=<venv>/bin/python KOKORO_DIR=<dir with model.onnx + voices.npz> node scripts/lessons/build.mjs`.
   It verifies (a failure stops everything), lints, voices only changed lessons, encodes, and writes manifests.
5. Review: the Critic's SHIP verdict is recorded in `content/lessons/approvals.json`. Until then the lesson is only
   visible with `?preview=1`.

**Swap the voice**: `VOICE=af_heart node scripts/lessons/build.mjs` with `FORCE_ENCODE=1` after clearing
`.lesson-cache/wav/timing.json` (every lesson is then re-voiced). Human recordings: see RECORDING-GUIDE.md.

**Tools (pinned)**: `scripts/lessons/requirements.txt` (kokoro-onnx 0.6.1, onnxruntime 1.32.0, sympy 1.14.0,
antlr4 4.11.1, soundfile 0.14.0), FFmpeg 6.1, Node 22. Kokoro model: onnx-community/Kokoro-82M-v1.0-ONNX
(`onnx/model.onnx`, `voices/am_michael.bin`; pack voices with numpy into `voices.npz`, see scripts/videos/README.md).

**Test**: `python scripts/lessons/test_verify.py content/lessons` (the verifier must catch 20 broken lessons),
`npx vitest run tests/videos.test.ts`, `npx playwright test e2e/web.spec.ts --trace off`.

**Outputs**: `../sat/videos/lessons/<id>.mp3` (kept by the web build, never precached), `src/data/narrated/manifests.json`.

# Environment (probed 2026-11-26, cloud sandbox)

| Item | Result |
|---|---|
| OS / CPU / RAM / disk | Linux 6.18, 4 cores, 15 GB RAM, 57 GB free |
| Python / pip | 3.13.18, pip works (venv) |
| Node / npm | 22.23.5 / 10.9.9 |
| apt-get | works (OpenJDK present) |
| PyPI, npm registry | reachable |
| Hugging Face (huggingface.co + its CDN hosts) | reachable (hosts added to this environment's allow-list on 2026-11-22) |
| GitHub release downloads, github.com pages other than this repo's API | blocked (403), e.g. greensock/gsap-skills |
| docs.github.com, *.github.io | blocked: GitHub Pages limits and the live site cannot be checked from here |
| FFmpeg | 6.1.1 present (libx264, AAC, MP3 via libmp3lame) |
| Headless Chromium (Playwright) | launches; WebGL2 works through software rendering (SwiftShader), no GPU |
| TTS | Kokoro-82M v1.0 (ONNX) runs on CPU through kokoro-onnx 0.6.1 + onnxruntime 1.32: about 4 s of speech per second of compute on 4 cores |
| SymPy | installable from PyPI |

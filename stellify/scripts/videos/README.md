# Rendering the video lessons

The 30 SAT video lessons are MP4 files made from the scripts in `src/data/videos/` (math.ts, rw.ts). After changing a
script, re-render that video so the file, its timing and its captions match again.

1. Voice: one-time setup, then voice the videos (Kokoro, open weights, Apache-2.0; voice `am_michael`).

       python3 -m venv venv && ./venv/bin/pip install kokoro-onnx soundfile
       # from https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX: onnx/model.onnx and voices/am_michael.bin;
       # pack the voice: np.savez('voices.npz', am_michael=np.fromfile('am_michael.bin', np.float32).reshape(-1, 1, 256))
       npx tsx scripts/videos/dump.ts shots.json
       ./venv/bin/python scripts/videos/voice.py shots.json model.onnx voices.npz audio am_michael [skill,...]

2. Film: `npm run build:fast`, then (real time, about as long as the videos; keep the machine otherwise idle)

       node scripts/videos/render.mjs dist/stellify.html audio public/videos [skill,...]

3. Copy `audio/timing.json` to `src/data/videos/timing.json` (the app uses it for captions, chapters and the
   pause-and-try stops), then `npm run build:web`, which copies `public/videos/` to `../sat/videos/`.

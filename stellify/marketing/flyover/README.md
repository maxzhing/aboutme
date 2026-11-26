# Landing page fly-over film (14.5 s, 60 fps; 1920 × 1080 for computers, 1080 × 1920 for phones)

The landing page plays the film full screen: `sat/videos/flyover.mp4` (wide) or `flyover-tall.mp4` (tall), picked by
the screen's shape, and cropped to fill it. `film.html?w=…&h=…` renders any frame size: the lens and end card scale
so the flight shows as much of the page across as the 1440 × 1152 design frame did; on tall frames a lens shift keeps
the page in the middle during the flight, and the end card sits in the top 62 % so the sign-in card covers nothing.

Re-render (2026-11-26): `node run_capture.js` (serves /home/user so the page is at /aboutme/sat/, hides the film
section, writes layers/), then `PORT=8101 node render.js flyover-wide.mp4 1920 1080` and
`PORT=8102 node render.js flyover-tall.mp4 1080 1920` (they can run at the same time). `node probe2.js <dir> <w> <h>
<t,t,…>` renders a few frames to check a size quickly.

## Original notes (first render, 1440 × 1152)

1. Build and serve the site (`npm run build:web`, then serve `../sat` so the landing page is at
   `http://127.0.0.1:8098/aboutme/sat/`), then `node capture.js layers` (page + every `data-layer` piece + layout.json).
2. `npm install geist@1.3.1 @fontsource/instrument-serif@5.1.1` here (both OFL-1.1), render the logo to
   `layers/logo.png` (512 px, from `public/landing/logo-star.svg`), and `node serve.js` (port 8097).
3. `node render.js stellify-flyover.mp4`.

**As rendered here (2026-11-26):** software WebGL (SwiftShader, no GPU) at about 2.5 s a frame, so 4 motion-blur
subframes instead of 16 and 24 depth-of-field taps instead of 40. On a computer with a GPU, change
`seek(t, 60, 4)` to `seek(t, 60, 16)`, the `TAPS` constant to 40, and launch Chromium with
`--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist` (Windows) or the default (Mac/Linux with a GPU).
The landing page is 2,208 px tall, much shorter than the brief assumed, so the cruise speed is solved to reach the
footer at 8.0 s (about 270 page px/s instead of 770). No soundtrack yet (the owner will supply one); the brief's
hit at 9.97 s and whooshes at 8.66 s and 9.80 s are the places to put it. The optical-flow check of the glide was not
run; the camera's speed and distance come from one integrated speed curve and a monotone ease, by construction.

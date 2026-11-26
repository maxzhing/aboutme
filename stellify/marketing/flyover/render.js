try { require('./serve.js'); } catch (e) { /* already served */ }
// Renders the film: every frame from seek(t) at 60 fps (4 motion-blur subframes across 0.7 of a frame), piped to ffmpeg.
const { chromium } = require('playwright'); const { spawn } = require('child_process');
// node render.js <out.mp4> [w] [h]   (serves this folder itself on the port given by PORT, default 8097)
const out = process.argv[2], w = +(process.argv[3] || 1440), h = +(process.argv[4] || 1152), fps = 60, dur = 14.5, n = Math.round(dur * fps);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(`http://127.0.0.1:${process.env.PORT || 8097}/film.html?w=${w}&h=${h}`); await p.waitForFunction(() => window.ready, null, { timeout: 120000 });
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((ok) => ff.on('close', ok));
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await p.evaluate((t) => window.seek(t, 60, 4), i / fps);
    const jpg = await p.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 60 === 0) console.log(`frame ${i}/${n}, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  ff.stdin.end(); await done; await b.close(); console.log('done', out); process.exit(0);
})();

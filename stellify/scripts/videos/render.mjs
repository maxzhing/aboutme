/**
 * Films each video lesson into an MP4. It opens the app's hidden render page (/videos/render/<skill>) in headless
 * Chromium, plays the shots in real time at the moments voice.py laid out (so every animation runs exactly as it does
 * in the app), records the browser's own screen stream with each frame's timestamp, and lets ffmpeg turn the frames
 * into a steady 30 frames a second and join them with the voice track.
 *
 *   node render.mjs <app.html> <audio-dir with <skill>.wav and timing.json> <out-dir> [skills,...]
 */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const [app, audioDir, outDir, only] = process.argv.slice(2);
const timing = JSON.parse(readFileSync(join(audioDir, 'timing.json'), 'utf8'));
const skills = only ? only.split(',') : Object.keys(timing);
mkdirSync(outDir, { recursive: true });
const url = `file://${resolve(app)}`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
{ // skip the first-visit setup once; the choice is kept in this context's storage
  const p = await ctx.newPage();
  await p.goto(`${url}#/onboarding`);
  await p.getByRole('button', { name: 'Skip setup' }).click();
  await p.close();
}

for (const skill of skills) {
  const t = timing[skill];
  if (!t) throw new Error(`no timing for ${skill}`);
  const work = mkdtempSync(join(tmpdir(), `video-${skill}-`));
  const page = await ctx.newPage();
  await page.goto(`${url}#/videos/render/${skill}`);
  await page.waitForSelector('[data-testid="video-frame"]');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);

  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const file = join(work, `f${String(frames.length).padStart(6, '0')}.jpg`);
    writeFileSync(file, Buffer.from(data, 'base64'));
    frames.push({ file, ts: metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1 });
  await page.waitForTimeout(300);
  // start the timeline inside the page, so shot changes are timed by the page's own clock
  const t0 = await page.evaluate((starts) => {
    const base = performance.now();
    starts.forEach((s, i) => setTimeout(() => window.__shot(i), s * 1000));
    return (performance.timeOrigin + base) / 1000;
  }, t.starts);
  await page.waitForTimeout(t.duration * 1000 + 400);
  await cdp.send('Page.stopScreencast');
  await page.close();

  // a concat list: each frame is shown until the next one arrives; the first frame covers the lead-in
  const usable = frames.filter((f, i) => i === frames.length - 1 || frames[i + 1].ts > t0);
  const list = [];
  for (let i = 0; i < usable.length; i++) {
    const from = Math.max(usable[i].ts, t0) - t0;
    const to = i + 1 < usable.length ? usable[i + 1].ts - t0 : t.duration;
    if (to <= from) continue;
    list.push(`file '${usable[i].file}'`, `duration ${(to - from).toFixed(4)}`);
  }
  list.push(`file '${usable[usable.length - 1].file}'`);
  writeFileSync(join(work, 'list.txt'), list.join('\n'));
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(work, 'list.txt'), '-i', join(audioDir, `${skill}.wav`),
    '-map', '0:v', '-map', '1:a', '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', '26',
    '-c:a', 'aac', '-b:a', '80k', '-ac', '1', '-t', String(t.duration), '-movflags', '+faststart', join(outDir, `${skill}.mp4`)]);
  // the poster: the title card, once it has faded in
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-ss', '2.5', '-i', join(outDir, `${skill}.mp4`), '-frames:v', '1', '-q:v', '4', join(outDir, `${skill}.jpg`)]);
  rmSync(work, { recursive: true, force: true });
  console.log(`${skill}: ${t.duration.toFixed(1)} s, ${frames.length} frames captured`);
}
await browser.close();

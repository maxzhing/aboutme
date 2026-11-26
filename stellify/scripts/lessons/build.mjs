/**
 * Builds the animated lessons: one command, only changed lessons are re-voiced.
 *
 *   PYTHON=<venv>/bin/python KOKORO_DIR=<dir with model.onnx and voices.npz> node scripts/lessons/build.mjs
 *
 * 1. verify the math (scripts/lessons/verify.py) and that the verifier catches broken lessons (test_verify.py)
 * 2. lint the narration (scripts/videos/lint.ts)
 * 3. dump every lesson's timeline (scripts/lessons/dump.ts); lessons whose narration hash changed are re-voiced
 *    (scripts/videos/voice.py; human recordings in content/recordings/<id>/<NNN>.wav replace generated lines)
 * 4. encode: mono MP3, 48 kbps, loudness -16 LUFS / -1.5 dBTP, into ../sat/videos/lessons/<id>.mp3
 * 5. write src/data/narrated/manifests.json (duration, cue offsets, size, sha256, voice). Approval is NOT set here:
 *    it lives in content/lessons/approvals.json, changed only after a Critic SHIP verdict.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), app = resolve(here, '../..');
const PY = process.env.PYTHON ?? 'python3', KOKORO = process.env.KOKORO_DIR, VOICE = process.env.VOICE ?? 'am_michael';
const cache = join(app, '.lesson-cache'), out = resolve(app, '../sat/videos/lessons');
mkdirSync(cache, { recursive: true }); mkdirSync(out, { recursive: true });
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', cwd: app, ...opts });

console.log('1. verify'); run('npx', ['tsx', 'scripts/lessons/tags.ts', 'content/lessons/misconceptions.json']); run(PY, ['scripts/lessons/verify.py', 'content/lessons']); run(PY, ['scripts/lessons/test_verify.py', 'content/lessons'], { stdio: 'ignore' });
console.log('2. lint'); run('npx', ['tsx', 'scripts/videos/lint.ts']);
console.log('3. voice'); run('npx', ['tsx', 'scripts/lessons/dump.ts', join(cache, 'shots.json')]);
const lessons = JSON.parse(readFileSync(join(cache, 'shots.json'), 'utf8'));
const manifestFile = join(app, 'src/data/narrated/manifests.json');
const manifests = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : {};
const stale = Object.keys(lessons).filter((id) => process.env.FORCE_ENCODE || manifests[id]?.scriptHash !== lessons[id].hash || !existsSync(join(out, `${id}.mp3`)));
const needVoice = stale.filter((id) => !(existsSync(join(cache, 'wav', `${id}.wav`)) && JSON.parse(readFileSync(join(cache, 'wav', 'timing.json'), 'utf8'))[id]?.hash === lessons[id].hash));
if (needVoice.length) {
  if (!KOKORO) throw new Error(`KOKORO_DIR is needed to voice: ${needVoice.join(', ')}`);
  run(PY, ['scripts/videos/voice.py', join(cache, 'shots.json'), join(KOKORO, 'model.onnx'), join(KOKORO, 'voices.npz'), join(cache, 'wav'), VOICE, needVoice.join(',')], { env: { ...process.env, RECORDINGS: join(app, 'content/recordings') } });
  const tf = join(cache, 'wav', 'timing.json'), tm = JSON.parse(readFileSync(tf, 'utf8'));
  for (const id of needVoice) tm[id].hash = lessons[id].hash;
  writeFileSync(tf, JSON.stringify(tm, null, 1));
}
console.log(`4. encode (${stale.length} changed)`);
const timing = JSON.parse(readFileSync(join(cache, 'wav', 'timing.json'), 'utf8'));
for (const id of stale) {
  // two-pass loudness normalization: measure, then apply exactly (one pass undershoots on speech with long pauses
  // and can overshoot the peak once encoded); -2 dBTP leaves room for MP3 encoding
  const wav = join(cache, 'wav', `${id}.wav`);
  const measured = JSON.parse(/\{[\s\S]*\}/.exec(execFileSync('sh', ['-c', `ffmpeg -hide_banner -i "${wav}" -af loudnorm=I=-16:TP=-2:LRA=11:print_format=json -f null - 2>&1`], { encoding: 'utf8' }))[0]);
  // then a peak limiter at -2.5 dBFS so the encoded MP3 stays under -1.5 dBTP
  const af = `loudnorm=I=-16:TP=-2:LRA=11:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true,alimiter=limit=0.66:level=false`;
  // measure the encoded file's true peak; if MP3 overshoot put it above -1.5 dBTP, lower the level by the excess
  const truePeak = () => Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(execFileSync('sh', ['-c', `ffmpeg -hide_banner -i "${join(out, `${id}.mp3`)}" -af ebur128=peak=true -f null - 2>&1 | tail -3`], { encoding: 'utf8' }))?.[1] ?? 0);
  let gain = 0;
  for (let k = 0; k < 4; k++) {
    run('ffmpeg', ['-loglevel', 'error', '-y', '-i', wav, '-af', `${af},volume=${gain.toFixed(2)}dB`, '-ar', '24000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '48k', join(out, `${id}.mp3`)]);
    const tp = truePeak(); if (tp <= -1.5) break; gain -= tp + 1.5 + 0.2;
  }
  const mp3 = readFileSync(join(out, `${id}.mp3`));
  manifests[id] = { id, skill: lessons[id].skill, kind: lessons[id].kind, voice: `Kokoro-82M v1.0 · ${VOICE} (computer-generated)`, duration: timing[id].duration, starts: timing[id].starts,
    audio: `videos/lessons/${id}.mp3`, bytes: mp3.length, sha256: createHash('sha256').update(mp3).digest('hex'), scriptHash: lessons[id].hash, captions: 'from the script (same cue offsets)', transcript: 'from the script', built: new Date().toISOString().slice(0, 10) };
}
writeFileSync(manifestFile, JSON.stringify(manifests, null, 1));
const total = Object.values(manifests).reduce((n, m) => n + m.bytes, 0);
console.log(`5. ${Object.keys(manifests).length} lessons, audio ${(total / 1024 / 1024).toFixed(1)} MB in all, largest ${(Math.max(...Object.values(manifests).map((m) => m.bytes)) / 1024).toFixed(0)} KB`);

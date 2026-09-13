/* Cadenza — onset detection.
 *
 * Onsets carry the rhythm, and they are the only way to tell a repeated note
 * from one long one, so they are detected on their own short-window analysis
 * where timing is sharp, independently of the pitch analysis.
 */

import { stft, movingMedian } from './dsp.js';

/**
 * Spectral flux: how much energy appeared since the previous frame.  Only
 * increases count, so a note dying away does not read as an attack.
 */
export function spectralFlux(frames) {
  const flux = new Float32Array(frames.length);
  for (let t = 1; t < frames.length; t++) {
    const a = frames[t - 1];
    const b = frames[t];
    let sum = 0;
    for (let k = 0; k < b.length; k++) {
      const d = b[k] - a[k];
      if (d > 0) sum += d;
    }
    flux[t] = sum;
  }
  return flux;
}

/**
 * Find onsets in a signal.
 * `sensitivity` scales the threshold: higher finds more (and riskier) attacks.
 * Returns [{ time, strength }].
 */
export function detectOnsets(samples, {
  sampleRate = 44100, size = 1024, hop = 256, sensitivity = 1,
  minGap = 0.085,
} = {}) {
  const spec = stft(samples, { size, hop, sampleRate });
  if (spec.frames.length < 3) return { onsets: [], flux: new Float32Array(0), spec };

  const flux = spectralFlux(spec.frames);
  /* Normalise so the threshold means the same thing at any recording level. */
  let peak = 0;
  for (const v of flux) peak = Math.max(peak, v);
  if (peak <= 0) return { onsets: [], flux, spec };
  const norm = Float32Array.from(flux, (v) => v / peak);

  const radius = Math.max(3, Math.round(0.25 / (hop / sampleRate)));
  const median = movingMedian(norm, radius);
  const delta = 0.055 / Math.max(0.2, sensitivity);
  const lambda = 1.35 / Math.max(0.2, Math.min(3, sensitivity));

  const onsets = [];
  /* A take that begins on a note has no rising flux to find, because there is
   * no quieter frame before it — so the first sounding frame is an attack. */
  let firstSound = -1;
  for (let t = 0; t < spec.frames.length; t++) {
    let e = 0;
    for (let k = 0; k < spec.frames[t].length; k++) e += spec.frames[t][k];
    if (e > peak * 0.02) { firstSound = t; break; }
  }
  if (firstSound >= 0) onsets.push({ time: spec.times[firstSound], strength: 1 });

  for (let t = 1; t < norm.length - 1; t++) {
    const threshold = median[t] * lambda + delta;
    if (norm[t] < threshold) continue;
    if (norm[t] < norm[t - 1] || norm[t] < norm[t + 1]) continue;   // local peak only
    const time = spec.times[t];
    const last = onsets[onsets.length - 1];
    if (last) {
      const gap = time - last.time;
      /* A chord's attack is broad and rings for a moment, so the flux peaks
       * more than once.  Only a clearly stronger event counts as a new attack
       * this soon after the last one. */
      if (gap < minGap) {
        if (norm[t] > last.strength) { last.time = time; last.strength = norm[t]; }
        continue;
      }
      if (gap < minGap * 1.8 && norm[t] < last.strength * 0.85) continue;
    }
    onsets.push({ time, strength: norm[t] });
  }
  return { onsets, flux: norm, spec };
}

/**
 * The energy envelope, used to tell silence from sound so that rests can be
 * written where the performer actually stopped playing.
 */
export function energyEnvelope(samples, { sampleRate = 44100, window = 0.02 } = {}) {
  const size = Math.max(64, Math.round(window * sampleRate));
  const n = Math.floor(samples.length / size);
  const env = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < size; k++) {
      const v = samples[i * size + k];
      s += v * v;
    }
    env[i] = Math.sqrt(s / size);
  }
  return { env, step: size / sampleRate };
}

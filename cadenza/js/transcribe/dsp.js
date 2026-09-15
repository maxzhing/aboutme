import { runSync } from './steps.js';

/* Cadenza — signal processing for transcription.
 *
 * Plain arrays and a radix-2 FFT: no dependencies, and fast enough that a
 * minute of audio analyses in well under a second.
 */

/** In-place iterative Cooley-Tukey FFT.  `re`/`im` must be a power of two. */
export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k];
        const ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr;
        im[i + k + len / 2] = ui - vi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

export function hann(size) {
  const w = new Float32Array(size);
  for (let i = 0; i < size; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
  return w;
}

/**
 * Short-time magnitude spectrum.
 * Returns { frames: Float32Array[], hop, size, sampleRate, times }.
 */
export function* stftSteps(samples, { size = 4096, hop = 512, sampleRate = 44100 } = {}) {
  const win = hann(size);
  const bins = size / 2;
  const frames = [];
  const times = [];
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  for (let start = 0; start + size <= samples.length; start += hop) {
    for (let i = 0; i < size; i++) {
      re[i] = samples[start + i] * win[i];
      im[i] = 0;
    }
    fft(re, im);
    const mag = new Float32Array(bins);
    for (let k = 0; k < bins; k++) mag[k] = Math.hypot(re[k], im[k]);
    frames.push(mag);
    times.push(start / sampleRate);
    /* A few minutes of audio is thousands of transforms.  Done in one run that
     * is seconds with no chance for anything else to happen, which on a page is
     * seconds of not answering. */
    if ((frames.length & 63) === 0) yield { stage: 'transform', frames: frames.length };
  }
  return { frames, hop, size, sampleRate, times, binHz: sampleRate / size };
}

/**
 * Short-time Fourier transform: overlapping windows, each one a spectrum.
 * Returns { frames, times, binHz, hop, size, sampleRate }.
 */
export function stft(samples, opts) {
  return runSync(stftSteps(samples, opts));
}

/** Mix an AudioBuffer (or an array of channels) down to mono. */
export function toMono(buffer) {
  if (buffer instanceof Float32Array) return buffer;
  const channels = buffer.numberOfChannels !== undefined
    ? Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c))
    : buffer;
  if (channels.length === 1) return channels[0];
  const out = new Float32Array(channels[0].length);
  for (let i = 0; i < out.length; i++) {
    let s = 0;
    for (const ch of channels) s += ch[i];
    out[i] = s / channels.length;
  }
  return out;
}

/** Parabolic interpolation around a spectral peak, for sub-bin accuracy. */
export function refinePeak(mag, k) {
  if (k <= 0 || k >= mag.length - 1) return { bin: k, value: mag[k] };
  const a = mag[k - 1];
  const b = mag[k];
  const c = mag[k + 1];
  const denom = a - 2 * b + c;
  if (Math.abs(denom) < 1e-12) return { bin: k, value: b };
  const delta = (0.5 * (a - c)) / denom;
  return { bin: k + Math.max(-0.5, Math.min(0.5, delta)), value: b - 0.25 * (a - c) * delta };
}

/** Largest magnitude within +/- `width` bins of `centre`, with interpolation. */
export function peakNear(mag, centre, width) {
  const lo = Math.max(1, Math.floor(centre - width));
  const hi = Math.min(mag.length - 2, Math.ceil(centre + width));
  let best = lo;
  for (let k = lo; k <= hi; k++) if (mag[k] > mag[best]) best = k;
  if (best <= lo || best >= hi) return { bin: best, value: mag[best] };
  return refinePeak(mag, best);
}

export const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const hzToMidi = (f) => 69 + 12 * Math.log2(Math.max(1e-6, f) / 440);

/** Root-mean-square level of a window of samples. */
export function rms(samples, from, to) {
  let s = 0;
  const a = Math.max(0, from);
  const b = Math.min(samples.length, to);
  for (let i = a; i < b; i++) s += samples[i] * samples[i];
  return Math.sqrt(s / Math.max(1, b - a));
}

/**
 * Even out a recording's level before reading it.
 *
 * A phone held over a piano is not a fixed microphone.  It gets carried
 * closer and further away, put down, picked up; the player turns towards it
 * and away.  On a real recording this moves the level by twenty-five or
 * thirty decibels over a few seconds — far more than the playing does — and
 * the multiple-F0 estimator simply goes deaf in the quiet stretches, because
 * every threshold it has is relative to the loudest thing in the take.
 * Measured on one handheld take of a grand piano, a passage that was thirty
 * decibels down yielded one note where it should have yielded forty-six.
 *
 * So the gain follows the *local peak*, not the local average.  Tracking the
 * average would lift the silence between phrases along with everything else
 * and turn room noise into notes; the loudest thing in a couple of seconds is
 * a measure of how close the microphone is, and nothing else.  Where there is
 * nothing to hear the gain stays at one, so a silence remains a silence.
 *
 * Two seconds is the window because that is the gap between the two things
 * being told apart: a microphone moves over seconds, a phrase shapes itself
 * over beats.  On a recording whose level is already even the gain moves by
 * about three decibels from end to end, nearly all of it in the decay after
 * the last note, against the eighteen it applies to a take where the
 * microphone walked away — so this costs close to nothing where it is not
 * needed.  Loudness is measured from the original samples elsewhere, so the
 * dynamics written on the page are the ones that were played.
 */
export function levelOut(samples, sampleRate, opts = {}) {
  const { window = 2, ceiling = 8, floor = 0.02 } = opts;
  const n = samples.length;
  const step = Math.max(1, Math.round(sampleRate * 0.02));
  const frames = Math.ceil(n / step);
  if (frames < 3) return { audio: samples, gain: null, step, range: 0 };

  const energy = new Float64Array(frames);
  for (let f = 0; f < frames; f++) {
    const a = f * step;
    const b = Math.min(n, a + step);
    let s = 0;
    for (let i = a; i < b; i++) s += samples[i] * samples[i];
    energy[f] = Math.sqrt(s / Math.max(1, b - a));
  }

  /* The loudest moment within `window` of each frame. */
  const half = Math.max(1, Math.round((window * sampleRate) / step / 2));
  const peak = slidingMax(energy, half);
  let top = 0;
  for (const v of peak) top = Math.max(top, v);
  if (!(top > 0)) return { audio: samples, gain: null, step, range: 0 };

  const gain = new Float64Array(frames);
  for (let f = 0; f < frames; f++) {
    gain[f] = peak[f] > top * floor ? Math.min(ceiling, top / peak[f]) : 1;
  }
  /* Smooth it, so the gain never steps in the middle of a note. */
  const smooth = boxFilter(gain, Math.max(1, Math.round(half / 2)));

  let lo = Infinity;
  let hi = 0;
  for (const g of smooth) { lo = Math.min(lo, g); hi = Math.max(hi, g); }
  const range = 20 * Math.log10(hi / Math.max(1e-9, lo));

  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = samples[i] * smooth[Math.min(frames - 1, (i / step) | 0)];
  return { audio: out, gain: smooth, step, range };
}

/**
 * The largest value within `radius` of each position.
 *
 * A monotonic queue: indices whose value is already beaten by a later one are
 * dropped, so the front of the queue is always the maximum of the window and
 * every index enters and leaves once.  One pass, whatever the radius.
 */
function slidingMax(values, radius) {
  const n = values.length;
  const out = new Float64Array(n);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  for (let i = 0; i < n + radius; i++) {
    if (i < n) {
      while (tail > head && values[queue[tail - 1]] <= values[i]) tail--;
      queue[tail++] = i;
    }
    const at = i - radius;
    if (at >= 0) {
      while (queue[head] < at - radius) head++;
      out[at] = values[queue[head]];
    }
  }
  return out;
}

/** A moving average of `radius` either side. */
function boxFilter(values, radius) {
  const n = values.length;
  const sum = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) sum[i + 1] = sum[i] + values[i];
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - radius);
    const b = Math.min(n, i + radius + 1);
    out[i] = (sum[b] - sum[a]) / (b - a);
  }
  return out;
}

/** Running median, used for adaptive thresholds. */
export function movingMedian(values, radius) {
  const out = new Float32Array(values.length);
  const window = [];
  for (let i = 0; i < values.length; i++) {
    const lo = Math.max(0, i - radius);
    const hi = Math.min(values.length - 1, i + radius);
    window.length = 0;
    for (let k = lo; k <= hi; k++) window.push(values[k]);
    window.sort((a, b) => a - b);
    out[i] = window[window.length >> 1];
  }
  return out;
}

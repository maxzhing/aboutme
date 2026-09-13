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
export function stft(samples, { size = 4096, hop = 512, sampleRate = 44100 } = {}) {
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
  }
  return { frames, hop, size, sampleRate, times, binHz: sampleRate / size };
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

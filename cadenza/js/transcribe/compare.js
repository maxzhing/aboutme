/* Cadenza — measuring a transcription against the recording it came from.
 *
 * The useful question is not "does the rendered waveform look like the original
 * waveform" — two pianos playing the same notes produce quite different
 * waveforms — but "does the notation account for the same musical events".  So
 * both signals are reduced to the same four representations and compared in
 * each:
 *
 *   pitch over time   how much energy sits on each pitch's harmonic series
 *   onsets            where notes begin, and how strongly
 *   dynamics          the loudness envelope
 *   events            what the notation says, in notes
 *
 * The first is what finds wrong notes.  Where the original has energy along a
 * pitch's harmonic series and the render has none, the notation is missing that
 * note; where the render has it and the original does not, the notation has
 * invented one.  Both directions are measured, because a transcription that
 * only ever adds notes is as wrong as one that only ever drops them.
 *
 * Nothing here decides what the music ought to be.  It reports what the two
 * signals differ in, and the difference is always stated in the direction of
 * the original — the recording is the authority.
 */

import { stft, toMono, rms, midiToHz } from './dsp.js';
import { salienceAt, whiten, estimateF0s, residualSpectrum, estimateFromWhitened, MIN_MIDI, MAX_MIDI } from './polyphony.js';
import { detectOnsets } from './onsets.js';

/**
 * How much each pitch is sounding, frame by frame.
 *
 * Each frame is normalised by its own strongest pitch, so a quiet passage is
 * compared on the same footing as a loud one and a difference in overall level
 * between a recording and a render does not read as a difference in notes.
 */
export function salienceMap(audio, sampleRate, opts = {}) {
  const { pitches = null, size = 4096, hop = 2048, harmonics = 12 } = opts;
  const samples = toMono(audio);
  const spec = stft(samples, { size, hop, sampleRate });
  const list = pitches && pitches.length ? [...pitches].sort((a, b) => a - b)
    : rangeOf(MIN_MIDI, MAX_MIDI);
  const frames = spec.frames.length;
  const data = new Float32Array(frames * list.length);
  const level = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    const mag = whiten(spec.frames[f]);
    let strongest = 0;
    const row = f * list.length;
    for (let i = 0; i < list.length; i++) {
      const s = salienceAt(mag, spec.binHz, midiToHz(list[i]), { harmonics }).salience;
      data[row + i] = s;
      if (s > strongest) strongest = s;
    }
    level[f] = strongest;
  }

  /* Normalise against the take, not against each frame on its own.
   *
   * Dividing every frame by its own strongest pitch makes a silent frame into
   * pure noise scaled up to full height, so a rest in one signal reads as a
   * chord that the other is missing.  The floor below keeps a quiet frame
   * quiet, while still letting a soft passage be compared fairly with a loud
   * one. */
  let peak = 0;
  for (let f = 0; f < frames; f++) peak = Math.max(peak, level[f]);
  const floor = peak * 0.16;
  for (let f = 0; f < frames; f++) {
    const row = f * list.length;
    if (level[f] < peak * 0.05) {
      for (let i = 0; i < list.length; i++) data[row + i] = 0;
      continue;
    }
    const scale = Math.max(level[f], floor);
    for (let i = 0; i < list.length; i++) data[row + i] /= scale;
    suppressDependents(data, row, list);
  }
  const times = [];
  for (let f = 0; f < frames; f++) times.push((f * hop + size / 2) / sampleRate);
  return { data, pitches: list, times, frames, level, hop, size, sampleRate };
}

/* Ratios at which one pitch's energy is really another's.
 * A note's octave, twelfth and double octave all light up when only the lower
 * note is played, so a raw salience curve has peaks nobody struck. */
const DEPENDENT = [12, 19, 24, 28, 31, 36];

/**
 * Quiet the peaks that belong to a stronger note's harmonic series.
 *
 * Without this, the comparison reports a recording as containing notes it does
 * not contain — and since the same suppression is applied to both sides, a
 * real octave that is present in both still cancels out.  What it protects
 * against is inventing a difference where there is only a harmonic.
 */
function suppressDependents(data, row, list) {
  const order = list.map((m, i) => i).sort((a, b) => data[row + b] - data[row + a]);
  const kept = [];
  for (const i of order) {
    const value = data[row + i];
    if (value <= 0) continue;
    const midi = list[i];
    let dependent = false;
    for (const k of kept) {
      const gap = Math.abs(midi - list[k]);
      if (gap === 0 || !DEPENDENT.includes(gap)) continue;
      /* Both directions.  A note lights up its own octave above, and it lights
       * up the octave below as well, since every partial of the lower pitch
       * that matters is one of its own.  Only the clearly weaker of the pair is
       * quieted: an octave played as an octave is as strong as its partner and
       * must survive. */
      if (value < data[row + k] * 0.82) { dependent = true; break; }
    }
    if (dependent) data[row + i] = value * 0.25;
    else kept.push(i);
  }
}

const rangeOf = (lo, hi) => {
  const out = [];
  for (let m = lo; m <= hi; m++) out.push(m);
  return out;
};

/** The pitches worth looking at: what either side uses, with room either side. */
export function candidatePitches(...lists) {
  const set = new Set();
  for (const list of lists) {
    for (const m of list) {
      for (let d = -12; d <= 12; d += 12) {
        const p = m + d;
        if (p >= MIN_MIDI && p <= MAX_MIDI) set.add(p);
      }
      for (let d = -2; d <= 2; d++) {
        const p = m + d;
        if (p >= MIN_MIDI && p <= MAX_MIDI) set.add(p);
      }
    }
  }
  return [...set].sort((a, b) => a - b);
}

/**
 * Where a recording actually has sound in it.
 *
 * A render rings on after its last note and a recording may have silence at
 * either end; comparing those stretches reports notes as missing or invented
 * when all that differs is how each side falls quiet.
 */
export function activeSpan(map, threshold = 0.06) {
  let peak = 0;
  for (let f = 0; f < map.frames; f++) peak = Math.max(peak, map.level[f]);
  let from = 0;
  let to = map.frames - 1;
  while (from < map.frames && map.level[from] < peak * threshold) from++;
  while (to > from && map.level[to] < peak * threshold) to--;
  return { from, to, fromTime: map.times[from] || 0, toTime: map.times[to] || 0 };
}

/** A view of a map over a smaller pitch set, so two maps can be subtracted. */
export function restrictMap(map, pitches) {
  const keep = pitches.filter((p) => map.pitches.includes(p));
  const index = keep.map((p) => map.pitches.indexOf(p));
  const data = new Float32Array(map.frames * keep.length);
  for (let f = 0; f < map.frames; f++) {
    for (let i = 0; i < keep.length; i++) data[f * keep.length + i] = map.data[f * map.pitches.length + index[i]];
  }
  return { ...map, data, pitches: keep };
}

/** The pitches a recording actually uses: where to look for what is missing. */
export function activePitches(map, threshold = PRESENT) {
  const out = [];
  const n = map.pitches.length;
  for (let i = 0; i < n; i++) {
    for (let f = 0; f < map.frames; f++) {
      if (map.data[f * n + i] >= threshold) { out.push(map.pitches[i]); break; }
    }
  }
  return out;
}

/** The loudness envelope, at the same rate as the salience map. */
function envelope(audio, sampleRate, hop, frames, size) {
  const samples = toMono(audio);
  const out = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    const from = f * hop;
    out[f] = rms(samples, from, Math.min(samples.length, from + size));
  }
  return out;
}

function correlation(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    num += x * y; da += x * x; db += y * y;
  }
  return da > 0 && db > 0 ? Math.max(0, num / Math.sqrt(da * db)) : 0;
}

/** How well two onset lists agree, in the usual precision/recall terms. */
export function onsetAgreement(a, b, tolerance = 0.06) {
  if (!a.length && !b.length) return { f1: 1, matched: 0, missed: 0, extra: 0, drift: 0 };
  const used = new Set();
  let matched = 0;
  let drift = 0;
  for (const x of a) {
    let best = -1;
    let bd = tolerance;
    b.forEach((y, i) => {
      if (used.has(i)) return;
      const d = Math.abs(y.time - x.time);
      if (d < bd) { bd = d; best = i; }
    });
    if (best >= 0) { used.add(best); matched++; drift += bd; }
  }
  const missed = a.length - matched;
  const extra = b.length - matched;
  const precision = b.length ? matched / b.length : 1;
  const recall = a.length ? matched / a.length : 1;
  return {
    f1: precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0,
    matched, missed, extra,
    drift: matched ? drift / matched : 0,
  };
}

/* A pitch counts as sounding when it stands this high against the loudest
 * pitch in its own frame. */
const PRESENT = 0.34;

/* And it counts as absent from the other side when it is this much weaker
 * there.  The test is a ratio rather than a second threshold because the map
 * has a noise floor: a pitch nobody played still reads a quarter of the way up
 * beside a loud note, and calling that "present" hides real differences behind
 * it.  What matters is not whether the other side has something, but whether it
 * has anything like as much. */
const ABSENT_RATIO = 0.45;

/** Runs of frames where one side has a pitch and the other does not. */
function findRuns(map, otherMap, times, minFrames, span, tailFrames) {
  const runs = [];
  const n = map.pitches.length;
  const first = span ? span.from : 0;
  const last = span ? span.to : map.frames - 1;
  /* Was this pitch sounding on the other side a moment ago?  Two instruments
   * let go of a note differently — one rings, one stops — and the difference
   * shows up as a stretch where only one of them still has the pitch.  That is
   * a difference in release, not in notes, so a run that begins under the
   * shadow of the other side's own note is not counted. */
  const shadowed = (i, start) => {
    for (let f = Math.max(0, start - tailFrames); f < start; f++) {
      if (f < otherMap.frames && otherMap.data[f * n + i] >= PRESENT) return true;
    }
    return false;
  };
  for (let i = 0; i < n; i++) {
    let start = -1;
    let strength = 0;
    for (let f = first; f <= last + 1; f++) {
      const mine = f <= last && f < map.frames ? map.data[f * n + i] : 0;
      const theirs = f <= last && f < otherMap.frames ? otherMap.data[f * n + i] : 0;
      const differs = mine >= PRESENT && theirs < mine * ABSENT_RATIO;
      if (differs) {
        if (start < 0) { start = f; strength = 0; }
        strength = Math.max(strength, mine - theirs);
      } else if (start >= 0) {
        if (f - start >= minFrames && !shadowed(i, start)) {
          runs.push({
            midi: map.pitches[i],
            from: times[start],
            to: times[Math.min(f, times.length - 1)],
            frames: f - start,
            strength,
          });
        }
        start = -1;
      }
    }
  }
  return runs.sort((a, b) => b.strength * b.frames - a.strength * a.frames);
}

/**
 * Compare a rendered transcription with the recording it claims to represent.
 *
 * `original` and `rendered` are both { audio, sampleRate }; both maps are
 * computed over the same pitch set so the two are directly subtractable.
 * Returns a similarity between 0 and 1 and, more usefully, the specific
 * disagreements: which pitch, from when to when, and how strongly.
 */
export function compareAudio(original, rendered, opts = {}) {
  const { pitches = null, size = 4096, hop = 2048, minFrames = 1, sensitivity = 1 } = opts;
  const rate = original.sampleRate;
  const mapOpts = { pitches, size, hop };
  let a = opts.originalMap || salienceMap(original.audio, rate, mapOpts);
  if (pitches && pitches.length && pitches.length < a.pitches.length) a = restrictMap(a, pitches);
  const b = salienceMap(rendered.audio, rendered.sampleRate, { ...mapOpts, pitches: a.pitches });

  /* Only the stretch where the recording has sound in it is compared. */
  const span = activeSpan(a);
  /* Pitch over time: the mean angle between the two frames' pitch vectors. */
  const n = a.pitches.length;
  const frames = Math.min(a.frames, b.frames);
  let spectral = 0;
  let counted = 0;
  const upTo = Math.min(frames, span.to + 1);
  for (let f = span.from; f < upTo; f++) {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < n; i++) {
      const x = a.data[f * n + i];
      const y = b.data[f * n + i];
      dot += x * y; na += x * x; nb += y * y;
    }
    if (na > 1e-6 && nb > 1e-6) { spectral += dot / Math.sqrt(na * nb); counted++; }
    else if (na <= 1e-6 && nb <= 1e-6) { spectral += 1; counted++; }
  }
  spectral = counted ? spectral / counted : 0;

  const onA = detectOnsets(toMono(original.audio), { sampleRate: rate, sensitivity }).onsets;
  const onB = detectOnsets(toMono(rendered.audio), { sampleRate: rendered.sampleRate, sensitivity }).onsets;
  const onsets = onsetAgreement(onA, onB);

  const envA = envelope(original.audio, rate, hop, frames, size);
  const envB = envelope(rendered.audio, rendered.sampleRate, hop, frames, size);
  const dynamics = correlation(envA, envB);

  const frameSeconds = hop / rate;
  const tailFrames = Math.max(1, Math.round(0.45 / frameSeconds));
  const missing = findRuns(a, b, a.times, minFrames, span, tailFrames);
  const extra = findRuns(b, a, b.times, minFrames, span, tailFrames);

  /* How much of the recording the notation accounts for.
   *
   * The angle between two pitch vectors barely moves when one note in eight is
   * wrong — most of the vector still agrees — so it is a poor thing to steer
   * by.  This measures the share of the recording's pitch energy that the
   * notation fails to produce, plus the share it produces that is not in the
   * recording, which is the quantity that actually has to go down. */
  let present = 0;
  for (let f = span.from; f <= span.to && f < a.frames; f++) {
    for (let i = 0; i < n; i++) { const v = a.data[f * n + i]; if (v >= PRESENT) present += v; }
  }
  const weigh = (runs) => runs.reduce((sum, r) => sum + r.strength * r.frames, 0);
  const coverage = present > 0
    ? Math.max(0, 1 - (weigh(missing) + weigh(extra)) / present) : (missing.length || extra.length ? 0 : 1);

  return {
    similarity: 0.55 * coverage + 0.2 * spectral + 0.15 * onsets.f1 + 0.1 * dynamics,
    coverage,
    spectral,
    onsets,
    dynamics,
    missing,
    extra,
    originalMap: a,
    renderedMap: b,
  };
}

/**
 * Say what is wrong in musical terms, bar by bar.
 *
 * The runs are pitch-and-time; a reader wants "bar 18, a note that is not in
 * the recording".  `locate` turns a time into a bar number.
 */
export function describe(diff, locate, opts = {}) {
  const { limit = 12, minStrength = 0.22 } = opts;
  const issues = new Map();
  const add = (time, kind, midi, strength) => {
    const bar = locate(time);
    if (bar === null || bar === undefined) return;
    const key = bar + ':' + kind;
    const cur = issues.get(key) || { bar, kind, count: 0, strength: 0, pitches: [] };
    cur.count++;
    cur.strength = Math.max(cur.strength, strength);
    if (!cur.pitches.includes(midi) && cur.pitches.length < 4) cur.pitches.push(midi);
    issues.set(key, cur);
  };
  for (const r of diff.missing) if (r.strength >= minStrength) add(r.from, 'missing', r.midi, r.strength);
  for (const r of diff.extra) if (r.strength >= minStrength) add(r.from, 'extra', r.midi, r.strength);
  if (diff.onsets.drift > 0.045) {
    /* Timing that is off everywhere is a rhythm problem, not a note problem. */
    issues.set('all:timing', { bar: null, kind: 'timing', count: diff.onsets.matched, strength: Math.min(1, diff.onsets.drift / 0.12), pitches: [] });
  }
  return [...issues.values()]
    .sort((a, b) => b.strength * b.count - a.strength * a.count)
    .slice(0, limit);
}

/**
 * Ask the pitch estimator directly whether a pitch is sounding at one moment.
 *
 * The salience map is cheap enough to run over a whole take, but it is a
 * curve, not a decision — the estimator is what separates a note from its
 * neighbours' harmonics.  Running it costs too much to do everywhere, so it is
 * used exactly where it matters: before a correction is made, to check that the
 * recording really does say what the map suggested.
 */
export function verifyPitchAt(audio, sampleRate, time, midi, opts = {}) {
  const { size = 8192, maxVoices = 6, without = null } = opts;
  const samples = toMono(audio);
  const start = Math.max(0, Math.min(samples.length - size, Math.round(time * sampleRate)));
  if (samples.length < size) return { present: false, heard: [] };
  const spec = stft(samples.subarray(start, start + size), { size, hop: size, sampleRate });
  if (!spec.frames.length) return { present: false, heard: [] };
  /* Where the notation already accounts for some of what is sounding, take
   * that away first: a note hidden under its own octave is invisible until the
   * octave above it has been subtracted. */
  const det = without && without.length
    ? estimateFromWhitened(residualSpectrum(spec.frames[0], spec.binHz,
      without.filter((hz) => Math.abs(1200 * Math.log2(hz / midiToHz(midi))) > 40)), spec.binHz, { maxVoices })
    : estimateF0s(spec.frames[0], spec.binHz, { maxVoices });
  const heard = det.map((d) => d.midi);
  const found = det.find((d) => d.midi === midi);
  return {
    present: !!found,
    strength: found ? found.confidence : 0,
    heard,
  };
}

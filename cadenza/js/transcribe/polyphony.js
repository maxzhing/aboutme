/* Cadenza — polyphonic pitch estimation.
 *
 * The approach is the one that has held up best for piano: build a salience
 * function over candidate fundamentals by summing the spectrum at each
 * candidate's harmonic positions, take the strongest candidate, subtract the
 * harmonic series it explains, and repeat.  Because each detection removes its
 * own energy, a chord comes out as a chord rather than as its loudest note
 * repeated.
 *
 * After Klapuri's multiple-F0 estimator, with an explicit octave test — the
 * error that matters most in practice is calling a note an octave wrong.
 */

import { peakNear, midiToHz, hzToMidi } from './dsp.js';

export const MIN_MIDI = 21;    // A0
export const MAX_MIDI = 108;   // C8

const ALPHA = 52;              // Hz, harmonic weighting constants
const BETA = 320;

/**
 * Flatten the spectrum so a bright note and a dull one compete fairly.
 * Each bin is divided by a smoothed local average of its neighbourhood.
 */
export function whiten(mag, { strength = 0.66 } = {}) {
  const n = mag.length;
  const out = new Float32Array(n);
  const env = new Float32Array(n);
  /* A wide running average approximates the spectral envelope. */
  let acc = 0;
  const radius = Math.max(4, Math.round(n / 64));
  for (let i = 0; i < n; i++) {
    acc += mag[i];
    if (i >= 2 * radius + 1) acc -= mag[i - 2 * radius - 1];
    env[Math.max(0, i - radius)] = acc / Math.min(i + 1, 2 * radius + 1);
  }
  for (let i = n - radius; i < n; i++) env[i] = env[Math.max(0, n - radius - 1)];
  for (let i = 0; i < n; i++) {
    const e = Math.max(1e-9, env[i]);
    out[i] = mag[i] / Math.pow(e, strength);
  }
  return out;
}

/** Harmonic weight: lower partials count for more. */
const weight = (f0, h) => (f0 + ALPHA) / (h * f0 + BETA);

const MAX_B = 0.0008;          // stiffness of the stiffest strings we expect
const MAX_BINS = 2.5;          // how far a partial may sit from its prediction

/**
 * How far from its predicted place a partial may land and still count.
 *
 * Two limits, whichever is tighter.  Low down, bins are fine compared with the
 * interval between notes, so the limit is musical — a fraction of a semitone.
 * High up, a fraction of a semitone spans many bins, and a window that wide
 * finds a peak wherever it looks: that is how a note nobody played collects a
 * full set of partials out of the other notes' harmonics.  There the limit is
 * the resolution of the transform itself.
 */
const tolerance = (f, binHz, tolCents) =>
  Math.min(f * (Math.pow(2, tolCents / 1200) - 1), MAX_BINS * binHz);

/**
 * Where a real string puts its h-th partial.
 *
 * A string is not an ideal one: its stiffness pushes each partial sharp of the
 * exact multiple, and the error grows with the square of the partial number.
 * By the tenth partial of a piano note this is most of a semitone — enough
 * that looking for partials at exact multiples finds them out of tune, loses
 * them, and then builds a phantom note out of the ones it missed.
 */
const partialHz = (f0, h, B) => f0 * h * Math.sqrt(1 + B * h * h);

/**
 * Measure a string's stiffness from its own low partials.
 *
 * Those are searched in a window wide enough for any plausible stiffness; the
 * implied value is read off each one and the weighted median taken, so a
 * partial that landed on some other note's energy cannot skew the result.
 */
function fitStiffness(mag, binHz, f0, tolCents) {
  const est = [];
  for (let h = 2; h <= 6; h++) {
    const nominal = f0 * h;
    const slack = tolerance(nominal, binHz, tolCents);
    const lo = nominal - slack;
    const hi = partialHz(f0, h, MAX_B) + slack;
    const centre = (lo + hi) / 2 / binHz;
    /* Never wide enough to reach the neighbouring partial. */
    const width = Math.min(Math.max(1.2, (hi - lo) / 2 / binHz), (0.42 * f0) / binHz);
    if (centre + width >= mag.length - 2) break;
    const p = peakNear(mag, centre, width);
    if (p.value <= 0) continue;
    const ratio = (p.bin * binHz) / nominal;
    const b = (ratio * ratio - 1) / (h * h);
    if (b < -0.0002 || b > MAX_B * 1.5) continue;
    est.push({ b: Math.max(0, b), w: p.value * h });
  }
  if (est.length < 2) return 0;
  est.sort((x, y) => x.b - y.b);
  const half = est.reduce((sum, e) => sum + e.w, 0) / 2;
  let acc = 0;
  for (const e of est) { acc += e.w; if (acc >= half) return Math.min(MAX_B, e.b); }
  return Math.min(MAX_B, est[est.length - 1].b);
}

/**
 * Salience of one candidate fundamental: how much of the spectrum its
 * harmonic series accounts for.
 */
export function salienceAt(mag, binHz, f0, opts = {}) {
  const { harmonics = 16, tolCents = 45 } = opts;
  const B = opts.B !== undefined ? opts.B : fitStiffness(mag, binHz, f0, tolCents);
  const nyquist = mag.length * binHz;
  let sum = 0;
  let hits = 0;
  const used = [];
  for (let h = 1; h <= harmonics; h++) {
    const f = partialHz(f0, h, B);
    if (f > nyquist * 0.96) break;
    const centre = f / binHz;
    const slack = tolerance(f, binHz, tolCents);
    const p = peakNear(mag, centre, Math.max(1.2, slack / binHz));
    /* Only count a partial that actually lands where it should. */
    const aligned = Math.abs(p.bin * binHz - f) <= slack;
    if (aligned && p.value > 0) { sum += weight(f0, h) * p.value; hits++; }
    used.push({ h, bin: p.bin, hz: aligned ? p.bin * binHz : f, value: aligned ? p.value : 0 });
  }
  return { salience: sum, hits, partials: used, B };
}

/**
 * The energy a pitch holds in partials that are its own — those it does not
 * share with any of `others`.  Asking whether a note was struck again means
 * asking about that note alone: a partial shared with whatever else is
 * sounding rises and falls with the other note, so counting it would report a
 * re-strike every time the music changed around a held note.
 */
export function ownPartialEnergy(mag, binHz, f0, others = [], opts = {}) {
  const { harmonics = 12, tolCents = 60 } = opts;
  const mine = salienceAt(mag, binHz, f0, { harmonics, tolCents });
  const theirs = others.map((g) => salienceAt(mag, binHz, g, { harmonics, tolCents }));
  let sum = 0;
  let used = 0;
  for (const p of mine.partials) {
    let shared = false;
    for (const other of theirs) {
      for (const q of other.partials) {
        if (q.hz > p.hz * 1.2) break;
        if (Math.abs(1200 * Math.log2(p.hz / q.hz)) < tolCents * 1.5) { shared = true; break; }
      }
      if (shared) break;
    }
    if (shared) continue;
    sum += weight(f0, p.h) * p.value;
    used++;
  }
  return { energy: used ? sum / used : 0, used };
}

/** Salience across every semitone in the piano range. */
export function salienceCurve(mag, binHz, opts = {}) {
  const out = new Float32Array(MAX_MIDI - MIN_MIDI + 1);
  for (let m = MIN_MIDI; m <= MAX_MIDI; m++) {
    out[m - MIN_MIDI] = salienceAt(mag, binHz, midiToHz(m), opts).salience;
  }
  return out;
}

/**
 * A smooth envelope through a note's partial amplitudes.
 *
 * An instrument's partials fall away gradually.  Where one partial towers over
 * its neighbours, the excess almost always belongs to *another* note sounding
 * at that frequency — an octave above, say — so a running median is used, which
 * a single inflated value cannot drag upwards.
 */
function partialEnvelope(partials) {
  const a = partials.map((p) => p.value);
  const env = a.slice();
  for (let i = 1; i < a.length - 1; i++) {
    const w = [a[i - 1], a[i], a[i + 1]].sort((x, y) => x - y);
    env[i] = Math.min(a[i], w[1]);
  }
  if (a.length > 2) env[a.length - 1] = Math.min(a[a.length - 1], env[a.length - 2]);
  return env;
}

/**
 * Remove only as much as this note's own envelope accounts for.  Subtracting
 * the full observed peak would delete any note hiding under a shared partial,
 * which is how a C and the C an octave above it collapse into one.
 */
function subtract(mag, binHz, f0, partials, amount, env) {
  partials.forEach((p, i) => {
    if (!p.value) return;
    const take = amount * Math.min(p.value, env ? env[i] : p.value);
    const centre = p.bin;
    /* At least as wide as the analysis window's main lobe: a peak occupies
     * several bins, and leaving its skirts behind leaves enough energy for the
     * semitone either side to look like a note of its own. */
    const spread = Math.max(2.0, centre * 0.004);
    const lo = Math.max(0, Math.floor(centre - spread));
    const hi = Math.min(mag.length - 1, Math.ceil(centre + spread));
    for (let k = lo; k <= hi; k++) {
      const d = Math.abs(k - centre) / spread;
      const shape = Math.max(0, 1 - d * d);
      mag[k] = Math.max(0, mag[k] - take * shape);
    }
  });
}

/**
 * What a partial's amplitude *should* be if this note were sounding alone.
 *
 * An instrument's partials fall away as a power of the partial number, near
 * enough that a straight line through them in log-log space predicts one well.
 * The fit is repeated on the lowest-residual partials only: contamination from
 * another note sounding at the same frequency always pushes a partial *up*, so
 * discarding the partials that sit highest above the line leaves the ones this
 * note can account for on its own.  Predicting from a partial's immediate
 * neighbours instead fails exactly when it matters — in a chord voiced in
 * octaves and fifths, the neighbours are contaminated too.
 */
function partialFit(partials) {
  const pts = [];
  for (const p of partials) if (p.value > 0) pts.push({ x: Math.log(p.h), y: Math.log(p.value) });
  if (pts.length < 4) return null;
  let use = pts;
  let inter = 0;
  let slope = 0;
  for (let iter = 0; iter < 3; iter++) {
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const q of use) { sx += q.x; sy += q.y; sxx += q.x * q.x; sxy += q.x * q.y; }
    const n = use.length;
    const den = n * sxx - sx * sx;
    slope = den ? (n * sxy - sx * sy) / den : 0;
    inter = (sy - slope * sx) / n;
    if (iter === 2) break;
    /* Drop the partials that sit highest above the line — those carry another
     * note's energy — but drop a few of the lowest too: fitting only the
     * bottom of the scatter biases every prediction downwards, and a
     * prediction that is too low turns ordinary partials into evidence of
     * notes that were never played. */
    const res = pts.map((q) => ({ q, r: q.y - (inter + slope * q.x) }));
    res.sort((a, b) => a.r - b.r);
    const lo = Math.floor(pts.length * 0.12);
    const hi = Math.max(lo + 3, Math.round(pts.length * 0.72));
    use = res.slice(lo, hi).map((e) => e.q);
    if (use.length < 3) use = res.slice(0, 3).map((e) => e.q);
  }
  if (slope > 0) slope = 0;        // partials never grow with h
  return (h) => Math.exp(inter + slope * Math.log(h));
}

/** What a note alone would put in its h-th partial. */
function expectedPartial(partials, i) {
  const fit = partialFit(partials);
  if (fit) return fit(partials[i].h);
  const a = partials.map((p) => p.value);
  const prev = i > 0 ? a[i - 1] : null;
  const next = i < a.length - 1 ? a[i + 1] : null;
  if (prev && next) return Math.sqrt(Math.max(1e-9, prev) * Math.max(1e-9, next));
  if (prev) return prev * 0.8;
  if (next) return next * 1.2;
  return a[i];
}

/** How far a partial exceeds what this note alone would produce. */
function partialExcess(partials, h) {
  const i = partials.findIndex((p) => p.h === h);
  if (i < 0) return 0;
  const expect = expectedPartial(partials, i);
  return expect > 0 ? partials[i].value / expect : 0;
}

/**
 * A second cue for the octave and the twelfth, where neighbour prediction
 * fails because *those* partials are shared too.
 *
 * On its own, no instrument puts as much energy into its second or third
 * partial as into its fundamental.  When it appears to, the extra energy is a
 * second note sounding an octave or a twelfth higher.  This is the one case
 * where a note's whole harmonic series hides inside another's, so without this
 * test a played octave is invisible.
 */
function outweighsFundamental(partials, h) {
  const first = partials.find((p) => p.h === 1);
  const at = partials.find((p) => p.h === h);
  if (!first || !at || !first.value) return false;
  return at.value > first.value * 0.95;
}


/**
 * What a note alone would put in its h-th partial, judged without the help of
 * an octave that may be hiding inside it.
 *
 * Every partial of the octave above lands on an even partial of the note
 * below.  A fall-off curve fitted through all the partials is therefore lifted
 * by the very note we are trying to find, the prediction rises to meet the
 * observation, and the octave becomes invisible by construction — which is why
 * a chord voiced in octaves loses its middle.  The odd partials are the ones
 * the octave cannot reach, so the curve is fitted through those alone and the
 * even ones are then measured against it.
 */
function oddPartialFit(partials) {
  return partialFit(partials.filter((p) => p.h % 2 === 1));
}

/**
 * Do the even partials, as a group, stand above where the odd ones say they
 * should?  One partial above the line is noise; most of them together is
 * another note an octave up.
 */
function evenPartialsInflated(partials) {
  const fit = oddPartialFit(partials);
  if (!fit) return false;
  let above = 0;
  let tested = 0;
  for (const p of partials) {
    if (p.h % 2 === 1 || p.h > 8 || !p.value) continue;
    const want = fit(p.h);
    if (want <= 0) continue;
    tested++;
    if (p.value > want * 1.45) above++;
  }
  return tested >= 2 && above * 2 > tested;
}

/**
 * Partials that stand well above the envelope are evidence of a note masked
 * underneath — typically an octave or a twelfth above the note we just found.
 */
function maskedCandidates(f0, partials) {
  const out = [];
  partials.forEach((p, i) => {
    if (p.h < 2 || p.h > 6 || !p.value) return;
    const ratio = partialExcess(partials, p.h);
    const octaveLike = (p.h === 2 || p.h === 3)
      && (outweighsFundamental(partials, p.h) || evenPartialsInflated(partials));
    if (ratio > 1.5 || octaveLike) {
      const midi = Math.round(hzToMidi(p.hz));
      if (midi >= MIN_MIDI && midi <= MAX_MIDI) out.push({ midi, excess: ratio, octaveLike });
    }
  });
  return out;
}

/**
 * Weighted support from a candidate's odd and even partials.
 *
 * A note an octave below a real one borrows all of its partials, but only the
 * even ones — its own fundamental and third partial are missing.  That
 * asymmetry is what separates a real low note from a phantom.
 */
function octaveSupport(mag, binHz, f0) {
  const { partials } = salienceAt(mag, binHz, f0, { harmonics: 10, tolCents: 30 });
  let odd = 0;
  let even = 0;
  for (const p of partials) {
    const v = p.value * weight(f0, p.h);
    if (p.h % 2) odd += v; else even += v;
  }
  return { odd, even };
}

/** True when a candidate lives entirely on another note's even partials. */
function isPhantomSubOctave(mag, binHz, f0) {
  const { odd, even } = octaveSupport(mag, binHz, f0);
  return even > 0 && odd < even * 0.28;
}

/**
 * Does this candidate sit on a harmonic of a note already found?
 *
 * If it does, it is a real note only when there is more energy at that
 * frequency than every note already found can account for between them.  Two
 * notes often put a partial in the same place — the fourth partial of G4 and
 * the third of C5 both land on G6 — and taking that doubled energy as proof of
 * a note at G6 is how a clean chord grows a top note nobody played.
 */
function coincidesWithFound(mag, binHz, hz, found, harmonics) {
  let coincident = false;
  let observed = 0;
  let predicted = 0;
  let octaveEvidence = false;
  for (const note of found) {
    const info = salienceAt(mag, binHz, note.hz, { harmonics });
    let matched = false;
    info.partials.forEach((p, i) => {
      if (p.h < 2 || p.h > 12) return;
      if (Math.abs(1200 * Math.log2(hz / p.hz)) > 55) return;
      matched = true;
      coincident = true;
      observed = Math.max(observed, p.value);
      /* An even partial is exactly where an octave hides, so what this note
       * alone would put there is read off its odd partials. */
      const clean = p.h % 2 === 0 ? oddPartialFit(info.partials) : null;
      predicted += clean ? clean(p.h) : expectedPartial(info.partials, i);
      if ((p.h === 2 || p.h === 3)
        && (outweighsFundamental(info.partials, p.h) || evenPartialsInflated(info.partials))) {
        octaveEvidence = true;
      }
    });
    if (matched) continue;
    /* A bass note's twentieth partial is inaudible on its own, yet quite loud
     * enough to inflate a partial of the note above it and conjure a third
     * note out of the pair.  Those partials are past where the salience model
     * looks, so what this note would put there is read off its own envelope
     * rather than measured. */
    /* Which partial would land here?  Stiffness has pushed the series sharp by
     * this far up, so the plain ratio names the wrong one. */
    let h = 0;
    let closest = 55;
    const guess = Math.round(hz / note.hz);
    for (let k = Math.max(13, guess - 3); k <= Math.min(40, guess + 3); k++) {
      const cents = Math.abs(1200 * Math.log2(hz / partialHz(note.hz, k, info.B)));
      if (cents < closest) { closest = cents; h = k; }
    }
    if (!h) continue;
    const fit = partialFit(info.partials);
    if (!fit) continue;
    coincident = true;
    observed = Math.max(observed, peakNear(mag, hz / binHz, 2.5).value);
    predicted += fit(h);
  }
  if (!coincident) return false;
  if (observed > predicted * 1.5) return false;
  /* The octave and the twelfth hide a whole series inside another, so they get
   * a lower bar — but not a low one: two notes whose partials merely meet at
   * one frequency clear 1.1 without either of them being there. */
  if (octaveEvidence && observed > predicted * 1.3) return false;
  return true;
}

/**
 * Check every detection in the presence of the others.
 *
 * Each note is re-measured against a spectrum with all the *other* detections
 * removed.  A real note still stands on its own; one that was only an artefact
 * of a neighbour's harmonics collapses and is dropped.
 */
function verifySet(mag, binHz, found, opts) {
  const { harmonics = 16, keepRatio = 0.10 } = opts;
  let list = found.slice();
  for (let pass = 0; pass < 3 && list.length > 1; pass++) {
    const scores = list.map((note) => {
      const residual = Float32Array.from(mag);
      for (const other of list) {
        if (other === note) continue;
        const info = salienceAt(residual, binHz, other.hz, { harmonics });
        subtract(residual, binHz, other.hz, info.partials, 0.9, partialEnvelope(info.partials));
      }
      const info = salienceAt(residual, binHz, note.hz, { harmonics });
      const phantom = isPhantomSubOctave(residual, binHz, note.hz);
      return { note, score: phantom ? 0 : info.salience, hits: info.hits, phantom };
    });
    const best = Math.max(...scores.map((s) => s.score));
    /* Leave-one-out cannot see a note hiding inside another's harmonic series:
     * every partial it has is shared, so removing its host removes it too and
     * it always collapses.  Its evidence was gathered where it is visible —
     * the host's even partials standing above its odd ones — so it is asked
     * only to still be there at all, not to stand up beside notes sounding in
     * the clear.  The host has to have survived too, or there is nothing for
     * it to have been hiding in. */
    const alive = new Set(scores.filter((x) => x.score > 0).map((x) => x.note.midi));
    const barFor = (s) => (s.note.hiddenIn !== undefined && alive.has(s.note.hiddenIn)
      ? best * keepRatio * 0.25 : best * keepRatio);
    const survivors = scores.filter((s) => s.score >= barFor(s) && s.hits >= 2 && !s.phantom);
    if (survivors.length === list.length) break;
    if (!survivors.length) break;
    list = survivors.map((s) => {
      s.note.confidence = Math.min(1, s.score / Math.max(1e-9, best));
      return s.note;
    });
  }
  return list;
}

/**
 * Remove the harmonic series of pitches already accounted for.
 *
 * What is left is what the notation does not explain, and a note hidden under
 * its own octave becomes visible in it.  This is the analysis-by-synthesis
 * step: take away what has been written down, and look at the remainder.
 */
export function residualSpectrum(magIn, binHz, hzList, opts = {}) {
  const { harmonics = 16, amount = 0.92 } = opts;
  const mag = whiten(magIn);
  for (const hz of hzList) {
    const info = salienceAt(mag, binHz, hz, { harmonics });
    subtract(mag, binHz, hz, info.partials, amount, partialEnvelope(info.partials));
  }
  return mag;
}

/** Estimate fundamentals from a spectrum that has already been whitened. */
export function estimateFromWhitened(mag, binHz, opts = {}) {
  return estimateF0s(mag, binHz, { ...opts, prewhitened: true });
}

/**
 * Estimate the fundamentals present in one spectral frame.
 * Returns [{ midi, hz, salience, confidence }], strongest first.
 */
export function estimateF0s(magIn, binHz, opts = {}) {
  const {
    maxVoices = 6,
    relThreshold = 0.14,
    absThreshold = 0,
    harmonics = 16,
    minMidi = MIN_MIDI,
    maxMidi = MAX_MIDI,
    octaveCheck = true,
    neighbourRatio = 2.6,
    prewhitened = false,
  } = opts;

  const mag = prewhitened ? Float32Array.from(magIn) : whiten(magIn);
  const residual = Float32Array.from(mag);
  const found = [];
  const masked = [];
  let first = 0;

  for (let v = 0; v < maxVoices; v++) {
    let bestMidi = -1;
    let bestSal = 0;
    let bestInfo = null;
    for (let m = minMidi; m <= maxMidi; m++) {
      const info = salienceAt(residual, binHz, midiToHz(m), { harmonics });
      if (info.salience > bestSal) { bestSal = info.salience; bestMidi = m; bestInfo = info; }
    }
    if (bestMidi < 0 || bestSal <= 0) break;
    if (v === 0) first = bestSal;
    /* A harmonic series runs upwards, so an artefact of a note already found
     * lies above it, never far below.  A candidate well below everything found
     * so far is therefore held to a lower bar — which is what lets a soft bass
     * note be heard under a loud treble one.  The sub-octave test below is
     * what guards the one case that does point downwards. */
    let lowest = Infinity;
    for (const f of found) lowest = Math.min(lowest, f.midi);
    const floor = bestMidi < lowest - 6 ? relThreshold * 0.35 : relThreshold;
    if (bestSal < first * floor || bestSal < absThreshold) break;

    let midi = bestMidi;
    let info = bestInfo;
    /* If the octave below has its own fundamental and odd partials present,
     * that is the note being played and this is its second harmonic. */
    if (octaveCheck && midi - 12 >= minMidi) {
      const lowHz = midiToHz(midi - 12);
      const sup = octaveSupport(residual, binHz, lowHz);
      if (sup.odd > sup.even * 0.55) {
        const lower = salienceAt(residual, binHz, lowHz, { harmonics });
        if (lower.salience > bestSal * 0.75) { midi -= 12; info = lower; }
      }
    }
    /* A candidate lying on another note's harmonic must earn its place. */
    if (found.length && coincidesWithFound(mag, binHz, midiToHz(midi), found, harmonics)) {
      subtract(residual, binHz, midiToHz(midi), info.partials, 0.9, partialEnvelope(info.partials));
      continue;
    }
    if (found.some((f) => f.midi === midi)) {
      /* Already have it: strip what is left of this series and move on. */
      subtract(residual, binHz, midiToHz(midi), info.partials, 0.9, partialEnvelope(info.partials));
      continue;
    }

    /* Refine the pitch from where the partials actually landed. */
    let num = 0;
    let den = 0;
    for (const p of info.partials) {
      if (!p.value || p.h > 6) continue;
      num += (p.hz / (p.h * Math.sqrt(1 + info.B * p.h * p.h))) * p.value;
      den += p.value;
    }
    const hz = den > 0 ? num / den : midiToHz(midi);
    const env = partialEnvelope(info.partials);

    found.push({
      midi,
      hz,
      salience: bestSal,
      confidence: Math.min(1, bestSal / Math.max(1e-9, first)) * Math.min(1, info.hits / 6),
    });
    for (const c of maskedCandidates(hz, info.partials)) masked.push({ ...c, host: midi });
    subtract(residual, binHz, hz, info.partials, 0.9, env);
  }

  /* Follow up the masked candidates: a note is only added if it still has
   * salience of its own once everything found so far has been removed. */
  for (const c of masked.sort((a, b) => b.excess - a.excess)) {
    if (isPhantomSubOctave(residual, binHz, midiToHz(c.midi))) continue;
    if (found.length >= maxVoices) break;
    if (found.some((f) => f.midi === c.midi)) continue;
    if (c.midi < minMidi || c.midi > maxMidi) continue;
    if (coincidesWithFound(mag, binHz, midiToHz(c.midi), found, harmonics)) continue;
    const info = salienceAt(residual, binHz, midiToHz(c.midi), { harmonics });
    /* A note hidden inside another's harmonics is judged against the note it
     * is hiding in, not against the loudest note in the chord.  Every one of
     * its partials has already been subtracted along with its host's, so what
     * is left of it is bound to be small — holding it to the same bar as a
     * note sounding in the clear is what loses the middle of a chord voiced in
     * octaves.  The evidence that it is there was collected where it is
     * visible: in the host's own partials standing above its odd series. */
    const bar = first * relThreshold * (c.octaveLike ? 0.35 : 1.1);
    if (info.salience < bar || info.hits < 3) continue;
    const env = partialEnvelope(info.partials);
    found.push({
      midi: c.midi,
      hz: midiToHz(c.midi),
      salience: info.salience,
      confidence: Math.min(1, info.salience / Math.max(1e-9, first)) * 0.8,
      masked: true,
      hiddenIn: c.octaveLike ? c.host : undefined,
    });
    subtract(residual, binHz, midiToHz(c.midi), info.partials, 0.9, env);
  }

  const verified = verifySet(mag, binHz, found, opts);

  /* No window short enough to follow a performance resolves two low notes a
   * semitone apart, so a weak detection beside a strong one is usually the
   * strong one's own skirts.  A cluster that was really played comes out with
   * its notes at comparable strength. */
  const pruned = verified.filter((n) => !verified.some((o) => o !== n
    && Math.abs(o.midi - n.midi) <= 2 && o.salience > n.salience * neighbourRatio));

  pruned.sort((a, b) => b.salience - a.salience);
  return pruned;
}

/**
 * Run the estimator over every frame.
 * Returns a per-frame array of detections plus a pitch-salience matrix used
 * later to spot repeated notes inside a held chord.
 */
export function analyseFrames(spec, opts = {}) {
  const { frames, binHz } = spec;
  const perFrame = [];
  const range = MAX_MIDI - MIN_MIDI + 1;
  const salience = [];
  for (let t = 0; t < frames.length; t++) {
    const det = estimateF0s(frames[t], binHz, opts);
    perFrame.push(det);
    const row = new Float32Array(range);
    for (const d of det) row[d.midi - MIN_MIDI] = d.salience;
    salience.push(row);
  }
  return { perFrame, salience };
}

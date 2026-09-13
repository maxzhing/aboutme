/* Cadenza — turning audio into note events.
 *
 * Analysis is driven by the attacks, not by a fixed grid.  A window that
 * straddles two notes reports both, so instead the onsets cut the take into
 * segments and each segment is analysed on its own; what sounds during a
 * segment is what was played there.
 *
 * A pitch that was already sounding simply continues, which keeps a held chord
 * from being re-detected under every melody note above it, and a pitch that
 * gains energy at an attack starts a new note, which is what tells a repeated
 * note from one long one.
 */

import { stft, toMono, rms, midiToHz } from './dsp.js';
import { estimateF0s, ownPartialEnergy } from './polyphony.js';
import { detectOnsets } from './onsets.js';

const POW2 = [1024, 2048, 4096, 8192, 16384];
const fitWindow = (seconds, sampleRate, cap) => {
  const want = seconds * sampleRate;
  let best = POW2[0];
  for (const p of POW2) if (p <= want && p <= cap) best = p;
  return Math.max(2048, best);
};

/** Analyse one stretch of audio and report the pitches sounding in it. */
export function analyseSegment(samples, sampleRate, from, to, opts) {
  const { maxVoices, sensitivity, pitchCap } = opts;
  const length = to - from;
  /* Long enough for good low-frequency resolution, but never long enough to
   * reach into the next note — a window that overruns reports the note after
   * this one as though it had already started. */
  const settle = Math.min(0.022, length * 0.25);
  /* Leave room to step past the attack before measuring.  The first few
   * milliseconds of a struck note are broadband noise, and a window that opens
   * on them reads that noise as extra notes. */
  const size = fitWindow(Math.min(length - settle, 0.22), sampleRate, pitchCap);
  const span = size / sampleRate;
  /* Every window has to finish inside the segment.  One that runs past the end
   * hears the next attack and reports that note as though it had already been
   * playing — which is how a transcription acquires notes a beat early. */
  const last = to - span;
  const positions = [];
  positions.push(Math.max(from, Math.min(from + settle, last)));
  for (const frac of [0.45, 0.7]) {
    if (length < 0.12) break;
    const at = Math.min(from + length * frac, last);
    if (at > positions[positions.length - 1] + 0.03) positions.push(at);
  }
  /* A staccato note leaves most of its segment empty.  Looking there and then
   * insisting a pitch be found in every window would throw the note away, so
   * only the windows that still have sound in them get a vote. */
  const loud = positions.map((at) => rms(samples, Math.round(at * sampleRate),
    Math.round((at + span) * sampleRate)));
  const peak = Math.max(...loud);
  const heard = positions.filter((_, i) => loud[i] >= peak * 0.15);

  const tally = new Map();
  let used = 0;
  for (const pos of heard) {
    const start = Math.round(pos * sampleRate);
    if (start + size > samples.length) continue;
    const slice = samples.subarray(start, start + size);
    const spec = stft(slice, { size, hop: size, sampleRate });
    if (!spec.frames.length) continue;
    const det = estimateF0s(spec.frames[0], spec.binHz, {
      maxVoices,
      relThreshold: 0.13 / Math.max(0.3, sensitivity),
    });
    used++;
    for (const d of det) {
      const prev = tally.get(d.midi) || { count: 0, salience: 0, confidence: 0, hz: d.hz };
      prev.count++;
      prev.salience += d.salience;
      prev.confidence += d.confidence;
      tally.set(d.midi, prev);
    }
  }
  if (!used) return new Map();

  /* A pitch has to hold up across the segment, not flash in one window. */
  const need = used >= 2 ? 2 : 1;
  const out = new Map();
  let strongest = 0;
  for (const [, v] of tally) strongest = Math.max(strongest, v.salience / v.count);
  for (const [midi, v] of tally) {
    if (v.count < need) continue;
    const salience = v.salience / v.count;
    /* Anything this far below the loudest thing in the segment is residue. */
    if (salience < strongest * 0.11) continue;
    out.set(midi, {
      midi,
      salience,
      confidence: (v.confidence / v.count) * (v.count / used),
    });
  }
  return out;
}

/* Windows for the re-attack test, shortest first. */
const ATTACK_WINDOWS = [1024, 2048, 4096];

/**
 * Was this pitch struck again at `t`, or is it simply still ringing?
 *
 * A struck string starts over: the energy just after the attack stands well
 * above the decayed level just before it.  A note that is merely still
 * sounding while the music changes around it does not.  The measurement uses
 * only the partials this pitch does not share with its neighbours, so a held
 * note is not reported as re-struck every time a melody note above it moves
 * through one of its harmonics.
 *
 * Returns the after/before ratio, or null when there is not room to measure.
 */
function reattackRatio(samples, sampleRate, t, midi, others, earliest, latest) {
  const gap = 0.012;
  const hz = midiToHz(midi);
  const room = Math.min(t - earliest, latest - t) - gap;
  /* The shortest window that can still tell this note apart from its
   * neighbours.  Long windows average across the whole of the previous note
   * instead of reporting the level it had fallen to just before this attack;
   * short ones cannot separate two notes a tone apart, and measure their sum.
   * The compromise is to ask only for enough resolution to separate them at
   * the third partial, where neighbouring notes are three times further apart
   * in Hz than they are at the fundamental.  When even the longest window
   * available cannot manage that — a low bass note, or an attack too close to
   * the one before — the honest answer is that we cannot tell, and the note
   * stays whole. */
  const needed = 14 * sampleRate / hz;
  let size = 0;
  for (const w of ATTACK_WINDOWS) {
    if (w / sampleRate <= room && w >= needed) { size = w; break; }
  }
  if (!size) return null;
  const measure = (at) => {
    const start = Math.round(at * sampleRate);
    if (start < 0 || start + size > samples.length) return null;
    const spec = stft(samples.subarray(start, start + size), { size, hop: size, sampleRate });
    if (!spec.frames.length) return null;
    return ownPartialEnergy(spec.frames[0], spec.binHz, hz, others).energy;
  };
  const before = measure(t - gap - size / sampleRate);
  const after = measure(t + gap);
  if (before === null || after === null) return null;
  if (before < 1e-7) return after > 1e-7 ? Infinity : null;
  return after / before;
}

/**
 * Extract note events from audio.
 * Returns { notes, onsets, duration, sampleRate }; each note is
 * { midi, start, end, velocity, confidence }.
 */
export function extractNotes(audio, options = {}) {
  const {
    sampleRate = 44100,
    maxVoices = 6,
    sensitivity = 1,
    minDuration = 0.05,
    pitchCap = 8192,
    silenceFloor = 0.012,
    reattack = 1.45,
    attackFloor = 0.42,
    onProgress = null,
  } = options;

  const samples = toMono(audio);
  const duration = samples.length / sampleRate;
  const { onsets } = detectOnsets(samples, { sampleRate, sensitivity });

  /* Attacks cut the take into segments, starting from the first sound. */
  const bounds = [{ time: onsets.length ? Math.min(onsets[0].time, 0.02) : 0, strength: 1 }];
  for (const o of onsets) {
    if (o.time > bounds[bounds.length - 1].time + 0.05) bounds.push(o);
  }
  bounds.push({ time: duration, strength: 0 });

  const segments = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const from = bounds[i].time;
    const to = bounds[i + 1].time;
    if (to - from < 0.03) continue;
    const level = rms(samples, Math.round(from * sampleRate), Math.round(to * sampleRate));
    segments.push({ from, to, level, strength: bounds[i].strength, strongest: 0, pitches: new Map() });
  }
  let loudestSeg = 0;
  for (const s of segments) loudestSeg = Math.max(loudestSeg, s.level);

  segments.forEach((seg, i) => {
    if (seg.level > loudestSeg * silenceFloor) {
      seg.pitches = analyseSegment(samples, sampleRate, seg.from, seg.to,
        { maxVoices, sensitivity, pitchCap });
      for (const p of seg.pitches.values()) seg.strongest = Math.max(seg.strongest, p.salience);
    }
    if (onProgress) onProgress((i + 1) / segments.length);
  });

  /* Stitch segments into notes. */
  const open = new Map();   // midi -> note being built
  const notes = [];
  const close = (midi, end) => {
    const n = open.get(midi);
    if (!n) return;
    n.end = end;
    open.delete(midi);
    if (n.end - n.start >= minDuration) notes.push(n);
  };

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const prev = segments[i - 1];
    for (const [midi, info] of seg.pitches) {
      const cur = open.get(midi);
      if (cur && prev) {
        /* Everything else sounding across this boundary, so the test can
         * ignore the partials this pitch shares with any of it. */
        const others = [];
        for (const m of seg.pitches.keys()) if (m !== midi) others.push(midiToHz(m));
        for (const m of prev.pitches.keys()) {
          if (m !== midi && !seg.pitches.has(m)) others.push(midiToHz(m));
        }
        /* Two independent things have to agree before a held note is cut in
         * two: something was struck at this instant, and it was this note's
         * own partials that gained the energy. */
        const struck = (seg.strength || 0) >= attackFloor;
        const ratio = struck ? reattackRatio(samples, sampleRate, seg.from, midi, others,
          Math.max(prev.from, cur.start), seg.to) : null;
        if (ratio !== null && ratio > reattack) close(midi, seg.from);
      }
      if (!open.has(midi)) {
        /* Notes begin when something is struck.  A pitch that first appears at
         * a boundary where nothing much happened, and is faint beside what is
         * already sounding, is the residue of the notes around it rather than
         * a note of its own — real playing that soft does not arrive without
         * an attack to announce it. */
        if (i > 0 && (seg.strength || 0) < attackFloor
            && info.salience < seg.strongest * 0.25) continue;
        open.set(midi, {
          midi, start: seg.from, end: seg.to, velocity: 0,
          salience: info.salience, confidence: info.confidence, frames: 1,
        });
      } else {
        const n = open.get(midi);
        n.end = seg.to;
        n.frames++;
        n.confidence = (n.confidence * (n.frames - 1) + info.confidence) / n.frames;
        n.salience = Math.max(n.salience, info.salience);
      }
    }
    /* A pitch missing from this segment stopped at its boundary, not at the
     * far end of it — closing late would swallow the rest that follows. */
    for (const midi of [...open.keys()]) {
      if (!seg.pitches.has(midi)) close(midi, seg.from);
    }
  }
  for (const midi of [...open.keys()]) close(midi, duration);

  /* Drop what is left of decayed notes: real notes stand far above this. */
  let strongest = 0;
  for (const n of notes) strongest = Math.max(strongest, n.salience);
  const floor = strongest * 0.035;
  for (let i = notes.length - 1; i >= 0; i--) if (notes[i].salience < floor) notes.splice(i, 1);

  /* Velocity from the level at each attack, scaled across the whole take. */
  let loudest = 0;
  for (const n of notes) {
    const a = Math.round(n.start * sampleRate);
    n._level = rms(samples, a, a + Math.round(0.05 * sampleRate));
    loudest = Math.max(loudest, n._level);
  }
  for (const n of notes) {
    n.velocity = Math.max(20, Math.min(127, Math.round(32 + 78 * (n._level / (loudest || 1)))));
    delete n._level;
    delete n.frames;
  }

  notes.sort((a, b) => a.start - b.start || a.midi - b.midi);
  return { notes, onsets, duration, sampleRate };
}

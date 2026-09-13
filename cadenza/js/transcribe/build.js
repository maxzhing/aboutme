/* Cadenza — writing what was played out as notation.
 *
 * By this point the notes are known, as are the pulse, the metre and which
 * hand played what.  What is left is the part a copyist would do: decide the
 * key, spell each note within it, divide the music into bars, and write each
 * note as a value a reader can read — tying across barlines, filling silence
 * with rests, and never leaving a bar that does not add up.
 */

import * as M from '../core/model.js';
import * as T from '../core/theory.js';
import { TPQ, measureTicks, splitIntoDurations, durationTicks, durationForTicks } from '../core/rhythm.js';

/* ------------------------------------------------------------------- key */

/* Krumhansl and Kessler's profiles: how much each degree of the scale is used
 * in tonal music, measured from listeners rather than assumed. */
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const FIFTHS_MAJOR = { 0: 0, 7: 1, 2: 2, 9: 3, 4: 4, 11: 5, 6: 6, 1: -5, 8: -4, 3: -3, 10: -2, 5: -1 };
const FIFTHS_MINOR = { 9: 0, 4: 1, 11: 2, 6: 3, 1: 4, 8: 5, 3: 6, 10: -5, 5: -4, 0: -3, 7: -2, 2: -1 };

function correlate(hist, profile, rotation) {
  const n = 12;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) { sx += hist[i]; sy += profile[i]; }
  const mx = sx / n;
  const my = sy / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = hist[(i + rotation) % n] - mx;
    const b = profile[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}

/**
 * Work out the key, weighting each pitch class by how long it sounded.
 * A passing note touched once counts for much less than a tonic held.
 */
export function detectKey(notes) {
  const hist = new Array(12).fill(0);
  for (const n of notes) {
    const len = Math.max(1, (n.endTicks || 0) - (n.startTicks || 0)) / TPQ;
    hist[((n.midi % 12) + 12) % 12] += Math.min(4, len);
  }
  if (!hist.some((v) => v > 0)) return { fifths: 0, mode: 'major', tonic: 0, confidence: 0 };

  let best = null;
  for (let tonic = 0; tonic < 12; tonic++) {
    for (const mode of ['major', 'minor']) {
      const score = correlate(hist, mode === 'major' ? MAJOR_PROFILE : MINOR_PROFILE, tonic);
      if (!best || score > best.score) best = { tonic, mode, score };
    }
  }
  /* How clearly the winner beats the runner-up is the honest confidence. */
  let second = -1;
  for (let tonic = 0; tonic < 12; tonic++) {
    for (const mode of ['major', 'minor']) {
      if (tonic === best.tonic && mode === best.mode) continue;
      second = Math.max(second, correlate(hist, mode === 'major' ? MAJOR_PROFILE : MINOR_PROFILE, tonic));
    }
  }
  const fifths = best.mode === 'major' ? FIFTHS_MAJOR[best.tonic] : FIFTHS_MINOR[best.tonic];
  return {
    fifths: fifths === undefined ? 0 : fifths,
    mode: best.mode,
    tonic: best.tonic,
    confidence: Math.max(0, Math.min(1, (best.score - second) * 3)),
  };
}

/* --------------------------------------------------------------- spelling */

/* Which letter to use for each semitone above C, written sharp then flat. */
const SHARP_SPELLING = [
  [0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [5, 0], [5, 1], [6, 0],
];
const FLAT_SPELLING = [
  [0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [4, -1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0],
];

/**
 * Name a pitch inside a key.
 *
 * A note that belongs to the key is spelled as the key spells it, so that no
 * accidental is needed.  One that does not takes the direction the key is
 * already going — sharps in sharp keys, flats in flat keys — which is what
 * makes an F sharp in G major and a G flat in D flat major the same sound
 * written the way each key wants it.
 */
export function spell(midi, fifths = 0) {
  const pc = ((midi % 12) + 12) % 12;
  const scale = new Set();
  const alters = T.keyAlterations(fifths);
  for (let step = 0; step < 7; step++) {
    scale.add((((T.STEP_SEMITONES[step] + (alters[step] || 0)) % 12) + 12) % 12);
  }
  let step;
  let alter;
  if (scale.has(pc)) {
    for (let s = 0; s < 7; s++) {
      const semi = (((T.STEP_SEMITONES[s] + (alters[s] || 0)) % 12) + 12) % 12;
      if (semi === pc) { step = s; alter = alters[s] || 0; break; }
    }
  } else {
    [step, alter] = fifths < 0 ? FLAT_SPELLING[pc] : SHARP_SPELLING[pc];
  }
  /* B sharp and C flat cross the octave; keep the sounding pitch exact. */
  const naturalMidi = T.STEP_SEMITONES[step] + alter;
  let octave = Math.floor(midi / 12) - 1;
  if (naturalMidi >= 12) octave -= 1;
  if (naturalMidi < 0) octave += 1;
  return T.pitch(step, octave, alter);
}

/* ----------------------------------------------------------------- score */

/* A beat divided into three, five or six parts is a tuplet beat: its division
 * is not a power of two, so no plain note value fits it. */
const isTupletDivision = (d) => d > 1 && (d & (d - 1)) !== 0;

/** What a tuplet of this division is written against: 3 against 2, 6 against 4. */
function normalFor(division) {
  let n = 1;
  while (n * 2 < division) n *= 2;
  return n;
}

/** One voice's worth of events laid out through the piece. */
function layOutVoice(chords, ts, measures, fifths, plan) {
  const bar = measureTicks(ts);
  const out = [];
  for (let m = 0; m < measures; m++) out.push([]);
  const state = { out, ts, measures, fifths, plan, tupletIds: new Map() };

  const sorted = [...chords].sort((a, b) => a.startTicks - b.startTicks);
  let pos = 0;
  for (const chord of sorted) {
    if (chord.startTicks < pos) continue;             // overlapped; already covered
    if (chord.startTicks > pos) fill(state, pos, chord.startTicks, null);
    const end = Math.max(chord.startTicks + 1, chord.endTicks);
    fill(state, chord.startTicks, end, chord);
    pos = end;
  }
  const total = measures * bar;
  if (pos < total) fill(state, pos, total, null);
  return out;
}

/**
 * Write a span from `from` to `to` as notes or rests.
 *
 * The span is cut at every barline, and at the edge of any beat that was
 * played in threes, because a triplet is written inside its beat and not
 * across it.  Each piece gets the values a reader expects for where it starts
 * in the bar, and the pieces of one note are joined with ties.
 */
function fill(state, from, to, chord) {
  const { out, ts, measures, fifths, plan } = state;
  const bar = measureTicks(ts);
  const perBeat = plan.perBeat;
  let pos = from;
  let first = true;
  let guard = 0;

  const emit = (m, id, dots, tuplet, last) => {
    if (!chord) {
      out[m].push(M.makeRest(id, { dots, tuplet: tuplet || null }));
      return;
    }
    const ev = M.makeNote(chord.notes.map((n) => spell(n.midi, fifths)), id,
      { dots, tuplet: tuplet || null });
    for (const note of ev.notes) {
      note.tie = first && last ? null : first ? 'start' : last ? 'stop' : 'both';
    }
    if (chord.confidence !== undefined) ev.transcribeConfidence = chord.confidence;
    out[m].push(ev);
    first = false;
  };

  while (pos < to && guard++ < 512) {
    const m = Math.floor(pos / bar);
    if (m >= measures) break;
    const barEnd = (m + 1) * bar;
    const bi = Math.floor(pos / perBeat);
    const division = plan.divisionAt(bi);

    if (isTupletDivision(division)) {
      const beatEnd = (bi + 1) * perBeat;
      const stop = Math.min(to, beatEnd, barEnd);
      pos = writeTuplet(state, m, bi, pos, stop, division, to, emit);
      continue;
    }

    /* Run on through the following beats for as long as they are ordinary, so
     * a long note stays one note instead of a chain of tied beats. */
    let stop = Math.min(to, barEnd);
    for (let b = bi + 1; b * perBeat < stop; b++) {
      if (isTupletDivision(plan.divisionAt(b))) { stop = b * perBeat; break; }
    }
    if (stop <= pos) break;
    const pieces = splitIntoDurations(stop - pos, pos - m * bar, ts);
    if (!pieces.length) break;
    for (let i = 0; i < pieces.length; i++) {
      const d = pieces[i];
      emit(m, d.id, d.dots, null, stop >= to && i === pieces.length - 1);
      pos += durationTicks(d.id, d.dots);
    }
  }
}

/**
 * Write part of a beat that was played in threes (or fives, or sixes).
 *
 * The unit is the beat divided by however many parts were played in it, and a
 * note lasting so many of those units is written as the value it would have
 * had in an ordinary beat, marked as belonging to the tuplet.  A note that
 * happens to fill the whole beat needs no tuplet at all and is written plainly.
 */
function writeTuplet(state, m, beatIndex, from, to, division, spanEnd, emit) {
  const { plan } = state;
  const perBeat = plan.perBeat;
  const unit = perBeat / division;
  const normal = normalFor(division);
  let units = Math.round((to - from) / unit);
  if (units <= 0) return to;

  const beatStart = beatIndex * perBeat;
  if (from === beatStart && units === division) {
    const whole = durationForTicks(perBeat);
    if (whole) {
      emit(m, whole.id, whole.dots, null, to >= spanEnd);
      return to;
    }
  }

  if (!state.tupletIds.has(beatIndex)) state.tupletIds.set(beatIndex, M.newId('t'));
  const id = state.tupletIds.get(beatIndex);
  let pos = from;
  let guard = 0;
  while (units > 0 && guard++ < 32) {
    let take = units;
    let value = null;
    while (take > 0) {
      value = durationForTicks(Math.round((take * perBeat) / normal));
      if (value) break;
      take--;
    }
    if (!value) break;
    emit(m, value.id, value.dots,
      { id, actual: division, normal, bracket: true, number: true },
      pos + take * unit >= spanEnd);
    pos += take * unit;
    units -= take;
  }
  return pos;
}

/**
 * Build a playable, editable score from the analysed performance.
 *
 * Returns { score, stats } where stats carries what the analysis was sure of,
 * so the interface can show where to look rather than claiming it is all
 * correct.
 */
export function buildScore(chords, opts = {}) {
  const {
    timeSig = { beats: 4, beatType: 4, symbol: 'common' },
    bpm = 120,
    fifths = 0,
    mode = 'major',
    staves = 2,
    instrumentId = staves > 1 ? 'piano' : 'flute',
    title = 'Transcription',
    composer = '',
    plan = null,
  } = opts;
  const perBeat = plan ? plan.perBeat : TPQ;
  const divisions = plan ? plan.divisions : new Map();
  const layout = { perBeat, divisionAt: (b) => divisions.get(b) || 1 };

  const bar = measureTicks(timeSig);
  const last = chords.reduce((a, c) => Math.max(a, c.endTicks), 0);
  const measures = Math.max(1, Math.ceil(last / bar));

  const score = M.createScore({
    title,
    composer,
    instrumentIds: [instrumentId],
    measures,
    timeSig,
    keySig: { fifths, mode },
    tempo: { bpm: Math.round(bpm), unit: 'quarter' },
  });
  const part = score.parts[0];

  /* Cadenza puts even voice numbers on the upper staff and odd ones on the
   * lower, so a hand and a line together name the voice to write into. */
  const streams = new Map();
  for (const c of chords) {
    const staff = staves > 1 ? (c.staff || 0) : 0;
    const idx = staves > 1 ? (c.voice || 0) * 2 + staff : (c.voice || 0);
    if (!streams.has(idx)) streams.set(idx, []);
    streams.get(idx).push(c);
  }
  if (!streams.size) streams.set(0, []);

  const voiceCount = Math.max(...streams.keys()) + 1;
  for (let m = 0; m < measures; m++) {
    const pm = part.measures[m];
    pm.voices = [];
    for (let v = 0; v < voiceCount; v++) pm.voices.push([]);
  }
  for (const [idx, list] of streams) {
    const laid = layOutVoice(list, timeSig, measures, fifths, layout);
    for (let m = 0; m < measures; m++) part.measures[m].voices[idx] = laid[m];
  }

  M.normalizeScore(score);
  return { score, measures, voiceCount };
}

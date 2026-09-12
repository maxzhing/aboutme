/* Cadenza — the score document.
 *
 * A score owns a global timeline of measure specifications (meter, key, tempo,
 * barlines) and a list of parts.  Every part carries one measure per timeline
 * slot, so the vertical alignment of the score is structural rather than
 * something layout has to reconstruct.
 *
 * Pitches are stored as *written* pitch — what the player reads.  Sounding
 * pitch is derived from the part's transposition at playback and export time.
 */

import { pitch, toMidi, diatonic, fromDiatonic, neededAccidental } from './theory.js';
import { TPQ, measureTicks, durationTicks, eventTicks, splitIntoDurations, durationForTicks } from './rhythm.js';
import { getInstrument, scoreOrder } from './instruments.js';
import { suggestSpatium } from '../engrave/metrics.js';

let idCounter = 0;
export function newId(prefix = 'e') {
  return prefix + (++idCounter).toString(36) + Math.floor(Math.random() * 1296).toString(36);
}

/* ------------------------------------------------------------------ events */

export function makeNote(pitches, duration = 'quarter', opts = {}) {
  return {
    id: newId('n'),
    type: 'note',
    duration,
    dots: 0,
    tuplet: null,
    notes: (Array.isArray(pitches) ? pitches : [pitches]).map((p) => ({
      pitch: p, tie: null, accidental: 'auto', head: 'normal', parenthesized: false,
    })),
    articulations: [],
    ornaments: [],
    dynamic: null,
    texts: [],
    lyrics: [],
    fingerings: [],
    chordSymbol: null,
    roman: null,
    grace: null,
    tremolo: 0,
    arpeggio: false,
    stemDir: 'auto',
    beamBreak: false,
    slur: null,
    staff: null,        // null = the staff this voice normally lives on
    figures: null,      // figured bass, bottom figure first
    ...opts,
  };
}

export function makeRest(duration = 'quarter', opts = {}) {
  return {
    id: newId('r'),
    type: 'rest',
    duration,
    dots: 0,
    tuplet: null,
    notes: [],
    articulations: [],
    ornaments: [],
    dynamic: null,
    texts: [],
    lyrics: [],
    fingerings: [],
    chordSymbol: null,
    roman: null,
    grace: null,
    tremolo: 0,
    arpeggio: false,
    stemDir: 'auto',
    beamBreak: false,
    slur: null,
    staff: null,
    figures: null,
    fullMeasure: false,
    barTicks: 0,        // set on whole-bar rests: the length of the bar
    ...opts,
  };
}

export function cloneEvent(ev) {
  const c = JSON.parse(JSON.stringify(ev));
  c.id = newId(ev.type === 'note' ? 'n' : 'r');
  return c;
}

/* ---------------------------------------------------------------- measures */

export function makeMeasureSpec(opts = {}) {
  return {
    timeSig: null,       // null inherits from the previous measure
    keySig: null,
    tempo: null,         // { bpm, unit, text }
    barline: 'normal',   // normal | double | final | repeat-start | repeat-end | repeat-both | dashed
    rehearsal: null,
    systemBreak: false,
    pageBreak: false,
    repeatEndings: null, // { number, type: 'start' | 'stop' | 'discontinue' }
    ...opts,
  };
}

export function makePartMeasure(staves = 1) {
  return {
    voices: [[]],
    staffVoices: staves > 1 ? [[0], [1]] : null,
    clefChange: null,    // mid-score clef change, per staff: { 0: 'bass' }
  };
}

/* ------------------------------------------------------------------- parts */

export function makePart(instrumentId, measureCount, opts = {}) {
  const inst = getInstrument(instrumentId);
  const part = {
    id: newId('p'),
    instrumentId,
    name: inst.name,
    abbrev: inst.abbrev,
    program: inst.program,
    clef: inst.clef,
    clef2: inst.clef2 || null,
    staves: inst.staves,
    transpose: { ...inst.transpose },
    volume: 0.8,
    pan: 0,
    mute: false,
    solo: false,
    visible: true,
    synth: inst.synth,
    measures: [],
    ...opts,
  };
  for (let i = 0; i < measureCount; i++) part.measures.push(makePartMeasure(part.staves));
  return part;
}

/* ------------------------------------------------------------------- score */

export function makeScore(opts = {}) {
  const score = {
    version: 1,
    title: 'Untitled Score',
    subtitle: '',
    composer: '',
    lyricist: '',
    copyright: '',
    tempo: 96,
    tempoUnit: 'quarter',
    parts: [],
    measures: [],
    spanners: [],        // slurs, hairpins, 8va, pedal — reference event ids
    pageSize: 'letter',
    orientation: 'portrait',
    spatium: 1.75,       // mm; controls engraved size
    autoSize: true,      // keep the staff size in step with the ensemble
    concertPitch: false,
    ...opts,
  };
  return score;
}

/** Build a fresh score from an ensemble of instrument ids. */
export function createScore({ title, composer, instrumentIds, measures = 16, timeSig, keySig, tempo }) {
  const score = makeScore({ title: title || 'Untitled Score', composer: composer || '' });
  score.tempo = tempo || 96;
  for (let i = 0; i < measures; i++) score.measures.push(makeMeasureSpec());
  score.measures[0].timeSig = timeSig || { beats: 4, beatType: 4, symbol: 'common' };
  score.measures[0].keySig = keySig || { fifths: 0, mode: 'major' };
  score.measures[0].tempo = { bpm: score.tempo, unit: 'quarter', text: tempoText(score.tempo) };
  score.measures[measures - 1].barline = 'final';
  const ids = [...instrumentIds].sort((a, b) => scoreOrder(a) - scoreOrder(b));
  for (const id of ids) score.parts.push(makePart(id, measures));
  autoScale(score);
  normalizeScore(score);
  return score;
}

/** Re-fit the staff size to the current ensemble, unless it was set by hand. */
export function autoScale(score) {
  if (!score.autoSize) return;
  const staves = score.parts.reduce((a, p) => a + (p.staves || 1), 0);
  score.spatium = suggestSpatium(staves);
}

export function tempoText(bpm) {
  if (bpm < 46) return 'Grave';
  if (bpm < 56) return 'Largo';
  if (bpm < 66) return 'Lento';
  if (bpm < 76) return 'Adagio';
  if (bpm < 98) return 'Andante';
  if (bpm < 110) return 'Moderato';
  if (bpm < 132) return 'Allegretto';
  if (bpm < 168) return 'Allegro';
  if (bpm < 200) return 'Vivace';
  return 'Presto';
}

/* ------------------------------------------------------------- timeline API */

export function timeSigAt(score, measureIndex) {
  for (let i = Math.min(measureIndex, score.measures.length - 1); i >= 0; i--) {
    if (score.measures[i] && score.measures[i].timeSig) return score.measures[i].timeSig;
  }
  return { beats: 4, beatType: 4, symbol: 'common' };
}

export function keySigAt(score, measureIndex) {
  for (let i = Math.min(measureIndex, score.measures.length - 1); i >= 0; i--) {
    if (score.measures[i] && score.measures[i].keySig) return score.measures[i].keySig;
  }
  return { fifths: 0, mode: 'major' };
}

export function tempoAt(score, measureIndex) {
  let t = { bpm: score.tempo, unit: 'quarter' };
  for (let i = 0; i <= Math.min(measureIndex, score.measures.length - 1); i++) {
    if (score.measures[i] && score.measures[i].tempo) t = score.measures[i].tempo;
  }
  return t;
}

/** Clef in force for a staff of a part at a given measure. */
export function clefAt(score, part, measureIndex, staff = 0) {
  let clef = staff === 1 ? part.clef2 || 'bass' : part.clef;
  for (let i = 0; i <= Math.min(measureIndex, part.measures.length - 1); i++) {
    const cc = part.measures[i] && part.measures[i].clefChange;
    if (cc && cc[staff]) clef = cc[staff];
  }
  return clef;
}

/** Total ticks in a voice. */
export function voiceTicks(voice) {
  let t = 0;
  for (const ev of voice) if (!ev.grace) t += eventTicks(ev);
  return t;
}

/** Tick offset of event `index` within its voice. */
export function tickAt(voice, index) {
  let t = 0;
  for (let i = 0; i < index && i < voice.length; i++) if (!voice[i].grace) t += eventTicks(voice[i]);
  return t;
}

/** Index of the event sounding at `tick`, or -1. */
export function indexAtTick(voice, tick) {
  let t = 0;
  for (let i = 0; i < voice.length; i++) {
    if (voice[i].grace) continue;
    const len = eventTicks(voice[i]);
    if (tick >= t && tick < t + len) return i;
    t += len;
  }
  return -1;
}

/* --------------------------------------------------------- accidentals */

/** Which staff of its part a voice normally sits on. */
export function voiceStaffOf(part, voiceIndex) {
  if ((part.staves || 1) < 2) return 0;
  return voiceIndex % 2 === 0 ? 0 : 1;
}

/**
 * Decide which accidental every note on one staff of one bar needs.
 *
 * An accidental holds for the rest of the bar at that pitch and octave, and it
 * holds for *every voice on the staff* — so this walks the bar in time order
 * rather than voice by voice.  A note tied over the barline keeps the
 * accidental it was given, and never restates it.
 *
 * Returns a map from "eventId:noteIndex" to the alteration to print, or null.
 */
export function measureAccidentals(score, part, mIdx, staff, fifths, transform) {
  const pm = part.measures[mIdx];
  const out = new Map();
  if (!pm) return out;
  const show = transform || ((p) => p);
  const writtenStaff = (ev, v) =>
    (ev.staff === null || ev.staff === undefined ? voiceStaffOf(part, v) : ev.staff);

  const entries = [];
  for (let v = 0; v < pm.voices.length; v++) {
    let tick = 0;
    for (const ev of pm.voices[v]) {
      if (ev.type === 'note' && writtenStaff(ev, v) === staff) entries.push({ tick, voice: v, ev });
      if (!ev.grace) tick += eventTicks(ev);
    }
  }
  entries.sort((a, b) => a.tick - b.tick || a.voice - b.voice);

  /* Seed from anything tied in over the barline. */
  const state = {};
  const prev = mIdx > 0 ? part.measures[mIdx - 1] : null;
  if (prev) {
    for (let v = 0; v < prev.voices.length; v++) {
      for (const ev of prev.voices[v]) {
        if (ev.type !== 'note' || writtenStaff(ev, v) !== staff) continue;
        for (const n of ev.notes) {
          if (n.tie !== 'start' && n.tie !== 'both') continue;
          const p = show(n.pitch);
          state[p.step + ':' + p.octave] = p.alter;
        }
      }
    }
  }

  for (const e of entries) {
    e.ev.notes.forEach((n, ni) => {
      const p = show(n.pitch);
      const forced = n.accidental === 'show' ? 'show' : n.accidental === 'none' ? 'none' : null;
      if (n.tie === 'stop' && forced !== 'show') {
        state[p.step + ':' + p.octave] = p.alter;
        out.set(e.ev.id + ':' + ni, null);
        return;
      }
      out.set(e.ev.id + ':' + ni, neededAccidental(p, fifths, state, forced));
    });
  }
  return out;
}

/**
 * The alteration already in force for a pitch at a point in a bar, from any
 * voice on the staff — what a player would carry over when reading on.
 * Returns null when nothing has altered that pitch yet.
 */
export function alterInForce(part, mIdx, staff, tick, step, octave) {
  const pm = part.measures[mIdx];
  if (!pm) return null;
  let found = null;
  let foundAt = -1;
  for (let v = 0; v < pm.voices.length; v++) {
    const home = (ev) => (ev.staff === null || ev.staff === undefined ? voiceStaffOf(part, v) : ev.staff);
    let t = 0;
    for (const ev of pm.voices[v]) {
      if (ev.type === 'note' && t <= tick && home(ev) === staff && t >= foundAt) {
        for (const n of ev.notes) {
          if (n.pitch.step === step && n.pitch.octave === octave) { found = n.pitch.alter; foundAt = t; }
        }
      }
      if (!ev.grace) t += eventTicks(ev);
    }
  }
  return found;
}

/* --------------------------------------------------------- normalisation */

/**
 * Make every voice exactly fill its measure: pad short voices with rests,
 * collapse empty voices to a single whole-measure rest, and trim overflow.
 */
export function normalizeScore(score) {
  for (const part of score.parts) {
    while (part.measures.length < score.measures.length) {
      part.measures.push(makePartMeasure(part.staves));
    }
    part.measures.length = score.measures.length;
    for (let m = 0; m < part.measures.length; m++) {
      normalizeMeasure(score, part, m);
    }
  }
  pruneSpanners(score);
}

export function normalizeMeasure(score, part, m) {
  const ts = timeSigAt(score, m);
  const full = measureTicks(ts);
  const pm = part.measures[m];
  if (!pm.voices.length) pm.voices = [[]];
  for (let v = 0; v < pm.voices.length; v++) {
    const voice = pm.voices[v];
    if (!voice.length) {
      if (v === 0) voice.push(makeRest('whole', { fullMeasure: true, barTicks: full }));
      continue;
    }
    /* A bar holding one rest is a whole-bar rest: drawn as a semibreve in any
     * meter, and re-measured here so a change of meter keeps it exact. */
    if (voice.length === 1 && voice[0].type === 'rest' && !voice[0].tuplet
      && (voice[0].fullMeasure || eventTicks(voice[0]) === full)) {
      voice[0].fullMeasure = true;
      voice[0].barTicks = full;
      voice[0].duration = 'whole';
      voice[0].dots = 0;
      continue;
    }
    /* Conversely, a rest that is no longer alone is an ordinary rest again. */
    for (const ev of voice) {
      if (ev.fullMeasure && voice.length > 1) { ev.fullMeasure = false; ev.barTicks = 0; }
    }
    /* Drop a stale full-measure rest that now shares the bar with real notes. */
    if (voice.length > 1) for (const ev of voice) ev.fullMeasure = false;
    let total = voiceTicks(voice);
    if (total > full) {
      /* Trim from the end until the bar fits. */
      while (voice.length && voiceTicks(voice) > full) {
        const last = voice[voice.length - 1];
        const over = voiceTicks(voice) - full;
        const len = eventTicks(last);
        if (len - over > 0) {
          const fit = durationForTicks(len - over);
          if (fit) { last.duration = fit.id; last.dots = fit.dots; break; }
        }
        voice.pop();
      }
      total = voiceTicks(voice);
    }
    /* Close the bar exactly.  A span left over from an interrupted tuplet (or
     * from a foreign file) may not be expressible by any combination of
     * notatable values; when that happens, give up the trailing event and try
     * again rather than leaving the bar short. */
    let guard = 0;
    while (voiceTicks(voice) !== full && guard++ < 200) {
      const cur = voiceTicks(voice);
      if (cur > full) { voice.pop(); continue; }
      const parts = splitIntoDurations(full - cur, cur, ts);
      const sum = parts.reduce((a, d) => a + durationTicks(d.id, d.dots), 0);
      if (sum === full - cur) {
        for (const d of parts) voice.push(makeRest(d.id, { dots: d.dots }));
        continue;
      }
      if (!voice.length) break;
      voice.pop();
    }
  }
  /* Remove trailing empty voices beyond the first. */
  while (pm.voices.length > 1 && isRestOnly(pm.voices[pm.voices.length - 1])) pm.voices.pop();
}

export function isRestOnly(voice) {
  return voice.every((ev) => ev.type === 'rest');
}

/** Drop spanners whose endpoints no longer exist. */
export function pruneSpanners(score) {
  const live = new Set();
  for (const part of score.parts) {
    for (const pm of part.measures) for (const voice of pm.voices) for (const ev of voice) live.add(ev.id);
  }
  score.spanners = score.spanners.filter((s) => live.has(s.fromId) && live.has(s.toId));
}

/* --------------------------------------------------------------- locating */

/** Find where an event lives.  Returns { part, partIndex, measure, voice, index }. */
export function locateEvent(score, eventId) {
  for (let pi = 0; pi < score.parts.length; pi++) {
    const part = score.parts[pi];
    for (let m = 0; m < part.measures.length; m++) {
      const pm = part.measures[m];
      for (let v = 0; v < pm.voices.length; v++) {
        const idx = pm.voices[v].findIndex((e) => e.id === eventId);
        if (idx >= 0) return { part, partIndex: pi, measure: m, voice: v, index: idx, event: pm.voices[v][idx] };
      }
    }
  }
  return null;
}

export function getVoice(score, partIndex, measure, voice) {
  const part = score.parts[partIndex];
  if (!part) return null;
  const pm = part.measures[measure];
  if (!pm) return null;
  while (pm.voices.length <= voice) pm.voices.push([]);
  return pm.voices[voice];
}

/** Iterate every event in the score in reading order. */
export function* iterEvents(score, { partIndex = null } = {}) {
  const parts = partIndex === null ? score.parts : [score.parts[partIndex]];
  for (let pi = 0; pi < parts.length; pi++) {
    const part = parts[pi];
    if (!part) continue;
    for (let m = 0; m < part.measures.length; m++) {
      const pm = part.measures[m];
      for (let v = 0; v < pm.voices.length; v++) {
        let tick = 0;
        for (let i = 0; i < pm.voices[v].length; i++) {
          const ev = pm.voices[v][i];
          yield { part, partIndex: partIndex === null ? pi : partIndex, measure: m, voice: v, index: i, event: ev, tick };
          if (!ev.grace) tick += eventTicks(ev);
        }
      }
    }
  }
}

/* ----------------------------------------------------------- time mapping */

/** Absolute tick at which each measure begins, plus the score's total length. */
export function measureTickMap(score) {
  const starts = [];
  let t = 0;
  for (let m = 0; m < score.measures.length; m++) {
    starts.push(t);
    t += measureTicks(timeSigAt(score, m));
  }
  return { starts, total: t };
}

/** Convert ticks to seconds, following tempo changes. */
export function buildTimeMap(score) {
  const { starts } = measureTickMap(score);
  const points = [{ tick: 0, time: 0, bpm: score.tempo, unit: 'quarter' }];
  for (let m = 0; m < score.measures.length; m++) {
    const spec = score.measures[m];
    if (spec && spec.tempo && m > 0) {
      const prev = points[points.length - 1];
      const tick = starts[m];
      const time = prev.time + tickSeconds(tick - prev.tick, prev.bpm, prev.unit);
      points.push({ tick, time, bpm: spec.tempo.bpm, unit: spec.tempo.unit || 'quarter' });
    } else if (spec && spec.tempo && m === 0) {
      points[0].bpm = spec.tempo.bpm;
      points[0].unit = spec.tempo.unit || 'quarter';
    }
  }
  return {
    points,
    toSeconds(tick) {
      let p = points[0];
      for (const q of points) if (q.tick <= tick) p = q; else break;
      return p.time + tickSeconds(tick - p.tick, p.bpm, p.unit);
    },
    toTicks(sec) {
      let p = points[0];
      for (const q of points) if (q.time <= sec) p = q; else break;
      const unitTicks = UNIT_TICKS[p.unit] || TPQ;
      return p.tick + ((sec - p.time) * p.bpm * unitTicks) / 60;
    },
  };
}

export const UNIT_TICKS = {
  whole: TPQ * 4, half: TPQ * 2, 'half.': TPQ * 3, quarter: TPQ, 'quarter.': TPQ * 1.5,
  eighth: TPQ / 2, 'eighth.': TPQ * 0.75, '16th': TPQ / 4,
};

function tickSeconds(ticks, bpm, unit) {
  const unitTicks = UNIT_TICKS[unit] || TPQ;
  return (ticks / unitTicks) * (60 / bpm);
}

/* -------------------------------------------------------------- structure */

export function insertMeasures(score, at, count = 1) {
  const ts = timeSigAt(score, Math.max(0, at - 1));
  for (let i = 0; i < count; i++) {
    score.measures.splice(at + i, 0, makeMeasureSpec());
    for (const part of score.parts) {
      part.measures.splice(at + i, 0, makePartMeasure(part.staves));
    }
  }
  /* A measure inserted before the old first bar inherits its signatures. */
  if (at === 0 && score.measures.length > count) {
    const next = score.measures[count];
    score.measures[0].timeSig = score.measures[0].timeSig || next.timeSig || ts;
    score.measures[0].keySig = score.measures[0].keySig || next.keySig || { fifths: 0, mode: 'major' };
    if (next.timeSig && score.measures[0].timeSig === next.timeSig) next.timeSig = null;
    if (next.keySig && score.measures[0].keySig === next.keySig) next.keySig = null;
  }
  normalizeScore(score);
}

export function removeMeasures(score, at, count = 1) {
  const n = Math.min(count, score.measures.length - at);
  if (n <= 0 || score.measures.length - n < 1) return false;
  /* Preserve signatures that were declared on the removed bars. */
  const ts = timeSigAt(score, at);
  const ks = keySigAt(score, at);
  score.measures.splice(at, n);
  for (const part of score.parts) part.measures.splice(at, n);
  if (score.measures[at]) {
    if (timeSigDiffers(timeSigAt(score, at), ts) && at === 0) score.measures[0].timeSig = ts;
    if (at === 0 && keySigAt(score, 0).fifths !== ks.fifths) score.measures[0].keySig = ks;
  }
  if (score.measures.length) {
    score.measures[score.measures.length - 1].barline = 'final';
  }
  normalizeScore(score);
  return true;
}

function timeSigDiffers(a, b) {
  return !a || !b || a.beats !== b.beats || a.beatType !== b.beatType;
}

/* -------------------------------------------------------- (de)serialisation */

export function serialize(score) {
  return JSON.stringify(score);
}

export function deserialize(text) {
  const score = typeof text === 'string' ? JSON.parse(text) : text;
  /* Keep freshly minted ids from colliding with loaded ones. */
  let maxSeen = 0;
  for (const part of score.parts || []) {
    for (const pm of part.measures || []) {
      for (const voice of pm.voices || []) {
        for (const ev of voice) {
          const n = parseInt((ev.id || '').slice(1, 4), 36);
          if (!Number.isNaN(n)) maxSeen = Math.max(maxSeen, n);
        }
      }
    }
  }
  idCounter = Math.max(idCounter, maxSeen + 1);
  score.spanners = score.spanners || [];
  normalizeScore(score);
  return score;
}

/* ------------------------------------------------------------ sounding pitch */

/** Written pitch -> sounding pitch, applying the part's transposition. */
export function soundingPitch(part, p) {
  const t = part.transpose || { chromatic: 0, diatonic: 0 };
  if (!t.chromatic && !t.diatonic) return p;
  const dia = diatonic(p) + t.diatonic;
  const base = fromDiatonic(dia);
  const natural = toMidi(pitch(base.step, base.octave, 0));
  return pitch(base.step, base.octave, toMidi(p) + t.chromatic - natural);
}

/** Sounding pitch -> written pitch. */
export function writtenPitch(part, p) {
  const t = part.transpose || { chromatic: 0, diatonic: 0 };
  if (!t.chromatic && !t.diatonic) return p;
  const dia = diatonic(p) - t.diatonic;
  const base = fromDiatonic(dia);
  const natural = toMidi(pitch(base.step, base.octave, 0));
  return pitch(base.step, base.octave, toMidi(p) - t.chromatic - natural);
}

/** Key signature as written for a part (transposing instruments read sharper). */
export function writtenFifths(score, part, measureIndex) {
  const ks = keySigAt(score, measureIndex);
  if (score.concertPitch) return ks.fifths;
  const t = part.transpose || { chromatic: 0 };
  if (!t.chromatic) return ks.fifths;
  let f = ks.fifths - ((t.chromatic % 12) * 7) % 12;
  while (f > 7) f -= 12;
  while (f < -7) f += 12;
  return f;
}

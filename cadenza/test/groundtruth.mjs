/* Cadenza — transcription against known answers.
 *
 * Every case here is a performance whose correct notation is not a matter of
 * opinion: a C major triad played with the notes 12 milliseconds apart is a C
 * major triad, and eight evenly spaced notes are eight equal notes.  Each case
 * states what was played, with the timing imperfections of a real performance,
 * and what the notation must say.
 *
 * Five things are measured, and they are the five things that were wrong:
 *
 *   chords         are the notes that were struck together written as one chord
 *   simultaneity   do notes played together share a position in the bar
 *   rhythm         is the written rhythm the simple one that was played
 *   hands          did each note go to the hand that played it
 *   voices         is the texture written in as many lines as it has
 *
 * Run with --json to write the scores where a later run can compare them.
 */

import { transcribeMidi, transcribeAudio, resolveTarget } from '../js/transcribe/index.js';
import { midiToHz } from '../js/transcribe/dsp.js';
import { writeFileSync } from 'fs';

/* ------------------------------------------------------------- performing */

/* Deterministic jitter, so two runs of this file are comparable. */
let seed = 20240913;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const jitter = (ms) => (rand() * 2 - 1) * ms / 1000;

/** A chord as a player strikes it: not quite together. */
function strike(midis, at, len, vel = 82, spread = 0.018) {
  seed = 20240913 + Math.round(at * 1000) + midis[0];
  return midis.map((m, i) => {
    const t = at + (i / Math.max(1, midis.length - 1)) * spread * rand();
    return { midi: m, start: t, end: at + len, velocity: vel + Math.round(rand() * 8) };
  });
}

/** A line of single notes, played with human timing. */
function line(midis, at, step, len, vel = 84, slop = 14) {
  return midis.map((m, i) => {
    const t = at + i * step + jitter(slop);
    return { midi: m, start: Math.max(0, t), end: Math.max(0, t) + len, velocity: vel + Math.round(rand() * 10) };
  });
}


/* ------------------------------------------------------------- synthesis */

const SR = 44100;

/* A struck-string tone: inharmonic partials, a fast attack, a decay that is
 * slower low in the range.  Close enough to a piano that what the reader has
 * to disentangle is the real problem — partials of one note landing on the
 * fundamentals of another. */
function addTone(buf, midi, start, length, amp) {
  const f0 = midiToHz(midi);
  const B = 0.0004;
  const decay = 1.2 + 2.2 * (midi / 108);
  const a = Math.round(start * SR);
  const n = Math.round((length + 0.4) * SR);
  const partials = [];
  for (let h = 1; h <= 14; h++) {
    const f = f0 * h * Math.sqrt(1 + B * h * h);
    if (f > SR * 0.45) break;
    partials.push({ f, a: Math.pow(h, -1.35) * (h % 2 ? 1 : 0.75) });
  }
  for (let i = 0; i < n && a + i < buf.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const p of partials) s += p.a * Math.sin(2 * Math.PI * p.f * t);
    /* The key is let go at `length`; the string keeps ringing a little. */
    const damp = t > length ? Math.exp(-(t - length) * 9) : 1;
    const env = Math.min(1, t / 0.005) * Math.exp(-decay * t) * damp;
    buf[a + i] += amp * s * env;
  }
}

/** Play a performance into a buffer. */
function performAudio(perf) {
  const end = Math.max(...perf.map((n) => n.end)) + 0.9;
  const buf = new Float32Array(Math.round(SR * end));
  for (const n of perf) addTone(buf, n.midi, n.start, n.end - n.start, 0.20 * (n.velocity / 90));
  return buf;
}

/* ------------------------------------------------------------------ cases */

const BEAT = 0.5;           // 120 bpm throughout, so the answers are plain

const CASES = [];
const testCase = (name, spec) => CASES.push({ name, ...spec });

testCase('single notes C D E F G', {
  perf: line([60, 62, 64, 65, 67], 0, BEAT, BEAT * 0.92),
  expect: {
    events: [[60], [62], [64], [65], [67]],
    staves: 1, voices: 1,
    beats: [1, 1, 1, 1, 1],
  },
});

testCase('eight equal eighth notes', {
  perf: line([60, 62, 64, 65, 67, 69, 71, 72], 0, BEAT / 2, BEAT * 0.44),
  expect: {
    events: [[60], [62], [64], [65], [67], [69], [71], [72]],
    staves: 1, voices: 1,
    beats: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
  },
});

testCase('major chord', {
  perf: strike([60, 64, 67], 0, BEAT * 2),
  expect: { events: [[60, 64, 67]], staves: 1, voices: 1, beats: [2] },
});

testCase('minor chord', {
  perf: strike([60, 63, 67], 0, BEAT * 2),
  expect: { events: [[60, 63, 67]], staves: 1, voices: 1, beats: [2] },
});

testCase('seventh chord', {
  perf: strike([60, 64, 67, 70], 0, BEAT * 2),
  expect: { events: [[60, 64, 67, 70]], staves: 1, voices: 1, beats: [2] },
});

testCase('first inversion', {
  perf: strike([64, 67, 72], 0, BEAT * 2),
  expect: { events: [[64, 67, 72]], staves: 1, voices: 1, beats: [2] },
});

testCase('left-hand chord C2 G2 C3', {
  perf: strike([36, 43, 48], 0, BEAT * 2, 70),
  expect: { events: [[36, 43, 48]], staves: 1, voices: 1, beats: [2] },
});

testCase('right-hand chord C4 E4 G4', {
  perf: strike([60, 64, 67], 0, BEAT * 2, 92),
  expect: { events: [[60, 64, 67]], staves: 1, voices: 1, beats: [2] },
});

testCase('both hands together', {
  /* The example that must not come out as a melodic sequence. */
  perf: [...strike([36, 43, 48], 0, BEAT * 2, 72), ...strike([64, 67, 72], 0.008, BEAT * 2, 95)],
  expect: {
    events: [[36, 43, 48], [64, 67, 72]],
    hands: { 36: 1, 43: 1, 48: 1, 64: 0, 67: 0, 72: 0 },
    staves: 2, voices: 1, beats: [2, 2],
  },
});

testCase('repeated two-hand chords', {
  perf: [0, 1, 2, 3].flatMap((b) => [
    ...strike([36, 43, 48], b * BEAT, BEAT * 0.94, 72),
    ...strike([64, 67, 72], b * BEAT + 0.01, BEAT * 0.94, 94),
  ]),
  expect: {
    events: [[36, 43, 48], [64, 67, 72], [36, 43, 48], [64, 67, 72],
      [36, 43, 48], [64, 67, 72], [36, 43, 48], [64, 67, 72]],
    hands: { 36: 1, 43: 1, 48: 1, 64: 0, 67: 0, 72: 0 },
    staves: 2, voices: 1, beats: [1, 1, 1, 1, 1, 1, 1, 1],
  },
});

testCase('melody over accompaniment', {
  perf: [
    ...line([72, 74, 76, 77], 0, BEAT, BEAT * 0.9, 98),
    ...strike([48, 55], 0, BEAT * 0.9, 66),
    ...strike([48, 55], BEAT, BEAT * 0.9, 66),
    ...strike([47, 55], BEAT * 2, BEAT * 0.9, 66),
    ...strike([48, 55], BEAT * 3, BEAT * 0.9, 66),
  ],
  expect: {
    events: [[72], [48, 55], [74], [48, 55], [76], [47, 55], [77], [48, 55]],
    hands: { 72: 0, 74: 0, 76: 0, 77: 0, 48: 1, 55: 1, 47: 1 },
    staves: 2, voices: 1, beats: [1, 1, 1, 1, 1, 1, 1, 1],
  },
});

testCase('chord progression under a melody', {
  perf: [
    ...line([76, 74, 72, 71], 0, BEAT, BEAT * 0.92, 96),
    ...strike([48, 52, 55], 0, BEAT * 0.92, 68),
    ...strike([43, 47, 50], BEAT, BEAT * 0.92, 68),
    ...strike([45, 48, 52], BEAT * 2, BEAT * 0.92, 68),
    ...strike([41, 45, 48], BEAT * 3, BEAT * 0.92, 68),
  ],
  expect: {
    events: [[76], [48, 52, 55], [74], [43, 47, 50], [72], [45, 48, 52], [71], [41, 45, 48]],
    hands: { 76: 0, 74: 0, 72: 0, 71: 0, 48: 1, 52: 1, 55: 1, 43: 1, 47: 1, 50: 1, 45: 1, 41: 1 },
    staves: 2, voices: 1, beats: [1, 1, 1, 1, 1, 1, 1, 1],
  },
});

testCase('rolled chord', {
  /* Four notes across 70 ms, all still sounding: one chord, spread by the
   * hand rather than written out. */
  perf: [
    { midi: 48, start: 0, end: BEAT * 2, velocity: 74 },
    { midi: 55, start: 0.025, end: BEAT * 2, velocity: 76 },
    { midi: 60, start: 0.048, end: BEAT * 2, velocity: 78 },
    { midi: 64, start: 0.07, end: BEAT * 2, velocity: 80 },
  ],
  expect: { events: [[48, 55, 60, 64]], staves: 1, voices: 1, beats: [2] },
});

testCase('arpeggio', {
  /* The same pitches, one to a beat: four notes, not one chord. */
  perf: line([48, 55, 60, 64], 0, BEAT, BEAT * 0.9, 80),
  expect: { events: [[48], [55], [60], [64]], staves: 1, voices: 1, beats: [1, 1, 1, 1] },
});

testCase('counterpoint', {
  /* Two independent lines moving at different rates in one hand's range. */
  perf: [
    ...line([72, 74, 76, 77, 79, 77, 76, 74], 0, BEAT / 2, BEAT * 0.46, 92),
    ...line([60, 62, 64, 62], 0, BEAT, BEAT * 0.94, 80),
  ],
  expect: {
    events: [[72], [60], [74], [76], [62], [77], [79], [64], [77], [76], [62], [74]],
    staves: 2, voices: 1,
  },
});

/* ------------------------------------------------------------------ scoring */

const setOf = (list) => [...new Set(list)].sort((a, b) => a - b).join(',');

/** Output chords, from the notated events the reader produced. */
function outputEvents(result) {
  return result.chords
    .map((c) => ({
      tick: c.startTicks, staff: c.staff, voice: c.voice,
      pitches: c.notes.map((n) => n.midi).sort((a, b) => a - b),
      beats: (c.endTicks - c.startTicks) / result.analysis.perBeat,
    }))
    .sort((a, b) => a.tick - b.tick || a.pitches[0] - b.pitches[0]);
}

/**
 * How much of each expected simultaneity survived.
 *
 * An expected chord is matched against the output chord that shares the most
 * of its pitches; the score is how much of the chord that one chord holds, so
 * a triad written as a triad scores 1 and a triad split across three separate
 * events scores a third.
 */
function chordScore(expected, got) {
  if (!expected.length) return 1;
  let total = 0;
  const used = new Set();
  for (const want of expected) {
    let best = 0;
    let bestIdx = -1;
    got.forEach((g, i) => {
      if (used.has(i)) return;
      const shared = g.pitches.filter((p) => want.includes(p)).length;
      const score = shared / Math.max(want.length, g.pitches.length);
      if (score > best) { best = score; bestIdx = i; }
    });
    if (bestIdx >= 0) used.add(bestIdx);
    total += best;
  }
  return total / expected.length;
}

/** Of the pairs of pitches played together, how many are written together. */
function simultaneityScore(expected, got) {
  const pairs = [];
  for (const want of expected) {
    for (let i = 0; i < want.length; i++) {
      for (let j = i + 1; j < want.length; j++) pairs.push([want[i], want[j]]);
    }
  }
  if (!pairs.length) return 1;
  let held = 0;
  for (const [a, b] of pairs) {
    const together = got.some((g) => g.pitches.includes(a) && g.pitches.includes(b))
      || got.some((g) => g.pitches.includes(a)
        && got.some((h) => h.tick === g.tick && h.pitches.includes(b)));
    if (together) held++;
  }
  return held / pairs.length;
}

/**
 * Is the written rhythm the simple one.
 *
 * Two things are counted: whether the written lengths are the ones that were
 * played, and how many different lengths the passage needed.  A passage played
 * in one value and written in five is wrong however well each value fits.
 */
function rhythmScore(expectBeats, got) {
  const lengths = got.map((g) => Math.round(g.beats * 48) / 48).filter((b) => b > 0);
  if (!lengths.length) return { fit: 0, kinds: 0 };
  const distinct = new Set(lengths).size;
  if (!expectBeats) return { fit: null, kinds: distinct };
  const want = [...expectBeats].sort((a, b) => a - b);
  const have = [...lengths].sort((a, b) => a - b);
  let hit = 0;
  const pool = [...have];
  for (const w of want) {
    const i = pool.findIndex((h) => Math.abs(h - w) < 0.01);
    if (i >= 0) { hit++; pool.splice(i, 1); }
  }
  return { fit: hit / want.length, kinds: distinct };
}

/** Did each note go to the hand that played it. */
function handScore(hands, result) {
  if (!hands) return null;
  const notes = result.notes.filter((n) => hands[n.midi] !== undefined);
  if (!notes.length) return null;
  const right = notes.filter((n) => (n.staff || 0) === hands[n.midi]).length;
  return right / notes.length;
}

/** How many lines the notation used, per staff. */
function voiceCount(result) {
  const perStaff = new Map();
  for (const n of result.notes) {
    const s = n.staff || 0;
    if (!perStaff.has(s)) perStaff.set(s, new Set());
    perStaff.get(s).add(n.voice || 0);
  }
  return Math.max(1, ...[...perStaff.values()].map((v) => v.size));
}

/* -------------------------------------------------------------------- run */

const piano = resolveTarget({ targetId: 'piano' });
const AUDIO = !process.argv.includes('--midi');
const rows = [];

for (const c of CASES) {
  const perf = [...c.perf].sort((a, b) => a.start - b.start);
  let result;
  try {
    result = AUDIO
      ? transcribeAudio(performAudio(perf), {
        sampleRate: SR, plan: piano, style: 'balanced', bpm: 120, listen: !process.argv.includes('--quick'), maxPasses: 3,
      })
      : transcribeMidi(perf, { plan: piano, style: 'balanced', bpm: 120 });
  } catch (err) {
    rows.push({ name: c.name, error: err.message });
    continue;
  }
  const got = outputEvents(result);
  const chords = chordScore(c.expect.events, got);
  const simul = simultaneityScore(c.expect.events, got);
  const rhythm = rhythmScore(c.expect.beats, got);
  const hands = handScore(c.expect.hands, result);
  const voices = voiceCount(result);
  rows.push({
    name: c.name,
    chords, simul,
    rhythmFit: rhythm.fit, kinds: rhythm.kinds,
    hands, voices, wantVoices: c.expect.voices ?? null,
    events: got.length, wantEvents: c.expect.events.length,
    detail: got.map((g) => `${g.tick}:${setOf(g.pitches)}${g.staff ? '/L' : ''}`).join(' '),
  });
}

/* ---------------------------------------------------------------- report */

const pct = (v) => (v === null || v === undefined ? '  — ' : (v * 100).toFixed(0).padStart(3) + '%');
const pad = (s, n) => String(s).padEnd(n);

console.log('');
console.log((AUDIO ? 'AUDIO' : 'MIDI') + ' path\n');
console.log(pad('case', 32) + ' chords simul rhythm  kinds hands voices  events');
console.log('-'.repeat(84));
for (const r of rows) {
  if (r.error) { console.log(pad(r.name, 32) + '  ERROR: ' + r.error); continue; }
  console.log(
    pad(r.name, 32)
    + ' ' + pct(r.chords)
    + '  ' + pct(r.simul)
    + '  ' + pct(r.rhythmFit)
    + '   ' + String(r.kinds).padStart(3)
    + '  ' + pct(r.hands)
    + '   ' + String(r.voices).padStart(2) + (r.wantVoices ? '/' + r.wantVoices : '  ')
    + '   ' + String(r.events).padStart(3) + '/' + r.wantEvents,
  );
}

const ok = rows.filter((r) => !r.error);
const mean = (key) => {
  const vals = ok.map((r) => r[key]).filter((v) => v !== null && v !== undefined);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
};
const summary = {
  chords: mean('chords'),
  simultaneity: mean('simul'),
  rhythm: mean('rhythmFit'),
  hands: mean('hands'),
  extraVoices: ok.filter((r) => r.wantVoices && r.voices > r.wantVoices).length,
  rhythmKinds: ok.reduce((a, r) => a + r.kinds, 0) / Math.max(1, ok.length),
  errors: rows.filter((r) => r.error).length,
};
console.log('-'.repeat(84));
console.log('chords ' + pct(summary.chords)
  + '   simultaneity ' + pct(summary.simultaneity)
  + '   rhythm ' + pct(summary.rhythm)
  + '   hands ' + pct(summary.hands));
console.log('passages given more voices than they have: ' + summary.extraVoices + ' of ' + ok.length
  + '        average distinct note values: ' + summary.rhythmKinds.toFixed(2));
console.log('');

if (process.argv.includes('--verbose')) {
  for (const r of rows) if (!r.error) console.log(pad(r.name, 32) + ' ' + r.detail);
  console.log('');
}

const out = process.argv.find((a) => a.startsWith('--json='));
if (out) {
  writeFileSync(out.slice('--json='.length), JSON.stringify({ summary, rows }, null, 2));
  console.log('wrote ' + out.slice('--json='.length));
}

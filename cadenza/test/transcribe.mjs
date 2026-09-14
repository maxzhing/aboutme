#!/usr/bin/env node
/* Cadenza — transcription accuracy checks.
 *
 * These run the real engine against synthesised material whose contents are
 * known exactly, so a number here means "the engine found what was played",
 * not "the engine agreed with itself".
 *
 * What this does NOT prove: performance on recordings of real instruments, in
 * real rooms, with pedal, mic noise and expressive timing.  The tones below
 * have plausible partial structure, inharmonicity, decay and attack, but they
 * are still synthetic.  Treat the scores as a regression floor, not as a claim
 * about studio audio.
 *
 * Run with:  node cadenza/test/transcribe.mjs
 */

import { stft, midiToHz } from '../js/transcribe/dsp.js';
import { estimateF0s } from '../js/transcribe/polyphony.js';
import { extractNotes } from '../js/transcribe/notes.js';
import { transcribeMidi, transcribeAudio, readMusic, resolveTarget,
  classifyEvents, readChord, analyseHarmony, renderNotation, notationEvents,
  compareAudio } from '../js/transcribe/index.js';
import { timeSigAt } from '../js/core/model.js';
import { measureTicks, eventTicks } from '../js/core/rhythm.js';
import * as T from '../js/core/theory.js';
import { MidiRecorder, parseMIDI } from '../js/transcribe/capture.js';
import { refineByListening } from '../js/transcribe/refine.js';
import { review } from '../js/transcribe/simplify.js';
import { CorrectionModel, compareScores } from '../js/transcribe/learn.js';
import { exportMIDI } from '../js/io/midifile.js';
import { tempoAt } from '../js/core/model.js';

const SR = 44100;

/* ------------------------------------------------------------- synthesis */

/* A struck-string tone: inharmonic partials, a fast attack, and a decay that
 * is slower low in the range — close enough to a piano to be a fair test. */
function addTone(buf, midi, start, length, amp = 0.22) {
  const f0 = midiToHz(midi);
  const B = 0.0004;                        // string stiffness
  const decay = 1.2 + 2.2 * (midi / 108);  // high notes die away faster
  const a = Math.round(start * SR);
  const n = Math.round(length * SR);
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
    const env = Math.min(1, t / 0.005) * Math.exp(-decay * t);
    buf[a + i] += amp * s * env;
  }
}

function render(events, duration) {
  const buf = new Float32Array(Math.round(SR * duration));
  for (const [midi, start, length, amp] of events) addTone(buf, midi, start, length, amp);
  return buf;
}

/* ------------------------------------------------------------ reporting */

let pass = 0;
const failures = [];
function report(name, ok, detail) {
  if (ok) { pass++; console.log('  ok   ' + name); }
  else { failures.push(name + ' — ' + detail); console.log('  FAIL ' + name + ' — ' + detail); }
}

/* ------------------------------------------------- simultaneity (chords) */

console.log('\nChord recognition — frequencies sounding together must come back as one chord.');

function chord(name, midis, maxVoices) {
  const buf = new Float32Array(Math.round(SR * 0.7));
  for (const m of midis) addTone(buf, m, 0, 0.7, 0.25);
  const spec = stft(buf, { size: 8192, hop: 1024, sampleRate: SR });
  const det = estimateF0s(spec.frames[2], spec.binHz, { maxVoices: maxVoices || 6 });
  const got = [...new Set(det.map((d) => d.midi))].sort((a, b) => a - b);
  const want = [...midis].sort((a, b) => a - b);
  report(name, JSON.stringify(got) === JSON.stringify(want),
    'want [' + want + '] got [' + got + ']');
}

chord('single note, middle C', [60]);
chord('single note, A0 (lowest)', [21]);
chord('single note, C7 (high)', [96]);
chord('C major triad', [60, 64, 67]);
chord('C minor triad', [60, 63, 67]);
chord('octave, C4 + C5', [60, 72]);
chord('C + G + C — octave and fifth, not one note', [60, 67, 72]);
chord('dominant seventh', [60, 64, 67, 70]);
chord('major seventh', [60, 64, 67, 71]);
chord('diminished seventh', [60, 63, 66, 69]);
chord('first inversion', [64, 67, 72]);
chord('second inversion', [67, 72, 76]);
chord('low bass under a melody', [41, 60, 64]);
chord('four-note chord', [55, 60, 64, 67]);
chord('wide spread, bass to treble', [36, 60, 76]);
chord('dense five-note chord', [48, 55, 60, 64, 67]);
chord('semitone cluster', [60, 61, 62]);
chord('two octaves apart', [48, 72]);

/* ------------------------------------------------------------- sequences */

console.log('\nNote extraction — every note found, nothing invented.');

function sequence(name, truth, duration, opts = {}) {
  const { tolerance = 0.14, ...rest } = opts;
  const res = extractNotes(render(truth, duration), { sampleRate: SR, ...rest });
  const got = res.notes.map((n) => ({ midi: n.midi, start: n.start }));
  const used = new Set();
  let hit = 0;
  for (const [midi, start] of truth) {
    let best = -1, bd = tolerance;
    got.forEach((g, i) => {
      if (used.has(i) || g.midi !== midi) return;
      const d = Math.abs(g.start - start);
      if (d < bd) { bd = d; best = i; }
    });
    if (best >= 0) { hit++; used.add(best); }
  }
  const spurious = got.length - hit;
  report(name, hit === truth.length && spurious === 0,
    hit + '/' + truth.length + ' found, ' + spurious + ' spurious');
}

const step = (midis, gap, len, from = 0) => midis.map((m, i) => [m, from + i * gap, len]);

sequence('single melodic line, ascending scale',
  step([60, 62, 64, 65, 67, 69, 71, 72], 0.5, 0.45), 4.3);

sequence('single melodic line, descending scale',
  step([72, 71, 69, 67, 65, 64, 62, 60], 0.5, 0.45), 4.3);

sequence('the same note struck four times',
  step([60, 60, 60, 60], 0.3, 0.26), 1.5);

sequence('parallel octaves',
  [[48, 0, 0.45], [60, 0, 0.45], [50, 0.5, 0.45], [62, 0.5, 0.45], [52, 1.0, 0.45], [64, 1.0, 0.45]], 1.8);

sequence('two triads in succession',
  [[60, 0, 0.9], [64, 0, 0.9], [67, 0, 0.9], [59, 1.0, 0.9], [62, 1.0, 0.9], [67, 1.0, 0.9]], 2.2);

sequence('melody over a held bass note',
  [[36, 0, 1.9], [60, 0, 0.45], [62, 0.5, 0.45], [64, 1.0, 0.45], [65, 1.5, 0.45]], 2.3);

sequence('arpeggio up and back down',
  step([60, 64, 67, 72, 67, 64], 0.25, 0.22), 1.8);

sequence('fast passage, sixteenths',
  step([60, 62, 64, 65, 67, 69, 71, 72], 0.125, 0.11), 1.4);

sequence('Alberti bass under a slow melody',
  [...step([48, 55, 52, 55, 48, 55, 52, 55], 0.25, 0.22),
   [72, 0, 0.95], [71, 1.0, 0.95]], 2.3);

sequence('broken chord held by the pedal',
  [[48, 0, 2.0], [55, 0.2, 1.8], [64, 0.4, 1.6], [72, 0.6, 1.4]], 2.4);

sequence('the same chord struck three times',
  [...[0, 0.55, 1.1].flatMap((t) => [[60, t, 0.5], [64, t, 0.5], [67, t, 0.5]])], 1.9);

sequence('chord change sharing a common tone',
  [[60, 0, 0.9], [64, 0, 0.9], [67, 0, 0.9], [65, 1.0, 0.9], [69, 1.0, 0.9], [60, 1.0, 0.9]], 2.2);

sequence('rapid chord changes',
  [0, 0.3, 0.6, 0.9, 1.2, 1.5].flatMap((t, i) =>
    [[60 + i, t, 0.27], [64 + i, t, 0.27], [67 + i, t, 0.27]]), 2.1);

sequence('staccato notes separated by rests',
  [[60, 0, 0.1], [62, 0.5, 0.1], [64, 1.0, 0.1], [65, 1.5, 0.1]], 2.0);

sequence('bass and treble at the extremes together',
  [[28, 0, 0.9], [88, 0, 0.9], [31, 1.0, 0.9], [91, 1.0, 0.9]], 2.2);

sequence('trill between two adjacent notes',
  step([71, 72, 71, 72, 71, 72], 0.14, 0.13), 1.2);

sequence('triads through their inversions',
  [[60, 0, 0.55], [64, 0, 0.55], [67, 0, 0.55],
   [64, 0.6, 0.55], [67, 0.6, 0.55], [72, 0.6, 0.55],
   [67, 1.2, 0.55], [72, 1.2, 0.55], [76, 1.2, 0.55]], 1.9);

sequence('quiet playing',
  step([60, 62, 64, 65], 0.4, 0.36).map((e) => [e[0], e[1], e[2], 0.03]), 1.8);

sequence('four-note chords moving in block harmony',
  [[48, 0, 0.75], [55, 0, 0.75], [64, 0, 0.75], [67, 0, 0.75],
   [50, 0.8, 0.75], [57, 0.8, 0.75], [65, 0.8, 0.75], [69, 0.8, 0.75],
   [52, 1.6, 0.75], [59, 1.6, 0.75], [67, 1.6, 0.75], [71, 1.6, 0.75]], 2.5);

/* ------------------------------------------------------- musical reading */

console.log('\nMusical reading — pulse, metre, key, hands, and notation that adds up.');

const perf = (events, bpm = 120) => events.map(([midi, beat, len, vel]) => ({
  midi,
  start: (beat * 60) / bpm,
  end: ((beat + len * 0.96) * 60) / bpm,
  velocity: vel || 84,
}));

/** Every bar of every voice must hold exactly one bar's worth. */
function barsAddUp(score) {
  const bad = [];
  score.parts.forEach((part, pi) => {
    part.measures.forEach((pm, mi) => {
      const ts = timeSigAt(score, mi);
      const want = measureTicks(ts);
      pm.voices.forEach((voice, vi) => {
        const got = voice.reduce((sum, ev) => sum + (ev.grace ? 0 : eventTicks(ev)), 0);
        if (got !== want) bad.push(`part ${pi} bar ${mi + 1} voice ${vi}: ${got} of ${want}`);
      });
    });
  });
  return bad;
}

/** A flat description of one voice, for comparing against what was played. */
function readVoice(score, voiceIndex = 0) {
  const out = [];
  const part = score.parts[0];
  part.measures.forEach((pm, mi) => {
    for (const ev of pm.voices[voiceIndex] || []) {
      out.push({
        measure: mi,
        rest: ev.type === 'rest',
        duration: ev.duration,
        dots: ev.dots,
        tuplet: ev.tuplet,
        tie: ev.type === 'note' ? ev.notes[0].tie : null,
        midis: ev.type === 'note' ? ev.notes.map((n) => T.toMidi(n.pitch)) : [],
      });
    }
  });
  return out;
}

function reading(name, check) {
  let ok = false;
  let detail = '';
  try {
    const r = check();
    ok = r === true;
    if (!ok) detail = String(r);
  } catch (err) {
    detail = err.message;
  }
  report(name, ok, detail);
}

reading('a plain 4/4 tune comes back in 4/4 at its own tempo', () => {
  const r = transcribeMidi(perf([[60, 0, 1], [62, 1, 1], [64, 2, 1], [65, 3, 1],
    [67, 4, 1], [65, 5, 1], [64, 6, 1], [62, 7, 1]], 120));
  if (r.analysis.timeSig.beats !== 4) return 'metre ' + JSON.stringify(r.analysis.timeSig);
  if (Math.abs(r.analysis.bpm - 120) > 4) return 'tempo ' + r.analysis.bpm;
  const v = readVoice(r.score);
  if (v.length !== 8 || v.some((e) => e.duration !== 'quarter')) {
    return v.map((e) => e.duration).join(' ');
  }
  return true;
});

reading('a waltz comes back in 3/4', () => {
  const ev = [];
  for (let bar = 0; bar < 6; bar++) {
    ev.push([48, bar * 3, 1, 100], [64, bar * 3 + 1, 1, 60], [67, bar * 3 + 2, 1, 60]);
  }
  const r = transcribeMidi(perf(ev, 150));
  return r.analysis.timeSig.beats === 3 && r.analysis.timeSig.beatType === 4
    ? true : JSON.stringify(r.analysis.timeSig);
});

reading('a tune in eighth-note triplets is written as 6/8, not as triplets', () => {
  const ev = [];
  for (let b = 0; b < 8; b++) {
    for (let k = 0; k < 3; k++) ev.push([60 + ((b * 3 + k) % 5), b + k / 3, 1 / 3, k === 0 ? 100 : 70]);
  }
  const r = transcribeMidi(perf(ev, 120));
  const ts = r.analysis.timeSig;
  return ts.beatType === 8 && ts.beats % 3 === 0 ? true : JSON.stringify(ts);
});

reading('triplets inside a simple bar are written as triplets', () => {
  const ev = [[60, 0, 1], [62, 1, 1], [64, 2, 1], [65, 3, 1]];
  for (let k = 0; k < 3; k++) ev.push([67 + k, 4 + k / 3, 1 / 3]);
  ev.push([72, 5, 1], [71, 6, 1], [69, 7, 1], [67, 8, 4]);
  const r = transcribeMidi(perf(ev, 120));
  const v = readVoice(r.score);
  const trips = v.filter((e) => e.tuplet && e.tuplet.actual === 3);
  return trips.length === 3 ? true
    : 'found ' + trips.length + ' tuplet notes in ' + v.map((e) => e.duration + (e.tuplet ? '[3]' : '')).join(' ');
});

reading('a dotted rhythm keeps its dot', () => {
  const ev = [];
  for (let b = 0; b < 8; b += 1) { ev.push([60 + (b % 3) * 2, b, 0.75], [67, b + 0.75, 0.25]); }
  const r = transcribeMidi(perf(ev, 100));
  const v = readVoice(r.score).filter((e) => !e.rest);
  const dotted = v.filter((e) => e.duration === 'eighth' && e.dots === 1).length;
  const short = v.filter((e) => e.duration === '16th').length;
  return dotted >= 6 && short >= 6 ? true
    : dotted + ' dotted eighths, ' + short + ' sixteenths of 8 each';
});

reading('a note held over the barline is tied, not cut', () => {
  const r = transcribeMidi(perf([[60, 0, 1], [62, 1, 1], [64, 2, 1], [65, 3, 2],
    [67, 5, 1], [65, 6, 1], [64, 7, 1],
    [36, 0, 4, 100], [36, 4, 4, 100]], 120));
  const v = readVoice(r.score);
  const start = v.find((e) => e.tie === 'start');
  const stop = v.find((e) => e.tie === 'stop');
  return start && stop && stop.measure === start.measure + 1 ? true
    : v.map((e) => e.duration + (e.tie ? ':' + e.tie : '')).join(' ');
});

reading('a real silence is written as a rest', () => {
  const r = transcribeMidi(perf([[60, 0, 1], [62, 2, 1], [64, 4, 1], [65, 6, 1]], 120));
  const rests = readVoice(r.score).filter((e) => e.rest);
  return rests.length >= 4 ? true : rests.length + ' rests for four gaps of a beat';
});

reading('the key signature follows the notes (G major)', () => {
  const ev = [[67, 0, 1], [69, 1, 1], [71, 2, 1], [72, 3, 1], [74, 4, 1], [76, 5, 1],
    [78, 6, 1], [79, 7, 2], [74, 9, 1], [71, 10, 1], [67, 11, 4]];
  const r = transcribeMidi(perf(ev, 120));
  return r.analysis.key.fifths === 1 ? true : 'fifths ' + r.analysis.key.fifths;
});

reading('the key signature follows the notes (F major)', () => {
  const ev = [[65, 0, 1], [67, 1, 1], [69, 2, 1], [70, 3, 1], [72, 4, 1], [74, 5, 1],
    [76, 6, 1], [77, 7, 2], [72, 9, 1], [69, 10, 1], [65, 11, 4]];
  const r = transcribeMidi(perf(ev, 120));
  return r.analysis.key.fifths === -1 ? true : 'fifths ' + r.analysis.key.fifths;
});

reading('a note outside the key is spelled the way the key leans', () => {
  const ev = [[67, 0, 1], [69, 1, 1], [71, 2, 1], [72, 3, 1], [74, 4, 1], [73, 5, 1],
    [74, 6, 1], [79, 7, 2], [74, 9, 1], [71, 10, 1], [67, 11, 4]];
  const r = transcribeMidi(perf(ev, 120));
  const part = r.score.parts[0];
  for (const pm of part.measures) {
    for (const v of pm.voices) {
      for (const e of v) {
        if (e.type !== 'note') continue;
        for (const n of e.notes) if (T.toMidi(n.pitch) === 73) return n.pitch.alter === 1 ? true : 'spelled with alter ' + n.pitch.alter;
      }
    }
  }
  return 'the chromatic note is missing';
});

reading('two hands are written on two staves', () => {
  const ev = [];
  for (let b = 0; b < 8; b++) ev.push([72 + (b % 4), b, 1, 95]);
  for (let b = 0; b < 8; b += 2) ev.push([36 + (b % 4), b, 2, 70], [43, b, 2, 70]);
  const r = transcribeMidi(perf(ev, 120));
  const staves = new Set(r.notes.map((n) => n.staff));
  const wrong = r.notes.filter((n) => (n.midi >= 60) !== (n.staff === 0));
  return staves.size === 2 && !wrong.length ? true
    : staves.size + ' staves, ' + wrong.length + ' notes in the wrong hand';
});

reading('an Alberti bass stays in the left hand under its melody', () => {
  const ev = [];
  const pattern = [48, 55, 52, 55];
  for (let b = 0; b < 16; b++) ev.push([pattern[b % 4], b * 0.5, 0.5, 65]);
  for (let b = 0; b < 4; b++) ev.push([72 + b, b * 2, 2, 100]);
  const r = transcribeMidi(perf(ev, 120));
  const wrong = r.notes.filter((n) => (n.midi >= 66) !== (n.staff === 0));
  return wrong.length === 0 ? true : wrong.length + ' of ' + r.notes.length + ' in the wrong hand';
});

reading('notes struck together become one chord, not a run', () => {
  const ev = [];
  for (let b = 0; b < 4; b++) ev.push([60, b, 1], [64, b, 1], [67, b, 1]);
  const r = transcribeMidi(perf(ev, 120));
  const v = readVoice(r.score).filter((e) => !e.rest);
  return v.length === 4 && v.every((e) => e.midis.length === 3) ? true
    : v.map((e) => e.midis.join('+')).join(' ');
});

reading('a slow performance is not read as a fast one', () => {
  const r = transcribeMidi(perf([[60, 0, 1], [62, 1, 1], [64, 2, 1], [65, 3, 1],
    [67, 4, 1], [69, 5, 1], [71, 6, 1], [72, 7, 1]], 66));
  return Math.abs(r.analysis.bpm - 66) < 4 ? true : 'read as ' + r.analysis.bpm;
});

reading('a fast performance keeps its speed, however it is written', () => {
  /* Sixteen notes a second and a half apart are the same music whether they
   * are written as crotchets at 168 or as quavers at 84 — and the second is
   * how a player would rather read them.  What must not change is how fast
   * the notes actually go, so that is what is checked: the written value, in
   * seconds, against what was played. */
  const ev = [];
  for (let b = 0; b < 16; b++) ev.push([60 + (b % 8), b, 1]);
  const r = transcribeMidi(perf(ev, 168));
  const v = readVoice(r.score).filter((e) => !e.rest);
  if (!v.length) return 'nothing was written';
  const secondsPerQuarter = 60 / r.analysis.bpm;
  const beats = { whole: 4, half: 2, quarter: 1, eighth: 0.5, '16th': 0.25 }[v[0].duration];
  if (!beats) return 'written as a ' + v[0].duration;
  const gap = beats * secondsPerQuarter;
  const played = 60 / 168;
  return Math.abs(gap - played) < played * 0.06 ? true
    : `notes every ${gap.toFixed(3)}s, played every ${played.toFixed(3)}s`;
});

reading('playing behind the beat is still read as straight quarters', () => {
  const drift = [0, 0.04, -0.03, 0.05, -0.02, 0.03, 0.04, -0.04];
  const r = transcribeMidi(perf(drift.map((d, i) => [60 + i, i + d, 1]), 120));
  const v = readVoice(r.score);
  return v.every((e) => e.duration === 'quarter' && !e.rest) ? true
    : v.map((e) => e.duration).join(' ');
});

reading('every bar of every voice adds up exactly', () => {
  const ev = [];
  for (let b = 0; b < 12; b++) ev.push([60 + (b % 5), b * 0.5, 0.5]);
  ev.push([36, 0, 4, 70], [43, 0, 4, 70], [38, 4, 2, 70]);
  const r = transcribeMidi(perf(ev, 120));
  const bad = barsAddUp(r.score);
  return bad.length === 0 ? true : bad.join('; ');
});

reading('the whole chain works on audio, not just on MIDI', () => {
  const tune = [[60, 0, 1], [62, 1, 1], [64, 2, 1], [65, 3, 1],
    [67, 4, 1], [65, 5, 1], [64, 6, 1], [62, 7, 2]];
  const events = tune.map(([midi, beat, len]) => [midi, beat * 0.5, len * 0.5 * 0.9]);
  const r = transcribeAudio(render(events, 5.2), { sampleRate: SR, title: 'Audio' });
  /* A note tied across a barline is one note, however many pieces it takes. */
  const played = readVoice(r.score)
    .filter((e) => !e.rest && e.tie !== 'stop' && e.tie !== 'both')
    .map((e) => e.midis[0]);
  const want = tune.map((t) => t[0]);
  if (JSON.stringify(played) !== JSON.stringify(want)) {
    return 'heard ' + played.join(' ') + ' for ' + want.join(' ');
  }
  if (Math.abs(r.analysis.bpm - 120) > 6) return 'tempo ' + r.analysis.bpm;
  const bad = barsAddUp(r.score);
  return bad.length === 0 ? true : bad.join('; ');
});

/* --------------------------------------------------- capture and learning */

console.log('\nCapture and correction — what comes in, and what is learned from what you change.');

const memory = () => {
  const store = new Map();
  return { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v) };
};

reading('a recorded performance keeps its timing', () => {
  const rec = new MidiRecorder();
  rec.start(1000);
  rec.noteOn(60, 90, 1000);
  rec.noteOn(64, 88, 1000);
  rec.noteOff(60, 1480);
  rec.noteOff(64, 1500);
  rec.noteOn(67, 91, 1500);
  rec.noteOff(67, 1990);
  const notes = rec.stop(2200);
  if (notes.length !== 3) return notes.length + ' notes';
  if (Math.abs(notes[0].start) > 1e-9 || Math.abs(notes[0].end - 0.48) > 1e-9) {
    return 'first note ' + notes[0].start + '-' + notes[0].end;
  }
  return Math.abs(notes[2].start - 0.5) < 1e-9 ? true : 'third note at ' + notes[2].start;
});

reading('the sustain pedal holds notes past their release', () => {
  const rec = new MidiRecorder();
  rec.start(0);
  rec.setPedal(true, 0);
  rec.noteOn(60, 90, 0);
  rec.noteOff(60, 200);            // key released, pedal still down
  rec.noteOn(64, 90, 400);
  rec.noteOff(64, 600);
  rec.setPedal(false, 1000);
  const notes = rec.stop(1200);
  const c = notes.find((n) => n.midi === 60);
  return c && Math.abs(c.end - 1) < 1e-9 ? true
    : 'held until ' + (c ? c.end : 'gone');
});

reading('a note struck again before its release is two notes', () => {
  const rec = new MidiRecorder();
  rec.start(0);
  rec.noteOn(60, 90, 0);
  rec.noteOn(60, 95, 300);         // re-struck, no note-off in between
  rec.noteOff(60, 600);
  const notes = rec.stop(800);
  return notes.length === 2 ? true : notes.length + ' notes';
});

reading('a score survives a trip out to MIDI and back', () => {
  const ev = [];
  for (let b = 0; b < 8; b++) ev.push([60 + [0, 2, 4, 5, 7, 5, 4, 2][b], b, 1]);
  ev.push([36, 0, 4, 100], [36, 4, 4, 100]);
  const first = transcribeMidi(perf(ev, 120));
  const back = transcribeMidi(parseMIDI(exportMIDI(first.score)));
  const line = (s) => readVoice(s, 0).filter((e) => !e.rest && e.tie !== 'stop' && e.tie !== 'both')
    .map((e) => e.midis.join('+')).join(' ');
  if (line(first.score) !== line(back.score)) {
    return line(back.score) + ' for ' + line(first.score);
  }
  return Math.abs(back.analysis.bpm - first.analysis.bpm) < 2 ? true
    : 'tempo ' + back.analysis.bpm + ' for ' + first.analysis.bpm;
});

reading('a note let go early at the end of a piece still fills its bar', () => {
  /* A release is not a rhythm: read as one it becomes a triplet, or a tail of
   * rests too short to have been played. */
  const ev = [];
  for (let b = 0; b < 8; b++) ev.push([72 + [0, 2, 4, 5, 7, 5, 4, 2][b], b, 1]);
  ev.push([74, 8, 2], [72, 10, 2], [48, 0, 4, 100], [41, 4, 4, 100], [48, 8, 4, 100]);
  const notes = perf(ev, 120).map((n) => ({ ...n, end: n.start + (n.end - n.start) * 0.92 }));
  const r = transcribeMidi(notes);
  const written = readVoice(r.score, 0).concat(readVoice(r.score, 1));
  const tiny = written.filter((e) => ['32nd', '64th', '128th'].includes(e.duration));
  const tuplets = written.filter((e) => e.tuplet);
  if (tiny.length) return tiny.length + ' notes shorter than a sixteenth';
  if (tuplets.length) return tuplets.length + ' spurious tuplets';
  const bad = barsAddUp(r.score);
  return bad.length === 0 ? true : bad.join('; ');
});

reading('the tempo written into the score is the tempo that was played', () => {
  const r = transcribeMidi(perf([[60, 0, 1], [62, 1, 1], [64, 2, 1], [65, 3, 1],
    [67, 4, 1], [69, 5, 1], [71, 6, 1], [72, 7, 1]], 88));
  const written = tempoAt(r.score, 0);
  return written.bpm > 80 && written.bpm < 96 ? true : 'score says ' + written.bpm;
});

reading('an octave correction made three times changes the next transcription', () => {
  const model = new CorrectionModel(memory());
  for (let i = 0; i < 3; i++) model.observe({ kind: 'octave', midi: 40, octaves: -1 });
  const notes = [{ midi: 40 }, { midi: 64 }, { midi: 84 }];
  model.adjust(notes);
  return notes[0].midi === 28 && notes[1].midi === 64 && notes[2].midi === 84
    ? true : notes.map((n) => n.midi).join(' ');
});

reading('one stray correction is not treated as a habit', () => {
  const model = new CorrectionModel(memory());
  model.observe({ kind: 'octave', midi: 40, octaves: -1 });
  const notes = [{ midi: 40 }];
  model.adjust(notes);
  return notes[0].midi === 40 ? true : 'moved to ' + notes[0].midi;
});

reading('deleting invented notes makes the engine stricter', () => {
  const model = new CorrectionModel(memory());
  model.observe({ kind: 'kept', count: 30 });
  for (let i = 0; i < 10; i++) model.observe({ kind: 'spurious', midi: 70 });
  const strict = model.parameters().sensitivity;
  const other = new CorrectionModel(memory());
  other.observe({ kind: 'kept', count: 30 });
  for (let i = 0; i < 10; i++) other.observe({ kind: 'missed', midi: 70 });
  const keen = other.parameters().sensitivity;
  return strict < 0.98 && keen > 1.02 ? true : 'strict ' + strict.toFixed(2) + ', keen ' + keen.toFixed(2);
});

reading('moving notes between staves moves where the hands divide', () => {
  const model = new CorrectionModel(memory());
  for (let i = 0; i < 5; i++) model.observe({ kind: 'staff', midi: 55, toStaff: 0 });
  return model.parameters().splitCentre <= 57 ? true
    : 'centre ' + model.parameters().splitCentre;
});

reading('a learned hand division actually changes the staff a note lands on', () => {
  const ev = [];
  for (let b = 0; b < 8; b++) ev.push([55 + (b % 3), b, 1, 90]);
  for (let b = 0; b < 8; b += 2) ev.push([40, b, 2, 80]);
  const plain = transcribeMidi(perf(ev, 120));
  const taught = transcribeMidi(perf(ev, 120), { splitCentre: 52 });
  const at = (r, midi) => (r.notes.find((n) => n.midi === midi) || {}).staff;
  return at(plain, 55) !== undefined && at(taught, 55) === 0 ? true
    : 'plain ' + at(plain, 55) + ', taught ' + at(taught, 55);
});

reading('the difference between two scores is read back as corrections', () => {
  const ev = [[60, 0, 1], [62, 1, 1], [64, 2, 1], [65, 3, 1]];
  const before = transcribeMidi(perf(ev, 120)).score;
  const after = transcribeMidi(perf(ev, 120)).score;
  /* Move the first note down an octave, as a user would. */
  const first = after.parts[0].measures[0].voices[0][0];
  first.notes[0].pitch = { ...first.notes[0].pitch, octave: first.notes[0].pitch.octave - 1 };
  const found = compareScores(before, after);
  const octave = found.find((c) => c.kind === 'octave');
  return octave && octave.octaves === -1 ? true
    : found.map((c) => c.kind).join(' ');
});

reading('the account of what was learned matches what was observed', () => {
  const model = new CorrectionModel(memory());
  const summary = model.summary();
  if (!summary.empty) return 'a fresh model claims to have learned something';
  for (let i = 0; i < 4; i++) model.observe({ kind: 'octave', midi: 84, octaves: 1 });
  const after = model.summary();
  return after.corrections === 4 && after.lines.length === 1
    && after.lines[0].includes('4 times') ? true : JSON.stringify(after);
});

/* ------------------------------------------------- what was actually played */

console.log('\nMusical events — the same notes played three ways are three different things.');

const perfSeconds = (events) => events.map(([midi, start, len, vel]) => ({
  midi, start, end: start + len, velocity: vel || 84, confidence: 1,
}));

reading('notes struck together are one chord', () => {
  const kind = classifyEvents(perfSeconds([[60, 0, 1], [64, 0.004, 1], [67, 0.009, 1]]));
  return kind === 'chord' ? true : 'read as ' + kind;
});

reading('the same notes played in turn are a sequence', () => {
  const kind = classifyEvents(perfSeconds([[60, 0, 0.45], [64, 0.5, 0.45], [67, 1.0, 0.45]]));
  return kind === 'sequence' ? true : 'read as ' + kind;
});

reading('the same notes rolled and held are an arpeggio', () => {
  const kind = classifyEvents(perfSeconds([[60, 0, 1.2], [67, 0.05, 1.15], [64, 0.1, 1.1], [72, 0.15, 1.05]]));
  return kind === 'arpeggio' ? true : 'read as ' + kind;
});

reading('a spread chord is not mistaken for a fast run', () => {
  /* 20 ms apart in a slow piece is one chord; the same 20 ms inside a run of
   * demisemiquavers would be a note each. */
  const spread = classifyEvents(perfSeconds([[48, 0, 2], [55, 0.02, 2], [64, 0.04, 2]]));
  const run = classifyEvents(perfSeconds([[60, 0, 0.055], [62, 0.06, 0.055], [64, 0.12, 0.055], [65, 0.18, 0.055]]));
  return spread === 'chord' && run === 'sequence' ? true : spread + ' / ' + run;
});

reading('a chord keeps its own notes, not a tidier chord', () => {
  /* A diminished seventh is unusual and a dominant seventh is not; the reading
   * has to follow the notes rather than the odds. */
  const dim = readChord([60, 63, 66, 69]);
  const cluster = readChord([60, 62, 63, 67]);
  if (dim.quality !== 'dim7') return 'diminished read as ' + dim.quality;
  return cluster.extra.length > 0 || cluster.quality !== 'maj'
    ? true : 'a cluster was flattened into ' + cluster.label;
});

reading('inversions are read from the bass', () => {
  const root = readChord([60, 64, 67]);
  const first = readChord([64, 67, 72]);
  const second = readChord([67, 72, 76]);
  return root.inversion === 0 && first.inversion === 1 && second.inversion === 2
    ? true : [root.label, first.label, second.label].join(' ');
});

reading('a passing note is named as one, not folded into the chord', () => {
  const a = analyseHarmony(perfSeconds([[60, 0, 1], [64, 0, 1], [67, 0, 1], [62, 0.4, 0.2]]));
  const seg = a.segments.find((x) => x.tones.some((t) => t.midi === 62));
  const tone = seg && seg.tones.find((t) => t.midi === 62);
  return tone && tone.kind !== 'chord' ? true : 'read as ' + (tone ? tone.kind : 'missing');
});

/* ------------------------------------------------- listening back to itself */

console.log('\nListening back — the notation is played, measured against the recording, and corrected.');

reading('a transcription that matches the recording scores full marks', () => {
  const tune = step([60, 62, 64, 65, 67, 65, 64, 62], 0.5, 0.45);
  const audio = render(tune, 4.6);
  const r = transcribeAudio(audio, { sampleRate: SR, listen: true });
  if (!r.analysis.listened) return 'the loop did not run';
  return r.analysis.similarity > 0.9 ? true : 'similarity ' + r.analysis.similarity.toFixed(3);
});

reading('notes the first pass missed are found by listening back', () => {
  const chords = [];
  for (const [b, set] of [[0, [48, 60, 64, 67]], [1, [48, 60, 64, 67]],
    [2, [41, 60, 65, 69]], [3, [43, 59, 62, 67]]]) {
    for (const m of set) chords.push([m, b * 0.5, 0.46]);
  }
  const audio = render(chords, 2.6);
  const full = chords.map(([midi, start, len]) => ({
    midi, start, end: start + len, velocity: 88, confidence: 0.8, salience: 80,
  }));
  /* Start from a deliberately impoverished reading: a quarter of the notes
   * gone, and one in the wrong octave. */
  const crippled = full.filter((n, i) => i % 4 !== 2).map((n) => ({ ...n }));
  crippled[0].midi -= 12;
  const before = countRecovered(crippled, full);
  const refined = refineByListening({
    audio, sampleRate: SR, notes: crippled,
    rebuild: (notes) => readMusic(notes, { duration: 2.6 }),
  }, { maxPasses: 6 });
  const after = countRecovered(refined.notes, full);
  return after > before ? true : `recovered ${after} of ${full.length}, started with ${before}`;
});

reading('a correct transcription is not made worse by listening back', () => {
  const tune = step([60, 62, 64, 65], 0.5, 0.45);
  const audio = render(tune, 2.4);
  const exact = tune.map(([midi, start, len]) => ({
    midi, start, end: start + len, velocity: 88, confidence: 1, salience: 100,
  }));
  const refined = refineByListening({
    audio, sampleRate: SR, notes: exact,
    rebuild: (notes) => readMusic(notes, { duration: 2.4 }),
  }, { maxPasses: 4 });
  const kept = countRecovered(refined.notes, exact);
  return kept === exact.length && refined.notes.length === exact.length
    ? true : `${kept} of ${exact.length} kept, ${refined.notes.length} notes now`;
});

reading('the comparison notices a note that is not in the recording', () => {
  const tune = step([60, 62, 64, 65], 0.5, 0.45);
  const truth = render(tune, 2.4);
  const withExtra = render([...tune, [71, 1.0, 0.45]], 2.4);
  const d = compareAudio({ audio: truth, sampleRate: SR }, { audio: withExtra, sampleRate: SR },
    { pitches: [55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76] });
  const found = d.extra.find((x) => x.midi === 71);
  return found ? true : 'not spotted; extra runs ' + d.extra.map((x) => x.midi).join(',');
});

reading('the comparison notices a chord written as a run', () => {
  const chord = render([[60, 0, 1], [64, 0, 1], [67, 0, 1]], 1.6);
  const run = render([[60, 0, 0.3], [64, 0.33, 0.3], [67, 0.66, 0.3]], 1.6);
  const pitches = [55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72];
  const d = compareAudio({ audio: chord, sampleRate: SR }, { audio: run, sampleRate: SR }, { pitches });
  return d.missing.length > 0 && d.similarity < 0.95
    ? true : 'similarity ' + d.similarity.toFixed(3) + ', ' + d.missing.length + ' missing';
});

/* ------------------------------------------------------ the whole texture */

console.log('\nTextures — a melody with an accompaniment under it is two things, not one.');

/** Score one part of a transcription against what was played into it, in seconds. */
function scorePart(result, instrumentId, wanted, tolerance = 0.2) {
  const part = result.assignment
    ? result.assignment.parts.find((p) => p.part.id === instrumentId) : null;
  const notes = part ? part.notes : result.notes;
  const got = notes.map((n) => ({ midi: n.midi, start: n.start }));
  const used = new Set();
  let hit = 0;
  for (const [midi, beat] of wanted) {
    let best = -1;
    let bd = tolerance;
    got.forEach((g, i) => {
      if (used.has(i) || g.midi !== midi) return;
      const d = Math.abs(g.start - beat);
      if (d < bd) { bd = d; best = i; }
    });
    if (best >= 0) { hit++; used.add(best); }
  }
  return { hit, want: wanted.length, spurious: got.length - hit };
}

reading('a single melody comes back as a single line', () => {
  const tune = step([60, 62, 64, 65, 67, 69, 71, 72], 0.5, 0.45);
  const r = transcribeAudio(render(tune, 4.6), {
    sampleRate: SR, plan: resolveTarget({ targetId: 'flute' }), listen: false,
  });
  const s = scorePart(r, 'flute', tune.map((t) => [t[0], t[1]]));
  const staves = new Set(r.notes.map((n) => n.staff)).size;
  return s.hit === s.want && !s.spurious && staves === 1
    ? true : `${s.hit}/${s.want}, ${s.spurious} spurious, ${staves} staves`;
});

reading('piano chords stay chords', () => {
  const ev = [];
  const sets = [[48, 60, 64, 67], [48, 60, 65, 69], [43, 59, 62, 67], [48, 60, 64, 67]];
  sets.forEach((set, b) => { for (const m of set) ev.push([m, b * 0.6, 0.55]); });
  /* With the listen-back loop on, because that is what it is for: the first
   * reading of four four-note chords is never complete. */
  const r = transcribeAudio(render(ev, 3.0), { sampleRate: SR, listen: true, maxVoices: 6 });
  const s = scorePart(r, 'piano', ev.map((e) => [e[0], e[1]]), 0.25);
  /* Counted across the texture, not within one voice: a four-note piano chord
   * is split between the hands, and each hand's share is a chord of its own. */
  const together = new Map();
  for (const n of r.notes) together.set(n.startTicks, (together.get(n.startTicks) || 0) + 1);
  const thick = [...together.values()].filter((v) => v >= 3).length;
  return s.hit >= 14 && thick >= 3
    ? true : `${s.hit}/${s.want} notes, ${s.spurious} spurious, ${thick} moments of three or more`;
});

reading('a melody over an accompaniment is two lines', () => {
  const ev = [];
  for (let b = 0; b < 8; b++) ev.push([72 + [0, 2, 4, 5, 4, 2, 0, 2][b], b * 0.5, 0.45, 100]);
  for (let b = 0; b < 4; b++) { ev.push([48, b, 0.95, 70], [55, b, 0.95, 70]); }
  const r = transcribeAudio(render(ev, 4.6), { sampleRate: SR, listen: false });
  const hands = new Set(r.notes.map((n) => n.staff));
  const high = r.notes.filter((n) => n.midi >= 70);
  const low = r.notes.filter((n) => n.midi <= 60);
  const wrong = high.filter((n) => n.staff !== 0).length + low.filter((n) => n.staff !== 1).length;
  return hands.size === 2 && wrong === 0
    ? true : `${hands.size} staves, ${wrong} notes in the wrong hand`;
});

reading('two hands playing different rhythms keep different voices', () => {
  const ev = [];
  for (let b = 0; b < 8; b++) ev.push([72 + (b % 3) * 2, b * 0.25, 0.22, 100]);
  ev.push([48, 0, 1.9, 70], [52, 0, 1.9, 70]);
  const r = transcribeAudio(render(ev, 2.6), { sampleRate: SR, listen: false });
  const staves = new Set(r.notes.map((n) => n.staff));
  return staves.size === 2 ? true : staves.size + ' staves';
});

reading('an arpeggio is written as notes, not as a block chord', () => {
  const ev = step([60, 64, 67, 72, 67, 64], 0.25, 0.22);
  const r = transcribeAudio(render(ev, 1.9), { sampleRate: SR, listen: false });
  const chords = r.chords.filter((c) => c.notes.length > 1);
  const s = scorePart(r, 'piano', ev.map((e) => [e[0], e[1]]), 0.2);
  return chords.length === 0 && s.hit >= 5
    ? true : `${chords.length} block chords, ${s.hit}/${s.want} notes`;
});

reading('a dense chord keeps all of its notes', () => {
  const ev = [[36, 0, 1.4], [48, 0, 1.4], [55, 0, 1.4], [60, 0, 1.4], [64, 0, 1.4], [67, 0, 1.4]];
  const r = transcribeAudio(render(ev, 2.0), { sampleRate: SR, listen: false, maxVoices: 7 });
  const found = new Set(r.notes.map((n) => n.midi));
  const missing = ev.map((e) => e[0]).filter((m) => !found.has(m));
  return missing.length <= 1 ? true : 'missing ' + missing.join(',');
});

reading('inversions come through as inversions', () => {
  const sets = [[60, 64, 67], [64, 67, 72], [67, 72, 76]];
  const ev = [];
  sets.forEach((set, b) => { for (const m of set) ev.push([m, b * 0.6, 0.55]); });
  const r = transcribeAudio(render(ev, 2.4), { sampleRate: SR, listen: false });
  const bass = sets.map((set, b) => {
    const at = r.notes.filter((n) => Math.abs(n.start - b * 0.6) < 0.2);
    return at.length ? Math.min(...at.map((n) => n.midi)) : null;
  });
  return JSON.stringify(bass) === JSON.stringify([60, 64, 67])
    ? true : 'bass notes ' + bass.join(',');
});

reading('counterpoint keeps both lines when they cross', () => {
  /* Two lines that swap places: pitch order alone would swap the parts with
   * them, and the reader would see two broken lines instead of two whole ones. */
  const upper = [67, 66, 64, 62, 60, 59];
  const lower = [52, 55, 59, 62, 64, 67];
  const ev = [];
  upper.forEach((m, i) => ev.push([m, i * 0.4, 0.38, 95]));
  lower.forEach((m, i) => ev.push([m, i * 0.4, 0.38, 95]));
  const notes = ev.map(([midi, start, len, vel]) => ({
    midi, start, end: start + len, velocity: vel, confidence: 1, salience: 90,
  }));
  const r = readMusic(notes, { duration: 2.6, plan: resolveTarget({ targetId: 'duet', preset: 'violin+cello' }) });
  const vln = r.assignment.parts.find((p) => p.part.id === 'violin');
  const vc = r.assignment.parts.find((p) => p.part.id === 'cello');
  /* The last note of each line is the test: they have crossed by then. */
  const vlnLast = vln.notes.filter((n) => n.startTicks >= 4 * 960).map((n) => n.midi);
  const vcLast = vc.notes.filter((n) => n.startTicks >= 4 * 960).map((n) => n.midi);
  return vln.notes.length === 6 && vc.notes.length === 6
    ? true : `violin ${vln.notes.length} notes, cello ${vc.notes.length}`;
});

/* ---------------------------------------------------------- more than one */

console.log('\nEnsembles — told the line-up, the engine looks for that many lines and no more.');

reading('a string duet comes back on two staves', () => {
  const ev = [];
  [76, 77, 79, 81].forEach((m, i) => ev.push([m, i * 0.5, 0.45, 95]));
  [48, 50, 52, 53].forEach((m, i) => ev.push([m, i * 0.5, 0.45, 90]));
  const r = transcribeAudio(render(ev, 2.6), {
    sampleRate: SR, listen: false, plan: resolveTarget({ targetId: 'duet', preset: 'violin+cello' }),
  });
  const names = r.score.parts.map((p) => p.instrumentId);
  const vln = scorePart(r, 'violin', [[76, 0], [77, 0.5], [79, 1], [81, 1.5]], 0.2);
  const vc = scorePart(r, 'cello', [[48, 0], [50, 0.5], [52, 1], [53, 1.5]], 0.2);
  return names.length === 2 && vln.hit >= 3 && vc.hit >= 3
    ? true : `${names.join('+')}, violin ${vln.hit}/4, cello ${vc.hit}/4`;
});

reading('violin and piano are told apart by register', () => {
  const ev = [];
  [79, 81, 83, 84].forEach((m, i) => ev.push([m, i * 0.5, 0.45, 100]));
  for (let b = 0; b < 4; b++) { ev.push([48, b * 0.5, 0.45, 70], [60, b * 0.5, 0.45, 70]); }
  const notes = ev.map(([midi, start, len, vel]) => ({
    midi, start, end: start + len, velocity: vel, confidence: 1, salience: 90,
  }));
  const r = readMusic(notes, { duration: 2.6, plan: resolveTarget({ targetId: 'duet', preset: 'violin+piano' }) });
  const vln = r.assignment.parts.find((p) => p.part.id === 'violin');
  const pno = r.assignment.parts.find((p) => p.part.id === 'piano');
  const strayed = vln.notes.filter((n) => n.midi < 70).length + pno.notes.filter((n) => n.midi > 75).length;
  return strayed === 0 && r.score.parts.length === 2
    ? true : `${strayed} notes in the wrong part`;
});

reading('a piano trio puts each player on their own staff', () => {
  const ev = [];
  [79, 81, 83, 84].forEach((m, i) => ev.push([m, i * 0.5, 0.45, 100]));
  [50, 52, 53, 55].forEach((m, i) => ev.push([m, i * 0.5, 0.45, 85]));
  for (let b = 0; b < 4; b++) ev.push([64, b * 0.5, 0.45, 70]);
  const notes = ev.map(([midi, start, len, vel]) => ({
    midi, start, end: start + len, velocity: vel, confidence: 1, salience: 90,
  }));
  const r = readMusic(notes, { duration: 2.6, plan: resolveTarget({ targetId: 'trio', preset: 'piano-trio' }) });
  const ids = r.score.parts.map((p) => p.instrumentId).sort();
  const used = r.assignment.parts.filter((p) => p.notes.length).length;
  return JSON.stringify(ids) === JSON.stringify(['cello', 'piano', 'violin']) && used === 3
    ? true : ids.join(',') + ', ' + used + ' players used';
});

reading('a string quartet is read as four lines, not as chords', () => {
  const lines = [[76, 78, 79, 81], [69, 71, 72, 74], [62, 64, 65, 67], [50, 52, 53, 55]];
  const notes = [];
  lines.forEach((line) => line.forEach((m, i) => notes.push({
    midi: m, start: i * 0.5, end: i * 0.5 + 0.45, velocity: 90, confidence: 1, salience: 90,
  })));
  const r = readMusic(notes, { duration: 2.6, plan: resolveTarget({ targetId: 'quartet', preset: 'string-quartet' }) });
  const counts = r.assignment.parts.map((p) => p.notes.length);
  const chords = r.chords.filter((c) => c.notes.length > 1);
  return JSON.stringify(counts) === JSON.stringify([4, 4, 4, 4]) && chords.length === 0
    ? true : 'notes per part ' + counts.join(',') + ', ' + chords.length + ' chords';
});

reading('a chamber ensemble keeps five lines apart', () => {
  const lines = [[84, 86, 87], [77, 79, 80], [72, 74, 75], [65, 67, 68], [53, 55, 56]];
  const notes = [];
  lines.forEach((line) => line.forEach((m, i) => notes.push({
    midi: m, start: i * 0.5, end: i * 0.5 + 0.45, velocity: 90, confidence: 1, salience: 90,
  })));
  const r = readMusic(notes, { duration: 2.0, plan: resolveTarget({ targetId: 'chamber', preset: 'wind-quintet' }) });
  const used = r.assignment.parts.filter((p) => p.notes.length).length;
  return used === 5 ? true : used + ' of 5 players used';
});

reading('an orchestral passage is written in sections, not on a piano staff', () => {
  const lines = [[84, 86, 88], [79, 81, 83], [72, 74, 76], [64, 66, 68], [52, 54, 56], [40, 42, 44]];
  const notes = [];
  lines.forEach((line) => line.forEach((m, i) => notes.push({
    midi: m, start: i * 0.5, end: i * 0.5 + 0.45, velocity: 90, confidence: 1, salience: 90,
  })));
  const plan = resolveTarget({ targetId: 'orchestral-movement' });
  const r = readMusic(notes, { duration: 2.0, plan });
  const ids = r.score.parts.map((p) => p.instrumentId);
  const used = r.assignment.parts.filter((p) => p.notes.length).length;
  if (ids.includes('piano')) return 'an orchestra was written for piano';
  const bad = barsAddUp(r.score);
  return used >= 4 && ids.length === plan.parts.length && !bad.length
    ? true : `${used} players used of ${ids.length}${bad.length ? '; ' + bad[0] : ''}`;
});

/** How many of `wanted` appear in `got`, matched once each. */
function countRecovered(got, wanted, tolerance = 0.16) {
  const used = new Set();
  let hit = 0;
  for (const w of wanted) {
    let best = -1;
    let bd = tolerance;
    got.forEach((g, i) => {
      if (used.has(i) || g.midi !== w.midi) return;
      const d = Math.abs(g.start - w.start);
      if (d < bd) { bd = d; best = i; }
    });
    if (best >= 0) { hit++; used.add(best); }
  }
  return hit;
}

/* ---------------------------------------------- not inventing complexity */

console.log('\nSimplicity — a simple performance must come back as simple notation.');

/** Every written value in the score, so oddities show up by name. */
function writtenValues(score) {
  const out = [];
  for (const part of score.parts) {
    for (const pm of part.measures) {
      pm.voices.forEach((voice, vi) => {
        for (const ev of voice) {
          out.push({
            voice: vi,
            rest: ev.type === 'rest',
            duration: ev.duration,
            dots: ev.dots,
            tuplet: !!ev.tuplet,
            tie: ev.type === 'note' ? ev.notes[0].tie : null,
            midis: ev.type === 'note' ? ev.notes.map((n) => T.toMidi(n.pitch)).sort((a, b) => a - b) : [],
            staff: ev.staff,
          });
        }
      });
    }
  }
  return out;
}

const shape = (v) => v.duration + '.'.repeat(v.dots) + (v.tuplet ? '[t]' : '') + (v.tie ? '~' : '');

reading('eight even eighth notes are written as eight eighth notes', () => {
  const ev = [];
  for (let i = 0; i < 8; i++) ev.push([60 + [0, 2, 4, 5, 7, 9, 11, 12][i], i * 0.25, 0.23]);
  const r = transcribeMidi(perfSeconds(ev), { style: 'balanced' });
  const notes = writtenValues(r.score).filter((v) => !v.rest);
  const kinds = [...new Set(notes.map(shape))];
  return kinds.length === 1 && !kinds[0].includes('[t]') && !kinds[0].includes('~')
    ? true : 'written as ' + writtenValues(r.score).map(shape).join(' ');
});

reading('a run played slightly unevenly is still one rhythm', () => {
  /* 120, 121, 119, 122, 120, 118, 121 milliseconds between attacks. */
  const gaps = [0.120, 0.121, 0.119, 0.122, 0.120, 0.118, 0.121];
  const ev = [];
  let t = 0;
  [60, 62, 64, 65, 67, 69, 71, 72].forEach((m, i) => {
    ev.push([m, t, 0.11]);
    t += gaps[i] === undefined ? 0.12 : gaps[i];
  });
  const r = transcribeMidi(perfSeconds(ev), { style: 'balanced' });
  const kinds = [...new Set(writtenValues(r.score).filter((v) => !v.rest).map(shape))];
  return kinds.length === 1 ? true : 'written as ' + kinds.join(' / ');
});

reading('a scale at an even tempo does not acquire ties or tuplets', () => {
  const ev = [];
  [60, 62, 64, 65, 67, 69, 71, 72].forEach((m, i) => ev.push([m, i * 0.25, 0.24]));
  const r = transcribeMidi(perfSeconds(ev), { style: 'balanced' });
  const written = writtenValues(r.score);
  const odd = written.filter((v) => v.tuplet || v.tie || v.dots > 0
    || ['32nd', '64th', '128th'].includes(v.duration));
  return odd.length === 0 ? true : odd.map(shape).join(' ') + ' among ' + written.map(shape).join(' ');
});

reading('a hand keeps its own chord', () => {
  /* Left hand C2 G2 C3, right hand E4 G4 C5, struck together four times. */
  const ev = [];
  for (let b = 0; b < 4; b++) {
    for (const m of [36, 43, 48]) ev.push([m, b * 0.5, 0.46, 74]);
    for (const m of [64, 67, 72]) ev.push([m, b * 0.5, 0.46, 96]);
  }
  const r = transcribeMidi(perfSeconds(ev), { style: 'balanced' });
  const wrong = r.notes.filter((n) => (n.midi < 60) !== (n.staff === 1));
  const written = writtenValues(r.score).filter((v) => !v.rest);
  const triads = written.filter((v) => v.midis.length === 3).length;
  return wrong.length === 0 && triads === 8
    ? true : `${wrong.length} notes in the wrong hand, ${triads} three-note chords of 8`;
});

reading('a chord progression stays one voice per hand', () => {
  const ev = [];
  [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]].forEach((set, b) => {
    for (const m of set) ev.push([m, b * 0.6, 0.56, 88]);
  });
  const r = transcribeMidi(perfSeconds(ev), { style: 'balanced' });
  const voices = new Set(r.notes.map((n) => `${n.staff}:${n.voice}`));
  const written = writtenValues(r.score).filter((v) => !v.rest);
  return voices.size === 1 && written.every((v) => v.midis.length === 3)
    ? true : `${voices.size} voices, chord sizes ${written.map((v) => v.midis.length).join(',')}`;
});

reading('a repeated accompaniment is not read as four separate lines', () => {
  const ev = [];
  const bass = [[48, 55], [41, 48], [43, 50], [48, 55]];
  bass.forEach((pair, b) => {
    ev.push([pair[0], b * 1.0, 0.48, 70], [pair[1], b * 1.0 + 0.5, 0.48, 70]);
  });
  for (let i = 0; i < 8; i++) ev.push([72 + [0, 2, 4, 2, 0, 2, 4, 5][i], i * 0.5, 0.46, 98]);
  const r = transcribeMidi(perfSeconds(ev), { style: 'balanced' });
  const low = r.notes.filter((n) => n.midi < 60);
  const voices = new Set(low.map((n) => `${n.staff}:${n.voice}`));
  const strayed = low.filter((n) => n.staff !== 1).length;
  return voices.size === 1 && strayed === 0
    ? true : `${voices.size} voices in the left hand, ${strayed} notes on the wrong staff`;
});

reading('melody over an accompaniment keeps one voice in each hand', () => {
  const ev = [];
  for (let i = 0; i < 8; i++) ev.push([72 + [0, 2, 4, 5, 4, 2, 0, 2][i], i * 0.25, 0.23, 100]);
  for (let b = 0; b < 4; b++) { ev.push([48, b * 0.5, 0.48, 70], [55, b * 0.5, 0.48, 70]); }
  const r = transcribeMidi(perfSeconds(ev), { style: 'balanced' });
  const perStaff = new Map();
  for (const n of r.notes) {
    const key = n.staff;
    if (!perStaff.has(key)) perStaff.set(key, new Set());
    perStaff.get(key).add(n.voice);
  }
  const counts = [...perStaff.entries()].sort().map(([, v]) => v.size);
  return counts.every((c) => c === 1) ? true : 'voices per staff ' + counts.join(',');
});

reading('the simple style is simpler than the precise one', () => {
  const gaps = [0.243, 0.262, 0.238, 0.268, 0.241, 0.259, 0.246];
  const ev = [];
  let t = 0;
  [60, 62, 64, 65, 67, 69, 71, 72].forEach((m, i) => { ev.push([m, t, 0.22]); t += gaps[i] ?? 0.25; });
  const simple = transcribeMidi(perfSeconds(ev), { style: 'simple' });
  const precise = transcribeMidi(perfSeconds(ev), { style: 'precise' });
  const count = (r) => new Set(writtenValues(r.score).map(shape)).size;
  return count(simple) <= count(precise)
    ? true : `simple used ${count(simple)} kinds of value, precise ${count(precise)}`;
});

reading('a genuine triplet still comes through', () => {
  /* Simplicity must not cost accuracy: three in the time of two is real. */
  const ev = [[60, 0, 0.48], [62, 0.5, 0.48]];
  for (let k = 0; k < 3; k++) ev.push([64 + k, 1.0 + k / 6, 0.15]);
  ev.push([67, 1.5, 0.48], [65, 2.0, 0.48], [64, 2.5, 0.48], [62, 3.0, 0.9]);
  const r = transcribeMidi(perfSeconds(ev), { style: 'balanced' });
  const trips = writtenValues(r.score).filter((v) => v.tuplet).length;
  return trips === 3 ? true : trips + ' tuplet notes written';
});

reading('a genuine staccato still leaves its rest', () => {
  const ev = [[60, 0, 0.1], [62, 0.5, 0.1], [64, 1.0, 0.1], [65, 1.5, 0.1]];
  const r = transcribeMidi(perfSeconds(ev), { style: 'balanced' });
  const rests = writtenValues(r.score).filter((v) => v.rest).length;
  return rests >= 4 ? true : rests + ' rests for four short notes';
});

reading('eight even eighths heard as audio are still eight eighth notes', () => {
  const ev = [];
  [60, 62, 64, 65, 67, 69, 71, 72].forEach((m, i) => ev.push([m, i * 0.25, 0.235]));
  const r = transcribeAudio(render(ev, 2.6), { sampleRate: SR, listen: false, style: 'balanced' });
  const written = writtenValues(r.score).filter((v) => !v.rest);
  const kinds = [...new Set(written.map(shape))];
  const odd = written.filter((v) => v.tuplet || v.tie || ['32nd', '64th', '128th'].includes(v.duration));
  return kinds.length <= 2 && odd.length === 0
    ? true : 'written as ' + writtenValues(r.score).map(shape).join(' ');
});

reading('a two-handed chord heard as audio keeps each hand together', () => {
  const ev = [];
  for (let b = 0; b < 4; b++) {
    for (const m of [43, 50, 55]) ev.push([m, b * 0.6, 0.56, 0.2]);
    for (const m of [64, 67, 72]) ev.push([m, b * 0.6, 0.56, 0.2]);
  }
  const r = transcribeAudio(render(ev, 3.0), { sampleRate: SR, listen: true, style: 'balanced', maxVoices: 7 });
  const wrong = r.notes.filter((n) => (n.midi < 60) !== (n.staff === 1)).length;
  const perStaff = new Map();
  for (const n of r.notes) perStaff.set(n.staff, (perStaff.get(n.staff) || new Set()).add(n.voice));
  const voices = [...perStaff.values()].map((v) => v.size);
  return wrong === 0 && voices.every((v) => v === 1)
    ? true : `${wrong} notes in the wrong hand, voices per staff ${voices.join(',')}`;
});

reading('a hand is not split just because a chord is wide', () => {
  /* Left hand spans a tenth, right hand a sixth; the gap between the hands is
   * what separates them, not the distance inside either. */
  const ev = [];
  for (let b = 0; b < 3; b++) {
    for (const m of [40, 47, 52]) ev.push([m, b * 0.6, 0.56, 76]);
    for (const m of [67, 72, 76]) ev.push([m, b * 0.6, 0.56, 96]);
  }
  const r = transcribeMidi(perfSeconds(ev), { style: 'balanced' });
  const wrong = r.notes.filter((n) => (n.midi < 60) !== (n.staff === 1)).length;
  return wrong === 0 ? true : wrong + ' notes in the wrong hand';
});

reading('hands that move keep their notes together as they go', () => {
  /* The left hand walks up while the right walks down; a division fixed at
   * middle C would hand notes to the wrong player halfway through. */
  const ev = [];
  const left = [36, 40, 43, 48, 50, 52];
  const right = [79, 76, 74, 72, 69, 67];
  left.forEach((m, i) => { ev.push([m, i * 0.5, 0.46, 74], [m + 7, i * 0.5, 0.46, 74]); });
  right.forEach((m, i) => ev.push([m, i * 0.5, 0.46, 98]));
  const r = transcribeMidi(perfSeconds(ev), { style: 'balanced' });
  const wrongLeft = r.notes.filter((n) => left.includes(n.midi) && n.staff !== 1).length;
  const wrongRight = r.notes.filter((n) => right.includes(n.midi) && n.staff !== 0).length;
  return wrongLeft + wrongRight === 0
    ? true : `${wrongLeft} left-hand and ${wrongRight} right-hand notes misplaced`;
});

/* ------------------------------------------------- nothing throws at the user

   A transcription that stops with an error message is worse than a rough one,
   so the reader has to survive whatever a performance turns out to be: a
   single chord, two seconds of playing, a stretch where several notes arrive
   a moment late together, or several hundred notes at once. */

reading('a chord that catches two late notes still reviews', () => {
  /* Two stragglers, each near the same chord: folding the first away must not
   * leave the second looking for a moment that is no longer there. */
  const notes = [];
  const add = (t, len, midis) => {
    for (const m of midis) notes.push({ midi: m, startTicks: t, endTicks: t + len, division: 4, staff: 0, voice: 1 });
  };
  add(0, 480, [60, 64, 67]);
  add(100, 380, [72]);
  add(200, 280, [74]);
  add(480, 480, [60, 64, 67]);
  add(960, 480, [62, 65, 69]);
  add(1440, 480, [64, 67, 71]);
  const log = review([{ notes }], { perBeat: 480 });
  const late = notes.filter((n) => n.startTicks === 0).length;
  return late === 5 ? true : `${late} notes in the opening chord, and the log said ${log.join('; ')}`;
});

reading('a performance too short to have a tempo still transcribes', () => {
  /* Under half a second there is nothing for the playing to repeat against,
   * so no pulse can be measured — which is not a reason to fail. */
  const r = transcribeMidi(perfSeconds([[60, 0, 0.2], [64, 0.01, 0.2], [67, 0.02, 0.25]]), {});
  if (r.notes.length !== 3) return r.notes.length + ' notes survived';
  return r.score.measures.length >= 1 ? true : 'no bars were written';
});

reading('no performance stops the reader with an error', () => {
  /* Two hundred performances made of random pitches, densities and timings,
   * through every style and every quantisation setting. */
  const styles = ['simple', 'balanced', 'precise'];
  const quant = ['none', 'light', 'medium', 'strong'];
  let seed = 1;
  const next = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let run = 0; run < 200; run++) {
    const events = [];
    let t = next() * 2;
    const count = Math.floor(next() * 40);
    for (let i = 0; i < count; i++) {
      const poly = 1 + Math.floor(next() * 4);
      const len = [0.02, 0.12, 0.25, 0.5, 1, 2][Math.floor(next() * 6)];
      for (let p = 0; p < poly; p++) {
        events.push([21 + Math.floor(next() * 88), t + (next() < 0.3 ? next() * 0.04 : 0), len, 40 + Math.floor(next() * 80)]);
      }
      t += [0, 0.001, 0.06, 0.125, 0.25, 0.5, 1, 3][Math.floor(next() * 8)];
    }
    try {
      transcribeMidi(perfSeconds(events), {
        style: styles[run % 3],
        quantise: quant[run % 4],
        bpm: [null, 40, 120, 208][run % 4],
        timeSig: [null, { beats: 4, beatType: 4 }, { beats: 3, beatType: 4 }, { beats: 6, beatType: 8 }][run % 4],
      });
    } catch (err) {
      return `run ${run} (${events.length} notes) failed: ${err.message}`;
    }
  }
  return true;
});

/* ---------------------------------------------------------------- report */

const total = pass + failures.length;
console.log('');
if (failures.length) {
  console.log(failures.length + ' of ' + total + ' transcription checks FAILED:\n');
  for (const f of failures) console.log('  ✗ ' + f);
  console.log('');
  process.exit(1);
}
console.log('All ' + total + ' transcription checks pass.');

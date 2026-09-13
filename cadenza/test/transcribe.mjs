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
import { transcribeMidi, transcribeAudio } from '../js/transcribe/index.js';
import { timeSigAt } from '../js/core/model.js';
import { measureTicks, eventTicks } from '../js/core/rhythm.js';
import * as T from '../js/core/theory.js';

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

reading('a fast performance is not read as a slow one', () => {
  const ev = [];
  for (let b = 0; b < 16; b++) ev.push([60 + (b % 8), b, 1]);
  const r = transcribeMidi(perf(ev, 168));
  return Math.abs(r.analysis.bpm - 168) < 8 ? true : 'read as ' + r.analysis.bpm;
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

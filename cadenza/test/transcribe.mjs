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

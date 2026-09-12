#!/usr/bin/env node
/* Cadenza — musical rule checks.
 *
 * Each case states a rule of common-practice notation and asserts that the
 * engine follows it.  Run with:  node cadenza/test/rules.mjs
 */

import * as T from '../js/core/theory.js';
import * as R from '../js/core/rhythm.js';
import * as M from '../js/core/model.js';
import * as E from '../js/core/edit.js';
import { History } from '../js/core/history.js';
import { getInstrument, INSTRUMENTS } from '../js/core/instruments.js';
import { layoutScore } from '../js/engrave/layout.js';
import { Player } from '../js/audio/player.js';

let pass = 0;
const failures = [];
function check(rule, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++;
  else failures.push(`${rule}\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`);
}
function score(opts = {}) {
  const s = M.createScore({ title: 't', instrumentIds: ['piano'], measures: 4, ...opts });
  return { score: s, history: new History(s) };
}
const P = (n) => T.pitchFromName(n);
function put(app, pi, m, v, list) {
  const vo = M.getVoice(app.score, pi, m, v);
  vo.length = 0;
  for (const item of list) {
    const [n, d, o] = Array.isArray(item) ? item : [item, 'quarter'];
    vo.push(n === 'R' ? M.makeRest(d, o || {}) : M.makeNote(n.split('+').map(P), d, o || {}));
  }
  M.normalizeMeasure(app.score, app.score.parts[pi], m);
  return vo;
}
const accidentalsOf = (s, opts = {}) => layoutScore(s, opts).pages[0].items
  .filter((i) => i.kind === 'glyph' && i.cls === 'accidental')
  .map((i) => i.name.replace('accidental', ''));
const stemsOf = (s) => layoutScore(s, {}).pages[0].items
  .filter((i) => i.cls === 'stem').map((i) => (i.y2 < i.y1 ? 'up' : 'down'));

/* ---------------------------------------------------------- accidentals */

{
  const app = score();
  put(app, 0, 0, 0, [['F#4', 'quarter'], ['F4', 'quarter'], ['F4', 'half']]);
  check('An accidental holds for the rest of the bar, then is cancelled once',
    accidentalsOf(app.score), ['Sharp', 'Natural']);
}
{
  const app = score();
  put(app, 0, 0, 0, [['F#4', 'half'], ['A4', 'half']]);
  put(app, 0, 0, 2, [['R', 'half'], ['F4', 'half']]);
  check('An accidental applies to every voice on the staff, not just its own',
    accidentalsOf(app.score), ['Sharp', 'Natural']);
}
{
  const app = score();
  put(app, 0, 0, 0, [['F#4', 'whole']]);
  put(app, 0, 1, 0, [['F4', 'whole']]);
  check('An accidental does not survive the barline',
    accidentalsOf(app.score), ['Sharp']);
}
{
  const app = score();
  const a = put(app, 0, 0, 0, [['F#4', 'whole']]);
  put(app, 0, 1, 0, [['F#4', 'whole']]);
  E.toggleTie(app, [a[0].id]);
  check('A note tied over the barline does not restate its accidental',
    accidentalsOf(app.score), ['Sharp']);
}
{
  const app = score({ keySig: { fifths: 1, mode: 'major' } });
  put(app, 0, 0, 0, [['F#4', 'half'], ['F#5', 'half']]);
  check('The key signature spells the note, so no accidental is printed',
    accidentalsOf(app.score), []);
}
{
  const app = score({ keySig: { fifths: 1, mode: 'major' } });
  put(app, 0, 0, 0, [['F#4', 'half'], ['F#3', 'half']]);
  check('An accidental applies only in its own octave', accidentalsOf(app.score), []);
}
{
  const app = score();
  put(app, 0, 0, 0, [['F#4', 'half'], ['F#5', 'half']]);
  check('...and must be restated in another octave',
    accidentalsOf(app.score), ['Sharp', 'Sharp']);
}

/* ------------------------------------------------------- stems and beams */

{
  const app = score({ instrumentIds: ['violin'] });
  put(app, 0, 0, 0, [['B4', 'quarter'], ['C5', 'quarter'], ['A4', 'quarter'], ['G4', 'quarter']]);
  check('A note on the middle line stems down; above it down, below it up',
    stemsOf(app.score), ['down', 'down', 'up', 'up']);
}
{
  const app = score({ instrumentIds: ['violin'] });
  put(app, 0, 0, 0, [['C4+E5', 'whole']]);
  check('A chord takes its stem from the note furthest from the middle line',
    stemsOf(app.score), []);       // a whole note has no stem
}
{
  const app = score({ instrumentIds: ['violin'] });
  put(app, 0, 0, 0, [['E4+G5', 'half'], ['D4+F4', 'half']]);
  check('Chord stems follow the outer note', stemsOf(app.score), ['down', 'up']);
}
{
  const ts = { beats: 4, beatType: 4 };
  const evs = Array.from({ length: 8 }, () => ({ type: 'note', duration: 'eighth' }));
  check('Eighths in 4/4 beam in half-bar groups',
    R.computeBeams(evs, ts), [[0, 1, 2, 3], [4, 5, 6, 7]]);
}
{
  const ts = { beats: 6, beatType: 8 };
  const evs = Array.from({ length: 6 }, () => ({ type: 'note', duration: 'eighth' }));
  check('Eighths in 6/8 beam in threes', R.computeBeams(evs, ts), [[0, 1, 2], [3, 4, 5]]);
}
{
  const ts = { beats: 3, beatType: 4 };
  const evs = Array.from({ length: 6 }, () => ({ type: 'note', duration: 'eighth' }));
  check('Eighths in 3/4 beam per beat', R.computeBeams(evs, ts), [[0, 1], [2, 3], [4, 5]]);
}
{
  const ts = { beats: 4, beatType: 4 };
  const evs = Array.from({ length: 8 }, () => ({ type: 'note', duration: '16th' }));
  const levels = R.beamLevels(evs, [0, 1, 2, 3, 4, 5, 6, 7], 0, ts);
  check('Secondary beams break at the beat',
    levels.map((l) => l.continued ?? '-'), ['-', 2, 2, 2, 1, 2, 2, 2]);
}
{
  const app = score({ instrumentIds: ['violin'] });
  const v = put(app, 0, 0, 0, [['G4', 'eighth'], ['A4', 'eighth'], ['B4', 'eighth'], ['C5', 'eighth'],
    ['D5', 'eighth'], ['E5', 'eighth'], ['F5', 'eighth'], ['G5', 'eighth']]);
  const dirs = new Set(stemsOf(app.score).slice(0, 4));
  check('Every note under one beam shares a stem direction', dirs.size, 1);
}

/* ------------------------------------------------------------- rhythm */

{
  /* The model stores the tick-accurate length so bars add up; the rule lives in
   * what gets drawn, so that is what this checks. */
  for (const ts of [{ beats: 4, beatType: 4 }, { beats: 3, beatType: 4 },
    { beats: 7, beatType: 8 }, { beats: 2, beatType: 2 }, { beats: 12, beatType: 8 }]) {
    const app = score({ instrumentIds: ['violin'] });
    app.score.measures[0].timeSig = ts;
    M.normalizeScore(app.score);
    const v = app.score.parts[0].measures[0].voices[0];
    const items = layoutScore(app.score, {}).pages[0].items;
    const rest = items.find((i) => i.kind === 'glyph' && i.cls === 'rest');
    const dots = items.filter((i) => i.kind === 'dot' && i.cls === 'dot').length;
    check(`A whole-bar rest is drawn as an undotted whole rest in ${ts.beats}/${ts.beatType}`,
      [v.length, rest && rest.name, dots, R.eventTicks(v[0]) === R.measureTicks(ts)],
      [1, 'restWhole', 0, true]);
  }
}
{
  const app = score();
  const v = put(app, 0, 0, 0, [['C4', 'quarter']]);
  check('A part-filled bar is padded to exactly one bar',
    v.reduce((a, e) => a + R.eventTicks(e), 0), R.measureTicks({ beats: 4, beatType: 4 }));
}
{
  const app = score();
  const v = put(app, 0, 0, 0, [['C4', 'eighth']]);
  check('Rests are split so the beat stays visible',
    v.slice(1).map((e) => e.duration + '.'.repeat(e.dots)), ['eighth', 'quarter', 'half']);
}
{
  const app = score();
  const v = put(app, 0, 0, 0, [['C4', 'quarter']]);
  E.makeTuplet(app, [v[0].id], 3, 2);
  const grp = app.score.parts[0].measures[0].voices[0].filter((e) => e.tuplet);
  check('A triplet occupies exactly the span it replaced',
    grp.reduce((a, e) => a + R.eventTicks(e), 0), R.TPQ);
}
{
  const app = score();
  const v = put(app, 0, 0, 0, [['C4', 'quarter'], ['D4', 'quarter'], ['E4', 'half']]);
  const g = M.makeNote(P('B3'), 'eighth', { grace: { type: 'acciaccatura', slash: true } });
  v.unshift(g);
  M.normalizeMeasure(app.score, app.score.parts[0], 0);
  check('A grace note takes no time from the bar',
    v.reduce((a, e) => a + (e.grace ? 0 : R.eventTicks(e)), 0), 3840);
}

/* --------------------------------------------------------- pitch & keys */

{
  check('Sharps are added in the order F C G D A E B',
    T.keySignatureLayout(7, 'treble').map((a) => T.STEP_NAMES[a.step]).join(''), 'FCGDAEB');
  check('Flats are added in the order B E A D G C F',
    T.keySignatureLayout(-7, 'treble').map((a) => T.STEP_NAMES[a.step]).join(''), 'BEADGCF');
  check('The tenor clef drops its first sharp an octave, by convention',
    T.keySignatureLayout(1, 'tenor')[0].pos, 2);
  check('No key accidental is written above the top line',
    T.keySignatureLayout(7, 'bass').every((a) => a.pos <= 8), true);
}
{
  const app = score({ instrumentIds: ['violin'] });
  const v = put(app, 0, 0, 0, [['F#4', 'whole']]);
  E.transposeTargets(app, [v[0].id], { steps: 1 });
  check('Stepping up a staff position takes the accidental from the key',
    T.pitchName(v[0].notes[0].pitch), 'G4');
}
{
  const app = score({ instrumentIds: ['violin'], keySig: { fifths: 1, mode: 'major' } });
  const v = put(app, 0, 0, 0, [['E4', 'whole']]);
  E.transposeTargets(app, [v[0].id], { steps: 1 });
  check('...and in G major that step lands on F sharp',
    T.pitchName(v[0].notes[0].pitch), 'F#4');
}
{
  const app = score({ instrumentIds: ['violin'] });
  const v = put(app, 0, 0, 0, [['F#4', 'whole']]);
  E.transposeTargets(app, [v[0].id], { octaves: 1 });
  check('An octave shift keeps the spelling', T.pitchName(v[0].notes[0].pitch), 'F#5');
}
{
  const app = score({ instrumentIds: ['violin'] });
  const v = put(app, 0, 0, 0, [['F#4', 'whole']]);
  E.respell(app, [v[0].id]);
  check('Respelling gives the enharmonic equivalent', T.pitchName(v[0].notes[0].pitch), 'Gb4');
}

/* ------------------------------------------------- transposing instruments */

{
  const cases = [
    ['clarinet', 'C4', 'Bb3'], ['horn', 'C4', 'F3'], ['trumpet', 'C4', 'Bb3'],
    ['piccolo', 'C4', 'C5'], ['contrabass', 'C3', 'C2'], ['guitar', 'C4', 'C3'],
    ['tenor_v', 'C4', 'C3'], ['altosax', 'C4', 'Eb3'], ['glockenspiel', 'C4', 'C6'],
    ['flute', 'C4', 'C4'], ['cello', 'C3', 'C3'],
  ];
  for (const [id, written, sounding] of cases) {
    const part = M.makePart(id, 1);
    check(`${getInstrument(id).name}: written ${written} sounds ${sounding}`,
      T.pitchName(M.soundingPitch(part, P(written))), sounding);
  }
}
{
  const app = score({ instrumentIds: ['clarinet'], keySig: { fifths: 0, mode: 'major' } });
  check('A B-flat instrument in concert C reads two sharps',
    M.writtenFifths(app.score, app.score.parts[0], 0), 2);
}
{
  const app = score({ instrumentIds: ['horn'], keySig: { fifths: -1, mode: 'major' } });
  check('A horn in F reading concert F major writes C major',
    M.writtenFifths(app.score, app.score.parts[0], 0), 0);
}
{
  const oct = INSTRUMENTS.filter((i) => /8vb|8va/.test(i.clef || '') && !i.transpose.chromatic);
  check('Every instrument written at an octave declares that transposition',
    oct.map((i) => i.id), []);
}
{
  const bad = INSTRUMENTS.filter((i) => {
    const part = M.makePart(i.id, 1);
    if (!i.pitched) return false;
    const lo = T.toMidi(M.soundingPitch(part, T.fromDiatonic(Math.floor(i.range[0] / 12) * 7)));
    return !Number.isFinite(lo);
  });
  check('Every instrument has a usable written range', bad.map((i) => i.id), []);
}

/* ------------------------------------------------------------- playback */

function playbackOf(app) {
  const pl = new Player({ init() {}, play() {}, setChannel() {}, allOff() {} });
  pl.setScore(app.score);
  pl.build(0);
  return pl;
}
{
  const app = score({ instrumentIds: ['violin'], tempo: 120 });
  app.score.measures[0].tempo = { bpm: 120, unit: 'quarter' };
  const v = put(app, 0, 0, 0, [['C5', 'quarter'], ['D5', 'quarter'], ['E5', 'half']]);
  const pl = playbackOf(app);
  check('Notes sound at their notated place in time',
    pl.events.slice(0, 3).map((e) => +e.time.toFixed(2)), [0, 0.5, 1]);
}
{
  /* Notes are played slightly detached by default, so the rule is that the two
   * halves become one event twice as long, not that it lasts exactly 2s. */
  const untied = score({ instrumentIds: ['violin'], tempo: 120 });
  untied.score.measures[0].tempo = { bpm: 120, unit: 'quarter' };
  put(untied, 0, 0, 0, [['C5', 'half'], ['D5', 'half']]);
  const single = playbackOf(untied).events[0].dur;

  const app = score({ instrumentIds: ['violin'], tempo: 120 });
  app.score.measures[0].tempo = { bpm: 120, unit: 'quarter' };
  const v = put(app, 0, 0, 0, [['C5', 'half'], ['C5', 'half']]);
  E.toggleTie(app, [v[0].id]);
  const pl = playbackOf(app);
  check('A tie sounds as one note of the combined length',
    [pl.events.length, +(pl.events[0].dur / single).toFixed(2)], [1, 2]);
}
{
  const app = score({ instrumentIds: ['violin'], tempo: 120 });
  app.score.measures[0].tempo = { bpm: 120, unit: 'quarter' };
  const v = put(app, 0, 0, 0, [['C5', 'half'], ['D5', 'half']]);
  E.toggleTie(app, [v[0].id]);
  check('A tie is refused between different pitches',
    v[0].notes[0].tie, null);
}
{
  const app = score({ instrumentIds: ['violin'], tempo: 120 });
  app.score.measures[0].tempo = { bpm: 120, unit: 'quarter' };
  const v = put(app, 0, 0, 0, [['C5', 'quarter'], ['D5', 'quarter'], ['E5', 'half']]);
  E.toggleArticulation(app, [v[0].id], 'staccato');
  E.toggleArticulation(app, [v[1].id], 'tenuto');
  const pl = playbackOf(app);
  check('Staccato shortens a note and tenuto gives it full length',
    [pl.events[0].dur < 0.3, +pl.events[1].dur.toFixed(2)], [true, 0.5]);
}
{
  const app = score({ instrumentIds: ['violin'] });
  const v = put(app, 0, 0, 0, [['C5', 'quarter'], ['D5', 'quarter'], ['E5', 'half']]);
  E.setDynamic(app, [v[0].id], 'pp');
  E.setDynamic(app, [v[2].id], 'ff');
  const pl = playbackOf(app);
  check('A dynamic holds until the next one',
    [pl.events[0].velocity, pl.events[1].velocity, pl.events[2].velocity], [33, 33, 112]);
}
{
  const app = score({ instrumentIds: ['violin'] });
  put(app, 0, 0, 0, [['C5', 'whole']]);
  app.score.measures[1].barline = 'repeat-end';
  const pl = playbackOf(app);
  check('A repeat plays its span twice', pl.segments.map((s) => s.measure), [0, 1, 0, 1, 2, 3]);
}
{
  const app = score({ instrumentIds: ['clarinet'] });
  put(app, 0, 0, 0, [['C4', 'whole']]);
  const pl = playbackOf(app);
  check('A transposing part sounds at concert pitch', pl.events[0].midi, T.toMidi(P('Bb3')));
}
{
  for (const [fifths, want] of [[0, 1], [3, 2]]) {
    const app = score({ instrumentIds: ['violin'], keySig: { fifths, mode: 'major' } });
    const v = put(app, 0, 0, 0, [['E5', 'whole']]);
    E.toggleOrnament(app, [v[0].id], 'trill');
    const pl = playbackOf(app);
    const midis = [...new Set(pl.events.map((e) => e.midi))].sort((a, b) => a - b);
    check(`A trill moves to the next scale degree (${fifths} sharps)`, midis[1] - midis[0], want);
  }
}
{
  const app = score({ instrumentIds: ['violin'] });
  const v = put(app, 0, 0, 0, [['C5', 'whole']]);
  E.toggleOrnament(app, [v[0].id], 'turn');
  const pl = playbackOf(app);
  check('A turn plays upper, main, lower, main',
    pl.events.map((e) => e.midi - 72), [2, 0, -1, 0]);
}

/* ------------------------------------------------------------- engraving */

{
  const app = score({ instrumentIds: ['violin'] });
  put(app, 0, 0, 0, [['B4+C5', 'whole']]);
  const heads = layoutScore(app.score, {}).pages[0].items
    .filter((i) => i.kind === 'glyph' && (i.cls || '').startsWith('notehead'));
  check('Notes a second apart sit on opposite sides of the stem',
    heads.length === 2 && Math.abs(heads[0].x - heads[1].x) > 1, true);
}
{
  const app = score({ instrumentIds: ['violin'] });
  put(app, 0, 0, 0, [['C4+E4+G4', 'whole']]);
  const heads = layoutScore(app.score, {}).pages[0].items
    .filter((i) => i.kind === 'glyph' && (i.cls || '').startsWith('notehead'));
  check('Notes a third apart share a side',
    new Set(heads.map((h) => +h.x.toFixed(2))).size, 1);
}
{
  const app = score({ instrumentIds: ['violin'] });
  put(app, 0, 0, 0, [['C6', 'whole']]);       // two ledger lines above the treble staff
  const ledgers = layoutScore(app.score, {}).pages[0].items.filter((i) => i.cls === 'ledger');
  check('Ledger lines are drawn for notes beyond the staff', ledgers.length, 2);
}
{
  const app = score({ instrumentIds: ['violin'] });
  put(app, 0, 0, 0, [['B4', 'half', { dots: 1 }], ['R', 'quarter']]);
  const items = layoutScore(app.score, {}).pages[0].items;
  const head = items.find((i) => i.kind === 'glyph' && (i.cls || '').startsWith('notehead'));
  const dot = items.find((i) => i.kind === 'dot' && i.cls === 'dot');
  check('A dot on a line-note moves up into the space above', dot.y < head.y, true);
}
{
  const app = score({ instrumentIds: ['violin'] });
  put(app, 0, 0, 0, [['A4', 'half', { dots: 1 }], ['R', 'quarter']]);
  const items = layoutScore(app.score, {}).pages[0].items;
  const head = items.find((i) => i.kind === 'glyph' && (i.cls || '').startsWith('notehead'));
  const dot = items.find((i) => i.kind === 'dot' && i.cls === 'dot');
  check('A dot on a space-note stays in its own space', +dot.y.toFixed(2), +head.y.toFixed(2));
}
{
  const app = score({ instrumentIds: ['violin'], keySig: { fifths: 3, mode: 'major' } });
  app.score.measures[1].keySig = { fifths: 0, mode: 'major' };
  const keyItems = layoutScore(app.score, {}).pages[0].items
    .filter((i) => i.kind === 'glyph' && i.cls === 'keysig');
  check('Cancelling a key signature writes naturals',
    keyItems.filter((i) => i.name === 'accidentalNatural').length, 3);
}
{
  const app = score({ instrumentIds: ['violin'] });
  put(app, 0, 0, 0, [['C4', 'eighth'], ['C6', 'eighth'], ['C4', 'eighth'], ['C6', 'eighth'],
    ['C4', 'eighth'], ['C6', 'eighth'], ['C4', 'eighth'], ['C6', 'eighth']]);
  const beams = layoutScore(app.score, {}).pages[0].items.filter((i) => i.kind === 'beam');
  const slopes = beams.map((b) => {
    const m = /M([-\d.]+),([-\d.]+)L([-\d.]+),([-\d.]+)/.exec(b.d);
    return Math.abs((+m[4] - +m[2]) / Math.max(0.01, +m[3] - +m[1]));
  });
  check('A beam never becomes a ramp, however wild the leaps',
    slopes.every((x) => x <= 0.35), true);
}
{
  const app = score({ instrumentIds: ['violin'], measures: 12 });
  app.score.measures[6].timeSig = { beats: 3, beatType: 4 };
  M.normalizeScore(app.score);
  const sys = layoutScore(app.score, { multiBarRests: true }).pages[0].systems[0];
  const runs = sys.measures.filter((mm) => mm.multirest).map((mm) => [mm.index, mm.last]);
  check('A multi-bar rest stops where the meter changes', runs, [[0, 5], [6, 11]]);
}
{
  const app = score({ instrumentIds: ['piano'] });
  const v = put(app, 0, 0, 1, [['C3', 'eighth'], ['E3', 'eighth'], ['C5', 'eighth'], ['E5', 'eighth'],
    ['G3', 'eighth'], ['C4', 'eighth'], ['E4', 'eighth'], ['G4', 'eighth']]);
  const before = T.toMidi(v[2].notes[0].pitch);
  E.setEventStaff(app, [v[2].id, v[3].id], 0);
  check('Writing a note on the other staff does not change its pitch',
    T.toMidi(v[2].notes[0].pitch), before);
}
{
  const app = score({ instrumentIds: ['cello'] });
  E.setClef(app, 0, 1, 0, 'tenor');
  check('A clef change applies from its bar onward',
    [M.clefAt(app.score, app.score.parts[0], 0, 0), M.clefAt(app.score, app.score.parts[0], 2, 0)],
    ['bass', 'tenor']);
}

/* ---------------------------------------------------------------- report */

const total = pass + failures.length;
if (failures.length) {
  console.log(`\n${failures.length} of ${total} musical rules FAILED:\n`);
  for (const f of failures) console.log('  ✗ ' + f + '\n');
  process.exit(1);
}
console.log(`All ${total} musical rules hold.`);

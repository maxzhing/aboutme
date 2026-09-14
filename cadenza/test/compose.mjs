/* Cadenza — is what the composer writes actually music?
 *
 * A generator that never crashes and produces notes is not the same thing as a
 * generator that writes music.  These are the things a musician would check on
 * being handed the page: that every note belongs to the key it claims, that
 * the bars add up, that phrases close where phrases close, that the tune moves
 * like a tune rather than wandering, and that the chorale style obeys the one
 * rule chorales exist to teach.
 */

import { composePiece, CHARACTERS, fifthsFor } from '../js/compose/index.js';
import { keyPitches, chordOn, plan as harmonicPlan, rng } from '../js/compose/harmony.js';
import { voiceChord } from '../js/compose/texture.js';
import { timeSigAt } from '../js/core/model.js';
import { measureTicks, eventTicks } from '../js/core/rhythm.js';
import * as T from '../js/core/theory.js';

let pass = 0;
const failures = [];
function report(name, ok, detail) {
  if (ok) { pass++; console.log('  ok   ' + name); }
  else { failures.push(name + ' — ' + detail); console.log('  FAIL ' + name + ' — ' + detail); }
}
function check(name, fn) {
  let ok = false;
  let detail = '';
  try {
    const r = fn();
    ok = r === true;
    if (!ok) detail = String(r);
  } catch (err) { detail = err.message; }
  report(name, ok, detail);
}

const pcOf = (m) => ((m % 12) + 12) % 12;

/** Every sounding note in a score, with where it sits. */
function allNotes(score) {
  const out = [];
  score.parts.forEach((part, pi) => {
    part.measures.forEach((pm, mi) => {
      (pm.voices || []).forEach((voice, vi) => {
        let at = 0;
        for (const ev of voice) {
          if (ev.type === 'note') {
            for (const n of ev.notes) out.push({ midi: T.toMidi(n.pitch), part: pi, bar: mi, voice: vi, at });
          }
          at += eventTicks(ev);
        }
      });
    });
  });
  return out;
}

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

/* ------------------------------------------------------------- the basics */

console.log('\nThe page itself — a score that can be read, played and edited.');

check('every character writes a score that parses', () => {
  for (const c of CHARACTERS) {
    const p = composePiece({ character: c.id, tonic: 0, bars: 16, seed: 11 });
    if (!p.score || !p.score.parts.length) return c.id + ' produced nothing';
    if (!p.score.parts[0].measures.length) return c.id + ' produced no bars';
  }
  return true;
});

check('every bar of every voice adds up exactly', () => {
  for (const c of CHARACTERS) {
    for (const tonic of [0, 3, 7, 10]) {
      const p = composePiece({ character: c.id, tonic, bars: 16, seed: 5 });
      const bad = barsAddUp(p.score);
      if (bad.length) return `${c.id} in ${tonic}: ${bad.slice(0, 2).join('; ')}`;
    }
  }
  return true;
});

check('the piece is as long as it was asked to be', () => {
  for (const bars of [8, 16, 24, 32]) {
    const p = composePiece({ character: 'classical', tonic: 0, bars, seed: 2 });
    if (p.score.parts[0].measures.length !== bars) {
      return `asked for ${bars}, got ${p.score.parts[0].measures.length}`;
    }
  }
  return true;
});

check('the same seed writes the same piece twice', () => {
  const a = composePiece({ character: 'romantic', tonic: 5, bars: 16, seed: 99 });
  const b = composePiece({ character: 'romantic', tonic: 5, bars: 16, seed: 99 });
  const ma = allNotes(a.score).map((n) => n.midi).join(',');
  const mb = allNotes(b.score).map((n) => n.midi).join(',');
  return ma === mb ? true : 'two runs of one seed differ';
});

check('different seeds write different pieces', () => {
  const a = composePiece({ character: 'classical', tonic: 0, bars: 16, seed: 1 });
  const b = composePiece({ character: 'classical', tonic: 0, bars: 16, seed: 2 });
  const ma = allNotes(a.score).map((n) => n.midi).join(',');
  const mb = allNotes(b.score).map((n) => n.midi).join(',');
  return ma !== mb ? true : 'two seeds produced the same piece';
});

/* ------------------------------------------------------------------- key */

console.log('\nThe key — everything in it, or out of it for a reason.');

check('every note belongs to the key', () => {
  for (const c of CHARACTERS) {
    for (const tonic of [0, 2, 5, 8, 11]) {
      const p = composePiece({ character: c.id, tonic, bars: 16, seed: 21 });
      const mode = p.description.key.includes('minor') ? 'minor'
        : p.description.key.includes('Dorian') ? 'dorian'
          : p.description.key.includes('Mixolydian') ? 'mixolydian' : 'major';
      const inKey = keyPitches(tonic, mode);
      /* The minor raises its seventh to make a leading note: that is the one
       * note outside the scale that belongs in the key. */
      const leading = (mode === 'minor' || mode === 'dorian') ? [(tonic + 11) % 12] : [];
      const allowed = inKey.concat(leading);
      const stray = allNotes(p.score).filter((n) => !allowed.includes(pcOf(n.midi)));
      if (stray.length) {
        return `${c.id} in ${tonic}: ${stray.length} notes outside ${p.description.key}`;
      }
    }
  }
  return true;
});

check('the key signature matches the key', () => {
  const cases = [[0, 'major', 0], [7, 'major', 1], [5, 'major', -1], [9, 'minor', 0],
    [4, 'minor', 1], [2, 'minor', -1], [2, 'dorian', 0], [7, 'mixolydian', 0]];
  for (const [tonic, mode, want] of cases) {
    const got = fifthsFor(tonic, mode);
    if (got !== want) return `${tonic} ${mode}: wanted ${want} sharps, got ${got}`;
  }
  return true;
});

/* --------------------------------------------------------------- phrases */

console.log('\nPhrases — a question, then an answer.');

check('phrases close where phrases close', () => {
  const r = rng(4);
  const phrases = harmonicPlan(4, 4, 'major', r, {});
  const closes = phrases.map((p) => p.close);
  if (closes[closes.length - 1] !== 'authentic') return 'the piece does not end with a full close';
  const last = phrases[phrases.length - 1].chords;
  if (last[last.length - 1].degree !== 0) return 'the last chord is not the tonic';
  if (last[last.length - 2].degree !== 4) return 'the last cadence is not approached by the dominant';
  const first = phrases[0].chords;
  if (first[first.length - 1].degree !== 4) return 'the opening phrase does not end on the dominant';
  return true;
});

check('no chord is simply repeated across a bar line', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const r = rng(seed);
    for (const ph of harmonicPlan(4, 4, 'major', r, {})) {
      for (let i = 1; i < ph.chords.length; i++) {
        if (ph.chords[i].degree === ph.chords[i - 1].degree) {
          return `seed ${seed}: ${ph.chords.map((c) => c.roman).join(' – ')}`;
        }
      }
    }
  }
  return true;
});

check('the minor has a leading note at its cadence', () => {
  const r = rng(8);
  const phrases = harmonicPlan(2, 4, 'minor', r, {});
  const last = phrases[phrases.length - 1].chords;
  const dominant = last[last.length - 2];
  return dominant.quality === 'major' ? true
    : `the dominant of the minor came out ${dominant.quality}`;
});

/* ------------------------------------------------------------- the tune */

console.log('\nThe tune — a line rather than a wander.');

const melodyOf = (p) => allNotes(p.score)
  .filter((n) => n.part === p.melodyPart && n.voice === 0
    && (p.melodyPart !== p.accompanimentPart || n.midi >= 60))
  .map((n) => n.midi);

check('the melody moves mostly by step', () => {
  const p = composePiece({ character: 'classical', tonic: 0, bars: 32, seed: 31 });
  const line = melodyOf(p);
  let steps = 0;
  let moves = 0;
  for (let i = 1; i < line.length; i++) {
    const d = Math.abs(line[i] - line[i - 1]);
    if (d === 0) continue;
    moves++;
    if (d <= 2) steps++;
  }
  const share = moves ? steps / moves : 0;
  return share >= 0.55 ? true : `only ${Math.round(share * 100)}% of moves are steps`;
});

check('a leap is answered rather than continued', () => {
  const p = composePiece({ character: 'classical', tonic: 0, bars: 32, seed: 17 });
  const line = melodyOf(p);
  let leaps = 0;
  let answered = 0;
  for (let i = 2; i < line.length; i++) {
    const before = line[i - 1] - line[i - 2];
    const now = line[i] - line[i - 1];
    if (Math.abs(before) <= 4) continue;
    leaps++;
    if (Math.sign(now) !== Math.sign(before) || now === 0) answered++;
  }
  if (leaps < 3) return true;
  const share = answered / leaps;
  return share >= 0.6 ? true : `only ${Math.round(share * 100)}% of leaps turn back`;
});

check('the melody stays inside its instrument', () => {
  const p = composePiece({ character: 'folk', tonic: 2, bars: 16, seed: 6, ensemble: 'duo', melodyInstrument: 'flute' });
  const line = melodyOf(p);
  const low = Math.min(...line);
  const high = Math.max(...line);
  return low >= 59 && high <= 96 ? true : `flute part spans ${low} to ${high}`;
});

check('the tune ends on the tonic', () => {
  for (const tonic of [0, 4, 9]) {
    const p = composePiece({ character: 'classical', tonic, bars: 16, seed: 13 });
    const line = melodyOf(p);
    if (pcOf(line[line.length - 1]) !== tonic) {
      return `in ${tonic} the tune ended on ${pcOf(line[line.length - 1])}`;
    }
  }
  return true;
});

check('the melody does not sit on one note', () => {
  const p = composePiece({ character: 'classical', tonic: 0, bars: 32, seed: 23 });
  const line = melodyOf(p);
  let run = 1;
  let worst = 1;
  for (let i = 1; i < line.length; i++) {
    run = line[i] === line[i - 1] ? run + 1 : 1;
    worst = Math.max(worst, run);
  }
  return worst <= 3 ? true : `the same note ${worst} times in a row`;
});

check('the tune has one high point, not several', () => {
  const p = composePiece({ character: 'romantic', tonic: 0, bars: 32, seed: 29 });
  const line = melodyOf(p);
  const top = Math.max(...line);
  const times = line.filter((m) => m === top).length;
  return times <= 3 ? true : `the highest note is reached ${times} times`;
});


check('the tune states an idea and comes back to it', () => {
  /* The rhythm of the opening phrase should be recognisable later: a tune with
     no memory is the commonest way generated music gives itself away. */
  const p = composePiece({ character: 'classical', tonic: 0, bars: 32, seed: 77 });
  const notes = allNotes(p.score).filter((n) => n.part === p.melodyPart && n.voice === 0);
  const perBar = new Map();
  for (const n of notes) perBar.set(n.bar, (perBar.get(n.bar) || 0) + 1);
  const shape = (from) => [0, 1, 2, 3].map((i) => perBar.get(from + i) || 0).join('-');
  const first = shape(0);
  const later = [shape(4), shape(8), shape(12), shape(16), shape(20), shape(24), shape(28)];
  const echoes = later.filter((x) => x === first).length;
  return echoes >= 2 ? true : `the opening rhythm (${first}) recurs ${echoes} times in ${later.length} phrases`;
});

check('asking for complex writes more than asking for simple', () => {
  let simpler = 0;
  let richer = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const a = composePiece({ character: 'classical', tonic: 0, bars: 16, seed, complexity: 'simple' });
    const b = composePiece({ character: 'classical', tonic: 0, bars: 16, seed, complexity: 'complex' });
    simpler += allNotes(a.score).filter((n) => n.part === a.melodyPart && n.voice === 0).length;
    richer += allNotes(b.score).filter((n) => n.part === b.melodyPart && n.voice === 0).length;
  }
  return richer > simpler * 1.1 ? true
    : `simple wrote ${simpler} notes, complex wrote ${richer}`;
});

check('the high point falls late, where a climax belongs', () => {
  for (const seed of [3, 9, 27, 51]) {
    const p = composePiece({ character: 'romantic', tonic: 0, bars: 32, seed });
    const notes = allNotes(p.score).filter((n) => n.part === p.melodyPart && n.voice === 0);
    const top = Math.max(...notes.map((n) => n.midi));
    const where = notes.find((n) => n.midi === top).bar / 32;
    if (where < 0.35) return `seed ${seed}: the tune peaks ${Math.round(where * 100)}% of the way in`;
  }
  return true;
});

/* ----------------------------------------------------------- the writing */

console.log('\nThe writing — what a harmony teacher would mark.');

check('the chorale avoids parallel fifths and octaves in the outer parts', () => {
  const r = rng(12);
  let previous = null;
  let parallels = 0;
  for (let i = 0; i < 40; i++) {
    const chord = chordOn(Math.floor(r() * 7), 'major');
    const pitches = chord.tones.map((t) => t % 12);
    const voicing = voiceChord(pitches, { range: [48, 76], previous, size: 4, strict: true });
    if (previous && previous.length > 1 && voicing.length > 1) {
      const a0 = previous[0];
      const a1 = previous[previous.length - 1];
      const b0 = voicing[0];
      const b1 = voicing[voicing.length - 1];
      const before = ((a1 - a0) % 12 + 12) % 12;
      const after = ((b1 - b0) % 12 + 12) % 12;
      if (before === after && (after === 0 || after === 7)
        && b1 !== a1 && Math.sign(b1 - a1) === Math.sign(b0 - a0)) parallels++;
    }
    previous = voicing;
  }
  return parallels === 0 ? true : `${parallels} parallel fifths or octaves in 40 chords`;
});

check('the accompaniment keeps its hand still', () => {
  const p = composePiece({ character: 'classical', tonic: 0, bars: 24, seed: 44 });
  const bass = allNotes(p.score).filter((n) => n.midi < 60);
  const perBar = new Map();
  for (const n of bass) perBar.set(n.bar, Math.min(perBar.get(n.bar) ?? 127, n.midi));
  const bars = [...perBar.keys()].sort((a, b) => a - b);
  let worst = 0;
  for (let i = 1; i < bars.length; i++) {
    worst = Math.max(worst, Math.abs(perBar.get(bars[i]) - perBar.get(bars[i - 1])));
  }
  return worst <= 12 ? true : `the bass leaps ${worst} semitones between bars`;
});

check('a duo gives the tune and the accompaniment to different players', () => {
  const p = composePiece({ character: 'romantic', tonic: 0, bars: 16, seed: 3, ensemble: 'duo', melodyInstrument: 'violin' });
  if (p.score.parts.length !== 2) return `expected two parts, got ${p.score.parts.length}`;
  const tune = allNotes(p.score).filter((n) => n.part === p.melodyPart);
  const under = allNotes(p.score).filter((n) => n.part === p.accompanimentPart);
  if (!tune.length || !under.length) return 'one of the players has nothing to play';
  const tuneLow = Math.min(...tune.map((n) => n.midi));
  const underHigh = Math.max(...under.map((n) => n.midi));
  return tuneLow > underHigh - 12 ? true : 'the accompaniment sits above the tune';
});

check('nothing it writes is unplayably fast', () => {
  for (const c of CHARACTERS) {
    const p = composePiece({ character: c.id, tonic: 0, bars: 16, seed: 15 });
    for (const part of p.score.parts) {
      for (const m of part.measures) {
        for (const v of m.voices || []) {
          for (const ev of v) {
            if (['64th', '128th'].includes(ev.duration)) return `${c.id} wrote a ${ev.duration}`;
          }
        }
      }
    }
  }
  return true;
});

/* ---------------------------------------------------------------- report */

const total = pass + failures.length;
console.log('');
if (failures.length) {
  console.log(failures.length + ' of ' + total + ' composition checks FAILED:\n');
  for (const f of failures) console.log('  ✗ ' + f);
  console.log('');
  process.exit(1);
}
console.log('All ' + total + ' composition checks pass.');

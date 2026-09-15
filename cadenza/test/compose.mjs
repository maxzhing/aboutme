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
import { exportMusicXML } from '../js/io/musicxml.js';
import { exportMIDI } from '../js/io/midifile.js';
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

check('every note belongs to the key, or to the chord under it', () => {
  /* Chromatic harmony is the point of some of these characters, so "in the
     key" is the wrong test for them: a secondary dominant or an augmented
     sixth is *supposed* to contain notes the scale does not.  What must never
     happen is a note belonging to neither the key nor the chord sounding
     beneath it, which is not colour but a mistake. */
  for (const c of CHARACTERS) {
    for (const tonic of [0, 2, 5, 8, 11]) {
      const p = composePiece({ character: c.id, tonic, bars: 16, seed: 21 });
      const mode = p.description.key.includes('minor') ? 'minor'
        : p.description.key.includes('Dorian') ? 'dorian'
          : p.description.key.includes('Mixolydian') ? 'mixolydian' : 'major';
      const inKey = keyPitches(tonic, mode);
      const leading = (mode === 'minor' || mode === 'dorian') ? [(tonic + 11) % 12] : [];
      const allowed = inKey.concat(leading);
      const stray = allNotes(p.score).filter((n) => {
        if (allowed.includes(pcOf(n.midi))) return false;
        const chord = p.harmony[Math.min(p.harmony.length - 1, n.bar)];
        if (chord && chord.pitches.includes(pcOf(n.midi))) return false;
        /* A chromatic note leaning by a semitone onto a note of the chord. */
        return !(chord && chord.pitches.some((pc) =>
          Math.abs(((pcOf(n.midi) - pc) % 12 + 18) % 12 - 6) === 5));
      });
      if (stray.length) {
        return `${c.id} in ${tonic}: ${stray.length} notes belonging to neither `
          + `${p.description.key} nor the chord beneath them`;
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


/* ------------------------------------------------------- chromatic colour */

console.log('\nColour — harmony beyond the seven notes of the key.');

check('the ballade writes chromatic harmony, not just triads', () => {
  const found = new Set();
  for (let seed = 1; seed <= 12; seed++) {
    const p = composePiece({ character: 'ballade', tonic: 9, bars: 16, seed });
    for (const line of p.description.progression) {
      if (/V7\//.test(line)) found.add('secondary dominant');
      if (/♭II/.test(line)) found.add('Neapolitan');
      if (/\+6/.test(line)) found.add('augmented sixth');
      if (/♭VI|♭VII|♭III/.test(line)) found.add('borrowed chord');
      if (/9|6(?!\/)/.test(line)) found.add('extended chord');
    }
  }
  return found.size >= 3 ? true
    : `only found: ${[...found].join(', ') || 'nothing chromatic at all'}`;
});

check('a plain character stays diatomic when it should', () => {
  for (let seed = 1; seed <= 8; seed++) {
    const p = composePiece({ character: 'hymn', tonic: 0, bars: 16, seed });
    for (const line of p.description.progression) {
      if (/V7\/|♭|\+6/.test(line)) return `the chorale wrote ${line}`;
    }
  }
  return true;
});

check('every phrase still begins in its own key', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const p = composePiece({ character: 'ballade', tonic: 0, bars: 16, seed });
    const first = p.description.progression[0].split(' – ')[0];
    if (/V7\/|\+6/.test(first)) return `a phrase opened on ${first}`;
  }
  return true;
});

/* ------------------------------------------------------------ decoration */

console.log('\nDecoration and shape.');

check('an ornamented character writes more notes than a plain one', () => {
  let plain = 0;
  let decorated = 0;
  for (let seed = 1; seed <= 5; seed++) {
    const a = composePiece({ character: 'hymn', tonic: 0, bars: 16, seed });
    const b = composePiece({ character: 'ballade', tonic: 0, bars: 16, seed });
    plain += allNotes(a.score).filter((n) => n.part === a.melodyPart && n.voice === 0).length;
    decorated += allNotes(b.score).filter((n) => n.part === b.melodyPart && n.voice === 0).length;
  }
  return decorated > plain * 1.3 ? true
    : `plain wrote ${plain} melody notes, ornamented wrote ${decorated}`;
});

const DYN = ['pppp', 'ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'ffff'];

/** Every dynamic mark in a score, with the bar it sits over. */
function dynamics(score) {
  const marks = [];
  score.parts.forEach((part) => part.measures.forEach((m, mi) =>
    (m.voices || []).forEach((v) => v.forEach((e) => {
      if (e.dynamic) marks.push({ bar: mi, id: e.dynamic });
    }))));
  return marks;
}

const loudestOf = (marks) =>
  marks.reduce((a, b) => (DYN.indexOf(b.id) > DYN.indexOf(a.id) ? b : a));

check('the dynamic arc peaks where the tune does', () => {
  /* A piece in one character throughout has one climax, and the loudness has
   * to arrive with it.  (A sectional piece has one per section; that is the
   * check below.) */
  for (const bars of [16, 24, 32]) {
    const p = composePiece({ character: 'ballade', form: null, tonic: 9, bars, seed: 5 });
    const marks = dynamics(p.score);
    if (!marks.length) return `${bars} bars: no dynamics were written at all`;
    const loudest = loudestOf(marks);
    const phrases = Math.round(bars / 4);
    const climaxBar = (phrases > 2 ? phrases - 2 : phrases - 1) * 4;
    if (Math.abs(loudest.bar - climaxBar) > 4) {
      return `${bars} bars: loudest at bar ${loudest.bar + 1}, tune climaxes at bar ${climaxBar + 1}`;
    }
  }
  return true;
});

/* ----------------------------------------------------------------- form */

console.log('\nForm — a piece that goes somewhere and comes back changed.');

check('a ballade long enough to be one is written in sections', () => {
  for (const seed of [1, 4, 9]) {
    const p = composePiece({ character: 'ballade', tonic: 5, mode: 'major', bars: 64, seed });
    const secs = p.description.sections;
    if (!secs || secs.length !== 4) return `seed ${seed}: got ${secs ? secs.length : 0} sections`;
    if (secs.reduce((a, b) => a + b.bars, 0) !== p.description.bars) {
      return `seed ${seed}: sections add up to ${secs.reduce((a, b) => a + b.bars, 0)}`;
    }
    /* Not all the same length, which is the failure mode whole-phrase
     * rounding falls into and the thing that makes a form stop being one. */
    if (new Set(secs.map((x) => x.bars)).size < 2) {
      return `seed ${seed}: every section came out ${secs[0].bars} bars`;
    }
  }
  return true;
});

check('a short piece stays in one section', () => {
  for (const bars of [8, 16, 24]) {
    const p = composePiece({ character: 'ballade', tonic: 5, bars, seed: 3 });
    if (p.description.sections) return `${bars} bars was split into sections`;
  }
  return true;
});

check('the storm section is faster, louder and in another key', () => {
  const p = composePiece({ character: 'ballade', tonic: 5, mode: 'major', bars: 64, seed: 7 });
  const [opening, storm] = p.description.sections;
  if (storm.tempo <= opening.tempo * 1.5) {
    return `the storm is ${storm.tempo} bpm against ${opening.tempo}`;
  }
  if (storm.key === opening.key) return `both sections are in ${storm.key}`;
  if (!/minor/.test(storm.key)) return `the storm came out in ${storm.key}`;
  return true;
});

check('a ballade ends in the key it was driven into, not the one it began in', () => {
  const p = composePiece({ character: 'ballade', tonic: 5, mode: 'major', bars: 64, seed: 7 });
  if (p.description.endsIn === p.description.key) {
    return `it began and ended in ${p.description.key}`;
  }
  /* F major against A minor — a third apart, which is the relationship the
   * form is built on. */
  return p.description.endsIn === 'A minor' ? true
    : `F major went to ${p.description.endsIn}`;
});

check('each section is marked with its tempo where it begins', () => {
  const p = composePiece({ character: 'ballade', tonic: 5, mode: 'major', bars: 64, seed: 7 });
  for (const sec of p.description.sections) {
    const spec = p.score.measures[sec.from - 1];
    if (!spec || !spec.tempo) return `no tempo mark at bar ${sec.from}`;
    if (spec.tempo.text !== sec.name) return `bar ${sec.from} says "${spec.tempo.text}"`;
    if (spec.tempo.bpm !== sec.tempo) return `bar ${sec.from}: ${spec.tempo.bpm} not ${sec.tempo}`;
  }
  return true;
});

check('a section in another key is spelled in that key', () => {
  /* F major writes B flats; A minor writes B naturals and G sharps.  If the
   * engraver were still spelling from the opening key signature the storm
   * would be full of enharmonic nonsense. */
  const p = composePiece({ character: 'ballade', tonic: 5, mode: 'major', bars: 64, seed: 7 });
  const storm = p.description.sections[1];
  const spec = p.score.measures[storm.from - 1];
  if (!spec || !spec.keySig) return `no key change at bar ${storm.from}`;
  if (spec.keySig.fifths !== 0) return `the storm was given ${spec.keySig.fifths} sharps/flats`;
  const inStorm = allNotes(p.score)
    .filter((n) => n.bar >= storm.from - 1 && n.bar < storm.from - 1 + storm.bars);
  const flats = inStorm.filter((n) => pcOf(n.midi) === 10).length;   // B flat
  const naturals = inStorm.filter((n) => pcOf(n.midi) === 11).length; // B natural
  return naturals > flats ? true
    : `the storm wrote ${flats} B flats against ${naturals} B naturals`;
});

check('a form keeps the character it was given', () => {
  /* Shape and character are different questions.  Asking for a Classical
   * piece in ballade form must give a piece that is still Classical between
   * the interruptions, not a ballade with the word "Classical" on it. */
  const plain = composePiece({ character: 'classical', tonic: 5, bars: 16, seed: 3 });
  const shaped = composePiece({ character: 'classical', tonic: 5, bars: 64, seed: 3, form: 'ballade' });
  const home = shaped.description.sections[0];
  if (home.texture !== plain.description.texture) {
    return `the opening section is "${home.texture}", not the character's "${plain.description.texture}"`;
  }
  const storm = shaped.description.sections[1];
  if (storm.texture === home.texture) return `the storm is in the same texture, ${storm.texture}`;
  return true;
});

check('the sections survive being exported', () => {
  /* A key or tempo change that only exists inside Cadenza is not a change —
   * it has to come out the other end of both exporters, or the piece opens in
   * someone else's program at one speed in one key. */
  const p = composePiece({ character: 'ballade', tonic: 5, mode: 'major', bars: 64, seed: 7 });
  const want = p.description.sections.length;

  const xml = exportMusicXML(p.score);
  const keys = (xml.match(/<key>/g) || []).length;
  const tempos = (xml.match(/<sound tempo=/g) || []).length;
  if (tempos !== want) return `MusicXML carried ${tempos} of ${want} tempo changes`;
  if (keys !== want) return `MusicXML carried ${keys} of ${want} key signatures`;
  for (const sec of p.description.sections) {
    if (!xml.includes(`>${sec.name}<`)) return `MusicXML lost the mark "${sec.name}"`;
  }

  const midi = new Uint8Array(exportMIDI(p.score));
  let midiTempos = 0;
  let midiKeys = 0;
  for (let i = 0; i < midi.length - 2; i++) {
    if (midi[i] === 0xff && midi[i + 1] === 0x51 && midi[i + 2] === 0x03) midiTempos++;
    if (midi[i] === 0xff && midi[i + 1] === 0x59) midiKeys++;
  }
  if (midiTempos !== want) return `MIDI carried ${midiTempos} of ${want} tempo changes`;
  if (midiKeys !== want) return `MIDI carried ${midiKeys} of ${want} key signatures`;
  return true;
});

check('every section arrives at its own loudest point', () => {
  const p = composePiece({ character: 'ballade', tonic: 5, mode: 'major', bars: 64, seed: 7 });
  const marks = dynamics(p.score);
  for (const sec of p.description.sections) {
    const mine = marks.filter((m) => m.bar >= sec.from - 1 && m.bar < sec.from - 1 + sec.bars);
    if (!mine.length) return `${sec.name} was given no dynamics at all`;
  }
  /* And the piece as a whole is loudest inside one of the fast sections,
   * because that is where a ballade breaks. */
  const loudest = loudestOf(marks);
  const at = p.description.sections.find((sec) =>
    loudest.bar >= sec.from - 1 && loudest.bar < sec.from - 1 + sec.bars);
  if (!at) return `the loudest mark at bar ${loudest.bar + 1} is in no section`;
  return at.tempo > p.description.tempo ? true
    : `the piece is loudest in ${at.name}, which is not one of the fast sections`;
});

check('a dynamic mark opens the piece', () => {
  for (const id of ['ballade', 'impression']) {
    const p = composePiece({ character: id, tonic: 0, bars: 16, seed: 2 });
    const first = p.score.parts[0].measures[0];
    const has = (first.voices || []).some((v) => v.some((e) => e.dynamic));
    if (!has) return `${id} began with no dynamic`;
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

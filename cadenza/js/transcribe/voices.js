/* Cadenza — sorting notes into hands, voices and chords.
 *
 * A pianist's two hands produce one stream of notes, and writing that stream
 * out as a single line is the difference between a transcription and a mess.
 * Two separate questions have to be answered: which hand played each note, and
 * which line each note belongs to.
 *
 * The hand split is found for the whole take at once rather than note by note.
 * A choice that looks right for one chord — put the low note in the left hand —
 * can be wrong for the passage, because hands do not leap back and forth; they
 * stay where they are and move when the music moves.
 *
 * Voices are harder, and dividing by pitch does not do it.  An inner voice can
 * rise above the bass and fall below the melody within a bar, and a rule that
 * says "the lowest note is voice two" loses the line the moment it crosses.
 * What works is to find the stretches during which the same notes are sounding
 * throughout — inside one of those nothing starts or stops, so the lines are
 * in a fixed order and cannot have crossed — and then to join those stretches
 * end to end by following each line across the joins.  That is the contig
 * method of Chew and Wu, and it follows a part through a texture the way a
 * reader does.
 */

import { groupEvents } from './events.js';

const MAX_SPAN = 14;       // semitones a hand can comfortably cover
const MAX_FINGERS = 5;

/** Every moment at which the set of sounding notes changes. */
function slices(notes) {
  const times = [...new Set(notes.map((n) => n.startTicks))].sort((a, b) => a - b);
  return times.map((t) => ({
    tick: t,
    active: notes.filter((n) => n.startTicks <= t && n.endTicks > t),
  })).filter((s) => s.active.length);
}

function spanOf(list) {
  if (list.length < 2) return 0;
  let lo = Infinity;
  let hi = -Infinity;
  for (const n of list) { lo = Math.min(lo, n.midi); hi = Math.max(hi, n.midi); }
  return hi - lo;
}

/** What it costs to divide this moment's notes at this pitch. */
function sliceCost(active, split, centre) {
  const left = [];
  const right = [];
  for (const n of active) (n.midi < split ? left : right).push(n);
  let cost = 0;
  cost += Math.max(0, spanOf(left) - MAX_SPAN) * 2.5;
  cost += Math.max(0, spanOf(right) - MAX_SPAN) * 2.5;
  cost += Math.max(0, left.length - MAX_FINGERS) * 4;
  cost += Math.max(0, right.length - MAX_FINGERS) * 4;
  /* Middle C is where the hands usually meet; drifting far from it wants a
   * reason, which the costs above supply when there is one. */
  cost += Math.abs(split - centre) * 0.03;
  return cost;
}

/**
 * Decide which hand played each note.
 *
 * A Viterbi pass over the possible dividing pitches: the cheapest path is the
 * one that keeps both hands within reach throughout while moving the division
 * as little as it can.  Notes at or above the division are the right hand.
 */
export function separateHands(notes, opts = {}) {
  const { move = 0.1, forceSingleStaff = false, centre = 60 } = opts;
  if (!notes.length) return { splits: [], staves: 1 };
  if (forceSingleStaff) {
    for (const n of notes) n.staff = 0;
    return { splits: [], staves: 1 };
  }

  const points = slices(notes);
  const lo = Math.min(...notes.map((n) => n.midi));
  const hi = Math.max(...notes.map((n) => n.midi)) + 1;
  const candidates = [];
  for (let s = lo; s <= hi; s++) candidates.push(s);
  if (candidates.length < 2) {
    for (const n of notes) n.staff = notes[0].midi >= centre ? 0 : 1;
    return { splits: [], staves: 1 };
  }

  const n = candidates.length;
  let prev = candidates.map((s) => sliceCost(points[0].active, s, centre));
  const back = [];
  for (let t = 1; t < points.length; t++) {
    const cur = new Float64Array(n);
    const from = new Int32Array(n);
    for (let j = 0; j < n; j++) {
      let best = Infinity;
      let arg = j;
      for (let i = 0; i < n; i++) {
        const c = prev[i] + Math.abs(candidates[i] - candidates[j]) * move;
        if (c < best) { best = c; arg = i; }
      }
      cur[j] = best + sliceCost(points[t].active, candidates[j], centre);
      from[j] = arg;
    }
    back.push(from);
    prev = cur;
  }

  let j = 0;
  for (let k = 1; k < n; k++) if (prev[k] < prev[j]) j = k;
  const path = new Array(points.length);
  path[points.length - 1] = candidates[j];
  for (let t = points.length - 1; t > 0; t--) {
    j = back[t - 1][j];
    path[t - 1] = candidates[j];
  }

  const splits = points.map((p, i) => ({ tick: p.tick, split: path[i] }));
  for (const note of notes) {
    let split = splits[0].split;
    for (const s of splits) { if (s.tick <= note.startTicks) split = s.split; else break; }
    note.staff = note.midi >= split ? 0 : 1;
  }

  keepLinesTogether(notes, splits);

  /* One hand with nothing in it means the music sits on a single staff. */
  const used = new Set(notes.map((x) => x.staff));
  if (used.size === 1) for (const note of notes) note.staff = 0;
  return { splits, staves: used.size };
}

/**
 * Stop a line changing hands in the middle of itself.
 *
 * The division is chosen a moment at a time, so a melody that dips below it
 * for one note gets handed across and comes straight back — which is how a
 * right-hand tune ends up with one note stranded in the bass staff.  A note
 * goes back where its neighbours are when most of them are in the other hand
 * and the division was close enough for it to have been a judgement call.
 */
function keepLinesTogether(notes, splits) {
  const byTime = [...notes].sort((a, b) => a.startTicks - b.startTicks || a.midi - b.midi);
  const splitAt = (tick) => {
    let s = splits[0].split;
    for (const x of splits) { if (x.tick <= tick) s = x.split; else break; }
    return s;
  };
  for (const n of byTime) {
    const near = byTime.filter((o) => o !== n
      && Math.abs(o.startTicks - n.startTicks) <= 960
      && Math.abs(o.midi - n.midi) <= 7);
    if (near.length < 2) continue;
    const elsewhere = near.filter((o) => o.staff !== n.staff);
    if (elsewhere.length <= near.length / 2) continue;
    if (Math.abs(n.midi - splitAt(n.startTicks)) > 4) continue;
    n.staff = elsewhere[0].staff;
  }
}

/* ------------------------------------------------------------------ voices */

/** Notes that begin and end together are one chord and share a voice. */
function chordsOf(notes) {
  const map = new Map();
  for (const n of notes) {
    const key = n.startTicks + ':' + n.endTicks;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(n);
  }
  return [...map.values()].map((list) => ({
    start: list[0].startTicks,
    end: list[0].endTicks,
    notes: list,
    mean: list.reduce((a, x) => a + x.midi, 0) / list.length,
  })).sort((a, b) => a.start - b.start || b.mean - a.mean);
}

/**
 * Stretches during which the same chords sound throughout.
 *
 * Inside one of these nothing starts and nothing stops, so the lines run in a
 * fixed order from the bottom up and cannot have crossed.  That is what makes
 * the ordering inside a stretch trustworthy, and it leaves the crossings to be
 * worked out only at the joins.
 */
function contigs(chords) {
  const edges = new Set();
  for (const c of chords) { edges.add(c.start); edges.add(c.end); }
  const points = [...edges].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    const active = chords.filter((c) => c.start <= from && c.end >= to);
    if (!active.length) continue;
    active.sort((a, b) => b.mean - a.mean);      // highest line first
    const last = out[out.length - 1];
    if (last && last.to === from && last.active.length === active.length
      && last.active.every((c, k) => c === active[k])) { last.to = to; continue; }
    out.push({ from, to, active });
  }
  return out;
}

const lineMean = (line) =>
  line.chords.reduce((s, c) => s + c.mean, 0) / Math.max(1, line.chords.length);

/**
 * Split one staff into independent lines.
 *
 * The lines in each stretch are joined to the lines in the next by the
 * cheapest pairing — nearest in pitch, and preferring one that carries on from
 * where it stopped — so a part that crosses another is followed rather than
 * swapped with it.  Voice one is the highest line, which is the order both a
 * reader and the engraver expect.
 */
export function assignVoices(notes, { maxVoices = 4 } = {}) {
  if (!notes.length) return 0;
  const chords = chordsOf(notes);
  const blocks = contigs(chords);
  if (!blocks.length) {
    for (const n of notes) n.voice = 0;
    return 1;
  }

  const lineOf = new Map();     // chord -> line id
  const lines = [];
  const newLine = (chord) => {
    const id = lines.length;
    lines.push({ id, chords: [chord], lastPitch: chord.mean, lastEnd: chord.end });
    lineOf.set(chord, id);
    return id;
  };

  for (const c of blocks[0].active) newLine(c);

  for (let b = 1; b < blocks.length; b++) {
    const block = blocks[b];
    const held = new Set();
    const fresh = [];
    for (const c of block.active) {
      if (lineOf.has(c)) held.add(lineOf.get(c));
      else fresh.push(c);
    }
    /* A line is available to be continued once its chord has finished. */
    const free = lines
      .filter((l) => !held.has(l.id) && l.lastEnd <= block.from + 1)
      .map((l) => l.id);

    /* Pair the new chords with the free lines, cheapest pairing first, so a
     * crossing is followed instead of being resolved by pitch order. */
    const pairs = [];
    for (const c of fresh) {
      for (const id of free) {
        const line = lines[id];
        const leap = Math.abs(line.lastPitch - c.mean);
        if (leap > 24) continue;
        const rest = Math.max(0, c.start - line.lastEnd) / 960;
        pairs.push({ c, id, cost: leap + rest * 1.5 });
      }
    }
    pairs.sort((a, b2) => a.cost - b2.cost);
    const takenLine = new Set();
    const takenChord = new Set();
    for (const p of pairs) {
      if (takenLine.has(p.id) || takenChord.has(p.c)) continue;
      takenLine.add(p.id);
      takenChord.add(p.c);
      lines[p.id].chords.push(p.c);
      lineOf.set(p.c, p.id);
    }
    for (const c of fresh) if (!lineOf.has(c)) newLine(c);
    for (const c of block.active) {
      const line = lines[lineOf.get(c)];
      line.lastPitch = c.mean;
      line.lastEnd = Math.max(line.lastEnd, c.end);
    }
  }

  /* More lines than a staff can show: fold the sparsest into their nearest
   * neighbour rather than dropping the notes. */
  let kept = lines.filter((l) => l.chords.length);
  if (kept.length > maxVoices) {
    kept.sort((a, b) => b.chords.length - a.chords.length);
    const keep = kept.slice(0, maxVoices);
    for (const extra of kept.slice(maxVoices)) {
      for (const c of extra.chords) {
        let near = keep[0];
        let d = Infinity;
        for (const k of keep) {
          const gap = Math.abs(lineMean(k) - c.mean);
          if (gap < d) { d = gap; near = k; }
        }
        near.chords.push(c);
      }
    }
    kept = keep;
  }

  kept.sort((a, b) => lineMean(b) - lineMean(a));
  kept.forEach((line, i) => {
    for (const c of line.chords) for (const n of c.notes) n.voice = i;
  });
  for (const n of notes) if (n.voice === undefined) n.voice = 0;
  return kept.length;
}

/**
 * Collect notes into chord events: same staff, same voice, same attack.
 * Returns [{ startTicks, endTicks, staff, voice, notes, confidence }].
 */
export function groupChords(notes) {
  const map = new Map();
  for (const n of notes) {
    const key = [n.staff || 0, n.voice || 0, n.startTicks].join(':');
    if (!map.has(key)) {
      map.set(key, {
        startTicks: n.startTicks,
        endTicks: n.endTicks,
        staff: n.staff || 0,
        voice: n.voice || 0,
        notes: [],
      });
    }
    const g = map.get(key);
    g.notes.push(n);
    /* A chord is written with one duration; the notes of a real chord are
     * struck together and released together, so the shortest is the honest
     * length and the rest are held by the pedal. */
    g.endTicks = Math.min(g.endTicks, n.endTicks);
  }
  const out = [...map.values()].sort((a, b) =>
    a.staff - b.staff || a.voice - b.voice || a.startTicks - b.startTicks);
  for (const g of out) {
    g.notes.sort((a, b) => a.midi - b.midi);
    g.confidence = g.notes.reduce((s, n) => s + Math.min(n.confidence,
      n.rhythmConfidence === undefined ? 1 : n.rhythmConfidence), 0) / g.notes.length;
  }
  return out;
}

/**
 * Record how each note was played, before anything is quantised.
 *
 * Once onsets have been moved onto a grid, a chord rolled across the keyboard
 * and a written arpeggio look identical, so the distinction has to be drawn
 * while the performance timing is still there.
 */
export function markPerformedEvents(notes, opts = {}) {
  const events = groupEvents(notes, opts);
  for (const ev of events) {
    for (const n of ev.notes) {
      n.eventKind = ev.kind;
      if (ev.rolled) n.rolledWith = ev.harmony;
    }
  }
  return events;
}

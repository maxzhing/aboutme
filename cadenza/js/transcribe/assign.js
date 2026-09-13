/* Cadenza — putting the lines that were found onto the right staves.
 *
 * Once the texture has been separated into lines, something has to decide which
 * line is the first violin and which is the cello.  Three things decide it:
 * where the line sits, whether the instrument can actually play it, and whether
 * it ever plays more than one note at a time.
 *
 * What this does not do is invent an answer.  Told the line-up, it fits the
 * lines to it; told nothing, it says so, and the panel asks.  A transcription
 * that confidently labels a viola part "trumpet" is worse than one that admits
 * it cannot tell, because the first has to be found and undone.
 */

import { assignVoices, groupChords } from './voices.js';
import { assignHands, levelEvents } from './hands.js';
import { eventsOf } from './events.js';

/** Everything sounding as one line, described by where it sits and what it does. */
function describeLine(notes) {
  const pitches = notes.map((n) => n.midi).sort((a, b) => a - b);
  const median = pitches[Math.floor(pitches.length / 2)];
  const byStart = new Map();
  for (const n of notes) {
    const k = n.startTicks;
    byStart.set(k, (byStart.get(k) || 0) + 1);
  }
  const widest = Math.max(1, ...byStart.values());
  return {
    notes,
    low: pitches[0],
    high: pitches[pitches.length - 1],
    median,
    span: pitches[pitches.length - 1] - pitches[0],
    chordSize: widest,
    count: notes.length,
  };
}

/**
 * Follow the individual lines through an ensemble texture.
 *
 * This is not the same problem as separating the voices on a keyboard staff.
 * Four players sounding four notes together are four lines, not one chord, so
 * the unit here is the single note: at every attack the notes are handed to the
 * lines that can best carry them, a line preferring to continue near where it
 * was and never taking two notes at once.
 */
export function separateLines(notes, maxLines) {
  const sorted = [...notes].sort((a, b) => a.startTicks - b.startTicks || b.midi - a.midi);
  const times = [...new Set(sorted.map((n) => n.startTicks))].sort((a, b) => a - b);
  const lines = [];
  const claim = (note) => {
    lines.push({ notes: [note], lastPitch: note.midi, lastEnd: note.endTicks });
    return lines.length - 1;
  };

  for (const t of times) {
    const starting = sorted.filter((n) => n.startTicks === t).sort((a, b) => b.midi - a.midi);
    const busy = new Set();
    lines.forEach((l, i) => { if (l.lastEnd > t + 1) busy.add(i); });

    /* Every free line paired with every note wanting one, cheapest first: a
     * line goes on where it left off rather than to whatever is nearest in
     * pitch order, which is what keeps a crossing part intact. */
    const pairs = [];
    starting.forEach((note, ni) => {
      lines.forEach((line, li) => {
        if (busy.has(li)) return;
        const leap = Math.abs(line.lastPitch - note.midi);
        const rest = Math.max(0, t - line.lastEnd) / 960;
        pairs.push({ ni, li, cost: leap + rest * 2 });
      });
    });
    pairs.sort((a, b) => a.cost - b.cost);
    const takenNote = new Set();
    const takenLine = new Set();
    for (const pair of pairs) {
      if (takenNote.has(pair.ni) || takenLine.has(pair.li)) continue;
      /* A leap of more than two octaves is a new entry, not a continuation. */
      if (pair.cost > 26 && lines.length < maxLines) continue;
      takenNote.add(pair.ni);
      takenLine.add(pair.li);
      const line = lines[pair.li];
      line.notes.push(starting[pair.ni]);
      line.lastPitch = starting[pair.ni].midi;
      line.lastEnd = Math.max(line.lastEnd, starting[pair.ni].endTicks);
    }
    starting.forEach((note, ni) => {
      if (takenNote.has(ni)) return;
      if (lines.length < maxLines) { claim(note); return; }
      /* Out of lines: give it to the nearest one that is free, and failing
       * that the nearest of all — losing the note would be worse. */
      let best = 0;
      let d = Infinity;
      lines.forEach((line, li) => {
        const gap = Math.abs(line.lastPitch - note.midi) + (busy.has(li) || takenLine.has(li) ? 30 : 0);
        if (gap < d) { d = gap; best = li; }
      });
      lines[best].notes.push(note);
      lines[best].lastPitch = note.midi;
      lines[best].lastEnd = Math.max(lines[best].lastEnd, note.endTicks);
    });
  }
  return lines.filter((l) => l.notes.length).map((l) => describeLine(l.notes));
}


/**
 * Hands for a keyboard part, decided event by event.
 *
 * The events are rebuilt from the notes so that a chord is handed to a hand
 * whole, and each hand's share of a chord is then given one length — after
 * which the voice separator sees chords rather than a scatter of notes that
 * happen to have started together.
 */
function keyboardHands(notes, centre, perBeat) {
  const events = eventsOf(notes);
  const result = assignHands(events, { centre });
  levelEvents(events, perBeat);
  return result;
}

/** What it costs to give this line to this instrument. */
function cost(line, part) {
  const [lo, hi] = part.range;
  let out = 0;
  for (const n of line.notes) if (n.midi < lo || n.midi > hi) out++;
  const centre = (lo + hi) / 2;
  let c = (out / Math.max(1, line.count)) * 40;
  c += Math.abs(line.median - centre) / 6;
  /* A line that plays chords cannot go to an instrument that plays one note. */
  c += Math.max(0, line.chordSize - part.chordSize) * 8;
  return c;
}
/**
 * Separate a performance into the lines a line-up implies, and assign them.
 *
 * `plan` comes from resolveTarget.  Every note ends up with `partIndex`, and
 * keyboard parts additionally get `staff` and `voice`; everything else gets the
 * voices its own line needs.
 *
 * Returns the per-part assignment with a confidence for each, so an uncertain
 * reading can be handed to the user rather than asserted.
 */
export function assignToParts(notes, plan, opts = {}) {
  const { splitCentre = 60, perBeat = 480 } = opts;
  const parts = plan.parts;

  /* One instrument: the old question, which hand and which voice. */
  if (parts.length === 1) {
    const only = parts[0];
    if (only.staves > 1 && plan.hands !== false) {
      keyboardHands(notes, splitCentre, perBeat);
      for (const staff of new Set(notes.map((n) => n.staff))) {
        assignVoices(notes.filter((n) => n.staff === staff));
      }
    } else {
      for (const n of notes) n.staff = 0;
      assignVoices(notes, { maxVoices: only.chordSize > 2 ? 4 : 2 });
    }
    for (const n of notes) n.partIndex = 0;
    return {
      parts: [{ part: only, notes, confidence: 1, lines: 1 }],
      staves: new Set(notes.map((n) => n.staff)).size,
      confidence: 1,
    };
  }

  /* Several instruments: follow the lines, then fit them to the players. */
  let widest = 1;
  const byStart = new Map();
  for (const n of notes) byStart.set(n.startTicks, (byStart.get(n.startTicks) || 0) + 1);
  for (const v of byStart.values()) widest = Math.max(widest, v);
  const capacity = parts.reduce((s2, p) => s2 + Math.max(1, Math.min(p.chordSize, 4)), 0);
  const lines = separateLines(notes, Math.max(parts.length, Math.min(capacity, widest)));

  /* Fit the lines to the players.  Cheapest overall rather than cheapest one
   * at a time: giving the highest line to the violin may be right on its own
   * and wrong for the quartet, so the whole assignment is settled together and
   * then improved by trying every swap until no swap helps. */
  const room = parts.map((p) => (p.chordSize > 2 ? 4 : p.chordSize > 1 ? 2 : 1));
  const map = lines.map(() => -1);
  const order = lines.map((l, i) => i).sort((a, b) => lines[b].median - lines[a].median);
  const byRegister = parts.map((p, i) => i)
    .sort((a, b) => (parts[b].range[0] + parts[b].range[1]) - (parts[a].range[0] + parts[a].range[1]));
  order.forEach((li, k) => { map[li] = byRegister[Math.min(k, byRegister.length - 1)]; });

  const totalCost = () => {
    const load = new Array(parts.length).fill(0);
    let sum = 0;
    map.forEach((pi, li) => {
      if (pi < 0) return;
      load[pi]++;
      sum += cost(lines[li], parts[pi]);
    });
    /* An instrument asked to carry more lines than it has hands for. */
    load.forEach((used, pi) => { sum += Math.max(0, used - room[pi]) * 30; });
    /* A player with nothing to do is usually a sign the lines went to the
     * wrong people, though a genuinely silent part is possible. */
    load.forEach((used) => { if (!used) sum += 6; });
    return sum;
  };
  let score = totalCost();
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 80) {
    improved = false;
    for (let li = 0; li < map.length; li++) {
      for (let pi = 0; pi < parts.length; pi++) {
        if (map[li] === pi) continue;
        const was = map[li];
        map[li] = pi;
        const next = totalCost();
        if (next < score - 1e-9) { score = next; improved = true; }
        else map[li] = was;
      }
    }
  }

  const result = parts.map((p) => ({ part: p, notes: [], confidence: 0, lines: 0 }));
  lines.forEach((line, li) => {
    const pi = map[li] < 0 ? 0 : map[li];
    result[pi].lines++;
    for (const n of line.notes) {
      n.partIndex = pi;
      result[pi].notes.push(n);
    }
  });

  /* Voices within each part, and hands for the keyboards. */
  result.forEach((entry, i) => {
    if (!entry.notes.length) return;
    if (entry.part.staves > 1) {
      keyboardHands(entry.notes, splitCentre, perBeat);
      for (const staff of new Set(entry.notes.map((n) => n.staff))) {
        assignVoices(entry.notes.filter((n) => n.staff === staff));
      }
    } else {
      for (const n of entry.notes) n.staff = 0;
      assignVoices(entry.notes, { maxVoices: entry.part.chordSize > 1 ? 2 : 1 });
    }
    /* How well the notes actually sit in the instrument's range: this is what
     * the panel shows when it asks whether the guess was right. */
    const [lo, hi] = entry.part.range;
    const inside = entry.notes.filter((n) => n.midi >= lo && n.midi <= hi).length;
    entry.confidence = entry.notes.length ? inside / entry.notes.length : 0;
  });

  const spread = result.filter((r) => r.notes.length);
  return {
    parts: result,
    staves: result.reduce((s, r) => s + (r.notes.length ? (r.part.staves > 1 ? 2 : 1) : 0), 0),
    confidence: spread.length ? spread.reduce((s, r) => s + r.confidence, 0) / spread.length : 0,
  };
}

export { groupChords };

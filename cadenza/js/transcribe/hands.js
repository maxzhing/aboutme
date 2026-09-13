/* Cadenza — which hand played it.
 *
 * The old question was asked of each note: is this note above or below the
 * dividing line?  Asked that way, a chord is not a chord — it is five separate
 * notes that happen to be near each other, and a dividing line drawn through
 * the middle of one sends half of it to the other staff.  That is how
 * C2+G2+C3 and E4+G4+C5 turn into a column of unrelated notes.
 *
 * So the question is asked of the event instead.  A chord goes to a hand
 * whole, and is divided only where the music genuinely divides it: where there
 * is a gap between the notes wide enough that no hand was covering both sides
 * of it, or where one hand could not have reached from bottom to top.  Where
 * there is a real gap the split is free; where there is not, it is expensive,
 * and the reader will take almost any other answer first.
 *
 * The division is then found for the whole passage at once, not chord by
 * chord.  Hands do not jump about: they stay where they are and move when the
 * music moves, so the cheapest path through the passage is the one that keeps
 * both hands in reach while moving the division as little as it can.  A right
 * hand playing low and a left hand playing high are both perfectly ordinary,
 * and come out of this correctly for the same reason.
 */

const MAX_SPAN = 14;        // semitones one hand covers without strain
const COMFORT = 10;         // ... and covers comfortably
const MAX_FINGERS = 5;
/* A gap this wide is a natural place for the hands to part. */
const NATURAL_GAP = 12;
/* What it costs to divide a chord where there is no gap at all. */
const TEAR = 9;

const span = (list) => (list.length < 2 ? 0
  : list[list.length - 1].midi - list[0].midi);

/**
 * What it costs to divide this event at this pitch.
 *
 * Everything below the divider is the left hand.  The terms are, in order of
 * how much they matter: a hand asked to stretch further than it can, a hand
 * asked for more notes than it has fingers, and a chord torn where there is
 * nothing to tear along.
 */
function eventCost(ev, divider, centre) {
  const notes = ev.notes;
  const left = notes.filter((n) => n.midi < divider);
  const right = notes.filter((n) => n.midi >= divider);
  let cost = 0;

  for (const hand of [left, right]) {
    const width = span(hand);
    if (width > MAX_SPAN) cost += (width - MAX_SPAN) * 3;
    else if (width > COMFORT) cost += (width - COMFORT) * 0.4;
    if (hand.length > MAX_FINGERS) cost += (hand.length - MAX_FINGERS) * 5;
  }

  /* Dividing a chord where its notes are close together means claiming the
   * player used two hands for something one hand was holding. */
  if (left.length && right.length) {
    const gap = right[0].midi - left[left.length - 1].midi;
    if (gap < NATURAL_GAP) cost += Math.pow(NATURAL_GAP - gap, 1.4) * (TEAR / 30);
  }

  /* Middle C is where the hands usually meet; going elsewhere wants a reason,
   * and the terms above supply one when there is one. */
  cost += Math.abs(divider - centre) * 0.02;
  return cost;
}

/**
 * Choose the division for a whole passage.
 *
 * A Viterbi pass over the candidate dividing pitches: the cheapest path is the
 * one that plays every event comfortably while moving the hands as little as
 * possible.  `move` is what a shift of one semitone costs, and it is what
 * stops the division chasing every chord.
 */
export function assignHands(events, opts = {}) {
  const { centre = 60, move = 0.12, single = false } = opts;
  if (!events.length) return { splits: [], staves: 1 };

  if (single) {
    for (const ev of events) for (const n of ev.notes) n.staff = 0;
    return { splits: [], staves: 1 };
  }

  let lo = Infinity;
  let hi = -Infinity;
  for (const ev of events) { lo = Math.min(lo, ev.low); hi = Math.max(hi, ev.high); }
  const candidates = [];
  for (let p = lo; p <= hi + 1; p++) candidates.push(p);
  if (candidates.length < 2) {
    for (const ev of events) for (const n of ev.notes) n.staff = 0;
    return { splits: [], staves: 1 };
  }

  const n = candidates.length;
  let prev = candidates.map((p) => eventCost(events[0], p, centre));
  const back = [];
  for (let t = 1; t < events.length; t++) {
    const cur = new Float64Array(n);
    const from = new Int32Array(n);
    for (let j = 0; j < n; j++) {
      let best = Infinity;
      let arg = j;
      for (let i = 0; i < n; i++) {
        const c = prev[i] + Math.abs(candidates[i] - candidates[j]) * move;
        if (c < best) { best = c; arg = i; }
      }
      cur[j] = best + eventCost(events[t], candidates[j], centre);
      from[j] = arg;
    }
    back.push(from);
    prev = cur;
  }

  let j = 0;
  for (let k = 1; k < n; k++) if (prev[k] < prev[j]) j = k;
  const path = new Array(events.length);
  path[events.length - 1] = candidates[j];
  for (let t = events.length - 1; t > 0; t--) {
    j = back[t - 1][j];
    path[t - 1] = candidates[j];
  }

  const splits = events.map((ev, i) => ({ tick: ev.startTicks ?? 0, time: ev.time, split: path[i] }));
  events.forEach((ev, i) => {
    for (const note of ev.notes) note.staff = note.midi >= path[i] ? 0 : 1;
    ev.divider = path[i];
  });

  followLines(events);

  /* Everything in one hand: the music sits on one staff, and which staff that
   * is follows the register.  A bass-register passage does not belong above
   * middle C under a pile of ledger lines. */
  const used = new Set();
  for (const ev of events) for (const n of ev.notes) used.add(n.staff);
  if (used.size === 1) {
    const all = events.flatMap((ev) => ev.notes.map((n) => n.midi)).sort((a, b) => a - b);
    const staff = all[Math.floor(all.length / 2)] < centre ? 1 : 0;
    for (const ev of events) for (const n of ev.notes) n.staff = staff;
  }
  return { splits, staves: used.size };
}

/**
 * Stop a line changing hands in the middle of itself.
 *
 * The division is settled for the passage, but a melody that dips under it for
 * one note is still handed across and comes straight back, which strands a
 * note in the wrong staff.  A note goes back to where its neighbours are when
 * most of them are in the other hand and it was a close call anyway — and only
 * when it is alone in its hand at that moment, so this can never take a chord
 * apart.
 */
function followLines(events) {
  const notes = events.flatMap((ev) => ev.notes.map((n) => ({ n, ev })));
  for (const { n, ev } of notes) {
    const alone = ev.notes.filter((m) => m.staff === n.staff).length === 1;
    if (!alone) continue;
    if (Math.abs(n.midi - ev.divider) > 4) continue;
    const near = notes.filter(({ n: o }) => o !== n
      && Math.abs(o.midi - n.midi) <= 7
      && Math.abs((o.start ?? 0) - (n.start ?? 0)) <= 2);
    if (near.length < 2) continue;
    const elsewhere = near.filter(({ n: o }) => o.staff !== n.staff);
    if (elsewhere.length * 2 <= near.length) continue;
    n.staff = elsewhere[0].n.staff;
  }
}

/**
 * Give one hand's share of a chord a single length.
 *
 * The notes of a chord are let go a few milliseconds apart, and a few
 * milliseconds is enough to make them separate voices with separate note
 * values.  Where a hand's notes agree about when they stopped they are given
 * one length; where one of them plainly went on far longer it is a held note
 * against a moving line, which is a real second voice, and it keeps its own.
 */
export function levelEvents(events, perBeat) {
  const window = Math.max(1, Math.round(perBeat * 0.3));
  for (const ev of events) {
    for (const staff of new Set(ev.notes.map((n) => n.staff || 0))) {
      const hand = ev.notes.filter((n) => (n.staff || 0) === staff);
      if (hand.length < 2) continue;
      const ends = hand.map((n) => n.endTicks).sort((a, b) => a - b);
      const mid = ends[Math.floor(ends.length / 2)];
      const agree = hand.filter((n) => Math.abs(n.endTicks - mid) <= window);
      if (agree.length * 2 <= hand.length) continue;
      for (const note of agree) note.endTicks = mid;
    }
  }
}

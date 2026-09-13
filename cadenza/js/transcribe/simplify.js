/* Cadenza — reading the transcription back and asking whether it is sensible.
 *
 * Everything upstream decides one thing at a time: this beat's division, this
 * note's length, this note's hand.  Each decision can be defensible and the
 * page still wrong, because notation is judged as a whole — a rhythm written
 * five different ways in five bars is wrong even when every bar is defensible
 * on its own.
 *
 * So before the score is built, it is reviewed.  The questions are the ones a
 * copyist would ask:
 *
 *   Are there voices here that are really one chord?
 *   Is a hand holding notes that belong to the other one?
 *   Is a beat written as a triplet that is plainly in twos?
 *   Is a repeated figure written differently each time it appears?
 *
 * The rule throughout is the one that matters: where two notations represent
 * the same performance, take the simpler.  Where they do not — where
 * simplifying would throw away something that was actually played — leave it
 * alone.  Accuracy first, readability second.
 */

import { TPQ } from '../core/rhythm.js';

/**
 * Are these two lines really independent?
 *
 * They are if one of them ever moves while the other is holding: that is what
 * a second voice is for.  If they always start together, they are one chord
 * written twice, and a reader would rather see the chord.
 */
function independent(a, b) {
  const starts = (list) => new Set(list.map((n) => n.startTicks));
  const aStarts = starts(a);
  const bStarts = starts(b);
  const movesAlone = (one, other, otherStarts) => one.some((n) => {
    if (otherStarts.has(n.startTicks)) return false;
    /* It began while the other was sounding, and the other did not begin with
     * it — a genuine entry against a held note. */
    return other.some((m) => m.startTicks < n.startTicks && m.endTicks > n.startTicks + 1);
  });
  if (movesAlone(a, b, bStarts) || movesAlone(b, a, aStarts)) return true;

  /* Or if, where they do start together, one is much longer than the other:
   * a melody over a held bass, not a chord. */
  for (const n of a) {
    for (const m of b) {
      if (n.startTicks !== m.startTicks) continue;
      const longer = Math.max(n.endTicks - n.startTicks, m.endTicks - m.startTicks);
      const shorter = Math.min(n.endTicks - n.startTicks, m.endTicks - m.startTicks);
      if (longer > shorter * 1.9 && longer - shorter > TPQ / 2) return true;
    }
  }
  return false;
}

/** Collapse two lines into one, and give each chord a single length. */
function mergeVoices(notes, keep, drop) {
  for (const n of notes) if (n.voice === drop) n.voice = keep;
  const byStart = new Map();
  for (const n of notes) {
    if (n.voice !== keep) continue;
    if (!byStart.has(n.startTicks)) byStart.set(n.startTicks, []);
    byStart.get(n.startTicks).push(n);
  }
  for (const group of byStart.values()) {
    if (group.length < 2) continue;
    const ends = group.map((n) => n.endTicks).sort((x, y) => x - y);
    const median = ends[Math.floor(ends.length / 2)];
    for (const n of group) n.endTicks = median;
  }
}

/**
 * Merge lines that are really chords.
 *
 * Done once per staff, repeatedly, because collapsing two voices can leave a
 * third that is now plainly part of the same chord.
 */
function reviewVoices(notes, log) {
  const staves = [...new Set(notes.map((n) => n.staff || 0))];
  for (const staff of staves) {
    const own = notes.filter((n) => (n.staff || 0) === staff);
    let changed = true;
    let guard = 0;
    while (changed && guard++ < 6) {
      changed = false;
      const voices = [...new Set(own.map((n) => n.voice || 0))].sort((a, b) => a - b);
      outer:
      for (let i = 0; i < voices.length; i++) {
        for (let j = i + 1; j < voices.length; j++) {
          const a = own.filter((n) => (n.voice || 0) === voices[i]);
          const b = own.filter((n) => (n.voice || 0) === voices[j]);
          if (!a.length || !b.length) continue;
          if (independent(a, b)) continue;
          mergeVoices(own, voices[i], voices[j]);
          log.push(`merged two lines on staff ${staff + 1} into one chord part`);
          changed = true;
          break outer;
        }
      }
    }
    /* Renumber so voice one is the highest line, as a reader expects. */
    const order = [...new Set(own.map((n) => n.voice || 0))]
      .map((v) => ({ v, mean: mean(own.filter((n) => (n.voice || 0) === v)) }))
      .sort((x, y) => y.mean - x.mean);
    const map = new Map(order.map((o, i) => [o.v, i]));
    for (const n of own) n.voice = map.get(n.voice || 0);
  }
}

const mean = (list) => list.reduce((s, n) => s + n.midi, 0) / Math.max(1, list.length);

/**
 * Put a chord back in one hand.
 *
 * The hand division is chosen a moment at a time, so a chord whose notes
 * straddle it is torn in two.  Where the notes struck at one instant fall into
 * clear groups — a gap of an octave or more between them — each group belongs
 * to one hand, and a group that has been split between hands is put back into
 * whichever hand holds most of it.
 */
function reviewHands(notes, log) {
  const byStart = new Map();
  for (const n of notes) {
    if (!byStart.has(n.startTicks)) byStart.set(n.startTicks, []);
    byStart.get(n.startTicks).push(n);
  }
  for (const group of byStart.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => a.midi - b.midi);
    /* Split where the notes themselves are furthest apart, if that gap is wide
     * enough to be the space between two hands. */
    const clusters = [[sorted[0]]];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].midi - sorted[i - 1].midi >= 12) clusters.push([]);
      clusters[clusters.length - 1].push(sorted[i]);
    }
    for (const cluster of clusters) {
      if (cluster.length < 2) continue;
      /* Never wider than a hand can reach: that really is two hands. */
      if (cluster[cluster.length - 1].midi - cluster[0].midi > 14) continue;
      const votes = new Map();
      for (const n of cluster) votes.set(n.staff, (votes.get(n.staff) || 0) + 1);
      if (votes.size < 2) continue;
      let win = cluster[0].staff;
      let most = 0;
      for (const [staff, count] of votes) if (count > most) { most = count; win = staff; }
      for (const n of cluster) n.staff = win;
      log.push('put a chord back into one hand');
    }
  }
}

/**
 * Take away a tuplet that nothing needed.
 *
 * A beat is written in threes only when it was played in threes.  Where the
 * same attacks sit just as well on an ordinary division, the ordinary division
 * is what a reader should see.
 */
function reviewTuplets(notes, perBeat, tolerance, log) {
  const byBeat = new Map();
  for (const n of notes) {
    const b = Math.floor(n.startTicks / perBeat);
    if (!byBeat.has(b)) byBeat.set(b, []);
    byBeat.get(b).push(n);
  }
  for (const [beatIndex, group] of byBeat) {
    const d = Math.max(...group.map((n) => n.division || 1));
    if (d % 3 !== 0) continue;
    const base = beatIndex * perBeat;
    for (const plain of [1, 2, 4, 8]) {
      if (plain > d) break;
      const step = perBeat / plain;
      const fits = group.every((n) => {
        const off = (n.startTicks - base) / step;
        return Math.abs(off - Math.round(off)) <= tolerance;
      });
      if (!fits) continue;
      for (const n of group) {
        n.division = plain;
        n.startTicks = base + Math.round((n.startTicks - base) / step) * step;
        const len = Math.max(step, Math.round((n.endTicks - n.startTicks) / step) * step);
        n.endTicks = n.startTicks + len;
      }
      log.push(`bar beat ${beatIndex + 1} was written in threes but sits on ordinary beats`);
      break;
    }
  }
}

/**
 * Pull a straggler back into the chord it belongs to.
 *
 * When five notes of a chord are heard at the beat and the sixth a moment
 * later, the sixth is not a syncopation — it is the same chord, heard late.
 * Left alone it drags its whole beat onto a finer grid and the bar fills with
 * values nobody played.  A note that arrives alone, close to a chord, and is
 * not already in that chord, joins it.
 *
 * The window is deliberately narrow.  A note genuinely played off the beat is
 * further away than this, and keeps its place.
 */
function reviewStragglers(notes, perBeat, log) {
  const byStart = new Map();
  for (const n of notes) {
    if (!byStart.has(n.startTicks)) byStart.set(n.startTicks, []);
    byStart.get(n.startTicks).push(n);
  }
  const starts = [...byStart.keys()].sort((a, b) => a - b);
  if (starts.length < 3) return;
  const sizes = starts.map((t) => byStart.get(t).length).sort((a, b) => a - b);
  const typical = sizes[Math.floor(sizes.length / 2)];
  if (typical < 2) return;
  const window = Math.round(perBeat * 0.45);

  for (const t of starts) {
    const group = byStart.get(t);
    if (group.length * 2 > typical) continue;        // not a straggler
    let best = null;
    let bestGap = window + 1;
    for (const other of starts) {
      if (other === t) continue;
      const gap = Math.abs(other - t);
      if (gap > window || gap >= bestGap) continue;
      const host = byStart.get(other);
      if (host.length <= group.length) continue;
      if (group.some((n) => host.some((m) => m.midi === n.midi))) continue;
      best = other;
      bestGap = gap;
    }
    if (best === null) continue;
    const host = byStart.get(best);
    const ends = host.map((n) => n.endTicks).sort((a, b) => a - b);
    const median = ends[Math.floor(ends.length / 2)];
    for (const n of group) {
      n.startTicks = best;
      n.endTicks = median;
      n.division = host[0].division;
      host.push(n);
    }
    byStart.delete(t);
    log.push('a note heard a moment late was put back in its chord');
  }
}

/**
 * Give a chord one length.
 *
 * Notes struck together in one hand are let go together, and where the same
 * hand strikes again the chord before it lasted until then.  Heard from a
 * recording those six releases land at six slightly different moments, and
 * six slightly different lengths become several voices with several note
 * values — the commonest way a plain accompaniment turns into a thicket.
 *
 * Applied only where most of the chord already reaches the next attack.  A
 * melody note and a held bass struck together are not a chord in this sense,
 * and the test that most of the group agrees is what tells them apart.
 */
function reviewChordLengths(notes, perBeat, log) {
  const staves = [...new Set(notes.map((n) => n.staff || 0))];
  for (const staff of staves) {
    const own = notes.filter((n) => (n.staff || 0) === staff);
    const byStart = new Map();
    for (const n of own) {
      if (!byStart.has(n.startTicks)) byStart.set(n.startTicks, []);
      byStart.get(n.startTicks).push(n);
    }
    const chordStarts = [...byStart.keys()].filter((t) => byStart.get(t).length >= 2)
      .sort((a, b) => a - b);
    for (let i = 0; i < chordStarts.length; i++) {
      const t1 = chordStarts[i];
      const group = byStart.get(t1);
      /* The next moment this hand plays anything at all. */
      const next = [...byStart.keys()].filter((t) => t > t1).sort((a, b) => a - b)[0];
      if (next === undefined) continue;
      const span = next - t1;
      if (span <= 0 || span > perBeat * 8) continue;
      const reaching = group.filter((n) => n.endTicks >= next - perBeat * 0.2).length;
      if (reaching * 2 <= group.length) continue;      // not a chord held to the next
      let moved = 0;
      for (const n of group) {
        if (n.endTicks === next) continue;
        n.endTicks = next;
        moved++;
      }
      if (moved) log.push('gave a chord one length instead of several');
    }
  }
}

/**
 * Review the whole reading and simplify what can be simplified.
 *
 * `parts` is the assignment: one entry per instrument, each with its notes.
 * Returns the list of what was changed, which the panel shows so the
 * simplification is visible rather than silent.
 */
export function review(parts, opts = {}) {
  const { perBeat = TPQ, tolerance = 0.2, hands = true, voices = true, tuplets = true } = opts;
  const log = [];
  for (const entry of parts) {
    if (!entry.notes || !entry.notes.length) continue;
    if (voices) reviewStragglers(entry.notes, perBeat, log);
    if (voices) reviewChordLengths(entry.notes, perBeat, log);
    if (hands && entry.part && entry.part.staves > 1) reviewHands(entry.notes, log);
    if (tuplets) reviewTuplets(entry.notes, perBeat, tolerance, log);
    if (voices) reviewVoices(entry.notes, log);
  }
  /* One line per kind of change, with a count: a list of forty identical
   * entries tells the reader nothing. */
  const counts = new Map();
  for (const line of log) counts.set(line, (counts.get(line) || 0) + 1);
  return [...counts.entries()].map(([line, n]) => (n > 1 ? `${line} (${n}×)` : line));
}

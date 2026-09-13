/* Cadenza — deciding what belongs to the same musical event.
 *
 * Three things that look alike in a list of note onsets are not alike at all
 * on the page:
 *
 *   C E G struck together        one chord
 *   C then E then G              three melodic notes
 *   C G E C rolled upwards       an arpeggio — one harmony, played in turn
 *
 * Getting this wrong is the difference between a transcription and a guess, so
 * the decision is made from the performance rather than from a fixed window.
 * A player spreading a chord puts its notes 20 milliseconds apart; the same 20
 * milliseconds in a fast run is a whole note's worth of time.  The tolerance
 * therefore comes from how quickly this performance is moving, and the notes
 * still have to overlap in time before they are called simultaneous.
 *
 * Nothing here alters a note.  It only says which notes were played at once.
 */

const MAX_CHORD_SPREAD = 0.05;      // seconds, for a deliberate simultaneity
const MAX_ROLL_SPREAD = 0.22;       // seconds, the longest a rolled chord runs

/**
 * How close together two attacks have to be to count as one event.
 *
 * This cannot be a fixed window.  A pianist spreading a chord puts its notes
 * twenty milliseconds apart; twenty milliseconds inside a run of
 * demisemiquavers is a note each.  What separates the two cases is not the
 * size of the gaps but their shape: a performance of chords has small gaps
 * inside each chord and large ones between them, while a run has gaps all the
 * same size.  So the gaps are sorted and the largest jump between consecutive
 * ones is looked for; where there is one, it is the line between within and
 * between.  Where there is none, the gaps are all alike and the answer is
 * decided by whether they are short enough to be a chord at all.
 */
function spreadTolerance(notes) {
  const starts = [...new Set(notes.map((n) => n.start))].sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < starts.length; i++) {
    const d = starts[i] - starts[i - 1];
    if (d > 0.002) gaps.push(d);
  }
  if (!gaps.length) return MAX_CHORD_SPREAD;
  gaps.sort((a, b) => a - b);

  let split = -1;
  let ratio = 2.5;
  for (let i = 0; i < gaps.length - 1; i++) {
    const r = gaps[i + 1] / gaps[i];
    if (r > ratio && gaps[i] < MAX_CHORD_SPREAD * 1.5) { ratio = r; split = i; }
  }
  if (split >= 0) return Math.max(0.012, Math.min(MAX_CHORD_SPREAD, gaps[split] * 1.4));

  const median = gaps[Math.floor(gaps.length / 2)];
  /* No two kinds of gap: either everything is one chord, or nothing is. */
  return median <= 0.03 ? MAX_CHORD_SPREAD : 0.012;
}

/** How much of the shorter note's life is spent sounding with the other. */
function overlap(a, b) {
  const lo = Math.max(a.start, b.start);
  const hi = Math.min(a.end, b.end);
  const shared = hi - lo;
  if (shared <= 0) return 0;
  return shared / Math.max(1e-6, Math.min(a.end - a.start, b.end - b.start));
}

/**
 * Group notes into musical events.
 *
 * Returns [{ kind, notes, start, spread, harmony }] where kind is
 * 'chord' (struck together), 'rolled' (one harmony spread across the keyboard)
 * or 'single'.  A rolled group keeps its notes separate — it was played as
 * separate notes and is written as separate notes — but records that they
 * belong to one harmony, which is what lets the harmonic analysis read a
 * broken chord correctly without the notation pretending it was a block chord.
 */
export function groupEvents(notes, opts = {}) {
  const sorted = [...notes].sort((a, b) => a.start - b.start || a.midi - b.midi);
  if (!sorted.length) return [];
  const tol = opts.tolerance !== undefined ? opts.tolerance : spreadTolerance(sorted);

  /* Struck together: onsets inside the tolerance, and sounding together. */
  const groups = [];
  let current = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i];
    const head = current[0];
    const together = n.start - head.start <= tol
      && current.some((m) => overlap(m, n) > 0.25);
    if (together) current.push(n);
    else { groups.push(current); current = [n]; }
  }
  groups.push(current);

  const events = groups.map((list) => ({
    kind: list.length > 1 ? 'chord' : 'single',
    notes: list,
    start: Math.min(...list.map((n) => n.start)),
    end: Math.max(...list.map((n) => n.end)),
    spread: Math.max(...list.map((n) => n.start)) - Math.min(...list.map((n) => n.start)),
  }));

  markRolled(events);
  return events;
}

/**
 * Find harmonies played one note at a time.
 *
 * A run of single notes that all keep sounding — because the hand held them,
 * or the pedal did — and that spans no more than a rolled chord's worth of
 * time is one harmony spread out, not a melodic phrase.  They stay separate
 * notes; what changes is that the analysis knows they belong together.
 */
function markRolled(events) {
  for (let i = 0; i < events.length; i++) {
    if (events[i].kind !== 'single') continue;
    let j = i;
    while (j + 1 < events.length
      && events[j + 1].kind === 'single'
      && events[j + 1].start - events[i].start <= MAX_ROLL_SPREAD
      && overlap(events[j].notes[0], events[j + 1].notes[0]) > 0.5) j++;
    if (j - i >= 2) {
      const set = [];
      for (let k = i; k <= j; k++) { events[k].rolled = true; set.push(events[k].notes[0].midi); }
      for (let k = i; k <= j; k++) events[k].harmony = set.slice();
      i = j;
    }
  }
}

/**
 * Classify how a group of consecutive notes was played.
 *
 * Used by the tests and by the diagnosis, which wants to say "these three were
 * struck together" or "these three were a run" in plain terms.
 */
export function classify(notes, opts = {}) {
  const events = groupEvents(notes, opts);
  if (events.length === 1 && events[0].notes.length > 1) return 'chord';
  if (events.length > 1 && events.every((e) => e.rolled)) return 'arpeggio';
  if (events.length > 1 && events.every((e) => e.notes.length === 1)) return 'sequence';
  return 'mixed';
}

/**
 * The pitches sounding at a given moment.
 * Used by the harmony reader and by the comparison, both of which ask what was
 * actually sounding rather than what was struck.
 */
export function soundingAt(notes, time) {
  const out = [];
  for (const n of notes) if (n.start <= time && n.end > time) out.push(n.midi);
  return out.sort((a, b) => a - b);
}

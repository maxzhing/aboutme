/* Cadenza — the musical event.
 *
 * The unit of a performance is not the note.  A pianist who plays a C major
 * triad has performed one thing, not three, and everything downstream — the
 * rhythm, the hands, the voices, the page — is wrong if that one thing has
 * already been taken apart into three.  So the first question asked of a
 * performance is never "what note is this" but "what happened here", and the
 * answer is an event: a moment, and the pitches that belong to it.
 *
 *     MUSICAL EVENT at 1.00s
 *       ├── C3
 *       ├── G3
 *       ├── C4
 *       └── E4
 *
 * That is a different object from C3 → G3 → C4 → E4, and the difference is the
 * whole of this file.  Once the events are known they are what gets quantised,
 * what gets given to a hand, and what becomes a chord on the page; the notes
 * travel inside them.  Simultaneity cannot be lost later because nothing later
 * is allowed to look at the notes on their own.
 *
 * Four things have to be told apart, and none of them can be told apart by a
 * fixed window:
 *
 *   one note                     a single pitch
 *   a chord                      pitches struck together
 *   a chord spread by the hand   pitches struck in turn, very fast, all held
 *   an arpeggio or a run         pitches struck in turn, at the pace of the music
 *
 * A player's chord is not mathematically simultaneous — 10 to 40 milliseconds
 * between the outer notes is ordinary — and 40 milliseconds inside a fast run
 * is a note each.  What separates the cases is not the size of the gaps but
 * their size *relative to the music around them*, and whether the notes go on
 * sounding together.  Both of those are measured here, from the performance.
 */

/* A chord's notes are never spread wider than this, however slow the music. */
const MAX_SPREAD = 0.075;
/* Nor closer than this, however fast: a player is not a sequencer. */
const MIN_SPREAD = 0.030;
/* The longest a hand takes to roll a chord from bottom to top. */
const MAX_ROLL = 0.200;
/* How much of the local pace a chord's spread may take up. */
const SPREAD_SHARE = 0.28;
/* A roll has to be this much tighter than the music around it. */
const ROLL_CONTRAST = 2.2;

/* ------------------------------------------------------------------ pace */

/**
 * How fast the music is moving, moment by moment.
 *
 * Taken over neighbouring attacks rather than a fixed number of seconds, so a
 * passage that speeds up is measured at the speed it is actually going.  The
 * median is used rather than the mean because one long note between two short
 * ones should not make the passage look slow.
 */
function paceOver(onsets, span = 8) {
  if (onsets.length < 2) return () => 0.5;
  const gaps = [];
  for (let i = 1; i < onsets.length; i++) gaps.push(onsets[i] - onsets[i - 1]);

  const local = gaps.map((_, i) => {
    const from = Math.max(0, i - span);
    const to = Math.min(gaps.length, i + span + 1);
    const near = gaps.slice(from, to).sort((a, b) => a - b);
    return near[Math.floor(near.length / 2)];
  });

  return (t) => {
    /* The gap before the nearest attack at or after t. */
    let i = 0;
    while (i < onsets.length && onsets[i] < t - 1e-9) i++;
    const k = Math.max(0, Math.min(local.length - 1, i - 1));
    return local[k] || 0.5;
  };
}

/** How much of the shorter note's life is spent sounding with the other. */
function overlap(a, b) {
  const lo = Math.max(a.start, b.start);
  const hi = Math.min(a.end, b.end);
  const shared = hi - lo;
  if (shared <= 0) return 0;
  return shared / Math.max(1e-6, Math.min(a.end - a.start, b.end - b.start));
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* -------------------------------------------------------------- grouping */

/**
 * Does this note belong to the event being built?
 *
 * Three things have to hold.  It has to have arrived inside the window a
 * struck chord occupies; it has to still be sounding along with what is
 * already there, because a chord is notes held together and not merely notes
 * begun together; and its pitch must be new, since the same pitch twice is by
 * definition two events.
 */
function belongs(group, note, tol) {
  if (note.start - group.onset > tol) return false;
  if (group.notes.some((m) => m.midi === note.midi)) return false;
  return group.notes.some((m) => overlap(m, note) > 0.2);
}

function agglomerate(notes, tolAt) {
  const out = [];
  let cur = null;
  for (const n of notes) {
    if (cur && belongs(cur, n, tolAt(cur.onset))) {
      cur.notes.push(n);
      cur.end = Math.max(cur.end, n.end);
      cur.spread = n.start - cur.onset;
    } else {
      cur = { onset: n.start, end: n.end, spread: 0, notes: [n] };
      out.push(cur);
    }
  }
  return out;
}

/**
 * A chord the hand spread out is still one chord.
 *
 * This is the distinction the user hears and no fixed rule catches: the same
 * four pitches, one after another, are a rolled chord in one performance and
 * an arpeggio in another.  Three things decide it, and all three are about the
 * performance rather than the pitches.
 *
 * The notes have to go on sounding together — a roll is held, an arpeggio is
 * usually let go.  The whole figure has to fit inside the time a hand takes to
 * roll a chord, both absolutely and as a share of the pace the music is going.
 * And it has to stand out from its surroundings: the gaps inside a roll are
 * far smaller than the gaps on either side of it, whereas an arpeggio's notes
 * are spaced like the music around them, because they *are* the music.  An
 * arpeggio at the pace of the piece fails all three, which is the point.
 */
function joinRolls(events, paceAt) {
  const out = [];
  let i = 0;
  while (i < events.length) {
    let j = i;
    /* How far the run could reach while staying a roll. */
    const limit = Math.min(MAX_ROLL, Math.max(MAX_SPREAD, 0.55 * paceAt(events[i].onset)));
    let worstGap = 0;
    while (j + 1 < events.length) {
      const next = events[j + 1];
      if (next.onset - events[i].onset > limit) break;
      /* Still sounding together, and no pitch repeated. */
      const held = events[i].notes.some((a) => next.notes.some((b) => overlap(a, b) > 0.35));
      const fresh = next.notes.every((b) => !eventsBetween(events, i, j).includes(b.midi));
      if (!held || !fresh) break;
      worstGap = Math.max(worstGap, next.onset - events[j].onset);
      j++;
    }

    if (j > i) {
      /* Stand-out test: the silence on either side must dwarf the gaps inside. */
      const before = i > 0 ? events[i].onset - events[i - 1].onset : Infinity;
      const after = j + 1 < events.length ? events[j + 1].onset - events[j].onset : Infinity;
      const outside = Math.min(before, after);
      if (outside >= worstGap * ROLL_CONTRAST) {
        const merged = {
          onset: events[i].onset,
          end: Math.max(...events.slice(i, j + 1).map((e) => e.end)),
          spread: events[j].onset - events[i].onset,
          notes: events.slice(i, j + 1).flatMap((e) => e.notes),
          rolled: true,
        };
        out.push(merged);
        i = j + 1;
        continue;
      }
    }
    out.push(events[i]);
    i++;
  }
  return out;
}

const eventsBetween = (events, i, j) =>
  events.slice(i, j + 1).flatMap((e) => e.notes.map((n) => n.midi));

/* -------------------------------------------------------------- the event */

/**
 * What kind of thing this event is.
 *
 * Descriptive only.  Nothing downstream is allowed to change the pitches
 * because of the label; the label exists so that the notation can show a roll
 * as a roll, and so the debug view can say what the reader thought it heard.
 */
function classifyOne(ev) {
  if (ev.notes.length === 1) return 'single';
  if (ev.rolled) return 'rolled';
  return 'chord';
}

function finish(ev, id) {
  ev.id = id;
  ev.notes.sort((a, b) => a.midi - b.midi);
  ev.pitches = ev.notes.map((n) => n.midi);
  ev.kind = classifyOne(ev);
  ev.low = ev.pitches[0];
  ev.high = ev.pitches[ev.pitches.length - 1];
  ev.span = ev.high - ev.low;
  /* The moment the event is heard to begin.  For a struck chord that is where
   * its notes agree; for a rolled one it is the first note, because that is
   * where a listener places the beat. */
  ev.time = ev.rolled ? ev.onset : median(ev.notes.map((n) => n.start));
  ev.velocity = Math.round(average(ev.notes.map((n) => n.velocity ?? 80)));
  ev.confidence = average(ev.notes.map((n) => n.confidence ?? 0.5));
  ev.salience = ev.notes.reduce((s, n) => s + (n.salience ?? 0), 0);
  for (const n of ev.notes) {
    n.eventId = id;
    n.eventKind = ev.kind;
    n.performedStart = n.start;
    /* Everything downstream sees one moment, which is what the player played. */
    n.start = ev.time;
  }
  return ev;
}

const average = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/**
 * Read a performance as a sequence of musical events.
 *
 * Two passes, because the tolerance depends on the pace and the pace depends
 * on the grouping.  The first pass groups at the tightest window a chord can
 * possibly occupy, which is enough to see roughly where the attacks are; the
 * second regroups with the window the music's own speed implies.
 */
export function buildEvents(notes, opts = {}) {
  const sorted = [...notes]
    .filter((n) => n.end > n.start)
    .sort((a, b) => a.start - b.start || a.midi - b.midi);
  if (!sorted.length) return [];

  const first = agglomerate(sorted, () => MIN_SPREAD);
  const pace = paceOver(first.map((e) => e.onset));

  const tolAt = opts.tolerance !== undefined
    ? () => opts.tolerance
    : (t) => clamp(SPREAD_SHARE * pace(t), MIN_SPREAD, MAX_SPREAD);

  let events = agglomerate(sorted, tolAt);
  if (opts.rolls !== false) events = joinRolls(events, pace);
  events.forEach((e, i) => finish(e, i));
  return events;
}

/* ------------------------------------------------------- older interfaces */

/**
 * The grouping, as the rest of the program used to ask for it.
 *
 * Kept because the voice separator and the tests read events this way; it is
 * the same analysis, without the side effect of moving the notes onto their
 * event's moment.
 */
export function groupEvents(notes, opts = {}) {
  const copies = notes.map((n) => ({ ...n }));
  const events = buildEvents(copies, opts);
  /* Map back to the callers' own note objects. */
  const byKey = new Map();
  for (const n of notes) byKey.set(n.midi + ':' + n.start.toFixed(6), n);
  return events.map((e) => ({
    kind: e.kind,
    rolled: !!e.rolled,
    harmony: e.rolled ? e.pitches.slice() : undefined,
    start: e.time,
    end: e.end,
    spread: e.spread,
    pitches: e.pitches,
    notes: e.notes.map((c) => byKey.get(c.midi + ':' + c.performedStart.toFixed(6)) || c),
  }));
}

/**
 * Classify a short passage, for the tests and for the explanation the panel
 * shows.  Returns 'chord', 'rolled', 'arpeggio', 'sequence' or 'mixed'.
 */
export function classify(notes, opts = {}) {
  const events = groupEvents(notes, opts);
  if (events.length === 1) return events[0].notes.length > 1 ? 'chord' : 'single';
  if (events.every((e) => e.notes.length === 1)) {
    /* Several separate attacks, all still sounding together and covering one
     * harmony: played one at a time, heard as a chord. */
    const held = events.every((e, i) => i === 0
      || overlap(events[i - 1].notes[0], e.notes[0]) > 0.5);
    const spread = events[events.length - 1].start - events[0].start;
    if (held && spread <= MAX_ROLL * 1.6) return 'arpeggio';
    return 'sequence';
  }
  return 'mixed';
}

/**
 * The pitches sounding at a given moment.
 * Asked by the harmony reader and by the comparison, both of which want what
 * was sounding rather than what was struck.
 */
export function soundingAt(notes, time) {
  const out = [];
  for (const n of notes) if (n.start <= time && n.end > time) out.push(n.midi);
  return out.sort((a, b) => a - b);
}

/**
 * Rebuild the events from notes that have been through the rhythm stage.
 *
 * Quantisation works on copies, so the event records made from the performance
 * no longer point at the notes that will be engraved.  Every note still
 * carries the event it belongs to, which is what makes the grouping survive
 * the journey: the events are reassembled from that rather than guessed at a
 * second time.  A note with no event of its own — one the correction loop
 * added, say — becomes an event by itself.
 */
export function eventsOf(notes) {
  const map = new Map();
  let loose = -1;
  for (const n of notes) {
    const key = n.eventId === undefined ? `loose${loose--}` : n.eventId;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(n);
  }
  const out = [];
  for (const [key, list] of map) {
    list.sort((a, b) => a.midi - b.midi);
    out.push({
      id: key,
      notes: list,
      pitches: list.map((n) => n.midi),
      low: list[0].midi,
      high: list[list.length - 1].midi,
      span: list[list.length - 1].midi - list[0].midi,
      time: list[0].start,
      startTicks: Math.min(...list.map((n) => n.startTicks ?? 0)),
      endTicks: Math.max(...list.map((n) => n.endTicks ?? 0)),
      kind: list[0].eventKind || (list.length > 1 ? 'chord' : 'single'),
      rolled: list[0].eventKind === 'rolled',
    });
  }
  return out.sort((a, b) => a.startTicks - b.startTicks || a.low - b.low);
}

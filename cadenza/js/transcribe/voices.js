/* Cadenza — sorting notes into hands, voices and chords.
 *
 * A pianist's two hands produce one stream of notes, and writing that stream
 * out as a single line is the difference between a transcription and a mess.
 * What is needed is the division back into parts: which hand played what,
 * which notes belong to the same chord, and where one staff is carrying two
 * independent lines at once.
 *
 * The hand split is found for the whole take at once rather than note by note.
 * A choice that looks right for one chord — put the low note in the left hand —
 * can be wrong for the passage, because hands do not leap back and forth; they
 * stay where they are and move when the music moves.  So the split is the path
 * through the piece that keeps each hand within its reach while changing
 * position as little as possible.
 */

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

  /* One hand with nothing in it means the music sits on a single staff. */
  const used = new Set(notes.map((x) => x.staff));
  if (used.size === 1) for (const note of notes) note.staff = 0;
  return { splits, staves: used.size };
}

/* ------------------------------------------------------------------ voices */

/**
 * Split one staff into independent lines.
 *
 * Notes that begin together and end together are a chord and stay in one
 * voice.  A note that begins while another is still sounding, and outlasts it
 * or is outlasted by it, is a second line and needs its own — that is what
 * makes a held bass under a moving inner part readable instead of a thicket of
 * ties.
 */
export function assignVoices(notes, { maxVoices = 4 } = {}) {
  const groups = new Map();
  for (const n of notes) {
    const key = n.startTicks + ':' + n.endTicks;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(n);
  }
  const chords = [...groups.values()]
    .map((list) => ({
      start: list[0].startTicks,
      end: list[0].endTicks,
      notes: list,
      mean: list.reduce((a, x) => a + x.midi, 0) / list.length,
    }))
    .sort((a, b) => a.start - b.start || b.mean - a.mean);

  const voices = [];
  for (const chord of chords) {
    let pick = -1;
    let bestGap = Infinity;
    voices.forEach((v, i) => {
      if (v.end > chord.start + 1) return;              // still sounding
      const gap = Math.abs(v.mean - chord.mean) + (chord.start - v.end) / 960;
      if (gap < bestGap) { bestGap = gap; pick = i; }
    });
    if (pick < 0 && voices.length < maxVoices) {
      voices.push({ end: 0, mean: chord.mean, chords: [] });
      pick = voices.length - 1;
    }
    if (pick < 0) {
      /* More simultaneous lines than a staff can show: fold this one into the
       * nearest voice and let the chord carry it. */
      pick = 0;
      let near = Infinity;
      voices.forEach((v, i) => {
        const d = Math.abs(v.mean - chord.mean);
        if (d < near) { near = d; pick = i; }
      });
    }
    const v = voices[pick];
    v.chords.push(chord);
    v.end = Math.max(v.end, chord.end);
    v.mean = (v.mean + chord.mean) / 2;
  }

  /* Highest line first: that is the order a reader expects, and the order the
   * engraver uses to decide stem directions. */
  voices.sort((a, b) => {
    const am = a.chords.reduce((s, c) => s + c.mean, 0) / Math.max(1, a.chords.length);
    const bm = b.chords.reduce((s, c) => s + c.mean, 0) / Math.max(1, b.chords.length);
    return bm - am;
  });
  voices.forEach((v, i) => {
    for (const c of v.chords) for (const note of c.notes) note.voice = i;
  });
  return voices.length;
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

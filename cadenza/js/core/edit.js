/* Cadenza — editing operations.
 *
 * Everything the user can do to a score goes through here, so that undo,
 * bar-filling and spanner hygiene are handled in one place rather than
 * scattered through the UI.
 */

import { pitch, toMidi, diatonic, fromDiatonic, octaveShift, keyAlterations } from './theory.js';
import {
  measureTicks, durationTicks, eventTicks, durationForTicks, splitIntoDurations
} from './rhythm.js';
import {
  makeNote, makeRest, cloneEvent, newId, makeMeasureSpec, makePartMeasure, makePart, timeSigAt,
  clefAt, tickAt, indexAtTick, normalizeMeasure, normalizeScore, pruneSpanners, locateEvent,
  getVoice, insertMeasures as modelInsertMeasures, removeMeasures as modelRemoveMeasures,
  writtenFifths, autoScale
} from './model.js';
import { getInstrument, scoreOrder } from './instruments.js';

/* ------------------------------------------------------------- primitives */

/** Event start/end ticks within a voice. */
export function voiceSpans(voice) {
  const spans = [];
  let t = 0;
  for (let i = 0; i < voice.length; i++) {
    const ev = voice[i];
    const len = ev.grace ? 0 : eventTicks(ev);
    spans.push({ index: i, event: ev, start: t, end: t + len });
    t += len;
  }
  return spans;
}

/**
 * Replace the tick range [start, start+length) of a voice with `newEvents`.
 * Anything partially overlapped is shortened; leftover space becomes rests.
 * Returns the index at which the new material was inserted.
 */
export function spliceSpan(voice, ts, start, length, newEvents) {
  const total = measureTicks(ts);
  const end = Math.min(start + length, total);
  const kept = [];
  let insertAt = -1;

  for (const span of voiceSpans(voice)) {
    const ev = span.event;
    if (ev.grace) {
      if (span.start < end) kept.push(ev);
      continue;
    }
    if (span.end <= start || span.start >= end) {
      kept.push(ev);
      continue;
    }
    /* Head fragment that survives before the replaced range. */
    if (span.start < start) {
      const headLen = start - span.start;
      for (const d of splitIntoDurations(headLen, span.start, ts)) {
        const frag = cloneEvent(ev);
        frag.duration = d.id;
        frag.dots = d.dots;
        frag.fullMeasure = false;
        frag.slur = null;
        if (frag.type === 'note') for (const n of frag.notes) n.tie = null;
        kept.push(frag);
      }
    }
    if (insertAt < 0) insertAt = kept.length;
    /* Tail fragment that survives after the replaced range. */
    if (span.end > end) {
      const tailLen = span.end - end;
      const tail = [];
      for (const d of splitIntoDurations(tailLen, end, ts)) {
        tail.push(makeRest(d.id, { dots: d.dots, tuplet: ev.tuplet }));
      }
      span.tail = tail;
    }
    if (span.tail) kept.push({ __tail: span.tail });
  }

  if (insertAt < 0) {
    /* Range lies past the end of the written material. */
    insertAt = kept.length;
    const written = kept.reduce((a, e) => a + (e.__tail ? 0 : e.grace ? 0 : eventTicks(e)), 0);
    if (written < start) {
      for (const d of splitIntoDurations(start - written, written, ts)) {
        kept.splice(insertAt++, 0, makeRest(d.id, { dots: d.dots }));
      }
    }
  }

  const flat = [];
  for (const e of kept) {
    if (e.__tail) flat.push(...e.__tail);
    else flat.push(e);
  }
  const pos = insertAt <= 0 ? 0 : Math.min(
    flat.length,
    kept.slice(0, insertAt).reduce((a, e) => a + (e.__tail ? e.__tail.length : 1), 0),
  );
  flat.splice(pos, 0, ...newEvents);

  voice.length = 0;
  voice.push(...flat);

  /* Fill any hole left behind the replacement. */
  const used = voice.reduce((a, e) => a + (e.grace ? 0 : eventTicks(e)), 0);
  if (used < total) {
    for (const d of splitIntoDurations(total - used, used, ts)) voice.push(makeRest(d.id, { dots: d.dots }));
  }
  for (const ev of voice) if (voice.length > 1) ev.fullMeasure = false;
  return pos;
}

/* -------------------------------------------------------------- note entry */

/**
 * Write a note (or add to a chord) at the cursor.
 * `cursor` is { partIndex, staff, measure, voice, tick }.
 * Returns the new cursor position.
 */
export function enterNote(app, cursor, p, { chord = false, duration, dots = 0, tuplet = null, tie = false } = {}) {
  const { score, history } = app;
  const part = score.parts[cursor.partIndex];
  if (!part) return cursor;
  ensureMeasure(app, cursor.measure);
  const ts = timeSigAt(score, cursor.measure);
  const voice = getVoice(score, cursor.partIndex, cursor.measure, cursor.voice);
  const durId = duration || cursor.duration || 'quarter';
  const len = durationTicks(durId, dots, tuplet);

  history.begin(chord ? 'Add note to chord' : 'Enter note');
  history.touch(cursor.partIndex, cursor.measure);

  if (chord) {
    const idx = indexAtTick(voice, cursor.tick);
    const target = idx >= 0 ? voice[idx] : null;
    if (target && target.type === 'note' && tickAt(voice, idx) === cursor.tick) {
      if (!target.notes.some((n) => toMidi(n.pitch) === toMidi(p))) {
        target.notes.push({ pitch: p, tie: null, accidental: 'auto', head: 'normal', parenthesized: false });
        target.notes.sort((a, b) => toMidi(a.pitch) - toMidi(b.pitch));
      }
      history.commit();
      return cursor;
    }
  }

  const ev = makeNote(p, durId, { dots, tuplet });
  spliceSpan(voice, ts, cursor.tick, len, [ev]);
  if (tie) applyTieForward(app, part, cursor.measure, cursor.voice, ev);
  normalizeMeasure(score, part, cursor.measure);
  history.commit();
  return advanceCursor(app, cursor, len);
}

export function enterRest(app, cursor, { duration, dots = 0, tuplet = null } = {}) {
  const { score, history } = app;
  const part = score.parts[cursor.partIndex];
  if (!part) return cursor;
  ensureMeasure(app, cursor.measure);
  const ts = timeSigAt(score, cursor.measure);
  const voice = getVoice(score, cursor.partIndex, cursor.measure, cursor.voice);
  const durId = duration || cursor.duration || 'quarter';
  const len = durationTicks(durId, dots, tuplet);
  history.begin('Enter rest');
  history.touch(cursor.partIndex, cursor.measure);
  spliceSpan(voice, ts, cursor.tick, len, [makeRest(durId, { dots, tuplet })]);
  normalizeMeasure(score, part, cursor.measure);
  history.commit();
  return advanceCursor(app, cursor, len);
}

/** Move the cursor forward by `len` ticks, rolling into following measures. */
export function advanceCursor(app, cursor, len) {
  const { score } = app;
  let m = cursor.measure;
  let tick = cursor.tick + len;
  let guard = 0;
  while (tick >= measureTicks(timeSigAt(score, m)) && guard++ < 64) {
    tick -= measureTicks(timeSigAt(score, m));
    m++;
    if (m >= score.measures.length) {
      appendMeasure(app);
    }
  }
  return { ...cursor, measure: Math.min(m, score.measures.length - 1), tick };
}

export function retreatCursor(app, cursor, len) {
  const { score } = app;
  let m = cursor.measure;
  let tick = cursor.tick - len;
  while (tick < 0 && m > 0) {
    m--;
    tick += measureTicks(timeSigAt(score, m));
  }
  return { ...cursor, measure: Math.max(0, m), tick: Math.max(0, tick) };
}

/** Snap the cursor to the start of the event it currently sits inside. */
export function snapCursor(app, cursor) {
  const voice = getVoice(app.score, cursor.partIndex, cursor.measure, cursor.voice);
  if (!voice) return cursor;
  const idx = indexAtTick(voice, cursor.tick);
  if (idx < 0) return cursor;
  return { ...cursor, tick: tickAt(voice, idx) };
}

/** Step the cursor to the next / previous notated event. */
export function stepCursor(app, cursor, dir) {
  const { score } = app;
  const voice = getVoice(score, cursor.partIndex, cursor.measure, cursor.voice);
  if (!voice) return cursor;
  const idx = indexAtTick(voice, cursor.tick);
  if (dir > 0) {
    const next = idx >= 0 ? idx + 1 : 0;
    if (next < voice.length) return { ...cursor, tick: tickAt(voice, next) };
    if (cursor.measure + 1 < score.measures.length) return { ...cursor, measure: cursor.measure + 1, tick: 0 };
    return cursor;
  }
  if (idx > 0) return { ...cursor, tick: tickAt(voice, idx - 1) };
  if (cursor.measure > 0) {
    const prev = getVoice(score, cursor.partIndex, cursor.measure - 1, cursor.voice);
    const last = prev && prev.length ? tickAt(prev, prev.length - 1) : 0;
    return { ...cursor, measure: cursor.measure - 1, tick: last };
  }
  return cursor;
}

function ensureMeasure(app, index) {
  while (app.score.measures.length <= index) appendMeasure(app);
}

export function appendMeasure(app) {
  const { score, history } = app;
  history.begin('Add measure');
  history.touchAll();
  score.measures.push(makeMeasureSpec());
  for (const part of score.parts) part.measures.push(makePartMeasure(part.staves));
  const last = score.measures.length - 1;
  if (last > 0 && score.measures[last - 1].barline === 'final') score.measures[last - 1].barline = 'normal';
  score.measures[last].barline = 'final';
  normalizeScore(score);
  history.commit();
}

/* ----------------------------------------------------------- note editing */

export function setDuration(app, targets, durationId, dots = 0) {
  const { score, history } = app;
  if (!targets.length) return;
  history.begin('Change duration');
  const touched = new Set();
  for (const t of targets) {
    const loc = locateEvent(score, t);
    if (!loc) continue;
    history.touch(loc.partIndex, loc.measure);
    touched.add(loc.partIndex + ':' + loc.measure);
    const ts = timeSigAt(score, loc.measure);
    const voice = loc.part.measures[loc.measure].voices[loc.voice];
    const start = tickAt(voice, loc.index);
    const ev = cloneEvent(loc.event);
    ev.id = loc.event.id;
    ev.duration = durationId;
    ev.dots = dots;
    ev.fullMeasure = false;
    spliceSpan(voice, ts, start, durationTicks(durationId, dots, ev.tuplet), [ev]);
  }
  for (const key of touched) {
    const [pi, m] = key.split(':').map(Number);
    normalizeMeasure(score, score.parts[pi], m);
  }
  history.commit();
}

export function toggleDots(app, targets, dots) {
  const { score } = app;
  const first = targets.length ? locateEvent(score, targets[0]) : null;
  if (!first) return;
  const next = first.event.dots === dots ? 0 : dots;
  setDuration(app, targets, first.event.duration, next);
}

/** Adjust pitch by diatonic steps (or whole octaves). */
export function transposeTargets(app, targets, { steps = 0, octaves = 0, semitones = 0 }) {
  const { score, history } = app;
  if (!targets.length) return;
  history.begin(octaves ? 'Octave shift' : 'Transpose');
  for (const t of targets) {
    const loc = locateEvent(score, t);
    if (!loc || loc.event.type !== 'note') continue;
    history.touch(loc.partIndex, loc.measure);
    const clef = clefAt(score, loc.part, loc.measure, 0);
    for (const n of loc.event.notes) {
      if (octaves) { n.pitch = octaveShift(n.pitch, octaves); continue; }
      if (steps) {
        /* Step to the next staff position and take the accidental the key
         * signature gives it: moving F-sharp up a step must reach G, not
         * G-sharp. */
        const base = fromDiatonic(diatonic(n.pitch) + steps);
        const fifths = writtenFifths(score, loc.part, loc.measure);
        n.pitch = pitch(base.step, base.octave, keyAlterations(fifths)[base.step]);
        n.accidental = 'auto';
        continue;
      }
      if (semitones) {
        const m = toMidi(n.pitch) + semitones;
        const base = fromDiatonic(diatonic(n.pitch) + Math.round((semitones * 7) / 12));
        const natural = toMidi(pitch(base.step, base.octave, 0));
        n.pitch = pitch(base.step, base.octave, Math.max(-2, Math.min(2, m - natural)));
      }
    }
    loc.event.notes.sort((a, b) => toMidi(a.pitch) - toMidi(b.pitch));
  }
  history.commit();
}

export function setAccidental(app, targets, alter, { noteIndex = null } = {}) {
  const { score, history } = app;
  history.begin('Accidental');
  for (const t of targets) {
    const loc = locateEvent(score, t);
    if (!loc || loc.event.type !== 'note') continue;
    history.touch(loc.partIndex, loc.measure);
    const notes = noteIndex === null ? loc.event.notes : [loc.event.notes[noteIndex]].filter(Boolean);
    for (const n of notes) {
      if (alter === 'none') { n.accidental = 'none'; continue; }
      n.pitch = pitch(n.pitch.step, n.pitch.octave, alter);
      n.accidental = 'auto';
    }
  }
  history.commit();
}

/** Nudge the accidental of a note up or down a semitone, respelling as needed. */
export function alterTargets(app, targets, delta) {
  const { score, history } = app;
  history.begin(delta > 0 ? 'Raise' : 'Lower');
  for (const t of targets) {
    const loc = locateEvent(score, t);
    if (!loc || loc.event.type !== 'note') continue;
    history.touch(loc.partIndex, loc.measure);
    for (const n of loc.event.notes) {
      const next = n.pitch.alter + delta;
      if (next > 2 || next < -2) continue;
      n.pitch = pitch(n.pitch.step, n.pitch.octave, next);
      n.accidental = 'auto';
    }
  }
  history.commit();
}

/** Respell a note enharmonically (F# <-> Gb). */
export function respell(app, targets) {
  const { score, history } = app;
  history.begin('Respell');
  for (const t of targets) {
    const loc = locateEvent(score, t);
    if (!loc || loc.event.type !== 'note') continue;
    history.touch(loc.partIndex, loc.measure);
    for (const n of loc.event.notes) {
      const m = toMidi(n.pitch);
      const up = fromDiatonic(diatonic(n.pitch) + 1);
      const down = fromDiatonic(diatonic(n.pitch) - 1);
      const upAlter = m - toMidi(pitch(up.step, up.octave, 0));
      const downAlter = m - toMidi(pitch(down.step, down.octave, 0));
      if (n.pitch.alter > 0 && Math.abs(upAlter) <= 2) n.pitch = pitch(up.step, up.octave, upAlter);
      else if (n.pitch.alter < 0 && Math.abs(downAlter) <= 2) n.pitch = pitch(down.step, down.octave, downAlter);
      else if (Math.abs(upAlter) <= 2) n.pitch = pitch(up.step, up.octave, upAlter);
      else if (Math.abs(downAlter) <= 2) n.pitch = pitch(down.step, down.octave, downAlter);
      n.accidental = 'auto';
    }
  }
  history.commit();
}

export function deleteTargets(app, targets, { toRest = true } = {}) {
  const { score, history } = app;
  if (!targets.length) return;
  history.begin('Delete');
  const touched = new Set();
  for (const t of targets) {
    const loc = locateEvent(score, t);
    if (!loc) continue;
    history.touch(loc.partIndex, loc.measure);
    touched.add(loc.partIndex + ':' + loc.measure);
    const voice = loc.part.measures[loc.measure].voices[loc.voice];
    const idx = voice.findIndex((e) => e.id === t);
    if (idx < 0) continue;
    if (toRest) {
      voice[idx] = makeRest(loc.event.duration, { dots: loc.event.dots, tuplet: loc.event.tuplet });
    } else {
      voice.splice(idx, 1);
    }
  }
  for (const key of touched) {
    const [pi, m] = key.split(':').map(Number);
    normalizeMeasure(score, score.parts[pi], m);
  }
  history.touchGlobal();
  pruneSpanners(score);
  history.commit();
}

/** Remove one pitch from a chord (or the whole event if it is the last). */
export function deleteNoteFromChord(app, eventId, noteIndex) {
  const { score, history } = app;
  const loc = locateEvent(score, eventId);
  if (!loc || loc.event.type !== 'note') return;
  history.begin('Remove note');
  history.touch(loc.partIndex, loc.measure);
  if (loc.event.notes.length <= 1) {
    const voice = loc.part.measures[loc.measure].voices[loc.voice];
    voice[loc.index] = makeRest(loc.event.duration, { dots: loc.event.dots, tuplet: loc.event.tuplet });
  } else {
    loc.event.notes.splice(noteIndex, 1);
  }
  history.commit();
}

/* ------------------------------------------------------- marks & markings */

export function toggleArticulation(app, targets, id) {
  const { score, history } = app;
  history.begin('Articulation');
  const all = targets.map((t) => locateEvent(score, t)).filter(Boolean);
  const on = !all.every((l) => l.event.articulations.includes(id));
  for (const loc of all) {
    history.touch(loc.partIndex, loc.measure);
    const a = loc.event.articulations;
    const i = a.indexOf(id);
    if (on && i < 0) a.push(id);
    if (!on && i >= 0) a.splice(i, 1);
  }
  history.commit();
}

export function toggleOrnament(app, targets, id) {
  const { score, history } = app;
  history.begin('Ornament');
  const all = targets.map((t) => locateEvent(score, t)).filter(Boolean);
  const on = !all.every((l) => l.event.ornaments.includes(id));
  for (const loc of all) {
    history.touch(loc.partIndex, loc.measure);
    const a = loc.event.ornaments;
    const i = a.indexOf(id);
    if (on && i < 0) a.push(id);
    if (!on && i >= 0) a.splice(i, 1);
  }
  history.commit();
}

export function setDynamic(app, targets, id) {
  const { score, history } = app;
  history.begin('Dynamic');
  for (const t of targets) {
    const loc = locateEvent(score, t);
    if (!loc) continue;
    history.touch(loc.partIndex, loc.measure);
    loc.event.dynamic = loc.event.dynamic === id ? null : id;
  }
  history.commit();
}

export function setTremolo(app, targets, strokes) {
  const { score, history } = app;
  history.begin('Tremolo');
  for (const t of targets) {
    const loc = locateEvent(score, t);
    if (!loc) continue;
    history.touch(loc.partIndex, loc.measure);
    loc.event.tremolo = loc.event.tremolo === strokes ? 0 : strokes;
  }
  history.commit();
}

export function toggleArpeggio(app, targets) {
  const { score, history } = app;
  history.begin('Arpeggio');
  for (const t of targets) {
    const loc = locateEvent(score, t);
    if (!loc) continue;
    history.touch(loc.partIndex, loc.measure);
    loc.event.arpeggio = !loc.event.arpeggio;
  }
  history.commit();
}

export function setStemDirection(app, targets, dir) {
  const { score, history } = app;
  history.begin('Stem direction');
  for (const t of targets) {
    const loc = locateEvent(score, t);
    if (!loc) continue;
    history.touch(loc.partIndex, loc.measure);
    loc.event.stemDir = loc.event.stemDir === dir ? 'auto' : dir;
  }
  history.commit();
}

export function addText(app, targets, content, style = 'expression', placement = 'below') {
  const { score, history } = app;
  history.begin('Add text');
  for (const t of targets) {
    const loc = locateEvent(score, t);
    if (!loc) continue;
    history.touch(loc.partIndex, loc.measure);
    loc.event.texts.push({ content, style, placement });
  }
  history.commit();
}

export function setLyric(app, eventId, verse, text, syllabic = 'single') {
  const { score, history } = app;
  const loc = locateEvent(score, eventId);
  if (!loc) return;
  history.begin('Lyrics');
  history.touch(loc.partIndex, loc.measure);
  const existing = loc.event.lyrics.find((l) => l.verse === verse);
  if (!text) {
    loc.event.lyrics = loc.event.lyrics.filter((l) => l.verse !== verse);
  } else if (existing) {
    existing.text = text;
    existing.syllabic = syllabic;
  } else {
    loc.event.lyrics.push({ verse, text, syllabic });
  }
  history.commit();
}

export function setChordSymbol(app, eventId, symbol) {
  const { score, history } = app;
  const loc = locateEvent(score, eventId);
  if (!loc) return;
  history.begin('Chord symbol');
  history.touch(loc.partIndex, loc.measure);
  loc.event.chordSymbol = symbol || null;
  history.commit();
}

export function setRoman(app, eventId, text) {
  const { score, history } = app;
  const loc = locateEvent(score, eventId);
  if (!loc) return;
  history.begin('Roman numeral');
  history.touch(loc.partIndex, loc.measure);
  loc.event.roman = text || null;
  history.commit();
}

export function setFingering(app, eventId, noteIndex, text) {
  const { score, history } = app;
  const loc = locateEvent(score, eventId);
  if (!loc) return;
  history.begin('Fingering');
  history.touch(loc.partIndex, loc.measure);
  loc.event.fingerings = loc.event.fingerings.filter((f) => f.note !== noteIndex);
  if (text) loc.event.fingerings.push({ note: noteIndex, text });
  history.commit();
}

export function toggleGrace(app, targets, type = 'acciaccatura') {
  const { score, history } = app;
  history.begin('Grace note');
  const touched = new Set();
  for (const t of targets) {
    const loc = locateEvent(score, t);
    if (!loc || loc.event.type !== 'note') continue;
    history.touch(loc.partIndex, loc.measure);
    touched.add(loc.partIndex + ':' + loc.measure);
    if (loc.event.grace) {
      loc.event.grace = null;
    } else {
      loc.event.grace = { type, slash: type === 'acciaccatura' };
      loc.event.duration = loc.event.duration === 'quarter' ? 'eighth' : loc.event.duration;
    }
  }
  for (const key of touched) {
    const [pi, m] = key.split(':').map(Number);
    normalizeMeasure(score, score.parts[pi], m);
  }
  history.commit();
}

/* ------------------------------------------------------------------- ties */

export function toggleTie(app, targets) {
  const { score, history } = app;
  history.begin('Tie');
  for (const t of targets) {
    const loc = locateEvent(score, t);
    if (!loc || loc.event.type !== 'note') continue;
    history.touch(loc.partIndex, loc.measure);
    const tied = loc.event.notes.some((n) => n.tie === 'start' || n.tie === 'both');
    if (tied) {
      clearTieForward(app, loc);
    } else {
      applyTieForward(app, loc.part, loc.measure, loc.voice, loc.event);
      history.touch(loc.partIndex, Math.min(loc.measure + 1, loc.part.measures.length - 1));
    }
  }
  history.commit();
}

function nextEvent(part, measure, voiceIdx, index) {
  const voice = part.measures[measure].voices[voiceIdx] || [];
  for (let i = index + 1; i < voice.length; i++) if (!voice[i].grace) return { event: voice[i], measure };
  for (let m = measure + 1; m < part.measures.length; m++) {
    const v = part.measures[m].voices[voiceIdx] || [];
    for (const ev of v) if (!ev.grace) return { event: ev, measure: m };
    break;
  }
  return null;
}

function applyTieForward(app, part, measure, voiceIdx, ev) {
  const voice = part.measures[measure].voices[voiceIdx] || [];
  const idx = voice.indexOf(ev);
  const nxt = nextEvent(part, measure, voiceIdx, idx);
  if (!nxt || nxt.event.type !== 'note') return;
  for (const n of ev.notes) {
    const match = nxt.event.notes.find((x) => toMidi(x.pitch) === toMidi(n.pitch));
    if (match) {
      n.tie = n.tie === 'stop' ? 'both' : 'start';
      match.tie = match.tie === 'start' ? 'both' : 'stop';
    }
  }
}

function clearTieForward(app, loc) {
  const nxt = nextEvent(loc.part, loc.measure, loc.voice, loc.index);
  for (const n of loc.event.notes) n.tie = n.tie === 'both' ? 'stop' : n.tie === 'start' ? null : n.tie;
  if (nxt && nxt.event.type === 'note') {
    for (const n of nxt.event.notes) n.tie = n.tie === 'both' ? 'start' : n.tie === 'stop' ? null : n.tie;
  }
}

/* --------------------------------------------------------------- spanners */

export function addSpanner(app, type, fromId, toId, opts = {}) {
  const { score, history } = app;
  if (!fromId || !toId) return null;
  const a = locateEvent(score, fromId);
  const b = locateEvent(score, toId);
  if (!a || !b || a.partIndex !== b.partIndex) return null;
  history.begin(opts.label || 'Add line');
  history.touchGlobal();
  const existing = score.spanners.find((s) => s.type === type && s.fromId === fromId && s.toId === toId);
  if (existing) {
    score.spanners = score.spanners.filter((s) => s !== existing);
  } else {
    score.spanners.push({
      id: newId('s'), type, partId: a.part.id, fromId, toId,
      placement: opts.placement || (type === 'slur' ? 'auto' : 'below'), ...opts,
    });
  }
  history.commit();
  return type;
}

export function removeSpanners(app, ids) {
  const { score, history } = app;
  history.begin('Remove line');
  history.touchGlobal();
  score.spanners = score.spanners.filter((s) => !ids.includes(s.id));
  history.commit();
}

/* --------------------------------------------------------------- tuplets */

/**
 * Turn the span starting at `targets[0]` into a tuplet.  The tuplet occupies
 * the same total time; `actual` notes now fit where `normal` used to.
 */
export function makeTuplet(app, targets, actual, normal) {
  const { score, history } = app;
  if (!targets.length) return;
  const loc = locateEvent(score, targets[0]);
  if (!loc) return;
  history.begin(`${actual}:${normal} tuplet`);
  history.touch(loc.partIndex, loc.measure);
  const ts = timeSigAt(score, loc.measure);
  const voice = loc.part.measures[loc.measure].voices[loc.voice];
  const start = tickAt(voice, loc.index);
  const base = loc.event;
  const span = eventTicks(base);
  /* Each member must last span/actual, so its written value is span/normal. */
  const member = durationForTicks(Math.round(span / normal));
  if (!member) { history.cancel(); return; }
  const tupletId = newId('t');
  const tuplet = { id: tupletId, actual, normal, bracket: true, number: true };
  const events = [];
  for (let i = 0; i < actual; i++) {
    const e = i === 0 && base.type === 'note' ? cloneEvent(base) : makeRest(member.id);
    e.tuplet = { ...tuplet };
    e.duration = member.id;
    e.dots = member.dots;
    e.fullMeasure = false;
    events.push(e);
  }
  spliceSpan(voice, ts, start, span, events);
  normalizeMeasure(score, loc.part, loc.measure);
  history.commit();
}

export function removeTuplet(app, targets) {
  const { score, history } = app;
  const loc = targets.length ? locateEvent(score, targets[0]) : null;
  if (!loc || !loc.event.tuplet) return;
  history.begin('Remove tuplet');
  history.touch(loc.partIndex, loc.measure);
  const tid = loc.event.tuplet.id;
  const voice = loc.part.measures[loc.measure].voices[loc.voice];
  const keep = voice.filter((e) => !e.tuplet || e.tuplet.id !== tid);
  const first = voice.find((e) => e.tuplet && e.tuplet.id === tid);
  if (first) {
    first.tuplet = null;
    const at = voice.indexOf(first);
    keep.splice(Math.min(at, keep.length), 0, first);
  }
  voice.length = 0;
  voice.push(...keep);
  normalizeMeasure(score, loc.part, loc.measure);
  history.commit();
}

/* ------------------------------------------------------------- structure */

export function setTimeSignature(app, measureIndex, ts) {
  const { score, history } = app;
  history.begin('Time signature');
  history.touchAll();
  score.measures[measureIndex].timeSig = { ...ts };
  /* Re-fill every bar from here until the next explicit change. */
  let end = score.measures.length - 1;
  for (let m = measureIndex + 1; m < score.measures.length; m++) {
    if (score.measures[m].timeSig) { end = m - 1; break; }
  }
  for (const part of score.parts) {
    for (let m = measureIndex; m <= end; m++) normalizeMeasure(score, part, m);
  }
  history.commit();
}

export function setKeySignature(app, measureIndex, fifths, mode = 'major') {
  const { score, history } = app;
  history.begin('Key signature');
  history.touchGlobal();
  score.measures[measureIndex].keySig = { fifths, mode };
  history.commit();
}

export function setClef(app, partIndex, measureIndex, staff, clefId) {
  const { score, history } = app;
  const part = score.parts[partIndex];
  if (!part) return;
  history.begin('Clef');
  history.touch(partIndex, measureIndex);
  if (measureIndex === 0) {
    if (staff === 1) part.clef2 = clefId; else part.clef = clefId;
    history.touchAll();
  } else {
    const pm = part.measures[measureIndex];
    pm.clefChange = pm.clefChange || {};
    pm.clefChange[staff] = clefId;
  }
  history.commit();
}

export function setTempo(app, measureIndex, bpm, unit = 'quarter', text = null) {
  const { score, history } = app;
  history.begin('Tempo');
  history.touchGlobal();
  score.measures[measureIndex].tempo = { bpm, unit, text };
  if (measureIndex === 0) score.tempo = bpm;
  history.commit();
}

export function setBarline(app, measureIndex, style) {
  const { score, history } = app;
  history.begin('Barline');
  history.touchGlobal();
  score.measures[measureIndex].barline = style;
  history.commit();
}

export function setRehearsalMark(app, measureIndex, text) {
  const { score, history } = app;
  history.begin('Rehearsal mark');
  history.touchGlobal();
  score.measures[measureIndex].rehearsal = text || null;
  history.commit();
}

export function toggleSystemBreak(app, measureIndex) {
  const { score, history } = app;
  history.begin('System break');
  history.touchGlobal();
  const m = score.measures[measureIndex];
  m.systemBreak = !m.systemBreak;
  history.commit();
}

export function insertMeasures(app, at, count = 1) {
  const { score, history } = app;
  history.begin(count > 1 ? `Insert ${count} measures` : 'Insert measure');
  history.touchAll();
  modelInsertMeasures(score, at, count);
  history.commit();
}

export function removeMeasures(app, at, count = 1) {
  const { score, history } = app;
  history.begin(count > 1 ? `Delete ${count} measures` : 'Delete measure');
  history.touchAll();
  const ok = modelRemoveMeasures(score, at, count);
  if (!ok) { history.cancel(); return false; }
  history.commit();
  return true;
}

/* ------------------------------------------------------------------ parts */

export function addPart(app, instrumentId, at = null) {
  const { score, history } = app;
  history.begin('Add instrument');
  history.touchAll();
  const part = makePart(instrumentId, score.measures.length);
  let index = at;
  if (index === null) {
    index = score.parts.findIndex((p) => scoreOrder(p.instrumentId) > scoreOrder(instrumentId));
    if (index < 0) index = score.parts.length;
  }
  score.parts.splice(index, 0, part);
  autoScale(score);
  normalizeScore(score);
  history.commit();
  return index;
}

export function removePart(app, partIndex) {
  const { score, history } = app;
  if (score.parts.length <= 1) return false;
  history.begin('Remove instrument');
  history.touchAll();
  score.parts.splice(partIndex, 1);
  autoScale(score);
  pruneSpanners(score);
  history.commit();
  return true;
}

export function movePart(app, from, to) {
  const { score, history } = app;
  if (to < 0 || to >= score.parts.length || from === to) return;
  history.begin('Reorder instruments');
  history.touchAll();
  const [p] = score.parts.splice(from, 1);
  score.parts.splice(to, 0, p);
  history.commit();
}

export function updatePart(app, partIndex, props) {
  const { score, history } = app;
  const part = score.parts[partIndex];
  if (!part) return;
  history.begin('Instrument settings');
  history.touchAll();
  Object.assign(part, props);
  if (props.instrumentId) {
    const inst = getInstrument(props.instrumentId);
    part.name = inst.name;
    part.abbrev = inst.abbrev;
    part.program = inst.program;
    part.synth = inst.synth;
    part.transpose = { ...inst.transpose };
    part.clef = inst.clef;
    part.clef2 = inst.clef2 || null;
    part.staves = inst.staves;
  }
  history.commit();
}

/** Move notes to the other staff of a grand-staff instrument. */
export function setEventStaff(app, targets, staff) {
  const { score, history } = app;
  if (!targets.length) return;
  history.begin('Cross-staff');
  for (const t of targets) {
    const loc = locateEvent(score, t);
    if (!loc || (loc.part.staves || 1) < 2) continue;
    history.touch(loc.partIndex, loc.measure);
    const home = loc.voice % 2 === 0 ? 0 : 1;
    const next = staff === null || staff === home ? null
      : Math.max(0, Math.min((loc.part.staves || 1) - 1, staff));
    loc.event.staff = next;
  }
  history.commit();
}

/** Nudge the selection up or down one staff. */
export function moveAcrossStaff(app, targets, delta) {
  const { score } = app;
  const loc = targets.length ? locateEvent(score, targets[0]) : null;
  if (!loc || (loc.part.staves || 1) < 2) return false;
  const home = loc.voice % 2 === 0 ? 0 : 1;
  const current = loc.event.staff === null || loc.event.staff === undefined ? home : loc.event.staff;
  setEventStaff(app, targets, current + delta);
  return true;
}

/* ---------------------------------------------------------- figured bass */

/** `figures` lists the stack from the top down, as it is spoken: ["6", "4"]. */
export function setFigures(app, eventId, figures) {
  const { score, history } = app;
  const loc = locateEvent(score, eventId);
  if (!loc) return;
  history.begin('Figured bass');
  history.touch(loc.partIndex, loc.measure);
  const list = (figures || []).map((f) => String(f).trim()).filter(Boolean);
  loc.event.figures = list.length ? list : null;
  history.commit();
}

/** Parse the usual shorthand: "6 4", "6/4", "#6", "7," into separate figures. */
export function parseFigures(text) {
  if (!text) return [];
  return String(text).trim().split(/[\s,/]+/).filter(Boolean).slice(0, 5);
}

/* ------------------------------------------------------------ voice tools */

export function addVoice(app, partIndex, measureIndex) {
  const { score, history } = app;
  const part = score.parts[partIndex];
  const pm = part && part.measures[measureIndex];
  if (!pm || pm.voices.length >= 4) return pm ? pm.voices.length - 1 : 0;
  history.begin('Add voice');
  history.touch(partIndex, measureIndex);
  pm.voices.push([]);
  normalizeMeasure(score, part, measureIndex);
  history.commit();
  return pm.voices.length - 1;
}

export function removeVoice(app, partIndex, measureIndex, voiceIndex) {
  const { score, history } = app;
  const part = score.parts[partIndex];
  const pm = part && part.measures[measureIndex];
  if (!pm || voiceIndex === 0 || !pm.voices[voiceIndex]) return;
  history.begin('Remove voice');
  history.touch(partIndex, measureIndex);
  pm.voices.splice(voiceIndex, 1);
  history.commit();
}

/* ------------------------------------------------------------ copy & paste */

/** Capture a range of measures from one part as a portable clip. */
export function copyRange(score, partIndex, fromMeasure, toMeasure) {
  const part = score.parts[partIndex];
  if (!part) return null;
  const measures = [];
  for (let m = fromMeasure; m <= toMeasure && m < part.measures.length; m++) {
    measures.push(JSON.parse(JSON.stringify(part.measures[m])));
  }
  return {
    kind: 'measures',
    measures,
    timeSig: timeSigAt(score, fromMeasure),
    specs: score.measures.slice(fromMeasure, toMeasure + 1).map((s) => JSON.parse(JSON.stringify(s))),
  };
}

/** Capture individual events (a within-bar selection). */
export function copyEvents(score, eventIds) {
  const events = [];
  for (const id of eventIds) {
    const loc = locateEvent(score, id);
    if (loc) events.push(JSON.parse(JSON.stringify(loc.event)));
  }
  return events.length ? { kind: 'events', events } : null;
}

export function pasteClip(app, clip, cursor) {
  const { score, history } = app;
  if (!clip) return cursor;
  const part = score.parts[cursor.partIndex];
  if (!part) return cursor;

  if (clip.kind === 'measures') {
    history.begin('Paste');
    history.touchAll();
    for (let i = 0; i < clip.measures.length; i++) {
      const target = cursor.measure + i;
      while (score.measures.length <= target) {
        score.measures.push(makeMeasureSpec());
        for (const p of score.parts) p.measures.push(makePartMeasure(p.staves));
      }
      const copy = JSON.parse(JSON.stringify(clip.measures[i]));
      reidMeasure(copy);
      part.measures[target] = copy;
      normalizeMeasure(score, part, target);
    }
    normalizeScore(score);
    history.commit();
    return { ...cursor, measure: Math.min(cursor.measure + clip.measures.length, score.measures.length - 1), tick: 0 };
  }

  history.begin('Paste');
  let cur = { ...cursor };
  for (const ev of clip.events) {
    history.touch(cur.partIndex, cur.measure);
    while (score.measures.length <= cur.measure) appendMeasure(app);
    const ts = timeSigAt(score, cur.measure);
    const voice = getVoice(score, cur.partIndex, cur.measure, cur.voice);
    const copy = JSON.parse(JSON.stringify(ev));
    copy.id = newId(copy.type === 'note' ? 'n' : 'r');
    copy.fullMeasure = false;
    spliceSpan(voice, ts, cur.tick, eventTicks(copy), [copy]);
    normalizeMeasure(score, part, cur.measure);
    cur = advanceCursor(app, cur, eventTicks(copy));
  }
  history.commit();
  return cur;
}

function reidMeasure(pm) {
  for (const voice of pm.voices || []) {
    for (const ev of voice) ev.id = newId(ev.type === 'note' ? 'n' : 'r');
  }
}

/* --------------------------------------------------------------- utilities */

/** All event ids in a rectangular selection of measures across parts. */
export function eventsInRange(score, partIndex, fromMeasure, toMeasure) {
  const ids = [];
  const part = score.parts[partIndex];
  if (!part) return ids;
  for (let m = fromMeasure; m <= toMeasure && m < part.measures.length; m++) {
    for (const voice of part.measures[m].voices) for (const ev of voice) ids.push(ev.id);
  }
  return ids;
}

/** Fill a measure's voice with a single whole-measure rest. */
export function clearMeasure(app, partIndex, measureIndex) {
  const { score, history } = app;
  const part = score.parts[partIndex];
  if (!part) return;
  history.begin('Clear measure');
  history.touch(partIndex, measureIndex);
  part.measures[measureIndex] = makePartMeasure(part.staves);
  normalizeMeasure(score, part, measureIndex);
  history.commit();
}

/* Cadenza — transcription, end to end.
 *
 * Audio or MIDI in, an editable score out.  The stages are deliberately
 * separate and each reports how sure it is, because the useful thing to tell
 * someone is not "here is your music" but "here is your music, and these three
 * bars are where I would look first".
 *
 * The two inputs are not equally easy and the code does not pretend otherwise.
 * MIDI states the pitches and the timing exactly, so everything from the pitch
 * stage is certain and only the musical reading — metre, key, hands, voices —
 * is inferred.  Audio has to recover the notes first, and that is the part
 * that can be wrong.
 */

import { extractNotes } from './notes.js';
import { attackEvents, estimateBeat, estimateMetre, quantise, toTicks } from './rhythm.js';
import { separateHands, assignVoices, groupChords } from './voices.js';
import { buildScore, detectKey } from './build.js';
import { beatTicks, TPQ } from '../core/rhythm.js';

export const SOURCE = { AUDIO: 'audio', MIDI: 'midi' };

/**
 * Turn note events into a score.
 *
 * Shared by both inputs: once there are notes with times, pitches and
 * confidences, the musical reading is the same problem either way.
 */
export function notesToScore(rawNotes, opts = {}) {
  const {
    duration = 0,
    bpm = null,
    grid = null,             // a fixed division, or null to choose per beat
    quantiseStrength = 1,
    timeSig = null,          // override the inferred metre
    keyFifths = null,        // override the inferred key
    splitHands = true,
    title = 'Transcription',
    composer = '',
    source = SOURCE.AUDIO,
    divisionWeights = null,
    splitCentre = 60,
    spellingLean = 0,
    octaveBias = null,
  } = opts;

  const notes = rawNotes.map((n) => ({ ...n }));
  /* Corrections this player has made before, applied before anything else so
   * the rest of the reading sees the pitches they meant. */
  if (octaveBias) {
    for (const n of notes) {
      const shift = n.midi < 48 ? octaveBias.low : n.midi < 72 ? octaveBias.mid : octaveBias.high;
      if (shift) n.midi = Math.max(0, Math.min(127, n.midi + shift * 12));
    }
  }
  if (!notes.length) {
    const { score } = buildScore([], { title, composer, staves: splitHands ? 2 : 1 });
    return { score, notes: [], analysis: { empty: true } };
  }

  const span = duration || Math.max(...notes.map((n) => n.end)) + 0.5;
  const attacks = attackEvents(notes);
  const beat = estimateBeat(attacks, span, { fixedBpm: bpm });

  /* Quantise once against a quarter-note beat to learn how the beats divide,
   * since that is what says whether the metre is simple or compound. */
  const trial = quantise(notes, beat, { division: grid, strength: quantiseStrength, divisionWeights });
  const metre = timeSig
    ? { timeSig, beatsPerBar: timeSig.beats, confidence: 1 }
    : estimateMetre(attacks, beat, trial.compound);

  const perBeat = beatTicks(metre.timeSig);
  const fitted = toTicks(trial.notes, perBeat);

  separateHands(fitted, { forceSingleStaff: !splitHands, centre: splitCentre });
  const staffCount = splitHands && new Set(fitted.map((n) => n.staff)).size > 1 ? 2 : 1;
  for (const staff of new Set(fitted.map((n) => n.staff))) {
    const ofStaff = fitted.filter((n) => n.staff === staff);
    closeGaps(ofStaff, perBeat);
    assignVoices(ofStaff);
  }

  const chords = groupChords(fitted);
  const key = keyFifths === null ? detectKey(fitted)
    : { fifths: keyFifths, mode: 'major', confidence: 1 };

  /* The tempo mark is in quarter notes however the beat was felt. */
  const quarterBpm = beat.period > 0
    ? Math.round((60 / beat.period) * (TPQ / perBeat) * 10) / 10 : 120;

  /* Which beats were played in threes, so the layout can write them as
   * triplets rather than as values that do not exist. */
  const divisions = new Map();
  for (const n of fitted) {
    const b = Math.floor(n.startTicks / perBeat);
    divisions.set(b, Math.max(divisions.get(b) || 1, n.division));
  }

  const built = buildScore(chords, {
    plan: { perBeat, divisions },
    timeSig: metre.timeSig,
    bpm: quarterBpm,
    fifths: key.fifths,
    mode: key.mode,
    staves: staffCount,
    spellingLean,
    title,
    composer,
  });

  return {
    score: built.score,
    notes: fitted,
    chords,
    analysis: {
      source,
      bpm: quarterBpm,
      beat,
      timeSig: metre.timeSig,
      key,
      measures: built.measures,
      noteCount: fitted.length,
      divisions: trial.divisions,
      confidence: {
        /* Pitch is certain from MIDI and estimated from audio; saying so is the
         * difference between a useful number and a decorative one. */
        pitch: source === SOURCE.MIDI ? 1
          : average(fitted.map((n) => n.confidence ?? 0.5)),
        rhythm: average(fitted.map((n) => n.rhythmConfidence ?? 0.5)),
        beat: beat.confidence,
        metre: metre.confidence,
        key: key.confidence,
      },
    },
  };
}

/**
 * Decide where the silences really are.
 *
 * Players lift a key a moment before the next note; that release is
 * articulation, not rhythm, and writing it down produces a page littered with
 * rests nobody played.  A gap small enough to be a release closes up — the
 * note is written as holding until the next one — while a gap long enough to
 * have been meant stays open and becomes a rest.  The notes of one chord let
 * go at slightly different moments are levelled for the same reason.
 */
function closeGaps(notes, perBeat) {
  if (!notes.length) return;
  const attacks = [...new Set(notes.map((n) => n.startTicks))].sort((a, b) => a - b);
  const hold = Math.round(perBeat * 0.34);

  /* One chord, one release. */
  const byStart = new Map();
  for (const n of notes) {
    if (!byStart.has(n.startTicks)) byStart.set(n.startTicks, []);
    byStart.get(n.startTicks).push(n);
  }
  for (const group of byStart.values()) {
    if (group.length < 2) continue;
    const ends = group.map((n) => n.endTicks).sort((a, b) => a - b);
    const median = ends[Math.floor(ends.length / 2)];
    for (const n of group) {
      if (Math.abs(n.endTicks - median) <= hold) n.endTicks = median;
    }
  }

  for (const n of notes) {
    const next = attacks.find((t) => t > n.startTicks);
    if (next === undefined) continue;
    if (n.endTicks >= next) { n.endTicks = Math.max(n.startTicks + 1, next); continue; }
    if (next - n.endTicks <= hold) n.endTicks = next;
  }
}

function average(list) {
  if (!list.length) return 0;
  return list.reduce((a, b) => a + b, 0) / list.length;
}

/**
 * Transcribe recorded or imported audio.
 * `audio` is an AudioBuffer or a Float32Array of mono samples.
 */
export function transcribeAudio(audio, opts = {}) {
  const sampleRate = opts.sampleRate || audio.sampleRate || 44100;
  const extracted = extractNotes(audio, { ...opts, sampleRate });
  const result = notesToScore(extracted.notes, {
    ...opts,
    duration: extracted.duration,
    source: SOURCE.AUDIO,
  });
  result.analysis.onsets = extracted.onsets;
  result.analysis.duration = extracted.duration;
  return result;
}

/**
 * Transcribe MIDI.
 *
 * `events` are { midi, start, end, velocity } in seconds.  Nothing here has to
 * be guessed at, so every note carries full pitch confidence and the result is
 * markedly better than the same performance recorded as audio — which is the
 * honest reason to prefer this path when an instrument can provide it.
 */
export function transcribeMidi(events, opts = {}) {
  const notes = events
    .filter((e) => e.end > e.start)
    .map((e) => ({
      midi: e.midi,
      start: e.start,
      end: e.end,
      velocity: e.velocity ?? 80,
      confidence: 1,
      salience: e.velocity ?? 80,
    }))
    .sort((a, b) => a.start - b.start || a.midi - b.midi);
  const duration = notes.length ? Math.max(...notes.map((n) => n.end)) : 0;
  return notesToScore(notes, { ...opts, duration, source: SOURCE.MIDI });
}

export { extractNotes, detectKey };
export { GRID_PRESETS } from './rhythm.js';

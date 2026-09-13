/* Cadenza — transcription, end to end.
 *
 * The chain is a sequence of separable stages, each one testable on its own and
 * each one replaceable without touching the others:
 *
 *   audio analysis  →  pitch and event detection  →  polyphonic separation
 *   →  musical interpretation  →  notation  →  audio rendering
 *   →  similarity evaluation  →  correction
 *
 * The last three are the part most transcribers leave out, and they are the
 * reason this one gets better than its first guess.  The notation is played
 * back, the playback is measured against the recording, and what differs is
 * corrected in the score.  Every correction is driven by the recording alone.
 * Nothing is changed because a chord would be more usual or a rhythm more
 * regular — the goal is to reconstruct what was performed, and a musically
 * plausible wrong answer is still a wrong answer.
 *
 * The two inputs are not equally easy and the code does not pretend otherwise.
 * MIDI states the pitches and the timing exactly, so everything from the pitch
 * stage is certain and only the musical reading is inferred.  Audio has to be
 * recovered first, and that is the part that can be wrong.
 */

import { extractNotes } from './notes.js';
import { attackEvents, estimateBeat, estimateMetre, quantise, toTicks } from './rhythm.js';
import { markPerformedEvents, groupChords } from './voices.js';
import { assignToParts } from './assign.js';
import { analyseHarmony, harmonyFitter } from './harmony.js';
import { buildParts, detectKey } from './build.js';
import { resolveTarget } from './ensembles.js';
import { refineByListening } from './refine.js';
import { beatTicks, measureTicks, TPQ } from '../core/rhythm.js';

export const SOURCE = { AUDIO: 'audio', MIDI: 'midi' };

/**
 * How firmly a performance is pulled onto the beat.
 *
 * Automatic is not "medium": it chooses a division for each beat from what was
 * actually played there, which is what writes a triplet as a triplet and leaves
 * a rubato phrase alone.  The fixed settings are for when that reading is
 * wrong and you know better than it does.
 */
export const QUANTISE_LEVELS = [
  { id: 'auto', label: 'Automatic', strength: 1, tolerance: 0.16, adaptive: true },
  { id: 'none', label: 'None', strength: 0, tolerance: 0.5, adaptive: true },
  { id: 'light', label: 'Light', strength: 0.4, tolerance: 0.22, adaptive: true },
  { id: 'medium', label: 'Medium', strength: 0.75, tolerance: 0.18, adaptive: true },
  { id: 'strong', label: 'Strong', strength: 1, tolerance: 0.3, adaptive: true },
];

export const PASSES = [
  { id: 'events', label: 'Analysing pitch' },
  { id: 'timing', label: 'Analysing rhythm' },
  { id: 'chords', label: 'Detecting chords' },
  { id: 'voices', label: 'Separating voices' },
  { id: 'harmony', label: 'Reading the harmony' },
  { id: 'notation', label: 'Building notation' },
  { id: 'listening', label: 'Listening back' },
  { id: 'comparing', label: 'Comparing with the original' },
  { id: 'correcting', label: 'Improving the transcription' },
  { id: 'verifying', label: 'Final verification' },
];

/* ------------------------------------------------------- musical reading */

/**
 * Everything between a list of notes and a finished score.
 *
 * Kept in one function because the refinement loop has to be able to run it
 * again from end to end: a corrected note list must be re-quantised, re-voiced
 * and re-engraved, not patched into the old score.
 */
export function readMusic(rawNotes, opts = {}) {
  const {
    duration = 0,
    bpm = null,
    grid = null,
    quantise: level = 'auto',
    timeSig = null,
    keyFifths = null,
    plan: chosen = null,
    title = 'Transcription',
    composer = '',
    source = SOURCE.AUDIO,
    divisionWeights = null,
    splitCentre = 60,
    spellingLean = 0,
    octaveBias = null,
    annotate = false,
    onPass = () => {},
  } = opts;

  const plan = chosen || resolveTarget({ targetId: 'piano' });
  const notes = rawNotes.map((n) => ({ ...n }));
  if (!notes.length) {
    const { score } = buildParts(plan.parts.map((p) => ({
      instrumentId: p.id, staves: p.staves, chords: [],
    })), { title, composer });
    return { score, notes: [], chords: [], analysis: { empty: true, plan } };
  }

  /* Corrections this player has made before, applied before anything else so
   * the rest of the reading sees the pitches they meant. */
  if (octaveBias) {
    for (const n of notes) {
      const shift = n.midi < 48 ? octaveBias.low : n.midi < 72 ? octaveBias.mid : octaveBias.high;
      if (shift) n.midi = Math.max(0, Math.min(127, n.midi + shift * 12));
    }
  }

  /* --- chords: what was struck together, decided before anything moves ---- */
  onPass('chords');
  markPerformedEvents(notes);

  /* --- rhythm ------------------------------------------------------------ */
  onPass('timing');
  const span = duration || Math.max(...notes.map((n) => n.end)) + 0.5;
  const attacks = attackEvents(notes);
  const beat = estimateBeat(attacks, span, { fixedBpm: bpm });
  const q = QUANTISE_LEVELS.find((x) => x.id === level) || QUANTISE_LEVELS[0];
  const trial = quantise(notes, beat, {
    division: grid, strength: q.strength, tolerance: q.tolerance, divisionWeights,
  });
  const metre = timeSig
    ? { timeSig, beatsPerBar: timeSig.beats, confidence: 1 }
    : estimateMetre(attacks, beat, trial.compound);
  const perBeat = beatTicks(metre.timeSig);
  const fitted = toTicks(trial.notes, perBeat);

  /* --- voices and parts -------------------------------------------------- */
  onPass('voices');
  const assignment = assignToParts(fitted, plan, { splitCentre });
  /* Gaps are closed within a line, not within a part.  A held melody note is
   * not cut short because the accompaniment moved underneath it. */
  for (const entry of assignment.parts) {
    const lines = new Map();
    for (const n of entry.notes) {
      const key = (n.staff || 0) + ':' + (n.voice || 0);
      if (!lines.has(key)) lines.set(key, []);
      lines.get(key).push(n);
    }
    for (const line of lines.values()) closeGaps(line, perBeat, measureTicks(metre.timeSig));
  }

  /* --- harmony: read, never imposed -------------------------------------- */
  onPass('harmony');
  const key = keyFifths === null ? detectKey(fitted)
    : { fifths: keyFifths, mode: 'major', confidence: 1, tonic: fifthsToTonic(keyFifths) };
  const harmony = analyseHarmony(
    fitted.map((n) => ({ midi: n.midi, start: n.startTicks / perBeat, end: n.endTicks / perBeat })),
    { key },
  );

  /* --- notation ---------------------------------------------------------- */
  onPass('notation');
  const divisions = new Map();
  for (const n of fitted) {
    const b = Math.floor(n.startTicks / perBeat);
    divisions.set(b, Math.max(divisions.get(b) || 1, n.division));
  }
  const quarterBpm = beat.period > 0
    ? Math.round((60 / beat.period) * (TPQ / perBeat) * 10) / 10 : 120;

  const partData = assignment.parts.map((entry) => ({
    instrumentId: entry.part.id,
    staves: entry.part.staves,
    chords: groupChords(entry.notes),
  }));
  const built = buildParts(partData, {
    plan: { perBeat, divisions },
    timeSig: metre.timeSig,
    bpm: quarterBpm,
    fifths: key.fifths,
    mode: key.mode,
    spellingLean,
    title,
    composer,
    annotations: annotate
      ? { segments: harmony.segments.map((s) => ({ ...s, fromTicks: s.from * perBeat })), showChords: true }
      : null,
  });

  return {
    score: built.score,
    notes: fitted,
    chords: partData.flatMap((p) => p.chords),
    assignment,
    harmony,
    analysis: {
      source,
      plan,
      bpm: quarterBpm,
      beat,
      timeSig: metre.timeSig,
      key,
      measures: built.measures,
      noteCount: fitted.length,
      divisions: trial.divisions,
      perBeat,
      confidence: {
        pitch: source === SOURCE.MIDI ? 1 : average(fitted.map((n) => n.confidence ?? 0.5)),
        rhythm: average(fitted.map((n) => n.rhythmConfidence ?? 0.5)),
        beat: beat.confidence,
        metre: metre.confidence,
        key: key.confidence,
        parts: assignment.confidence,
      },
    },
  };
}

const FIFTH_TONIC = { 0: 0, 1: 7, 2: 2, 3: 9, 4: 4, 5: 11, 6: 6, '-1': 5, '-2': 10, '-3': 3, '-4': 8, '-5': 1, '-6': 6 };
const fifthsToTonic = (f) => FIFTH_TONIC[String(f)] ?? 0;

/**
 * Decide where the silences really are.
 *
 * Players lift a key a moment before the next note; that release is
 * articulation, not rhythm, and writing it down produces a page littered with
 * rests nobody played.  A gap small enough to be a release closes up, while a
 * gap long enough to have been meant stays open and becomes a rest.  The notes
 * of one chord let go at slightly different moments are levelled for the same
 * reason.
 */
function closeGaps(notes, perBeat, barTicks) {
  if (!notes.length) return;
  const attacks = [...new Set(notes.map((n) => n.startTicks))].sort((a, b) => a - b);
  const hold = Math.round(perBeat * 0.34);

  const byStart = new Map();
  for (const n of notes) {
    if (!byStart.has(n.startTicks)) byStart.set(n.startTicks, []);
    byStart.get(n.startTicks).push(n);
  }
  for (const group of byStart.values()) {
    if (group.length < 2) continue;
    const ends = group.map((n) => n.endTicks).sort((a, b) => a - b);
    const median = ends[Math.floor(ends.length / 2)];
    for (const n of group) if (Math.abs(n.endTicks - median) <= hold) n.endTicks = median;
  }

  for (const n of notes) {
    const next = attacks.find((t) => t > n.startTicks);
    if (next !== undefined) {
      if (n.endTicks >= next) { n.endTicks = Math.max(n.startTicks + 1, next); continue; }
      if (next - n.endTicks <= hold) n.endTicks = next;
      continue;
    }
    const barEnd = (Math.floor(n.startTicks / barTicks) + 1) * barTicks;
    if (n.endTicks < barEnd && barEnd - n.endTicks <= hold) n.endTicks = barEnd;
  }
}

function average(list) {
  if (!list.length) return 0;
  return list.reduce((a, b) => a + b, 0) / list.length;
}

/* ------------------------------------------------------------- the chain */

/** Backwards-compatible entry point for a single note list. */
export function notesToScore(rawNotes, opts = {}) {
  const plan = opts.plan || resolveTarget({
    targetId: opts.splitHands === false ? 'violin' : 'piano',
  });
  return readMusic(rawNotes, { ...opts, plan });
}

/**
 * Transcribe recorded or imported audio.
 *
 * `audio` is an AudioBuffer or a Float32Array of mono samples.  When `listen`
 * is on, the notation is played back and compared with the recording, and the
 * score is corrected until it stops improving.
 */
export function transcribeAudio(audio, opts = {}) {
  const {
    listen = true,
    maxPasses = 5,
    onPass = () => {},
    onProgress = null,
    ...rest
  } = opts;
  const sampleRate = opts.sampleRate || audio.sampleRate || 44100;

  onPass('events');
  const extracted = extractNotes(audio, { ...rest, sampleRate, onProgress });
  const base = { ...rest, duration: extracted.duration, source: SOURCE.AUDIO, onPass };
  let result = readMusic(extracted.notes, base);
  result.analysis.onsets = extracted.onsets;
  result.analysis.duration = extracted.duration;
  result.analysis.heard = extracted.notes.length;

  if (!listen || !extracted.notes.length) {
    result.analysis.listened = false;
    return result;
  }

  /* Play the notation, measure it against the recording, correct the score,
   * and do it again until it stops getting closer. */
  const harmonyFit = harmonyFitter(result.harmony);
  const refined = refineByListening({
    audio,
    sampleRate,
    notes: extracted.notes,
    rebuild: (notes) => readMusic(notes, { ...base, onPass: () => {} }),
  }, {
    maxPasses,
    harmonyAt: (time, midi) => harmonyFit(time, midi),
    onProgress: (stage, detail) => {
      if (stage === 'rendering') onPass('listening', detail);
      else if (stage === 'comparing') onPass('comparing', detail);
      else if (stage === 'correcting') onPass('correcting', detail);
    },
  });

  onPass('verifying');
  result = refined.built;
  result.analysis.onsets = extracted.onsets;
  result.analysis.duration = extracted.duration;
  result.analysis.heard = extracted.notes.length;
  result.analysis.listened = true;
  result.analysis.similarity = refined.similarity;
  result.analysis.passes = refined.history;
  result.analysis.corrections = refined.edits;
  result.analysis.difference = refined.diff;
  result.analysis.confidence.match = refined.similarity;
  return result;
}

/**
 * Transcribe MIDI.
 *
 * Nothing here has to be guessed at, so every note carries full pitch
 * confidence and the result is markedly better than the same performance
 * recorded as audio — which is the honest reason to prefer this path when an
 * instrument can provide it.  There is nothing for the listen-back loop to
 * correct, so it is not run.
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
  const result = readMusic(notes, { ...opts, duration, source: SOURCE.MIDI });
  result.analysis.listened = false;
  result.analysis.heard = notes.length;
  return result;
}

export { extractNotes, detectKey, resolveTarget, refineByListening };
export { GRID_PRESETS } from './rhythm.js';
export { TARGETS, PRESETS, SECTIONS, ALL_PARTS, findTarget } from './ensembles.js';
export { analyseHarmony, readChord, romanNumeral } from './harmony.js';
export { renderNotation, notationEvents } from './render.js';
export { compareAudio, describe as describeDifference } from './compare.js';
export { classify as classifyEvents, groupEvents } from './events.js';

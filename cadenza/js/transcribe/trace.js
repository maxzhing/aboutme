/* Cadenza — showing the working.
 *
 * When a transcription comes out wrong the useful question is not "is it
 * wrong" but "where did it go wrong", and that cannot be answered from the
 * finished page.  A chord written as three notes might have been heard as
 * three notes, or heard as a chord and taken apart by the hands, or heard as a
 * chord and pulled apart by the rhythm.  Those are three different faults with
 * three different fixes, and from the page they look identical.
 *
 * So every stage records what it handed to the next one, in the order the
 * pipeline runs, and the panel shows it.  Nothing here changes a note: this is
 * a window, not a stage.
 */

import { readChord } from './harmony.js';

const LIMIT = 60;          // lines kept per stage; a long take is summarised

const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
export const noteName = (midi) => NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
const secs = (t) => t.toFixed(2).padStart(5) + 's';
const pitches = (list) => list.map(noteName).join(' ');

/** A stage's worth of lines, with a note of anything left out. */
function stage(id, label, lines, note) {
  const kept = lines.slice(0, LIMIT);
  if (lines.length > LIMIT) kept.push(`… and ${lines.length - LIMIT} more`);
  return { id, label, lines: kept, count: lines.length, note };
}

/**
 * Build the record of a reading.
 *
 * Everything passed in is what that stage actually produced, so the view can
 * never drift from what the code did.
 */
export function buildTrace(ctx) {
  const {
    heard = [], events = [], beat, timeSig, perBeat = 480, divisions = [],
    parts = [], chords = [], key, simplified = [], listened = null,
  } = ctx;
  const out = [];

  out.push(stage('pitch', 'Detected pitch events',
    heard.map((n) => `${secs(n.start)} → ${secs(n.end)}  ${noteName(n.midi).padEnd(4)}`
      + `  certainty ${Math.round((n.confidence ?? 0.5) * 100)}%`),
    `${heard.length} pitch${heard.length === 1 ? '' : 'es'} found in the recording`));

  out.push(stage('events', 'Grouped into musical events',
    events.map((e) => `${secs(e.time)}  ${e.kind.padEnd(7)}  ${pitches(e.pitches)}`),
    'Notes struck together share one moment from here on, so nothing later can separate them'));

  /* What each simultaneity is, harmonically — said about the event, never
   * instead of it.  The pitches above are what gets written; this is only a
   * reading of them, and it is allowed to say it does not know. */
  const harmonic = events.filter((e) => e.pitches.length > 1).map((e) => {
    const read = readChord(e.pitches, { fifths: key ? key.fifths : 0 });
    const named = read && read.quality !== 'unclear'
      ? `${read.label}${read.inversion ? `, inversion ${read.inversion}` : ''}`
      : 'no chord name fits — kept exactly as played';
    return `${secs(e.time)}  ${pitches(e.pitches).padEnd(22)}  ${named}`;
  });
  out.push(stage('chords', 'Harmonic reading of each simultaneity', harmonic,
    'A name is a description of the notes, never a replacement for them'));

  const bpm = beat && beat.period ? Math.round((60 / beat.period) * 10) / 10 : null;
  const gridLines = [];
  if (bpm) gridLines.push(`pulse ${bpm} per minute, first beat at ${secs(beat.phase)}`);
  if (timeSig) gridLines.push(`time signature ${timeSig.beats}/${timeSig.beatType}`);
  for (const [d, n] of divisions) {
    gridLines.push(`${n} beat${n === 1 ? '' : 's'} divided into ${d}`
      + (d === 1 ? ' — whole beats' : d % 3 === 0 && d > 1 ? ' — triplets' : ''));
  }
  out.push(stage('rhythm', 'Rhythmic grid', gridLines,
    'The grid is chosen for the phrase, and a beat departs from it only on real evidence'));

  const handLines = [];
  for (const entry of parts) {
    const staves = new Set(entry.notes.map((n) => n.staff || 0));
    for (const st of [...staves].sort()) {
      const own = entry.notes.filter((n) => (n.staff || 0) === st);
      const voices = new Set(own.map((n) => n.voice || 0));
      handLines.push(`${entry.part.name} — ${st === 1 ? 'lower staff' : 'upper staff'}: `
        + `${own.length} notes in ${voices.size} voice${voices.size === 1 ? '' : 's'}`);
    }
  }
  const split = events.filter((e) => new Set(e.notes.map((n) => n.staff)).size > 1);
  if (split.length) {
    handLines.push(`${split.length} chord${split.length === 1 ? ' was' : 's were'} divided between the hands:`);
    for (const e of split.slice(0, 8)) {
      const lower = e.notes.filter((n) => n.staff === 1).map((n) => n.midi);
      const upper = e.notes.filter((n) => n.staff !== 1).map((n) => n.midi);
      handLines.push(`  ${secs(e.time)}  ${pitches(lower)}  |  ${pitches(upper)}`);
    }
  } else if (events.some((e) => e.pitches.length > 1)) {
    handLines.push('No chord was divided between the hands');
  }
  out.push(stage('hands', 'Hands and voices', handLines,
    'A chord goes to a hand whole unless the music leaves a gap to divide it at'));

  out.push(stage('notation', 'What was written',
    chords.map((c) => `bar ${Math.floor(c.startTicks / (perBeat * (timeSig ? timeSig.beats : 4))) + 1}`
      + `  ${(c.staff === 1 ? 'lower' : 'upper')}/v${(c.voice || 0) + 1}`
      + `  ${pitches(c.notes.map((n) => n.midi))}`),
    simplified.length ? simplified.join('; ') : undefined));

  if (listened) {
    out.push(stage('listening', 'Checked against the recording', listened.lines || [],
      listened.note));
  }
  return out;
}

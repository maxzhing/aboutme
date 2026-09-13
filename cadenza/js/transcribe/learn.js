/* Cadenza — learning from corrections.
 *
 * What this is: a handful of parameters fitted to the changes you make after
 * a transcription — an octave bias per register, how often you end up in
 * triplets, where your hands divide, whether the engine tends to hear notes
 * that were not there, and which way you spell accidentals.  Each one is an
 * online estimate with a learning rate, and each one actually changes what the
 * next transcription produces.
 *
 * What this is not: a trained model.  There is no network here and no
 * training, and calling five running averages "AI" would be a lie that makes
 * the feature sound better than it is.  The summary shown in the interface
 * says exactly what has been observed and how many times, so it can be
 * judged rather than believed.
 */

import { toMidi } from '../core/theory.js';
import { eventTicks } from '../core/rhythm.js';

const KEY = 'cadenza.transcribe.corrections.v1';

/* Weighted towards recent corrections without forgetting the rest: playing
 * changes, and last month's habits should not outvote this week's. */
const RATE = 0.25;

const REGISTERS = [
  { id: 'low', from: 0, to: 47 },
  { id: 'mid', from: 48, to: 71 },
  { id: 'high', from: 72, to: 127 },
];

const registerOf = (midi) => (REGISTERS.find((r) => midi >= r.from && midi <= r.to) || REGISTERS[1]).id;

function blank() {
  return {
    octave: { low: { value: 0, n: 0 }, mid: { value: 0, n: 0 }, high: { value: 0, n: 0 } },
    divisions: {},              // division -> how often it survived correction
    splitCentre: { value: 60, n: 0 },
    spurious: 0,                // notes the engine invented, as seen by deletions
    missed: 0,                  // notes it failed to hear, as seen by additions
    kept: 0,                    // notes accepted untouched
    spelling: { sharp: 0, flat: 0 },
    corrections: 0,
  };
}

export class CorrectionModel {
  constructor(storage = null) {
    this.storage = storage !== null ? storage
      : (typeof localStorage !== 'undefined' ? localStorage : null);
    this.data = blank();
    this.load();
  }

  load() {
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem(KEY);
      if (raw) this.data = { ...blank(), ...JSON.parse(raw) };
    } catch (err) {
      this.data = blank();
    }
  }

  save() {
    if (!this.storage) return;
    try {
      this.storage.setItem(KEY, JSON.stringify(this.data));
    } catch (err) { /* a full or disabled store is not worth failing over */ }
  }

  reset() {
    this.data = blank();
    this.save();
  }

  /** Fold one observed correction into the estimates. */
  observe(correction) {
    const d = this.data;
    switch (correction.kind) {
      case 'octave': {
        const r = registerOf(correction.midi);
        const slot = d.octave[r];
        slot.value += (correction.octaves - slot.value) * RATE;
        slot.n++;
        d.corrections++;
        break;
      }
      case 'division': {
        const key = String(correction.division);
        d.divisions[key] = (d.divisions[key] || 0) + 1;
        d.corrections++;
        break;
      }
      case 'staff': {
        /* The note moved hands, so the division between them lies on the
         * other side of it than we supposed. */
        const target = correction.toStaff === 0 ? correction.midi : correction.midi + 1;
        d.splitCentre.value += (target - d.splitCentre.value) * RATE;
        d.splitCentre.n++;
        d.corrections++;
        break;
      }
      case 'spurious': d.spurious++; d.corrections++; break;
      case 'missed': d.missed++; d.corrections++; break;
      case 'kept': d.kept += correction.count || 1; break;
      case 'spelling':
        if (correction.alter > 0) d.spelling.sharp++;
        else if (correction.alter < 0) d.spelling.flat++;
        d.corrections++;
        break;
      default: break;
    }
    this.save();
    return this;
  }

  /** The fitted parameters, with the evidence behind each one. */
  parameters() {
    const d = this.data;
    const seen = d.spurious + d.missed + d.kept;
    /* Hearing notes that were not played says the threshold is too low;
     * missing notes says it is too high.  One correction should nudge, not
     * lurch, so the shift is bounded and needs evidence to reach its limit. */
    let sensitivity = 1;
    if (seen >= 8) {
      const bias = (d.missed - d.spurious) / seen;
      sensitivity = Math.max(0.6, Math.min(1.6, 1 + bias * 0.8));
    }
    const octave = {};
    for (const r of REGISTERS) {
      const slot = d.octave[r.id];
      /* Below three observations an octave bias is one slip, not a habit. */
      octave[r.id] = slot.n >= 3 ? Math.round(slot.value) : 0;
    }
    const total = Object.values(d.divisions).reduce((a, b) => a + b, 0);
    const divisionWeights = {};
    for (const [k, v] of Object.entries(d.divisions)) divisionWeights[k] = v / total;
    return {
      sensitivity,
      octave,
      divisionWeights,
      splitCentre: d.splitCentre.n >= 3 ? Math.round(d.splitCentre.value) : 60,
      spellingLean: d.spelling.sharp === d.spelling.flat ? 0
        : d.spelling.sharp > d.spelling.flat ? 1 : -1,
      evidence: { corrections: d.corrections, notesSeen: seen },
    };
  }

  /** Transcription options adjusted by what has been learned. */
  apply(options = {}) {
    const p = this.parameters();
    const out = { ...options };
    if (options.sensitivity === undefined) out.sensitivity = p.sensitivity;
    if (options.splitCentre === undefined) out.splitCentre = p.splitCentre;
    out.divisionWeights = p.divisionWeights;
    out.octaveBias = p.octave;
    return out;
  }

  /** Move notes by the octave bias learned for their register. */
  adjust(notes) {
    const { octave } = this.parameters();
    for (const n of notes) {
      const shift = octave[registerOf(n.midi)] || 0;
      if (shift) n.midi = Math.max(0, Math.min(127, n.midi + shift * 12));
    }
    return notes;
  }

  /** A plain account of what has been observed, for showing to the user. */
  summary() {
    const p = this.parameters();
    const lines = [];
    for (const r of REGISTERS) {
      const slot = this.data.octave[r.id];
      if (slot.n >= 3 && Math.round(slot.value) !== 0) {
        const dir = slot.value > 0 ? 'up' : 'down';
        lines.push(`${r.id} notes moved ${dir} an octave ${slot.n} times — now transposed to match`);
      }
    }
    const divs = Object.entries(this.data.divisions).sort((a, b) => b[1] - a[1]);
    if (divs.length && divs[0][1] >= 3) {
      lines.push(`beats most often divided into ${divs[0][0]} (${divs[0][1]} corrections)`);
    }
    if (this.data.splitCentre.n >= 3) {
      lines.push(`hands divide around MIDI ${Math.round(this.data.splitCentre.value)} (${this.data.splitCentre.n} moves between staves)`);
    }
    if (p.evidence.notesSeen >= 8 && Math.abs(p.sensitivity - 1) > 0.02) {
      lines.push(p.sensitivity > 1
        ? `listening harder: ${this.data.missed} notes were missing against ${this.data.spurious} invented`
        : `listening more strictly: ${this.data.spurious} notes were invented against ${this.data.missed} missing`);
    }
    if (p.spellingLean) {
      lines.push(`accidentals spelled as ${p.spellingLean > 0 ? 'sharps' : 'flats'}`);
    }
    return {
      corrections: this.data.corrections,
      lines,
      empty: lines.length === 0,
    };
  }
}

/* --------------------------------------------------------------- diffing */

/** Every sounding note in a score, with where it sits. */
function flatten(score) {
  const out = [];
  for (const part of score.parts) {
    part.measures.forEach((pm, m) => {
      pm.voices.forEach((voice, v) => {
        let tick = 0;
        for (const ev of voice) {
          if (ev.type === 'note') {
            for (const n of ev.notes) {
              out.push({
                measure: m,
                tick,
                voice: v,
                staff: ev.staff === null || ev.staff === undefined
                  ? (part.staves > 1 ? v % 2 : 0) : ev.staff,
                midi: toMidi(n.pitch),
                alter: n.pitch.alter,
                duration: ev.duration,
                dots: ev.dots,
                division: ev.tuplet ? ev.tuplet.actual : null,
              });
            }
          }
          if (!ev.grace) tick += eventTicks(ev);
        }
      });
    });
  }
  return out;
}

/**
 * Work out what the user changed.
 *
 * Comparison is by position, not by identity, because editing replaces events.
 * A note in the same place an octave away is a correction of the octave; one
 * that is gone was invented; one that appeared was missed.
 */
export function compareScores(before, after) {
  const a = flatten(before);
  const b = flatten(after);
  const corrections = [];
  const usedB = new Set();
  let kept = 0;

  for (const note of a) {
    let match = -1;
    let exact = -1;
    b.forEach((other, i) => {
      if (usedB.has(i)) return;
      if (other.measure !== note.measure || other.tick !== note.tick) return;
      if (other.midi === note.midi) { exact = i; return; }
      if (Math.abs(other.midi - note.midi) % 12 === 0 && match < 0) match = i;
    });
    if (exact >= 0) {
      usedB.add(exact);
      kept++;
      const moved = b[exact];
      if (moved.staff !== note.staff) {
        corrections.push({ kind: 'staff', midi: note.midi, toStaff: moved.staff });
      }
      if (moved.division && moved.division !== note.division) {
        corrections.push({ kind: 'division', division: moved.division });
      }
      if (moved.alter !== note.alter && moved.alter) {
        corrections.push({ kind: 'spelling', alter: moved.alter });
      }
      continue;
    }
    if (match >= 0) {
      usedB.add(match);
      corrections.push({
        kind: 'octave',
        midi: note.midi,
        octaves: (b[match].midi - note.midi) / 12,
      });
      continue;
    }
    corrections.push({ kind: 'spurious', midi: note.midi });
  }
  b.forEach((note, i) => {
    if (!usedB.has(i)) corrections.push({ kind: 'missed', midi: note.midi });
  });
  if (kept) corrections.push({ kind: 'kept', count: kept });
  return corrections;
}

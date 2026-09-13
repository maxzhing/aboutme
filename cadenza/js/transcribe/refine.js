/* Cadenza — checking the transcription by listening to it.
 *
 * A transcription that has never been played back is a guess nobody has
 * checked.  This is the loop that checks it:
 *
 *   the recording  →  notes  →  notation  →  play the notation  →
 *   compare with the recording  →  correct the notation  →  play it again
 *
 * The important word there is *notation*.  What gets corrected is the score,
 * not the playback: the render is thrown away every pass and made again from
 * whatever the notation now says, so the only way for the two to come closer
 * together is for the score to become more like the recording.  Making the
 * playback flatter the transcription would be easy and would prove nothing.
 *
 * Every correction is driven by the recording and only by the recording.  A
 * note is added because the recording has energy along that pitch's harmonic
 * series which the notation does not produce; a note is removed because the
 * notation produces energy the recording does not have.  No correction is ever
 * made because a chord would be more usual, or a rhythm more regular, or a
 * harmony more idiomatic.  Where two corrections are equally supported by the
 * audio — and only then — the one that fits the surrounding harmony is
 * preferred, which is a tie-break and not a decision.
 *
 * A pass is kept only if it improves the match.  The loop therefore cannot
 * wander: the worst it can do is stop where it started.
 */

import { renderSteps } from './render.js';
import {
  compareSteps, salienceSteps, candidatePitches, activePitches, verifyPitchAt
} from './compare.js';
import { toMono, midiToHz } from './dsp.js';
import { runSync } from './steps.js';

const MIN_GAIN = 0.004;        // an improvement smaller than this is noise
const MIN_RUN_STRENGTH = 0.26; // how clearly a difference must show to act on

/**
 * A note the first reading was sure of, which the evidence against is not
 * strong enough to overturn.
 */
const settled = (note, against) => (note.confidence ?? 0) >= 0.8 && against < 0.72;

/** Is there a note of this pitch sounding across this span? */
const covering = (notes, midi, from, to) =>
  notes.find((n) => n.midi === midi && n.end > from + 0.02 && n.start < to - 0.02);

/**
 * Turn a set of measured differences into changes to the note list.
 *
 * Strongest first, and capped per pass: a loop that rewrites half the piece at
 * once cannot tell which of its changes helped.
 */
function applyCorrections(notes, diff, opts) {
  const { limit, harmonyAt = null, verify = () => true, exclude = null } = opts;
  const out = notes.map((n) => ({ ...n }));
  const edits = [];

  /* Pair a missing pitch with an extra one an octave away at the same moment:
   * that is one note in the wrong octave, not two separate mistakes. */
  const usedExtra = new Set();
  for (const miss of diff.missing) {
    if (miss.strength < MIN_RUN_STRENGTH) continue;
    /* One octave, or two.  Further than that and these are not one note in the
     * wrong octave but two unrelated mistakes that happen to share a letter. */
    const partner = diff.extra.find((x, i) => !usedExtra.has(i)
      && (Math.abs(x.midi - miss.midi) === 12 || Math.abs(x.midi - miss.midi) === 24)
      && x.from < miss.to && x.to > miss.from);
    if (!partner) continue;
    usedExtra.add(diff.extra.indexOf(partner));
    const wrong = covering(out, partner.midi, partner.from, partner.to);
    if (wrong && !settled(wrong, partner.strength)) {
      edits.push({
        kind: 'octave', weight: miss.strength * miss.frames + partner.strength * partner.frames,
        apply: () => { wrong.midi = miss.midi; wrong.corrected = 'octave'; },
        describe: `${partner.midi} → ${miss.midi}`,
      });
    }
  }

  for (const miss of diff.missing) {
    if (miss.strength < MIN_RUN_STRENGTH) continue;
    if (edits.some((e) => e.kind === 'octave' && e.describe.endsWith('→ ' + miss.midi))) continue;
    const near = out.find((n) => n.midi === miss.midi
      && Math.abs(n.end - miss.from) < 0.16 && n.end <= miss.to);
    if (near) {
      /* The note is there but stops too soon: the notation is short, not wrong. */
      const to = miss.to;
      edits.push({
        kind: 'extend', weight: miss.strength * miss.frames,
        apply: () => { near.end = Math.max(near.end, to); near.corrected = 'length'; },
        describe: `${miss.midi} held longer`,
      });
      continue;
    }
    if (covering(out, miss.midi, miss.from, miss.to)) continue;
    /* The map said there is energy here; the estimator says whether it is a
     * note or another note's harmonic.  Nothing is added on the map alone. */
    if (!verify(miss.midi, (miss.from + miss.to) / 2)) continue;
    const from = miss.from;
    const to = miss.to;
    const midi = miss.midi;
    const strength = miss.strength;
    edits.push({
      kind: 'add', weight: strength * miss.frames,
      apply: () => out.push({
        midi, start: from, end: to,
        velocity: Math.max(24, Math.min(120, Math.round(40 + 70 * strength))),
        confidence: Math.min(0.9, 0.35 + strength * 0.5),
        salience: strength * 100,
        corrected: 'added',
      }),
      describe: `${midi} added`,
      harmonyFit: harmonyAt ? harmonyAt(from, midi) : 0,
    });
  }

  for (let i = 0; i < diff.extra.length; i++) {
    const x = diff.extra[i];
    if (usedExtra.has(i) || x.strength < MIN_RUN_STRENGTH) continue;
    const note = covering(out, x.midi, x.from, x.to);
    if (!note) continue;
    /* What the first reading heard clearly is evidence too.  The loop's job is
     * mostly to find what was missed; undoing a confident detection needs the
     * recording to disagree strongly, not merely to disagree. */
    if (settled(note, x.strength)) continue;
    /* Only drop a note the recording does not support anywhere across its life;
     * one that is merely quieter than the render is still a note. */
    const spans = diff.extra.filter((y) => y.midi === x.midi
      && y.from <= note.end && y.to >= note.start);
    const covered = spans.reduce((s, y) => s + (Math.min(y.to, note.end) - Math.max(y.from, note.start)), 0);
    const life = Math.max(0.01, note.end - note.start);
    if (verify(x.midi, (x.from + x.to) / 2)) continue;   // the recording has it after all
    if (covered / life < 0.6) {
      const cut = Math.max(note.start + 0.05, x.from);
      edits.push({
        kind: 'shorten', weight: x.strength * x.frames * 0.6,
        apply: () => { note.end = Math.min(note.end, cut); note.corrected = 'length'; },
        describe: `${x.midi} shortened`,
      });
      continue;
    }
    edits.push({
      kind: 'remove', weight: x.strength * x.frames,
      apply: () => { note.remove = true; note.corrected = 'removed'; },
      describe: `${x.midi} removed`,
      harmonyFit: harmonyAt ? -harmonyAt(x.from, x.midi) : 0,
    });
  }

  /* Strongest evidence first; where the evidence ties, the correction that
   * fits the harmony around it goes first.  The tie-break never promotes a
   * change the audio does not already support. */
  edits.sort((a, b) => (b.weight - a.weight) || ((b.harmonyFit || 0) - (a.harmonyFit || 0)));
  /* A retry must try something else.  Repeating the correction that spoiled the
   * last pass would only spoil this one. */
  const usable = exclude ? edits.filter((e) => !exclude.has(e.kind + ' ' + e.describe)) : edits;
  const taken = usable.slice(0, limit);
  for (const e of taken) e.apply();

  const kept = out.filter((n) => !n.remove && n.end - n.start > 0.03);
  kept.sort((a, b) => a.start - b.start || a.midi - b.midi);
  return { notes: kept, edits: taken };
}

/**
 * Listen to the transcription and correct it until it stops improving.
 *
 * `ctx.rebuild(notes)` must return `{ score }` — the full musical reading, so
 * that a corrected note list is re-quantised, re-voiced and re-engraved rather
 * than patched.  `ctx.onProgress(stage, detail)` is called as each pass runs.
 *
 * Returns the best result found, the history of every pass, and the edits made,
 * so the interface can show what changed and why.
 */
function* refineSteps(ctx, opts = {}) {
  const {
    maxPasses = 5,
    target = 0.985,
    sampleRate = ctx.sampleRate || 44100,
    onProgress = ctx.onProgress || (() => {}),
    harmonyAt = null,
  } = opts;

  const original = { audio: toMono(ctx.audio), sampleRate };
  let notes = ctx.notes.map((n) => ({ ...n }));
  let built = ctx.rebuild(notes);

  /* The recording's own pitch content, measured once.  Wide enough to include
   * pitches the first analysis missed entirely — otherwise a note that was
   * never heard could never be found. */
  onProgress('listening', { pass: 0 });
  const lo = Math.max(21, Math.min(...notes.map((n) => n.midi), 60) - 14);
  const hi = Math.min(108, Math.max(...notes.map((n) => n.midi), 60) + 14);
  const wide = [];
  for (let m = lo; m <= hi; m++) wide.push(m);
  const fullMap = yield* salienceSteps(original.audio, sampleRate, { pitches: wide });
  const heard = activePitches(fullMap);

  const history = [];
  let best = null;
  let allEdits = [];
  let retries = 0;
  let narrow = false;
  const rejected = new Set();
  let lastEdits = [];

  for (let pass = 1; pass <= maxPasses; pass++) {
    onProgress('rendering', { pass });
    yield { stage: 'rendering', pass };
    const rendered = yield* renderSteps(built.score, { sampleRate });
    const used = rendered.events.map((e) => e.midi);
    const pitches = candidatePitches(heard, used).filter((p) => p >= lo && p <= hi);

    onProgress('comparing', { pass });
    yield { stage: 'comparing', pass };
    let diff = yield* compareSteps(original, { audio: rendered.samples, sampleRate },
      { pitches, originalMap: fullMap });

    const entry = {
      pass,
      similarity: diff.similarity,
      coverage: diff.coverage,
      missing: diff.missing.length,
      extra: diff.extra.length,
      onsets: diff.onsets,
    };
    history.push(entry);

    if (!best || diff.similarity > best.similarity + 1e-9) {
      best = { similarity: diff.similarity, notes: notes.map((n) => ({ ...n })), built, diff };
      retries = 0;
    } else if (retries < 1) {
      /* That round of corrections made things worse.  One of them was probably
       * wrong and took the others down with it, so go back to the best version
       * and try again with only the best-evidenced few. */
      entry.reverted = true;
      retries++;
      narrow = true;
      for (const e of lastEdits) rejected.add(e.kind + ' ' + e.what);
      notes = best.notes.map((n) => ({ ...n }));
      built = best.built;
      diff = best.diff;
    } else {
      entry.reverted = true;
      break;
    }

    if (!entry.reverted) {
      if (diff.similarity >= target) { entry.stopped = 'close enough'; break; }
      if (history.length > 1) {
        const gain = diff.similarity - history[history.length - 2].similarity;
        if (gain >= 0 && gain < MIN_GAIN && pass > 1) { entry.stopped = 'no further gain'; break; }
      }
    }
    if (pass === maxPasses) { entry.stopped = 'passes exhausted'; break; }

    onProgress('correcting', { pass, missing: diff.missing.length, extra: diff.extra.length });
    const share = narrow ? 0.08 : 0.3;
    narrow = false;
    const limit = Math.max(1, Math.min(40, Math.ceil(notes.length * share)));
    const verified = new Map();
    const verify = (midi, time) => {
      const key = midi + ':' + Math.round(time * 40);
      if (verified.has(key)) return verified.get(key);
      const at = time - 0.04;
      let ok = false;
      const plain = verifyPitchAt(original.audio, sampleRate, at, midi);
      if (plain.present && plain.strength >= 0.12) ok = true;
      else {
        /* Ask again with everything the score already says taken away.  A note
         * under its own octave cannot be heard until the octave is removed,
         * and those are exactly the notes a first reading loses. */
        const sounding = rendered.events
          .filter((e) => e.time <= at && e.time + e.dur > at)
          .map((e) => midiToHz(e.midi));
        if (sounding.length) {
          const deep = verifyPitchAt(original.audio, sampleRate, at, midi, { without: sounding });
          ok = deep.present && deep.strength >= 0.18;
        }
      }
      verified.set(key, ok);
      return ok;
    };
    yield { stage: 'correcting', pass };
    const step = applyCorrections(notes, diff, { limit, harmonyAt, verify, exclude: rejected });
    if (!step.edits.length) { entry.stopped = 'nothing left to correct'; break; }
    yield { stage: 'correcting', pass };
    lastEdits = step.edits.map((e) => ({ pass, kind: e.kind, what: e.describe }));
    allEdits = allEdits.concat(lastEdits);
    notes = step.notes;
    yield { stage: 'correcting', pass };
    built = ctx.rebuild(notes);
  }

  return {
    notes: best.notes,
    score: best.built.score,
    built: best.built,
    similarity: best.similarity,
    diff: best.diff,
    history,
    edits: allEdits,
  };
}

/**
 * Play the notation, measure it against the recording, correct the score, and
 * do it again until it stops getting closer.
 *
 * `ctx` is { audio, sampleRate, notes, rebuild }.  The score is rebuilt from
 * corrected notes each time rather than patched.  `ctx.onProgress(stage,
 * detail)` is called as each pass runs.
 */
export function refineByListening(ctx, opts = {}) {
  return runSync(refineSteps(ctx, opts));
}

export { refineSteps };

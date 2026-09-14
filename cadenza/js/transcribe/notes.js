/* Cadenza — turning audio into note events.
 *
 * Analysis is driven by the attacks, not by a fixed grid.  A window that
 * straddles two notes reports both, so instead the onsets cut the take into
 * segments and each segment is analysed on its own; what sounds during a
 * segment is what was played there.
 *
 * A pitch that was already sounding simply continues, which keeps a held chord
 * from being re-detected under every melody note above it, and a pitch that
 * gains energy at an attack starts a new note, which is what tells a repeated
 * note from one long one.
 */

import { stft, toMono, rms, midiToHz } from './dsp.js';
import { runSync } from './steps.js';
import { estimateF0s, ownPartialEnergy } from './polyphony.js';
import { detectOnsets, onsetSteps } from './onsets.js';

const POW2 = [1024, 2048, 4096, 8192, 16384];
const fitWindow = (seconds, sampleRate, cap) => {
  const want = seconds * sampleRate;
  let best = POW2[0];
  for (const p of POW2) if (p <= want && p <= cap) best = p;
  return Math.max(2048, best);
};

/** Analyse one stretch of audio and report the pitches sounding in it. */
export function analyseSegment(samples, sampleRate, from, to, opts) {
  const { maxVoices, sensitivity, pitchCap } = opts;
  const length = to - from;
  /* Long enough for good low-frequency resolution, but never long enough to
   * reach into the next note — a window that overruns reports the note after
   * this one as though it had already started. */
  const settle = Math.min(0.022, length * 0.25);
  /* Leave room to step past the attack before measuring.  The first few
   * milliseconds of a struck note are broadband noise, and a window that opens
   * on them reads that noise as extra notes. */
  const size = fitWindow(Math.min(length - settle, 0.22), sampleRate, pitchCap);
  const span = size / sampleRate;
  /* Every window has to finish inside the segment.  One that runs past the end
   * hears the next attack and reports that note as though it had already been
   * playing — which is how a transcription acquires notes a beat early. */
  const last = to - span;
  const positions = [];
  positions.push(Math.max(from, Math.min(from + settle, last)));
  for (const frac of [0.45, 0.7]) {
    if (length < 0.12) break;
    const at = Math.min(from + length * frac, last);
    if (at > positions[positions.length - 1] + 0.03) positions.push(at);
  }
  /* A staccato note leaves most of its segment empty.  Looking there and then
   * insisting a pitch be found in every window would throw the note away, so
   * only the windows that still have sound in them get a vote. */
  const loud = positions.map((at) => rms(samples, Math.round(at * sampleRate),
    Math.round((at + span) * sampleRate)));
  const peak = Math.max(...loud);
  const heard = positions.filter((_, i) => loud[i] >= peak * 0.15);

  const tally = new Map();
  let used = 0;
  for (const pos of heard) {
    const start = Math.round(pos * sampleRate);
    if (start + size > samples.length) continue;
    const slice = samples.subarray(start, start + size);
    const spec = stft(slice, { size, hop: size, sampleRate });
    if (!spec.frames.length) continue;
    const det = estimateF0s(spec.frames[0], spec.binHz, {
      maxVoices,
      relThreshold: 0.13 / Math.max(0.3, sensitivity),
    });
    used++;
    for (const d of det) {
      const prev = tally.get(d.midi) || { count: 0, salience: 0, confidence: 0, hz: d.hz };
      prev.count++;
      prev.salience += d.salience;
      prev.confidence += d.confidence;
      tally.set(d.midi, prev);
    }
  }
  if (!used) return new Map();

  /* A pitch has to hold up across the segment, not flash in one window. */
  const need = used >= 2 ? 2 : 1;
  const out = new Map();
  let strongest = 0;
  for (const [, v] of tally) strongest = Math.max(strongest, v.salience / v.count);
  for (const [midi, v] of tally) {
    if (v.count < need) continue;
    const salience = v.salience / v.count;
    /* Anything this far below the loudest thing in the segment is residue. */
    if (salience < strongest * 0.11) continue;
    out.set(midi, {
      midi,
      salience,
      confidence: (v.confidence / v.count) * (v.count / used),
    });
  }
  return out;
}

/* Windows for the re-attack test, shortest first. */
const ATTACK_WINDOWS = [1024, 2048, 4096];

/**
 * Was this pitch struck again at `t`, or is it simply still ringing?
 *
 * A struck string starts over: the energy just after the attack stands well
 * above the decayed level just before it.  A note that is merely still
 * sounding while the music changes around it does not.  The measurement uses
 * only the partials this pitch does not share with its neighbours, so a held
 * note is not reported as re-struck every time a melody note above it moves
 * through one of its harmonics.
 *
 * Returns the after/before ratio, or null when there is not room to measure.
 */
function reattackRatio(samples, sampleRate, t, midi, others, earliest, latest) {
  const gap = 0.012;
  const hz = midiToHz(midi);
  const room = Math.min(t - earliest, latest - t) - gap;
  /* The shortest window that can still tell this note apart from its
   * neighbours.  Long windows average across the whole of the previous note
   * instead of reporting the level it had fallen to just before this attack;
   * short ones cannot separate two notes a tone apart, and measure their sum.
   * The compromise is to ask only for enough resolution to separate them at
   * the third partial, where neighbouring notes are three times further apart
   * in Hz than they are at the fundamental.  When even the longest window
   * available cannot manage that — a low bass note, or an attack too close to
   * the one before — the honest answer is that we cannot tell, and the note
   * stays whole. */
  const needed = 14 * sampleRate / hz;
  let size = 0;
  for (const w of ATTACK_WINDOWS) {
    if (w / sampleRate <= room && w >= needed) { size = w; break; }
  }
  if (!size) return null;
  const measure = (at) => {
    const start = Math.round(at * sampleRate);
    if (start < 0 || start + size > samples.length) return null;
    const spec = stft(samples.subarray(start, start + size), { size, hop: size, sampleRate });
    if (!spec.frames.length) return null;
    return ownPartialEnergy(spec.frames[0], spec.binHz, hz, others).energy;
  };
  const before = measure(t - gap - size / sampleRate);
  const after = measure(t + gap);
  if (before === null || after === null) return null;
  if (before < 1e-7) return after > 1e-7 ? Infinity : null;
  return after / before;
}


/**
 * Did the recording actually get louder here?
 *
 * Striking a string puts energy in.  Letting the analysis settle does not: a
 * held chord decays across every boundary inside it, so a boundary where the
 * level is falling had nothing struck at it, whatever the spectrum seems to
 * say once the attack transient has cleared.  This is the measurement that
 * tells a chord played twice from one chord read twice, and it comes from the
 * recording rather than from a rule about how chords behave.
 */
function levelRise(samples, sampleRate, at, window = 0.045) {
  const w = Math.round(window * sampleRate);
  const i = Math.round(at * sampleRate);
  if (i - w < 0 || i + w > samples.length) return 1;
  const before = rms(samples, i - w, i);
  const after = rms(samples, i, i + w);
  if (before <= 1e-9) return after > 1e-9 ? 4 : 1;
  return after / before;
}

/**
 * Drop partials that were read as notes.
 *
 * A struck string puts energy at two, three and four times its pitch, and when
 * the estimator cannot account for all of it the leftover comes back as a note
 * that nobody played — faint, brief, uncertain, and sitting exactly on a
 * harmonic of something louder sounding at the same moment.  All four have to
 * hold before anything is removed: a genuine octave or twelfth in a chord is
 * neither faint nor brief, and survives every one of these tests.
 */
function removeHarmonicLeaks(notes) {
  for (let i = notes.length - 1; i >= 0; i--) {
    const n = notes[i];
    let loudest = 0;
    for (const o of notes) {
      if (o !== n && o.start < n.end && o.end > n.start) loudest = Math.max(loudest, o.salience || 0);
    }
    if (!loudest || (n.salience || 0) > loudest * 0.18) continue;
    if (n.end - n.start >= 0.15 && (n.confidence ?? 1) >= 0.35) continue;
    const leak = notes.some((o) => {
      if (o === n || o.midi >= n.midi) return false;
      if (!(o.start < n.end && o.end > n.start)) return false;
      if ((o.salience || 0) < (n.salience || 0) * 2) return false;
      const ratio = Math.pow(2, (n.midi - o.midi) / 12);
      const h = Math.round(ratio);
      return h >= 2 && Math.abs(ratio - h) < 0.035;
    });
    if (leak) notes.splice(i, 1);
  }
}

/**
 * Extract note events from audio.
 * Returns { notes, onsets, duration, sampleRate }; each note is
 * { midi, start, end, velocity, confidence }.
 */
function* extractSteps(audio, options = {}) {
  const {
    sampleRate = 44100,
    maxVoices = 10,
    sensitivity = 1,
    minDuration = 0.05,
    pitchCap = 8192,
    silenceFloor = 0.012,
    reattack = 1.45,
    attackFloor = 0.42,
    onProgress = null,
  } = options;

  const samples = toMono(audio);
  const duration = samples.length / sampleRate;
  const { onsets } = yield* onsetSteps(samples, { sampleRate, sensitivity });

  /* Attacks cut the take into segments, starting from the first sound. */
  const bounds = [{ time: onsets.length ? Math.min(onsets[0].time, 0.02) : 0, strength: 1 }];
  for (const o of onsets) {
    if (o.time > bounds[bounds.length - 1].time + 0.05) bounds.push(o);
  }
  bounds.push({ time: duration, strength: 0 });

  const segments = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const from = bounds[i].time;
    const to = bounds[i + 1].time;
    if (to - from < 0.03) continue;
    const level = rms(samples, Math.round(from * sampleRate), Math.round(to * sampleRate));
    segments.push({ from, to, level, strength: bounds[i].strength, strongest: 0, pitches: new Map() });
  }
  let loudestSeg = 0;
  for (const s of segments) loudestSeg = Math.max(loudestSeg, s.level);

  /* The expensive part of the whole program: one multiple-F0 estimation per
   * segment.  It pauses between segments so a browser can breathe. */
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.level > loudestSeg * silenceFloor) {
      seg.pitches = analyseSegment(samples, sampleRate, seg.from, seg.to,
        { maxVoices, sensitivity, pitchCap });
      for (const p of seg.pitches.values()) seg.strongest = Math.max(seg.strongest, p.salience);
    }
    const done = (i + 1) / segments.length;
    if (onProgress) onProgress(done);
    yield { stage: 'pitch', progress: done };
  }

  /* Stitch segments into notes.
   *
   * A pitch is not finished the moment the estimator stops reporting it.  A
   * low note under a chord is hard to see, and the reading of one segment can
   * lose it and the next find it again while the string never stopped
   * sounding.  So a pitch that disappears is set aside rather than ended, and
   * if it comes back before a note could plausibly have been played again it
   * is the same note carrying on.  Without this a held bass under a moving
   * hand comes out as the same note struck four times. */
  const bridge = 0.13;
  /* How far back a note may be dated to the attack it belongs to. */
  const backdate = 0.5;
  let struckAt = null;         // the last boundary where something was played
  const open = new Map();      // midi -> note being built
  const parked = new Map();    // midi -> note that has gone quiet but may return
  const notes = [];
  const keep = (n) => { if (n.end - n.start >= minDuration) notes.push(n); };
  const close = (midi, end) => {
    const n = open.get(midi);
    if (!n) return;
    n.end = end;
    open.delete(midi);
    keep(n);
  };
  const park = (midi, end) => {
    const n = open.get(midi);
    if (!n) return;
    n.end = end;
    open.delete(midi);
    parked.set(midi, n);
  };
  const retire = (midi) => {
    const n = parked.get(midi);
    if (!n) return;
    parked.delete(midi);
    keep(n);
  };

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const prev = segments[i - 1];
    const struck = (seg.strength || 0) >= attackFloor;

    /* A pitch that has been quiet too long to be the same note is finished. */
    for (const [midi, n] of [...parked]) if (seg.from - n.end > bridge) retire(midi);

    /* Which of the pitches carrying across this boundary were struck again.
     *
     * Every one of them is measured before any of them is acted on, because
     * the answer for one depends on the answer for the rest.  A repeated chord
     * re-strikes all of its notes at once.  A single note in the middle of a
     * held chord that appears to gain energy on its own has almost always done
     * nothing of the kind: it is the estimator settling, finally seeing a
     * pitch that the attack transient had been masking.  Cutting the note
     * there is what turns one chord into a chord followed by fragments. */
    const carried = [];
    if (prev && struck) {
      for (const [midi, info] of seg.pitches) {
        const cur = open.get(midi);
        if (!cur) continue;
        /* Everything else sounding across this boundary, so the test can
         * ignore the partials this pitch shares with any of it. */
        const others = [];
        for (const m of seg.pitches.keys()) if (m !== midi) others.push(midiToHz(m));
        for (const m of prev.pitches.keys()) {
          if (m !== midi && !seg.pitches.has(m)) others.push(midiToHz(m));
        }
        const ratio = reattackRatio(samples, sampleRate, seg.from, midi, others,
          Math.max(prev.from, cur.start), seg.to);
        const before = prev.pitches.get(midi);
        const rose = !!before && info.salience > before.salience * 1.3
          && seg.from - cur.start > 0.09;
        carried.push({ midi, ratio, rose });
      }
    }
    /* The pitch-specific measurement stands on its own: it looked at this
     * note's own partials.  The fallback — this pitch simply reads louder than
     * it did — is only worth anything when the notes around it agree, or when
     * there are too few of them for their agreement to mean anything. */
    const looksStruck = (c) => (c.ratio !== null ? c.ratio > reattack : c.rose);
    const together = carried.filter(looksStruck).length * 2 > carried.length;
    /* Nothing is cut in two at a boundary the recording gets quieter across. */
    const rise = i > 0 ? levelRise(samples, sampleRate, seg.from) : 1;
    const louder = rise >= 1.1;

    /* A rise in level has to be explained by something.  If no pitch is new
     * here, then whatever was struck is already sounding — the chord was
     * played again.  This is what holds a repeated chord together when its
     * lower notes are too masked for their own re-attack to be measurable:
     * the whole group is re-struck, or none of it is, because the group is
     * what the player struck.  When something new does arrive it explains the
     * rise by itself, and the notes still sounding underneath are left alone,
     * which is what keeps a held bass from being restruck under every melody
     * note above it. */
    const fresh = [...seg.pitches.keys()].filter((m) => !open.has(m) && !parked.has(m));
    const groupStruck = rise >= 1.25 && fresh.length === 0 && carried.length > 1;
    if (i === 0 || louder) struckAt = seg.from;

    for (const c of carried) {
      const again = louder && (groupStruck || (c.ratio !== null
        ? c.ratio > reattack
        : (c.rose && (together || carried.length < 3))));
      if (again) close(c.midi, seg.from);
    }

    for (const [midi, info] of seg.pitches) {
      /* Back again, soon enough, and with nothing struck to explain it: the
       * same note, which was simply hard to see for a moment. */
      if (!open.has(midi) && parked.has(midi) && !louder) {
        const back = parked.get(midi);
        parked.delete(midi);
        back.end = seg.to;
        open.set(midi, back);
      }
      if (!open.has(midi)) {
        /* Notes begin when something is struck.  A pitch that first appears at
         * a boundary where nothing much happened, and is faint beside what is
         * already sounding, is the residue of the notes around it rather than
         * a note of its own — real playing that soft does not arrive without
         * an attack to announce it. */
        if (i > 0 && (seg.strength || 0) < attackFloor
            && info.salience < seg.strongest * 0.25) continue;
        /* Nor in the fading tail of what came before.  Everything in a decay is
         * quiet, so a note there can look strong beside its neighbours while
         * being nothing at all beside the music. */
        if (i > 0 && (seg.strength || 0) < attackFloor
            && seg.level < loudestSeg * 0.12) continue;
        /* Notes begin when something is struck.  If nothing was struck here,
         * this pitch did not begin here either — it has been sounding since
         * the last attack and has only now become possible to see, which is
         * the ordinary fate of the middle of a chord voiced in octaves.  It is
         * dated to the attack it belongs to, so the chord keeps one moment
         * instead of being dealt out across the segments that uncovered it. */
        const hidden = info.salience < seg.strongest * 0.55;
        const began = !louder && hidden && struckAt !== null && seg.from - struckAt <= backdate
          ? struckAt : seg.from;
        open.set(midi, {
          midi, start: began, end: seg.to, velocity: 0,
          salience: info.salience, confidence: info.confidence, frames: 1,
        });
      } else {
        const n = open.get(midi);
        n.end = seg.to;
        n.frames++;
        n.confidence = (n.confidence * (n.frames - 1) + info.confidence) / n.frames;
        n.salience = Math.max(n.salience, info.salience);
      }
    }
    /* A pitch missing from this segment stopped at its boundary, not at the
     * far end of it — closing late would swallow the rest that follows.  It is
     * set aside rather than ended, in case it is only out of sight. */
    for (const midi of [...open.keys()]) {
      if (!seg.pitches.has(midi)) park(midi, seg.from);
    }
  }
  for (const midi of [...open.keys()]) close(midi, duration);
  for (const midi of [...parked.keys()]) retire(midi);

  /* A take usually ends with silence on the end of it, and a note held open to
   * the last sample becomes a note held for several bars.  Where nothing
   * follows a note, its end is trimmed to where the recording actually stops
   * sounding.  Only the last notes are treated this way: while other notes are
   * still playing, the overall level says nothing about when this one ended. */
  if (notes.length) {
    const step = Math.round(0.02 * sampleRate);
    let peak = 0;
    const level = [];
    for (let at = 0; at + step <= samples.length; at += step) {
      const v = rms(samples, at, at + step);
      level.push(v);
      peak = Math.max(peak, v);
    }
    let lastLoud = level.length - 1;
    while (lastLoud > 0 && level[lastLoud] < peak * 0.08) lastLoud--;
    const stops = ((lastLoud + 1) * step) / sampleRate;
    for (const n of notes) {
      if (n.end >= duration - 1e-6 && n.start < stops) n.end = Math.max(n.start + minDuration, stops);
    }
  }

  removeHarmonicLeaks(notes);

  /* Drop what is left of decayed notes: real notes stand far above this. */
  let strongest = 0;
  for (const n of notes) strongest = Math.max(strongest, n.salience);
  const floor = strongest * 0.035;
  for (let i = notes.length - 1; i >= 0; i--) if (notes[i].salience < floor) notes.splice(i, 1);

  /* Velocity from the level at each attack, scaled across the whole take. */
  let loudest = 0;
  for (const n of notes) {
    const a = Math.round(n.start * sampleRate);
    n._level = rms(samples, a, a + Math.round(0.05 * sampleRate));
    loudest = Math.max(loudest, n._level);
  }
  for (const n of notes) {
    n.velocity = Math.max(20, Math.min(127, Math.round(32 + 78 * (n._level / (loudest || 1)))));
    delete n._level;
    delete n.frames;
  }

  notes.sort((a, b) => a.start - b.start || a.midi - b.midi);
  return { notes, onsets, duration, sampleRate };
}

/**
 * Extract note events from audio.
 * Returns { notes, onsets, duration, sampleRate }; each note is
 * { midi, start, end, velocity, confidence }.
 */
export function extractNotes(audio, options = {}) {
  return runSync(extractSteps(audio, options));
}

export { extractSteps };

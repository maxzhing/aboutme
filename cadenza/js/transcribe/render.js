/* Cadenza — playing the notation back, so it can be checked against the source.
 *
 * The point of this module is not to make a nice sound.  It is to produce, from
 * the score as written, an audio signal that can be measured the same way the
 * original recording was measured — so that any difference between the two is
 * a difference in the notation and not in the measuring.
 *
 * That is why it renders the score rather than the note list the analysis
 * produced.  The score is what the user will keep, and it is the score that has
 * been through quantisation, tying, voicing and staff assignment, any of which
 * can lose or move a note.  Rendering the note list would check the analysis
 * against itself and always agree.
 *
 * The flattening is the playback engine's own: the same walk over repeats,
 * ties, dynamics, articulations, grace notes and tempo changes that a listener
 * would hear, so what is measured is what the notation says.
 */

import { Player } from '../audio/player.js';

/* Partial structure by instrument family.  Timbre is not what the comparison
 * looks at — it measures energy along each pitch's harmonic series — but a
 * render whose spectrum is in the right general shape keeps the residual small
 * enough that real differences stand out from it. */
const TIMBRES = {
  piano: { partials: 14, rolloff: 1.35, even: 0.75, stiffness: 0.0004, decay: 1.2, sustain: 0.0 },
  pluck: { partials: 12, rolloff: 1.5, even: 0.8, stiffness: 0.0006, decay: 2.4, sustain: 0.0 },
  bell: { partials: 8, rolloff: 1.1, even: 0.55, stiffness: 0.002, decay: 1.0, sustain: 0.0 },
  organ: { partials: 10, rolloff: 1.0, even: 0.9, stiffness: 0, decay: 0.05, sustain: 0.95 },
  strings: { partials: 14, rolloff: 1.2, even: 0.9, stiffness: 0, decay: 0.15, sustain: 0.9 },
  bowed: { partials: 14, rolloff: 1.2, even: 0.9, stiffness: 0, decay: 0.15, sustain: 0.9 },
  flute: { partials: 6, rolloff: 2.1, even: 0.6, stiffness: 0, decay: 0.1, sustain: 0.95 },
  oboe: { partials: 12, rolloff: 1.0, even: 1.0, stiffness: 0, decay: 0.1, sustain: 0.92 },
  clarinet: { partials: 12, rolloff: 1.1, even: 0.25, stiffness: 0, decay: 0.1, sustain: 0.94 },
  brass: { partials: 14, rolloff: 0.95, even: 1.0, stiffness: 0, decay: 0.12, sustain: 0.9 },
  reed: { partials: 12, rolloff: 1.1, even: 0.8, stiffness: 0, decay: 0.1, sustain: 0.92 },
  voice: { partials: 10, rolloff: 1.3, even: 0.85, stiffness: 0, decay: 0.12, sustain: 0.92 },
  noise: { partials: 4, rolloff: 1.0, even: 1.0, stiffness: 0.01, decay: 6, sustain: 0 },
};

const timbreFor = (preset) => TIMBRES[preset] || TIMBRES.piano;
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

/** Lay one note into the buffer. */
function layNote(buf, sampleRate, ev, amp) {
  const t = timbreFor(ev.preset);
  const f0 = hz(ev.midi);
  const at = Math.round(ev.time * sampleRate);
  /* A struck note rings on past its written end; a blown one stops.  The ring
   * is kept short: it is there so the render sounds like an instrument, and a
   * long tail would be compared against whatever the recording does next. */
  const ring = t.sustain > 0 ? 0.08 : 0.25;
  const total = Math.round((ev.dur + ring) * sampleRate);
  const held = ev.dur;
  const partials = [];
  for (let h = 1; h <= t.partials; h++) {
    const f = f0 * h * Math.sqrt(1 + t.stiffness * h * h);
    if (f > sampleRate * 0.45) break;
    partials.push({ f: (2 * Math.PI * f) / sampleRate, a: Math.pow(h, -t.rolloff) * (h % 2 ? 1 : t.even) });
  }
  if (!partials.length) return;
  const attack = Math.max(1, Math.round(0.006 * sampleRate));
  for (let i = 0; i < total; i++) {
    const k = at + i;
    if (k < 0) continue;
    if (k >= buf.length) break;
    const sec = i / sampleRate;
    let env;
    if (sec < held) {
      env = Math.min(1, i / attack) * (t.sustain + (1 - t.sustain) * Math.exp(-t.decay * sec));
    } else {
      const after = sec - held;
      const level = t.sustain + (1 - t.sustain) * Math.exp(-t.decay * held);
      env = level * Math.exp(-(t.sustain > 0 ? 26 : 3.2) * after);
    }
    if (env < 1e-4) { if (sec > held) break; else continue; }
    let s = 0;
    for (const p of partials) s += p.a * Math.sin(p.f * i);
    buf[k] += amp * env * s;
  }
}

/**
 * Render a score to mono audio.
 *
 * Returns { samples, sampleRate, duration, events } — the events being what the
 * notation actually says, which the comparison uses to name what is different
 * in musical terms rather than only in spectral ones.
 */
export function renderNotation(score, opts = {}) {
  const { sampleRate = 44100, tail = 1.2, maxSeconds = 120 } = opts;
  const player = new Player();
  player.setScore(score);
  player.build();
  const events = player.events.filter((e) => e.midi !== undefined && e.channel !== 'click');
  const duration = Math.min(maxSeconds, (player.totalTime || 0) + tail);
  const samples = new Float32Array(Math.max(1, Math.round(duration * sampleRate)));
  for (const ev of events) {
    if (ev.time > duration) continue;
    layNote(samples, sampleRate, ev, 0.16 * (ev.velocity / 90));
  }
  /* Keep the peak where a recording's would be, so the two are comparable
   * without either being scaled to flatter it. */
  let peak = 0;
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
  if (peak > 0.99) { const g = 0.99 / peak; for (let i = 0; i < samples.length; i++) samples[i] *= g; }
  return { samples, sampleRate, duration, events, totalTime: player.totalTime };
}

/**
 * The notes the notation says, as plain timed events.
 * The same walk as the renderer, without the audio — used where only the
 * musical content is wanted.
 */
export function notationEvents(score) {
  const player = new Player();
  player.setScore(score);
  player.build();
  return player.events
    .filter((e) => e.midi !== undefined && e.channel !== 'click')
    .map((e) => ({ midi: e.midi, start: e.time, end: e.time + e.dur, velocity: e.velocity }))
    .sort((a, b) => a.start - b.start || a.midi - b.midi);
}

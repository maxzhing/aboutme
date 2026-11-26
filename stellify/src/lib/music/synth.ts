import { freq, midi } from './theory';

/**
 * A small piano-like synthesizer built on the Web Audio API: no samples, no network, works offline.
 * Each note is a few harmonics with a fast attack and a natural decay.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let wave: PeriodicWave | null = null;
const live = new Set<AudioScheduledSourceNode>();

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
    const real = new Float32Array([0, 1, 0.42, 0.2, 0.12, 0.06, 0.035, 0.02]);
    wave = ctx.createPeriodicWave(real, new Float32Array(real.length));
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}
export const canPlay = () => typeof window !== 'undefined' && !!(window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext);

function tone(note: string | number, at: number, dur: number, vel = 0.32) {
  const c = audio(); if (!c || !master || !wave) return;
  const f = typeof note === 'number' ? 440 * 2 ** ((note - 69) / 12) : freq(note);
  const osc = c.createOscillator();
  osc.setPeriodicWave(wave);
  osc.frequency.value = f;
  const g = c.createGain();
  // brighter notes decay faster, like a real string
  const decay = Math.max(0.5, 2.2 - (f / 1000));
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vel, at + 0.008);
  g.gain.exponentialRampToValueAtTime(vel * 0.45, at + 0.18);
  g.gain.exponentialRampToValueAtTime(0.0001, at + Math.min(dur + 0.35, decay + dur * 0.4));
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = Math.min(9000, f * 7);
  osc.connect(lp).connect(g).connect(master);
  osc.start(at); osc.stop(at + dur + 0.6);
  live.add(osc); osc.onended = () => live.delete(osc);
}

/** Play notes together (a chord) now. */
export function playChord(notes: (string | number)[], dur = 1.4) {
  const c = audio(); if (!c) return;
  const t = c.currentTime + 0.03;
  notes.forEach((n) => tone(n, t, dur, 0.34 / Math.sqrt(Math.max(1, notes.length))));
}
/**
 * Play a sequence: each step is one note or a chord. `beats` gives each step's length in beats
 * (default 1); `arpeggiate` rolls each chord bottom to top before sounding it together.
 */
export function playSeq(steps: (string | number | (string | number)[])[], { tempo = 84, beats, arpeggiate = false }: { tempo?: number; beats?: number[]; arpeggiate?: boolean } = {}) {
  const c = audio(); if (!c) return 0;
  stopAll();
  const spb = 60 / tempo;
  let t = c.currentTime + 0.05;
  steps.forEach((s, i) => {
    const notes = Array.isArray(s) ? s : [s];
    const len = (beats?.[i] ?? 1) * spb;
    if (arpeggiate && notes.length > 1) {
      const sorted = [...notes].sort((a, b) => (typeof a === 'number' ? a : midi(a)) - (typeof b === 'number' ? b : midi(b)));
      sorted.forEach((n, k) => tone(n, t + k * spb * 0.5, spb * 0.5 * (sorted.length - k) + len, 0.3));
      t += sorted.length * spb * 0.5;
    }
    notes.forEach((n) => tone(n, t, len * 0.95, 0.34 / Math.sqrt(Math.max(1, notes.length))));
    t += len;
  });
  return t - c.currentTime;
}
export function stopAll() {
  for (const o of live) { try { o.stop(); } catch { /* already stopped */ } }
  live.clear();
}

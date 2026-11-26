import { useStore } from './store';

/**
 * Tiny synthesised sound effects (no audio files), designed to be soft: sine tones with smooth
 * attacks, gentle pitch glides and a warm low-pass filter, at low volume. Silent if sound is off
 * or audio is unavailable.
 */
let ctx: AudioContext | null = null;
let out: AudioNode | null = null;
let lastTap = 0;
// [start frequency Hz, start s, duration s, end frequency Hz (glide), peak gain]
type Note = [number, number, number, number?, number?];
const NOTES: Record<string, Note[]> = {
  // a soft "pop", like pressing a cushioned key
  tap: [[760, 0, 0.05, 430, 0.03]],
  // a two-note bell
  correct: [[784, 0, 0.32, 784, 0.05], [1175, 0.07, 0.42, 1175, 0.04], [2350, 0.07, 0.2, 2350, 0.008]],
  // a low, gentle "bloop" (never a buzzer)
  wrong: [[330, 0, 0.22, 220, 0.045]],
  combo: [[784, 0, 0.22, 784, 0.045], [988, 0.07, 0.22, 988, 0.045], [1319, 0.14, 0.4, 1319, 0.045]],
  win: [[523, 0, 0.3, 523, 0.045], [659, 0.1, 0.3, 659, 0.045], [784, 0.2, 0.3, 784, 0.045], [1047, 0.3, 0.7, 1047, 0.05]],
};
function audio(): { c: AudioContext; o: AudioNode } | null {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    // warm everything a little: a gentle low-pass and a master volume
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; lp.Q.value = 0.4;
    const master = ctx.createGain(); master.gain.value = 0.9;
    lp.connect(master).connect(ctx.destination);
    out = lp;
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return { c: ctx, o: out! };
}
export function sfx(kind: keyof typeof NOTES) {
  try {
    if (useStore.getState().settings.sound === false) return;
    if (kind === 'tap') { const now = performance.now(); if (now - lastTap < 45) return; lastTap = now; }
    const a = audio();
    if (!a) return;
    const t0 = a.c.currentTime + 0.005;
    for (const [f, at, dur, fEnd = f, peak = 0.05] of NOTES[kind]) {
      const o = a.c.createOscillator(), g = a.c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t0 + at);
      if (fEnd !== f) o.frequency.exponentialRampToValueAtTime(fEnd, t0 + at + dur * 0.8);
      g.gain.setValueAtTime(0.0001, t0 + at);
      g.gain.exponentialRampToValueAtTime(peak, t0 + at + Math.min(0.012, dur / 4));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
      o.connect(g).connect(a.o);
      o.start(t0 + at); o.stop(t0 + at + dur + 0.03);
    }
  } catch { /* sound is a nicety, never a failure */ }
}

/** A tiny tap on phones that support it (respects the sound setting, which doubles as "feedback"). */
export function haptic(ms = 8) {
  try {
    if (useStore.getState().settings.sound === false) return;
    if (window.matchMedia?.('(pointer: coarse)').matches) navigator.vibrate?.(ms);
  } catch { /* not supported */ }
}

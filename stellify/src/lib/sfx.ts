import { useStore } from './store';

/** Tiny synthesised sound effects (no audio files). Silent if sound is off or audio is unavailable. */
let ctx: AudioContext | null = null;
const NOTES: Record<string, [number, number, number][]> = {
  // [frequency Hz, start s, duration s]
  correct: [[660, 0, 0.09], [880, 0.08, 0.14]],
  wrong: [[196, 0, 0.18]],
  tap: [[520, 0, 0.04]],
  combo: [[660, 0, 0.07], [880, 0.07, 0.07], [1175, 0.14, 0.16]],
  win: [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1047, 0.3, 0.25]],
};
export function sfx(kind: keyof typeof NOTES) {
  try {
    if (useStore.getState().settings.sound === false) return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    const t0 = ctx.currentTime;
    for (const [f, at, dur] of NOTES[kind]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = kind === 'wrong' ? 'triangle' : 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + at);
      g.gain.exponentialRampToValueAtTime(0.07, t0 + at + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t0 + at); o.stop(t0 + at + dur + 0.02);
    }
  } catch { /* sound is a nicety, never a failure */ }
}

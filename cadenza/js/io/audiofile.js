/* Cadenza — offline audio rendering and WAV encoding.
 *
 * Playback and rendering share the same synthesis code; only the audio
 * context differs, so what you export is what you heard.
 */

import { SynthEngine } from '../audio/synth.js';
import { Player } from '../audio/player.js';

/**
 * Render the score (or a measure range) to an AudioBuffer, faster than
 * real time.  `onProgress` is called with 0..1.
 */
export async function renderScore(score, { sampleRate = 44100, fromMeasure = 0, tail = 2.5, onProgress } = {}) {
  const probe = new Player();
  probe.setScore(score);
  probe.build(fromMeasure);
  const length = Math.ceil((probe.totalTime + tail) * sampleRate);
  if (length <= 0) throw new Error('Nothing to render.');

  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const ctx = new OfflineCtx(2, length, sampleRate);
  const synth = new SynthEngine();
  synth.attach(ctx);

  const anySolo = score.parts.some((p) => p.solo);
  for (const part of score.parts) {
    const audible = anySolo ? part.solo : !part.mute;
    synth.setChannel(part.id, { volume: part.volume, pan: part.pan, mute: !audible });
  }

  /* Everything is scheduled up front; the offline context runs it all. */
  for (const e of probe.events) {
    if (e.metronome) continue;
    const part = score.parts[e.partIndex];
    if (part) {
      const audible = anySolo ? part.solo : !part.mute;
      if (!audible) continue;
    }
    synth.play({
      preset: e.preset, midi: e.midi, velocity: e.velocity, time: e.time + 0.05,
      duration: e.dur, channel: e.channel, articulation: e.articulation,
    });
  }
  if (onProgress) onProgress(0.1);
  const buffer = await ctx.startRendering();
  if (onProgress) onProgress(1);
  return buffer;
}

/** Encode an AudioBuffer as a 16-bit PCM WAV file. */
export function encodeWAV(buffer) {
  const channels = buffer.numberOfChannels;
  const frames = buffer.length;
  const rate = buffer.sampleRate;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = frames * blockAlign;
  const out = new ArrayBuffer(44 + dataSize);
  const view = new DataView(out);

  const ascii = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, dataSize, true);

  const data = [];
  for (let c = 0; c < channels; c++) data.push(buffer.getChannelData(c));
  let off = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      let s = data[c][i];
      s = s < -1 ? -1 : s > 1 ? 1 : s;
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([out], { type: 'audio/wav' });
}

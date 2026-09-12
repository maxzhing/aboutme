/* Cadenza — Standard MIDI File export (format 1). */

import { TPQ, measureTicks, eventTicks } from '../core/rhythm.js';
import { timeSigAt, keySigAt, tempoAt, soundingPitch, UNIT_TICKS } from '../core/model.js';
import { toMidi } from '../core/theory.js';
import { getInstrument } from '../core/instruments.js';
import { DYNAMIC_BY_ID } from '../engrave/glyphs.js';

function vlq(n) {
  const bytes = [n & 0x7f];
  n >>= 7;
  while (n > 0) { bytes.unshift((n & 0x7f) | 0x80); n >>= 7; }
  return bytes;
}

function str(s) {
  return [...s].map((c) => c.charCodeAt(0) & 0xff);
}

function chunk(id, data) {
  const len = data.length;
  return [...str(id), (len >> 24) & 255, (len >> 16) & 255, (len >> 8) & 255, len & 255, ...data];
}

/** Build a Standard MIDI File as a Uint8Array. */
export function exportMIDI(score) {
  const tracks = [];

  /* Track 0 carries tempo, meter and key — the conductor track. */
  const meta = [];
  let last = 0;
  const push = (tick, bytes) => { meta.push(...vlq(tick - last), ...bytes); last = tick; };
  push(0, [0xff, 0x03, ...lenPrefixed(score.title || 'Score')]);
  let tick = 0;
  let prevTs = null;
  let prevKey = null;
  for (let m = 0; m < score.measures.length; m++) {
    const spec = score.measures[m] || {};
    const ts = timeSigAt(score, m);
    const key = keySigAt(score, m);
    if (m === 0 || (spec.timeSig && (!prevTs || prevTs.beats !== ts.beats || prevTs.beatType !== ts.beatType))) {
      const denomPow = Math.round(Math.log2(ts.beatType));
      push(tick, [0xff, 0x58, 0x04, ts.beats, denomPow, 24, 8]);
    }
    if (m === 0 || (spec.keySig && (!prevKey || prevKey.fifths !== key.fifths))) {
      push(tick, [0xff, 0x59, 0x02, key.fifths & 0xff, key.mode === 'minor' ? 1 : 0]);
    }
    const tempo = tempoAt(score, m);
    if (m === 0 || spec.tempo) {
      const unitTicks = UNIT_TICKS[tempo.unit] || TPQ;
      const usPerQuarter = Math.round((60000000 / tempo.bpm) * (TPQ / unitTicks));
      push(tick, [0xff, 0x51, 0x03, (usPerQuarter >> 16) & 255, (usPerQuarter >> 8) & 255, usPerQuarter & 255]);
    }
    prevTs = ts;
    prevKey = key;
    tick += measureTicks(ts);
  }
  push(tick, [0xff, 0x2f, 0x00]);
  tracks.push(chunk('MTrk', meta));

  /* One track per part. */
  let channel = 0;
  for (const part of score.parts) {
    const inst = getInstrument(part.instrumentId);
    const ch = inst.pitched === false ? 9 : (channel === 9 ? ++channel : channel);
    if (inst.pitched !== false) channel = (channel + 1) % 16;
    const events = [];
    events.push({ tick: 0, order: 0, bytes: [0xff, 0x03, ...lenPrefixed(part.name)] });
    events.push({ tick: 0, order: 1, bytes: [0xc0 | ch, part.program & 0x7f] });
    events.push({ tick: 0, order: 1, bytes: [0xb0 | ch, 7, Math.round(Math.max(0, Math.min(1, part.volume)) * 127)] });
    events.push({ tick: 0, order: 1, bytes: [0xb0 | ch, 10, Math.round(64 + Math.max(-1, Math.min(1, part.pan || 0)) * 63)] });

    let mtick = 0;
    let velocity = 80;
    for (let m = 0; m < part.measures.length; m++) {
      const ts = timeSigAt(score, m);
      const pm = part.measures[m];
      for (let v = 0; v < pm.voices.length; v++) {
        let t = mtick;
        for (let i = 0; i < pm.voices[v].length; i++) {
          const ev = pm.voices[v][i];
          if (ev.dynamic && DYNAMIC_BY_ID[ev.dynamic]) velocity = DYNAMIC_BY_ID[ev.dynamic].velocity;
          if (ev.grace) continue;
          const len = eventTicks(ev);
          if (ev.type === 'note') {
            const tiedFrom = ev.notes.some((n) => n.tie === 'stop' || n.tie === 'both');
            if (!tiedFrom) {
              let sound = len;
              /* Extend through any tie chain. */
              let mm = m;
              let idx = i;
              let cur = ev;
              while (cur.notes.some((n) => n.tie === 'start' || n.tie === 'both')) {
                const nxt = nextRealEvent(part, mm, v, idx);
                if (!nxt || nxt.event.type !== 'note') break;
                sound += eventTicks(nxt.event);
                cur = nxt.event;
                mm = nxt.measure;
                idx = nxt.index;
              }
              const arts = ev.articulations || [];
              let vel = velocity;
              if (arts.includes('accent')) vel = Math.min(127, vel + 18);
              if (arts.includes('marcato')) vel = Math.min(127, vel + 24);
              let gate = 0.92;
              if (arts.includes('staccato')) gate = 0.5;
              if (arts.includes('tenuto')) gate = 1;
              const dur = Math.max(10, Math.round(sound * gate));
              for (const n of ev.notes) {
                const midi = Math.max(0, Math.min(127, toMidi(soundingPitch(part, n.pitch))));
                events.push({ tick: t, order: 3, bytes: [0x90 | ch, midi, vel] });
                events.push({ tick: t + dur, order: 2, bytes: [0x80 | ch, midi, 0x40] });
              }
            }
          }
          t += len;
        }
      }
      mtick += measureTicks(ts);
    }
    events.push({ tick: mtick, order: 9, bytes: [0xff, 0x2f, 0x00] });
    events.sort((a, b) => a.tick - b.tick || a.order - b.order);
    const data = [];
    let prev = 0;
    for (const e of events) {
      data.push(...vlq(e.tick - prev), ...e.bytes);
      prev = e.tick;
    }
    tracks.push(chunk('MTrk', data));
  }

  const header = chunk('MThd', [0, 1, (tracks.length >> 8) & 255, tracks.length & 255, (TPQ >> 8) & 255, TPQ & 255]);
  return new Uint8Array([...header, ...tracks.flat()]);
}

function lenPrefixed(s) {
  const b = str(s).slice(0, 127);
  return [b.length, ...b];
}

function nextRealEvent(part, m, v, index) {
  const voice = part.measures[m].voices[v] || [];
  for (let i = index + 1; i < voice.length; i++) if (!voice[i].grace) return { event: voice[i], measure: m, index: i };
  const next = part.measures[m + 1];
  if (!next || !next.voices[v]) return null;
  for (let i = 0; i < next.voices[v].length; i++) if (!next.voices[v][i].grace) return { event: next.voices[v][i], measure: m + 1, index: i };
  return null;
}

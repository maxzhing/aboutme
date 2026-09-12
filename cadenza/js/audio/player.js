/* Cadenza — playback.
 *
 * The score is flattened once into a list of timed note events (following
 * repeats, ties, dynamics, articulations and ornaments), then a look-ahead
 * scheduler feeds them to the synth a slice at a time.  The playback cursor
 * reads the audio clock directly, so it stays locked to what you hear.
 */

import { SynthEngine } from './synth.js';
import { DYNAMIC_BY_ID } from '../engrave/glyphs.js';
import { TPQ, measureTicks, eventTicks, durationTicks, beatTicks } from '../core/rhythm.js';
import { timeSigAt, keySigAt, tempoAt, soundingPitch, UNIT_TICKS } from '../core/model.js';
import { toMidi, pitch } from '../core/theory.js';
import { getInstrument } from '../core/instruments.js';

const LOOKAHEAD = 0.14;     // seconds of events scheduled ahead of the clock
const TICK_INTERVAL = 25;   // ms between scheduler wake-ups

export class Player {
  constructor(synth = new SynthEngine()) {
    this.synth = synth;
    this.score = null;
    this.state = 'stopped';
    this.events = [];
    this.segments = [];
    this.totalTime = 0;
    this.cursor = 0;
    this.startedAt = 0;
    this.offset = 0;
    this.timer = null;
    this.nextIndex = 0;
    this.listeners = { position: [], state: [] };
    this.metronome = false;
    this.countIn = false;
    this.loop = null;           // { fromMeasure, toMeasure }
    this.tempoScale = 1;
    this.soloParts = null;
  }

  on(evt, fn) { (this.listeners[evt] = this.listeners[evt] || []).push(fn); return this; }
  emit(evt, ...args) { for (const fn of this.listeners[evt] || []) fn(...args); }

  setScore(score) {
    this.score = score;
    this.dirty = true;
  }

  invalidate() { this.dirty = true; }

  /* --------------------------------------------------------- play order */

  /** Expand repeat barlines into the order measures are actually played. */
  playOrder(score, fromMeasure = 0) {
    const order = [];
    let m = fromMeasure;
    let repeatStart = fromMeasure;
    const taken = new Set();
    let guard = 0;
    while (m < score.measures.length && guard++ < 4000) {
      const spec = score.measures[m] || {};
      if (spec.barline === 'repeat-start' || spec.barline === 'repeat-both') {
        if (!taken.has('s' + m)) repeatStart = m;
      }
      order.push(m);
      const isEnd = spec.barline === 'repeat-end' || spec.barline === 'repeat-both';
      if (isEnd && !taken.has(m)) {
        taken.add(m);
        m = repeatStart;
        continue;
      }
      m++;
    }
    return order;
  }

  /* ------------------------------------------------------- event building */

  build(fromMeasure = 0) {
    const score = this.score;
    this.events = [];
    this.segments = [];
    if (!score) return;

    const order = this.playOrder(score, fromMeasure);
    /* Where each measure sits on the playback clock. */
    let t = 0;
    const dynState = new Map();
    const hairpins = this.collectHairpins(score);

    for (let oi = 0; oi < order.length; oi++) {
      const m = order[oi];
      const ts = timeSigAt(score, m);
      const spanTicks = measureTicks(ts);
      const tempo = tempoAt(score, m);
      const secPerTick = this.secondsPerTick(tempo);
      const dur = spanTicks * secPerTick;
      this.segments.push({ measure: m, t0: t, t1: t + dur, ticks: spanTicks, secPerTick });

      for (let pi = 0; pi < score.parts.length; pi++) {
        const part = score.parts[pi];
        const inst = getInstrument(part.instrumentId);
        const pm = part.measures[m];
        if (!pm) continue;
        if (!dynState.has(pi)) dynState.set(pi, 80);
        for (let v = 0; v < pm.voices.length; v++) {
          let tick = 0;
          const voice = pm.voices[v];
          for (let i = 0; i < voice.length; i++) {
            const ev = voice[i];
            if (ev.dynamic) {
              const d = DYNAMIC_BY_ID[ev.dynamic];
              if (d) dynState.set(pi, d.velocity);
            }
            if (ev.grace) {
              this.emitGrace(ev, part, pi, t, tick, secPerTick, dynState.get(pi), inst);
              continue;
            }
            if (ev.type === 'note') {
              const hp = hairpins.get(ev.id);
              let vel = dynState.get(pi);
              if (hp) vel = hp.velocity;
              this.emitNote(score, ev, part, pi, m, v, i, t, tick, secPerTick, vel, inst, ts);
            }
            tick += eventTicks(ev);
          }
        }
      }
      /* A fermata stretches the bar it sits in. */
      const fermata = this.measureHasFermata(score, m);
      t += dur * (fermata ? 1.55 : 1);
      if (fermata) this.segments[this.segments.length - 1].t1 = t;
    }
    this.totalTime = t;
    this.dirty = false;
    if (this.metronome) this.addMetronome();
    this.events.sort((a, b) => a.time - b.time);
  }

  secondsPerTick(tempo) {
    const unitTicks = UNIT_TICKS[tempo.unit] || TPQ;
    const bpm = (tempo.bpm || 96) * this.tempoScale;
    return 60 / bpm / unitTicks;
  }

  measureHasFermata(score, m) {
    for (const part of score.parts) {
      const pm = part.measures[m];
      if (!pm) continue;
      for (const voice of pm.voices) {
        for (const ev of voice) if (ev.articulations && ev.articulations.includes('fermata')) return true;
      }
    }
    return false;
  }

  /** Map hairpin spans onto per-note velocities. */
  collectHairpins(score) {
    const out = new Map();
    for (const sp of score.spanners || []) {
      if (sp.type !== 'cresc' && sp.type !== 'dim') continue;
      const chain = this.eventsBetween(score, sp.fromId, sp.toId);
      if (!chain.length) continue;
      const startVel = this.dynamicBefore(score, sp.fromId) || 64;
      const endVel = sp.type === 'cresc'
        ? Math.min(120, startVel + 34) : Math.max(18, startVel - 34);
      chain.forEach((ev, i) => {
        const f = chain.length > 1 ? i / (chain.length - 1) : 1;
        out.set(ev.id, { velocity: Math.round(startVel + (endVel - startVel) * f) });
      });
    }
    return out;
  }

  eventsBetween(score, fromId, toId) {
    for (const part of score.parts) {
      const flat = [];
      for (const pm of part.measures) for (const voice of pm.voices) for (const ev of voice) flat.push(ev);
      const a = flat.findIndex((e) => e.id === fromId);
      const b = flat.findIndex((e) => e.id === toId);
      if (a >= 0 && b >= a) return flat.slice(a, b + 1).filter((e) => e.type === 'note');
    }
    return [];
  }

  dynamicBefore(score, eventId) {
    for (const part of score.parts) {
      let vel = null;
      let found = false;
      for (const pm of part.measures) {
        for (const voice of pm.voices) {
          for (const ev of voice) {
            if (ev.dynamic && DYNAMIC_BY_ID[ev.dynamic]) vel = DYNAMIC_BY_ID[ev.dynamic].velocity;
            if (ev.id === eventId) { found = true; break; }
          }
          if (found) break;
        }
        if (found) break;
      }
      if (found) return vel;
    }
    return null;
  }

  /* ------------------------------------------------------------ one note */

  emitNote(score, ev, part, partIndex, m, v, i, baseTime, tick, secPerTick, velocity, inst, ts) {
    const arts = ev.articulations || [];
    let vel = velocity;
    if (arts.includes('accent')) vel = Math.min(127, vel + 18);
    if (arts.includes('marcato')) vel = Math.min(127, vel + 24);
    if (arts.includes('tenuto')) vel = Math.min(127, vel + 4);

    let ticks = eventTicks(ev);
    /* Ties: the first note of a chain sounds for the whole chain. */
    const tiedFrom = ev.notes.some((n) => n.tie === 'stop' || n.tie === 'both');
    const tiedTo = ev.notes.some((n) => n.tie === 'start' || n.tie === 'both');
    if (tiedFrom && !tiedTo) return;
    if (tiedFrom && tiedTo) return;
    if (tiedTo) ticks += this.tiedLength(part, m, v, i, ev);

    let gate = 0.92;
    if (arts.includes('staccato')) gate = 0.48;
    if (arts.includes('staccatissimo')) gate = 0.32;
    if (arts.includes('tenuto')) gate = 1.0;
    if (arts.includes('marcato')) gate = 0.6;
    if (arts.includes('fermata')) gate = 1.5;
    if (this.isSlurred(score, ev.id)) gate = 1.0;

    const time = baseTime + tick * secPerTick;
    const dur = ticks * secPerTick * gate;
    const articulation = arts.includes('staccato') ? 'staccato'
      : arts.includes('accent') ? 'accent' : arts.includes('marcato') ? 'marcato' : null;
    const preset = this.presetFor(part, inst);
    const arpStep = ev.arpeggio ? 0.035 : 0;

    ev.notes.forEach((n, ni) => {
      const sounding = soundingPitch(part, n.pitch);
      const midi = toMidi(sounding);
      const base = {
        time: time + ni * arpStep, dur, midi, velocity: vel, partIndex,
        channel: part.id, preset, articulation, measure: m, eventId: ev.id,
      };
      if (ev.tremolo) this.emitTremolo(base, ticks, secPerTick);
      else if (ev.ornaments && ev.ornaments.length) this.emitOrnament(base, ev, ticks, secPerTick);
      else this.events.push(base);
    });
  }

  presetFor(part, inst) {
    return part.synth || inst.synth || 'piano';
  }

  tiedLength(part, m, v, i, ev) {
    let total = 0;
    let mm = m;
    let idx = i + 1;
    let guard = 0;
    let prev = ev;
    while (guard++ < 64) {
      const voice = part.measures[mm] && part.measures[mm].voices[v];
      if (!voice || idx >= voice.length) {
        mm++;
        idx = 0;
        if (mm >= part.measures.length) break;
        continue;
      }
      const nxt = voice[idx];
      if (nxt.grace) { idx++; continue; }
      if (nxt.type !== 'note') break;
      const continues = nxt.notes.some((n) => n.tie === 'stop' || n.tie === 'both');
      if (!continues) break;
      total += eventTicks(nxt);
      if (!nxt.notes.some((n) => n.tie === 'start' || n.tie === 'both')) break;
      prev = nxt;
      idx++;
    }
    return total;
  }

  isSlurred(score, eventId) {
    return (score.spanners || []).some((s) => s.type === 'slur' && (s.fromId === eventId || s.toId === eventId));
  }

  emitTremolo(base, ticks, secPerTick) {
    const total = ticks * secPerTick;
    const step = Math.max(0.055, (TPQ / 8) * secPerTick);
    const n = Math.max(2, Math.floor(total / step));
    for (let k = 0; k < n; k++) {
      this.events.push({ ...base, time: base.time + k * (total / n), dur: (total / n) * 0.9 });
    }
  }

  emitOrnament(base, ev, ticks, secPerTick) {
    const total = ticks * secPerTick;
    const ids = ev.ornaments;
    if (ids.includes('trill')) {
      const step = 0.062;
      const n = Math.max(4, Math.floor(total / step));
      for (let k = 0; k < n; k++) {
        this.events.push({
          ...base, time: base.time + k * (total / n), dur: (total / n) * 0.95,
          midi: base.midi + (k % 2 ? 2 : 0),
        });
      }
      return;
    }
    if (ids.includes('mordent') || ids.includes('mordentLower')) {
      const off = ids.includes('mordentLower') ? -1 : 2;
      const q = Math.min(0.07, total / 4);
      this.events.push({ ...base, dur: q });
      this.events.push({ ...base, time: base.time + q, dur: q, midi: base.midi + off });
      this.events.push({ ...base, time: base.time + q * 2, dur: total - q * 2 });
      return;
    }
    if (ids.includes('turn')) {
      const q = Math.min(0.075, total / 5);
      [2, 0, -1, 0].forEach((off, k) => {
        this.events.push({ ...base, time: base.time + k * q, dur: k === 3 ? total - q * 3 : q, midi: base.midi + off });
      });
      return;
    }
    this.events.push(base);
  }

  emitGrace(ev, part, partIndex, baseTime, tick, secPerTick, velocity, inst) {
    const len = ev.grace && ev.grace.type === 'appoggiatura' ? 0.16 : 0.075;
    const time = baseTime + tick * secPerTick - len;
    for (const n of ev.notes) {
      this.events.push({
        time: Math.max(0, time), dur: len * 0.9, midi: toMidi(soundingPitch(part, n.pitch)),
        velocity: Math.max(20, velocity - 10), partIndex, channel: part.id,
        preset: this.presetFor(part, inst), measure: -1, eventId: ev.id,
      });
    }
  }

  addMetronome() {
    for (const seg of this.segments) {
      const ts = timeSigAt(this.score, seg.measure);
      const beat = beatTicks(ts);
      const count = Math.round(seg.ticks / beat);
      for (let b = 0; b < count; b++) {
        this.events.push({
          time: seg.t0 + b * beat * seg.secPerTick, dur: 0.05,
          midi: b === 0 ? 76 : 77, velocity: b === 0 ? 104 : 74,
          channel: '__click', preset: 'click', measure: seg.measure, metronome: true,
        });
      }
    }
  }

  /* ------------------------------------------------------------ transport */

  play({ fromMeasure = 0, fromTick = 0 } = {}) {
    const synth = this.synth;
    synth.init();
    if (this.state === 'paused') {
      this.resumeFrom(this.cursor);
      return;
    }
    this.buildFrom = fromMeasure;
    this.build(fromMeasure);
    this.applyMixer();
    const offset = fromTick > 0 && this.segments.length
      ? Math.min(this.totalTime, fromTick * this.segments[0].secPerTick) : 0;
    this.startPlayback(offset);
  }

  startPlayback(offset) {
    const ctx = this.synth.ctx;
    this.offset = offset;
    const lead = this.countIn ? this.countInSeconds() : 0.08;
    if (this.countIn) this.scheduleCountIn(ctx.currentTime + 0.08);
    this.startedAt = ctx.currentTime + lead + 0.02;
    this.nextIndex = this.events.findIndex((e) => e.time >= offset);
    if (this.nextIndex < 0) this.nextIndex = this.events.length;
    this.state = 'playing';
    this.emit('state', this.state);
    this.tick();
    this.timer = setInterval(() => this.tick(), TICK_INTERVAL);
  }

  countInSeconds() {
    const seg = this.segments[0];
    if (!seg) return 1;
    const ts = timeSigAt(this.score, seg.measure);
    return Math.round(seg.ticks / beatTicks(ts)) * beatTicks(ts) * seg.secPerTick;
  }

  scheduleCountIn(at) {
    const seg = this.segments[0];
    if (!seg) return;
    const ts = timeSigAt(this.score, seg.measure);
    const beat = beatTicks(ts);
    const count = Math.round(seg.ticks / beat);
    for (let b = 0; b < count; b++) {
      this.click(at + b * beat * seg.secPerTick, b === 0);
    }
  }

  click(time, accent) {
    const ctx = this.synth.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = accent ? 1800 : 1250;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(accent ? 0.20 : 0.12, time + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);
    o.connect(g).connect(this.synth.master);
    o.start(time);
    o.stop(time + 0.08);
  }

  tick() {
    if (this.state !== 'playing') return;
    const ctx = this.synth.ctx;
    const now = ctx.currentTime;
    const pos = now - this.startedAt + this.offset;
    const until = pos + LOOKAHEAD;

    while (this.nextIndex < this.events.length && this.events[this.nextIndex].time < until) {
      const e = this.events[this.nextIndex++];
      const when = this.startedAt + (e.time - this.offset);
      if (when < now - 0.05) continue;
      if (e.metronome) { if (this.metronome) this.click(when, e.velocity > 90); continue; }
      if (this.isAudible(e.partIndex)) {
        this.synth.play({
          preset: e.preset, midi: e.midi, velocity: e.velocity, time: when,
          duration: e.dur, channel: e.channel, articulation: e.articulation,
        });
      }
    }

    const loopEnd = this.loopEndTime();
    if (loopEnd !== null && pos >= loopEnd) {
      this.seekTime(this.loopStartTime());
      return;
    }
    if (pos >= this.totalTime + 0.4) {
      this.stop();
      return;
    }
    this.cursor = pos;
    this.emit('position', pos, this.measureAt(pos));
  }

  isAudible(partIndex) {
    if (partIndex === undefined || !this.score) return true;
    const parts = this.score.parts;
    const anySolo = parts.some((p) => p.solo);
    const part = parts[partIndex];
    if (!part) return true;
    if (anySolo) return !!part.solo;
    return !part.mute;
  }

  applyMixer() {
    if (!this.score) return;
    const anySolo = this.score.parts.some((p) => p.solo);
    for (const part of this.score.parts) {
      const audible = anySolo ? part.solo : !part.mute;
      this.synth.setChannel(part.id, {
        volume: part.volume, pan: part.pan, mute: !audible,
      });
    }
  }

  loopStartTime() {
    if (!this.loop) return 0;
    const seg = this.segments.find((s) => s.measure === this.loop.fromMeasure);
    return seg ? seg.t0 : 0;
  }

  loopEndTime() {
    if (!this.loop) return null;
    const segs = this.segments.filter((s) => s.measure === this.loop.toMeasure);
    return segs.length ? segs[segs.length - 1].t1 : null;
  }

  /** Which score measure (and how far into it) the clock is at. */
  measureAt(time) {
    let lo = 0;
    let hi = this.segments.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const s = this.segments[mid];
      if (time < s.t0) hi = mid - 1;
      else if (time >= s.t1) lo = mid + 1;
      else return { measure: s.measure, fraction: (time - s.t0) / Math.max(0.001, s.t1 - s.t0), segment: mid };
    }
    const last = this.segments[this.segments.length - 1];
    return last ? { measure: last.measure, fraction: 1, segment: this.segments.length - 1 } : null;
  }

  pause() {
    if (this.state !== 'playing') return;
    clearInterval(this.timer);
    this.timer = null;
    this.state = 'paused';
    this.synth.allOff(0.05);
    this.emit('state', this.state);
  }

  resumeFrom(pos) {
    this.applyMixer();
    this.startPlayback(pos);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    this.state = 'stopped';
    this.cursor = 0;
    this.synth.allOff(0.02);
    this.emit('state', this.state);
    this.emit('position', 0, this.segments.length ? { measure: this.segments[0].measure, fraction: 0 } : null);
  }

  toggle(opts) {
    if (this.state === 'playing') this.pause();
    else this.play(opts);
  }

  seekTime(time) {
    const wasPlaying = this.state === 'playing';
    clearInterval(this.timer);
    this.timer = null;
    this.synth.allOff(0.02);
    this.cursor = time;
    if (wasPlaying) {
      this.state = 'stopped';
      this.startPlayback(time);
    } else {
      this.state = 'paused';
      this.emit('position', time, this.measureAt(time));
    }
  }

  seekMeasure(measure) {
    if (this.dirty || !this.segments.length) this.build(0);
    const seg = this.segments.find((s) => s.measure === measure);
    this.seekTime(seg ? seg.t0 : 0);
  }

  /** Sound a note immediately — used by note entry, MIDI input and the piano. */
  preview(midi, { preset = 'piano', velocity = 90, duration = 0.55, channel = '__preview' } = {}) {
    this.synth.init();
    this.synth.play({
      preset, midi, velocity, duration, channel, time: this.synth.ctx.currentTime + 0.005,
    });
  }
}

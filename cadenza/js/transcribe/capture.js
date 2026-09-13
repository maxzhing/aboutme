/* Cadenza — capturing a performance.
 *
 * Two ways in.  MIDI states what was played: the pitch is exact, the timing is
 * exact, and the sustain pedal is there to be read, so a transcription from
 * MIDI is limited only by how well the music is read afterwards.  Audio has to
 * be listened to, which is a harder problem and a less certain answer.  Where
 * an instrument can send MIDI, it is worth using.
 *
 * Audio is captured as raw samples rather than through a compressing recorder.
 * Opus at 64 kbit/s sounds fine and analyses badly: it discards exactly the
 * quiet high partials that tell one note from another in a chord.
 */

/**
 * Record MIDI as it is played.
 *
 * Timestamps come from the MIDI message where the browser provides them —
 * those are taken at the device rather than when the page got round to the
 * event, which matters at speed.  The sustain pedal holds notes past their
 * release, as it does on the instrument.
 */
export class MidiRecorder {
  constructor() {
    this.notes = [];
    this.sounding = new Map();   // midi -> { start, velocity }
    this.held = new Set();       // released under the pedal, still sounding
    this.pedal = false;
    this.startedAt = 0;
    this.recording = false;
  }

  start(now = performance.now()) {
    this.notes = [];
    this.sounding.clear();
    this.held.clear();
    this.pedal = false;
    this.startedAt = now;
    this.recording = true;
  }

  get duration() {
    return this.recording ? (performance.now() - this.startedAt) / 1000 : this._duration || 0;
  }

  seconds(stamp) {
    return Math.max(0, ((stamp === undefined ? performance.now() : stamp) - this.startedAt) / 1000);
  }

  noteOn(midi, velocity, stamp) {
    if (!this.recording) return;
    if (this.sounding.has(midi)) this.noteOff(midi, stamp, true);
    this.held.delete(midi);
    this.sounding.set(midi, { start: this.seconds(stamp), velocity: velocity || 80 });
  }

  noteOff(midi, stamp, force = false) {
    if (!this.recording) return;
    if (this.pedal && !force) { this.held.add(midi); return; }
    const on = this.sounding.get(midi);
    if (!on) return;
    this.sounding.delete(midi);
    const end = this.seconds(stamp);
    if (end > on.start) this.notes.push({ midi, start: on.start, end, velocity: on.velocity });
  }

  setPedal(down, stamp) {
    if (!this.recording) return;
    this.pedal = down;
    if (!down) for (const midi of [...this.held]) { this.held.delete(midi); this.noteOff(midi, stamp, true); }
  }

  /** Feed a raw MIDI message straight in. */
  message(data, stamp) {
    const [status, a, b] = data;
    const cmd = status & 0xf0;
    if (cmd === 0x90 && b > 0) this.noteOn(a, b, stamp);
    else if (cmd === 0x80 || (cmd === 0x90 && b === 0)) this.noteOff(a, stamp);
    else if (cmd === 0xb0 && a === 64) this.setPedal(b >= 64, stamp);
  }

  stop(stamp) {
    if (!this.recording) return this.notes;
    const end = this.seconds(stamp);
    this.pedal = false;
    for (const midi of [...this.sounding.keys()]) this.noteOff(midi, stamp, true);
    this.recording = false;
    this._duration = end;
    this.notes.sort((x, y) => x.start - y.start || x.midi - y.midi);
    return this.notes;
  }
}

/* ------------------------------------------------------------------ audio */

/* A worklet kept in a string so the whole application stays one file.  All it
 * does is hand each block of input back to the page. */
const WORKLET = `
class CadenzaTap extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) this.port.postMessage(input[0].slice());
    return true;
  }
}
registerProcessor('cadenza-tap', CadenzaTap);
`;

/**
 * Record from the microphone or an audio interface as raw samples.
 *
 * Echo cancellation, noise suppression and automatic gain are all turned off:
 * each of them is designed to make speech clearer by removing things that, in
 * music, are the music.
 */
export class AudioRecorder {
  constructor(opts = {}) {
    this.onLevel = opts.onLevel || (() => {});
    this.chunks = [];
    this.frames = 0;
    this.context = null;
    this.stream = null;
    this.node = null;
    this.recording = false;
    this.sampleRate = 44100;
  }

  static get supported() {
    return typeof navigator !== 'undefined' && !!(navigator.mediaDevices
      && navigator.mediaDevices.getUserMedia) && typeof AudioContext !== 'undefined';
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
    });
    this.context = new AudioContext();
    this.sampleRate = this.context.sampleRate;
    const source = this.context.createMediaStreamSource(this.stream);
    this.chunks = [];
    this.frames = 0;

    const take = (block) => {
      if (!this.recording) return;
      this.chunks.push(block);
      this.frames += block.length;
      let peak = 0;
      for (let i = 0; i < block.length; i += 16) peak = Math.max(peak, Math.abs(block[i]));
      this.onLevel(peak, this.frames / this.sampleRate);
    };

    let attached = false;
    if (this.context.audioWorklet) {
      try {
        const url = URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' }));
        await this.context.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);
        this.node = new AudioWorkletNode(this.context, 'cadenza-tap');
        this.node.port.onmessage = (e) => take(e.data);
        attached = true;
      } catch (err) {
        attached = false;
      }
    }
    if (!attached) {
      /* Older browsers: the deprecated processor node still captures the same
       * samples, and a recording that works matters more than a tidy API. */
      this.node = this.context.createScriptProcessor(4096, 1, 1);
      this.node.onaudioprocess = (e) => take(new Float32Array(e.inputBuffer.getChannelData(0)));
    }
    source.connect(this.node);
    /* A muted destination keeps the graph running without playing back. */
    const sink = this.context.createGain();
    sink.gain.value = 0;
    this.node.connect(sink);
    sink.connect(this.context.destination);
    this.recording = true;
    return true;
  }

  /** Everything recorded so far, as one mono buffer. */
  collect() {
    const out = new Float32Array(this.frames);
    let at = 0;
    for (const c of this.chunks) { out.set(c, at); at += c.length; }
    return { samples: out, sampleRate: this.sampleRate, duration: this.frames / this.sampleRate };
  }

  async stop() {
    this.recording = false;
    const result = this.collect();
    if (this.node) { this.node.disconnect(); this.node = null; }
    if (this.stream) { for (const t of this.stream.getTracks()) t.stop(); this.stream = null; }
    if (this.context) { await this.context.close().catch(() => {}); this.context = null; }
    return result;
  }
}

/* ------------------------------------------------------------- MIDI files */

const readVar = (data, at) => {
  let value = 0;
  let i = at;
  for (; i < data.length; i++) {
    value = (value << 7) | (data[i] & 0x7f);
    if (!(data[i] & 0x80)) { i++; break; }
  }
  return { value, next: i };
};

/**
 * Read a standard MIDI file into timed notes.
 *
 * Tempo changes are followed so the times come out in seconds, which is what
 * the rest of the chain works in — and which means a file whose tempo map is
 * wrong still transcribes into the rhythm that was written.
 */
export function parseMIDI(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (data.length < 14 || String.fromCharCode(...data.slice(0, 4)) !== 'MThd') {
    throw new Error('Not a MIDI file');
  }
  const division = view.getUint16(12);
  const tracks = view.getUint16(10);
  const ticksPerQuarter = division & 0x8000 ? 480 : division;

  /* Gather every track's events on one tick timeline, then convert once. */
  const events = [];
  let at = 14;
  for (let t = 0; t < tracks && at + 8 <= data.length; t++) {
    const length = view.getUint32(at + 4);
    let pos = at + 8;
    const end = Math.min(data.length, pos + length);
    let tick = 0;
    let running = 0;
    while (pos < end) {
      const delta = readVar(data, pos);
      tick += delta.value;
      pos = delta.next;
      if (pos >= end) break;
      let status = data[pos];
      if (status & 0x80) pos++; else status = running;
      running = status;
      const cmd = status & 0xf0;
      if (status === 0xff) {
        const type = data[pos++];
        const len = readVar(data, pos);
        pos = len.next;
        if (type === 0x51 && len.value === 3) {
          events.push({ tick, kind: 'tempo', usPerQuarter: (data[pos] << 16) | (data[pos + 1] << 8) | data[pos + 2] });
        }
        pos += len.value;
      } else if (status === 0xf0 || status === 0xf7) {
        const len = readVar(data, pos);
        pos = len.next + len.value;
      } else if (cmd === 0x90 || cmd === 0x80) {
        const midi = data[pos];
        const vel = data[pos + 1];
        pos += 2;
        events.push({ tick, kind: cmd === 0x90 && vel > 0 ? 'on' : 'off', midi, velocity: vel });
      } else if (cmd === 0xb0) {
        const cc = data[pos];
        const value = data[pos + 1];
        pos += 2;
        if (cc === 64) events.push({ tick, kind: 'pedal', down: value >= 64 });
      } else if (cmd === 0xc0 || cmd === 0xd0) {
        pos += 1;
      } else {
        pos += 2;
      }
    }
    at += 8 + length;
  }

  events.sort((a, b) => a.tick - b.tick);
  const recorder = new MidiRecorder();
  recorder.start(0);
  recorder.startedAt = 0;
  let usPerQuarter = 500000;
  let lastTick = 0;
  let seconds = 0;
  const timeOf = (tick) => {
    seconds += ((tick - lastTick) / ticksPerQuarter) * (usPerQuarter / 1e6);
    lastTick = tick;
    return seconds;
  };
  for (const e of events) {
    const when = timeOf(e.tick) * 1000;   // the recorder works in milliseconds
    if (e.kind === 'tempo') { usPerQuarter = e.usPerQuarter; continue; }
    if (e.kind === 'on') recorder.noteOn(e.midi, e.velocity, when);
    else if (e.kind === 'off') recorder.noteOff(e.midi, when);
    else if (e.kind === 'pedal') recorder.setPedal(e.down, when);
  }
  return recorder.stop(timeOf(lastTick) * 1000);
}

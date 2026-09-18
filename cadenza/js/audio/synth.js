/* Cadenza — instrument synthesis.
 *
 * No samples are loaded: every instrument is built from oscillators, shaped
 * noise and filters.  That keeps the app self-contained and instant to start,
 * and with careful spectra and envelopes it gets a long way from "beep".
 *
 * The piano gets the most attention, since it is what composers reach for when
 * checking a sketch.
 */

const CENT = 1 / 1200;

/* How wide an instrument stands in front of the listener, for the ones whose
 * pitch and position are the same thing: a keyboard, or a set of tuned bars.
 * Zero — the default for everything absent here — means the part's own pan
 * decides, which is right for anything a player holds. */
const SPREAD = {
  piano: 0.5, harpsichord: 0.45, celesta: 0.4, organ: 0.24,
  vibraphone: 0.48, marimba: 0.52, glockenspiel: 0.45, bell: 0.36,
  mallet: 0.48, harp: 0.42,
};

/* ------------------------------------------------------------- wavetables */

/** Build a PeriodicWave from a list of harmonic amplitudes. */
function waveFromHarmonics(ctx, amps, phases = null) {
  const n = amps.length + 1;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let i = 0; i < amps.length; i++) {
    const ph = phases ? phases[i] : 0;
    real[i + 1] = amps[i] * Math.cos(ph);
    imag[i + 1] = amps[i] * Math.sin(ph);
  }
  return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
}

function decayHarmonics(count, rolloff, odd = false, tilt = 0) {
  const out = [];
  for (let h = 1; h <= count; h++) {
    if (odd && h % 2 === 0) { out.push(0); continue; }
    let a = Math.pow(h, -rolloff);
    if (tilt) a *= Math.exp(-tilt * (h - 1));
    out.push(a);
  }
  return out;
}

/* Spectra, hand-tuned by ear against the real instruments' character. */
const SPECTRA = {
  pianoBass: [1, 0.86, 0.62, 0.48, 0.40, 0.30, 0.26, 0.20, 0.17, 0.14, 0.12, 0.10,
    0.085, 0.07, 0.06, 0.05, 0.042, 0.035, 0.03, 0.025],
  pianoMid: [1, 0.52, 0.34, 0.20, 0.14, 0.095, 0.07, 0.05, 0.038, 0.03, 0.024, 0.019,
    0.015, 0.012, 0.01, 0.008],
  pianoTreble: [1, 0.26, 0.13, 0.06, 0.035, 0.02, 0.013, 0.008, 0.005],
  stringRich: [1, 0.72, 0.58, 0.46, 0.36, 0.29, 0.23, 0.19, 0.15, 0.12, 0.10, 0.08,
    0.065, 0.05, 0.04, 0.032],
  clarinet: [1, 0.02, 0.55, 0.03, 0.32, 0.02, 0.20, 0.015, 0.12, 0.01, 0.07, 0.008, 0.04],
  oboe: [0.62, 1, 0.86, 0.62, 0.44, 0.34, 0.26, 0.19, 0.14, 0.10, 0.075, 0.055, 0.04],
  bassoon: [0.72, 1, 0.66, 0.40, 0.30, 0.22, 0.16, 0.12, 0.09, 0.07, 0.05, 0.04],
  flute: [1, 0.20, 0.09, 0.035, 0.018, 0.009, 0.005],
  sax: [1, 0.62, 0.52, 0.34, 0.26, 0.18, 0.13, 0.09, 0.065, 0.045, 0.03],
  brass: [1, 0.78, 0.64, 0.52, 0.42, 0.34, 0.27, 0.21, 0.17, 0.13, 0.10, 0.08, 0.06, 0.05],
  horn: [1, 0.60, 0.38, 0.24, 0.15, 0.10, 0.065, 0.042, 0.028, 0.018],
  voice: [1, 0.58, 0.42, 0.26, 0.16, 0.10, 0.06, 0.04, 0.025],
  organ: [1, 0.5, 0.7, 0.35, 0.22, 0.30, 0.10, 0.20, 0.08, 0.12],
  pluck: [1, 0.66, 0.44, 0.34, 0.22, 0.17, 0.12, 0.09, 0.06, 0.045, 0.03],
};

export function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

/* -------------------------------------------------------------- the engine */

export class SynthEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.waves = {};
    this.channels = new Map();
    this.placed = new Map();
    this.active = new Set();
    this.maxVoices = 64;
    this.noiseBuffer = null;
    this.masterVolume = 0.9;
    this.reverbAmount = 0.28;
  }

  /** Must be called from a user gesture the first time. */
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    return this.attach(new AC({ latencyHint: 'interactive' }));
  }

  /** Bind the engine to a context — an OfflineAudioContext when rendering. */
  attach(context) {
    this.ctx = context;
    this.channels = new Map();
    this.active = new Set();
    const ctx = this.ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.masterVolume;

    /* A limiter, not a compressor.
     *
     * At a threshold of −14 dB and a ratio above three this was working on
     * every note of every piece, not just the loud ones: it took the span
     * between a soft note and a loud one from about eight decibels to four,
     * and it moved on the attack of each chord, which is the pumping that
     * makes a mix sound squeezed.  Sitting it just under full scale with a
     * steep ratio leaves the music alone and only stops an orchestra
     * clipping, which is the job it was there to do. */
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -3;
    this.comp.knee.value = 5;
    this.comp.ratio.value = 14;
    this.comp.attack.value = 0.003;
    this.comp.release.value = 0.18;

    this.dry = ctx.createGain();
    this.dry.gain.value = 1;
    this.wet = ctx.createGain();
    this.wet.gain.value = this.reverbAmount;
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.makeImpulse(2.8, 2.2);

    this.master.connect(this.dry);
    this.dry.connect(this.comp);
    this.master.connect(this.reverb);
    this.reverb.connect(this.wet);
    this.wet.connect(this.comp);
    this.comp.connect(ctx.destination);

    for (const [k, amps] of Object.entries(SPECTRA)) {
      this.waves[k] = waveFromHarmonics(ctx, amps);
      /* A brighter twin of every tone.
       *
       * Playing louder does not simply turn a note up: pressing the bow or
       * blowing harder puts proportionally more energy into the high partials,
       * so the tone changes colour as well as level.  Reaching for that with a
       * filter alone does not work when the filter already sits above
       * everything the wave contains — the harmonics have to be there to let
       * through.  So each instrument has a second spectrum with the upper
       * partials lifted, mixed in as the note gets louder. */
      this.waves[k + 'Bright'] = waveFromHarmonics(ctx,
        amps.map((a, i) => a * Math.pow(i + 1, 0.55)));
    }
    /* The hammer's own spectrum.
     *
     * The shared `Bright` twins lift the upper partials enough for a bowed or
     * blown instrument leaning into a note, but a piano hit hard does
     * something far more drastic: the felt compresses, the contact time
     * shortens, and partials six to twelve come up to within fifteen decibels
     * of the fundamental.  Measured before this, the difference in brightness
     * between a note at velocity 25 and one at 120 was a ratio of 1.18 — which
     * is to say the instrument played the same colour however it was struck,
     * and that is most of what makes a synthesised piano sound like a toy. */
    for (const k of ['pianoBass', 'pianoMid', 'pianoTreble']) {
      this.waves[k + 'Hard'] = waveFromHarmonics(ctx,
        SPECTRA[k].map((a, i) => a * Math.pow(i + 1, 1.4)));
    }
    this.waves.pianoAttack = waveFromHarmonics(ctx, decayHarmonics(24, 0.75));
    this.noiseBuffer = this.makeNoise(2.0);
    this.ready = true;
    return ctx;
  }

  /**
   * A room, rather than a wash of noise.
   *
   * The old tail was white noise on an exponential fade, and it measured the
   * way it sounded: 3.4 seconds of decay at 250 Hz and 3.8 at 6 kHz — the top
   * of the spectrum ringing on as long as the bottom.  No room does that.  Air
   * absorbs high frequencies and soft surfaces absorb them faster still, so a
   * hall that holds a bass note for two seconds lets a cymbal go in well under
   * one, and a tail that keeps its treble is the single most recognisable
   * sound of a cheap digital reverb.
   *
   * Three things make this a room instead.  The noise runs through a lowpass
   * that closes as the tail proceeds, which is what air absorption is and
   * which costs one multiply a sample.  The early reflections are a real
   * pattern of discrete arrivals — a handful of surfaces at plausible
   * distances, different for each ear — rather than five identical taps.  And
   * the density builds: a moment after the note there are a few reflections,
   * a moment later there are thousands, and starting at full density is what
   * makes a reverb sound like it was switched on.
   */
  makeImpulse(seconds, decay, ctx = this.ctx) {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    /* `decay` stays the caller's knob: bigger means a drier, shorter room. */
    const rt = Math.max(0.35, seconds / Math.max(0.6, decay * 0.78));
    const fall = Math.log(1000) / rt;                 // to −60 dB in rt seconds
    /* How fast the room loses its top.  A tail whose treble lasts a third as
     * long as its bass is about right for a hall with an audience in it. */
    const airTime = rt * 0.15;

    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      let peak = 0;
      for (let i = 0; i < len; i++) {
        const t = i / rate;
        const white = Math.random() * 2 - 1;
        /* The lowpass closes from open to muffled as the tail proceeds. */
        const cutoff = 400 + 11000 * Math.exp(-t / airTime);
        const a = Math.exp((-2 * Math.PI * cutoff) / rate);
        lp = (1 - a) * white + a * lp;
        /* Density: sparse at first, filling in over the first eighty
         * milliseconds, which is roughly how long a real room takes. */
        const density = Math.min(1, t / 0.08);
        let v = lp * Math.exp(-t * fall) * (0.35 + 0.65 * density);
        /* A little quiet before the first reflection arrives. */
        if (t < 0.008) v *= t / 0.008;
        d[i] = v;
        const m = Math.abs(v);
        if (m > peak) peak = m;
      }
      /* Closing the filter costs level; put it back so `reverb` means the same
       * amount of room as it did before. */
      if (peak > 0) { const k = 0.7 / peak; for (let i = 0; i < len; i++) d[i] *= k; }

      /* Surfaces at plausible distances: side walls, ceiling, the back of the
       * platform.  Each ear hears a different set, which is what gives a room
       * its width before the tail has even begun. */
      const early = ch
        ? [[0.0091, 0.52], [0.0143, -0.41], [0.0197, 0.33], [0.0268, -0.26],
          [0.0331, 0.21], [0.0419, -0.17], [0.0527, 0.13], [0.0668, -0.1]]
        : [[0.0074, 0.58], [0.0128, -0.38], [0.0211, 0.31], [0.0284, -0.24],
          [0.0352, 0.19], [0.0437, -0.15], [0.0561, 0.12], [0.0702, -0.09]];
      for (const [at, g] of early) {
        const idx = Math.floor(at * rate);
        if (idx < len) d[idx] += g;
      }
    }
    return buf;
  }

  makeNoise(seconds, ctx = this.ctx) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* ------------------------------------------------------------- channels */

  /** One mixer strip per part: volume, pan, mute/solo. */
  channel(id) {
    if (this.channels.has(id)) return this.channels.get(id);
    const ctx = this.ctx;
    const input = ctx.createGain();
    const gain = ctx.createGain();
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    input.connect(gain);
    if (pan) { gain.connect(pan); pan.connect(this.master); } else { gain.connect(this.master); }
    const ch = { input, gain, pan, volume: 0.8, muted: false };
    this.channels.set(id, ch);
    return ch;
  }

  setChannel(id, { volume, pan, mute } = {}) {
    const ch = this.channel(id);
    if (volume !== undefined) ch.volume = volume;
    if (mute !== undefined) ch.muted = mute;
    ch.gain.gain.setTargetAtTime(ch.muted ? 0 : ch.volume, this.ctx.currentTime, 0.02);
    if (pan !== undefined && ch.pan) ch.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), this.ctx.currentTime, 0.02);
  }

  setMasterVolume(v) {
    this.masterVolume = v;
    if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  setReverb(v) {
    this.reverbAmount = v;
    if (this.wet) this.wet.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  /* ---------------------------------------------------------------- notes */

  noise(time, dur) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    src.start(time);
    src.stop(time + dur);
    return src;
  }

  /**
   * Play one note.  `duration` is the sounding length in seconds; the release
   * tail extends past it.  Returns a handle that can be released early.
   */
  play(opts) {
    if (!this.ready) return null;
    const {
      preset = 'piano', midi = 60, velocity = 80, time = this.ctx.currentTime,
      duration = 0.5, channel = 'default', detune = 0, articulation = null,
    } = opts;
    if (this.active.size > this.maxVoices) this.cull();
    const fn = PRESETS[preset] || PRESETS.piano;
    const out = this.place(this.channel(channel).input, preset, midi);
    const v = Math.max(0.02, Math.min(1, velocity / 127));
    /* Seeded from the note itself, so a passage plays the same way twice while
     * still differing from note to note within it. */
    const h = human(((midi * 2654435761) ^ (Math.round(time * 1000) * 40503)
      ^ (Math.round(velocity) * 2246822519)) >>> 0);
    const at = Math.max(this.ctx.currentTime, time + (opts.ensemble === false ? 0 : h.onset));
    const handle = fn(this, {
      freq: midiToFreq(midi + (detune + h.tune) / 100), midi, v, time: at,
      dur: Math.max(0.03, duration), out, articulation, h,
      legato: !!opts.legato,
    });
    if (handle) {
      this.active.add(handle);
      handle.endTime = time + duration + (handle.tail || 0.5);
      setTimeout(() => this.active.delete(handle),
        Math.max(0, (handle.endTime - this.ctx.currentTime) * 1000) + 300);
    }
    return handle;
  }

  /**
   * Where in the stereo picture a note sits.
   *
   * A note used to go straight into its part's channel, and a part has one
   * pan for all of it, so a solo piano came out of the exact centre of the
   * speakers: measured on a big chord, the two channels were 0.99 alike,
   * which is to say mono.  That is most of why it sounded like a synthesiser
   * in a box rather than an instrument in a room — a real piano is two metres
   * of soundboard, and the bottom of it does not arrive from the same place
   * as the top.
   *
   * So a note on a keyboard instrument is panned by its pitch, low to the
   * left and high to the right, which is the instrument heard from the
   * player's seat and the way every stereo piano recording is made.  Not too
   * far: past about half width the low notes start to sound like a separate
   * instrument from the high ones.  Everything else keeps its part's own
   * position, because a violinist does not move about the platform between
   * notes.
   */
  place(input, preset, midi) {
    const spread = SPREAD[preset];
    if (!spread || !this.ctx.createChannelMerger) return input;
    const key = preset + ':' + midi;
    const held = this.placed.get(key);
    if (held) return held;
    const ctx = this.ctx;

    /* Level alone does not put a sound anywhere.
     *
     * Turning a note down in one speaker and up in the other leaves both
     * speakers carrying the same waveform, and two channels carrying the same
     * waveform are one channel: panning the whole keyboard this way moved the
     * measured correlation of a chord from 0.975 to 0.962, which is to say it
     * did nothing.  What actually places a sound is that it reaches one ear
     * before the other.  The bass end of a grand is well over a metre from the
     * treble end, so the two paths differ by a few milliseconds, and it is
     * that difference — not the level — the ear uses.
     *
     * So each note is given both: the level difference that says how far to
     * the side it is, and the arrival difference that makes the two channels
     * genuinely different signals.  Under three milliseconds, which is inside
     * the window where the ear hears one sound in a place rather than two
     * sounds one after the other. */
    const node = ctx.createGain();
    const merger = ctx.createChannelMerger(2);
    const across = Math.max(-1, Math.min(1, (midi - 60) / 30)) * spread;
    const angle = ((across + 1) * Math.PI) / 4;
    const left = ctx.createGain();
    const right = ctx.createGain();
    left.gain.value = Math.cos(angle);
    right.gain.value = Math.sin(angle);
    const lag = Math.abs(across) * 0.0018;
    const dl = ctx.createDelay(0.02);
    const dr = ctx.createDelay(0.02);
    dl.delayTime.value = across > 0 ? lag : 0;
    dr.delayTime.value = across < 0 ? lag : 0;
    node.connect(left).connect(dl).connect(merger, 0, 0);
    node.connect(right).connect(dr).connect(merger, 0, 1);
    merger.connect(input);
    this.placed.set(key, node);
    return node;
  }

  cull() {
    /* Drop the voices closest to finishing when polyphony runs out. */
    const list = [...this.active].sort((a, b) => a.endTime - b.endTime);
    for (let i = 0; i < Math.max(1, list.length - this.maxVoices); i++) {
      try { list[i].stop(this.ctx.currentTime); } catch { /* already gone */ }
      this.active.delete(list[i]);
    }
  }

  allOff(when = 0) {
    const t = this.ctx ? this.ctx.currentTime + when : 0;
    for (const h of this.active) {
      try { h.stop(t); } catch { /* already stopped */ }
    }
    this.active.clear();
  }

  get currentTime() { return this.ctx ? this.ctx.currentTime : 0; }
}

/* ------------------------------------------------------------- envelopes */


/**
 * The small differences between one note and the next.
 *
 * Two notes played by a person are never the same note twice: the bow lands a
 * little differently, the vibrato is a shade faster, the finger is a cent or
 * two off.  A synthesiser that renders every note from identical numbers
 * sounds like a machine for exactly that reason, and no amount of better
 * waveform design fixes it — the fault is not the tone, it is the sameness.
 *
 * So each note draws its own small deviations.  They are deliberately tiny:
 * enough that a repeated note is not a copy, not enough to sound out of tune
 * or out of time.
 */
function human(seed) {
  let s = (seed >>> 0) || 1;
  const next = () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
  const spread = (amount) => 1 + (next() * 2 - 1) * amount;
  return {
    attack: spread(0.22),      // how quickly it speaks
    bright: spread(0.1),       // how open the tone is
    tune: (next() * 2 - 1) * 4,   // cents
    vibRate: spread(0.12),
    vibDepth: spread(0.28),
    vibDelay: spread(0.35),
    level: spread(0.06),
    onset: (next() * 2 - 1) * 0.006,   // seconds: an ensemble is not a sequencer
    next,
  };
}

/**
 * How loud a note is for how hard it was played.
 *
 * Every voice here used to map velocity to level as `0.25 + v * 0.85` or some
 * near relative: a straight line from a quarter of full scale to full.  That
 * is about five decibels between the softest note and the loudest, and after
 * the limiter had taken its share the measured difference between a note at
 * velocity 25 and one at 120 was **four decibels**.  A piano spans nearer
 * forty.  This is why dynamic marks did nothing audible: the marks were being
 * applied, the synthesiser simply could not express them.
 *
 * Loudness against playing effort is a power law, not a line.  The exponent
 * sets the span: across the velocities music actually uses, `v ** 2.1` gives
 * about twenty-eight decibels, which is a real piano's working range, and
 * `v ** 1.7` about twenty-three, which suits a bowed or blown instrument
 * where the player has less room between nothing and everything.
 *
 * Full velocity still comes out at full level, so nothing gets louder — the
 * quiet end simply becomes quiet, which is what makes the loud end mean
 * something.
 */
const loudness = (v, curve = 2.1) => Math.pow(Math.max(0, Math.min(1, v)), curve);

function adsr(param, ctx, t, { a, d, s, r, peak = 1, dur }) {
  param.cancelScheduledValues(t);
  param.setValueAtTime(0.0001, t);
  param.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
  const sustain = Math.max(0.0002, peak * s);
  param.exponentialRampToValueAtTime(sustain, t + a + d);
  const off = t + Math.max(a + d, dur);
  param.setValueAtTime(Math.max(0.0002, param.value || sustain), off);
  param.exponentialRampToValueAtTime(0.00012, off + r);
  return off + r;
}

function killAt(nodes, stopTime) {
  for (const n of nodes) {
    try { if (n.stop) n.stop(stopTime); } catch { /* not a source */ }
  }
}

/* -------------------------------------------------------------- presets */

const PRESETS = {};

/* --- piano ------------------------------------------------------------- */
/* A grand.
 *
 * Four things make a piano sound like a piano rather than like a filtered
 * oscillator with a click on the front, and this has all four.
 *
 * Its strings come in threes, tuned very slightly apart and decaying at
 * slightly different rates.  That is where the shimmer comes from, and also
 * the double decay every pianist knows: the note drops quickly at first as the
 * strings push energy into the bridge together, then far more slowly once they
 * have drifted out of phase with each other.
 *
 * Its partials are not in tune with themselves.  Real strings are stiff, so
 * the second partial sits above twice the fundamental and the error grows as
 * you go up — which is why the bass of a piano sounds rich rather than muddy,
 * and why a perfectly harmonic synthesiser sounds like an organ.
 *
 * Its case resonates.  A few fixed frequencies ring whatever note is played.
 *
 * And it is played by a hand.  Struck softly the hammer is felt and the tone
 * is nearly all fundamental; struck hard the felt compresses, the hammer turns
 * hard, and the note arrives with an edge on it.  Loud is a different sound,
 * not the same sound turned up.
 */
PRESETS.piano = (eng, { freq, midi, v, time, dur, out, h }) => {
  const ctx = eng.ctx;
  const dev = h || { attack: 1, bright: 1, level: 1, vibDepth: 1 };
  const wave = midi < 48 ? eng.waves.pianoBass : midi < 76 ? eng.waves.pianoMid : eng.waves.pianoTreble;
  const hard = eng.waves[(midi < 48 ? 'pianoBass' : midi < 76 ? 'pianoMid' : 'pianoTreble') + 'Hard'];

  const amp = ctx.createGain();
  amp.gain.value = 0;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  /* Brightness follows the register and, far more, how hard the key was hit. */
  const bright = (520 + Math.pow(v, 1.9) * 12500 + Math.max(0, midi - 40) * 48) * dev.bright;
  tone.frequency.setValueAtTime(Math.min(16000, bright), time);
  tone.frequency.exponentialRampToValueAtTime(Math.max(340, bright * 0.16), time + 0.7);
  /* And on darkening for as long as the note lasts, because a string never
   * stops losing its top. */
  tone.frequency.exponentialRampToValueAtTime(Math.max(260, bright * 0.05), time + 4);
  tone.Q.value = 0.5;

  const nodes = [];
  /* Three strings to a note through most of the compass, one in the deep bass
   * as on the instrument itself.  Each is tuned and damped a shade
   * differently; that difference is the shimmer and the double decay. */
  const unisons = midi < 33 ? [0] : midi < 45 ? [-1.4, 1.7] : [-2.1, 0.4, 2.3];
  /* How hard the hammer struck, and so how much of its own bright spectrum
   * comes with the note.  It reaches nearly all of it at full force and is
   * almost absent under the fingers, which is the difference between a
   * pianissimo and a fortissimo that no amount of level ever gives. */
  const felt = Math.min(0.92, Math.pow(v, 1.5));
  unisons.forEach((cents, i) => {
    const o = ctx.createOscillator();
    o.setPeriodicWave(wave);
    o.frequency.value = freq;
    o.detune.value = cents * (dev.vibDepth || 1);
    const g = ctx.createGain();
    g.gain.value = (1 - felt * 0.45) / unisons.length;
    o.connect(g).connect(tone);
    o.start(time);
    nodes.push(o);

    /* The hard-hammer layer, which grows with how hard the key was struck. */
    if (hard && felt > 0.02 && i < 2) {
      const ob = ctx.createOscillator();
      ob.setPeriodicWave(hard);
      ob.frequency.value = freq;
      ob.detune.value = cents;
      const gb = ctx.createGain();
      gb.gain.setValueAtTime((felt * 0.8) / Math.min(2, unisons.length), time);
      /* The edge is on the attack and leaves well before the tone does: the
       * top partials of a struck string die in a fraction of a second while
       * the fundamental rings on, and a note that keeps its brightness all
       * the way down sounds like an organ pipe rather than a piano. */
      gb.gain.exponentialRampToValueAtTime(Math.max(0.0002, felt * 0.05), time + 0.45);
      gb.gain.exponentialRampToValueAtTime(0.0002, time + 1.8);
      ob.connect(gb).connect(tone);
      ob.start(time);
      nodes.push(ob);
    }
  });

  /* Stiffness: the upper partials of a real string run sharp, and the lower
   * the note the more they do.  Adding them by hand where it is audible is
   * cheaper than stretching a whole wavetable and does the same work. */
  if (midi < 64) {
    const B = midi < 40 ? 0.0009 : 0.0004;
    for (const n of [4, 6]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * n * Math.sqrt(1 + B * n * n);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.055 * v / n, time);
      g.gain.exponentialRampToValueAtTime(0.0002, time + 1.6);
      o.connect(g).connect(tone);
      o.start(time);
      nodes.push(o);
    }
  }

  /* The hammer itself: felt on wire, brief and pitched with the note. */
  const n = eng.noise(time, 0.09);
  const nf = ctx.createBiquadFilter();
  nf.type = 'bandpass';
  nf.frequency.value = Math.min(7000, freq * 4 + 600);
  nf.Q.value = 0.7;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.16 * v * v, time);
  ng.gain.exponentialRampToValueAtTime(0.0002, time + 0.05);
  n.connect(nf).connect(ng).connect(amp);
  nodes.push(n);

  /* The case and the soundboard, ringing at their own frequencies whatever is
   * played — the part of the sound that belongs to the instrument rather than
   * to the note. */
  let chain = tone;
  for (const b of [
    { freq: 120, q: 1.2, gain: 3 },
    { freq: 320, q: 1.1, gain: 2 },
    { freq: 1800, q: 0.6, gain: 2.5 },
  ]) {
    const f = ctx.createBiquadFilter();
    f.type = 'peaking';
    f.frequency.value = b.freq;
    f.Q.value = b.q;
    f.gain.value = b.gain;
    chain.connect(f);
    chain = f;
  }
  chain.connect(amp);
  amp.connect(out);

  /* Bass strings ring for a very long time, the top of the keyboard hardly at
   * all, and every note falls quickly at first and slowly afterwards. */
  const bodyDecay = midi < 40 ? 20 : midi < 52 ? 13 : midi < 72 ? 7 : 2.8;
  const peak = 0.39 * loudness(v) * dev.level;
  amp.gain.setValueAtTime(0.0001, time);
  amp.gain.linearRampToValueAtTime(peak, time + 0.005 * dev.attack);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * 0.55), time + 0.18);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * 0.2), time + 1.1);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * 0.02), time + bodyDecay);

  /* The damper comes down when the key is released: quickly, but the heavy
   * bass dampers take longer to stop a thick string than the treble ones. */
  const off = time + dur;
  const rel = midi < 48 ? 0.34 : midi < 72 ? 0.22 : 0.13;
  amp.gain.cancelScheduledValues(off);
  amp.gain.setValueAtTime(Math.max(0.0002, peak * Math.pow(0.5, dur / (bodyDecay * 0.35))), off);
  amp.gain.exponentialRampToValueAtTime(0.00012, off + rel);
  killAt(nodes, off + rel + 0.05);
  return {
    stop: (t) => { amp.gain.cancelScheduledValues(t); amp.gain.setTargetAtTime(0, t, 0.03); killAt(nodes, t + 0.2); },
    tail: rel,
  };
};

function sustained(spec) {
  return (eng, { freq, midi, v, time, dur, out, articulation, h, legato }) => {
    const ctx = eng.ctx;
    const dev = h || { attack: 1, bright: 1, vibRate: 1, vibDepth: 1, vibDelay: 1, level: 1 };
    const amp = ctx.createGain();
    amp.gain.value = 0;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    /* Loud playing is not just louder, it is brighter: a bow pressed harder
     * puts more energy into the upper partials, and a tone that only changes
     * in volume is the clearest sign of a synthesiser. */
    const cutoff = spec.cutoff(freq, v, midi) * dev.bright * (0.5 + v * 0.95);
    filt.frequency.setValueAtTime(cutoff * (spec.attackOpen ? 0.35 : 1), time);
    if (spec.attackOpen) filt.frequency.linearRampToValueAtTime(cutoff, time + spec.a * 1.6);
    /* The tone opens through the first moments of the note rather than
     * arriving fully formed. */
    filt.frequency.linearRampToValueAtTime(cutoff * 1.06, time + Math.min(0.35, dur));
    filt.Q.value = spec.q || 0.7;

    const nodes = [];
    const wave = eng.waves[spec.wave];
    const bright = eng.waves[spec.wave + 'Bright'];
    const voices = spec.unison || 1;
    /* How much of the brighter spectrum this note wants.  Squared, because the
     * change from quiet to loud is not a straight line: the difference between
     * mezzo-forte and forte is far more than between pianissimo and piano. */
    const edge = Math.min(0.8, v * v * (spec.edge === undefined ? 0.85 : spec.edge));
    for (let i = 0; i < voices; i++) {
      const o = ctx.createOscillator();
      if (wave) o.setPeriodicWave(wave); else o.type = spec.osc || 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = voices > 1 ? (i - (voices - 1) / 2) * (spec.spread || 7) : 0;
      const g = ctx.createGain();
      g.gain.value = (1 - edge) / voices;
      /* A bowed string does not arrive in tune.  The bow grips, the string
       * takes a moment to settle into its period, and the pitch slides the
       * last few cents into place.  It lasts about a twentieth of a second and
       * it is a great deal of what makes a string sound bowed rather than
       * switched on. */
      if (spec.scoop && !legato) {
        o.detune.setValueAtTime(o.detune.value - spec.scoop * (0.6 + v * 0.8), time);
        o.detune.linearRampToValueAtTime(o.detune.value, time + 0.05 + spec.a * 0.5);
      }
      o.connect(g).connect(filt);
      o.start(time);
      nodes.push(o);

      if (bright && edge > 0.02) {
        const ob = ctx.createOscillator();
        ob.setPeriodicWave(bright);
        ob.frequency.value = freq;
        ob.detune.value = o.detune.value;
        const gb = ctx.createGain();
        gb.gain.value = edge / voices;
        ob.connect(gb).connect(filt);
        ob.start(time);
        nodes.push(ob);
        /* Vibrato has to reach the bright layer too, or the note splits in two. */
        o.brightTwin = ob;
      }
    }

    /* Vibrato: delayed so the note speaks cleanly first, then grown in rather
     * than switched on, and never at quite the same speed twice.  A vibrato
     * that is identical on every note is heard as an effect rather than as
     * playing. */
    if (spec.vibrato) {
      const lfo = ctx.createOscillator();
      const rate = spec.vibrato.rate * dev.vibRate;
      lfo.frequency.setValueAtTime(rate * 0.88, time);
      lfo.frequency.linearRampToValueAtTime(rate, time + 0.6);
      const delay = (spec.vibrato.delay || 0.25) * dev.vibDelay;
      const depth = ctx.createGain();
      /* Deeper when the note is long and loud, as a player would. */
      const reach = freq * spec.vibrato.depth * dev.vibDepth * (0.7 + v * 0.6);
      depth.gain.setValueAtTime(0, time);
      depth.gain.linearRampToValueAtTime(reach * 0.35, time + delay);
      depth.gain.linearRampToValueAtTime(reach, time + delay + Math.min(0.5, dur * 0.5));
      lfo.connect(depth);
      for (const o of nodes) if (o.frequency) depth.connect(o.frequency);
      lfo.start(time);
      nodes.push(lfo);
    }

    /* Breath and bow noise.  Loudest as the note starts — the bite of the bow
     * catching the string, the breath before a flute speaks — then settling
     * back into the tone.  Held flat for the whole note it sounds like hiss;
     * shaped like this it sounds like an instrument being played. */
    if (spec.noise) {
      const n = eng.noise(time, dur + 0.4);
      const nf = ctx.createBiquadFilter();
      nf.type = spec.noise.type || 'highpass';
      nf.frequency.value = spec.noise.freq;
      nf.Q.value = spec.noise.q || 0.8;
      const ng = ctx.createGain();
      const bite = spec.noise.level * 1.8 * loudness(v, 1.7) * (legato ? 0.45 : 1);
      ng.gain.setValueAtTime(0, time);
      ng.gain.linearRampToValueAtTime(bite * 2.4, time + spec.a * 0.6 * dev.attack);
      ng.gain.exponentialRampToValueAtTime(Math.max(0.00005, bite * 0.55), time + spec.a * 3 + 0.08);
      n.connect(nf).connect(ng).connect(amp);
      nodes.push(n);
    }

    /* The body of the instrument.
     *
     * A violin is not a filtered sawtooth: what makes it sound like wood and
     * air is a set of fixed resonances that stay where they are whatever note
     * is played — the air resonance low down, the main wood resonance above
     * it, and the broad lift around two to three kilohertz that players call
     * the bridge hill and listeners hear as "a violin".  One peak cannot do
     * that; these instruments get as many as they need. */
    let chain = filt;
    const bodies = spec.bodies || (spec.body ? [spec.body] : []);
    for (const b of bodies) {
      const f = ctx.createBiquadFilter();
      f.type = b.type || 'peaking';
      f.frequency.value = b.freq;
      f.Q.value = b.q;
      f.gain.value = b.gain;
      chain.connect(f);
      chain = f;
    }
    chain.connect(amp);
    amp.connect(out);

    const staccato = articulation === 'staccato' || articulation === 'staccatissimo';
    const accent = articulation === 'accent' || articulation === 'marcato';
    let a = spec.a * dev.attack;
    if (staccato) a = Math.min(a, 0.018);
    if (accent) a = Math.min(a, a * 0.5);
    /* A note that continues from the one before does not start again from
     * nothing: the bow is already moving, the breath already going. */
    if (legato) a = Math.min(a, Math.max(0.012, a * 0.45));
    const peak = spec.gain * 1.12 * loudness(v, 1.7) * (accent ? 1.18 : 1) * dev.level;
    const sus = spec.s === undefined ? 0.82 : spec.s;
    const rel = staccato ? 0.09 : spec.r;

    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), time + a);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * sus), time + a + spec.d);
    const off = time + Math.max(dur, a + 0.02);
    amp.gain.setValueAtTime(Math.max(0.0002, peak * sus), off);
    amp.gain.exponentialRampToValueAtTime(0.00012, off + rel);
    killAt(nodes, off + rel + 0.08);
    return {
      stop: (t) => { amp.gain.cancelScheduledValues(t); amp.gain.setTargetAtTime(0, t, 0.02); killAt(nodes, t + 0.15); },
      tail: rel,
    };
  };
}

/* The violin family.
 *
 * Three resonances rather than one, because that is what a box of wood and air
 * does: the air inside it rings at one frequency, the plates at another, and
 * the bridge lifts a broad band a couple of octaves above — the region players
 * call the bridge hill and everyone else simply hears as the sound of a
 * violin.  There is also a hollow just below it, which is as much a part of
 * the character as the peaks are.  Each instrument's resonances sit where its
 * size puts them, which is why a viola is not a low violin.
 */
PRESETS.violin = sustained({
  scoop: 16,
  wave: 'stringRich', gain: 0.19, a: 0.075, d: 0.16, s: 0.86, r: 0.22, q: 0.9,
  unison: 2, spread: 5, cutoff: (f, v) => Math.min(11000, f * 9 + 1400 + v * 3200),
  vibrato: { rate: 5.6, depth: 0.0038, delay: 0.22 },
  bodies: [
    { freq: 280, q: 1.6, gain: 4.5 },        // the air inside the body
    { freq: 500, q: 1.3, gain: 5 },          // the wood itself
    { freq: 1100, q: 1.1, gain: -3.5 },      // the hollow above it
    { freq: 2600, q: 0.7, gain: 6 },         // the bridge hill: the violin sound
    { freq: 3900, q: 1.4, gain: 2.5 },
  ],
  noise: { type: 'bandpass', freq: 3200, q: 0.7, level: 0.02 },
});
PRESETS.viola = sustained({
  scoop: 15,
  wave: 'stringRich', gain: 0.20, a: 0.085, d: 0.17, s: 0.85, r: 0.24, q: 0.9,
  unison: 2, spread: 5, cutoff: (f, v) => Math.min(9000, f * 8 + 1100 + v * 2600),
  vibrato: { rate: 5.2, depth: 0.0036, delay: 0.24 },
  bodies: [
    { freq: 220, q: 1.6, gain: 4.5 },
    { freq: 380, q: 1.3, gain: 5.5 },
    { freq: 900, q: 1.1, gain: -3 },
    { freq: 2000, q: 0.8, gain: 5 },
  ],
  noise: { type: 'bandpass', freq: 2500, q: 0.7, level: 0.019 },
});
PRESETS.cello = sustained({
  scoop: 14,
  wave: 'stringRich', gain: 0.22, a: 0.095, d: 0.18, s: 0.86, r: 0.27, q: 0.9,
  unison: 2, spread: 4, cutoff: (f, v) => Math.min(7200, f * 8 + 800 + v * 2000),
  vibrato: { rate: 4.9, depth: 0.0034, delay: 0.26 },
  bodies: [
    { freq: 105, q: 1.6, gain: 4.5 },
    { freq: 200, q: 1.3, gain: 5.5 },
    { freq: 600, q: 1.1, gain: -2.5 },
    { freq: 1400, q: 0.8, gain: 4.5 },
  ],
  noise: { type: 'bandpass', freq: 1800, q: 0.7, level: 0.018 },
});
PRESETS.bass = sustained({
  scoop: 12,
  wave: 'stringRich', gain: 0.24, a: 0.11, d: 0.2, s: 0.84, r: 0.3, q: 0.9,
  unison: 2, spread: 4, cutoff: (f, v) => Math.min(4200, f * 7 + 500 + v * 1200),
  vibrato: { rate: 4.4, depth: 0.003, delay: 0.3 },
  bodies: [
    { freq: 60, q: 1.5, gain: 4 },
    { freq: 130, q: 1.3, gain: 5 },
    { freq: 900, q: 0.9, gain: 3 },
  ],
  noise: { type: 'bandpass', freq: 1200, q: 0.7, level: 0.014 },
});
/* A section, not a soloist: more players, further apart in tuning and in time,
 * and no single vibrato they all share. */
PRESETS.strings = sustained({
  scoop: 9,
  wave: 'stringRich', gain: 0.17, a: 0.16, d: 0.22, s: 0.9, r: 0.42, q: 0.9,
  unison: 4, spread: 13, cutoff: (f, v) => Math.min(9000, f * 8 + 1100 + v * 2400),
  vibrato: { rate: 5.0, depth: 0.0026, delay: 0.3 },
  bodies: [
    { freq: 280, q: 1.4, gain: 3.5 },
    { freq: 500, q: 1.1, gain: 4 },
    { freq: 2400, q: 0.6, gain: 4 },
  ],
  noise: { type: 'bandpass', freq: 3000, q: 0.6, level: 0.012 },
});

PRESETS.flute = sustained({
  wave: 'flute', gain: 0.20, a: 0.062, d: 0.1, s: 0.94, r: 0.13, q: 0.6,
  cutoff: (f, v) => Math.min(12000, f * 7 + 2200 + v * 2000),
  vibrato: { rate: 5.4, depth: 0.0032, delay: 0.3 },
  noise: { type: 'bandpass', freq: 3400, q: 0.6, level: 0.085 },
});
PRESETS.oboe = sustained({
  wave: 'oboe', gain: 0.155, a: 0.045, d: 0.09, s: 0.92, r: 0.12, q: 1.0,
  cutoff: (f, v) => Math.min(10000, f * 8 + 1800 + v * 2200),
  vibrato: { rate: 5.8, depth: 0.003, delay: 0.24 },
  body: { freq: 1400, q: 1.4, gain: 5 },
  noise: { type: 'highpass', freq: 4000, level: 0.014 },
});
PRESETS.clarinet = sustained({
  wave: 'clarinet', gain: 0.18, a: 0.05, d: 0.1, s: 0.95, r: 0.13, q: 0.7,
  cutoff: (f, v) => Math.min(9000, f * 7 + 1500 + v * 2000),
  vibrato: { rate: 5.0, depth: 0.0016, delay: 0.4 },
  noise: { type: 'highpass', freq: 3600, level: 0.012 },
});
PRESETS.bassoon = sustained({
  wave: 'bassoon', gain: 0.20, a: 0.055, d: 0.11, s: 0.9, r: 0.15, q: 0.9,
  cutoff: (f, v) => Math.min(5200, f * 8 + 900 + v * 1400),
  vibrato: { rate: 4.8, depth: 0.0022, delay: 0.3 },
  body: { freq: 440, q: 1.3, gain: 5 },
});
PRESETS.sax = sustained({
  wave: 'sax', gain: 0.18, a: 0.045, d: 0.1, s: 0.9, r: 0.14, q: 0.9,
  cutoff: (f, v) => Math.min(8000, f * 7 + 1400 + v * 2400),
  vibrato: { rate: 5.4, depth: 0.0034, delay: 0.22 },
  body: { freq: 900, q: 1.2, gain: 4.5 },
  noise: { type: 'highpass', freq: 3000, level: 0.02 },
});

/* --- brass: a filter that opens on the attack gives the characteristic blat */
function brass(spec) {
  return (eng, { freq, midi, v, time, dur, out, articulation }) => {
    const ctx = eng.ctx;
    const amp = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.Q.value = 1.6;
    const peakCut = Math.min(12000, freq * (4 + Math.pow(v, 1.4) * 16) + 700);
    filt.frequency.setValueAtTime(freq * 2.2 + 250, time);
    filt.frequency.linearRampToValueAtTime(peakCut, time + 0.055);
    filt.frequency.exponentialRampToValueAtTime(Math.max(500, peakCut * 0.62), time + 0.35);

    const nodes = [];
    /* Brass is the family where loud and bright are the same word.
     *
     * A trumpet at fortissimo is not a trumpet at mezzo-piano turned up: the
     * air column goes non-linear and pours energy into the upper partials
     * until the sound is almost all edge.  Opening a filter over a spectrum
     * that has nothing up there does not reach it — measured before this, a
     * trumpet at velocity 120 was 1.08 times as bright as one at 25, which is
     * to say it had one colour and played it at two volumes.  So the brighter
     * spectrum is mixed in as the player leans on the note, the way the
     * strings and winds already do. */
    const bright = eng.waves[spec.wave + 'Bright'];
    const blaze = Math.min(0.88, Math.pow(v, 1.4));
    for (const cents of spec.unison === 2 ? [-4, 4] : [0]) {
      for (const [wave, level] of [[eng.waves[spec.wave], 1 - blaze * 0.75], [bright, blaze]]) {
        if (!wave || level <= 0.001) continue;
        const o = ctx.createOscillator();
        o.setPeriodicWave(wave);
        /* A small scoop into pitch: brass players rarely arrive dead centre. */
        o.frequency.setValueAtTime(freq * 0.988, time);
        o.frequency.linearRampToValueAtTime(freq, time + 0.045);
        o.detune.value = cents;
        const g = ctx.createGain();
        g.gain.value = level * (spec.unison === 2 ? 0.5 : 1);
        o.connect(g).connect(filt);
        o.start(time);
        nodes.push(o);
      }
    }
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 4.8;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, time);
    depth.gain.linearRampToValueAtTime(freq * 0.0022, time + 0.4);
    lfo.connect(depth);
    for (const o of nodes) if (o.frequency) depth.connect(o.frequency);
    lfo.start(time);
    nodes.push(lfo);

    filt.connect(amp);
    amp.connect(out);
    const accent = articulation === 'accent' || articulation === 'marcato';
    const a = articulation === 'staccato' ? 0.014 : spec.a;
    const peak = spec.gain * 1.15 * loudness(v, 1.7) * (accent ? 1.2 : 1);
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * 1.12), time + a);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * 0.86), time + a + 0.12);
    const off = time + Math.max(dur, a + 0.02);
    amp.gain.setValueAtTime(Math.max(0.0002, peak * 0.86), off);
    amp.gain.exponentialRampToValueAtTime(0.00012, off + spec.r);
    killAt(nodes, off + spec.r + 0.08);
    return { stop: (t) => { amp.gain.cancelScheduledValues(t); amp.gain.setTargetAtTime(0, t, 0.02); killAt(nodes, t + 0.15); }, tail: spec.r };
  };
}
PRESETS.trumpet = brass({ wave: 'brass', gain: 0.16, a: 0.038, r: 0.15 });
PRESETS.horn = brass({ wave: 'horn', gain: 0.19, a: 0.07, r: 0.24, unison: 2 });
PRESETS.trombone = brass({ wave: 'brass', gain: 0.18, a: 0.05, r: 0.18 });
PRESETS.tuba = brass({ wave: 'horn', gain: 0.22, a: 0.065, r: 0.22 });

PRESETS.voice = sustained({
  wave: 'voice', gain: 0.17, a: 0.09, d: 0.14, s: 0.9, r: 0.22, q: 1.0,
  cutoff: (f, v) => Math.min(6000, f * 6 + 1200 + v * 1600),
  vibrato: { rate: 5.5, depth: 0.0045, delay: 0.3 },
  body: { freq: 700, q: 1.0, gain: 6 },
  noise: { type: 'bandpass', freq: 2600, level: 0.02 },
});
PRESETS.organ = sustained({
  wave: 'organ', gain: 0.14, a: 0.02, d: 0.03, s: 1, r: 0.09, q: 0.5,
  cutoff: (f, v) => Math.min(9000, f * 8 + 2000),
});

/* --- struck and plucked ------------------------------------------------- */
PRESETS.pluck = (eng, { freq, v, time, dur, out }) => {
  const ctx = eng.ctx;
  const amp = ctx.createGain();
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  /* Pluck harder and the string is released from a sharper corner, which puts
   * far more into the upper partials — the same note played softly is round
   * and played hard is bright, and a filter that moves by a third of an octave
   * across the whole dynamic range does not say so. */
  filt.frequency.setValueAtTime(
    Math.min(13000, freq * (5 + Math.pow(v, 1.3) * 18) + 900), time);
  filt.frequency.exponentialRampToValueAtTime(Math.max(400, freq * 3), time + 0.6);
  const o = ctx.createOscillator();
  o.setPeriodicWave(eng.waves.pluck);
  o.frequency.value = freq;
  o.connect(filt);
  o.start(time);
  const n = eng.noise(time, 0.04);
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.08 * v, time);
  ng.gain.exponentialRampToValueAtTime(0.0002, time + 0.03);
  n.connect(ng).connect(amp);
  filt.connect(amp);
  amp.connect(out);
  const peak = 0.33 * loudness(v, 1.9);
  amp.gain.setValueAtTime(0.0001, time);
  amp.gain.linearRampToValueAtTime(peak, time + 0.005);
  amp.gain.exponentialRampToValueAtTime(0.0003, time + Math.min(6, Math.max(1.0, dur + 1.2)));
  const end = time + Math.min(6, Math.max(1.0, dur + 1.2));
  killAt([o, n], end + 0.05);
  return { stop: (t) => { amp.gain.cancelScheduledValues(t); amp.gain.setTargetAtTime(0, t, 0.04); killAt([o, n], t + 0.2); }, tail: 0.4 };
};

/** Inharmonic partials: bells, vibes, glockenspiel. */
function struck(spec) {
  return (eng, { freq, v, time, dur, out }) => {
    const ctx = eng.ctx;
    const amp = ctx.createGain();
    const nodes = [];
    /* A bar or a string struck softly rings on its fundamental; struck hard it
     * rings on everything.  Scaling only the level and not the balance made a
     * hard stroke *darker* than a soft one, because the fundamental grew and
     * the modes above it did not. */
    const excited = 0.12 + 0.88 * Math.pow(v, 1.1);
    spec.partials.forEach(([ratio, level, decay]) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(
        level * (ratio > 1 ? excited : 1) * 1.1 * loudness(v, 2) * spec.gain, time + 0.004);
      g.gain.exponentialRampToValueAtTime(0.00012, time + decay * spec.decay);
      o.connect(g).connect(amp);
      o.start(time);
      nodes.push(o);
    });
    if (spec.thump) {
      const n = eng.noise(time, 0.05);
      const nf = ctx.createBiquadFilter();
      nf.type = 'bandpass';
      nf.frequency.value = freq * 3;
      const ng = ctx.createGain();
      /* The stick noise has to follow the same curve as the note it belongs
       * to.  It did not: the tone went as the square of the velocity while
       * the click went straight up with it, so a quiet stroke was almost all
       * click and a loud one almost none — which measured, correctly, as a
       * mallet that got *darker* the harder it was hit, 0.6 times the
       * brightness at full force.  The click is part of the note, not a
       * separate instrument. */
      ng.gain.setValueAtTime(0.12 * loudness(v, 2), time);
      ng.gain.exponentialRampToValueAtTime(0.0002, time + 0.04);
      n.connect(nf).connect(ng).connect(amp);
      nodes.push(n);
    }
    amp.gain.value = 1;
    amp.connect(out);
    const end = time + spec.decay * 2 + 0.2;
    killAt(nodes, end);
    return { stop: (t) => { amp.gain.cancelScheduledValues(t); amp.gain.setTargetAtTime(0, t, 0.05); killAt(nodes, t + 0.3); }, tail: 0.6 };
  };
}
PRESETS.bell = struck({
  gain: 0.34, decay: 2.6, thump: false,
  partials: [[1, 1, 1], [2.76, 0.42, 0.7], [5.4, 0.22, 0.45], [8.9, 0.12, 0.3], [13.3, 0.06, 0.2]],
});
PRESETS.mallet = struck({
  gain: 0.4, decay: 0.75, thump: true,
  partials: [[1, 1, 1], [3.9, 0.3, 0.42], [9.2, 0.12, 0.25], [16, 0.05, 0.15]],
});
PRESETS.timpani = (eng, { freq, v, time, dur, out }) => {
  const ctx = eng.ctx;
  const amp = ctx.createGain();
  amp.gain.value = 1;
  const nodes = [];
  [[1, 1, 2.6], [1.5, 0.34, 1.5], [1.98, 0.2, 1.0], [2.44, 0.12, 0.7]].forEach(([ratio, level, dec]) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * ratio * 1.02, time);
    o.frequency.exponentialRampToValueAtTime(freq * ratio, time + 0.08);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(level * 1.1 * loudness(v, 1.9) * 0.42, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.00012, time + dec * Math.min(2.2, 0.6 + dur));
    o.connect(g).connect(amp);
    o.start(time);
    nodes.push(o);
  });
  const n = eng.noise(time, 0.14);
  const nf = ctx.createBiquadFilter();
  nf.type = 'lowpass';
  nf.frequency.value = 900;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.22 * v, time);
  ng.gain.exponentialRampToValueAtTime(0.0002, time + 0.12);
  n.connect(nf).connect(ng).connect(amp);
  nodes.push(n);
  amp.connect(out);
  killAt(nodes, time + 3.2);
  return { stop: (t) => { amp.gain.setTargetAtTime(0, t, 0.06); killAt(nodes, t + 0.4); }, tail: 1.0 };
};

/** Unpitched percussion, chosen by the General MIDI drum note. */
PRESETS.drums = (eng, { midi, v, time, out }) => {
  const ctx = eng.ctx;
  const amp = ctx.createGain();
  amp.gain.value = 1;
  amp.connect(out);
  const nodes = [];
  const kit = DRUM_MAP[midi] || DRUM_MAP[38];
  if (kit.tone) {
    const o = ctx.createOscillator();
    o.type = kit.tone.type || 'sine';
    o.frequency.setValueAtTime(kit.tone.f0, time);
    o.frequency.exponentialRampToValueAtTime(kit.tone.f1, time + kit.tone.sweep);
    const g = ctx.createGain();
    g.gain.setValueAtTime(kit.tone.level * 1.1 * loudness(v, 1.9), time);
    g.gain.exponentialRampToValueAtTime(0.0002, time + kit.tone.decay);
    o.connect(g).connect(amp);
    o.start(time);
    nodes.push(o);
  }
  if (kit.noise) {
    const n = eng.noise(time, kit.noise.decay + 0.1);
    const nf = ctx.createBiquadFilter();
    nf.type = kit.noise.type;
    nf.frequency.value = kit.noise.freq;
    nf.Q.value = kit.noise.q || 1;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(kit.noise.level * 1.1 * loudness(v, 1.9), time);
    ng.gain.exponentialRampToValueAtTime(0.0002, time + kit.noise.decay);
    n.connect(nf).connect(ng).connect(amp);
    nodes.push(n);
  }
  killAt(nodes, time + 2.4);
  return { stop: (t) => { amp.gain.setTargetAtTime(0, t, 0.03); killAt(nodes, t + 0.2); }, tail: 0.4 };
};

const DRUM_MAP = {
  35: { tone: { f0: 110, f1: 42, sweep: 0.06, decay: 0.38, level: 0.72 }, noise: { type: 'lowpass', freq: 200, level: 0.16, decay: 0.08 } },
  36: { tone: { f0: 120, f1: 45, sweep: 0.05, decay: 0.34, level: 0.72 }, noise: { type: 'lowpass', freq: 240, level: 0.16, decay: 0.07 } },
  38: { tone: { f0: 210, f1: 180, sweep: 0.04, decay: 0.11, level: 0.26 }, noise: { type: 'bandpass', freq: 2100, q: 0.7, level: 0.34, decay: 0.17 } },
  40: { tone: { f0: 240, f1: 200, sweep: 0.04, decay: 0.1, level: 0.24 }, noise: { type: 'bandpass', freq: 2600, q: 0.7, level: 0.34, decay: 0.14 } },
  41: { tone: { f0: 150, f1: 90, sweep: 0.09, decay: 0.4, level: 0.5 } },
  43: { tone: { f0: 190, f1: 110, sweep: 0.09, decay: 0.36, level: 0.5 } },
  45: { tone: { f0: 240, f1: 140, sweep: 0.08, decay: 0.32, level: 0.5 } },
  47: { tone: { f0: 300, f1: 180, sweep: 0.08, decay: 0.3, level: 0.48 } },
  48: { tone: { f0: 360, f1: 220, sweep: 0.07, decay: 0.28, level: 0.46 } },
  42: { noise: { type: 'highpass', freq: 8000, level: 0.2, decay: 0.06 } },
  44: { noise: { type: 'highpass', freq: 7200, level: 0.18, decay: 0.09 } },
  46: { noise: { type: 'highpass', freq: 7000, level: 0.2, decay: 0.48 } },
  49: { noise: { type: 'highpass', freq: 5200, level: 0.26, decay: 1.5 } },
  51: { noise: { type: 'bandpass', freq: 7800, q: 0.5, level: 0.16, decay: 0.9 } },
  52: { noise: { type: 'highpass', freq: 4200, level: 0.26, decay: 1.7 } },
  53: { noise: { type: 'bandpass', freq: 9000, q: 1.4, level: 0.14, decay: 0.7 } },
  55: { noise: { type: 'highpass', freq: 5600, level: 0.24, decay: 1.2 } },
  56: { tone: { type: 'square', f0: 830, f1: 820, sweep: 0.02, decay: 0.22, level: 0.2 } },
  57: { noise: { type: 'highpass', freq: 4800, level: 0.26, decay: 1.6 } },
  59: { noise: { type: 'bandpass', freq: 7200, q: 0.6, level: 0.15, decay: 0.8 } },
};

export { PRESETS, DRUM_MAP };

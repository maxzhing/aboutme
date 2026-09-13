/* Cadenza — the Transcribe panel.
 *
 * One button, then a short path: get the music in, listen to it, read it, look
 * at what came back, change what is wrong, keep it.  The settings that matter
 * afterwards — how hard to listen, how tightly to fit the rhythm, what tempo
 * and metre and key to assume — are all on the result screen, because that is
 * where you find out whether they were right, and re-reading with different
 * ones takes no time at all: the notes are already known.
 *
 * What it does not do is claim more than it found.  Every stage reports its
 * own confidence, the bars it is least sure of are listed by number, and the
 * notes it is least sure of are marked on the page.
 */

import * as Dlg from './dialogs.js';
import { UI } from './icons.js';
import { extractNotes, transcribeMidi, notesToScore, SOURCE } from '../transcribe/index.js';
import { MidiRecorder, AudioRecorder, parseMIDI } from '../transcribe/capture.js';
import { GRID_PRESETS } from '../transcribe/rhythm.js';
import { CorrectionModel, compareScores } from '../transcribe/learn.js';
import { TIME_SIG_PRESETS } from '../core/rhythm.js';
import { MAJOR_KEYS, keyName } from '../core/theory.js';

const pct = (v) => Math.round(Math.max(0, Math.min(1, v || 0)) * 100);

/** A labelled bar, so a confidence reads as a quantity rather than a word. */
function meter(label, value, note = '') {
  const p = pct(value);
  const tone = p >= 75 ? 'good' : p >= 45 ? 'fair' : 'poor';
  return `<div class="tr-meter"><span class="tr-meter-label">${label}</span>`
    + `<span class="tr-meter-track"><span class="tr-meter-fill ${tone}" style="width:${p}%"></span></span>`
    + `<span class="tr-meter-value">${p}%</span>`
    + (note ? `<span class="tr-meter-note">${note}</span>` : '') + '</div>';
}

export class TranscribePanel {
  constructor(app) {
    this.app = app;
    this.model = new CorrectionModel();
    this.reset();
  }

  reset() {
    this.notes = null;         // raw note events, before any musical reading
    this.duration = 0;
    this.source = null;
    this.result = null;        // the last reading
    this.settings = {
      sensitivity: 1,
      grid: 'auto',
      quantiseStrength: 1,
      splitHands: true,
      bpm: null,
      timeSig: null,
      keyFifths: null,
    };
    this.audio = null;
    this.midiRec = null;
    this.recorder = null;
    this.busy = false;
  }

  open() {
    this.reset();
    const m = Dlg.modal({
      title: 'Transcribe',
      width: 'wide',
      build: (body) => { this.body = body; this.renderStart(); },
      onClose: () => this.cleanup(),
    });
    this.modalClose = m.close;
  }

  cleanup() {
    if (this.recorder && this.recorder.recording) this.recorder.stop();
    if (this.midiHook) { this.app.offMidi(this.midiHook); this.midiHook = null; }
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  /* ------------------------------------------------------------ step one */

  renderStart() {
    const learned = this.model.summary();
    this.body.innerHTML = `
      <p class="tr-lead">Play it, or bring in a file. Cadenza works out the notes, the beat,
        the metre and the key, and writes them into the score for you to edit.</p>
      <div class="tr-choices">
        <button class="tr-choice" data-go="mic">
          <span class="tr-choice-icon">${UI.mic || UI.midi}</span>
          <span class="tr-choice-title">Record audio</span>
          <span class="tr-choice-sub">Play into the microphone or an audio interface</span>
        </button>
        <button class="tr-choice" data-go="keys">
          <span class="tr-choice-icon">${UI.keyboard}</span>
          <span class="tr-choice-title">Play a MIDI keyboard</span>
          <span class="tr-choice-sub">Far more accurate — the notes arrive exactly</span>
        </button>
        <button class="tr-choice" data-go="audioFile">
          <span class="tr-choice-icon">${UI.open}</span>
          <span class="tr-choice-title">Import audio</span>
          <span class="tr-choice-sub">WAV, MP3, FLAC, OGG, M4A</span>
        </button>
        <button class="tr-choice" data-go="midiFile">
          <span class="tr-choice-icon">${UI.midi}</span>
          <span class="tr-choice-title">Import MIDI</span>
          <span class="tr-choice-sub">A .mid file from any instrument or program</span>
        </button>
      </div>
      <div class="tr-honest">
        <b>What to expect.</b> A MIDI instrument states every note exactly, so those
        transcriptions are limited only by the musical reading. Audio has to be listened
        to: a single clean line comes back reliably, chords and two independent hands
        come back well, and a dense orchestral recording will need editing. Nothing here
        is sent anywhere — it all runs on this machine.
      </div>
      ${learned.empty ? '' : `<div class="tr-learned"><b>Adjusted to your corrections</b><ul>${learned.lines.map((l) => `<li>${l}</li>`).join('')}</ul>
        <button class="linkish" data-go="forget">Forget what was learned</button></div>`}
    `;
    this.body.querySelectorAll('[data-go]').forEach((b) => {
      b.onclick = () => this.go(b.dataset.go);
    });
  }

  go(where) {
    if (where === 'mic') return this.startRecording();
    if (where === 'keys') return this.startMidiCapture();
    if (where === 'audioFile') return this.pickFile('audio/*', (f) => this.loadAudioFile(f));
    if (where === 'midiFile') return this.pickFile('.mid,.midi,audio/midi', (f) => this.loadMidiFile(f));
    if (where === 'forget') { this.model.reset(); return this.renderStart(); }
    if (where === 'back') return this.renderStart();
    return undefined;
  }

  pickFile(accept, then) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => { if (input.files[0]) then(input.files[0]); };
    input.click();
  }

  /* ------------------------------------------------------------ recording */

  async startRecording() {
    if (!AudioRecorder.supported) {
      Dlg.toast('This browser cannot record audio', 'err');
      return;
    }
    this.body.innerHTML = `
      <div class="tr-record">
        <div class="tr-level"><span class="tr-level-fill"></span></div>
        <div class="tr-clock">0:00</div>
        <p class="tr-lead">Play when you are ready. A steady beat helps — the metre is read
          from where the strong notes fall.</p>
        <div class="tr-record-actions">
          <button class="btn danger" data-stop>Stop and transcribe</button>
          <button class="btn" data-go="back">Cancel</button>
        </div>
      </div>`;
    const fill = this.body.querySelector('.tr-level-fill');
    const clock = this.body.querySelector('.tr-clock');
    this.recorder = new AudioRecorder({
      onLevel: (peak, seconds) => {
        fill.style.width = Math.min(100, peak * 140) + '%';
        clock.textContent = `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
      },
    });
    this.body.querySelector('[data-stop]').onclick = () => this.finishRecording();
    this.body.querySelector('[data-go=back]').onclick = async () => {
      await this.recorder.stop();
      this.renderStart();
    };
    try {
      await this.recorder.start();
    } catch (err) {
      Dlg.toast('Microphone access was refused', 'err');
      this.renderStart();
    }
  }

  async finishRecording() {
    const { samples, sampleRate, duration } = await this.recorder.stop();
    if (duration < 0.4) {
      Dlg.toast('That was too short to read', 'err');
      return this.renderStart();
    }
    this.audio = { samples, sampleRate };
    this.source = SOURCE.AUDIO;
    return this.listen();
  }

  /* --------------------------------------------------------- MIDI capture */

  startMidiCapture() {
    this.midiRec = new MidiRecorder();
    this.midiRec.start();
    this.body.innerHTML = `
      <div class="tr-record">
        <div class="tr-notecount">0 notes</div>
        <div class="tr-clock">0:00</div>
        <p class="tr-lead">Play. Every note, its length and how hard it was struck are taken
          exactly as your instrument sends them, sustain pedal included.</p>
        <div class="tr-record-actions">
          <button class="btn danger" data-stop>Stop and transcribe</button>
          <button class="btn" data-go="back">Cancel</button>
        </div>
      </div>`;
    const count = this.body.querySelector('.tr-notecount');
    const clock = this.body.querySelector('.tr-clock');
    this.timer = setInterval(() => {
      const s = this.midiRec.duration;
      clock.textContent = `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
      const n = this.midiRec.notes.length + this.midiRec.sounding.size;
      count.textContent = n === 1 ? '1 note' : `${n} notes`;
    }, 200);

    this.midiHook = (data, stamp) => this.midiRec.message(data, stamp);
    this.app.onMidi(this.midiHook);

    this.body.querySelector('[data-stop]').onclick = () => {
      clearInterval(this.timer);
      this.timer = null;
      this.app.offMidi(this.midiHook);
      this.midiHook = null;
      const notes = this.midiRec.stop();
      if (!notes.length) { Dlg.toast('No notes were played', 'err'); return this.renderStart(); }
      this.notes = notes;
      this.duration = this.midiRec.duration;
      this.source = SOURCE.MIDI;
      return this.read();
    };
    this.body.querySelector('[data-go=back]').onclick = () => {
      clearInterval(this.timer);
      this.timer = null;
      this.app.offMidi(this.midiHook);
      this.midiHook = null;
      this.midiRec.stop();
      this.renderStart();
    };
  }

  /* ------------------------------------------------------------- importing */

  async loadAudioFile(file) {
    this.progress('Decoding ' + file.name);
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
      await ctx.close();
      this.audio = { buffer, sampleRate: buffer.sampleRate };
      this.source = SOURCE.AUDIO;
      this.fileName = file.name;
      await this.listen();
    } catch (err) {
      Dlg.toast('That file could not be decoded', 'err');
      this.renderStart();
    }
  }

  async loadMidiFile(file) {
    try {
      const notes = parseMIDI(new Uint8Array(await file.arrayBuffer()));
      if (!notes.length) throw new Error('no notes');
      this.notes = notes;
      this.duration = Math.max(...notes.map((n) => n.end));
      this.source = SOURCE.MIDI;
      this.fileName = file.name;
      this.read();
    } catch (err) {
      Dlg.toast('That does not look like a MIDI file with notes in it', 'err');
      this.renderStart();
    }
  }

  /* --------------------------------------------------------------- reading */

  progress(text, value = null) {
    this.body.innerHTML = `
      <div class="tr-progress">
        <div class="tr-spinner"></div>
        <div class="tr-progress-text">${text}</div>
        <div class="tr-progress-track"><span class="tr-progress-fill" style="width:${value === null ? 8 : pct(value)}%"></span></div>
      </div>`;
  }

  /** Listen to the audio: the slow part, and the only part that can be wrong. */
  async listen() {
    this.progress('Listening for notes…', 0);
    await new Promise((r) => setTimeout(r, 30));
    const fill = this.body.querySelector('.tr-progress-fill');
    const text = this.body.querySelector('.tr-progress-text');
    const learned = this.model.parameters();
    const input = this.audio.buffer || this.audio.samples;
    try {
      const extracted = await new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            resolve(extractNotes(input, {
              sampleRate: this.audio.sampleRate,
              sensitivity: this.settings.sensitivity * learned.sensitivity,
              onProgress: (p) => {
                if (fill) fill.style.width = pct(p * 0.95) + '%';
                if (text && p > 0.5) text.textContent = 'Sorting out the chords…';
              },
            }));
          } catch (err) { reject(err); }
        }, 20);
      });
      this.notes = extracted.notes;
      this.duration = extracted.duration;
      this.onsets = extracted.onsets;
    } catch (err) {
      Dlg.toast('The audio could not be analysed', 'err');
      return this.renderStart();
    }
    if (!this.notes.length) {
      Dlg.toast('No notes were found — try recording a little louder', 'err');
      return this.renderStart();
    }
    return this.read();
  }

  /** Read the notes as music.  Fast, so every setting can be changed and re-read. */
  read() {
    const learned = this.model.parameters();
    const grid = GRID_PRESETS.find((g) => g.id === this.settings.grid) || GRID_PRESETS[0];
    const opts = {
      duration: this.duration,
      grid: grid.division,
      quantiseStrength: this.settings.quantiseStrength,
      splitHands: this.settings.splitHands,
      bpm: this.settings.bpm,
      timeSig: this.settings.timeSig,
      keyFifths: this.settings.keyFifths,
      title: this.fileName ? this.fileName.replace(/\.[^.]+$/, '') : 'Transcription',
      source: this.source,
      divisionWeights: learned.divisionWeights,
      splitCentre: learned.splitCentre,
      spellingLean: learned.spellingLean,
      octaveBias: learned.octave,
    };
    this.result = this.source === SOURCE.MIDI
      ? transcribeMidi(this.notes, opts)
      : notesToScore(this.notes, opts);
    this.renderResult();
  }

  /* --------------------------------------------------------------- result */

  /** The bars worth a second look, worst first. */
  uncertainBars() {
    if (!this.result) return [];
    const perBar = new Map();
    const beats = this.result.analysis.timeSig.beats;
    const bar = (n) => Math.floor(n.startTicks / (960 * beats * (4 / this.result.analysis.timeSig.beatType))) + 1;
    for (const n of this.result.notes) {
      const b = bar(n);
      const c = Math.min(n.confidence ?? 1, n.rhythmConfidence ?? 1);
      const cur = perBar.get(b) || { bar: b, worst: 1, count: 0 };
      cur.worst = Math.min(cur.worst, c);
      cur.count++;
      perBar.set(b, cur);
    }
    return [...perBar.values()].filter((b) => b.worst < 0.55)
      .sort((a, b) => a.worst - b.worst).slice(0, 8);
  }

  renderResult() {
    const a = this.result.analysis;
    const c = a.confidence;
    const shaky = this.uncertainBars();
    const heard = this.result.notes.length;
    const gridOptions = GRID_PRESETS.map((g) =>
      `<option value="${g.id}"${g.id === this.settings.grid ? ' selected' : ''}>${g.label}</option>`).join('');
    const tsOptions = ['auto', ...TIME_SIG_PRESETS.map((t) => `${t.beats}/${t.beatType}`)]
      .map((v) => {
        const cur = this.settings.timeSig
          ? `${this.settings.timeSig.beats}/${this.settings.timeSig.beatType}` : 'auto';
        return `<option value="${v}"${v === cur ? ' selected' : ''}>${v === 'auto' ? 'Heard: ' + a.timeSig.beats + '/' + a.timeSig.beatType : v}</option>`;
      }).join('');
    const keyOptions = ['auto', ...Object.keys(MAJOR_KEYS)].map((v) => {
      const cur = this.settings.keyFifths === null ? 'auto' : String(this.settings.keyFifths);
      const label = v === 'auto' ? 'Heard: ' + keyName(a.key.fifths, a.key.mode) : keyName(+v, 'major');
      return `<option value="${v}"${v === cur ? ' selected' : ''}>${label}</option>`;
    }).join('');

    this.body.innerHTML = `
      <div class="tr-result">
        <div class="tr-summary">
          <div class="tr-headline">
            <b>${heard}</b> note${heard === 1 ? '' : 's'} ·
            <b>${Math.round(a.bpm)}</b> bpm ·
            <b>${a.timeSig.beats}/${a.timeSig.beatType}</b> ·
            <b>${keyName(a.key.fifths, a.key.mode)}</b> ·
            <b>${a.measures}</b> bar${a.measures === 1 ? '' : 's'}
          </div>
          <div class="tr-meters">
            ${meter('Pitch', c.pitch, this.source === SOURCE.MIDI ? 'exact, from MIDI' : '')}
            ${meter('Rhythm', c.rhythm)}
            ${meter('Beat', c.beat)}
            ${meter('Metre', c.metre)}
            ${meter('Key', c.key)}
          </div>
          ${shaky.length ? `<div class="tr-shaky"><b>Look at these bars first:</b> ${shaky.map((b) => b.bar).join(', ')}
            <span class="tr-faint">— marked on the page once you accept</span></div>`
    : '<div class="tr-shaky good">Nothing stood out as doubtful.</div>'}
        </div>

        <div class="tr-tweaks">
          <h3>If something is wrong</h3>
          <label class="tr-field"><span>Rhythm grid</span>
            <select data-set="grid">${gridOptions}</select>
            <small>The shortest value to write. Automatic picks one beat at a time.</small></label>
          <label class="tr-field"><span>Fit to the beat</span>
            <input type="range" min="0" max="100" value="${Math.round(this.settings.quantiseStrength * 100)}" data-set="quantiseStrength">
            <small>All the way fits the grid exactly; lower keeps more of how it was played.</small></label>
          <label class="tr-field"><span>Tempo</span>
            <input type="number" min="20" max="300" placeholder="${Math.round(a.bpm)}"
              value="${this.settings.bpm || ''}" data-set="bpm">
            <small>Leave empty to use the tempo that was heard.</small></label>
          <label class="tr-field"><span>Time signature</span>
            <select data-set="timeSig">${tsOptions}</select></label>
          <label class="tr-field"><span>Key</span>
            <select data-set="keyFifths">${keyOptions}</select></label>
          <label class="tr-field tr-check"><span>Two staves</span>
            <input type="checkbox" data-set="splitHands"${this.settings.splitHands ? ' checked' : ''}>
            <small>Split into a right and a left hand.</small></label>
          ${this.source === SOURCE.AUDIO ? `<label class="tr-field"><span>Listening</span>
            <input type="range" min="50" max="180" value="${Math.round(this.settings.sensitivity * 100)}" data-set="sensitivity">
            <small>Higher finds quieter notes and risks inventing some. Changing this listens again.</small></label>` : ''}
        </div>
      </div>
      <div class="tr-actions">
        <button class="btn" data-do="play">${UI.play} Play it</button>
        <button class="btn" data-do="stop">Stop</button>
        <button class="btn" data-do="discard">Start over</button>
        <span class="tr-spacer"></span>
        <span class="tr-faint">Undo puts the score back as it was</span>
        <button class="btn primary" data-do="accept">Put it in the score</button>
      </div>`;

    this.body.querySelectorAll('[data-set]').forEach((el) => {
      el.onchange = () => this.changeSetting(el);
    });
    this.body.querySelectorAll('[data-do]').forEach((b) => {
      b.onclick = () => this.doAction(b.dataset.do);
    });
  }

  changeSetting(el) {
    const key = el.dataset.set;
    if (key === 'grid') this.settings.grid = el.value;
    else if (key === 'quantiseStrength') this.settings.quantiseStrength = +el.value / 100;
    else if (key === 'bpm') this.settings.bpm = el.value ? +el.value : null;
    else if (key === 'splitHands') this.settings.splitHands = el.checked;
    else if (key === 'timeSig') {
      if (el.value === 'auto') this.settings.timeSig = null;
      else {
        const [beats, beatType] = el.value.split('/').map(Number);
        this.settings.timeSig = { beats, beatType, symbol: null };
      }
    } else if (key === 'keyFifths') {
      this.settings.keyFifths = el.value === 'auto' ? null : +el.value;
    } else if (key === 'sensitivity') {
      this.settings.sensitivity = +el.value / 100;
      /* Listening again means running the whole analysis, so it is the one
       * setting that costs something. */
      this.listen();
      return;
    }
    this.read();
  }

  doAction(what) {
    if (what === 'play') return this.app.auditionScore(this.result.score);
    if (what === 'stop') return this.app.stopAudition();
    if (what === 'discard') { this.app.stopAudition(); return this.renderStart(); }
    if (what === 'accept') return this.accept();
    return undefined;
  }

  accept() {
    this.app.stopAudition();
    const proposed = this.result.score;
    /* Remember what was proposed: when the score is edited afterwards, the
     * difference is what there is to learn from. */
    this.app.adoptTranscription(proposed, this);
    this.modalClose();
  }

  /**
   * Called by the application once the user has edited an accepted
   * transcription, with the score as it now stands.
   */
  learnFrom(before, after) {
    for (const c of compareScores(before, after)) this.model.observe(c);
  }
}

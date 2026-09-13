/* Cadenza — the Transcribe panel.
 *
 * The path is short and it asks one question first: what is being transcribed.
 * That question costs a click and saves the engine a guess it cannot make well.
 * Told that this is a string quartet it looks for four lines and writes four
 * staves; told nothing, its only honest option is to pour everything onto a
 * grand staff and hope.
 *
 * After that: get the music in, let the engine read it and check its own work,
 * then look at what came back with the recording beside it.  The settings that
 * could fix a wrong reading are on the result screen, because that is where you
 * find out whether they were wrong, and re-reading with different ones is
 * instant — the notes are already known.
 *
 * What it does not do is claim more than it found.  Every stage reports its own
 * confidence, the bars it is least sure of are listed with the reason, and the
 * notes it is least sure of are marked on the page.
 */

import * as Dlg from './dialogs.js';
import { UI } from './icons.js';
import {
  transcribeAudioAsync, transcribeMidi, readMusic, SOURCE, QUANTISE_LEVELS, STYLES, PASSES,
  TARGETS, PRESETS, ALL_PARTS, resolveTarget, describeDifference
} from '../transcribe/index.js';
import { MidiRecorder, AudioRecorder, parseMIDI } from '../transcribe/capture.js';
import { GRID_PRESETS } from '../transcribe/rhythm.js';
import { CorrectionModel, compareScores } from '../transcribe/learn.js';
import { TIME_SIG_PRESETS } from '../core/rhythm.js';
import { MAJOR_KEYS, keyName } from '../core/theory.js';

const pct = (v) => Math.round(Math.max(0, Math.min(1, v || 0)) * 100);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** A labelled bar, so a confidence reads as a quantity rather than a word. */
function meter(label, value, note = '') {
  const p = pct(value);
  const tone = p >= 75 ? 'good' : p >= 45 ? 'fair' : 'poor';
  return `<div class="tr-meter"><span class="tr-meter-label">${label}</span>`
    + `<span class="tr-meter-track"><span class="tr-meter-fill ${tone}" style="width:${p}%"></span></span>`
    + `<span class="tr-meter-value">${p}%</span>`
    + (note ? `<span class="tr-meter-note">${note}</span>` : '') + '</div>';
}

const ISSUE_TEXT = {
  missing: 'a note in the recording that is not in the score',
  extra: 'a note in the score that is not in the recording',
  timing: 'the rhythm does not line up with the recording',
};

export class TranscribePanel {
  constructor(app) {
    this.app = app;
    this.model = new CorrectionModel();
    this.reset();
  }

  reset() {
    this.choice = null;        // what is being transcribed
    this.plan = null;
    this.notes = null;         // raw note events, before any musical reading
    this.duration = 0;
    this.source = null;
    this.result = null;
    this.settings = {
      sensitivity: 1,
      grid: 'auto',
      quantise: 'auto',
      style: 'balanced',
      bpm: null,
      timeSig: null,
      keyFifths: null,
      listen: true,
      annotate: false,
    };
    this.audio = null;
    this.midiRec = null;
    this.recorder = null;
    this.abTimer = null;
    this.closed = false;
  }

  open() {
    this.reset();
    this.closed = false;
    const m = Dlg.modal({
      title: 'Transcribe',
      width: 'wide',
      build: (body) => { this.body = body; this.renderSetup(); },
      onClose: () => this.cleanup(),
    });
    this.modalClose = m.close;
  }

  cleanup() {
    /* A transcription in progress stops here.  It pauses often enough to
     * notice, so closing the panel does not leave tens of seconds of
     * arithmetic running behind a window nobody is looking at. */
    this.closed = true;
    if (this.recorder && this.recorder.recording) this.recorder.stop();
    if (this.midiHook) { this.app.offMidi(this.midiHook); this.midiHook = null; }
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.stopEverything();
  }

  stopEverything() {
    if (this.abTimer) { clearTimeout(this.abTimer); this.abTimer = null; }
    this.app.stopAudition();
    this.app.stopAudio();
  }

  /* --------------------------------------------------- what is being played */

  renderSetup() {
    this.body.innerHTML = `
      <p class="tr-lead">What are you transcribing? The answer decides how many lines
        Cadenza looks for and what the score is laid out as.</p>
      <div class="tr-setup">
        ${TARGETS.map((group) => `
          <section class="tr-group">
            <h3>${esc(group.group)}</h3>
            <p class="tr-group-tip">${esc(group.tip)}</p>
            <div class="tr-group-items">
              ${group.items.map((t) => `<button class="tr-pill" data-target="${t.id}">${esc(t.label)}</button>`).join('')}
            </div>
          </section>`).join('')}
      </div>`;
    this.body.querySelectorAll('[data-target]').forEach((b) => {
      b.onclick = () => this.chooseTarget(b.dataset.target);
    });
  }

  chooseTarget(id) {
    const group = TARGETS.find((g) => g.items.some((t) => t.id === id));
    const target = group.items.find((t) => t.id === id);
    this.choice = { targetId: id };
    if (target.pick) return this.renderPicker(target);
    this.plan = resolveTarget(this.choice);
    return this.renderStart();
  }

  /** Choosing the players, either from a ready-made line-up or one at a time. */
  renderPicker(target, picked = []) {
    const wanted = target.pick === 'any' ? null : target.pick;
    const presets = (target.presets || []).map((id) => PRESETS[id]).filter(Boolean);
    const byFamily = new Map();
    for (const p of ALL_PARTS) {
      if (!byFamily.has(p.family)) byFamily.set(p.family, []);
      byFamily.get(p.family).push(p);
    }
    this.body.innerHTML = `
      <p class="tr-lead">Which instruments?${wanted ? ` Choose ${wanted}.` : ''}</p>
      ${presets.length ? `<div class="tr-presets">
        ${presets.map((p, i) => `<button class="tr-pill" data-preset="${esc(target.presets[i])}">${esc(p.label)}</button>`).join('')}
      </div><div class="tr-or">or choose them yourself</div>` : ''}
      <div class="tr-chosen">${picked.length
    ? picked.map((id, i) => `<span class="tr-chip">${esc(nameOf(id))}<button data-drop="${i}" aria-label="Remove">×</button></span>`).join('')
    : '<span class="tr-faint">nothing chosen yet</span>'}</div>
      <div class="tr-catalogue">
        ${[...byFamily.entries()].map(([family, list]) => `
          <section><h4>${esc(family)}</h4>
            <div class="tr-group-items">
              ${list.map((p) => `<button class="tr-pill small" data-add="${p.id}">${esc(p.name)}</button>`).join('')}
            </div></section>`).join('')}
      </div>
      <div class="tr-actions">
        <button class="btn" data-back>Back</button>
        <span class="tr-spacer"></span>
        <button class="btn primary" data-done${picked.length && (!wanted || picked.length === wanted) ? '' : ' disabled'}>Continue</button>
      </div>`;

    this.body.querySelectorAll('[data-preset]').forEach((b) => {
      b.onclick = () => {
        this.choice = { targetId: target.id, preset: b.dataset.preset };
        this.plan = resolveTarget(this.choice);
        this.renderStart();
      };
    });
    this.body.querySelectorAll('[data-add]').forEach((b) => {
      b.onclick = () => {
        const next = [...picked, b.dataset.add];
        if (wanted && next.length > wanted) next.shift();
        this.renderPicker(target, next);
      };
    });
    this.body.querySelectorAll('[data-drop]').forEach((b) => {
      b.onclick = () => this.renderPicker(target, picked.filter((x, i) => i !== +b.dataset.drop));
    });
    this.body.querySelector('[data-back]').onclick = () => this.renderSetup();
    const done = this.body.querySelector('[data-done]');
    done.onclick = () => {
      this.choice = { targetId: target.id, parts: picked };
      this.plan = resolveTarget(this.choice);
      this.renderStart();
    };
  }

  /* ------------------------------------------------------------ getting in */

  renderStart() {
    const learned = this.model.summary();
    const players = this.plan.parts.map((p) => p.name).join(', ');
    this.body.innerHTML = `
      <div class="tr-forwhat">
        <b>${esc(this.plan.label)}</b> — ${esc(players)}
        <button class="linkish" data-go="setup">change</button>
      </div>
      <div class="tr-choices">
        <button class="tr-choice" data-go="mic">
          <span class="tr-choice-icon">${UI.mic}</span>
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
        to: Cadenza plays its own transcription back, compares it with the recording and
        corrects what differs, which is what makes chords and two independent hands come
        back well. A dense orchestral recording is a starting point that will need
        editing. Nothing is sent anywhere — it all runs on this machine.
      </div>
      ${learned.empty ? '' : `<div class="tr-learned"><b>Adjusted to your corrections</b><ul>${learned.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
        <button class="linkish" data-go="forget">Forget what was learned</button></div>`}`;
    this.body.querySelectorAll('[data-go]').forEach((b) => {
      b.onclick = () => this.go(b.dataset.go);
    });
  }

  go(where) {
    if (where === 'setup') return this.renderSetup();
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
    return this.run();
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

    const finish = (transcribe) => {
      clearInterval(this.timer);
      this.timer = null;
      this.app.offMidi(this.midiHook);
      this.midiHook = null;
      const notes = this.midiRec.stop();
      if (!transcribe) return this.renderStart();
      if (!notes.length) { Dlg.toast('No notes were played', 'err'); return this.renderStart(); }
      this.notes = notes;
      this.duration = this.midiRec.duration;
      this.source = SOURCE.MIDI;
      return this.run();
    };
    this.body.querySelector('[data-stop]').onclick = () => finish(true);
    this.body.querySelector('[data-go=back]').onclick = () => finish(false);
  }

  /* ----------------------------------------------------------- importing */

  async loadAudioFile(file) {
    this.showProgress('events');
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
      await ctx.close();
      this.audio = { buffer, sampleRate: buffer.sampleRate, samples: buffer.getChannelData(0) };
      this.source = SOURCE.AUDIO;
      this.fileName = file.name;
      await this.run();
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
      this.run();
    } catch (err) {
      Dlg.toast('That does not look like a MIDI file with notes in it', 'err');
      this.renderStart();
    }
  }

  /* ------------------------------------------------------------ the work */

  /**
   * Show what the engine is doing.
   *
   * Not decoration: a transcription that plays itself back and corrects itself
   * takes several seconds, and a blank pause is indistinguishable from a hang.
   * Each stage ticks as it finishes, and the listening passes count themselves.
   */
  showProgress(stage, detail = {}) {
    if (!this.progressEl) {
      this.body.innerHTML = `
        <div class="tr-progress">
          <div class="tr-progress-text">Transcribing…</div>
          <ul class="tr-steps">
            ${PASSES.map((p) => `<li data-step="${p.id}"><span class="tr-tick"></span>${esc(p.label)}</li>`).join('')}
          </ul>
        </div>`;
      this.progressEl = this.body.querySelector('.tr-steps');
      this.doneSteps = new Set();
    }
    const index = PASSES.findIndex((p) => p.id === stage);
    if (index < 0) return;
    PASSES.forEach((p, i) => {
      const li = this.progressEl.querySelector(`[data-step="${p.id}"]`);
      if (!li) return;
      if (i < index || this.doneSteps.has(p.id)) { li.className = 'done'; this.doneSteps.add(p.id); }
      else if (i === index) li.className = 'doing';
    });
    const li = this.progressEl.querySelector(`[data-step="${stage}"]`);
    if (li && detail.pass) {
      let note = li.querySelector('.tr-step-note');
      if (!note) { note = document.createElement('span'); note.className = 'tr-step-note'; li.appendChild(note); }
      note.textContent = `pass ${detail.pass}`;
    }
  }

  async run() {
    this.progressEl = null;
    this.showProgress('events');
    await new Promise((r) => setTimeout(r, 20));
    const learned = this.model.parameters();
    const grid = GRID_PRESETS.find((g) => g.id === this.settings.grid) || GRID_PRESETS[0];
    const opts = {
      plan: this.plan,
      duration: this.duration,
      grid: grid.division,
      quantise: this.settings.quantise,
      style: this.settings.style,
      bpm: this.settings.bpm,
      timeSig: this.settings.timeSig,
      keyFifths: this.settings.keyFifths,
      annotate: this.settings.annotate,
      title: this.fileName ? this.fileName.replace(/\.[^.]+$/, '') : 'Transcription',
      divisionWeights: learned.divisionWeights,
      splitCentre: learned.splitCentre,
      spellingLean: learned.spellingLean,
      octaveBias: learned.octave,
      onPass: (stage, detail) => this.showProgress(stage, detail),
    };

    try {
      if (this.source === SOURCE.MIDI) {
        this.result = transcribeMidi(this.notes, opts);
      } else {
        /* The analysis hands the thread back as it goes, so the page keeps
         * answering and the progress list opposite actually moves. */
        const input = this.audio.buffer || this.audio.samples;
        this.result = await transcribeAudioAsync(input, {
          ...opts,
          sampleRate: this.audio.sampleRate,
          sensitivity: this.settings.sensitivity * learned.sensitivity,
          listen: this.settings.listen,
          cancelled: () => this.closed,
        });
        this.notes = this.result.notes;
      }
    } catch (err) {
      /* Closed while it was working: nothing to report, and nothing to show. */
      if (err && err.cancelled) return undefined;
      Dlg.toast('The analysis failed: ' + err.message, 'err');
      return this.renderStart();
    }
    if (this.closed) return undefined;
    if (!this.result.notes.length) {
      Dlg.toast('No notes were found — try recording a little louder', 'err');
      return this.renderStart();
    }
    return this.renderResult();
  }

  /** Re-read the notes that were already found, with different settings. */
  reread() {
    const learned = this.model.parameters();
    const grid = GRID_PRESETS.find((g) => g.id === this.settings.grid) || GRID_PRESETS[0];
    const previous = this.result.analysis;
    this.result = readMusic(this.result.notes, {
      plan: this.plan,
      duration: this.duration || previous.duration,
      grid: grid.division,
      quantise: this.settings.quantise,
      style: this.settings.style,
      bpm: this.settings.bpm,
      timeSig: this.settings.timeSig,
      keyFifths: this.settings.keyFifths,
      annotate: this.settings.annotate,
      source: this.source,
      title: this.fileName ? this.fileName.replace(/\.[^.]+$/, '') : 'Transcription',
      divisionWeights: learned.divisionWeights,
      splitCentre: learned.splitCentre,
      spellingLean: learned.spellingLean,
    });
    this.result.analysis.listened = previous.listened;
    this.result.analysis.similarity = previous.similarity;
    this.result.analysis.passes = previous.passes;
    this.result.analysis.corrections = previous.corrections;
    this.result.analysis.difference = previous.difference;
    this.result.analysis.duration = previous.duration;
    this.result.analysis.heard = previous.heard;
    this.renderResult();
  }

  /* -------------------------------------------------------------- result */

  /** Which bar a moment in the recording falls in. */
  barLocator() {
    const a = this.result.analysis;
    if (!a.beat || !a.timeSig) return () => null;
    const perBar = a.timeSig.beats * (4 / a.timeSig.beatType);
    return (time) => {
      const beats = (time - a.beat.phase) / a.beat.period;
      if (!isFinite(beats) || beats < 0) return 1;
      return Math.floor(beats / Math.max(1, perBar)) + 1;
    };
  }

  /** The bars worth a second look, with the reason for each. */
  issues() {
    const a = this.result.analysis;
    const out = [];
    if (a.difference) {
      for (const d of describeDifference(a.difference, this.barLocator())) {
        out.push({
          bar: d.bar,
          kind: d.kind,
          text: d.bar ? `Bar ${d.bar} — ${ISSUE_TEXT[d.kind]}` : ISSUE_TEXT[d.kind],
          detail: d.pitches.length ? [...new Set(d.pitches.map(noteName))].join(', ') : '',
          strength: d.strength,
        });
      }
    }
    /* Notes the reading itself was unsure of, gathered by bar. */
    const perBar = new Map();
    const perBeat = a.perBeat || 960;
    const barTicks = perBeat * (a.timeSig ? a.timeSig.beats * (4 / a.timeSig.beatType) : 4);
    for (const n of this.result.notes) {
      const c = Math.min(n.confidence ?? 1, n.rhythmConfidence ?? 1);
      if (c >= 0.55) continue;
      const bar = Math.floor(n.startTicks / barTicks) + 1;
      const cur = perBar.get(bar) || { bar, worst: 1, count: 0 };
      cur.worst = Math.min(cur.worst, c);
      cur.count++;
      perBar.set(bar, cur);
    }
    for (const b of [...perBar.values()].sort((x, y) => x.worst - y.worst).slice(0, 6)) {
      if (out.some((o) => o.bar === b.bar)) continue;
      out.push({
        bar: b.bar, kind: 'uncertain', strength: 1 - b.worst,
        text: `Bar ${b.bar} — ${b.count} note${b.count === 1 ? '' : 's'} Cadenza was unsure of`,
        detail: '',
      });
    }
    return out.sort((x, y) => y.strength - x.strength).slice(0, 10);
  }

  renderResult() {
    const a = this.result.analysis;
    const c = a.confidence;
    const issues = this.issues();
    const heard = this.result.notes.length;
    const gridOptions = GRID_PRESETS.map((g) =>
      `<option value="${g.id}"${g.id === this.settings.grid ? ' selected' : ''}>${esc(g.label)}</option>`).join('');
    const quantOptions = QUANTISE_LEVELS.map((q) =>
      `<option value="${q.id}"${q.id === this.settings.quantise ? ' selected' : ''}>${esc(q.label)}</option>`).join('');
    const style = STYLES.find((x) => x.id === this.settings.style) || STYLES[1];
    const styleOptions = STYLES.map((x) =>
      `<option value="${x.id}"${x.id === this.settings.style ? ' selected' : ''}>${esc(x.label)}</option>`).join('');
    const tsOptions = ['auto', ...TIME_SIG_PRESETS.map((t) => `${t.beats}/${t.beatType}`)]
      .map((v) => {
        const cur = this.settings.timeSig
          ? `${this.settings.timeSig.beats}/${this.settings.timeSig.beatType}` : 'auto';
        return `<option value="${v}"${v === cur ? ' selected' : ''}>${v === 'auto' ? 'Heard: ' + a.timeSig.beats + '/' + a.timeSig.beatType : v}</option>`;
      }).join('');
    const keyOptions = ['auto', ...Object.keys(MAJOR_KEYS)].map((v) => {
      const cur = this.settings.keyFifths === null ? 'auto' : String(this.settings.keyFifths);
      const label = v === 'auto' ? 'Heard: ' + keyName(a.key.fifths, a.key.mode) : keyName(+v, 'major');
      return `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`;
    }).join('');
    const players = this.result.assignment
      ? this.result.assignment.parts.filter((p) => p.notes.length) : [];

    this.body.innerHTML = `
      <div class="tr-result">
        <div class="tr-summary">
          <div class="tr-headline">
            <b>${heard}</b> note${heard === 1 ? '' : 's'} ·
            <b>${Math.round(a.bpm)}</b> bpm ·
            <b>${a.timeSig.beats}/${a.timeSig.beatType}</b> ·
            <b>${esc(keyName(a.key.fifths, a.key.mode))}</b> ·
            <b>${a.measures}</b> bar${a.measures === 1 ? '' : 's'}
          </div>
          ${a.listened ? `<div class="tr-verified">
            <b>Checked against the recording.</b> Cadenza played its own score back
            ${a.passes.length} time${a.passes.length === 1 ? '' : 's'}, compared it with what you played
            and made ${a.corrections.length} correction${a.corrections.length === 1 ? '' : 's'}.
            ${a.passes.length > 1 && pct(a.similarity) > pct(a.passes[0].similarity)
    ? `Match rose from ${pct(a.passes[0].similarity)}% to ${pct(a.similarity)}%.`
    : 'The corrections it tried after that did not improve the match, so it kept this reading.'}
          </div>` : ''}
          ${a.listened && a.reachedFloor === false ? `<div class="tr-shaky">
            It kept working until the corrections ran out and reached
            ${pct(a.similarity)}%, short of the ${pct(a.matchFloor)}% it aims for.
            The recording has more in it than this reading accounts for — dense
            or many-voiced music is the usual reason. What is on the page is the
            best of ${a.passes.length} attempt${a.passes.length === 1 ? '' : 's'};
            everything it could not account for is listed under Show the working.
          </div>` : ''}
          <div class="tr-meters">
            ${a.listened ? meter('Match', a.similarity, 'how much of the recording the score accounts for') : ''}
            ${meter('Pitch', c.pitch, this.source === SOURCE.MIDI ? 'exact, from MIDI' : '')}
            ${meter('Rhythm', c.rhythm)}
            ${meter('Beat', c.beat)}
            ${meter('Metre', c.metre)}
            ${meter('Key', c.key)}
            ${players.length > 1 ? meter('Parts', c.parts, 'how well each line fits its instrument') : ''}
          </div>
          ${players.length > 1 ? `<div class="tr-players">
            ${players.map((p) => `<span class="tr-player"><b>${esc(p.part.name)}</b> ${p.notes.length} notes</span>`).join('')}
          </div>` : ''}

          <div class="tr-ab">
            <span class="tr-ab-label">Compare</span>
            <button class="btn" data-do="playOriginal"${this.audio ? '' : ' disabled'}>${UI.play} Original</button>
            <button class="btn" data-do="playScore">${UI.play} Transcription</button>
            <button class="btn" data-do="ab"${this.audio ? '' : ' disabled'}>A / B</button>
            <button class="btn" data-do="stop">Stop</button>
          </div>

          ${a.simplified && a.simplified.length ? `<div class="tr-simplified">
            <b>Kept simple</b>
            <ul>${a.simplified.map((line) => `<li>${esc(line)}</li>`).join('')}</ul>
          </div>` : ''}
          ${issues.length ? `<div class="tr-issues">
            <b>Worth a second look</b>
            <ul>${issues.map((i) => `<li data-bar="${i.bar || ''}" class="tr-issue ${i.kind}">
              <span class="tr-warn">⚠</span> ${esc(i.text)}${i.detail ? ` <span class="tr-faint">(${esc(i.detail)})</span>` : ''}
            </li>`).join('')}</ul>
            <span class="tr-faint">These bars are marked on the page once you accept.</span>
          </div>` : '<div class="tr-shaky good">Nothing stood out as doubtful.</div>'}

          ${a.trace && a.trace.length ? `<details class="tr-trace">
            <summary>Show the working</summary>
            <p class="tr-faint">Each stage, in the order it ran, and what it handed to the next
              one. If the notation is wrong, this is where to see which stage got it wrong —
              whether a chord was heard as separate notes, or heard correctly and taken apart
              afterwards.</p>
            ${a.trace.map((st) => `<div class="tr-stage">
              <b>${esc(st.label)}</b>
              <div class="tr-faint">${esc(st.note || `${st.count} line${st.count === 1 ? '' : 's'}`)}</div>
              ${st.lines.length ? `<pre>${esc(st.lines.join('\n'))}</pre>` : ''}
            </div>`).join('')}
          </details>` : ''}
        </div>

        <div class="tr-tweaks">
          <h3>If something is wrong</h3>
          <label class="tr-field"><span>Transcription style</span>
            <select data-set="style">${styleOptions}</select>
            <small>${esc(style.tip)}</small></label>
          <label class="tr-field"><span>Quantisation</span>
            <select data-set="quantise">${quantOptions}</select>
            <small>Automatic reads each beat on its own, which is what writes a triplet
              as a triplet. The rest are for when it gets that wrong.</small></label>
          <label class="tr-field"><span>Rhythm grid</span>
            <select data-set="grid">${gridOptions}</select>
            <small>The shortest value to write.</small></label>
          <label class="tr-field"><span>Tempo</span>
            <input type="number" min="20" max="300" placeholder="${Math.round(a.bpm)}"
              value="${this.settings.bpm || ''}" data-set="bpm">
            <small>Leave empty to use the tempo that was heard.</small></label>
          <label class="tr-field"><span>Time signature</span>
            <select data-set="timeSig">${tsOptions}</select></label>
          <label class="tr-field"><span>Key</span>
            <select data-set="keyFifths">${keyOptions}</select></label>
          <label class="tr-field tr-check"><span>Chord symbols</span>
            <input type="checkbox" data-set="annotate"${this.settings.annotate ? ' checked' : ''}>
            <small>Write the harmony above the staff. It labels the notes; it never changes them.</small></label>
          ${this.source === SOURCE.AUDIO ? `<label class="tr-field"><span>Listening</span>
            <input type="range" min="50" max="180" value="${Math.round(this.settings.sensitivity * 100)}" data-set="sensitivity">
            <small>Higher finds quieter notes and risks inventing some. Changing this listens again.</small></label>
          <label class="tr-field tr-check"><span>Check by listening back</span>
            <input type="checkbox" data-set="listen"${this.settings.listen ? ' checked' : ''}>
            <small>Play the score, compare it with the recording, correct what differs. Slower, and much better.</small></label>` : ''}
          <button class="btn" data-do="instruments">Change the instruments</button>
        </div>
      </div>
      <div class="tr-actions">
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
    this.body.querySelectorAll('[data-bar]').forEach((li) => {
      if (!li.dataset.bar) return;
      li.onclick = () => { this.pendingBar = +li.dataset.bar; Dlg.toast(`Bar ${li.dataset.bar} will be marked`, ''); };
    });
  }

  changeSetting(el) {
    const key = el.dataset.set;
    if (key === 'grid') this.settings.grid = el.value;
    else if (key === 'style') this.settings.style = el.value;
    else if (key === 'quantise') this.settings.quantise = el.value;
    else if (key === 'bpm') this.settings.bpm = el.value ? +el.value : null;
    else if (key === 'annotate') this.settings.annotate = el.checked;
    else if (key === 'listen') { this.settings.listen = el.checked; return this.run(); }
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
      return this.run();
    }
    this.reread();
    return undefined;
  }

  doAction(what) {
    if (what === 'playScore') { this.stopEverything(); return this.app.auditionScore(this.result.score); }
    if (what === 'playOriginal') { this.stopEverything(); return this.playOriginal(); }
    if (what === 'ab') return this.startAB();
    if (what === 'stop') return this.stopEverything();
    if (what === 'instruments') { this.stopEverything(); return this.renderSetup(); }
    if (what === 'discard') { this.stopEverything(); return this.renderStart(); }
    if (what === 'accept') return this.accept();
    return undefined;
  }

  playOriginal() {
    const samples = this.audio.samples
      || (this.audio.buffer ? this.audio.buffer.getChannelData(0) : null);
    if (!samples) return;
    this.app.playAudio(samples, this.audio.sampleRate);
  }

  /**
   * Alternate the recording and the score.
   *
   * Hearing them back to back is the quickest way to find what is wrong: a
   * wrong note that is invisible in a list of bar numbers is obvious the
   * instant the two are played one after the other.
   */
  startAB() {
    this.stopEverything();
    const length = Math.min(6, this.result.analysis.duration || 6);
    let turn = 0;
    const step = () => {
      if (turn % 2 === 0) this.playOriginal();
      else this.app.auditionScore(this.result.score);
      turn++;
      if (turn >= 4) { this.abTimer = setTimeout(() => this.stopEverything(), length * 1000); return; }
      this.abTimer = setTimeout(step, length * 1000 + 250);
    };
    step();
  }

  accept() {
    this.stopEverything();
    const bars = this.issues().filter((i) => i.bar).map((i) => i.bar);
    this.app.adoptTranscription(this.result.score, this, { bars, analysis: this.result.analysis });
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

const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const noteName = (midi) => NOTE_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
const nameOf = (id) => (ALL_PARTS.find((p) => p.id === id) || { name: id }).name;

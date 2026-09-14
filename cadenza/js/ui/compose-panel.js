/* Cadenza — writing a piece from a description.
 *
 * You say what kind of thing you want and in what key; this writes one.  The
 * point of the panel is that it asks the few questions that actually change
 * the music — character, key, length, who is playing — and then shows what it
 * decided, chord by chord, rather than presenting a finished page as though it
 * had come from nowhere.  The progression is on screen because a composer
 * looking at a generated piece wants to know what the harmony is before
 * deciding whether to keep it.
 *
 * Nothing here is a recording of anything.  Every piece is built from the key,
 * the chord functions and the shape rules in js/compose, so each one is new.
 */

import * as Dlg from './dialogs.js';
import { composePiece, CHARACTERS, tonicName } from '../compose/index.js';
import { ALL_PARTS } from '../transcribe/index.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const TONICS = [0, 7, 2, 9, 4, 11, 5, 10, 3, 8, 1, 6];
const MODES = [
  { id: 'major', name: 'Major', tip: 'Bright, and where most music lives' },
  { id: 'minor', name: 'Minor', tip: 'Darker, with a leading note at the cadences' },
  { id: 'dorian', name: 'Dorian', tip: 'Minor with a raised sixth — folk and modal writing' },
  { id: 'mixolydian', name: 'Mixolydian', tip: 'Major with a flattened seventh' },
];
const LENGTHS = [
  { bars: 8, name: 'Short', tip: 'Two phrases — a sentence' },
  { bars: 16, name: 'Standard', tip: 'Four phrases — a complete little piece' },
  { bars: 24, name: 'Longer', tip: 'Six phrases' },
  { bars: 32, name: 'Full', tip: 'Eight phrases' },
];
const SOLOISTS = ['violin', 'flute', 'cello', 'clarinet', 'oboe', 'trumpet', 'guitar'];

export class ComposePanel {
  constructor(app) {
    this.app = app;
    this.reset();
  }

  reset() {
    this.settings = {
      character: 'classical',
      tonic: 0,
      mode: 'major',
      bars: 16,
      ensemble: 'piano',
      melodyInstrument: 'violin',
      bpm: null,
    };
    this.piece = null;
  }

  open() {
    this.reset();
    const m = Dlg.modal({
      title: 'Compose',
      width: 'wide',
      build: (body) => { this.body = body; this.renderSetup(); },
      onClose: () => this.app.stopAudition(),
    });
    this.modalClose = m.close;
  }

  /* ------------------------------------------------------------- setup */

  renderSetup() {
    const s = this.settings;
    const character = CHARACTERS.find((c) => c.id === s.character) || CHARACTERS[0];
    /* A mode the chosen character does not write in is not offered. */
    if (!character.modes.includes(s.mode)) s.mode = character.modes[0];

    this.body.innerHTML = `
      <div class="cp">
        <p class="cp-lead">Say what you want and it will be written. Everything is made from
          the key and the harmony — each piece is new, and you can edit it afterwards like
          anything else.</p>

        <h3>What kind of piece</h3>
        <div class="cp-cards">
          ${CHARACTERS.map((c) => `
            <button class="cp-card${c.id === s.character ? ' on' : ''}" data-character="${c.id}">
              <span class="cp-card-name">${esc(c.name)}</span>
              <span class="cp-card-tip">${esc(c.tip)}</span>
            </button>`).join('')}
        </div>

        <div class="cp-row">
          <label class="cp-field"><span>Key</span>
            <select data-set="tonic">
              ${TONICS.map((t) => `<option value="${t}"${t === s.tonic ? ' selected' : ''}>${tonicName(t)}</option>`).join('')}
            </select></label>
          <label class="cp-field"><span>Mode</span>
            <select data-set="mode">
              ${MODES.filter((m) => character.modes.includes(m.id)).map((m) =>
    `<option value="${m.id}"${m.id === s.mode ? ' selected' : ''}>${esc(m.name)}</option>`).join('')}
            </select>
            <small>${esc((MODES.find((m) => m.id === s.mode) || MODES[0]).tip)}</small></label>
          <label class="cp-field"><span>Length</span>
            <select data-set="bars">
              ${LENGTHS.map((l) => `<option value="${l.bars}"${l.bars === s.bars ? ' selected' : ''}>${esc(l.name)} — ${l.bars} bars</option>`).join('')}
            </select></label>
        </div>

        <div class="cp-row">
          <label class="cp-field"><span>Who plays it</span>
            <select data-set="ensemble">
              <option value="piano"${s.ensemble === 'piano' ? ' selected' : ''}>Solo piano</option>
              <option value="duo"${s.ensemble === 'duo' ? ' selected' : ''}>A melody instrument and piano</option>
            </select></label>
          ${s.ensemble === 'duo' ? `<label class="cp-field"><span>Melody instrument</span>
            <select data-set="melodyInstrument">
              ${SOLOISTS.map((id) => {
    const part = ALL_PARTS.find((p) => p.id === id);
    return part ? `<option value="${id}"${id === s.melodyInstrument ? ' selected' : ''}>${esc(part.name)}</option>` : '';
  }).join('')}
            </select></label>` : ''}
          <label class="cp-field"><span>Tempo</span>
            <input type="number" min="30" max="240" placeholder="${character.bpm[0]}–${character.bpm[1]}"
              value="${s.bpm || ''}" data-set="bpm">
            <small>Leave empty and it will choose one to suit.</small></label>
        </div>

        <div class="cp-go">
          <button class="btn primary" data-do="write">Write it</button>
        </div>
      </div>`;

    this.body.querySelectorAll('[data-character]').forEach((el) => {
      el.onclick = () => { this.settings.character = el.dataset.character; this.renderSetup(); };
    });
    this.body.querySelectorAll('[data-set]').forEach((el) => {
      el.onchange = () => {
        const key = el.dataset.set;
        const value = el.value;
        if (key === 'tonic' || key === 'bars') this.settings[key] = Number(value);
        else if (key === 'bpm') this.settings.bpm = value ? Number(value) : null;
        else this.settings[key] = value;
        if (key === 'ensemble' || key === 'mode') this.renderSetup();
      };
    });
    this.body.querySelector('[data-do=write]').onclick = () => this.write();
  }

  /* ------------------------------------------------------------ writing */

  write(seed = undefined) {
    const s = this.settings;
    try {
      this.piece = composePiece({
        character: s.character,
        tonic: s.tonic,
        mode: s.mode,
        bars: s.bars,
        ensemble: s.ensemble,
        melodyInstrument: s.melodyInstrument,
        bpm: s.bpm,
        seed,
        title: 'Untitled piece',
      });
    } catch (err) {
      Dlg.toast('It could not write that: ' + err.message, 'err');
      return;
    }
    this.renderResult();
  }

  renderResult() {
    const d = this.piece.description;
    const CLOSES = {
      half: 'ends on the dominant, asking',
      authentic: 'a full close',
      deceptive: 'turns aside at the last moment',
      plagal: 'a plagal close',
    };

    this.body.innerHTML = `
      <div class="cp">
        <div class="cp-summary">
          <b>${esc(d.key)}</b> · <b>${esc(d.character)}</b> ·
          <b>${d.bars}</b> bars · <b>${d.tempo}</b> bpm · <b>${esc(d.timeSig)}</b> ·
          ${esc(d.texture)}
        </div>

        <div class="cp-ab">
          <button class="btn" data-do="play">▶ Listen</button>
          <button class="btn" data-do="stop">Stop</button>
          <button class="btn" data-do="again">Another version</button>
        </div>

        <h3>The harmony it wrote</h3>
        <ol class="cp-phrases">
          ${d.progression.map((p, i) => `<li>
            <span class="cp-chords">${esc(p)}</span>
            <span class="cp-close">${esc(CLOSES[d.cadences[i]] || d.cadences[i])}</span>
          </li>`).join('')}
        </ol>
        <p class="cp-note">Four-bar phrases: each asks or answers, and only the last one
          closes fully. The tune is written over these chords — chord notes on the beat,
          steps between them, and one high point.</p>

        <div class="cp-go">
          <button class="btn primary" data-do="use">Put it on the page</button>
          <button class="btn" data-do="back">Change something</button>
        </div>
      </div>`;

    this.body.querySelector('[data-do=play]').onclick = () => this.app.auditionScore(this.piece.score);
    this.body.querySelector('[data-do=stop]').onclick = () => this.app.stopAudition();
    this.body.querySelector('[data-do=again]').onclick = () => {
      this.app.stopAudition();
      this.write(Math.floor(Math.random() * 1e9));
    };
    this.body.querySelector('[data-do=back]').onclick = () => { this.app.stopAudition(); this.renderSetup(); };
    this.body.querySelector('[data-do=use]').onclick = () => this.adopt();
  }

  adopt() {
    this.app.stopAudition();
    const d = this.piece.description;
    this.app.setScore(this.piece.score);
    this.app.history.begin('Compose');
    this.app.history.commit();
    this.app.flagged = new Map();
    this.app.flaggedBars = new Set();
    this.app.render();
    this.app.buildParts();
    this.app.buildMixer();
    if (this.modalClose) this.modalClose();
    Dlg.toast(`${d.bars} bars in ${d.key} — edit it like anything else`, 'ok');
  }
}

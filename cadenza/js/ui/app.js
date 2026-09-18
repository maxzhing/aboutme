/* Cadenza — application controller.
 *
 * Owns the document, the selection and the note-entry cursor, and wires the
 * engraver, the audio engine and the input methods together.
 */

import * as Model from '../core/model.js';
import * as Edit from '../core/edit.js';
import * as Theory from '../core/theory.js';
import { History } from '../core/history.js';
import { DURATIONS, durationTicks, measureTicks, beatTicks } from '../core/rhythm.js';
import { getInstrument } from '../core/instruments.js';
import { layoutScore } from '../engrave/layout.js';
import { renderPageSVG, renderPageStandalone } from '../engrave/render.js';
import { DYNAMIC_MARKS, ARTICULATIONS } from '../engrave/glyphs.js';
import { M as Metrics } from '../engrave/metrics.js';
import { SynthEngine } from '../audio/synth.js';
import { Player } from '../audio/player.js';
import { exportMIDI } from '../io/midifile.js';
import { exportMusicXML } from '../io/musicxml.js';
import { renderScore, encodeWAV } from '../io/audiofile.js';
import * as Files from '../io/files.js';
import { UI, noteIcon, glyphIcon, dynamicIcon } from './icons.js';
import * as Dlg from './dialogs.js';
import { PianoKeyboard } from './piano.js';
import { MidiInput } from './midi.js';
import { ESSENTIALS, PALETTES } from './ribbon.js';
import { TranscribePanel } from './transcribe-panel.js';
import { ComposePanel } from './compose-panel.js';
import { installShortcuts, SHORTCUT_HELP } from './shortcuts.js';

const ZOOM_STEPS = [0.5, 0.62, 0.75, 0.88, 1, 1.15, 1.35, 1.6, 1.9, 2.3, 2.8];

export class Cadenza {
  constructor() {
    this.score = null;
    this.history = null;
    this.synth = new SynthEngine();
    this.player = new Player(this.synth);
    this.selection = new Set();
    this.anchorEvent = null;
    this.measureSel = null;          // { partIndex, from, to }
    this.cursor = { partIndex: 0, staff: 0, measure: 0, voice: 0, tick: 0 };
    this.noteEntry = false;
    this.duration = 'quarter';
    this.dots = 0;
    this.zoomIndex = 4;
    this.clipboard = null;
    this.layout = null;
    this.measureRects = new Map();
    this.viewPart = null;            // null = full score
    this.playhead = null;
    this.pendingRender = null;
    this.midiHeld = new Set();
    this.midiTaps = new Set();       // listeners for raw MIDI, used by Transcribe
    this.lastSaved = null;
    this.openPaletteId = null;
    this.flagged = new Map();        // eventId -> confidence, from a transcription
    this.flaggedBars = new Set();    // bars where the score and the recording disagreed
    this.audition = null;
  }

  /* ------------------------------------------------------------- startup */

  init() {
    this.el = {
      app: document.getElementById('app'),
      pages: document.getElementById('score-pages'),
      scroll: document.getElementById('score-scroll'),
      ribbon: document.getElementById('ribbon'),
      parts: document.getElementById('parts-panel'),
      mixer: document.getElementById('mixer-panel'),
      inspector: document.getElementById('inspector-panel'),
      help: document.getElementById('help-panel'),
      hint: document.getElementById('status-hint'),
      statusRight: document.getElementById('status-right'),
      title: document.getElementById('doc-title'),
      composer: document.getElementById('doc-composer'),
      tempoSlider: document.getElementById('tempo-slider'),
      tempoInput: document.getElementById('tempo-input'),
      posMeasure: document.getElementById('pos-measure'),
      posBeat: document.getElementById('pos-beat'),
      pianoBar: document.getElementById('piano-bar'),
      pianoKeys: document.getElementById('piano-keys'),
      pbControls: document.getElementById('pb-controls'),
      tooltip: document.getElementById('tooltip'),
      palettes: document.getElementById('palettes'),
      palette: document.getElementById('palette-drawer'),
    };

    const restored = Files.loadAutosave();
    if (restored && restored.score && restored.score.parts.length) {
      this.setScore(restored.score, { silent: true });
    } else {
      this.setScore(Model.createScore({
        title: 'Untitled Score', instrumentIds: ['piano'], measures: 16,
      }), { silent: true });
    }

    this.zoomIndex = Files.recallSetting('zoom', 4);
    this.buildTopBar();
    this.buildRibbon();
    this.buildTransport();
    this.buildPianoBar();
    this.buildHelpPanel();
    this.bindPanelTabs();
    this.bindScoreEvents();
    this.bindTitleFields();
    installShortcuts(this);
    this.initTooltips();
    this.initMidi();

    this.player.on('position', (t, at) => this.onPlayPosition(t, at));
    this.player.on('state', (s) => this.onPlayState(s));

    const palette = Files.recallSetting('palette', '');
    if (palette) this.togglePalette(palette);

    this.el.app.classList.remove('loading');
    this.render();
    this.setHint();
    /* One piece of onboarding, not two: labels pointing at the real controls
     * beat a dialog listing them, and the dialog is what people close without
     * reading. */
    if (!Files.recallSetting('coached', 0)) setTimeout(() => this.showCoachMarks(), 500);
    setInterval(() => this.autosave(), 20000);
    window.addEventListener('beforeunload', () => this.autosave());
    window.addEventListener('resize', () => this.scheduleRender());
  }

  setScore(score, { silent = false } = {}) {
    this.score = score;
    this.history = new History(score);
    this.history.onChange(() => { this.player.invalidate(); this.refreshChrome(); });
    this.player.setScore(score);
    this.selection.clear();
    this.measureSel = null;
    this.cursor = { partIndex: 0, staff: 0, measure: 0, voice: 0, tick: 0 };
    this.viewPart = null;
    if (this.el && this.el.title) {
      this.el.title.value = score.title || '';
      this.el.composer.value = score.composer || '';
      this.el.tempoSlider.value = score.tempo;
      this.el.tempoInput.value = score.tempo;
    }
    if (!silent) { this.render(); this.buildParts(); this.buildMixer(); }
  }

  /* -------------------------------------------------------------- render */

  scheduleRender() {
    if (this.pendingRender) return;
    this.pendingRender = requestAnimationFrame(() => {
      this.pendingRender = null;
      this.render();
    });
  }

  /** Staff size in pixels: staff space in mm, scaled by zoom and screen DPI. */
  get spatiumPx() {
    const mmToPx = 96 / 25.4;
    return (this.score.spatium || 1.75) * mmToPx * ZOOM_STEPS[this.zoomIndex];
  }

  render() {
    if (!this.score) return;
    const t0 = performance.now();
    this.layout = layoutScore(this.score, {
      partFilter: this.viewPart,
      concertPitch: !!this.score.concertPitch,
      showTitle: this.viewPart === null,
      showMeasureNumbers: true,
      /* Parts are always printed with multi-bar rests; the score only when asked. */
      multiBarRests: !!this.score.multiBarRests || this.viewPart !== null,
    });
    const sp = this.spatiumPx;
    const html = this.layout.pages.map((p) => renderPageSVG(p, { spatium: sp })).join('');
    this.el.pages.innerHTML = html;
    this.indexMeasures();
    this.paintSelection();
    this.paintFlags();
    this.paintCursor();
    this.paintPlayhead();
    this.buildInspector();
    this.refreshChrome();
    this.el.statusRight.textContent =
      `${this.score.measures.length} bars · ${this.score.parts.length} instrument${this.score.parts.length > 1 ? 's' : ''}` +
      ` · ${this.layout.pages.length} page${this.layout.pages.length > 1 ? 's' : ''} · ${Math.round(performance.now() - t0)} ms`;
  }

  /** Screen rectangles for each measure, used by the cursor and hit-testing. */
  indexMeasures() {
    this.measureRects.clear();
    this.layout.pages.forEach((pg, pi) => {
      for (const sys of pg.systems) {
        for (const mm of sys.measures) {
          const last = mm.last === undefined ? mm.index : mm.last;
          for (let m = mm.index; m <= last; m++) {
            const list = this.measureRects.get(m) || [];
            list.push({
              page: pi, x: sys.x + mm.x, y: sys.top ?? sys.y, w: mm.width,
              h: sys.height, sys, mm, runFrom: mm.index, runTo: last,
            });
            this.measureRects.set(m, list);
          }
        }
      }
    });
  }

  pageSVG(index) {
    return this.el.pages.querySelector(`svg[data-page="${index}"]`);
  }

  /* ----------------------------------------------------------- selection */

  paintSelection() {
    this.el.pages.querySelectorAll('.sel').forEach((n) => n.classList.remove('sel'));
    this.el.pages.querySelectorAll('.loop-band').forEach((n) => n.remove());
    for (const id of this.selection) {
      this.el.pages.querySelectorAll(`[data-ev="${id}"]`).forEach((n) => n.classList.add('sel'));
    }
    if (this.measureSel) {
      for (let m = this.measureSel.from; m <= this.measureSel.to; m++) {
        for (const r of this.measureRects.get(m) || []) {
          const svg = this.pageSVG(r.page);
          const ov = svg && svg.querySelector('.overlay');
          if (!ov) continue;
          ov.insertAdjacentHTML('beforeend',
            `<rect class="loop-band" x="${r.x}" y="${r.y - 1}" width="${r.w}" height="${r.h + 2}"/>`);
        }
      }
    }
  }

  select(ids, { add = false } = {}) {
    if (!add) this.selection.clear();
    for (const id of Array.isArray(ids) ? ids : [ids]) if (id) this.selection.add(id);
    this.measureSel = null;
    this.paintSelection();
    this.buildInspector();
    this.setHint();
  }

  selectMeasures(partIndex, from, to) {
    this.selection.clear();
    const a = Math.min(from, to);
    const b = Math.max(from, to);
    this.measureSel = { partIndex, from: a, to: b };
    for (const id of Edit.eventsInRange(this.score, partIndex, a, b)) this.selection.add(id);
    this.render();
  }

  clearSelection() {
    this.selection.clear();
    this.measureSel = null;
    this.paintSelection();
    this.buildInspector();
  }

  get selectedIds() { return [...this.selection]; }

  firstSelected() {
    const id = this.selectedIds[0];
    return id ? Model.locateEvent(this.score, id) : null;
  }

  /* -------------------------------------------------------- entry cursor */

  paintCursor() {
    const svgs = this.el.pages.querySelectorAll('svg');
    svgs.forEach((s) => s.querySelectorAll('.entry-caret,.cursor-rect').forEach((n) => n.remove()));
    if (!this.noteEntry) return;
    const rect = this.cursorRect();
    if (!rect) return;
    const svg = this.pageSVG(rect.page);
    const ov = svg && svg.querySelector('.overlay');
    if (!ov) return;
    ov.insertAdjacentHTML('beforeend',
      `<rect class="entry-caret" x="${rect.x - 0.1}" y="${rect.y - 1.1}" width="0.22" height="${Metrics.staffHeight + 2.2}"/>` +
      `<rect class="cursor-rect" x="${rect.x - 0.9}" y="${rect.y - 1.1}" width="2.4" height="${Metrics.staffHeight + 2.2}"/>`);
  }

  /** Where the entry cursor sits on the page, in staff spaces. */
  cursorRect() {
    const rects = this.measureRects.get(this.cursor.measure);
    if (!rects || !rects.length) return null;
    const r = rects[0];
    const staffY = this.staffYFor(r, this.cursor.partIndex, this.cursor.staff);
    if (staffY === null) return null;
    const x = this.tickToX(r, this.cursor.tick);
    return { page: r.page, x, y: staffY };
  }

  staffYFor(rect, partIndex, staff) {
    const s = (rect.sys.staves || []).find((k) => k.partIndex === partIndex && k.staff === staff);
    if (s) return s.y;
    const any = (rect.sys.staves || []).find((k) => k.partIndex === partIndex);
    return any ? any.y : (rect.sys.staves && rect.sys.staves[0] ? rect.sys.staves[0].y : null);
  }

  tickToX(rect, tick) {
    const mm = rect.mm;
    const cols = mm.columns || [];
    if (cols.length) {
      let best = cols[0];
      for (const c of cols) if (c.tick <= tick) best = c;
      const next = cols.find((c) => c.tick > tick);
      if (next && next.tick > best.tick) {
        const f = (tick - best.tick) / (next.tick - best.tick);
        return rect.sys.x + best.x + (next.x - best.x) * f;
      }
      const area = mm.noteArea || { start: 0, end: mm.width };
      const total = measureTicks(Model.timeSigAt(this.score, mm.index));
      if (tick > best.tick && total > best.tick) {
        const f = (tick - best.tick) / (total - best.tick);
        return rect.sys.x + best.x + (area.end - best.x) * f;
      }
      return rect.sys.x + best.x;
    }
    const area = mm.noteArea || { start: mm.x, end: mm.x + mm.width };
    const total = measureTicks(Model.timeSigAt(this.score, mm.index));
    return rect.sys.x + area.start + ((area.end - area.start) * tick) / Math.max(1, total);
  }

  setCursor(next, { scroll = false } = {}) {
    this.cursor = { ...this.cursor, ...next };
    this.paintCursor();
    this.setHint();
    if (scroll) this.scrollCursorIntoView();
  }

  scrollCursorIntoView() {
    const r = this.cursorRect();
    if (!r) return;
    const svg = this.pageSVG(r.page);
    if (!svg) return;
    const sp = this.spatiumPx;
    const box = svg.getBoundingClientRect();
    const scr = this.el.scroll.getBoundingClientRect();
    const y = box.top + r.y * sp - scr.top + this.el.scroll.scrollTop;
    if (y < this.el.scroll.scrollTop + 40 || y > this.el.scroll.scrollTop + scr.height - 90) {
      this.el.scroll.scrollTo({ top: Math.max(0, y - scr.height / 2), behavior: 'smooth' });
    }
  }

  /* --------------------------------------------------------- hit testing */

  /** Convert a pointer event into score coordinates. */
  locate(e) {
    const svg = e.target.closest ? e.target.closest('svg.score-page') : null;
    if (!svg) return null;
    const page = +svg.dataset.page;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = pt.matrixTransform(ctm.inverse());
    const pg = this.layout.pages[page];
    if (!pg) return null;

    let sys = null;
    for (const s of pg.systems) {
      const top = (s.top ?? s.y) - 6;
      const bottom = (s.top ?? s.y) + s.height + 6;
      if (p.y >= top && p.y <= bottom) { sys = s; break; }
    }
    if (!sys) {
      /* Fall back to the nearest system so clicks in the gutter still work. */
      let best = null;
      let bestD = Infinity;
      for (const s of pg.systems) {
        const d = Math.abs(p.y - ((s.top ?? s.y) + s.height / 2));
        if (d < bestD) { bestD = d; best = s; }
      }
      sys = best;
    }
    if (!sys) return null;

    let staff = null;
    let bestD = Infinity;
    for (const k of sys.staves || []) {
      const centre = k.y + Metrics.staffHeight / 2;
      const d = Math.abs(p.y - centre);
      if (d < bestD) { bestD = d; staff = k; }
    }
    if (!staff) return null;

    let mm = sys.measures[0];
    for (const m of sys.measures) if (sys.x + m.x <= p.x + 0.5) mm = m;

    const rect = { page, x: sys.x + mm.x, y: staff.y, w: mm.width, sys, mm };
    const tick = this.xToTick(rect, p.x);
    const posStep = Math.round((8 - (p.y - staff.y) * 2));
    const clefId = Model.clefAt(this.score, this.score.parts[staff.partIndex], mm.index, staff.staff);
    const dia = Theory.diatonicAtPos(posStep, clefId);
    const base = Theory.fromDiatonic(dia);
    const fifths = Model.writtenFifths(this.score, this.score.parts[staff.partIndex], mm.index);
    const alter = Theory.keyAlterations(this.score.concertPitch ? Model.keySigAt(this.score, mm.index).fifths : fifths)[base.step];
    return {
      page, x: p.x, y: p.y, sys, measure: mm.index, mm,
      partIndex: staff.partIndex, staff: staff.staff, staffY: staff.y,
      tick, staffPos: posStep, pitch: Theory.pitch(base.step, base.octave, alter),
    };
  }

  xToTick(rect, x) {
    const mm = rect.mm;
    const total = measureTicks(Model.timeSigAt(this.score, mm.index));
    const cols = mm.columns || [];
    const rel = x - rect.sys.x;
    const area = mm.noteArea || { start: mm.x, end: mm.x + mm.width };
    let tick;
    if (cols.length > 1) {
      let prev = cols[0];
      let next = null;
      for (const c of cols) {
        if (c.x <= rel) prev = c; else { next = c; break; }
      }
      const endX = next ? next.x : area.end;
      const endT = next ? next.tick : total;
      const span = Math.max(0.01, endX - prev.x);
      tick = prev.tick + ((rel - prev.x) / span) * (endT - prev.tick);
    } else {
      const span = Math.max(0.01, area.end - area.start);
      tick = ((rel - area.start) / span) * total;
    }
    /* Snap to the grid implied by the current note value. */
    const grid = Math.max(60, durationTicks(this.duration, 0));
    const snapped = Math.round(tick / grid) * grid;
    return Math.max(0, Math.min(total - 1, snapped));
  }

  /* ------------------------------------------------------ score pointer */

  bindScoreEvents() {
    const scroll = this.el.scroll;
    scroll.addEventListener('pointerdown', (e) => this.onScorePointerDown(e));
    scroll.addEventListener('dblclick', (e) => this.onScoreDoubleClick(e));
    scroll.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        this.zoom(e.deltaY < 0 ? 1 : -1);
      }
    }, { passive: false });
    scroll.addEventListener('mousemove', (e) => this.onScoreHover(e));
  }

  onScoreHover(e) {
    const el = e.target.closest && e.target.closest('[data-ev]');
    this.el.pages.querySelectorAll('.hovered').forEach((n) => n.classList.remove('hovered'));
    if (el && !this.selection.has(el.dataset.ev)) {
      this.el.pages.querySelectorAll(`[data-ev="${el.dataset.ev}"]`).forEach((n) => n.classList.add('hovered'));
    }
  }

  onScorePointerDown(e) {
    if (e.button !== 0) return;
    this.el.scroll.focus({ preventScroll: true });
    const hit = e.target.closest && e.target.closest('[data-ev]');
    const loc = this.locate(e);

    if (this.noteEntry && loc) {
      /* In note-entry mode a click writes a note where you clicked. */
      this.setCursor({
        partIndex: loc.partIndex, staff: loc.staff, measure: loc.measure,
        tick: loc.tick, voice: this.voiceForStaff(loc.partIndex, loc.staff),
      });
      this.enterPitch(loc.pitch, { chord: e.shiftKey });
      return;
    }

    if (hit) {
      const id = hit.dataset.ev;
      if (e.shiftKey && this.anchorEvent) this.selectRangeTo(id);
      else this.select(id, { add: e.metaKey || e.ctrlKey });
      this.anchorEvent = id;
      const loc2 = Model.locateEvent(this.score, id);
      if (loc2) {
        this.setCursor({
          partIndex: loc2.partIndex, measure: loc2.measure, voice: loc2.voice,
          staff: this.staffForVoice(loc2.part, loc2.voice),
          tick: Model.tickAt(loc2.part.measures[loc2.measure].voices[loc2.voice], loc2.index),
        });
        if (loc2.event.type === 'note') this.previewEvent(loc2);
      }
      return;
    }

    if (loc) {
      const kind = e.target.dataset ? e.target.dataset.k : null;
      if (kind === 'timesig') { this.openTimeSignature(loc.measure); return; }
      if (kind === 'keysig') { this.openKeySignature(loc.measure); return; }
      if (kind === 'clef') { this.openClef(loc.measure, loc.partIndex, loc.staff); return; }
      if (kind === 'tempo') { this.openTempo(loc.measure); return; }
      if (e.shiftKey && this.measureSel && this.measureSel.partIndex === loc.partIndex) {
        this.selectMeasures(loc.partIndex, this.measureSel.from, loc.measure);
      } else {
        this.selectMeasures(loc.partIndex, loc.measure, loc.measure);
      }
      this.setCursor({
        partIndex: loc.partIndex, staff: loc.staff, measure: loc.measure,
        tick: loc.tick, voice: this.voiceForStaff(loc.partIndex, loc.staff),
      });
      return;
    }
    this.clearSelection();
  }

  onScoreDoubleClick(e) {
    const loc = this.locate(e);
    if (!loc) return;
    if (!this.noteEntry) {
      this.setNoteEntry(true);
      this.setCursor({
        partIndex: loc.partIndex, staff: loc.staff, measure: loc.measure,
        tick: loc.tick, voice: this.voiceForStaff(loc.partIndex, loc.staff),
      });
    }
  }

  selectRangeTo(id) {
    const a = Model.locateEvent(this.score, this.anchorEvent);
    const b = Model.locateEvent(this.score, id);
    if (!a || !b || a.partIndex !== b.partIndex) { this.select(id); return; }
    const ids = [];
    const lo = Math.min(a.measure, b.measure);
    const hi = Math.max(a.measure, b.measure);
    for (let m = lo; m <= hi; m++) {
      const voice = b.part.measures[m].voices[b.voice] || [];
      for (const ev of voice) {
        const before = m === lo && a.measure === lo && voice.indexOf(ev) < Math.min(a.index, b.index) && a.measure === b.measure;
        if (!before) ids.push(ev.id);
      }
    }
    this.select(ids);
  }

  voiceForStaff(partIndex, staff) {
    const part = this.score.parts[partIndex];
    if (!part || (part.staves || 1) < 2) return 0;
    return staff === 1 ? 1 : 0;
  }

  staffForVoice(part, voice) {
    if ((part.staves || 1) < 2) return 0;
    return voice % 2 === 0 ? 0 : 1;
  }

  previewEvent(loc) {
    if (loc.event.type !== 'note') return;
    const inst = getInstrument(loc.part.instrumentId);
    for (const n of loc.event.notes) {
      this.player.preview(Theory.toMidi(Model.soundingPitch(loc.part, n.pitch)), {
        preset: loc.part.synth || inst.synth, velocity: 80, duration: 0.45,
      });
    }
  }

  /* ==================================================================== */
  /*  Chrome: top bar, ribbon, transport, panels                          */
  /* ==================================================================== */

  buildTopBar() {
    const left = document.getElementById('file-actions');
    const right = document.getElementById('top-right');
    const mk = (act, icon, tip, key, label) => {
      const b = document.createElement('button');
      b.className = 'tb-btn';
      b.dataset.act = act;
      b.innerHTML = icon + (label ? `<span>${label}</span>` : '');
      b.dataset.tip = tip;
      if (key) b.dataset.key = key;
      b.onclick = () => this.act(act);
      return b;
    };
    left.append(
      mk('new', UI.new, 'New score', 'Ctrl Shift N', 'New'),
      mk('open', UI.open, 'Open a Cadenza file', 'Ctrl O', 'Open'),
      mk('save', UI.save, 'Save to a file', 'Ctrl S', 'Save'),
      mk('exportMenu', UI.export, 'Export MusicXML, MIDI, audio, SVG', '', 'Export'),
      mk('setup', UI.print, 'Score setup: title, page size, staff size', '', 'Setup'),
    );
    right.append(
      mk('undo', UI.undo, 'Undo', 'Ctrl Z'),
      mk('redo', UI.redo, 'Redo', 'Ctrl Shift Z'),
      mk('zoomOut', UI.zoomOut, 'Zoom out', 'Ctrl -'),
      mk('zoomIn', UI.zoomIn, 'Zoom in', 'Ctrl +'),
      mk('help', UI.help, 'Keyboard shortcuts', '?'),
    );
    this.undoBtn = right.querySelector('[data-act=undo]');
    this.redoBtn = right.querySelector('[data-act=redo]');
  }

  /**
   * The toolbar, and the palettes under it.
   *
   * The bar holds what is used constantly.  Everything else is one click away
   * behind a named heading, which is not the same as being hidden: a palette
   * says what it contains before you open it, and closes again when you are
   * done with it.
   */
  buildRibbon() {
    const bar = this.el.ribbon;
    bar.innerHTML = '';

    const button = (it) => {
      const b = document.createElement('button');
      b.className = 'rb' + (it.wide ? ' wide' : '') + (it.primary ? ' primary' : '');
      b.dataset.act = it.act;
      b.dataset.tip = it.tip;
      if (it.key) b.dataset.key = it.key;
      b.innerHTML = this.iconFor(it.icon) + (it.label ? `<span class="lbl">${it.label}</span>` : '');
      b.onclick = () => this.act(it.act);
      return b;
    };

    for (const grp of ESSENTIALS) {
      const g = document.createElement('section');
      g.className = 'grp';
      const row = document.createElement('div');
      row.className = 'grp-row';
      for (const it of grp.items) row.appendChild(button(it));
      g.appendChild(row);
      if (grp.label) {
        const label = document.createElement('div');
        label.className = 'grp-label';
        label.textContent = grp.label;
        g.appendChild(label);
      }
      bar.appendChild(g);
    }

    /* The palettes, named so nothing has to be hunted for. */
    const more = document.createElement('section');
    more.className = 'grp grp-more';
    const row = document.createElement('div');
    row.className = 'grp-row';
    for (const pal of PALETTES) {
      const b = document.createElement('button');
      b.className = 'rb pal-tab';
      b.dataset.pal = pal.id;
      b.dataset.tip = pal.tip;
      b.innerHTML = this.iconFor(pal.icon) + `<span class="lbl">${pal.label}</span>`;
      b.onclick = () => this.togglePalette(pal.id);
      row.appendChild(b);
    }
    more.appendChild(row);
    const label = document.createElement('div');
    label.className = 'grp-label';
    label.textContent = 'More';
    more.appendChild(label);
    bar.appendChild(more);

    /* Transcribe sits on its own at the end: it is a different kind of act
     * from everything to its left — it brings music in rather than editing
     * what is there. */
    const end = document.createElement('section');
    end.className = 'grp grp-end';
    const endRow = document.createElement('div');
    endRow.className = 'grp-row';
    const cb = document.createElement('button');
    cb.className = 'rb wide';
    cb.dataset.act = 'compose';
    cb.dataset.tip = 'Write a piece from a key and a character, then edit it';
    cb.innerHTML = UI.compose + '<span class="lbl">Compose</span>';
    cb.onclick = () => this.act('compose');
    endRow.appendChild(cb);

    const tb = document.createElement('button');
    tb.className = 'rb wide accent';
    tb.dataset.act = 'transcribe';
    tb.dataset.tip = 'Turn a recording, a MIDI file or your playing into notation';
    tb.innerHTML = UI.transcribe + '<span class="lbl">Transcribe</span>';
    tb.onclick = () => this.act('transcribe');
    endRow.appendChild(tb);
    end.appendChild(endRow);
    bar.appendChild(end);

    this.buildPalettes();
    this.refreshChrome();
  }

  buildPalettes() {
    const host = this.el.palette;
    if (!host) return;
    host.innerHTML = '';
    for (const pal of PALETTES) {
      const sheet = document.createElement('div');
      sheet.className = 'palette hidden';
      sheet.dataset.pal = pal.id;
      for (const grp of pal.groups) {
        const g = document.createElement('section');
        g.className = 'pal-grp';
        const head = document.createElement('div');
        head.className = 'pal-grp-label';
        head.textContent = grp.label;
        const row = document.createElement('div');
        row.className = 'pal-row';
        for (const it of grp.items) {
          const b = document.createElement('button');
          b.className = 'rb' + (it.wide ? ' wide' : '');
          b.dataset.act = it.act;
          b.dataset.tip = it.tip;
          if (it.key) b.dataset.key = it.key;
          b.innerHTML = this.iconFor(it.icon) + (it.label ? `<span class="lbl">${it.label}</span>` : '');
          b.onclick = () => this.act(it.act);
          row.appendChild(b);
        }
        g.append(head, row);
        sheet.appendChild(g);
      }
      host.appendChild(sheet);
    }
  }

  togglePalette(id) {
    const next = this.openPaletteId === id ? null : id;
    this.openPaletteId = next;
    for (const sheet of this.el.palette.querySelectorAll('.palette')) {
      sheet.classList.toggle('hidden', sheet.dataset.pal !== next);
    }
    for (const tab of this.el.ribbon.querySelectorAll('.pal-tab')) {
      tab.classList.toggle('on', tab.dataset.pal === next);
    }
    this.el.palettes.classList.toggle('open', !!next);
    Files.rememberSetting('palette', next || '');
    this.scheduleRender();
  }

  iconFor(spec) {
    const [kind, a, b] = String(spec).split(':');
    if (kind === 'note') return noteIcon(a, b ? +b : 0, { size: 24 });
    if (kind === 'glyph') return glyphIcon(a, { size: 21 });
    if (kind === 'dyn') return dynamicIcon(a, { size: 19 });
    return UI[a] || '';
  }

  buildTransport() {
    const left = document.getElementById('tp-buttons');
    const right = document.getElementById('tp-toggles');
    const mk = (act, icon, tip, key, cls = 'tp-btn') => {
      const b = document.createElement('button');
      b.className = cls;
      b.dataset.act = act;
      b.dataset.tip = tip;
      if (key) b.dataset.key = key;
      b.innerHTML = icon;
      b.onclick = () => this.act(act);
      return b;
    };
    left.append(
      mk('rewind', UI.rewind, 'Return to the beginning', 'Home'),
      mk('playPause', UI.play + '<span>Play</span>', 'Play the score from the cursor', 'Space', 'tp-btn primary labelled'),
      mk('stop', UI.stop + '<span>Stop</span>', 'Stop and return to where playback began', 'Esc', 'tp-btn labelled'),
    );
    this.playBtn = left.querySelector('[data-act=playPause]');
    right.append(
      mk('metronome', UI.metronome, 'Metronome click', 'M'),
      mk('countIn', UI.countin, 'Count-in bar before playback'),
      mk('loop', UI.loop, 'Loop the selected measures', 'L'),
      mk('togglePiano', UI.keyboard, 'Show or hide the piano keyboard'),
      mk('midi', UI.midi, 'Connect a MIDI keyboard'),
    );

    const sync = (v) => {
      const bpm = Math.max(20, Math.min(300, Math.round(v)));
      this.el.tempoSlider.value = bpm;
      this.el.tempoInput.value = bpm;
      Edit.setTempo(this, 0, bpm, this.score.measures[0].tempo?.unit || 'quarter',
        this.score.measures[0].tempo?.text ?? Model.tempoText(bpm));
      this.player.invalidate();
      this.scheduleRender();
    };
    this.el.tempoSlider.addEventListener('input', (e) => sync(+e.target.value));
    this.el.tempoInput.addEventListener('change', (e) => sync(+e.target.value));
  }

  buildPianoBar() {
    const c = this.el.pbControls;
    c.innerHTML = `
      <div class="pb-row"><label>Octave</label>
        <button class="mini" data-oct="-1">&minus;</button>
        <span id="pb-oct" style="font-size:11px;width:34px;text-align:center">C2–C6</span>
        <button class="mini" data-oct="1">+</button></div>
      <div class="pb-row"><label>Level</label>
        <input id="pb-vel" type="range" min="16" max="127" value="88"></div>
      <div class="pb-row">
        <button class="mini" id="pb-mode" style="width:auto;padding:0 8px">Preview</button>
        <span style="font-size:10px;color:var(--text-faint)">click keys to hear</span></div>`;
    this.piano = new PianoKeyboard(this.el.pianoKeys, {
      onNote: (midi, vel, chord) => this.onPianoNote(midi, vel, chord),
    });
    const label = c.querySelector('#pb-oct');
    const syncLabel = () => {
      label.textContent = `C${this.piano.lowOctave}–C${this.piano.lowOctave + this.piano.octaves}`;
    };
    c.querySelectorAll('[data-oct]').forEach((b) => {
      b.onclick = () => { this.piano.shiftOctave(+b.dataset.oct); syncLabel(); };
    });
    c.querySelector('#pb-vel').oninput = (e) => { this.piano.velocity = +e.target.value; };
    const mode = c.querySelector('#pb-mode');
    mode.onclick = () => {
      this.pianoInserts = !this.pianoInserts;
      mode.textContent = this.pianoInserts ? 'Insert' : 'Preview';
      mode.classList.toggle('on', this.pianoInserts);
      this.setHint();
    };
    syncLabel();
  }

  onPianoNote(midi, velocity, chord) {
    const part = this.score.parts[this.cursor.partIndex] || this.score.parts[0];
    const inst = getInstrument(part.instrumentId);
    this.player.preview(midi, { preset: part.synth || inst.synth, velocity, duration: 0.7 });
    if (this.pianoInserts || this.noteEntry) {
      const written = Model.writtenPitch(part, this.midiToPitch(midi, part));
      this.enterPitch(written, { chord, silent: true });
    }
  }

  /** Spell a MIDI number using the key in force, so entry reads correctly. */
  midiToPitch(midi, part) {
    const fifths = Model.keySigAt(this.score, this.cursor.measure).fifths;
    const pc = ((midi % 12) + 12) % 12;
    const SHARP_PC = { 0: [0, 0], 2: [1, 0], 4: [2, 0], 5: [3, 0], 7: [4, 0], 9: [5, 0], 11: [6, 0], 1: [0, 1], 3: [1, 1], 6: [3, 1], 8: [4, 1], 10: [5, 1] };
    const FLAT_PC = { 0: [0, 0], 2: [1, 0], 4: [2, 0], 5: [3, 0], 7: [4, 0], 9: [5, 0], 11: [6, 0], 1: [1, -1], 3: [2, -1], 6: [4, -1], 8: [5, -1], 10: [6, -1] };
    const [step, alter] = (fifths < 0 ? FLAT_PC : SHARP_PC)[pc];
    const natural = Theory.STEP_SEMITONES[step];
    let octave = Math.floor(midi / 12) - 1;
    if (natural + alter !== pc) octave += (natural + alter > pc) ? -1 : 1;
    return Theory.pitch(step, octave, alter);
  }

  bindPanelTabs() {
    document.querySelectorAll('.panel-tabs').forEach((tabs) => {
      tabs.querySelectorAll('.ptab').forEach((tab) => {
        tab.onclick = () => {
          tabs.querySelectorAll('.ptab').forEach((t) => t.classList.remove('active'));
          tab.classList.add('active');
          const panel = tabs.parentElement;
          panel.querySelectorAll('.panel-body').forEach((b) => b.classList.add('hidden'));
          const map = {
            parts: 'parts-panel', mixer: 'mixer-panel',
            inspector: 'inspector-panel', help: 'help-panel',
          };
          const target = document.getElementById(map[tab.dataset.tab]);
          if (target) target.classList.remove('hidden');
        };
      });
    });
    this.buildParts();
    this.buildMixer();
  }

  bindTitleFields() {
    this.el.title.addEventListener('change', () => {
      this.history.begin('Title');
      this.history.touchAll();
      this.score.title = this.el.title.value;
      this.history.commit();
      this.scheduleRender();
    });
    this.el.composer.addEventListener('change', () => {
      this.history.begin('Composer');
      this.history.touchAll();
      this.score.composer = this.el.composer.value;
      this.history.commit();
      this.scheduleRender();
    });
  }

  initTooltips() {
    const tip = this.el.tooltip;
    let timer = null;
    const show = (el) => {
      const text = el.dataset.tip;
      if (!text) return;
      const key = el.dataset.key;
      tip.innerHTML = `<span></span>${key ? `<span class="tk">${key}</span>` : ''}`;
      tip.firstChild.textContent = text;
      tip.hidden = false;
      const r = el.getBoundingClientRect();
      const t = tip.getBoundingClientRect();
      let x = r.left + r.width / 2 - t.width / 2;
      x = Math.max(6, Math.min(window.innerWidth - t.width - 6, x));
      let y = r.bottom + 7;
      if (y + t.height > window.innerHeight - 6) y = r.top - t.height - 7;
      tip.style.left = x + 'px';
      tip.style.top = y + 'px';
    };
    document.addEventListener('mouseover', (e) => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      clearTimeout(timer);
      if (!el) { tip.hidden = true; return; }
      timer = setTimeout(() => show(el), 320);
    });
    document.addEventListener('mouseout', () => { clearTimeout(timer); tip.hidden = true; });
    document.addEventListener('mousedown', () => { clearTimeout(timer); tip.hidden = true; });
  }

  /** Listen to raw MIDI as well as the note events, for recording. */
  onMidi(fn) { this.midiTaps.add(fn); }

  offMidi(fn) { this.midiTaps.delete(fn); }

  async initMidi() {
    this.midi = new MidiInput({
      onMessage: (data, stamp) => { for (const fn of this.midiTaps) fn(data, stamp); },
      onNoteOn: (midi, vel) => {
        this.midiHeld.add(midi);
        this.piano.light(midi, true);
        this.onPianoNote(midi, vel, this.midiHeld.size > 1);
      },
      onNoteOff: (midi) => {
        this.midiHeld.delete(midi);
        this.piano.light(midi, false);
      },
      onStatus: (s) => {
        this.midiStatus = s;
        const btn = document.querySelector('[data-act=midi]');
        if (btn) btn.classList.toggle('on', s.state === 'ready' && (s.devices || []).length > 0);
        if (s.state === 'ready') Dlg.toast(s.message, (s.devices || []).length ? 'ok' : '');
        else if (s.message) Dlg.toast(s.message, 'err');
      },
    });
  }

  /* ------------------------------------------------------------- panels */

  buildParts() {
    const p = this.el.parts;
    if (!p) return;
    p.innerHTML = '<div class="sec-title">Instruments</div>';
    this.score.parts.forEach((part, i) => {
      const row = document.createElement('div');
      row.className = 'part-row' + (this.cursor.partIndex === i ? ' sel' : '');
      const inst = getInstrument(part.instrumentId);
      row.innerHTML = `<span class="pname"></span><span class="pfam"></span>` +
        `<button class="mini" data-a="up" data-tip="Move up">&uarr;</button>` +
        `<button class="mini" data-a="del" data-tip="Remove instrument">&times;</button>`;
      row.querySelector('.pname').textContent = part.name;
      row.querySelector('.pfam').textContent = inst.family;
      row.onclick = (e) => {
        if (e.target.dataset.a) return;
        this.setCursor({ partIndex: i, staff: 0, voice: 0 });
        this.buildParts();
        if (this.viewPart !== null) { this.viewPart = i; this.render(); }
      };
      row.querySelector('[data-a=up]').onclick = (e) => {
        e.stopPropagation();
        Edit.movePart(this, i, Math.max(0, i - 1));
        this.render();
        this.buildParts();
        this.buildMixer();
      };
      row.querySelector('[data-a=del]').onclick = async (e) => {
        e.stopPropagation();
        if (this.score.parts.length <= 1) { Dlg.toast('A score needs at least one instrument', 'err'); return; }
        const ok = await Dlg.confirmDialog({
          title: 'Remove instrument',
          message: `Remove <b>${part.name}</b> and all of its music?`,
          okLabel: 'Remove', danger: true,
        });
        if (!ok) return;
        Edit.removePart(this, i);
        this.cursor.partIndex = Math.min(this.cursor.partIndex, this.score.parts.length - 1);
        this.render();
        this.buildParts();
        this.buildMixer();
      };
      p.appendChild(row);
    });
    const add = document.createElement('button');
    add.className = 'chip';
    add.style.cssText = 'width:100%;margin-top:8px;padding:7px';
    add.textContent = '+  Add instrument';
    add.onclick = () => this.act('addInstrument');
    p.appendChild(add);
  }

  buildMixer() {
    const m = this.el.mixer;
    if (!m) return;
    m.innerHTML = '<div class="sec-title">Mixer</div>';
    this.score.parts.forEach((part, i) => {
      const row = document.createElement('div');
      row.className = 'mix-row';
      row.innerHTML = `
        <div class="mix-head">
          <span class="pname"></span>
          <button class="mini mute" data-tip="Mute">M</button>
          <button class="mini solo" data-tip="Solo">S</button>
        </div>
        <div class="mix-ctl"><label>Vol</label><input type="range" class="vol" min="0" max="1" step="0.01"></div>
        <div class="mix-ctl"><label>Pan</label><input type="range" class="pan" min="-1" max="1" step="0.02"></div>`;
      row.querySelector('.pname').textContent = part.name;
      const mute = row.querySelector('.mute');
      const solo = row.querySelector('.solo');
      mute.classList.toggle('on', !!part.mute);
      solo.classList.toggle('on', !!part.solo);
      const vol = row.querySelector('.vol');
      const pan = row.querySelector('.pan');
      vol.value = part.volume;
      pan.value = part.pan || 0;
      mute.onclick = () => { part.mute = !part.mute; mute.classList.toggle('on', part.mute); this.player.applyMixer(); };
      solo.onclick = () => { part.solo = !part.solo; solo.classList.toggle('on', part.solo); this.player.applyMixer(); };
      vol.oninput = () => { part.volume = +vol.value; this.player.applyMixer(); };
      pan.oninput = () => { part.pan = +pan.value; this.player.applyMixer(); };
      m.appendChild(row);
    });
    const master = document.createElement('div');
    master.className = 'mix-row';
    master.style.borderTop = '1px solid var(--line)';
    master.innerHTML = `<div class="mix-head"><span class="pname" style="font-weight:600">Master</span></div>
      <div class="mix-ctl"><label>Vol</label><input type="range" class="mv" min="0" max="1" step="0.01" value="0.9"></div>
      <div class="mix-ctl"><label>Verb</label><input type="range" class="mr" min="0" max="0.7" step="0.01" value="0.22"></div>`;
    master.querySelector('.mv').oninput = (e) => { this.synth.init(); this.synth.setMasterVolume(+e.target.value); };
    master.querySelector('.mr').oninput = (e) => { this.synth.init(); this.synth.setReverb(+e.target.value); };
    m.appendChild(master);
  }

  buildHelpPanel() {
    const h = this.el.help;
    h.innerHTML = '';
    const tour = document.createElement('button');
    tour.className = 'btn ghost';
    tour.style.cssText = 'width:100%;margin-bottom:12px';
    tour.textContent = 'Show me around again';
    tour.onclick = () => this.showCoachMarks();
    h.appendChild(tour);
    for (const [section, rows] of SHORTCUT_HELP) {
      const t = document.createElement('div');
      t.className = 'sec-title';
      t.textContent = section;
      const table = document.createElement('table');
      table.className = 'key-table';
      table.innerHTML = rows.map(([k, d]) =>
        `<tr><td><kbd>${k}</kbd></td><td style="color:var(--text-dim)">${d}</td></tr>`).join('');
      h.append(t, table);
    }
  }

  buildInspector() {
    const p = this.el.inspector;
    if (!p) return;
    const loc = this.firstSelected();
    const n = this.selection.size;
    if (!n) {
      const part = this.score.parts[this.cursor.partIndex];
      p.innerHTML = `<div class="empty-note">
        <b style="color:var(--text-dim)">Nothing selected.</b><br><br>
        Click a note to edit it, or click an empty part of a staff to select a measure.<br><br>
        Press <kbd>N</kbd> for note input, then type <kbd>A</kbd>–<kbd>G</kbd> or click the staff to write notes.
      </div>`;
      const info = document.createElement('div');
      info.className = 'insp-field';
      info.innerHTML = `<label>Cursor</label><div class="insp-value">${
        part ? part.name : '—'} · bar ${this.cursor.measure + 1} · voice ${this.cursor.voice + 1}</div>`;
      p.appendChild(info);
      return;
    }
    p.innerHTML = '';
    const field = (label, html) => {
      const d = document.createElement('div');
      d.className = 'insp-field';
      d.innerHTML = `<label>${label}</label>${html}`;
      p.appendChild(d);
      return d;
    };

    if (n > 1) {
      field('Selection', `<div class="insp-value">${n} events selected</div>`);
    }
    if (loc) {
      const ev = loc.event;
      const desc = ev.type === 'note'
        ? ev.notes.map((x) => Theory.pitchName(x.pitch, { unicode: true })).join(' + ')
        : 'Rest';
      field('Selected', `<div class="insp-value">${desc}</div>`);
      field('Position', `<div class="insp-value">${loc.part.name} · bar ${loc.measure + 1} · voice ${loc.voice + 1}</div>`);

      const durRow = field('Note value', '<div class="insp-row" id="i-dur"></div>');
      const durEl = durRow.querySelector('#i-dur');
      for (const d of DURATIONS.filter((x) => x.id !== 'breve' && x.id !== '128th')) {
        const b = document.createElement('button');
        b.className = 'chip' + (ev.duration === d.id ? ' on' : '');
        b.innerHTML = noteIcon(d.id, 0, { size: 17 });
        b.dataset.tip = d.label;
        b.onclick = () => this.act('dur:' + d.id);
        durEl.appendChild(b);
      }
      for (let dots = 1; dots <= 2; dots++) {
        const b = document.createElement('button');
        b.className = 'chip' + (ev.dots === dots ? ' on' : '');
        b.textContent = dots === 1 ? '.' : '..';
        b.onclick = () => this.act('dot:' + dots);
        durEl.appendChild(b);
      }

      const artRow = field('Articulation', '<div class="insp-row" id="i-art"></div>');
      const artEl = artRow.querySelector('#i-art');
      for (const a of ARTICULATIONS) {
        const b = document.createElement('button');
        b.className = 'chip' + ((ev.articulations || []).includes(a.id) ? ' on' : '');
        b.innerHTML = glyphIcon(a.glyph, { size: 15 });
        b.dataset.tip = a.label;
        b.onclick = () => this.act('art:' + a.id);
        artEl.appendChild(b);
      }

      const dynRow = field('Dynamic', '<div class="insp-row" id="i-dyn"></div>');
      const dynEl = dynRow.querySelector('#i-dyn');
      for (const d of DYNAMIC_MARKS.slice(0, 10)) {
        const b = document.createElement('button');
        b.className = 'chip' + (ev.dynamic === d.id ? ' on' : '');
        b.innerHTML = dynamicIcon(d.id, { size: 14 });
        b.onclick = () => this.act('dyn:' + d.id);
        dynEl.appendChild(b);
      }

      const stemRow = field('Stem', '<div class="insp-row" id="i-stem"></div>');
      const stemEl = stemRow.querySelector('#i-stem');
      for (const [id, label] of [['auto', 'Auto'], ['up', 'Up'], ['down', 'Down']]) {
        const b = document.createElement('button');
        b.className = 'chip' + ((ev.stemDir || 'auto') === id ? ' on' : '');
        b.textContent = label;
        b.onclick = () => { Edit.setStemDirection(this, this.selectedIds, id); this.render(); };
        stemEl.appendChild(b);
      }
      if (ev.type === 'note') {
        const t = field('Lyrics', '<input type="text" id="i-lyric" placeholder="syllable">');
        const input = t.querySelector('#i-lyric');
        input.value = (ev.lyrics && ev.lyrics[0] && ev.lyrics[0].text) || '';
        input.onchange = () => { Edit.setLyric(this, ev.id, 0, input.value.trim()); this.render(); };
        const c = field('Chord symbol', '<input type="text" id="i-chord" placeholder="Cmaj7">');
        const cin = c.querySelector('#i-chord');
        cin.value = ev.chordSymbol || '';
        cin.onchange = () => { Edit.setChordSymbol(this, ev.id, cin.value.trim()); this.render(); };
        const fb = field('Figured bass', '<input type="text" id="i-fig" placeholder="6 4">');
        const fin = fb.querySelector('#i-fig');
        fin.value = (ev.figures || []).join(' ');
        fin.onchange = () => { Edit.setFigures(this, ev.id, Edit.parseFigures(fin.value)); this.render(); };
        if ((loc.part.staves || 1) > 1) {
          const cs = field('Staff', '<div class="insp-row" id="i-cross"></div>');
          const row = cs.querySelector('#i-cross');
          const home = loc.voice % 2 === 0 ? 0 : 1;
          for (let st = 0; st < loc.part.staves; st++) {
            const b = document.createElement('button');
            const cur = ev.staff === null || ev.staff === undefined ? home : ev.staff;
            b.className = 'chip' + (cur === st ? ' on' : '');
            b.textContent = st === 0 ? 'Upper' : 'Lower';
            b.onclick = () => { Edit.setEventStaff(this, this.selectedIds, st); this.render(); };
            row.appendChild(b);
          }
        }
      }
    }
    if (this.measureSel) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.style.cssText = 'width:100%;margin-top:6px';
      b.textContent = `Measures ${this.measureSel.from + 1}–${this.measureSel.to + 1}`;
      b.disabled = true;
      p.appendChild(b);
    }
  }

  refreshChrome() {
    if (this.undoBtn) {
      this.undoBtn.disabled = !this.history.canUndo;
      this.redoBtn.disabled = !this.history.canRedo;
      this.undoBtn.dataset.tip = this.history.canUndo ? 'Undo ' + this.history.undoLabel : 'Undo';
      this.redoBtn.dataset.tip = this.history.canRedo ? 'Redo ' + this.history.redoLabel : 'Redo';
    }
    const set = (act, on) => {
      const b = document.querySelector(`[data-act="${act}"]`);
      if (b) b.classList.toggle('on', !!on);
    };
    set('noteEntry', this.noteEntry);
    set('dur:' + this.duration, true);
    for (const d of DURATIONS) if (d.id !== this.duration) set('dur:' + d.id, false);
    set('dot:1', this.dots === 1);
    set('dot:2', this.dots === 2);
    set('concertPitch', this.score.concertPitch);
    set('multiBarRests', !!this.score.multiBarRests || this.viewPart !== null);
    set('partView', this.viewPart !== null);
    set('metronome', this.player.metronome);
    set('countIn', this.player.countIn);
    set('loop', !!this.player.loop);
    const pv = document.querySelector('[data-act=partView] .lbl');
    if (pv) pv.textContent = this.viewPart === null ? 'Score' : (this.score.parts[this.viewPart]?.abbrev || 'Part');
  }

  setHint(custom) {
    if (custom) { this.el.hint.innerHTML = custom; return; }
    if (this.noteEntry) {
      const part = this.score.parts[this.cursor.partIndex];
      this.el.hint.innerHTML =
        `<b>Note input</b> — type <kbd>A</kbd>–<kbd>G</kbd>, click the staff, or play your MIDI keyboard. ` +
        `<b>Hold <kbd>Shift</kbd> to stack another note on the one you just wrote</b> — that is how ` +
        `a chord is built, and playing one on a MIDI keyboard does it by itself. ` +
        `<kbd>1</kbd>–<kbd>7</kbd> note value · <kbd>0</kbd> rest · <kbd>Esc</kbd> to stop. ` +
        `Writing into <b>${part ? part.name : ''}</b>, bar ${this.cursor.measure + 1}, voice ${this.cursor.voice + 1}.`;
      return;
    }
    if (this.selection.size) {
      this.el.hint.innerHTML =
        `<b>${this.selection.size} selected</b> — change the note value with <kbd>1</kbd>–<kbd>7</kbd>, ` +
        `move pitch with <kbd>&uarr;</kbd><kbd>&darr;</kbd>, <kbd>Shift</kbd>+<kbd>A</kbd>–<kbd>G</kbd> ` +
        `to add a note to the chord, marks from the palette above, <kbd>Delete</kbd> to clear.`;
      return;
    }
    this.el.hint.innerHTML =
      `Press <kbd>N</kbd> to start writing notes · click a note to select it · <kbd>Space</kbd> to play · <kbd>?</kbd> for all shortcuts`;
  }

  /* ==================================================================== */
  /*  Commands                                                             */
  /* ==================================================================== */

  act(name) {
    const [cmd, arg] = String(name).split(':');
    const ids = this.selectedIds;
    const needs = () => {
      if (ids.length) return true;
      Dlg.toast('Select a note first', 'err');
      return false;
    };

    switch (cmd) {
      /* --- note values ------------------------------------------------- */
      case 'dur': {
        this.duration = arg;
        if (ids.length) { Edit.setDuration(this, ids, arg, this.dots); this.render(); }
        this.refreshChrome();
        this.setHint();
        return;
      }
      case 'dot': {
        const d = +arg;
        this.dots = this.dots === d ? 0 : d;
        if (ids.length) { Edit.setDuration(this, ids, this.duration, this.dots); this.render(); }
        this.refreshChrome();
        return;
      }
      case 'transcribe': this.openTranscribe(); return;
      case 'compose': this.openCompose(); return;
      case 'rest': {
        if (this.noteEntry) {
          this.setCursor(Edit.enterRest(this, this.cursor, { duration: this.duration, dots: this.dots }), { scroll: true });
          this.render();
        } else if (ids.length) {
          Edit.deleteTargets(this, ids, { toRest: true });
          this.render();
        } else {
          this.setNoteEntry(true);
        }
        return;
      }

      /* --- pitch ------------------------------------------------------- */
      case 'acc': {
        if (!needs()) return;
        Edit.setAccidental(this, ids, +arg);
        this.render();
        return;
      }
      case 'alter': {
        if (!needs()) return;
        Edit.alterTargets(this, ids, +arg);
        this.render();
        return;
      }
      case 'respell': {
        if (!needs()) return;
        Edit.respell(this, ids);
        this.render();
        return;
      }
      case 'octave': {
        if (ids.length) {
          Edit.transposeTargets(this, ids, { octaves: arg === 'up' ? 1 : -1 });
          this.render();
        } else if (this.measureSel) {
          this.addSpannerOverSelection(arg === 'up' ? 'octave-up' : 'octave-down');
        } else {
          Dlg.toast('Select notes to move by an octave', 'err');
        }
        return;
      }

      /* --- marks ------------------------------------------------------- */
      case 'art': { if (!needs()) return; Edit.toggleArticulation(this, ids, arg); this.render(); return; }
      case 'orn': { if (!needs()) return; Edit.toggleOrnament(this, ids, arg); this.render(); return; }
      case 'dyn': { if (!needs()) return; Edit.setDynamic(this, ids, arg); this.render(); return; }
      case 'tremolo': { if (!needs()) return; Edit.setTremolo(this, ids, +arg); this.render(); return; }
      case 'arpeggio': { if (!needs()) return; Edit.toggleArpeggio(this, ids); this.render(); return; }
      case 'tie': { if (!needs()) return; Edit.toggleTie(this, ids); this.render(); return; }
      case 'grace': { if (!needs()) return; Edit.toggleGrace(this, ids); this.render(); return; }
      case 'slur': { this.addSpannerOverSelection('slur'); return; }
      case 'hairpin': { this.addSpannerOverSelection(arg === 'dim' ? 'dim' : 'cresc'); return; }
      case 'pedal': { this.addSpannerOverSelection('pedal'); return; }
      case 'tuplet': {
        if (!needs()) return;
        const actual = +arg || 3;
        const normal = actual === 3 ? 2 : actual === 5 ? 4 : actual === 6 ? 4 : actual === 7 ? 4 : 8;
        Edit.makeTuplet(this, ids, actual, normal);
        this.render();
        return;
      }
      case 'crossStaff': {
        if (!needs()) return;
        const ok = Edit.moveAcrossStaff(this, ids, arg === 'up' ? -1 : 1);
        if (!ok) { Dlg.toast('Cross-staff needs an instrument with two staves', 'err'); return; }
        this.render();
        return;
      }
      case 'figuredBass': { this.editFigures(); return; }
      case 'voice': {
        const part = this.score.parts[this.cursor.partIndex];
        const next = (this.cursor.voice + 1) % 4;
        Edit.addVoice(this, this.cursor.partIndex, this.cursor.measure);
        this.setCursor({ voice: next, staff: this.staffForVoice(part, next) });
        this.render();
        Dlg.toast(`Voice ${next + 1}`);
        return;
      }

      /* --- text -------------------------------------------------------- */
      case 'text': { this.addTextTo(arg); return; }
      case 'lyric': { this.editLyric(); return; }
      case 'chordSymbol': { this.editChordSymbol(); return; }
      case 'roman': { this.editRoman(); return; }
      case 'fingering': { this.editFingering(); return; }
      case 'rehearsal': { this.editRehearsal(); return; }
      case 'tempoMark': { this.openTempo(this.cursor.measure); return; }

      /* --- structure --------------------------------------------------- */
      case 'insertMeasure': {
        const at = this.measureSel ? this.measureSel.from : this.cursor.measure;
        Edit.insertMeasures(this, at, 1);
        this.render();
        return;
      }
      case 'appendMeasure': { Edit.appendMeasure(this); this.render(); return; }
      case 'deleteMeasure': {
        const from = this.measureSel ? this.measureSel.from : this.cursor.measure;
        const to = this.measureSel ? this.measureSel.to : this.cursor.measure;
        if (!Edit.removeMeasures(this, from, to - from + 1)) {
          Dlg.toast('A score needs at least one measure', 'err');
          return;
        }
        this.measureSel = null;
        this.setCursor({ measure: Math.min(from, this.score.measures.length - 1), tick: 0 });
        this.render();
        return;
      }
      case 'timeSig': { this.openTimeSignature(this.cursor.measure); return; }
      case 'keySig': { this.openKeySignature(this.cursor.measure); return; }
      case 'clef': { this.openClef(this.cursor.measure, this.cursor.partIndex, this.cursor.staff); return; }
      case 'barline': { this.openBarline(); return; }
      case 'systemBreak': {
        Edit.toggleSystemBreak(this, this.cursor.measure);
        this.render();
        return;
      }

      /* --- clipboard and history --------------------------------------- */
      case 'undo': {
        const label = this.history.undo();
        if (label) { this.selection.clear(); this.render(); Dlg.toast('Undo ' + label); }
        return;
      }
      case 'redo': {
        const label = this.history.redo();
        if (label) { this.selection.clear(); this.render(); Dlg.toast('Redo ' + label); }
        return;
      }
      case 'copy': {
        if (this.measureSel) {
          this.clipboard = Edit.copyRange(this.score, this.measureSel.partIndex, this.measureSel.from, this.measureSel.to);
          Dlg.toast(`Copied ${this.measureSel.to - this.measureSel.from + 1} measure(s)`);
        } else if (ids.length) {
          this.clipboard = Edit.copyEvents(this.score, ids);
          Dlg.toast(`Copied ${ids.length} event(s)`);
        }
        return;
      }
      case 'cut': { this.act('copy'); if (ids.length) { Edit.deleteTargets(this, ids); this.render(); } return; }
      case 'paste': {
        if (!this.clipboard) { Dlg.toast('Nothing to paste', 'err'); return; }
        this.setCursor(Edit.pasteClip(this, this.clipboard, this.cursor));
        this.render();
        return;
      }
      case 'delete': {
        if (ids.length) { Edit.deleteTargets(this, ids); this.selection.clear(); this.render(); }
        return;
      }
      case 'selectAll': {
        this.selectMeasures(this.cursor.partIndex, 0, this.score.measures.length - 1);
        return;
      }

      /* --- transport --------------------------------------------------- */
      case 'playPause': { this.playPause(); return; }
      case 'playFromSelection': { this.playPause({ fromSelection: true }); return; }
      case 'stop': { this.player.stop(); return; }
      case 'rewind': { this.player.stop(); this.gotoMeasure(0); return; }
      case 'metronome': {
        this.player.metronome = !this.player.metronome;
        this.player.invalidate();
        if (this.player.state === 'playing') { const m = this.player.measureAt(this.player.cursor); this.player.stop(); if (m) this.playFrom(m.measure); }
        this.refreshChrome();
        Dlg.toast(this.player.metronome ? 'Metronome on' : 'Metronome off');
        return;
      }
      case 'countIn': {
        this.player.countIn = !this.player.countIn;
        this.refreshChrome();
        Dlg.toast(this.player.countIn ? 'Count-in on' : 'Count-in off');
        return;
      }
      case 'loop': {
        if (this.player.loop) {
          this.player.loop = null;
          Dlg.toast('Loop off');
        } else if (this.measureSel) {
          this.player.loop = { fromMeasure: this.measureSel.from, toMeasure: this.measureSel.to };
          Dlg.toast(`Looping bars ${this.measureSel.from + 1}–${this.measureSel.to + 1}`);
        } else {
          Dlg.toast('Select measures to loop first', 'err');
          return;
        }
        this.refreshChrome();
        return;
      }
      case 'togglePiano': {
        this.el.pianoBar.classList.toggle('collapsed');
        this.refreshChrome();
        return;
      }
      case 'midi': { this.toggleMidi(); return; }

      /* --- view -------------------------------------------------------- */
      case 'noteEntry': { this.setNoteEntry(!this.noteEntry); return; }
      case 'concertPitch': {
        this.score.concertPitch = !this.score.concertPitch;
        this.render();
        Dlg.toast(this.score.concertPitch ? 'Concert pitch' : 'Written (transposed) pitch');
        return;
      }
      case 'partView': { this.togglePartView(); return; }
      case 'multiBarRests': {
        this.score.multiBarRests = !this.score.multiBarRests;
        this.render();
        Dlg.toast(this.score.multiBarRests
          ? 'Multi-bar rests on' + (this.viewPart === null ? '' : ' (always on in parts)')
          : 'Multi-bar rests off' + (this.viewPart === null ? '' : ' \u2014 parts still use them'));
        return;
      }
      case 'addInstrument': {
        Dlg.instrumentDialog((id) => {
          const at = Edit.addPart(this, id);
          this.cursor.partIndex = at;
          this.render();
          this.buildParts();
          this.buildMixer();
          Dlg.toast(`${getInstrument(id).name} added`);
        });
        return;
      }
      case 'zoomIn': { this.zoom(1); return; }
      case 'zoomOut': { this.zoom(-1); return; }

      /* --- files ------------------------------------------------------- */
      case 'new': { this.newScore(); return; }
      case 'open': { this.openFile(); return; }
      case 'save': { Files.saveScoreFile(this.score); this.lastSaved = Date.now(); Dlg.toast('Saved'); return; }
      case 'exportMenu': { this.openExport(); return; }
      case 'print': { window.print(); return; }
      case 'setup': {
        Dlg.scoreSetupDialog(this.score, (props) => {
          this.history.begin('Score setup');
          this.history.touchAll();
          if (props.spatium !== undefined && props.spatium !== this.score.spatium) {
            this.score.autoSize = false;
          }
          Object.assign(this.score, props);
          this.history.commit();
          this.el.title.value = this.score.title;
          this.el.composer.value = this.score.composer;
          this.render();
        });
        return;
      }
      case 'help': { this.showShortcuts(); return; }
      default:
        return;
    }
  }

  /* --------------------------------------------------------- note entry */

  setNoteEntry(on) {
    this.noteEntry = on;
    if (on) {
      this.synth.init();
      const loc = this.firstSelected();
      if (loc) {
        this.cursor = {
          partIndex: loc.partIndex, measure: loc.measure, voice: loc.voice,
          staff: this.staffForVoice(loc.part, loc.voice),
          tick: Model.tickAt(loc.part.measures[loc.measure].voices[loc.voice], loc.index),
        };
      }
      this.clearSelection();
    }
    this.paintCursor();
    this.refreshChrome();
    this.setHint();
  }

  /** Enter a pitch from a letter key, keeping close to the previous note. */
  enterLetter(letter, { chord = false } = {}) {
    const step = Theory.STEP_NAMES.indexOf(letter.toUpperCase());
    if (step < 0) return;
    /* Outside note input, a letter retunes the selected note to the nearest
     * pitch of that name — the behaviour notation software shares. */
    if (!this.noteEntry && this.selection.size) {
      this.retuneSelection(step, { chord });
      return;
    }
    if (!this.noteEntry) this.setNoteEntry(true);
    const part = this.score.parts[this.cursor.partIndex];
    const clef = Model.clefAt(this.score, part, this.cursor.measure, this.cursor.staff);
    /* Pick the octave nearest the last note written, as notation software does. */
    let octave = this.lastOctave ?? Theory.fromDiatonic(Theory.diatonicAtPos(4, clef)).octave;
    const refDia = this.lastDia ?? Theory.diatonicAtPos(4, clef);
    let best = null;
    for (let o = octave - 2; o <= octave + 2; o++) {
      const dia = o * 7 + step;
      if (best === null || Math.abs(dia - refDia) < Math.abs(best - refDia)) best = dia;
    }
    const p = Theory.fromDiatonic(best);
    const fifths = Model.writtenFifths(this.score, part, this.cursor.measure);
    /* An accidental earlier in the bar still applies, so typing F after an
     * F-sharp gives another F-sharp — the note a reader would play. */
    const inForce = Model.alterInForce(
      part, this.cursor.measure, this.cursor.staff, this.cursor.tick, p.step, p.octave,
    );
    const alter = inForce === null ? Theory.keyAlterations(fifths)[step] : inForce;
    this.enterPitch(Theory.pitch(p.step, p.octave, alter), { chord });
  }

  enterPitch(p, { chord = false, silent = false } = {}) {
    if (!this.noteEntry) this.setNoteEntry(true);
    const part = this.score.parts[this.cursor.partIndex];
    if (!part) return;
    const before = this.cursor;
    const next = Edit.enterNote(this, this.cursor, p, {
      chord, duration: this.duration, dots: this.dots,
    });
    this.lastDia = Theory.diatonic(p);
    this.lastOctave = p.octave;
    this.setCursor(next, { scroll: true });
    this.scheduleRender();
    if (!silent) {
      const inst = getInstrument(part.instrumentId);
      this.player.preview(Theory.toMidi(Model.soundingPitch(part, p)), {
        preset: part.synth || inst.synth, velocity: 84, duration: 0.5,
      });
    }
    /* Keep the new note selected so marks can be applied straight away. */
    const voice = Model.getVoice(this.score, before.partIndex, before.measure, before.voice);
    const idx = Model.indexAtTick(voice, before.tick);
    if (idx >= 0) { this.selection.clear(); this.selection.add(voice[idx].id); this.paintSelection(); }
  }

  /** Move every selected note to the nearest pitch with the given letter. */
  retuneSelection(step, { chord = false } = {}) {
    const ids = this.selectedIds;
    this.history.begin(chord ? 'Add note to chord' : 'Change pitch');
    for (const id of ids) {
      const loc = Model.locateEvent(this.score, id);
      if (!loc || loc.event.type !== 'note') continue;
      this.history.touch(loc.partIndex, loc.measure);
      const fifths = Model.writtenFifths(this.score, loc.part, loc.measure);
      const alter = Theory.keyAlterations(fifths)[step];
      /* Retuning a note goes to the nearest pitch of that name, up or down.
       * Adding one to a chord goes *above* the chord: a player naming the
       * notes of a chord names them upwards, and a G asked for over a C is
       * the fifth above it rather than the fourth below. */
      const tops = loc.event.notes.map((n) => Theory.diatonic(n.pitch));
      const ref = chord ? Math.max(...tops) : Theory.diatonic(loc.event.notes[0].pitch);
      let best = null;
      for (let o = -1; o <= 9; o++) {
        const dia = o * 7 + step;
        if (chord && dia <= ref) continue;
        if (best === null || Math.abs(dia - ref) < Math.abs(best - ref)) best = dia;
      }
      if (best === null) continue;
      const base = Theory.fromDiatonic(best);
      const p = Theory.pitch(base.step, base.octave, alter);
      if (chord) {
        if (!loc.event.notes.some((n) => Theory.toMidi(n.pitch) === Theory.toMidi(p))) {
          loc.event.notes.push({ pitch: p, tie: null, accidental: 'auto', head: 'normal', parenthesized: false });
          loc.event.notes.sort((x, y) => Theory.toMidi(x.pitch) - Theory.toMidi(y.pitch));
        }
      } else {
        loc.event.notes = [{ pitch: p, tie: null, accidental: 'auto', head: 'normal', parenthesized: false }];
      }
    }
    this.history.commit();
    this.render();
    const loc = this.firstSelected();
    if (loc) this.previewEvent(loc);
  }

  stepPitch(dir) {
    const ids = this.selectedIds;
    if (ids.length) {
      Edit.transposeTargets(this, ids, { steps: dir });
      this.render();
      const loc = this.firstSelected();
      if (loc) this.previewEvent(loc);
      return;
    }
    /* With nothing selected, move the entry cursor's staff position. */
    this.moveStaff(dir > 0 ? -1 : 1);
  }

  navigate(dir, { extend = false } = {}) {
    const loc = this.firstSelected();
    if (this.noteEntry && !loc) {
      const grid = durationTicks(this.duration, this.dots);
      this.setCursor(dir > 0
        ? Edit.advanceCursor(this, this.cursor, grid)
        : Edit.retreatCursor(this, this.cursor, grid), { scroll: true });
      return;
    }
    if (!loc) {
      const voice = Model.getVoice(this.score, this.cursor.partIndex, this.cursor.measure, this.cursor.voice);
      if (voice && voice.length) this.select(voice[0].id);
      return;
    }
    const voice = loc.part.measures[loc.measure].voices[loc.voice];
    let idx = loc.index + dir;
    let measure = loc.measure;
    if (idx < 0) {
      if (measure === 0) return;
      measure--;
      const prev = loc.part.measures[measure].voices[loc.voice] || [];
      idx = prev.length - 1;
    } else if (idx >= voice.length) {
      if (measure + 1 >= loc.part.measures.length) return;
      measure++;
      idx = 0;
    }
    const target = loc.part.measures[measure].voices[loc.voice][idx];
    if (!target) return;
    if (extend) this.select(target.id, { add: true });
    else {
      this.select(target.id);
      this.anchorEvent = target.id;
    }
    this.setCursor({
      measure,
      tick: Model.tickAt(loc.part.measures[measure].voices[loc.voice], idx),
    }, { scroll: true });
  }

  navigateMeasure(dir) {
    const m = Math.max(0, Math.min(this.score.measures.length - 1, this.cursor.measure + dir));
    this.gotoMeasure(m);
  }

  gotoMeasure(m) {
    this.setCursor({ measure: m, tick: 0 }, { scroll: true });
    this.selectMeasures(this.cursor.partIndex, m, m);
  }

  moveStaff(dir) {
    const staves = [];
    this.score.parts.forEach((part, pi) => {
      for (let s = 0; s < (part.staves || 1); s++) staves.push({ pi, s });
    });
    const cur = staves.findIndex((x) => x.pi === this.cursor.partIndex && x.s === this.cursor.staff);
    const next = staves[Math.max(0, Math.min(staves.length - 1, cur + dir))];
    if (!next) return;
    this.setCursor({
      partIndex: next.pi, staff: next.s, voice: this.voiceForStaff(next.pi, next.s),
    }, { scroll: true });
    this.buildParts();
    this.setHint();
  }

  addSpannerOverSelection(type) {
    const ids = this.selectedIds;
    if (ids.length < 2) { Dlg.toast('Select at least two notes', 'err'); return; }
    const locs = ids.map((id) => Model.locateEvent(this.score, id)).filter(Boolean);
    locs.sort((a, b) => (a.measure - b.measure) || (a.index - b.index));
    Edit.addSpanner(this, type, locs[0].event.id, locs[locs.length - 1].event.id, {
      label: { slur: 'Slur', cresc: 'Crescendo', dim: 'Diminuendo', pedal: 'Pedal', 'octave-up': '8va', 'octave-down': '8vb' }[type],
    });
    this.render();
  }

  /* -------------------------------------------------------------- text */

  async addTextTo(style) {
    const ids = this.selectedIds;
    if (!ids.length) { Dlg.toast('Select a note first', 'err'); return; }
    const value = await Dlg.promptDialog({
      title: style === 'technique' ? 'Technique text' : 'Expression text',
      label: style === 'technique' ? 'e.g. pizz., con sordino, arco' : 'e.g. dolce, espressivo, rit.',
      placeholder: style === 'technique' ? 'pizz.' : 'dolce',
    });
    if (!value) return;
    Edit.addText(this, [ids[0]], value, style, style === 'technique' ? 'above' : 'below');
    this.render();
  }

  async editLyric() {
    const loc = this.firstSelected();
    if (!loc) { Dlg.toast('Select a note first', 'err'); return; }
    const value = await Dlg.promptDialog({
      title: 'Lyrics', label: 'Syllable for this note',
      value: (loc.event.lyrics && loc.event.lyrics[0] && loc.event.lyrics[0].text) || '',
    });
    if (value === null) return;
    Edit.setLyric(this, loc.event.id, 0, value.trim());
    this.render();
    this.navigate(1);
  }

  async editChordSymbol() {
    const loc = this.firstSelected();
    if (!loc) { Dlg.toast('Select a note first', 'err'); return; }
    const guess = loc.event.type === 'note'
      ? Theory.detectChord(loc.event.notes.map((n) => n.pitch)) : null;
    const value = await Dlg.promptDialog({
      title: 'Chord symbol', label: 'Symbol',
      value: loc.event.chordSymbol || guess || '', placeholder: 'Cmaj7',
    });
    if (value === null) return;
    Edit.setChordSymbol(this, loc.event.id, value.trim());
    this.render();
  }

  async editFigures() {
    const loc = this.firstSelected();
    if (!loc) { Dlg.toast('Select a note first', 'err'); return; }
    const value = await Dlg.promptDialog({
      title: 'Figured bass',
      label: 'Figures, top to bottom \u2014 e.g. "6", "6 4", "#6 5", "7 b5"',
      value: (loc.event.figures || []).join(' '),
      placeholder: '6 4',
    });
    if (value === null) return;
    Edit.setFigures(this, loc.event.id, Edit.parseFigures(value));
    this.render();
    this.navigate(1);
  }

  async editRoman() {
    const loc = this.firstSelected();
    if (!loc) { Dlg.toast('Select a note first', 'err'); return; }
    const value = await Dlg.promptDialog({
      title: 'Roman numeral', label: 'Analysis', value: loc.event.roman || '', placeholder: 'V7/V',
    });
    if (value === null) return;
    Edit.setRoman(this, loc.event.id, value.trim());
    this.render();
  }

  async editFingering() {
    const loc = this.firstSelected();
    if (!loc || loc.event.type !== 'note') { Dlg.toast('Select a note first', 'err'); return; }
    const value = await Dlg.promptDialog({ title: 'Fingering', label: 'Finger', placeholder: '3' });
    if (value === null) return;
    Edit.setFingering(this, loc.event.id, 0, value.trim());
    this.render();
  }

  async editRehearsal() {
    const m = this.cursor.measure;
    const suggested = String.fromCharCode(65 + Math.min(25, this.score.measures.filter((x) => x.rehearsal).length));
    const value = await Dlg.promptDialog({
      title: 'Rehearsal mark', label: `Mark for bar ${m + 1}`,
      value: this.score.measures[m].rehearsal || suggested,
    });
    if (value === null) return;
    Edit.setRehearsalMark(this, m, value.trim());
    this.render();
  }

  /* ---------------------------------------------------- structure dialogs */

  openTimeSignature(measure) {
    Dlg.timeSignatureDialog(Model.timeSigAt(this.score, measure), (ts) => {
      Edit.setTimeSignature(this, measure, ts);
      this.render();
    });
  }

  openKeySignature(measure) {
    Dlg.keySignatureDialog(Model.keySigAt(this.score, measure), (fifths, mode) => {
      Edit.setKeySignature(this, measure, fifths, mode);
      this.render();
    });
  }

  openClef(measure, partIndex, staff) {
    const current = Model.clefAt(this.score, this.score.parts[partIndex], measure, staff);
    Dlg.clefDialog(current, (id) => {
      Edit.setClef(this, partIndex, measure, staff, id);
      this.render();
    });
  }

  openTempo(measure) {
    Dlg.tempoDialog(Model.tempoAt(this.score, measure), (t) => {
      Edit.setTempo(this, measure, t.bpm, t.unit, t.text);
      if (measure === 0) {
        this.el.tempoSlider.value = t.bpm;
        this.el.tempoInput.value = t.bpm;
      }
      this.player.invalidate();
      this.render();
    });
  }

  openBarline() {
    const m = this.measureSel ? this.measureSel.to : this.cursor.measure;
    Dlg.modal({
      title: `Barline — end of bar ${m + 1}`,
      build: (body) => {
        const styles = [
          ['normal', 'Single'], ['double', 'Double'], ['final', 'Final'],
          ['repeat-start', 'Start repeat'], ['repeat-end', 'End repeat'],
          ['repeat-both', 'Both repeats'], ['dashed', 'Dashed'],
        ];
        body.innerHTML = '<div class="insp-row"></div>';
        const row = body.querySelector('.insp-row');
        for (const [id, label] of styles) {
          const b = document.createElement('button');
          b.className = 'chip' + (this.score.measures[m].barline === id ? ' on' : '');
          b.textContent = label;
          b.onclick = () => { Edit.setBarline(this, m, id); this.render(); Dlg.closeModal(); };
          row.appendChild(b);
        }
      },
    });
  }

  /* --------------------------------------------------------- transport */

  playPause({ fromSelection = false } = {}) {
    if (this.player.state === 'playing') { this.player.pause(); return; }
    const from = fromSelection || this.measureSel
      ? (this.measureSel ? this.measureSel.from : this.cursor.measure) : 0;
    this.playFrom(this.player.state === 'paused' ? null : from);
  }

  playFrom(measure) {
    this.synth.init();
    this.player.setScore(this.score);
    if (measure === null) this.player.play();
    else this.player.play({ fromMeasure: measure });
  }

  onPlayState(state) {
    if (this.playBtn) {
      this.playBtn.innerHTML = (state === 'playing' ? UI.pause : UI.play)
        + `<span>${state === 'playing' ? 'Pause' : 'Play'}</span>`;
    }
    if (state === 'stopped') {
      this.playhead = null;
      this.paintPlayhead();
      this.piano.clearLights();
    }
  }

  onPlayPosition(time, at) {
    if (!at) return;
    /* Stopping reports the position it returned to as well as the state, and
     * the two arrive in that order; drawing a cursor for it would leave the
     * score looking as though it were still playing. */
    this.playhead = this.player.state === 'stopped' ? null : at;
    this.paintPlayhead();
    const ts = Model.timeSigAt(this.score, at.measure);
    const beats = Math.max(1, Math.round(measureTicks(ts) / beatTicks(ts)));
    this.el.posMeasure.textContent = String(at.measure + 1);
    this.el.posBeat.textContent = String(Math.min(beats, Math.floor(at.fraction * beats) + 1));
  }

  paintPlayhead() {
    this.el.pages.querySelectorAll('.play-line,.play-measure').forEach((n) => n.remove());
    if (!this.playhead) return;
    const rects = this.measureRects.get(this.playhead.measure);
    if (!rects || !rects.length) return;
    const r = rects[0];
    const svg = this.pageSVG(r.page);
    const ov = svg && svg.querySelector('.overlay');
    if (!ov) return;
    const span = (r.runTo - r.runFrom) + 1;
    const within = span > 1
      ? ((this.playhead.measure - r.runFrom) + this.playhead.fraction) / span
      : this.playhead.fraction;
    const x = r.x + r.w * Math.max(0, Math.min(1, within));
    ov.insertAdjacentHTML('beforeend',
      `<rect class="play-measure" x="${r.x}" y="${r.y - 1}" width="${r.w}" height="${r.h + 2}"/>` +
      `<line class="play-line" x1="${x}" y1="${r.y - 1.4}" x2="${x}" y2="${r.y + r.h + 1.4}"/>`);
    this.followPlayhead(r, svg);
  }

  followPlayhead(rect, svg) {
    if (this._lastFollow === this.playhead.measure) return;
    this._lastFollow = this.playhead.measure;
    const sp = this.spatiumPx;
    const box = svg.getBoundingClientRect();
    const scr = this.el.scroll.getBoundingClientRect();
    const y = box.top + rect.y * sp - scr.top + this.el.scroll.scrollTop;
    if (y < this.el.scroll.scrollTop || y > this.el.scroll.scrollTop + scr.height - 120) {
      this.el.scroll.scrollTo({ top: Math.max(0, y - 120), behavior: 'smooth' });
    }
  }

  async toggleMidi() {
    if (this.midi.enabled) {
      this.midi.disable();
      document.querySelector('[data-act=midi]').classList.remove('on');
      return;
    }
    const ok = await this.midi.enable();
    if (ok) this.synth.init();
  }

  /* -------------------------------------------------------------- view */

  zoom(dir) { this.setZoom(this.zoomIndex + dir); }

  setZoom(index) {
    this.zoomIndex = Math.max(0, Math.min(ZOOM_STEPS.length - 1, index));
    Files.rememberSetting('zoom', this.zoomIndex);
    this.render();
    Dlg.toast(Math.round(ZOOM_STEPS[this.zoomIndex] * 100) + '%');
  }

  togglePartView() {
    if (this.viewPart === null) {
      this.viewPart = this.cursor.partIndex;
    } else {
      const next = this.viewPart + 1;
      this.viewPart = next >= this.score.parts.length ? null : next;
      if (this.viewPart !== null) this.cursor.partIndex = this.viewPart;
    }
    this.render();
    this.buildParts();
    Dlg.toast(this.viewPart === null ? 'Full score' : this.score.parts[this.viewPart].name + ' part');
  }

  /* -------------------------------------------------------------- files */

  async newScore() {
    if (this.history.canUndo) {
      const ok = await Dlg.confirmDialog({
        title: 'New score',
        message: 'Start a new score? Unsaved changes to the current one will be lost.',
        okLabel: 'New score',
      });
      if (!ok) return;
    }
    Dlg.newScoreDialog((opts) => {
      this.setScore(Model.createScore(opts));
      this.el.title.value = this.score.title;
      this.el.composer.value = this.score.composer;
      this.el.tempoSlider.value = this.score.tempo;
      this.el.tempoInput.value = this.score.tempo;
      this.render();
      this.buildParts();
      this.buildMixer();
      this.setNoteEntry(true);
      Dlg.toast('Ready — press a letter key A–G, or click the staff');
    });
  }

  async openFile() {
    try {
      const { score, name } = await Files.openScoreFile();
      this.setScore(score);
      this.el.title.value = score.title || '';
      this.el.composer.value = score.composer || '';
      this.el.tempoSlider.value = score.tempo;
      this.el.tempoInput.value = score.tempo;
      this.render();
      this.buildParts();
      this.buildMixer();
      const bars = score.measures.length;
      Dlg.toast(`Opened ${name} \u2014 ${score.parts.length} part${score.parts.length > 1 ? 's' : ''}, ${bars} bars`, 'ok');
    } catch (err) {
      if (!err || err.message === 'No file chosen') return;
      Dlg.toast(err.message || 'Could not open that file', 'err');
    }
  }

  openExport() {
    Dlg.modal({
      title: 'Export',
      build: (body) => {
        const options = [
          ['MusicXML', 'Open in Sibelius, Finale, Dorico or MuseScore', UI.xml, () => {
            Files.download(Files.safeName(this.score.title, 'musicxml'), exportMusicXML(this.score), 'application/vnd.recordare.musicxml+xml');
          }],
          ['MIDI file', 'Standard MIDI File for any DAW', UI.midi, () => {
            Files.download(Files.safeName(this.score.title, 'mid'), exportMIDI(this.score), 'audio/midi');
          }],
          ['Audio (WAV)', 'Render the score to a 44.1 kHz stereo file', UI.audio, async () => {
            Dlg.toast('Rendering audio…');
            try {
              const buf = await renderScore(this.score, {});
              Files.download(Files.safeName(this.score.title, 'wav'), encodeWAV(buf), 'audio/wav');
              Dlg.toast('Audio exported', 'ok');
            } catch (err) {
              Dlg.toast('Audio export failed: ' + err.message, 'err');
            }
          }],
          ['SVG pages', 'Vector graphics, one file per page', UI.image, () => {
            this.layout.pages.forEach((p, i) => {
              const svg = renderPageStandalone(p, { spatium: this.spatiumPx });
              Files.download(Files.safeName(this.score.title + ' p' + (i + 1), 'svg'), svg, 'image/svg+xml');
            });
          }],
          ['PNG image', 'Raster image of the first page', UI.image, () => this.exportPNG()],
          ['Print / PDF', 'Use your browser to print or save as PDF', UI.print, () => { Dlg.closeModal(); setTimeout(() => window.print(), 120); }],
          ['Cadenza file', 'The editable score document', UI.save, () => Files.saveScoreFile(this.score)],
        ];
        body.innerHTML = '<div style="display:flex;flex-direction:column;gap:6px"></div>';
        const list = body.firstChild;
        for (const [name, desc, icon, fn] of options) {
          const b = document.createElement('button');
          b.className = 'ens-card';
          b.style.cssText = 'display:flex;align-items:center;gap:12px';
          b.innerHTML = `<span style="color:var(--accent)">${icon}</span><span><span class="en"></span><span class="ec"></span></span>`;
          b.querySelector('.en').textContent = name;
          b.querySelector('.ec').textContent = desc;
          b.onclick = () => { fn(); if (name !== 'Print / PDF') Dlg.closeModal(); };
          list.appendChild(b);
        }
      },
    });
  }

  exportPNG() {
    const page = this.layout.pages[0];
    if (!page) return;
    const svgText = renderPageStandalone(page, { spatium: this.spatiumPx });
    const scale = 2;
    const img = new Image();
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = page.width * this.spatiumPx * scale;
      canvas.height = page.height * this.spatiumPx * scale;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => {
        Files.download(Files.safeName(this.score.title, 'png'), b, 'image/png');
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.onerror = () => { Dlg.toast('PNG export failed', 'err'); URL.revokeObjectURL(url); };
    img.src = url;
  }

  /* ------------------------------------------------------- transcription */

  openTranscribe() {
    if (!this.transcriber) this.transcriber = new TranscribePanel(this);
    this.transcriber.open();
  }

  /* --------------------------------------------------------- composition */

  openCompose() {
    if (!this.composer) this.composer = new ComposePanel(this);
    this.composer.open();
  }

  /** Play a score that is not the document, so a transcription can be heard. */
  auditionScore(score) {
    this.stopAudition();
    this.audition = new Player(this.synth);
    this.audition.setScore(score);
    this.audition.play();
  }

  stopAudition() {
    if (this.audition) { this.audition.stop(); this.audition = null; }
  }

  /**
   * Play raw audio — the recording a transcription came from.
   *
   * Hearing the recording and the score one after the other is the quickest
   * way to find what is wrong with a transcription, so the panel needs to be
   * able to play both through the same output.
   */
  playAudio(samples, sampleRate) {
    this.stopAudio();
    const ctx = this.synth.init();
    if (!ctx) return;
    const buffer = ctx.createBuffer(1, samples.length, sampleRate);
    buffer.copyToChannel ? buffer.copyToChannel(samples, 0) : buffer.getChannelData(0).set(samples);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.9;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    this.audioSource = source;
  }

  stopAudio() {
    if (this.audioSource) {
      try { this.audioSource.stop(); } catch (err) { /* already finished */ }
      this.audioSource = null;
    }
  }

  /**
   * Take a transcription into the document.
   *
   * The proposed score is kept alongside it, so that when the user has
   * finished correcting it the difference between the two is what the
   * correction model learns from.  Undo puts the previous document back, as
   * with any other edit.
   */
  adoptTranscription(score, panel, info = {}) {
    const previous = this.score;
    this.pendingLearn = { panel, proposed: Model.deserialize(Model.serialize(score)) };
    this.setScore(score);
    this.history.begin('Transcribe');
    this.history.commit();
    this.flagged = new Map();
    for (const { event } of Model.iterEvents(score)) {
      if (event.transcribeConfidence !== undefined && event.transcribeConfidence < 0.55) {
        this.flagged.set(event.id, event.transcribeConfidence);
      }
    }
    /* Bars where playing the score back disagreed with the recording. */
    this.flaggedBars = new Set(info.bars || []);
    this.setNoteEntry(false);
    this.render();
    const n = this.flagged.size + this.flaggedBars.size;
    Dlg.toast(n ? `Transcription placed — ${n} place${n === 1 ? '' : 's'} marked for a second look`
      : 'Transcription placed', 'ok');
    this.setHint(n
      ? `<b>Transcribed.</b> The marked notes are the ones Cadenza was least sure of — click one to correct it. `
        + `Your corrections tune the next transcription.`
      : undefined);
    this.previousScore = previous;
  }

  /** Fold the corrections made since a transcription back into what is learned. */
  learnFromEdits() {
    if (!this.pendingLearn) return;
    const { panel, proposed } = this.pendingLearn;
    this.pendingLearn = null;
    try {
      panel.learnFrom(proposed, this.score);
    } catch (err) { /* learning is a convenience; never let it break an edit */ }
  }

  paintFlags() {
    this.el.pages.querySelectorAll('.uncertain').forEach((n) => n.classList.remove('uncertain'));
    this.el.pages.querySelectorAll('.bar-flag').forEach((n) => n.remove());
    for (const id of this.flagged.keys()) {
      this.el.pages.querySelectorAll(`[data-ev="${id}"]`).forEach((n) => n.classList.add('uncertain'));
    }
    if (!this.flaggedBars || !this.flaggedBars.size) return;
    for (const bar of this.flaggedBars) {
      for (const r of this.measureRects.get(bar - 1) || []) {
        const svg = this.pageSVG(r.page);
        const ov = svg && svg.querySelector('.overlay');
        if (!ov) continue;
        ov.insertAdjacentHTML('beforeend',
          `<rect class="bar-flag" x="${r.x}" y="${r.y - 1}" width="${r.w}" height="${r.h + 2}"/>`);
      }
    }
  }

  autosave() {
    if (this.pendingLearn && this.history.canUndo) this.learnFromEdits();
    if (!this.score) return;
    Files.autosave(this.score);
  }

  /* ------------------------------------------------------------- onboarding */

  /**
   * The first five minutes.
   *
   * Four labels pointing at the four things someone has to find before they
   * can do anything at all.  Shown once, dismissed by clicking anywhere, and
   * available again from the help button — a tour that cannot be got back is
   * worse than no tour.
   */
  showCoachMarks() {
    Files.rememberSetting('coached', 1);
    const steps = [
      { sel: '[data-act=noteEntry]', text: '1 · Click here (or press N), then type A–G or click the staff' },
      { sel: '[data-act="dur:quarter"]', text: '2 · Pick how long each note is — or press 1 to 7' },
      { sel: '[data-act=playPause]', text: '3 · Play it back — the space bar does the same' },
      { sel: '[data-act=transcribe]', text: '4 · Already played it? Turn a recording into notation here' },
    ];
    const layer = document.createElement('div');
    layer.className = 'coach-layer';
    let placed = 0;
    const taken = [];
    for (const step of steps) {
      const target = document.querySelector(step.sel);
      if (!target) continue;
      const r = target.getBoundingClientRect();
      const mark = document.createElement('div');
      mark.className = 'coach-mark';
      mark.textContent = step.text;
      const left = Math.max(8, Math.min(window.innerWidth - 300, r.left - 10));
      const below = r.bottom + 120 < window.innerHeight;
      let top = below ? r.bottom + 12 : r.top - 62;
      /* Two controls side by side would put their labels on top of each other;
       * step the later one down until it has room. */
      let guard = 0;
      while (guard++ < 6 && taken.some((t) => Math.abs(t.top - top) < 52
        && left < t.left + 300 && t.left < left + 300)) top += 54;
      taken.push({ left, top });
      mark.style.left = left + 'px';
      mark.style.top = top + 'px';
      const ring = document.createElement('div');
      ring.className = 'coach-ring';
      ring.style.left = (r.left - 6) + 'px';
      ring.style.top = (r.top - 6) + 'px';
      ring.style.width = (r.width + 12) + 'px';
      ring.style.height = (r.height + 12) + 'px';
      layer.append(ring, mark);
      placed++;
    }
    if (!placed) return;
    const done = document.createElement('button');
    done.className = 'coach-done';
    done.textContent = 'Got it';
    layer.appendChild(done);
    const close = () => layer.remove();
    done.onclick = close;
    layer.onclick = (e) => { if (e.target === layer) close(); };
    document.body.appendChild(layer);
  }

  showTour() { this.showCoachMarks(); }

  showShortcuts() {
    Dlg.modal({
      title: 'Keyboard Shortcuts',
      width: 'wide',
      build: (body) => {
        body.style.columns = '2';
        body.style.columnGap = '26px';
        for (const [section, rows] of SHORTCUT_HELP) {
          const t = document.createElement('div');
          t.className = 'sec-title';
          t.textContent = section;
          t.style.breakAfter = 'avoid';
          const table = document.createElement('table');
          table.className = 'key-table';
          table.style.breakInside = 'avoid';
          table.style.marginBottom = '12px';
          table.innerHTML = rows.map(([k, d]) =>
            `<tr><td><kbd>${k}</kbd></td><td style="color:var(--text-dim)">${d}</td></tr>`).join('');
          body.append(t, table);
        }
      },
    });
  }

  showWelcome() {
    Dlg.modal({
      title: 'Welcome to Cadenza',
      build: (body) => {
        body.innerHTML = `
          <p style="margin:0 0 14px;line-height:1.65;color:var(--text-dim)">
            A notation workstation that runs entirely in your browser — no plug-ins, nothing to install,
            and your score never leaves this machine.
          </p>
          <div class="sec-title">Three things to try</div>
          <ol style="margin:0;padding-left:20px;line-height:1.9;color:var(--text-dim)">
            <li>Press <kbd>N</kbd>, then type <kbd>C</kbd> <kbd>D</kbd> <kbd>E</kbd> <kbd>F</kbd> <kbd>G</kbd> — notes appear as you type.</li>
            <li>Press <kbd>Space</kbd> to hear it back with the playback cursor following along.</li>
            <li>Press <kbd>5</kbd> for quarter notes, <kbd>4</kbd> for eighths — or click the note values on the palette.</li>
          </ol>
          <p style="margin:16px 0 0;color:var(--text-faint);font-size:12px">
            Everything on the palette above has a tooltip with its shortcut. Press <kbd>?</kbd> any time for the full list.
          </p>`;
      },
      footer: (foot, close) => {
        const a = document.createElement('button');
        a.className = 'btn ghost';
        a.textContent = 'Start from a template';
        a.onclick = () => { close(); this.newScore(); };
        const b = document.createElement('button');
        b.className = 'btn primary';
        b.textContent = 'Start writing';
        b.onclick = () => { close(); this.setNoteEntry(true); };
        foot.append(a, b);
      },
    });
  }
}
/* ---------------------------------------------------------------- boot */

const app = new Cadenza();
window.cadenza = app;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}
export default app;

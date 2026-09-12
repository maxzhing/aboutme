/* Cadenza — modal dialogs. */

import { INSTRUMENTS, FAMILIES, ENSEMBLES, getInstrument } from '../core/instruments.js';
import { TIME_SIG_PRESETS } from '../core/rhythm.js';
import { MAJOR_KEYS, MINOR_KEYS, keyName, CLEFS } from '../core/theory.js';
import { UI, glyphIcon } from './icons.js';
import { tempoText } from '../core/model.js';

const root = () => document.getElementById('modal-root');

export function closeModal() {
  const r = root();
  if (r) r.innerHTML = '';
  document.dispatchEvent(new CustomEvent('cadenza:modalclosed'));
}

/**
 * Show a modal.  `build(body, close)` fills the body; `footer` returns buttons.
 * Escape and backdrop clicks close it.
 */
export function modal({ title, build, footer, width = '', onClose }) {
  const r = root();
  r.innerHTML = '';
  const back = document.createElement('div');
  back.className = 'modal-backdrop';
  const box = document.createElement('div');
  box.className = 'modal ' + width;
  box.innerHTML =
    `<div class="modal-head"><h2></h2><button class="tb-btn" data-close aria-label="Close">${UI.close}</button></div>` +
    '<div class="modal-body"></div>';
  box.querySelector('h2').textContent = title;
  const body = box.querySelector('.modal-body');
  /* The key handler is registered below; closing must always remove it, or a
   * stale listener swallows the next Escape the app receives. */
  let onKey = null;
  const close = () => {
    back.remove();
    if (onKey) document.removeEventListener('keydown', onKey, true);
    onKey = null;
    if (onClose) onClose();
    document.dispatchEvent(new CustomEvent('cadenza:modalclosed'));
  };
  build(body, close);
  if (footer) {
    const foot = document.createElement('div');
    foot.className = 'modal-foot';
    footer(foot, close);
    box.appendChild(foot);
  }
  box.querySelector('[data-close]').onclick = close;
  back.appendChild(box);
  back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
  r.appendChild(back);
  onKey = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); }
  };
  document.addEventListener('keydown', onKey, true);
  const first = body.querySelector('input, select, button');
  if (first) setTimeout(() => first.focus(), 30);
  return { close, body, box };
}

export function toast(message, kind = '') {
  const r = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = message;
  r.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 2400);
  setTimeout(() => el.remove(), 2800);
}

export function confirmDialog({ title, message, okLabel = 'OK', danger = false }) {
  return new Promise((resolve) => {
    let done = false;
    modal({
      title,
      width: 'narrow',
      build: (body) => { body.innerHTML = `<p style="margin:0;line-height:1.6">${message}</p>`; },
      footer: (foot, close) => {
        const cancel = document.createElement('button');
        cancel.className = 'btn ghost';
        cancel.textContent = 'Cancel';
        cancel.onclick = () => { done = true; close(); resolve(false); };
        const ok = document.createElement('button');
        ok.className = 'btn primary';
        ok.textContent = okLabel;
        if (danger) ok.style.background = 'var(--danger)';
        ok.onclick = () => { done = true; close(); resolve(true); };
        foot.append(cancel, ok);
      },
      onClose: () => { if (!done) resolve(false); },
    });
  });
}

export function promptDialog({ title, label, value = '', placeholder = '', multiline = false, okLabel = 'OK' }) {
  return new Promise((resolve) => {
    let done = false;
    let input;
    modal({
      title,
      width: 'narrow',
      build: (body) => {
        const wrap = document.createElement('div');
        wrap.className = 'insp-field';
        const l = document.createElement('label');
        l.textContent = label;
        input = document.createElement('input');
        input.type = 'text';
        input.value = value;
        input.placeholder = placeholder;
        wrap.append(l, input);
        body.appendChild(wrap);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { done = true; resolve(input.value); closeModal(); }
        });
      },
      footer: (foot, close) => {
        const cancel = document.createElement('button');
        cancel.className = 'btn ghost';
        cancel.textContent = 'Cancel';
        cancel.onclick = () => { done = true; close(); resolve(null); };
        const ok = document.createElement('button');
        ok.className = 'btn primary';
        ok.textContent = okLabel;
        ok.onclick = () => { done = true; close(); resolve(input.value); };
        foot.append(cancel, ok);
      },
      onClose: () => { if (!done) resolve(null); },
    });
  });
}

/* ------------------------------------------------------------ new score */

export function newScoreDialog(onCreate) {
  let ensemble = 'piano';
  let picked = [...ENSEMBLES[0].parts];
  modal({
    title: 'New Score',
    width: 'wide',
    build: (body) => {
      body.innerHTML = `
        <div class="sec-title">Start from an ensemble</div>
        <div class="ens-grid" id="ens-grid"></div>
        <div class="sec-title" style="margin-top:16px">Details</div>
        <div class="field-grid">
          <label for="ns-title">Title</label><input id="ns-title" type="text" value="Untitled Score">
          <label for="ns-composer">Composer</label><input id="ns-composer" type="text" placeholder="optional">
          <label for="ns-key">Key signature</label><select id="ns-key"></select>
          <label for="ns-time">Time signature</label><select id="ns-time"></select>
          <label for="ns-tempo">Tempo</label>
          <div style="display:flex;gap:8px;align-items:center">
            <input id="ns-tempo" type="number" min="20" max="300" value="96" style="width:80px">
            <span style="color:var(--text-faint);font-size:11px">bpm</span>
            <span id="ns-tempo-text" style="color:var(--text-dim);font-style:italic"></span>
          </div>
          <label for="ns-bars">Measures</label><input id="ns-bars" type="number" min="1" max="600" value="24" style="width:80px">
        </div>`;
      const grid = body.querySelector('#ens-grid');
      for (const ens of ENSEMBLES) {
        const b = document.createElement('button');
        b.className = 'ens-card' + (ens.id === ensemble ? ' on' : '');
        b.innerHTML = `<span class="en"></span><span class="ec"></span>`;
        b.querySelector('.en').textContent = ens.name;
        b.querySelector('.ec').textContent = ens.parts.length === 1
          ? getInstrument(ens.parts[0]).name
          : `${ens.parts.length} instruments`;
        b.onclick = () => {
          ensemble = ens.id;
          picked = [...ens.parts];
          grid.querySelectorAll('.ens-card').forEach((c) => c.classList.remove('on'));
          b.classList.add('on');
        };
        grid.appendChild(b);
      }
      const keySel = body.querySelector('#ns-key');
      for (let f = -7; f <= 7; f++) {
        for (const mode of ['major', 'minor']) {
          const o = document.createElement('option');
          o.value = f + ':' + mode;
          o.textContent = keyName(f, mode);
          if (f === 0 && mode === 'major') o.selected = true;
          keySel.appendChild(o);
        }
      }
      const timeSel = body.querySelector('#ns-time');
      TIME_SIG_PRESETS.forEach((t, i) => {
        const o = document.createElement('option');
        o.value = String(i);
        o.textContent = t.label;
        if (t.beats === 4 && t.beatType === 4 && t.symbol === 'common') o.selected = true;
        timeSel.appendChild(o);
      });
      const tempoInput = body.querySelector('#ns-tempo');
      const tempoLabel = body.querySelector('#ns-tempo-text');
      const syncTempo = () => { tempoLabel.textContent = tempoText(+tempoInput.value || 96); };
      tempoInput.addEventListener('input', syncTempo);
      syncTempo();
    },
    footer: (foot, close) => {
      const cancel = document.createElement('button');
      cancel.className = 'btn ghost';
      cancel.textContent = 'Cancel';
      cancel.onclick = close;
      const ok = document.createElement('button');
      ok.className = 'btn primary';
      ok.textContent = 'Create Score';
      ok.onclick = () => {
        const b = document.getElementById('modal-root');
        const [fifths, mode] = b.querySelector('#ns-key').value.split(':');
        const ts = TIME_SIG_PRESETS[+b.querySelector('#ns-time').value];
        onCreate({
          title: b.querySelector('#ns-title').value.trim() || 'Untitled Score',
          composer: b.querySelector('#ns-composer').value.trim(),
          instrumentIds: picked,
          measures: Math.max(1, Math.min(600, +b.querySelector('#ns-bars').value || 24)),
          keySig: { fifths: +fifths, mode },
          timeSig: { beats: ts.beats, beatType: ts.beatType, symbol: ts.symbol || null },
          tempo: Math.max(20, Math.min(300, +b.querySelector('#ns-tempo').value || 96)),
        });
        close();
      };
      foot.append(cancel, ok);
    },
  });
}

/* ------------------------------------------------------ instrument picker */

export function instrumentDialog(onPick, { title = 'Add Instrument' } = {}) {
  let family = FAMILIES[0];
  modal({
    title,
    build: (body) => {
      body.innerHTML = '<div class="inst-picker"><div class="inst-fams"></div><div class="inst-list"></div></div>';
      const fams = body.querySelector('.inst-fams');
      const list = body.querySelector('.inst-list');
      const paint = () => {
        fams.querySelectorAll('.inst-fam').forEach((b) => b.classList.toggle('on', b.dataset.f === family));
        list.innerHTML = '';
        for (const inst of INSTRUMENTS.filter((i) => i.family === family)) {
          const b = document.createElement('button');
          b.className = 'inst-item';
          const lo = noteName(inst.range[0]);
          const hi = noteName(inst.range[1]);
          b.innerHTML = `<span></span><span class="rng">${lo}–${hi}</span>`;
          b.querySelector('span').textContent = inst.name;
          b.onclick = () => { onPick(inst.id); closeModal(); };
          list.appendChild(b);
        }
      };
      for (const f of FAMILIES) {
        const b = document.createElement('button');
        b.className = 'inst-fam';
        b.dataset.f = f;
        b.textContent = f;
        b.onclick = () => { family = f; paint(); };
        fams.appendChild(b);
      }
      paint();
    },
  });
}

const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
export function noteName(midi) {
  return NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
}

/* --------------------------------------------------------- score setup */

export function scoreSetupDialog(score, onApply) {
  modal({
    title: 'Score Setup',
    build: (body) => {
      body.innerHTML = `
        <div class="field-grid">
          <label for="ss-title">Title</label><input id="ss-title" type="text">
          <label for="ss-sub">Subtitle</label><input id="ss-sub" type="text">
          <label for="ss-comp">Composer</label><input id="ss-comp" type="text">
          <label for="ss-lyr">Lyricist</label><input id="ss-lyr" type="text">
          <label for="ss-copy">Copyright</label><input id="ss-copy" type="text">
          <label for="ss-page">Page size</label>
          <select id="ss-page">
            <option value="letter">US Letter</option><option value="a4">A4</option>
            <option value="legal">US Legal</option><option value="tabloid">Tabloid</option>
            <option value="a3">A3</option>
          </select>
          <label for="ss-size">Staff size</label>
          <div style="display:flex;gap:8px;align-items:center">
            <input id="ss-size" type="range" min="1.1" max="2.4" step="0.05" style="flex:1">
            <span id="ss-size-val" style="width:56px;font-size:11px;color:var(--text-faint)"></span>
          </div>
        </div>`;
      body.querySelector('#ss-title').value = score.title || '';
      body.querySelector('#ss-sub').value = score.subtitle || '';
      body.querySelector('#ss-comp').value = score.composer || '';
      body.querySelector('#ss-lyr').value = score.lyricist || '';
      body.querySelector('#ss-copy').value = score.copyright || '';
      body.querySelector('#ss-page').value = score.pageSize || 'letter';
      const size = body.querySelector('#ss-size');
      const val = body.querySelector('#ss-size-val');
      size.value = score.spatium || 1.75;
      const sync = () => { val.textContent = (+size.value).toFixed(2) + ' mm'; };
      size.addEventListener('input', sync);
      sync();
    },
    footer: (foot, close) => {
      const cancel = document.createElement('button');
      cancel.className = 'btn ghost';
      cancel.textContent = 'Cancel';
      cancel.onclick = close;
      const ok = document.createElement('button');
      ok.className = 'btn primary';
      ok.textContent = 'Apply';
      ok.onclick = () => {
        const b = document.getElementById('modal-root');
        onApply({
          title: b.querySelector('#ss-title').value,
          subtitle: b.querySelector('#ss-sub').value,
          composer: b.querySelector('#ss-comp').value,
          lyricist: b.querySelector('#ss-lyr').value,
          copyright: b.querySelector('#ss-copy').value,
          pageSize: b.querySelector('#ss-page').value,
          spatium: +b.querySelector('#ss-size').value,
        });
        close();
      };
      foot.append(cancel, ok);
    },
  });
}

/* ------------------------------------------------- time / key / tempo */

export function timeSignatureDialog(current, onApply) {
  modal({
    title: 'Time Signature',
    build: (body) => {
      body.innerHTML = '<div class="sec-title">Common</div><div class="insp-row" id="ts-presets"></div>' +
        '<div class="sec-title" style="margin-top:14px">Custom</div>' +
        '<div style="display:flex;align-items:center;gap:8px">' +
        '<input id="ts-beats" type="number" min="1" max="32" style="width:70px"> <span style="color:var(--text-faint)">/</span> ' +
        '<select id="ts-type" style="width:80px"><option>1</option><option>2</option><option>4</option><option>8</option><option>16</option><option>32</option></select>' +
        '<span style="color:var(--text-faint);font-size:11.5px;margin-left:6px">applies from the selected measure onward</span></div>';
      const row = body.querySelector('#ts-presets');
      for (const t of TIME_SIG_PRESETS) {
        const b = document.createElement('button');
        b.className = 'chip';
        b.textContent = t.label;
        if (current && t.beats === current.beats && t.beatType === current.beatType
          && (t.symbol || null) === (current.symbol || null)) b.classList.add('on');
        b.onclick = () => { onApply({ beats: t.beats, beatType: t.beatType, symbol: t.symbol || null }); closeModal(); };
        row.appendChild(b);
      }
      body.querySelector('#ts-beats').value = current ? current.beats : 4;
      body.querySelector('#ts-type').value = String(current ? current.beatType : 4);
    },
    footer: (foot, close) => {
      const ok = document.createElement('button');
      ok.className = 'btn primary';
      ok.textContent = 'Apply Custom';
      ok.onclick = () => {
        const b = document.getElementById('modal-root');
        onApply({
          beats: Math.max(1, Math.min(32, +b.querySelector('#ts-beats').value || 4)),
          beatType: +b.querySelector('#ts-type').value || 4,
          symbol: null,
        });
        close();
      };
      foot.append(ok);
    },
  });
}

export function keySignatureDialog(current, onApply) {
  modal({
    title: 'Key Signature',
    build: (body) => {
      body.innerHTML = '<div class="sec-title">Major</div><div class="insp-row" id="k-major"></div>' +
        '<div class="sec-title" style="margin-top:14px">Minor</div><div class="insp-row" id="k-minor"></div>' +
        '<p style="color:var(--text-faint);font-size:11.5px;margin:14px 0 0">' +
        'The key applies from the selected measure onward. Transposing instruments are written in their own key automatically.</p>';
      const build = (sel, mode) => {
        const row = body.querySelector(sel);
        for (let f = -7; f <= 7; f++) {
          const b = document.createElement('button');
          b.className = 'chip';
          b.textContent = keyName(f, mode).replace(' ' + mode, '') + '  ' + accLabel(f);
          if (current && current.fifths === f && (current.mode || 'major') === mode) b.classList.add('on');
          b.onclick = () => { onApply(f, mode); closeModal(); };
          row.appendChild(b);
        }
      };
      build('#k-major', 'major');
      build('#k-minor', 'minor');
    },
  });
}

function accLabel(f) {
  if (f === 0) return '';
  return `${Math.abs(f)}${f > 0 ? '♯' : '♭'}`;
}

export function tempoDialog(current, onApply) {
  modal({
    title: 'Tempo',
    width: 'narrow',
    build: (body) => {
      body.innerHTML = `
        <div class="field-grid">
          <label for="tm-text">Marking</label><input id="tm-text" type="text" placeholder="Allegro">
          <label for="tm-bpm">Beats/minute</label><input id="tm-bpm" type="number" min="20" max="300">
          <label for="tm-unit">Beat unit</label>
          <select id="tm-unit">
            <option value="whole">Whole</option><option value="half">Half</option>
            <option value="quarter">Quarter</option><option value="quarter.">Dotted quarter</option>
            <option value="eighth">Eighth</option>
          </select>
        </div>
        <div class="sec-title" style="margin-top:14px">Common markings</div>
        <div class="insp-row" id="tm-presets"></div>`;
      body.querySelector('#tm-text').value = (current && current.text) || '';
      body.querySelector('#tm-bpm').value = (current && current.bpm) || 96;
      body.querySelector('#tm-unit').value = (current && current.unit) || 'quarter';
      const presets = [['Grave', 40], ['Largo', 50], ['Adagio', 68], ['Andante', 84],
        ['Moderato', 104], ['Allegretto', 118], ['Allegro', 140], ['Vivace', 172], ['Presto', 190]];
      const row = body.querySelector('#tm-presets');
      for (const [name, bpm] of presets) {
        const b = document.createElement('button');
        b.className = 'chip';
        b.textContent = `${name} ${bpm}`;
        b.onclick = () => {
          body.querySelector('#tm-text').value = name;
          body.querySelector('#tm-bpm').value = bpm;
        };
        row.appendChild(b);
      }
    },
    footer: (foot, close) => {
      const ok = document.createElement('button');
      ok.className = 'btn primary';
      ok.textContent = 'Apply';
      ok.onclick = () => {
        const b = document.getElementById('modal-root');
        onApply({
          text: b.querySelector('#tm-text').value.trim() || null,
          bpm: Math.max(20, Math.min(300, +b.querySelector('#tm-bpm').value || 96)),
          unit: b.querySelector('#tm-unit').value,
        });
        close();
      };
      foot.append(ok);
    },
  });
}

export function clefDialog(current, onApply) {
  modal({
    title: 'Clef',
    build: (body) => {
      body.innerHTML = '<div class="insp-row" id="cl-list"></div>' +
        '<p style="color:var(--text-faint);font-size:11.5px;margin:14px 0 0">Changes the clef from the selected measure onward.</p>';
      const row = body.querySelector('#cl-list');
      for (const id of ['treble', 'bass', 'alto', 'tenor', 'treble8vb', 'treble8va', 'bass8vb', 'soprano', 'mezzo', 'baritone', 'percussion']) {
        const c = CLEFS[id];
        const b = document.createElement('button');
        b.className = 'chip' + (current === id ? ' on' : '');
        b.style.cssText = 'display:flex;align-items:center;gap:7px;padding:8px 11px';
        const icon = c.sign === 'G' ? 'gClef' : c.sign === 'F' ? 'fClef' : c.sign === 'C' ? 'cClef' : 'percClef';
        b.innerHTML = glyphIcon(icon, { size: 26 }) + `<span>${c.name}</span>`;
        b.onclick = () => { onApply(id); closeModal(); };
        row.appendChild(b);
      }
    },
  });
}

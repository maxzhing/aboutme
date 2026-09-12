/* Cadenza — saving, loading and autosave. */

import { serialize, deserialize } from '../core/model.js';

const AUTOSAVE_KEY = 'cadenza.autosave.v1';
const RECENT_KEY = 'cadenza.recent.v1';

export function download(filename, data, mime = 'application/octet-stream') {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 400);
}

export function safeName(title, ext) {
  const base = (title || 'Untitled Score').replace(/[^\w \-.]+/g, '').trim() || 'Score';
  return `${base}.${ext}`;
}

export function saveScoreFile(score) {
  download(safeName(score.title, 'cadenza'), serialize(score), 'application/json');
}

export function openScoreFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.cadenza,.json,application/json';
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) { reject(new Error('No file chosen')); return; }
      const reader = new FileReader();
      reader.onload = () => {
        try { resolve({ score: deserialize(String(reader.result)), name: file.name }); }
        catch (err) { reject(err); }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    };
    input.click();
  });
}

export function autosave(score) {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ at: Date.now(), score }));
    return true;
  } catch {
    return false;   // quota exceeded or storage disabled
  }
}

export function loadAutosave() {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.score) return null;
    return { at: parsed.at, score: deserialize(parsed.score) };
  } catch {
    return null;
  }
}

export function clearAutosave() {
  try { localStorage.removeItem(AUTOSAVE_KEY); } catch { /* storage disabled */ }
}

export function rememberSetting(key, value) {
  try { localStorage.setItem('cadenza.pref.' + key, JSON.stringify(value)); } catch { /* ignore */ }
}

export function recallSetting(key, fallback) {
  try {
    const raw = localStorage.getItem('cadenza.pref.' + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

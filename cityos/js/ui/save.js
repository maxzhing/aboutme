// Save system: multiple named slots in localStorage plus file export/import.
import { fmtNum } from './format.js';

const KEY = 'cityos.saves.v1';

export class SaveSystem {
  constructor(app) { this.app = app; }

  read() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; }
  }
  write(all) {
    try { localStorage.setItem(KEY, JSON.stringify(all)); return true; }
    catch (e) { this.app.ui.toast('Save failed — storage full', true); return false; }
  }

  list() {
    const all = this.read();
    return Object.entries(all).map(([slot, v]) => ({
      slot, name: v.name, date: v.savedAt, population: v.population,
    })).sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  save(name) {
    const sim = this.app.sim;
    const data = sim.serialize();
    const all = this.read();
    const slot = 'slot' + Date.now().toString(36);
    const d = sim.timeLabel();
    all[slot] = {
      name: name || `${sim.mode.label} · ${d.date}`,
      savedAt: new Date().toLocaleString(),
      population: Math.round(sim.stats.population),
      data,
    };
    // keep the eight most recent
    const keys = Object.keys(all).sort((a, b) => (all[a].savedAt < all[b].savedAt ? 1 : -1));
    for (const k of keys.slice(8)) delete all[k];
    return this.write(all);
  }

  load(slot) {
    const all = this.read();
    const entry = all[slot];
    if (!entry) { this.app.ui.toast('Save not found', true); return; }
    this.app.loadFromData(entry.data);
    this.app.ui.toast(`Loaded ${entry.name}`);
  }

  remove(slot) {
    const all = this.read();
    delete all[slot];
    this.write(all);
  }

  exportFile() {
    const sim = this.app.sim;
    const blob = new Blob([JSON.stringify(sim.serialize())], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cityos-${sim.timeLabel().date.replace(/[ ,]/g, '-')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    this.app.ui.toast('City exported');
  }

  importFile(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        this.app.loadFromData(data);
        this.app.ui.toast('City imported');
      } catch (e) { this.app.ui.toast('Could not read that file', true); }
    };
    r.readAsText(file);
  }

  autosave() {
    const all = this.read();
    const sim = this.app.sim;
    all.__auto = {
      name: `Autosave · ${sim.timeLabel().date}`,
      savedAt: new Date().toLocaleString(),
      population: Math.round(sim.stats.population),
      data: sim.serialize(),
    };
    this.write(all);
  }
}

/* Cadenza — undo/redo.
 *
 * Most edits touch only a handful of measures, so a transaction records JSON
 * snapshots of just those measures.  Structural changes (adding a part,
 * inserting bars) fall back to a whole-score snapshot, which is rare enough
 * not to matter.
 */

export class History {
  constructor(score, { limit = 200 } = {}) {
    this.score = score;
    this.limit = limit;
    this.undoStack = [];
    this.redoStack = [];
    this.tx = null;
    this.listeners = [];
  }

  onChange(fn) { this.listeners.push(fn); }
  emit(kind) { for (const fn of this.listeners) fn(kind, this); }

  setScore(score) {
    this.score = score;
    this.undoStack = [];
    this.redoStack = [];
    this.tx = null;
    this.emit('reset');
  }

  /** Open a transaction.  Nested calls join the outer one. */
  begin(label) {
    if (this.tx) { this.tx.depth++; return this.tx; }
    this.tx = { label, depth: 1, measures: new Map(), global: null, whole: null };
    return this.tx;
  }

  /** Record the pre-edit state of one part-measure. */
  touch(partIndex, measureIndex) {
    const tx = this.tx;
    if (!tx || tx.whole) return;
    const key = partIndex + ':' + measureIndex;
    if (tx.measures.has(key)) return;
    const part = this.score.parts[partIndex];
    const pm = part && part.measures[measureIndex];
    tx.measures.set(key, { partIndex, measureIndex, before: pm ? JSON.stringify(pm) : null });
  }

  touchRange(partIndex, from, to) {
    for (let m = from; m <= to; m++) this.touch(partIndex, m);
  }

  /** Record the pre-edit state of the global measure list and spanners. */
  touchGlobal() {
    if (!this.tx || this.tx.whole || this.tx.global) return;
    this.tx.global = JSON.stringify({ measures: this.score.measures, spanners: this.score.spanners });
  }

  /** Record the whole score — for part changes, paste across parts, etc. */
  touchAll() {
    if (!this.tx || this.tx.whole) return;
    this.tx.whole = JSON.stringify(this.score);
    this.tx.measures.clear();
    this.tx.global = null;
  }

  /** Close the transaction and push it onto the undo stack. */
  commit() {
    const tx = this.tx;
    if (!tx) return;
    if (--tx.depth > 0) return;
    this.tx = null;
    let entry;
    if (tx.whole) {
      entry = { label: tx.label, whole: { before: tx.whole, after: JSON.stringify(this.score) } };
    } else {
      const measures = [];
      for (const rec of tx.measures.values()) {
        const part = this.score.parts[rec.partIndex];
        const pm = part && part.measures[rec.measureIndex];
        const after = pm ? JSON.stringify(pm) : null;
        if (after !== rec.before) measures.push({ ...rec, after });
      }
      const global = tx.global === null ? null : {
        before: tx.global,
        after: JSON.stringify({ measures: this.score.measures, spanners: this.score.spanners }),
      };
      if (!measures.length && (!global || global.before === global.after)) return;
      entry = { label: tx.label, measures, global: global && global.before !== global.after ? global : null };
    }
    this.undoStack.push(entry);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack.length = 0;
    this.emit('commit');
  }

  /** Abandon the open transaction without recording it. */
  cancel() {
    this.tx = null;
  }

  apply(entry, dir) {
    const side = dir === 'undo' ? 'before' : 'after';
    if (entry.whole) {
      const snap = JSON.parse(entry.whole[side]);
      /* Mutate in place so existing references to the score stay valid. */
      for (const k of Object.keys(this.score)) delete this.score[k];
      Object.assign(this.score, snap);
      return;
    }
    for (const rec of entry.measures) {
      const part = this.score.parts[rec.partIndex];
      if (!part) continue;
      if (rec[side] === null) part.measures.splice(rec.measureIndex, 1);
      else part.measures[rec.measureIndex] = JSON.parse(rec[side]);
    }
    if (entry.global) {
      const g = JSON.parse(entry.global[side]);
      this.score.measures = g.measures;
      this.score.spanners = g.spanners;
    }
  }

  undo() {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    this.apply(entry, 'undo');
    this.redoStack.push(entry);
    this.emit('undo');
    return entry.label;
  }

  redo() {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    this.apply(entry, 'redo');
    this.undoStack.push(entry);
    this.emit('redo');
    return entry.label;
  }

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }
  get undoLabel() { return this.canUndo ? this.undoStack[this.undoStack.length - 1].label : null; }
  get redoLabel() { return this.canRedo ? this.redoStack[this.redoStack.length - 1].label : null; }
}

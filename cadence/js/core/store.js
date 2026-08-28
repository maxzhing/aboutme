/* Cadence — application state: persistence, undo, and change notification.

   Every mutation goes through S.commit(), which snapshots the collections it
   touches before running, so any action can be reversed. Writes are debounced
   to localStorage and flushed on page hide, so nothing is lost. */
(function (global) {
  'use strict';

  var KEY = 'cadence.state.v1';
  var UNDO_LIMIT = 40;

  var state = M.emptyState();
  var undoStack = [];
  var redoStack = [];
  var listeners = {};
  var saveTimer = null;
  var lastError = null;

  var COLLECTIONS = ['events', 'tasks', 'deadlines', 'notes', 'projects', 'goals',
    'habits', 'captures', 'people', 'templates', 'calendars', 'categories'];

  /* ---------- pub/sub ---------- */
  function on(evt, fn) {
    (listeners[evt] || (listeners[evt] = [])).push(fn);
    return function () { off(evt, fn); };
  }
  function off(evt, fn) {
    var arr = listeners[evt];
    if (!arr) return;
    var i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  }
  function emit(evt, payload) {
    var arr = (listeners[evt] || []).slice();
    for (var i = 0; i < arr.length; i++) {
      try { arr[i](payload); } catch (e) { console.error('listener error on ' + evt, e); }
    }
  }

  /* ---------- persistence ---------- */
  function load() {
    var raw;
    try { raw = global.localStorage.getItem(KEY); }
    catch (e) { lastError = 'storage-unavailable'; return false; }
    if (!raw) return false;
    try {
      var parsed = JSON.parse(raw);
      state = migrate(parsed);
      return true;
    } catch (e) {
      // Never destroy an unreadable payload — park it so it can be recovered.
      try { global.localStorage.setItem(KEY + '.corrupt.' + Date.now(), raw); } catch (e2) { }
      lastError = 'corrupt';
      state = M.emptyState();
      return false;
    }
  }

  function migrate(data) {
    var fresh = M.emptyState();
    if (!data || typeof data !== 'object') return fresh;
    var out = Object.assign(fresh, data);
    out.settings = Object.assign(M.defaultSettings(), data.settings || {});
    // Older payloads may lack collections added later.
    COLLECTIONS.forEach(function (c) { if (!Array.isArray(out[c])) out[c] = fresh[c]; });
    if (!out.dismissed || typeof out.dismissed !== 'object') out.dismissed = {};
    if (!out.reminderLog || typeof out.reminderLog !== 'object') out.reminderLog = {};
    out.version = 1;
    return out;
  }

  function save() {
    try {
      global.localStorage.setItem(KEY, JSON.stringify(state));
      lastError = null;
      emit('saved');
    } catch (e) {
      lastError = e && e.name === 'QuotaExceededError' ? 'quota' : 'write-failed';
      emit('save-error', lastError);
    }
  }

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { saveTimer = null; save(); }, 250);
  }

  function flush() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    save();
  }

  function clone(v) {
    return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  }

  /* ---------- mutation ---------- */
  /* touch: which top-level keys the mutator may change. Snapshotting only those
     keeps the undo stack small even with thousands of events. */
  function commit(label, mutator, touch) {
    touch = touch || COLLECTIONS.concat(['settings']);
    if (typeof touch === 'string') touch = [touch];
    var before = {};
    touch.forEach(function (k) { before[k] = clone(state[k]); });

    var result;
    try {
      result = mutator(state);
    } catch (e) {
      // Roll back to the pre-mutation snapshot rather than leaving a half-edit.
      touch.forEach(function (k) { state[k] = before[k]; });
      console.error('commit failed: ' + label, e);
      emit('error', { label: label, error: e });
      throw e;
    }

    if (result === false) return null; // mutator declined; nothing to record

    var entry = { label: label, touch: touch, before: before, after: {} };
    touch.forEach(function (k) { entry.after[k] = clone(state[k]); });
    undoStack.push(entry);
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
    redoStack.length = 0;

    scheduleSave();
    emit('change', { label: label, touch: touch });
    emit('committed', entry);
    return entry;
  }

  /* A mutation that should not be undoable (view prefs, reminder bookkeeping). */
  function quiet(mutator, silent) {
    mutator(state);
    scheduleSave();
    if (!silent) emit('change', { label: 'quiet', touch: [] });
  }

  function undo() {
    var entry = undoStack.pop();
    if (!entry) return null;
    entry.touch.forEach(function (k) { state[k] = clone(entry.before[k]); });
    redoStack.push(entry);
    scheduleSave();
    emit('change', { label: 'undo:' + entry.label, touch: entry.touch });
    return entry;
  }

  function redo() {
    var entry = redoStack.pop();
    if (!entry) return null;
    entry.touch.forEach(function (k) { state[k] = clone(entry.after[k]); });
    undoStack.push(entry);
    scheduleSave();
    emit('change', { label: 'redo:' + entry.label, touch: entry.touch });
    return entry;
  }

  function canUndo() { return undoStack.length > 0; }
  function canRedo() { return redoStack.length > 0; }
  function lastLabel() { return undoStack.length ? undoStack[undoStack.length - 1].label : null; }

  /* ---------- accessors ---------- */
  function all(coll) { return state[coll] || []; }
  function get(coll, id) {
    var arr = state[coll] || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  }
  function indexOf(coll, id) {
    var arr = state[coll] || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return i;
    return -1;
  }

  function add(coll, obj, label) {
    commit(label || ('Add ' + singular(coll)), function (st) {
      st[coll].push(obj);
    }, [coll]);
    return obj;
  }

  function addMany(coll, objs, label) {
    commit(label || ('Add ' + objs.length + ' items'), function (st) {
      st[coll] = st[coll].concat(objs);
    }, [coll]);
    return objs;
  }

  function update(coll, id, patch, label) {
    var idx = indexOf(coll, id);
    if (idx < 0) return null;
    var updated = null;
    commit(label || ('Edit ' + singular(coll)), function (st) {
      var target = st[coll][idx];
      Object.assign(target, patch, { updatedAt: new Date().toISOString() });
      updated = target;
    }, [coll]);
    return updated;
  }

  function remove(coll, id, label) {
    var idx = indexOf(coll, id);
    if (idx < 0) return false;
    commit(label || ('Delete ' + singular(coll)), function (st) {
      st[coll].splice(idx, 1);
    }, [coll]);
    return true;
  }

  function singular(coll) {
    var map = {
      events: 'event', tasks: 'task', deadlines: 'deadline', notes: 'note',
      projects: 'project', goals: 'goal', habits: 'habit', captures: 'capture',
      people: 'person', templates: 'template', calendars: 'calendar', categories: 'category'
    };
    return map[coll] || 'item';
  }

  function settings() { return state.settings; }

  function setSetting(key, value) {
    commit('Change setting', function (st) {
      st.settings[key] = value;
    }, ['settings']);
  }

  /* View preferences change constantly; they should not consume undo slots. */
  function setPref(key, value) {
    quiet(function (st) { st.settings[key] = value; }, true);
  }

  function replaceState(next) {
    state = migrate(next);
    undoStack.length = 0;
    redoStack.length = 0;
    flush();
    emit('change', { label: 'replace', touch: COLLECTIONS });
  }

  function reset() { replaceState(M.emptyState()); }

  function exportJSON() { return JSON.stringify(state, null, 2); }

  function storageError() { return lastError; }

  function approximateSize() {
    try { return JSON.stringify(state).length; } catch (e) { return 0; }
  }

  global.S = {
    COLLECTIONS: COLLECTIONS,
    get state() { return state; },
    load: load, save: save, flush: flush, clone: clone,
    on: on, off: off, emit: emit,
    commit: commit, quiet: quiet,
    undo: undo, redo: redo, canUndo: canUndo, canRedo: canRedo, lastLabel: lastLabel,
    all: all, get: get, indexOf: indexOf,
    add: add, addMany: addMany, update: update, remove: remove,
    settings: settings, setSetting: setSetting, setPref: setPref,
    replaceState: replaceState, reset: reset, exportJSON: exportJSON,
    storageError: storageError, approximateSize: approximateSize
  };

  global.addEventListener('pagehide', flush);
  global.addEventListener('beforeunload', flush);
  global.document.addEventListener('visibilitychange', function () {
    if (global.document.visibilityState === 'hidden') flush();
  });
})(window);

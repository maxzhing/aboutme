/* Cadenza — keyboard handling.
 *
 * The shortcut set follows the conventions most notation software shares, so
 * muscle memory carries over: number keys pick a note value, letters A–G enter
 * pitches, and the arrow keys move or transpose.
 */

export const SHORTCUT_HELP = [
  ['Note entry', [
    ['N', 'Toggle note input mode'],
    ['A – G', 'Enter that pitch (or retune the selected note)'],
    ['1 … 7', 'Note value: 64th, 32nd, 16th, 8th, quarter, half, whole'],
    ['.', 'Dotted note'],
    ['0', 'Insert a rest'],
    ['Shift + A–G', 'Stack the pitch on the note just written, making a chord'],
    ['Shift + click', 'Add the pitch you clicked to the chord already there'],
    ['T', 'Tie to the next note'],
    ['S', 'Slur over the selection'],
    ['Ctrl + 3', 'Triplet'],
    ['Esc', 'Leave note input / clear selection'],
  ]],
  ['Pitch', [
    ['↑ ↓', 'Move the note up or down a step'],
    ['Ctrl + ↑ ↓', 'Move by an octave'],
    ['+ / −', 'Raise / lower by a semitone'],
    ['=', 'Natural'],
    ['J', 'Respell enharmonically'],
  ]],
  ['Navigation', [
    ['← →', 'Previous / next note'],
    ['Shift + ← →', 'Extend the selection'],
    ['Tab', 'Next measure'],
    ['Alt + ↑ ↓', 'Previous / next staff'],
    ['Home / End', 'First / last measure'],
    ['Ctrl + A', 'Select the whole part'],
  ]],
  ['Playback', [
    ['Space', 'Play / pause'],
    ['Esc (playing)', 'Stop'],
    ['Ctrl + Space', 'Play from the selection'],
    ['M', 'Metronome'],
    ['L', 'Loop the selection'],
  ]],
  ['Editing', [
    ['Ctrl + Z', 'Undo'],
    ['Ctrl + Shift + Z', 'Redo'],
    ['Ctrl + C / X / V', 'Copy / cut / paste'],
    ['Delete', 'Delete the selection'],
    ['Ctrl + B', 'Add a measure at the end'],
    ['Ctrl + Del', 'Delete the selected measures'],
  ]],
  ['Marks', [
    ['Shift + S', 'Staccato'],
    ['Shift + T', 'Tenuto'],
    ['Shift + V', 'Accent'],
    ['Shift + M', 'Marcato'],
    [';', 'Fermata'],
    ['Shift + R', 'Trill'],
    ['H / Shift + H', 'Crescendo / diminuendo'],
    ['Ctrl + E', 'Expression text'],
    ['Ctrl + L', 'Lyrics'],
    ['Ctrl + K', 'Chord symbol'],
    ['Ctrl + G', 'Figured bass'],
  ]],
  ['File & view', [
    ['Ctrl + S', 'Save'],
    ['Ctrl + O', 'Open'],
    ['Ctrl + P', 'Print / PDF'],
    ['Ctrl + = / −', 'Zoom in / out'],
    ['Ctrl + 0', 'Reset zoom'],
    ['?', 'Show this list'],
  ]],
];

const DURATION_KEYS = {
  1: '64th', 2: '32nd', 3: '16th', 4: 'eighth', 5: 'quarter', 6: 'half', 7: 'whole',
};

function inTextField(e) {
  const t = e.target;
  if (!t) return false;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
}

export function installShortcuts(app) {
  document.addEventListener('keydown', (e) => {
    if (inTextField(e)) return;
    if (document.getElementById('modal-root').children.length && e.key !== 'Escape') return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key;
    const lower = typeof k === 'string' ? k.toLowerCase() : '';

    /* --- file and global ------------------------------------------------ */
    if (mod && lower === 's' && !e.shiftKey) { e.preventDefault(); app.act('save'); return; }
    if (mod && lower === 'o') { e.preventDefault(); app.act('open'); return; }
    if (mod && lower === 'p') { e.preventDefault(); app.act('print'); return; }
    if (mod && lower === 'n' && e.shiftKey) { e.preventDefault(); app.act('new'); return; }
    if (mod && (k === '=' || k === '+')) { e.preventDefault(); app.zoom(1); return; }
    if (mod && (k === '-' || k === '_')) { e.preventDefault(); app.zoom(-1); return; }
    if (mod && k === '0') { e.preventDefault(); app.setZoom(4); return; }
    if (mod && lower === 'z') { e.preventDefault(); e.shiftKey ? app.act('redo') : app.act('undo'); return; }
    if (mod && lower === 'y') { e.preventDefault(); app.act('redo'); return; }
    if (mod && lower === 'c') { e.preventDefault(); app.act('copy'); return; }
    if (mod && lower === 'x') { e.preventDefault(); app.act('cut'); return; }
    if (mod && lower === 'v') { e.preventDefault(); app.act('paste'); return; }
    if (mod && lower === 'a') { e.preventDefault(); app.act('selectAll'); return; }
    if (mod && lower === 'b') { e.preventDefault(); app.act('appendMeasure'); return; }
    if (mod && lower === 'e') { e.preventDefault(); app.act('text:expression'); return; }
    if (mod && lower === 'l') { e.preventDefault(); app.act('lyric'); return; }
    if (mod && lower === 'k') { e.preventDefault(); app.act('chordSymbol'); return; }
    if (mod && lower === 'g') { e.preventDefault(); app.act('figuredBass'); return; }
    if (mod && e.altKey && lower === 'v') { e.preventDefault(); app.act('voice'); return; }
    if (mod && (k === 'Delete' || k === 'Backspace')) { e.preventDefault(); app.act('deleteMeasure'); return; }
    if (mod && k === 'Insert') { e.preventDefault(); app.act('insertMeasure'); return; }
    if (mod && ['3', '5', '6', '7', '9'].includes(k)) { e.preventDefault(); app.act('tuplet:' + k); return; }
    if (k === '?' || (e.shiftKey && k === '/')) { e.preventDefault(); app.act('help'); return; }

    /* --- transport ------------------------------------------------------ */
    if (k === ' ') {
      e.preventDefault();
      app.act(mod ? 'playFromSelection' : 'playPause');
      return;
    }
    if (k === 'Escape') {
      e.preventDefault();
      if (app.player.state === 'playing') app.act('stop');
      else if (app.noteEntry) app.setNoteEntry(false);
      else app.clearSelection();
      return;
    }
    /* --- navigation (before the modifier guard: Ctrl and Shift both bind) -- */
    if (k === 'ArrowUp' || k === 'ArrowDown') {
      e.preventDefault();
      const dir = k === 'ArrowUp' ? 1 : -1;
      if (mod && e.shiftKey) app.act('crossStaff:' + (dir > 0 ? 'up' : 'down'));
      else if (e.altKey) app.moveStaff(-dir);
      else if (mod) app.act('octave:' + (dir > 0 ? 'up' : 'down'));
      else app.stepPitch(dir);
      return;
    }
    if (k === 'ArrowLeft' || k === 'ArrowRight') {
      e.preventDefault();
      app.navigate(k === 'ArrowRight' ? 1 : -1, { extend: e.shiftKey });
      return;
    }

    if (mod) return;   // leave remaining browser shortcuts alone

    /* --- note values ---------------------------------------------------- */
    if (DURATION_KEYS[k]) { e.preventDefault(); app.act('dur:' + DURATION_KEYS[k]); return; }
    if (k === '.') { e.preventDefault(); app.act('dot:1'); return; }
    if (k === ',') { e.preventDefault(); app.act('dot:2'); return; }
    if (k === '0') { e.preventDefault(); app.act('rest'); return; }

    /* --- pitch entry ---------------------------------------------------- */
    if (/^[a-g]$/.test(lower) && !e.altKey) {
      e.preventDefault();
      app.enterLetter(lower, { chord: e.shiftKey });
      return;
    }

    /* --- marks ---------------------------------------------------------- */
    if (e.shiftKey) {
      const marks = { s: 'art:staccato', t: 'art:tenuto', v: 'art:accent', m: 'art:marcato', r: 'orn:trill', h: 'hairpin:dim' };
      if (marks[lower]) { e.preventDefault(); app.act(marks[lower]); return; }
    }
    if (k === ';') { e.preventDefault(); app.act('art:fermata'); return; }
    if (lower === 'n') { e.preventDefault(); app.act('noteEntry'); return; }
    if (lower === 't') { e.preventDefault(); app.act('tie'); return; }
    if (lower === 's') { e.preventDefault(); app.act('slur'); return; }
    if (lower === 'h') { e.preventDefault(); app.act('hairpin:cresc'); return; }
    if (lower === 'j') { e.preventDefault(); app.act('respell'); return; }
    if (lower === 'm') { e.preventDefault(); app.act('metronome'); return; }
    if (lower === 'l') { e.preventDefault(); app.act('loop'); return; }
    if (k === '/') { e.preventDefault(); app.act('grace'); return; }
    if (k === '+' || k === ']') { e.preventDefault(); app.act('alter:1'); return; }
    if (k === '-' || k === '[') { e.preventDefault(); app.act('alter:-1'); return; }
    if (k === '=') { e.preventDefault(); app.act('acc:0'); return; }

    if (k === 'Tab') { e.preventDefault(); app.navigateMeasure(e.shiftKey ? -1 : 1); return; }
    if (k === 'Home') { e.preventDefault(); app.gotoMeasure(0); return; }
    if (k === 'End') { e.preventDefault(); app.gotoMeasure(app.score.measures.length - 1); return; }
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); app.act('delete'); return; }
    if (k === 'Enter') { e.preventDefault(); app.act('appendMeasure'); return; }
  });
}

/* Cadenza — on-screen piano.
 *
 * Provides the same entry path as a MIDI keyboard for people who do not have
 * one: click or drag to sound a note, hold to build a chord.
 */

const WHITE_OFFSETS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_AFTER = { 0: 1, 1: 3, 3: 6, 4: 8, 5: 10 };
const NOTE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

export class PianoKeyboard {
  constructor(el, opts = {}) {
    this.el = el;
    this.onNote = opts.onNote || (() => {});
    this.onRelease = opts.onRelease || (() => {});
    this.lowOctave = 2;
    this.octaves = 4;
    this.velocity = 88;
    this.down = new Set();
    this.lit = new Map();
    this.pointerDown = false;
    this.keys = new Map();
    el.addEventListener('pointerdown', (e) => this.handleDown(e));
    el.addEventListener('pointermove', (e) => this.handleMove(e));
    window.addEventListener('pointerup', () => this.handleUp());
    window.addEventListener('pointercancel', () => this.handleUp());
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    this.render();
  }

  setRange(lowOctave, octaves) {
    this.lowOctave = Math.max(-1, Math.min(7, lowOctave));
    this.octaves = Math.max(1, Math.min(7, octaves));
    this.render();
  }

  shiftOctave(delta) {
    this.setRange(this.lowOctave + delta, this.octaves);
  }

  render() {
    const el = this.el;
    el.innerHTML = '';
    this.keys.clear();
    const whiteCount = this.octaves * 7 + 1;
    const w = 100 / whiteCount;
    let wi = 0;
    for (let o = 0; o < this.octaves; o++) {
      for (let s = 0; s < 7; s++) {
        const midi = (this.lowOctave + o + 1) * 12 + WHITE_OFFSETS[s];
        this.addKey(midi, 'white', wi * w, w, NOTE_LETTERS[s] + (this.lowOctave + o));
        if (BLACK_AFTER[s] !== undefined) {
          const bm = (this.lowOctave + o + 1) * 12 + BLACK_AFTER[s];
          this.addKey(bm, 'black', (wi + 1) * w - w * 0.29, w * 0.58, '');
        }
        wi++;
      }
    }
    const top = (this.lowOctave + this.octaves + 1) * 12;
    this.addKey(top, 'white', wi * w, w, 'C' + (this.lowOctave + this.octaves));
  }

  addKey(midi, kind, left, width, label) {
    const d = document.createElement('div');
    d.className = 'pkey ' + kind;
    d.style.left = left + '%';
    d.style.width = width + '%';
    d.dataset.midi = String(midi);
    if (label) d.innerHTML = `<span class="kname">${label}</span>`;
    this.el.appendChild(d);
    this.keys.set(midi, d);
  }

  midiAt(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || !el.classList.contains('pkey')) return null;
    return +el.dataset.midi;
  }

  handleDown(e) {
    const midi = this.midiAt(e);
    if (midi === null) return;
    e.preventDefault();
    this.el.setPointerCapture?.(e.pointerId);
    this.pointerDown = true;
    this.press(midi, e.shiftKey || e.ctrlKey || e.metaKey);
  }

  handleMove(e) {
    if (!this.pointerDown) return;
    const midi = this.midiAt(e);
    if (midi === null || this.down.has(midi)) return;
    /* Dragging across the keys glissandos, releasing the previous note. */
    for (const m of [...this.down]) this.release(m);
    this.press(midi, false);
  }

  handleUp() {
    if (!this.pointerDown) return;
    this.pointerDown = false;
    for (const m of [...this.down]) this.release(m);
  }

  press(midi, chord) {
    this.down.add(midi);
    const k = this.keys.get(midi);
    if (k) k.classList.add('down');
    this.onNote(midi, this.velocity, chord);
  }

  release(midi) {
    this.down.delete(midi);
    const k = this.keys.get(midi);
    if (k) k.classList.remove('down');
    this.onRelease(midi);
  }

  /** Light a key from an external source (MIDI in, or playback). */
  light(midi, on) {
    const k = this.keys.get(midi);
    if (!k) return;
    k.classList.toggle('lit', !!on);
  }

  clearLights() {
    for (const k of this.keys.values()) k.classList.remove('lit');
  }
}

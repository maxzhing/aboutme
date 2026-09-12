/* Cadenza — Web MIDI input.
 *
 * Optional: when the browser or the machine has no MIDI, the on-screen piano
 * covers the same ground, so failures here are reported and then ignored.
 */

export class MidiInput {
  constructor(opts = {}) {
    this.onNoteOn = opts.onNoteOn || (() => {});
    this.onNoteOff = opts.onNoteOff || (() => {});
    this.onStatus = opts.onStatus || (() => {});
    this.access = null;
    this.enabled = false;
    this.inputs = [];
    this.selected = 'all';
  }

  get supported() {
    return typeof navigator !== 'undefined' && !!navigator.requestMIDIAccess;
  }

  async enable() {
    if (!this.supported) {
      this.onStatus({ state: 'unsupported', message: 'This browser does not expose Web MIDI.' });
      return false;
    }
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
    } catch (err) {
      this.onStatus({ state: 'denied', message: 'MIDI access was refused.' });
      return false;
    }
    this.enabled = true;
    this.access.onstatechange = () => this.refresh();
    this.refresh();
    return true;
  }

  refresh() {
    if (!this.access) return;
    this.inputs = [...this.access.inputs.values()];
    for (const input of this.inputs) {
      input.onmidimessage = (msg) => this.handle(input, msg);
    }
    this.onStatus({
      state: 'ready',
      devices: this.inputs.map((i) => ({ id: i.id, name: i.name || 'MIDI input' })),
      message: this.inputs.length
        ? `${this.inputs.length} MIDI input${this.inputs.length > 1 ? 's' : ''} connected`
        : 'No MIDI inputs found',
    });
  }

  handle(input, msg) {
    if (this.selected !== 'all' && input.id !== this.selected) return;
    const [status, a, b] = msg.data;
    const cmd = status & 0xf0;
    if (cmd === 0x90 && b > 0) this.onNoteOn(a, b);
    else if (cmd === 0x80 || (cmd === 0x90 && b === 0)) this.onNoteOff(a);
  }

  disable() {
    for (const input of this.inputs) input.onmidimessage = null;
    this.enabled = false;
    this.onStatus({ state: 'off', message: 'MIDI input off' });
  }
}

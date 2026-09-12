# Cadenza

A music notation and composition workstation that runs entirely in the browser.
No installation, no plug-ins, no server — scores are engraved, played back and
exported on the machine they are written on.

Cadenza has no third-party dependencies. The glyphs, the engraving engine and
every instrument sound are built from scratch in this repository.

---

## Running it

**On the web** — serve the directory over http and open `index.html`:

```sh
cd cadenza
python3 -m http.server 8000      # or: npx http-server -p 8000
# then open http://localhost:8000/
```

ES modules are blocked over `file://`, which is why a server is needed. For a
copy that opens by double-clicking, build the single-file version:

```sh
node build.mjs                   # writes cadenza.html (~400 KB, no dependencies)
```

`cadenza.html` is the whole application in one file and runs offline.

---

## What it does

**Notation.** Whole notes through 64ths, dotted and double-dotted, tuplets,
grace notes, ties, chords, tremolos, cross-staff writing, multi-bar rests,
figured bass, and all five accidentals. Treble, bass,
alto, tenor, soprano, mezzo, baritone, percussion and octave-transposed clefs.
Key signatures from seven flats to seven sharps in major or minor, changeable at
any bar, with transposing instruments written in their own key automatically.
Simple, compound and irregular time signatures, plus common and cut time.

**Engraving.** Notes are spaced by duration on a shared rhythmic grid, so voices
and parts stay aligned vertically. Beams follow the metre with secondary beams
breaking at the beat; slopes and stem lengths follow the usual conventions.
Accidentals stack, seconds displace across the stem, ledger lines and dots place
themselves, systems justify to the margin, and the staff size steps down as the
ensemble grows — the way a printed score is set.

A beam that spans both staves of a grand staff runs through the gap between
them, with each chord's stem pointing at it from whichever side it sits on.
Runs of empty bars collapse into multi-bar rests — always in a part, and in the
full score on request — stopping wherever a rehearsal mark, meter change or
repeat needs to be read.

**Sound.** Every instrument is synthesised with the Web Audio API: layered and
slightly detuned partials with a hammer transient for the piano, bowed
articulation and body resonance for strings, characteristic spectra for each
wind (odd harmonics for the clarinet, for instance), a filter that opens on the
attack for brass, and inharmonic partials for tuned percussion. A generated
impulse response puts everything in a room. Playback honours tempo changes,
repeats, ties, dynamics, hairpins, articulations, ornaments, tremolos and
fermatas, with a cursor that follows the music.

**Input.** Type note letters, click the staff, play a MIDI keyboard, or use the
on-screen piano. Every command has a shortcut, and every button shows it.

**Files.** Native `.cadenza` documents and MusicXML in both directions — open a
file from Sibelius, Finale, Dorico or MuseScore and it comes in with its parts,
voices, transpositions, cross-staff writing, tuplets, slurs, hairpins, lyrics
and repeats intact. Export to MusicXML 4.0, Standard MIDI File, WAV (rendered
offline, faster than real time), SVG, PNG and PDF via print. Work in progress is
kept in local storage between sessions.

---

## Getting started in the app

1. Press <kbd>N</kbd> for note input.
2. Type <kbd>C</kbd> <kbd>D</kbd> <kbd>E</kbd> <kbd>F</kbd> <kbd>G</kbd> — notes
   appear as you type and the cursor advances.
3. Press <kbd>5</kbd> for quarters, <kbd>4</kbd> for eighths, <kbd>.</kbd> to dot.
4. Press <kbd>Space</kbd> to hear it.

Press <kbd>?</kbd> for the full shortcut list.

---

## How it is put together

```
js/
  core/          the document and the rules of music
    theory.js      pitch spelling, clefs, key signatures, staff positions
    rhythm.js      durations, metre, beam grouping, tuplets
    model.js       score / part / measure / voice / event, transposition, time maps
    edit.js        every editing operation, in one place
    history.js     undo and redo, snapshotting only the measures an edit touched
    instruments.js the instrument catalogue and ready-made ensembles
  engrave/
    geom.js        path construction: rotated ellipses, calligraphic outlines, spirals
    glyphs.js      the complete glyph set, generated rather than loaded from a font
    metrics.js     engraving constants, in staff spaces
    layout.js      spacing, beaming, systems, pages, collision avoidance
    render.js      draw items to SVG
  audio/
    synth.js       the instruments
    player.js      flattening the score to events, and the look-ahead scheduler
  io/
    musicxml.js    MusicXML 4.0 partwise export
    musicxml-import.js  reading MusicXML back in
    midifile.js    Standard MIDI File export
    audiofile.js   offline rendering and WAV encoding
    files.js       save, open, autosave
  ui/
    app.js         the controller: selection, cursor, commands
    ribbon.js      the palette definition
    shortcuts.js   the keyboard map
    icons.js       toolbar icons, reusing the engraving glyphs
    dialogs.js     modals
    piano.js       the on-screen keyboard
    midi.js        Web MIDI input
dev/
  glyphs.html      a proof sheet of every glyph, for checking the engraving
```

Coordinates throughout the engraver are in **staff spaces**, with the origin of
each glyph at its attachment point. The renderer sets the SVG `viewBox` in those
same units, so changing the staff size is a single number and stroke widths stay
proportional.

---

## Notes and limits

- Web MIDI input needs a browser that supports it (Chrome and Edge do; Safari
  and Firefox do not at the time of writing). The on-screen piano covers the
  same ground everywhere.
- Audio needs a user gesture before it can start, which is why the first sound
  follows your first click or keypress.
- Compressed MusicXML (`.mxl`) is not read; re-save as uncompressed
  `.musicxml` first. The importer says so rather than failing silently.
- Percussion is written on a single-line-agnostic five-line staff; separate
  drum-kit staff positions per instrument are not modelled.
- Playback does not follow first- and second-time endings; repeats are taken
  once through.

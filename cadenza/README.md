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
node build.mjs                   # writes cadenza.html (~600 KB, no dependencies)
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

**Transcription.** Record yourself, import a recording, import a MIDI file, or
play a MIDI keyboard, and Cadenza works out the notes, the beat, the metre and
the key and writes them into the score as real, editable notation. What it is
not certain of, it says so about — see below.

**Files.** Native `.cadenza` documents and MusicXML in both directions — open a
file from Sibelius, Finale, Dorico or MuseScore and it comes in with its parts,
voices, transpositions, cross-staff writing, tuplets, slurs, hairpins, lyrics
and repeats intact. Export to MusicXML 4.0, Standard MIDI File, WAV (rendered
offline, faster than real time), SVG, PNG and PDF via print. Work in progress is
kept in local storage between sessions.

---

## Transcription

**The Transcribe button.** Record audio, play a MIDI keyboard, import audio
(WAV, MP3, FLAC, OGG, M4A) or import a MIDI file. What comes back is a summary —
how many notes, at what tempo, in what metre and key — with a confidence figure
for each stage, a list of the bars worth a second look, and the settings to
change if something is wrong: the rhythm grid, how tightly to fit the beat, the
tempo, the metre, the key, one staff or two, and how hard to listen. Re-reading
with different settings is instant, because the notes are already known. Then
play it, and put it in the score, where undo works as it does for any edit.

**Frequencies sounding together are a chord.** This is the part that separates a
transcriber from a pitch detector, and it is what the engine is built around.
The spectrum is summed along each candidate's harmonic series; the strongest
candidate is taken, the energy its series explains is subtracted, and the search
repeats — so C, E and G played together come back as a C major chord rather than
as the loudest of the three repeated, and C, G and C come back as an octave and
a fifth rather than as one note. Four things beyond that main loop turned out to
matter:

- **Strings are stiff.** Their partials run sharp of exact multiples — most of a
  semitone by the tenth. Each candidate's stiffness is measured from its own low
  partials and used to predict the rest. Without this, a note's upper partials
  are missed and a phantom note is assembled out of them.
- **Resolution bounds where a partial may be.** A tolerance in cents alone is
  tight at the bottom of the range and, higher up, wide enough to find a peak
  wherever it looks — which is how a note nobody played collects a full series.
- **Two notes often share a partial.** The fourth partial of G4 and the third of
  C5 both land on G6. A candidate there is real only if it carries more energy
  than every note already found can account for between them.
- **A held note is cut in two only on two cues agreeing**: an attack at that
  instant, and a rise in the energy of that note's own partials — the ones it
  shares with nothing else sounding. That is what tells four repeated notes from
  one long one without splitting a held chord under a moving melody.

**Reading it as music.** The pulse is found by autocorrelation, then settled by
counting the beats that carry no note at all — a pulse at twice the tempo has an
empty one between every pair, which is what keeps a slow piece from being
written out at double speed. The metre is read from where the downbeats fall,
using three cues rather than loudness alone: more notes struck together, longer
notes, and the bass moving. Quantisation fits each beat separately to the
coarsest division that accounts for the attacks inside it, so a beat played in
threes is written as a triplet whatever its neighbours are doing and nothing is
forced onto a grid it does not fit. Releases get their own treatment, because
letting go of a key is articulation and not rhythm: gaps too short to have been
meant close up, and a release is never written finer than a sixteenth.

**Two hands, not one line.** Which hand played what is decided for the whole
take at once, as a Viterbi pass over the possible dividing pitches: hands do not
leap back and forth, so the answer is the path that keeps both within reach
while moving as little as it can. An Alberti bass stays in the left hand under
its melody. Within a staff, notes that begin and end together are a chord; one
that begins while another is still sounding and outlasts it gets a voice of its
own.

**MIDI is better than audio, and the code says so.** A MIDI instrument states
every note exactly — pitch, timing, velocity, and the sustain pedal — so those
transcriptions are limited only by the musical reading. Audio has to be listened
to. A single clean line comes back reliably; chords and two independent hands
come back well; a dense orchestral recording will need editing.

**What it is not sure of, it marks.** Every stage carries its own confidence,
notes below a threshold are marked on the page, and the bars they are in are
listed by number. Nothing pops up; the marks are there to be looked at.

**Learning from corrections.** Cadenza fits a handful of parameters to the
changes you make afterwards: an octave bias per register, how often your beats
divide in threes, where your hands divide, whether notes are more often invented
than missed, and which way you spell accidentals. Each needs several
observations before it takes effect, and each changes the next transcription —
the octave bias moves the notes, the split centre moves the hands, the
sensitivity moves the threshold. It is five running estimates, not a trained
model, and the panel shows the counts behind every claim so it can be checked
rather than believed. It can be forgotten in one click.

Accuracy is checked by 68 executable cases:

```sh
node cadenza/test/transcribe.mjs
```

Eighteen chords — single notes across the range, triads, sevenths, inversions,
octaves, wide spreads, a dense five-note stack, a semitone cluster. Nineteen
passages — scales up and down, a repeated note, parallel octaves, chord
sequences, a melody over a held bass, arpeggios, sixteenth-note runs, an Alberti
bass, a pedalled broken chord, repeated chords, a common tone held through a
chord change, rapid chord changes, staccato with real rests, the extremes of the
keyboard together, a trill, inversions, quiet playing, and block harmony. Then
the musical reading: metre from 4/4 to 6/8, triplets, dotted rhythms, ties over
barlines, rests, key signatures and their spelling, two-handed textures, tempos
from 66 to 168, playing behind the beat, every bar adding up exactly, and the
whole chain on audio rather than MIDI. Then capture and learning: recorded
timing, the sustain pedal, re-struck notes, a score out to MIDI and back
unchanged, and each learned parameter shown to change what comes out.

All 68 pass. What that does **not** prove is stated at the top of the test file:
the material is synthesised — plausible partial structure, inharmonicity, attack
and decay, but not recordings of real instruments in real rooms. Treat the
scores as a regression floor, not as a claim about studio audio. The pitch stage
is a module with one entry point, so a stronger model can be dropped in behind
it without the rest of the chain changing.

---

## Musical correctness

The rules of common-practice notation are written down as executable checks:

```sh
node cadenza/test/rules.mjs
```

Sixty-seven of them, each stating a rule and asserting the engine follows it —
that an accidental holds for the rest of the bar across *every* voice on the
staff, that it does not survive the barline, that a note tied over one never
restates it; that a note on the middle line stems down; that eighths beam in
half-bars in 4/4 and in threes in 6/8, with secondary beams breaking at the
beat; that a whole-bar rest is drawn as a semibreve in every meter from 3/8 to
4/2; that stepping a note up a staff position takes its accidental from the key
rather than carrying the old one; that a trill moves to the next scale degree,
so the same trill is a semitone in C major and a tone in A major; and that every
transposing instrument sounds where it should.

---

## The interface

The toolbar carries what is used constantly and nothing else: **Write**, the
note lengths, the rest, the three accidentals, tie and slur — and at the far
end, **Transcribe**. Everything else lives in a named palette that opens under
the bar when it is wanted and closes when it is not: Marks, Dynamics, Text,
Rhythm, Spelling, Bars & keys, Score.

Nothing has been removed. A score editor with ninety commands on screen is not
more capable than one with fifteen, it is only harder to start; the rest are one
click away, each under a heading that says what it is for, and every one of them
still has its keyboard shortcut. The properties panel on the right shows what
applies to whatever is selected, and the line along the bottom always says what
to do next.

On a first run, four labels point at the four things you have to find before you
can do anything: where to write, how long the notes are, how to play it back,
and where transcription lives. **Show me around again** in the Shortcuts panel
brings them back.

### Getting started

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
  transcribe/
    dsp.js         FFT, STFT, windowing, peak interpolation
    polyphony.js   multiple-F0 estimation over a whole spectrum
    onsets.js      spectral-flux attack detection
    notes.js       onset-delimited segments assembled into note events
    rhythm.js      pulse, metre, and fitting a performance to the beat
    voices.js      which hand played what, and where a staff carries two lines
    build.js       key, spelling, bars, ties, rests, tuplets
    capture.js     live MIDI, raw audio, and standard MIDI files
    learn.js       parameters fitted to the corrections you make
    index.js       both inputs, end to end, with confidence per stage
  ui/
    app.js         the controller: selection, cursor, commands
    ribbon.js      the toolbar and the palettes
    transcribe-panel.js  record, import, read, check, accept
    shortcuts.js   the keyboard map
    icons.js       toolbar icons, reusing the engraving glyphs
    dialogs.js     modals
    piano.js       the on-screen keyboard
    midi.js        Web MIDI input
test/
  rules.mjs        the rules of notation, as executable checks
  transcribe.mjs   transcription accuracy, as executable checks
dev/
  glyphs.html      a proof sheet of every glyph, for checking the engraving
  accidentals.html, cross.html, multirest.html, dyn.html  visual proofs
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
- Recording audio needs microphone permission, and the browser asks for it. The
  samples are captured raw rather than through a compressing recorder, because
  Opus discards exactly the quiet high partials that tell one note from another
  in a chord. Nothing is uploaded: the whole analysis runs on the machine.
- Transcription from audio is honest about what it can do. One clean line is
  reliable; chords and two hands are good; a dense mix is a starting point that
  needs editing. Where an instrument can send MIDI, that path is much better and
  the panel says so.

/* Cadenza — what is on the toolbar, and what is one click away.
 *
 * The bar carries the things used in every session and nothing else: start
 * writing, choose a note length, add a rest, alter a pitch, tie and slur.
 * Everything else lives in a named palette that opens under the bar when it is
 * wanted and stays shut when it is not.
 *
 * Nothing has been removed.  A score with ninety commands on screen is not
 * more capable than one with fifteen, it is only harder to start; the other
 * seventy-five are a click away, each under a heading that says what it is
 * for, and every one of them still has its keyboard shortcut.
 */

export const ESSENTIALS = [
  {
    id: 'write',
    items: [
      {
        act: 'noteEntry',
        icon: 'ui:wand',
        label: 'Write',
        tip: 'Start writing notes — then type A to G, click the staff, or play your keyboard',
        key: 'N',
        primary: true,
      },
    ],
  },
  {
    id: 'durations',
    label: 'Note length',
    items: [
      { act: 'dur:whole', icon: 'note:whole', tip: 'Whole note (semibreve)', key: '7' },
      { act: 'dur:half', icon: 'note:half', tip: 'Half note (minim)', key: '6' },
      { act: 'dur:quarter', icon: 'note:quarter', tip: 'Quarter note (crotchet)', key: '5' },
      { act: 'dur:eighth', icon: 'note:eighth', tip: 'Eighth note (quaver)', key: '4' },
      { act: 'dur:16th', icon: 'note:16th', tip: 'Sixteenth note (semiquaver)', key: '3' },
      { act: 'dot:1', icon: 'note:quarter:1', tip: 'Dotted — half as long again', key: '.' },
    ],
  },
  {
    id: 'rest',
    items: [
      { act: 'rest', icon: 'glyph:restQuarter', tip: 'Rest — silence for the chosen length', key: '0' },
    ],
  },
  {
    id: 'accidentals',
    label: 'Pitch',
    items: [
      { act: 'acc:-1', icon: 'glyph:accidentalFlat', tip: 'Flat — a semitone lower', key: '-' },
      { act: 'acc:0', icon: 'glyph:accidentalNatural', tip: 'Natural — cancel a sharp or flat', key: '=' },
      { act: 'acc:1', icon: 'glyph:accidentalSharp', tip: 'Sharp — a semitone higher', key: '+' },
    ],
  },
  {
    id: 'join',
    label: 'Join',
    items: [
      { act: 'tie', icon: 'ui:tie', tip: 'Tie — hold the same note into the next one', key: 'T' },
      { act: 'slur', icon: 'ui:slur', tip: 'Slur — play the selected notes smoothly', key: 'S' },
    ],
  },
];

/* Everything else, under a heading that says what it is for. */
export const PALETTES = [
  {
    id: 'marks',
    label: 'Marks',
    tip: 'Articulations and ornaments: how each note is played',
    icon: 'glyph:articStaccato',
    groups: [
      {
        label: 'Articulations',
        items: [
          { act: 'art:staccato', icon: 'glyph:articStaccato', tip: 'Staccato — short and detached', key: 'Shift S' },
          { act: 'art:tenuto', icon: 'glyph:articTenuto', tip: 'Tenuto — held for its full length', key: 'Shift T' },
          { act: 'art:accent', icon: 'glyph:articAccent', tip: 'Accent — struck harder', key: 'Shift V' },
          { act: 'art:marcato', icon: 'glyph:articMarcato', tip: 'Marcato — strongly accented', key: 'Shift M' },
          { act: 'art:staccatissimo', icon: 'glyph:articStaccatissimo', tip: 'Staccatissimo — very short' },
          { act: 'art:fermata', icon: 'glyph:fermata', tip: 'Fermata — pause, held at the player’s discretion', key: ';' },
        ],
      },
      {
        label: 'Ornaments',
        items: [
          { act: 'orn:trill', icon: 'glyph:ornamentTrill', tip: 'Trill — alternate rapidly with the note above', key: 'Shift R' },
          { act: 'orn:mordent', icon: 'glyph:ornamentMordent', tip: 'Mordent — a quick turn to the note above and back' },
          { act: 'orn:mordentLower', icon: 'glyph:ornamentMordentLower', tip: 'Lower mordent — down to the note below and back' },
          { act: 'orn:turn', icon: 'glyph:ornamentTurn', tip: 'Turn — above, the note, below, the note' },
          { act: 'tremolo:3', icon: 'ui:tremolo', tip: 'Tremolo — repeat the note as fast as possible' },
          { act: 'arpeggio', icon: 'ui:arpeggio', tip: 'Arpeggiate — spread the chord from the bottom up' },
        ],
      },
    ],
  },
  {
    id: 'dynamics',
    label: 'Dynamics',
    tip: 'How loud, and where it changes',
    icon: 'dyn:f',
    groups: [
      {
        label: 'Levels',
        items: [
          { act: 'dyn:ppp', icon: 'dyn:ppp', tip: 'Pianississimo — as soft as possible' },
          { act: 'dyn:pp', icon: 'dyn:pp', tip: 'Pianissimo — very soft' },
          { act: 'dyn:p', icon: 'dyn:p', tip: 'Piano — soft' },
          { act: 'dyn:mp', icon: 'dyn:mp', tip: 'Mezzo-piano — moderately soft' },
          { act: 'dyn:mf', icon: 'dyn:mf', tip: 'Mezzo-forte — moderately loud' },
          { act: 'dyn:f', icon: 'dyn:f', tip: 'Forte — loud' },
          { act: 'dyn:ff', icon: 'dyn:ff', tip: 'Fortissimo — very loud' },
          { act: 'dyn:fff', icon: 'dyn:fff', tip: 'Fortississimo — as loud as possible' },
        ],
      },
      {
        label: 'Sudden and gradual',
        items: [
          { act: 'dyn:sfz', icon: 'dyn:sfz', tip: 'Sforzando — a sudden strong accent' },
          { act: 'dyn:fp', icon: 'dyn:fp', tip: 'Fortepiano — loud, then immediately soft' },
          { act: 'hairpin:cresc', icon: 'ui:cresc', tip: 'Crescendo — grow louder across the selection', key: 'H' },
          { act: 'hairpin:dim', icon: 'ui:dim', tip: 'Diminuendo — grow softer across the selection', key: 'Shift H' },
        ],
      },
    ],
  },
  {
    id: 'text',
    label: 'Text',
    tip: 'Words on the score: tempo, expression, lyrics, chords, analysis',
    icon: 'ui:text',
    groups: [
      {
        label: 'Directions',
        items: [
          { act: 'tempoMark', icon: 'ui:tempo', tip: 'Tempo marking — Allegro, Andante, rit., a tempo' },
          { act: 'text:expression', icon: 'ui:text', tip: 'Expression — dolce, cantabile, espressivo', key: 'Ctrl E' },
          { act: 'text:technique', icon: 'ui:wand', tip: 'Technique — pizz., con sord., arco' },
          { act: 'rehearsal', icon: 'ui:text', tip: 'Rehearsal mark — a letter or number to rehearse from' },
        ],
      },
      {
        label: 'Attached to notes',
        items: [
          { act: 'lyric', icon: 'ui:lyric', tip: 'Lyrics — type a syllable, space moves to the next note', key: 'Ctrl L' },
          { act: 'chordSymbol', icon: 'ui:chord', tip: 'Chord symbol — Cmaj7, G7, Am', key: 'Ctrl K' },
          { act: 'roman', icon: 'ui:text', tip: 'Roman numeral — harmonic analysis under the staff' },
          { act: 'figuredBass', icon: 'ui:figures', tip: 'Figured bass — the numerals under a continuo line', key: 'Ctrl G' },
          { act: 'fingering', icon: 'ui:text', tip: 'Fingering — which finger plays the note' },
        ],
      },
    ],
  },
  {
    id: 'rhythm',
    label: 'Rhythm',
    tip: 'Longer and shorter values, tuplets, grace notes, voices',
    icon: 'ui:tuplet',
    groups: [
      {
        label: 'More note lengths',
        items: [
          { act: 'dur:breve', icon: 'note:whole', tip: 'Breve — twice a whole note' },
          { act: 'dur:32nd', icon: 'note:32nd', tip: 'Thirty-second note (demisemiquaver)', key: '2' },
          { act: 'dur:64th', icon: 'note:64th', tip: 'Sixty-fourth note (hemidemisemiquaver)', key: '1' },
          { act: 'dot:2', icon: 'note:quarter:2', tip: 'Double dotted', key: ',' },
        ],
      },
      {
        label: 'Divisions and voices',
        items: [
          { act: 'tuplet:3', icon: 'ui:tuplet', tip: 'Triplet — three in the time of two', key: 'Ctrl 3' },
          { act: 'tuplet:5', icon: 'ui:tuplet', tip: 'Quintuplet — five in the time of four' },
          { act: 'tuplet:6', icon: 'ui:tuplet', tip: 'Sextuplet — six in the time of four' },
          { act: 'grace', icon: 'ui:grace', tip: 'Grace note — an ornament before the beat', key: '/' },
          { act: 'voice', icon: 'ui:voice', tip: 'Next voice — independent rhythms on one staff', key: 'Ctrl Alt V' },
        ],
      },
    ],
  },
  {
    id: 'spelling',
    label: 'Spelling',
    tip: 'Double accidentals and enharmonic respelling',
    icon: 'glyph:accidentalDoubleSharp',
    groups: [
      {
        label: 'Accidentals',
        items: [
          { act: 'acc:-2', icon: 'glyph:accidentalDoubleFlat', tip: 'Double flat — a whole tone lower' },
          { act: 'acc:2', icon: 'glyph:accidentalDoubleSharp', tip: 'Double sharp — a whole tone higher' },
          { act: 'respell', icon: 'ui:concert', tip: 'Respell — the same sound written the other way (F♯ / G♭)', key: 'J' },
        ],
      },
      {
        label: 'Octave lines',
        items: [
          { act: 'octave:up', icon: 'ui:octave', tip: '8va — written an octave lower than it sounds' },
          { act: 'octave:down', icon: 'ui:octave', tip: '8vb — written an octave higher than it sounds' },
          { act: 'pedal', icon: 'ui:pedal', tip: 'Sustain pedal line' },
        ],
      },
    ],
  },
  {
    id: 'bars',
    label: 'Bars & keys',
    tip: 'Measures, time signatures, key signatures, clefs',
    icon: 'glyph:timeSigCommon',
    groups: [
      {
        label: 'Measures',
        items: [
          { act: 'insertMeasure', icon: 'ui:insertBar', tip: 'Insert a measure before the selection', key: 'Ctrl Ins' },
          { act: 'appendMeasure', icon: 'ui:plus', tip: 'Add a measure at the end', key: 'Ctrl B' },
          { act: 'deleteMeasure', icon: 'ui:deleteBar', tip: 'Delete the selected measures', key: 'Ctrl Del' },
          { act: 'systemBreak', icon: 'ui:insertBar', tip: 'Start a new system here' },
          { act: 'barline', icon: 'ui:clef', tip: 'Barline style — double, final, repeat' },
        ],
      },
      {
        label: 'Signatures',
        items: [
          { act: 'timeSig', icon: 'glyph:timeSigCommon', tip: 'Time signature — from this bar onward' },
          { act: 'keySig', icon: 'glyph:accidentalSharp', tip: 'Key signature — from this bar onward' },
          { act: 'clef', icon: 'glyph:gClef', tip: 'Clef — from this bar onward' },
        ],
      },
    ],
  },
  {
    id: 'score',
    label: 'Score',
    tip: 'Instruments, parts, and how the score is shown',
    icon: 'ui:parts',
    groups: [
      {
        label: 'Instruments',
        items: [
          { act: 'addInstrument', icon: 'ui:plus', tip: 'Add an instrument to the score', wide: true, label: 'Add instrument' },
          { act: 'partView', icon: 'ui:parts', tip: 'Switch between the full score and one part', wide: true, label: 'Full score' },
        ],
      },
      {
        label: 'How it is shown',
        items: [
          { act: 'concertPitch', icon: 'ui:concert', tip: 'Concert pitch — show transposing instruments at sounding pitch', wide: true, label: 'Concert pitch' },
          { act: 'multiBarRests', icon: 'ui:multirest', tip: 'Collapse runs of empty bars into multi-bar rests (always on in parts)', wide: true, label: 'Multi-bar rests' },
        ],
      },
    ],
  },
];

/** Every action on the bar or in a palette, for tooltips and the shortcut list. */
export function allItems() {
  const out = [];
  for (const g of ESSENTIALS) out.push(...g.items);
  for (const p of PALETTES) for (const g of p.groups) out.push(...g.items);
  return out;
}

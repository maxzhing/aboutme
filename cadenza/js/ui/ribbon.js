/* Cadenza — the ribbon definition.
 *
 * Every command a composer needs day to day is on this bar, labelled and
 * grouped, so nothing important is hidden inside a menu.
 */

export const RIBBON = [
  {
    id: 'durations',
    label: 'Note value',
    items: [
      { act: 'dur:whole', icon: 'note:whole', tip: 'Whole note', key: '7' },
      { act: 'dur:half', icon: 'note:half', tip: 'Half note', key: '6' },
      { act: 'dur:quarter', icon: 'note:quarter', tip: 'Quarter note', key: '5' },
      { act: 'dur:eighth', icon: 'note:eighth', tip: 'Eighth note', key: '4' },
      { act: 'dur:16th', icon: 'note:16th', tip: 'Sixteenth note', key: '3' },
      { act: 'dur:32nd', icon: 'note:32nd', tip: 'Thirty-second note', key: '2' },
      { act: 'dur:64th', icon: 'note:64th', tip: 'Sixty-fourth note', key: '1' },
      { sep: true },
      { act: 'dot:1', icon: 'note:quarter:1', tip: 'Dotted', key: '.' },
      { act: 'dot:2', icon: 'note:quarter:2', tip: 'Double dotted', key: ',' },
    ],
  },
  {
    id: 'entry',
    label: 'Entry',
    items: [
      { act: 'noteEntry', icon: 'ui:wand', tip: 'Note input mode — then type A–G or click the staff', key: 'N', wide: true, label: 'Input' },
      { act: 'rest', icon: 'glyph:restQuarter', tip: 'Insert rest', key: '0' },
      { act: 'tie', icon: 'ui:tie', tip: 'Tie to next note', key: 'T' },
      { act: 'slur', icon: 'ui:slur', tip: 'Slur across the selection', key: 'S' },
      { act: 'grace', icon: 'ui:grace', tip: 'Make grace note', key: '/' },
      { sep: true },
      { act: 'tuplet:3', icon: 'ui:tuplet', tip: 'Triplet', key: 'Ctrl 3' },
      { act: 'voice', icon: 'ui:voice', tip: 'Cycle voice 1–4 (independent rhythms on one staff)', key: 'Ctrl Alt V' },
    ],
  },
  {
    id: 'accidentals',
    label: 'Accidentals',
    items: [
      { act: 'acc:-2', icon: 'glyph:accidentalDoubleFlat', tip: 'Double flat' },
      { act: 'acc:-1', icon: 'glyph:accidentalFlat', tip: 'Flat', key: '-' },
      { act: 'acc:0', icon: 'glyph:accidentalNatural', tip: 'Natural', key: '=' },
      { act: 'acc:1', icon: 'glyph:accidentalSharp', tip: 'Sharp', key: '+' },
      { act: 'acc:2', icon: 'glyph:accidentalDoubleSharp', tip: 'Double sharp' },
      { act: 'respell', icon: 'ui:concert', tip: 'Respell enharmonically', key: 'J' },
    ],
  },
  {
    id: 'articulations',
    label: 'Articulations',
    items: [
      { act: 'art:staccato', icon: 'glyph:articStaccato', tip: 'Staccato', key: 'Shift S' },
      { act: 'art:tenuto', icon: 'glyph:articTenuto', tip: 'Tenuto', key: 'Shift T' },
      { act: 'art:accent', icon: 'glyph:articAccent', tip: 'Accent', key: 'Shift V' },
      { act: 'art:marcato', icon: 'glyph:articMarcato', tip: 'Marcato', key: 'Shift M' },
      { act: 'art:staccatissimo', icon: 'glyph:articStaccatissimo', tip: 'Staccatissimo' },
      { act: 'art:fermata', icon: 'glyph:fermata', tip: 'Fermata', key: ';' },
    ],
  },
  {
    id: 'ornaments',
    label: 'Ornaments',
    items: [
      { act: 'orn:trill', icon: 'glyph:ornamentTrill', tip: 'Trill', key: 'Shift R' },
      { act: 'orn:mordent', icon: 'glyph:ornamentMordent', tip: 'Mordent' },
      { act: 'orn:mordentLower', icon: 'glyph:ornamentMordentLower', tip: 'Lower mordent' },
      { act: 'orn:turn', icon: 'glyph:ornamentTurn', tip: 'Turn' },
      { act: 'tremolo:3', icon: 'ui:tremolo', tip: 'Tremolo' },
      { act: 'arpeggio', icon: 'ui:arpeggio', tip: 'Arpeggiate chord' },
    ],
  },
  {
    id: 'dynamics',
    label: 'Dynamics',
    items: [
      { act: 'dyn:ppp', icon: 'dyn:ppp', tip: 'Pianississimo' },
      { act: 'dyn:pp', icon: 'dyn:pp', tip: 'Pianissimo' },
      { act: 'dyn:p', icon: 'dyn:p', tip: 'Piano' },
      { act: 'dyn:mp', icon: 'dyn:mp', tip: 'Mezzo-piano' },
      { act: 'dyn:mf', icon: 'dyn:mf', tip: 'Mezzo-forte' },
      { act: 'dyn:f', icon: 'dyn:f', tip: 'Forte' },
      { act: 'dyn:ff', icon: 'dyn:ff', tip: 'Fortissimo' },
      { act: 'dyn:fff', icon: 'dyn:fff', tip: 'Fortississimo' },
      { sep: true },
      { act: 'dyn:sfz', icon: 'dyn:sfz', tip: 'Sforzando' },
      { act: 'dyn:fp', icon: 'dyn:fp', tip: 'Fortepiano' },
      { act: 'hairpin:cresc', icon: 'ui:cresc', tip: 'Crescendo over the selection', key: 'H' },
      { act: 'hairpin:dim', icon: 'ui:dim', tip: 'Diminuendo over the selection', key: 'Shift H' },
    ],
  },
  {
    id: 'text',
    label: 'Text',
    items: [
      { act: 'tempoMark', icon: 'ui:tempo', tip: 'Tempo marking' },
      { act: 'text:expression', icon: 'ui:text', tip: 'Expression text (dolce, cantabile…)', key: 'Ctrl E' },
      { act: 'text:technique', icon: 'ui:wand', tip: 'Technique text (pizz., con sord.…)' },
      { act: 'lyric', icon: 'ui:lyric', tip: 'Lyrics — type a syllable, space for the next note', key: 'Ctrl L' },
      { act: 'chordSymbol', icon: 'ui:chord', tip: 'Chord symbol', key: 'Ctrl K' },
      { act: 'roman', icon: 'ui:text', tip: 'Roman numeral analysis' },
      { act: 'figuredBass', icon: 'ui:figures', tip: 'Figured bass', key: 'Ctrl G' },
      { act: 'fingering', icon: 'ui:text', tip: 'Fingering' },
      { act: 'rehearsal', icon: 'ui:text', tip: 'Rehearsal mark' },
    ],
  },
  {
    id: 'lines',
    label: 'Lines',
    items: [
      { act: 'octave:up', icon: 'ui:octave', tip: '8va — sounds an octave higher' },
      { act: 'octave:down', icon: 'ui:octave', tip: '8vb — sounds an octave lower' },
      { act: 'pedal', icon: 'ui:pedal', tip: 'Sustain pedal' },
    ],
  },
  {
    id: 'bars',
    label: 'Measures & keys',
    items: [
      { act: 'insertMeasure', icon: 'ui:insertBar', tip: 'Insert measure before the selection', key: 'Ctrl Ins' },
      { act: 'appendMeasure', icon: 'ui:plus', tip: 'Add measure at the end', key: 'Ctrl B' },
      { act: 'deleteMeasure', icon: 'ui:deleteBar', tip: 'Delete selected measures', key: 'Ctrl Del' },
      { sep: true },
      { act: 'timeSig', icon: 'glyph:timeSigCommon', tip: 'Time signature' },
      { act: 'keySig', icon: 'glyph:accidentalSharp', tip: 'Key signature' },
      { act: 'clef', icon: 'glyph:gClef', tip: 'Clef' },
      { act: 'barline', icon: 'ui:clef', tip: 'Barline style' },
      { act: 'systemBreak', icon: 'ui:insertBar', tip: 'Break the system here' },
    ],
  },
  {
    id: 'view',
    label: 'View',
    items: [
      { act: 'concertPitch', icon: 'ui:concert', tip: 'Concert pitch — show transposing instruments at sounding pitch', wide: true, label: 'Concert' },
      { act: 'partView', icon: 'ui:parts', tip: 'Switch between the full score and individual parts', wide: true, label: 'Score' },
      { act: 'multiBarRests', icon: 'ui:multirest', tip: 'Collapse runs of empty bars into multi-bar rests (always on in parts)', wide: true, label: 'Bar rests' },
      { act: 'addInstrument', icon: 'ui:plus', tip: 'Add an instrument', wide: true, label: 'Instrument' },
    ],
  },
];

/* Cadenza — instrument catalogue.
 *
 * `transpose` is the interval from written to sounding pitch, matching the
 * MusicXML convention: a B-flat clarinet's written C sounds a B-flat below,
 * so its chromatic value is -2.
 */

export const FAMILIES = ['Keyboard', 'Woodwind', 'Brass', 'Percussion', 'Strings', 'Voice', 'Guitar'];

function inst(o) {
  return {
    clef: 'treble', transpose: { chromatic: 0, diatonic: 0 }, staves: 1,
    pitched: true, voices: 1, ...o,
  };
}

export const INSTRUMENTS = [
  /* Keyboard ------------------------------------------------------------- */
  inst({ id: 'piano', name: 'Piano', abbrev: 'Pno.', family: 'Keyboard', program: 0,
    staves: 2, clef: 'treble', clef2: 'bass', range: [21, 108], synth: 'piano' }),
  inst({ id: 'celesta', name: 'Celesta', abbrev: 'Cel.', family: 'Keyboard', program: 8,
    staves: 2, clef2: 'bass', range: [60, 108], synth: 'bell' }),
  inst({ id: 'harpsichord', name: 'Harpsichord', abbrev: 'Hpschd.', family: 'Keyboard',
    program: 6, staves: 2, clef2: 'bass', range: [29, 89], synth: 'pluck' }),
  inst({ id: 'organ', name: 'Pipe Organ', abbrev: 'Org.', family: 'Keyboard', program: 19,
    staves: 2, clef2: 'bass', range: [36, 96], synth: 'organ' }),
  inst({ id: 'harp', name: 'Harp', abbrev: 'Hp.', family: 'Keyboard', program: 46,
    staves: 2, clef2: 'bass', range: [24, 104], synth: 'pluck' }),

  /* Woodwind ------------------------------------------------------------- */
  inst({ id: 'piccolo', name: 'Piccolo', abbrev: 'Picc.', family: 'Woodwind', program: 72,
    transpose: { chromatic: 12, diatonic: 7 }, range: [62, 96], synth: 'flute' }),
  inst({ id: 'flute', name: 'Flute', abbrev: 'Fl.', family: 'Woodwind', program: 73,
    range: [59, 96], synth: 'flute' }),
  inst({ id: 'oboe', name: 'Oboe', abbrev: 'Ob.', family: 'Woodwind', program: 68,
    range: [58, 91], synth: 'oboe' }),
  inst({ id: 'englishhorn', name: 'English Horn', abbrev: 'E. Hn.', family: 'Woodwind',
    program: 69, transpose: { chromatic: -7, diatonic: -4 }, range: [52, 83], synth: 'oboe' }),
  inst({ id: 'clarinet', name: 'Clarinet in B♭', abbrev: 'Cl.', family: 'Woodwind',
    program: 71, transpose: { chromatic: -2, diatonic: -1 }, range: [50, 94], synth: 'clarinet' }),
  inst({ id: 'bassclarinet', name: 'Bass Clarinet', abbrev: 'B. Cl.', family: 'Woodwind',
    program: 71, transpose: { chromatic: -14, diatonic: -8 }, range: [50, 86], synth: 'clarinet' }),
  inst({ id: 'bassoon', name: 'Bassoon', abbrev: 'Bsn.', family: 'Woodwind', program: 70,
    clef: 'bass', range: [34, 75], synth: 'bassoon' }),
  inst({ id: 'contrabassoon', name: 'Contrabassoon', abbrev: 'Cbsn.', family: 'Woodwind',
    program: 70, clef: 'bass', transpose: { chromatic: -12, diatonic: -7 }, range: [34, 69],
    synth: 'bassoon' }),
  inst({ id: 'altosax', name: 'Alto Saxophone', abbrev: 'A. Sax.', family: 'Woodwind',
    program: 65, transpose: { chromatic: -9, diatonic: -5 }, range: [49, 81], synth: 'sax' }),
  inst({ id: 'tenorsax', name: 'Tenor Saxophone', abbrev: 'T. Sax.', family: 'Woodwind',
    program: 66, transpose: { chromatic: -14, diatonic: -8 }, range: [49, 81], synth: 'sax' }),
  inst({ id: 'sopranosax', name: 'Soprano Saxophone', abbrev: 'S. Sax.', family: 'Woodwind',
    program: 64, transpose: { chromatic: -2, diatonic: -1 }, range: [52, 84], synth: 'sax' }),
  inst({ id: 'barisax', name: 'Baritone Saxophone', abbrev: 'Bari. Sax.', family: 'Woodwind',
    program: 67, transpose: { chromatic: -21, diatonic: -12 }, range: [49, 79], synth: 'sax' }),
  inst({ id: 'recorder', name: 'Recorder', abbrev: 'Rec.', family: 'Woodwind', program: 74,
    range: [60, 96], synth: 'flute' }),

  /* Brass ---------------------------------------------------------------- */
  inst({ id: 'horn', name: 'Horn in F', abbrev: 'Hn.', family: 'Brass', program: 60,
    transpose: { chromatic: -7, diatonic: -4 }, range: [41, 89], synth: 'horn' }),
  inst({ id: 'trumpet', name: 'Trumpet in B♭', abbrev: 'Tpt.', family: 'Brass', program: 56,
    transpose: { chromatic: -2, diatonic: -1 }, range: [54, 86], synth: 'trumpet' }),
  inst({ id: 'cornet', name: 'Cornet', abbrev: 'Cnt.', family: 'Brass', program: 56,
    transpose: { chromatic: -2, diatonic: -1 }, range: [54, 84], synth: 'trumpet' }),
  inst({ id: 'trombone', name: 'Trombone', abbrev: 'Tbn.', family: 'Brass', program: 57,
    clef: 'bass', range: [40, 77], synth: 'trombone' }),
  inst({ id: 'basstrombone', name: 'Bass Trombone', abbrev: 'B. Tbn.', family: 'Brass',
    program: 57, clef: 'bass', range: [34, 72], synth: 'trombone' }),
  inst({ id: 'tuba', name: 'Tuba', abbrev: 'Tba.', family: 'Brass', program: 58,
    clef: 'bass', range: [28, 65], synth: 'tuba' }),
  inst({ id: 'euphonium', name: 'Euphonium', abbrev: 'Euph.', family: 'Brass', program: 58,
    clef: 'bass', range: [34, 75], synth: 'tuba' }),

  /* Percussion ----------------------------------------------------------- */
  inst({ id: 'timpani', name: 'Timpani', abbrev: 'Timp.', family: 'Percussion', program: 47,
    clef: 'bass', range: [40, 55], synth: 'timpani' }),
  inst({ id: 'glockenspiel', name: 'Glockenspiel', abbrev: 'Glock.', family: 'Percussion',
    program: 9, transpose: { chromatic: 24, diatonic: 14 }, range: [79, 108], synth: 'bell' }),
  inst({ id: 'xylophone', name: 'Xylophone', abbrev: 'Xyl.', family: 'Percussion', program: 13,
    transpose: { chromatic: 12, diatonic: 7 }, range: [65, 108], synth: 'mallet' }),
  inst({ id: 'marimba', name: 'Marimba', abbrev: 'Mar.', family: 'Percussion', program: 12,
    staves: 2, clef2: 'bass', range: [45, 96], synth: 'mallet' }),
  inst({ id: 'vibraphone', name: 'Vibraphone', abbrev: 'Vib.', family: 'Percussion', program: 11,
    range: [53, 89], synth: 'bell' }),
  inst({ id: 'tubularbells', name: 'Tubular Bells', abbrev: 'Tub. B.', family: 'Percussion',
    program: 14, range: [60, 89], synth: 'bell' }),
  inst({ id: 'percussion', name: 'Percussion', abbrev: 'Perc.', family: 'Percussion',
    program: 0, clef: 'percussion', pitched: false, range: [35, 81], synth: 'drums' }),
  inst({ id: 'snaredrum', name: 'Snare Drum', abbrev: 'S. D.', family: 'Percussion',
    program: 0, clef: 'percussion', pitched: false, range: [38, 38], synth: 'drums' }),
  inst({ id: 'bassdrum', name: 'Bass Drum', abbrev: 'B. D.', family: 'Percussion',
    program: 0, clef: 'percussion', pitched: false, range: [35, 36], synth: 'drums' }),
  inst({ id: 'cymbals', name: 'Cymbals', abbrev: 'Cym.', family: 'Percussion',
    program: 0, clef: 'percussion', pitched: false, range: [49, 57], synth: 'drums' }),
  inst({ id: 'drumset', name: 'Drum Set', abbrev: 'D. S.', family: 'Percussion',
    program: 0, clef: 'percussion', pitched: false, range: [35, 59], synth: 'drums' }),

  /* Strings -------------------------------------------------------------- */
  inst({ id: 'violin', name: 'Violin', abbrev: 'Vln.', family: 'Strings', program: 40,
    range: [55, 100], synth: 'violin' }),
  inst({ id: 'violin2', name: 'Violin II', abbrev: 'Vln. II', family: 'Strings', program: 40,
    range: [55, 100], synth: 'violin' }),
  inst({ id: 'viola', name: 'Viola', abbrev: 'Vla.', family: 'Strings', program: 41,
    clef: 'alto', range: [48, 88], synth: 'viola' }),
  inst({ id: 'cello', name: 'Violoncello', abbrev: 'Vc.', family: 'Strings', program: 42,
    clef: 'bass', range: [36, 81], synth: 'cello' }),
  inst({ id: 'contrabass', name: 'Double Bass', abbrev: 'Cb.', family: 'Strings', program: 43,
    clef: 'bass', transpose: { chromatic: -12, diatonic: -7 }, range: [40, 67], synth: 'bass' }),
  inst({ id: 'strings', name: 'String Ensemble', abbrev: 'Str.', family: 'Strings', program: 48,
    staves: 2, clef2: 'bass', range: [36, 96], synth: 'strings' }),

  /* Voice & guitar -------------------------------------------------------- */
  inst({ id: 'soprano', name: 'Soprano', abbrev: 'S.', family: 'Voice', program: 52,
    range: [60, 84], synth: 'voice' }),
  inst({ id: 'alto_v', name: 'Alto', abbrev: 'A.', family: 'Voice', program: 52,
    range: [53, 79], synth: 'voice' }),
  inst({ id: 'tenor_v', name: 'Tenor', abbrev: 'T.', family: 'Voice', program: 52,
    clef: 'treble8vb', range: [48, 72], synth: 'voice' }),
  inst({ id: 'bass_v', name: 'Bass', abbrev: 'B.', family: 'Voice', program: 52,
    clef: 'bass', range: [40, 64], synth: 'voice' }),
  inst({ id: 'guitar', name: 'Guitar', abbrev: 'Gtr.', family: 'Guitar', program: 24,
    clef: 'treble8vb', range: [40, 84], synth: 'pluck' }),
  inst({ id: 'electricbass', name: 'Electric Bass', abbrev: 'E. Bass', family: 'Guitar',
    program: 33, clef: 'bass', transpose: { chromatic: -12, diatonic: -7 }, range: [40, 67],
    synth: 'bass' }),
];

export const INSTRUMENT_BY_ID = Object.fromEntries(INSTRUMENTS.map((i) => [i.id, i]));

export function getInstrument(id) {
  return INSTRUMENT_BY_ID[id] || INSTRUMENT_BY_ID.piano;
}

/** Ready-made ensembles offered in the new-score dialog. */
export const ENSEMBLES = [
  { id: 'piano', name: 'Solo Piano', parts: ['piano'] },
  { id: 'leadsheet', name: 'Lead Sheet', parts: ['soprano'] },
  { id: 'pianovoice', name: 'Voice & Piano', parts: ['soprano', 'piano'] },
  { id: 'quartet', name: 'String Quartet', parts: ['violin', 'violin2', 'viola', 'cello'] },
  { id: 'strings', name: 'String Orchestra', parts: ['violin', 'violin2', 'viola', 'cello', 'contrabass'] },
  { id: 'windquintet', name: 'Wind Quintet', parts: ['flute', 'oboe', 'clarinet', 'horn', 'bassoon'] },
  { id: 'brassquintet', name: 'Brass Quintet', parts: ['trumpet', 'cornet', 'horn', 'trombone', 'tuba'] },
  { id: 'satb', name: 'SATB Choir', parts: ['soprano', 'alto_v', 'tenor_v', 'bass_v'] },
  { id: 'jazz', name: 'Jazz Combo', parts: ['trumpet', 'tenorsax', 'piano', 'electricbass', 'drumset'] },
  {
    id: 'orchestra', name: 'Full Orchestra',
    parts: ['piccolo', 'flute', 'oboe', 'clarinet', 'bassoon', 'horn', 'trumpet', 'trombone',
      'tuba', 'timpani', 'percussion', 'violin', 'violin2', 'viola', 'cello', 'contrabass'],
  },
];

/** Score-order rank so added instruments sort into conventional order. */
const ORDER = ['piccolo', 'flute', 'oboe', 'englishhorn', 'clarinet', 'bassclarinet', 'bassoon',
  'contrabassoon', 'sopranosax', 'altosax', 'tenorsax', 'barisax', 'recorder', 'horn', 'trumpet',
  'cornet', 'trombone', 'basstrombone', 'euphonium', 'tuba', 'timpani', 'percussion', 'snaredrum',
  'bassdrum', 'cymbals', 'drumset', 'glockenspiel', 'xylophone', 'vibraphone', 'marimba',
  'tubularbells', 'harp', 'celesta', 'harpsichord', 'organ', 'piano', 'soprano', 'alto_v',
  'tenor_v', 'bass_v', 'guitar', 'electricbass', 'violin', 'violin2', 'viola', 'cello',
  'contrabass', 'strings'];

export function scoreOrder(id) {
  const i = ORDER.indexOf(id);
  return i < 0 ? 999 : i;
}

/** Instrument-family bracketing used when drawing a system. */
export function bracketGroups(parts) {
  const groups = [];
  let i = 0;
  while (i < parts.length) {
    const fam = getInstrument(parts[i].instrumentId).family;
    let j = i;
    while (j + 1 < parts.length && getInstrument(parts[j + 1].instrumentId).family === fam) j++;
    if (j > i && fam !== 'Keyboard') groups.push({ start: i, end: j, type: 'bracket' });
    i = j + 1;
  }
  return groups;
}

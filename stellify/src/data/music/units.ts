import type { CalcUnit } from '../calc/types';

/**
 * AP Music Theory, in the eight units of the College Board course. The College Board does not publish
 * exam weights by unit for this course (it weights skills instead), so no percentages are shown.
 */
export const MUSIC_UNITS: CalcUnit[] = [
  { n: 1, title: 'Music Fundamentals I: Pitch, Major Scales and Key Signatures, Rhythm, Meter, and Expressive Elements', weeks: 3, examWeight: '', summary: 'Reading pitch in treble, bass and C clefs, half and whole steps, major scales and key signatures, and the rhythm, meter, tempo, dynamics and articulation that bring notation to life.',
    topics: ['Pitch and pitch notation', 'Half steps, whole steps and accidentals', 'Major scales and scale degrees', 'Major key signatures and the circle of fifths', 'Rhythm, note values and meter', 'Tempo, dynamics and articulation'] },
  { n: 2, title: 'Music Fundamentals II: Minor Scales and Key Signatures, Melody, Timbre, and Texture', weeks: 4, examWeight: '', summary: 'The three forms of minor, minor key signatures, other scales, intervals by size and quality, how melodies are shaped, transposing instruments, and the textures and rhythmic devices music is built from.',
    topics: ['Minor scales: natural, harmonic, melodic', 'Relative and parallel keys; minor key signatures', 'Chromatic, whole-tone and pentatonic scales', 'Interval size and quality', 'Interval inversion and compound intervals', 'Transposing instruments and timbre', 'Melodic features and melodic transposition', 'Texture types, texture devices and rhythmic devices'] },
  { n: 3, title: 'Music Fundamentals III: Triads and Seventh Chords', weeks: 3, examWeight: '', summary: 'The four triad qualities, the five seventh chords, inversions and figured bass, and Roman numerals for the diatonic chords of major and minor keys.',
    topics: ['Triad and chord qualities', 'Chord inversions and figured bass', 'Seventh chords and their inversions', 'Diatonic chords and Roman numerals'] },
  { n: 4, title: 'Harmony and Voice Leading I: Chord Function, Cadence, and Phrase', weeks: 4, examWeight: '', summary: 'Writing four-part (SATB) harmony: ranges, spacing and doubling, smooth voice leading without parallel fifths and octaves, harmonic function, and the cadences that end phrases.',
    topics: ['SATB ranges, spacing and doubling', 'Types of motion and parallel perfect intervals', 'Harmonic function: tonic, predominant, dominant', 'Root-position progressions', 'Cadences', 'Phrases'] },
  { n: 5, title: 'Harmony and Voice Leading II: Chord Progressions and Predominant Function', weeks: 3, examWeight: '', summary: 'Predominant chords and first inversions, the dominant seventh and how its tendency tones resolve, and the four kinds of six-four chord.',
    topics: ['Predominant chords (IV, ii, ii6, ii7)', 'First-inversion chords', 'The dominant seventh and its inversions', 'Resolving tendency tones', 'Cadential, passing, pedal and arpeggiating six-four chords'] },
  { n: 6, title: 'Harmony and Voice Leading III: Embellishments, Motives, and Melodic Devices', weeks: 3, examWeight: '', summary: 'Non-chord tones (passing, neighbor, appoggiatura, escape tone, anticipation, suspension, retardation, pedal point) and how composers develop motives with sequence and transformation.',
    topics: ['Passing and neighbor tones', 'Appoggiaturas, escape tones and anticipations', 'Suspensions, retardations and pedal points', 'Motive and motivic transformation', 'Melodic and harmonic sequence'] },
  { n: 7, title: 'Harmony and Voice Leading IV: Secondary Function', weeks: 3, examWeight: '', summary: 'Secondary (applied) dominants and leading-tone chords, tonicization, and modulation to closely related keys by pivot chord.',
    topics: ['Secondary dominant chords', 'Secondary dominant seventh chords', 'Secondary leading-tone chords', 'Tonicization', 'Closely related keys and modulation'] },
  { n: 8, title: 'Modes and Form', weeks: 3, examWeight: '', summary: 'The seven diatonic modes, how phrases combine into periods and phrase groups, the common forms (binary, ternary, strophic, through-composed, rondo, variations), and the aural skills the exam tests.',
    topics: ['The diatonic modes', 'Phrase relationships: periods and phrase groups', 'Binary, rounded binary and ternary form', 'Other common forms', 'Melodic and harmonic dictation', 'Sight-singing and the AP exam'] },
];

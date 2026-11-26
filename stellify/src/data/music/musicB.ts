import type { CalcLesson, LessonTutor } from '../calc/types';
import { MC, NOTE, P, TASK, hear, notes } from './lib';
import {
  SEVENTH_FIG, TRIAD_FIG, chord, diatonicChord, identify, invert, isConsonant, ivName, parseRoman, pc, romanOf, scale, semitones, spell, transpose,
  type Key,
} from '../../lib/music/theory';
import { chordTask, intervalTask, romanTask } from '../../lib/music/tasks';

const K = (tonic: string, mode: 'major' | 'minor' = 'major'): Key => ({ tonic, mode });
const C = K('C'), a = K('A', 'minor');
const ch = (root: string, q: Parameters<typeof chord>[1]) => chord(root, q).map(spell);
/** the diatonic triads of a key, written from the tonic in octave 4 (or octave 3 with low = true) */
const diaRow = (k: Key, low = false) => [1, 2, 3, 4, 5, 6, 7].map((d) => { const x = diatonicChord(k, d); return chord(low ? transpose(x.root, 'P8', true) : x.root, x.q).map(spell); });

/** AP Music Theory, Unit 2 (intervals, topics 2.5–2.6) and Unit 3. Original lessons and problems; every computable answer is checked by the music engine. */
export const MUSIC_B: CalcLesson[] = [
  {
    id: 'mt2-3', unit: 2, n: 3, title: 'Intervals: size and quality',
    intro: 'Intervals are the atoms of harmony: every chord and every melody is made of them. Today you learn to name any interval with two pieces of information, its size (a number found by counting letters) and its quality (perfect, major, minor, augmented or diminished).',
    goals: ['Find an interval\'s size by counting letter names', 'Find its quality with the major-scale method', 'Write intervals above and below a note', 'Recognize common intervals by ear'],
    notes: [
      { k: 'p', t: 'An **interval** is the distance between two pitches: **melodic** if they sound one after the other, **harmonic** if they sound together. Its **size** is the number of letter names it spans, counting both notes: C up to E is C-D-E, a **3rd**.' },
      { k: 'rule', title: 'Qualities', t: 'Unisons, 4ths, 5ths and octaves are **perfect**. 2nds, 3rds, 6ths and 7ths are **major** or **minor** (minor is a half step smaller). One half step larger than perfect or major is **augmented**; one half step smaller than perfect or minor is **diminished**.' },
      { k: 'staff', staff: notes('treble', [['C4', 'Db4'], ['C4', 'D4'], ['C4', 'Eb4'], ['C4', 'E4'], ['C4', 'F4'], ['C4', 'F#4'], ['C4', 'G4'], ['C4', 'Ab4'], ['C4', 'A4'], ['C4', 'Bb4'], ['C4', 'B4'], ['C4', 'C5']], 'Every interval above C4, from minor 2nd to octave', { above: ['m2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'] }), caption: 'Intervals above C4, with half steps: m2 1, M2 2, m3 3, M3 4, P4 5, A4 6, P5 7, m6 8, M6 9, m7 10, M7 11, P8 12.' },
      { k: 'rule', title: 'The major-scale method', t: 'Treat the lower note as a major-key tonic. If the upper note is in that major scale, the interval is **major** (2, 3, 6, 7) or **perfect** (1, 4, 5, 8). Then adjust: a half step smaller turns major into minor; a half step larger turns major or perfect into augmented; a half step smaller than minor or perfect is diminished.' },
      { k: 'warn', t: 'Count the letters first, quality second. C up to D♯ is an **augmented 2nd** (two letters, C and D) even though it sounds like C up to E♭, a **minor 3rd**.' },
      { k: 'tip', t: 'The **tritone** (augmented 4th or diminished 5th, six half steps) splits the octave exactly in half. F up to B is the tritone in C major.' },
      { k: 'try', prompt: 'E4 is written for you. Add the note a **minor 6th above** it.', task: intervalTask('E4', 'm6') },
    ],
    examples: [
      { q: 'Name the interval from F up to B.', staff: notes('treble', [['F4', 'B4']], 'F4 and B4 together'), steps: ['Count letters: F G A B is four letters, so it is a 4th.', 'In F major, the 4th degree is B♭, so F–B♭ is a perfect 4th.', 'B is a half step larger than B♭, so F–B is an augmented 4th (a tritone).'], a: 'Augmented 4th' },
      { q: 'Name the interval from D up to C.', steps: ['Count letters: D E F G A B C is seven letters, so it is a 7th.', 'In D major, the 7th degree is C♯, so D–C♯ is a major 7th.', 'C is a half step smaller than C♯, so D–C is a minor 7th.'], a: 'Minor 7th' },
    ],
    practice: [
      MC('mt2-3-1', 1, 'Name this harmonic interval.', ['M3', 'P4', 'm3', 'm2'], 2, 'E to G: count letters, then half steps.', ['E F G is three letters: a 3rd. E to G is three half steps, so it is a minor 3rd.'], { staff: notes('treble', [['E4', 'G4']], 'E4 and G4 together'), check: () => ivName('E4', 'G4') === 'm3' }),
      TASK('mt2-3-2', 1, 'F4 is written for you. Add the note a **major 3rd above** it.', intervalTask('F4', 'M3'), 'In F major, the 3rd degree is…', ['F G A is three letters, so the note is some kind of A.', 'In F major the 3rd is A (no accidental), so a major 3rd above F4 is A4.']),
      P('mt2-3-3', 1, 'How many half steps are in a **perfect 5th**?', ['7'], 'C up to G on the keyboard.', ['From C to G: C♯, D, D♯, E, F, F♯, G is seven half steps.'], { check: () => semitones('P5') === 7 }),
      TASK('mt2-3-4', 2, 'B4 is written for you. Add the note a **diminished 5th above** it.', intervalTask('B4', 'd5'), 'B major\'s 5th degree is F♯; shrink it by a half step.', ['A 5th above B uses the letter F.', 'In B major the 5th is F♯ (perfect 5th). A half step smaller is F♮, so a diminished 5th above B4 is F5.']),
      MC('mt2-3-5', 2, 'Which interval sounds the same as a minor 3rd but is spelled with neighbouring letters?', ['Diminished 4th', 'Augmented 2nd', 'Major 2nd', 'Augmented 3rd'], 1, 'Neighbouring letters make a 2nd.', ['Neighbouring letters make a 2nd. A 2nd with three half steps (like E♭ up to F♯) is an augmented 2nd, which sounds the same as a minor 3rd.'], { check: () => semitones('A2') === semitones('m3') && ivName('Eb4', 'F#4') === 'A2' }),
      MC('mt2-3-6', 2, 'Name this melodic interval.', ['m6', 'M6', 'A5', 'm7'], 1, 'A♭ up to F: count letters, then compare with A♭ major.', ['A♭ B C D E F is six letters: a 6th.', 'In A♭ major the 6th degree is F, so A♭–F is a major 6th.'], { staff: notes('treble', ['Ab4', 'F5'], 'A-flat 4 then F5'), check: () => ivName('Ab4', 'F5') === 'M6' }),
      TASK('mt2-3-7', 3, 'G4 is written for you. Add the note a **minor 7th below** it.', intervalTask('G4', 'm7', 'treble', true), 'A 7th below G uses the letter A. Which A makes a minor 7th?', ['Seven letters down from G: G F E D C B A, so the note is an A.', 'A up to G: in A major the 7th is G♯ (major 7th); G is a half step smaller, so A–G is a minor 7th.', 'The answer is A3, two ledger lines below the treble staff.']),
      MC('mt2-3-8', 2, 'Listen to the two notes (one after the other, then together). Which interval is it?', ['Major 3rd', 'Perfect 4th', 'Perfect 5th', 'Major 6th'], 2, 'Think of the opening leap of a familiar fanfare: open and hollow.', ['The interval sounds open and hollow, with no sweetness of a 3rd or 6th.', 'Those are the qualities of a perfect 5th (C up to G).'], { listen: hear(['C4', 'G4', ['C4', 'G4']], [1, 1, 2], 70), check: () => ivName('C4', 'G4') === 'P5' }),
    ],
    remember: ['Size: count letters, both ends included.', 'Perfect: 1 4 5 8. Major/minor: 2 3 6 7.', 'Major-scale method, then adjust by half steps.', 'Tritone = A4 or d5 = six half steps.'],
    checkIn: 'Next: interval inversion, compound intervals, and consonance.',
  },
  {
    id: 'mt2-4', unit: 2, n: 4, title: 'Inversion, compound intervals and consonance',
    intro: 'Today you learn three shortcuts that make intervals easier: inverting an interval (flipping its notes), reducing compound intervals larger than an octave, and sorting intervals into consonances and dissonances, which decides how they behave in harmony.',
    goals: ['Invert any interval', 'Name compound intervals and reduce them to simple ones', 'Sort intervals into perfect consonances, imperfect consonances and dissonances'],
    notes: [
      { k: 'rule', title: 'Interval inversion', t: 'To invert an interval, move the lower note up an octave (or the upper note down an octave). The two sizes add up to **9** (3rd ↔ 6th, 2nd ↔ 7th, 4th ↔ 5th). **Major ↔ minor**, **augmented ↔ diminished**, and **perfect stays perfect**.' },
      { k: 'staff', staff: notes('treble', [['C4', 'E4'], ['E4', 'C5']], 'A major 3rd C4–E4 and its inversion, the minor 6th E4–C5', { above: ['M3', 'm6'] }), caption: 'C–E is a major 3rd; flipped, E–C is a minor 6th (3 + 6 = 9, major becomes minor).' },
      { k: 'rule', title: 'Compound intervals', t: 'Intervals larger than an octave are **compound**. Subtract 7 to find the simple interval with the same quality: a major 10th is a major 3rd plus an octave; a perfect 12th is a perfect 5th plus an octave. The 9th keeps its name in harmony (9–8 suspensions).' },
      { k: 'rule', title: 'Consonance and dissonance', t: '**Perfect consonances:** unison, 5th, octave. **Imperfect consonances:** major and minor 3rds and 6ths. **Dissonances:** 2nds, 7ths, and all augmented and diminished intervals. In common-practice harmony a **perfect 4th above the bass** is treated as a dissonance.' },
      { k: 'tip', t: 'Use inversion to find hard intervals fast: what is a note a minor 6th above E? Invert: a major 3rd below E is C, so a minor 6th above E is C.' },
      { k: 'try', prompt: 'C4 is written for you. Add the note a **major 10th above** it (a major 3rd plus an octave).', task: intervalTask('C4', 'M10') },
    ],
    examples: [
      { q: 'Invert a minor 7th.', steps: ['The sizes add to 9: 9 − 7 = 2.', 'Minor becomes major: a minor 7th inverts to a major 2nd.'], a: 'Major 2nd' },
      { q: 'Name the interval from C4 up to D5.', steps: ['C4 to C5 is an octave; C5 to D5 is a major 2nd.', 'An octave plus a major 2nd is a major 9th.'], a: 'Major 9th' },
    ],
    practice: [
      MC('mt2-4-1', 1, 'What is the inversion of a **major 6th**?', ['Major 3rd', 'Minor 3rd', 'Minor 6th', 'Perfect 4th'], 1, 'Sizes add to 9; major becomes minor.', ['9 − 6 = 3, and major becomes minor: a minor 3rd.'], { check: () => invert('M6') === 'm3' }),
      P('mt2-4-2', 1, 'What is the inversion of a **perfect 4th**? (type it like P5)', ['P5', 'perfect 5th', 'perfect fifth'], 'Sizes add to 9; perfect stays perfect.', ['9 − 4 = 5, and perfect stays perfect: a perfect 5th.'], { check: () => invert('P4') === 'P5' }),
      MC('mt2-4-3', 1, 'Which interval is a dissonance?', ['Minor 3rd', 'Major 7th', 'Perfect 5th', 'Major 6th'], 1, 'Dissonances are 2nds, 7ths, and altered intervals.', ['3rds and 6ths are imperfect consonances and the 5th is a perfect consonance. A 7th is a dissonance.'], { check: () => !isConsonant('M7') && isConsonant('m3') && isConsonant('P5') && isConsonant('M6') }),
      MC('mt2-4-4', 2, 'Name this compound interval.', ['m10', 'M10', 'm3', 'M9'], 0, 'D4 to D5 is an octave; then D5 to F5.', ['D4 to D5 is an octave, and D5 to F5 is a minor 3rd (three half steps).', 'An octave plus a minor 3rd is a minor 10th.'], { staff: notes('treble', [['D4', 'F5']], 'D4 and F5 together'), check: () => ivName('D4', 'F5') === 'm10' }),
      TASK('mt2-4-5', 2, 'F2 is written for you. Add the note a **major 10th above** it.', intervalTask('F2', 'M10', 'bass'), 'A major 3rd above F, an octave higher.', ['A major 3rd above F is A. A major 10th is that 3rd plus an octave.', 'F2 up a major 10th is A3, on the top line of the bass staff.']),
      MC('mt2-4-6', 1, 'A tritone is…', ['a perfect 4th', 'a minor 6th', 'an augmented 4th or diminished 5th', 'a major 3rd'], 2, '"Tri-tone" means three whole steps.', ['Three whole steps are six half steps: an augmented 4th (like F–B) or its enharmonic twin, a diminished 5th (like B–F).'], { check: () => semitones('A4') === 6 && semitones('d5') === 6 }),
      P('mt2-4-7', 2, 'How many half steps are in the inversion of a **minor 3rd**?', ['9'], 'Invert first, then count. (Or: an octave is 12.)', ['A minor 3rd inverts to a major 6th, which is 9 half steps.', 'Check: 3 + 9 = 12, a full octave.'], { check: () => semitones(invert('m3')) === 9 }),
      MC('mt2-4-8', 2, 'Listen to this harmonic interval. Which is it?', ['Perfect 5th (consonant)', 'Major 3rd (consonant)', 'Major 7th (dissonant)', 'Octave (consonant)'], 2, 'Does it sound smooth or does it clash?', ['The two notes clash sharply and want to move, so it is a dissonance.', 'The notes are nearly an octave apart but one half step short: a major 7th (C to B).'], { listen: hear([['C4', 'B4']], [3], 60), check: () => ivName('C4', 'B4') === 'M7' && !isConsonant('M7') }),
    ],
    remember: ['Inversions add to 9; M↔m, A↔d, P stays P.', 'Compound: subtract 7 (M10 = M3 + octave).', 'Perfect consonances 1 5 8; imperfect 3 6; dissonances 2 7 and altered intervals (and the 4th above the bass).'],
    checkIn: 'Next: melody, timbre, transposing instruments and texture.',
  },
  {
    id: 'mt3-1', unit: 3, n: 1, title: 'Triads and their inversions',
    intro: 'Stack two 3rds and you have a triad, the basic chord of Western music. Today you learn the four triad qualities, how to find the root of any chord however it is voiced, and how figured-bass numbers show which inversion a chord is in.',
    goals: ['Build major, minor, diminished and augmented triads', 'Find the root of any voicing', 'Name root position, first inversion and second inversion', 'Read figured-bass numbers 6 and 6/4'],
    notes: [
      { k: 'rule', title: 'Four triad qualities', t: 'A triad is a **root**, a **third** and a **fifth**. **Major:** M3 + m3 (a perfect 5th from root to fifth). **Minor:** m3 + M3 (perfect 5th). **Diminished:** m3 + m3 (diminished 5th). **Augmented:** M3 + M3 (augmented 5th).' },
      { k: 'staff', staff: notes('treble', [ch('C4', 'M'), ch('C4', 'm'), ch('C4', 'd'), ch('C4', 'A')], 'Major, minor, diminished and augmented triads on C', { above: ['major', 'minor', 'dim.', 'aug.'] }), caption: 'Triads on C: C–E–G, C–E♭–G, C–E♭–G♭, C–E–G♯.' },
      { k: 'rule', title: 'Inversions and figured bass', t: 'The **bass** (lowest note) decides the inversion. **Root position:** root in the bass (figure 5/3, usually left blank). **First inversion:** third in the bass (figure **6**). **Second inversion:** fifth in the bass (figure **6/4**).' },
      { k: 'staff', staff: notes('treble', [['C4', 'E4', 'G4'], ['E4', 'G4', 'C5'], ['G4', 'C5', 'E5']], 'C major triad in root position, first inversion and second inversion', { labels: ['I', 'I6', 'I64'] }), caption: 'C major: root position (I), first inversion (I⁶), second inversion (I⁶₄). The figures count intervals above the bass.' },
      { k: 'tip', t: 'To find the root of any chord, rearrange its notes into the tightest stack of 3rds (a "snowman": line-line-line or space-space-space). The bottom of the snowman is the root.' },
      { k: 'warn', t: 'Doubling or spreading the notes out does not change the chord. E3–C4–G4–C5 is still a C major triad, in first inversion because E is in the bass.' },
      { k: 'try', prompt: 'Build an **F minor triad** in root position.', task: chordTask('F4', 'm') },
    ],
    examples: [
      { q: 'Name the triad E–G–B♭.', steps: ['E to G is a minor 3rd; G to B♭ is a minor 3rd.', 'Two minor 3rds make a diminished triad (E to B♭ is a diminished 5th).'], a: 'E diminished', staff: notes('treble', [['E4', 'G4', 'Bb4']], 'E G B-flat') },
      { q: 'A–C–F, with A in the bass: root, quality and inversion?', steps: ['Restack in 3rds: F–A–C. The root is F.', 'F–A is a major 3rd and A–C a minor 3rd: F major.', 'A, the third, is in the bass, so it is first inversion (figure 6).'], a: 'F major, first inversion', staff: notes('treble', [['A4', 'C5', 'F5']], 'A C F with A in the bass') },
    ],
    practice: [
      TASK('mt3-1-1', 1, 'Build a **D major triad** in root position.', chordTask('D4', 'M'), 'D, then a major 3rd, then a perfect 5th.', ['A major 3rd above D is F♯; a perfect 5th above D is A.', 'D major: D–F♯–A.']),
      MC('mt3-1-2', 1, 'What is the quality of this triad?', ['Major', 'Minor', 'Diminished', 'Augmented'], 1, 'Check the bottom 3rd first.', ['G to B♭ is a minor 3rd and B♭ to D is a major 3rd: minor 3rd + major 3rd = minor triad.'], { staff: notes('treble', [['G4', 'Bb4', 'D5']], 'G B-flat D'), check: () => identify(['G4', 'Bb4', 'D5'])?.q === 'm' }),
      TASK('mt3-1-3', 2, 'Build a **B diminished triad** in root position, in bass clef.', chordTask('B3', 'd', 0, 'bass'), 'Two minor 3rds.', ['B up a minor 3rd is D; D up a minor 3rd is F.', 'B diminished: B–D–F (B to F is a diminished 5th).']),
      MC('mt3-1-4', 2, 'What are the root, quality and inversion of this chord?', ['A major, first inversion', 'E minor, root position', 'C♯ minor, first inversion', 'A major, second inversion'], 3, 'Restack the notes in 3rds first.', ['Restacked in 3rds: A–C♯–E, an A major triad.', 'E, the fifth, is in the bass, so it is second inversion (6/4).'], { staff: notes('treble', [['E4', 'A4', 'C#5']], 'E A C-sharp with E in the bass'), check: () => { const x = identify(['E4', 'A4', 'C#5']); return !!x && pc(x.root) === 'A' && x.q === 'M' && x.inversion === 2; } }),
      P('mt3-1-5', 1, 'Which figured-bass numbers mark a triad in **second inversion**? (like 6/4)', ['6/4', '64', '6 4'], 'Count intervals above the bass: the fifth is in the bass.', ['With the fifth in the bass, the root is a 4th above and the third a 6th above: figure 6/4.'], { check: () => TRIAD_FIG[2] === '64' }),
      TASK('mt3-1-6', 2, 'Build an **A♭ major triad in first inversion**.', chordTask('Ab3', 'M', 1), 'First inversion: the third in the bass.', ['A♭ major is A♭–C–E♭.', 'First inversion puts the third, C, in the bass: C–E♭–A♭.']),
      MC('mt3-1-7', 1, 'Which triad quality has two major 3rds stacked?', ['Major', 'Minor', 'Diminished', 'Augmented'], 3, 'Major 3rd + major 3rd.', ['M3 + M3 makes an augmented 5th from root to fifth: an augmented triad.'], { check: () => identify(ch('C4', 'A'))?.q === 'A' && ivName('C4', 'E4') === 'M3' && ivName('E4', 'G#4') === 'M3' }),
      MC('mt3-1-8', 2, 'Listen to the triad (broken, then together). Which quality is it?', ['Major', 'Minor', 'Diminished', 'Augmented'], 1, 'Bright or dark? Stable or tense?', ['The chord sounds stable (its outer notes are a perfect 5th apart) but darker than major.', 'A stable, dark triad is minor (D–F–A).'], { listen: hear([['D4', 'F4', 'A4']], [3], 70, true), check: () => identify(['D4', 'F4', 'A4'])?.q === 'm' }),
    ],
    remember: ['Major M3+m3; minor m3+M3; diminished m3+m3; augmented M3+M3.', 'The bass decides the inversion: root, 6, 6/4.', 'Restack in 3rds to find the root.'],
    checkIn: 'Next: add a 7th to make seventh chords.',
  },
  {
    id: 'mt3-2', unit: 3, n: 2, title: 'Seventh chords and their inversions',
    intro: 'Add one more 3rd on top of a triad and you get a seventh chord, the sound of tension in tonal music. Today you build the five seventh-chord qualities, name their inversions with figured bass, and hear the dominant seventh, the most important one.',
    goals: ['Build all five seventh-chord qualities', 'Name seventh chords in any inversion', 'Use the figures 7, 6/5, 4/3 and 4/2', 'Recognize the dominant seventh by ear'],
    notes: [
      { k: 'rule', title: 'Five seventh chords', t: '**Major seventh (MM7):** major triad + major 7th. **Dominant seventh (Mm7):** major triad + minor 7th. **Minor seventh (mm7):** minor triad + minor 7th. **Half-diminished seventh (ø7):** diminished triad + minor 7th. **Fully diminished seventh (°7):** diminished triad + diminished 7th.' },
      { k: 'staff', staff: notes('treble', [ch('G4', 'MM7'), ch('G4', 'Mm7'), ch('G4', 'mm7'), ch('G4', 'hd7'), ch('G4', 'fd7')], 'The five seventh chords on G', { above: ['MM7', 'Mm7', 'mm7', 'ø7', '°7'] }), caption: 'On G: G–B–D–F♯, G–B–D–F, G–B♭–D–F, G–B♭–D♭–F, G–B♭–D♭–F♭.' },
      { k: 'rule', title: 'Inversions of seventh chords', t: 'Root in the bass: **7**. Third in the bass: **6/5**. Fifth in the bass: **4/3**. Seventh in the bass: **4/2** (often just 2).' },
      { k: 'staff', staff: notes('bass', [['G2', 'B2', 'D3', 'F3'], ['B2', 'D3', 'F3', 'G3'], ['D3', 'F3', 'G3', 'B3'], ['F3', 'G3', 'B3', 'D4']], 'G7 in root position and its three inversions', { labels: ['V7', 'V65', 'V43', 'V42'] }), caption: 'G7 (V7 in C major) in all four positions. The figures name the intervals above the bass that identify the chord.' },
      { k: 'tip', t: 'A fully diminished seventh is three stacked minor 3rds, so it divides the octave evenly. A half-diminished seventh has a major 3rd on top instead.' },
      { k: 'try', prompt: 'Build a **D dominant seventh chord (D7)** in root position.', task: chordTask('D4', 'Mm7') },
    ],
    examples: [
      { q: 'Identify B–D–F–A.', steps: ['B–D–F is a diminished triad (two minor 3rds).', 'B up to A is a minor 7th. A diminished triad plus a minor 7th is half-diminished: Bø7.'], a: 'B half-diminished seventh', staff: notes('treble', [['B4', 'D5', 'F5', 'A5']], 'B D F A') },
      { q: 'In a 4/2 chord, which chord member is in the bass?', steps: ['4/2 is third inversion.', 'In third inversion the seventh of the chord is in the bass.'], a: 'The seventh' },
    ],
    practice: [
      TASK('mt3-2-1', 1, 'Build a **C major seventh chord (CM7)** in root position.', chordTask('C4', 'MM7'), 'Major triad plus a major 7th.', ['C major triad: C–E–G. A major 7th above C is B.', 'CM7: C–E–G–B.']),
      MC('mt3-2-2', 1, 'What is the quality of this seventh chord?', ['Major seventh', 'Minor seventh', 'Dominant seventh', 'Half-diminished seventh'], 2, 'Check the triad, then the 7th.', ['F–A–C is a major triad, and F up to E♭ is a minor 7th.', 'Major triad + minor 7th = dominant seventh (Mm7).'], { staff: notes('treble', [['F4', 'A4', 'C5', 'Eb5']], 'F A C E-flat'), check: () => identify(['F4', 'A4', 'C5', 'Eb5'])?.q === 'Mm7' }),
      MC('mt3-2-3', 1, 'The figure 6/5 means a seventh chord in…', ['root position', 'second inversion', 'first inversion', 'third inversion'], 2, 'Which chord member is in the bass for 6/5?', ['6/5 means the third is in the bass: first inversion.'], { check: () => SEVENTH_FIG[1] === '65' }),
      TASK('mt3-2-4', 2, 'Build an **E half-diminished seventh chord** in root position.', chordTask('E4', 'hd7'), 'A diminished triad plus a minor 7th.', ['E diminished triad: E–G–B♭.', 'A minor 7th above E is D: E–G–B♭–D.']),
      MC('mt3-2-5', 2, 'What are the root and inversion of this chord?', ['G7, third inversion (4/2)', 'D minor, root position', 'G7, second inversion (4/3)', 'B diminished, first inversion (6/5)'], 2, 'Restack into 3rds: what is at the bottom?', ['Restacked: G–B–D–F, a G dominant seventh.', 'D, the fifth, is in the bass: second inversion, figure 4/3.'], { staff: notes('treble', [['D4', 'F4', 'G4', 'B4']], 'D F G B with D in the bass'), check: () => { const x = identify(['D4', 'F4', 'G4', 'B4']); return !!x && pc(x.root) === 'G' && x.q === 'Mm7' && x.inversion === 2; } }),
      TASK('mt3-2-6', 2, 'Build a **G♯ fully diminished seventh chord** in bass clef.', chordTask('G#3', 'fd7', 0, 'bass'), 'Three minor 3rds.', ['G♯ up a minor 3rd is B, B up a minor 3rd is D, D up a minor 3rd is F.', 'G♯°7: G♯–B–D–F (G♯ to F is a diminished 7th).']),
      P('mt3-2-7', 1, 'Which figure marks a seventh chord in **third inversion**? (like 6/5)', ['4/2', '42', '2'], 'The seventh is in the bass.', ['With the seventh in the bass, the root is a 2nd above it and the third a 4th above: figure 4/2 (or just 2).'], { check: () => SEVENTH_FIG[3] === '42' }),
      MC('mt3-2-8', 2, 'Listen to the seventh chord. Which quality is it?', ['Major seventh', 'Dominant seventh', 'Minor seventh', 'Fully diminished seventh'], 1, 'A bright chord with a tension that wants to resolve.', ['The bottom three notes form a bright major triad, and the top note adds a restless minor 7th that wants to fall.', 'That is the dominant seventh (G–B–D–F).'], { listen: hear([['G3', 'B3', 'D4', 'F4']], [3], 70, true), check: () => identify(['G3', 'B3', 'D4', 'F4'])?.q === 'Mm7' }),
    ],
    remember: ['MM7, Mm7 (dominant), mm7, ø7, °7.', 'Figures: 7, 6/5, 4/3, 4/2.', '°7 = three minor 3rds; ø7 = dim triad + minor 7th.'],
    checkIn: 'Next: Roman numerals for the chords of a key.',
  },
  {
    id: 'mt3-3', unit: 3, n: 3, title: 'Diatonic chords and Roman numerals',
    intro: 'Now you put chords into keys. Every scale degree has its own triad, and Roman numerals name each chord by its degree and quality. This is the language the whole second half of the course, and the exam\'s part-writing questions, are written in.',
    goals: ['Build the diatonic triads in major and minor', 'Write Roman numerals with case, ° and figures', 'Use the raised 7th in minor for V and vii°', 'Name diatonic seventh chords'],
    notes: [
      { k: 'rule', title: 'Triads in a major key', t: 'In every major key: **I, ii, iii, IV, V, vi, vii°**. Upper case = major, lower case = minor, ° = diminished, + = augmented.' },
      { k: 'staff', staff: notes('treble', diaRow(C), 'The diatonic triads of C major', { labels: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'viio'] }), caption: 'C major: three major chords (I, IV, V), three minor (ii, iii, vi) and one diminished (vii°).' },
      { k: 'rule', title: 'Triads in a minor key', t: 'Using harmonic minor\'s raised 7th for the dominant and leading-tone chords: **i, ii°, III, iv, V, VI, vii°**. The raised 7th makes V major, so it has a real leading tone.' },
      { k: 'staff', staff: notes('treble', diaRow(a, true), 'The diatonic triads of A minor, with G-sharp in V and vii diminished', { labels: ['i', 'iio', 'III', 'iv', 'V', 'VI', 'viio'] }), caption: 'A minor: note the G♯ (raised 7th) in V and vii°.' },
      { k: 'rule', title: 'Seventh chords in a key', t: 'Major: **IM7, ii7, iii7, IVM7, V7, vi7, viiø7**. Minor (harmonic): **V7** (dominant seventh) and **vii°7** (fully diminished). Figures combine with numerals: **ii6** is the supertonic triad in first inversion; **V43** is the dominant seventh in second inversion.' },
      { k: 'tip', t: 'Spell a Roman numeral in three steps: find the root (the scale degree), stack the key\'s notes in 3rds (adding the raised 7th in minor for V and vii°), then put the right chord member in the bass for the figure.' },
      { k: 'try', prompt: 'Write **V65 in G major** (the dominant seventh with its third in the bass).', task: romanTask('V65', K('G')) },
    ],
    examples: [
      { q: 'In D major, what notes make up vi?', steps: ['D major: D E F♯ G A B C♯.', 'The 6th degree is B; stack 3rds in the key: B–D–F♯, a minor triad.'], a: 'B–D–F♯ (B minor)' },
      { q: 'In E minor, spell V7.', steps: ['The 5th degree of E minor is B.', 'Use the raised 7th, D♯, and stack: B–D♯–F♯–A, a dominant seventh.'], a: 'B–D♯–F♯–A' },
    ],
    practice: [
      MC('mt3-3-1', 1, 'In any major key, which triad is diminished?', ['ii', 'iii', 'IV', 'vii°'], 3, 'Look for the chord built on the leading tone.', ['In C major, B–D–F is two minor 3rds: diminished. It is the triad on the 7th degree, vii°.'], { check: () => diatonicChord(C, 7).q === 'd' && diatonicChord(C, 2).q === 'm' }),
      TASK('mt3-3-2', 1, 'Write the **IV chord in F major** (root position).', romanTask('IV', K('F')), 'The 4th degree of F major is B♭.', ['F major: F G A B♭ C D E. IV is built on B♭: B♭–D–F, a major triad.']),
      MC('mt3-3-3', 2, 'In B♭ major, what is the Roman numeral of this chord?', ['ii', 'iii', 'IV', 'vi'], 0, 'C is which degree of B♭ major?', ['B♭ major: B♭ C D E♭ F G A. C is degree 2, and C–E♭–G is minor.', 'A minor triad on degree 2 is ii.'], { staff: notes('treble', [['C4', 'Eb4', 'G4']], 'C E-flat G in B-flat major', { fifths: -2 }), check: () => romanOf(['C4', 'Eb4', 'G4'], K('Bb')) === 'ii' }),
      TASK('mt3-3-4', 2, 'Write **V7 in D minor** (root position).', romanTask('V7', K('D', 'minor')), 'Use the raised 7th (C♯).', ['The 5th degree of D minor is A.', 'With the raised 7th, C♯: A–C♯–E–G, a dominant seventh.']),
      MC('mt3-3-5', 1, 'In a minor key, the triad built on the raised 7th degree is…', ['major', 'minor', 'diminished', 'augmented'], 2, 'In A minor: G♯–B–D.', ['G♯–B is a minor 3rd and B–D is a minor 3rd: a diminished triad, vii°.'], { check: () => diatonicChord(a, 7).q === 'd' }),
      P('mt3-3-6', 1, 'In A major, what is the root of the **vi** chord?', NOTE('F#'), 'Count up six degrees from A.', ['A major: A B C♯ D E F♯ G♯. The 6th degree is F♯, so vi is F♯–A–C♯.'], { check: () => pc(diatonicChord(K('A'), 6).root) === 'F#' }),
      MC('mt3-3-7', 2, 'In A minor, what is the Roman numeral of this chord?', ['v7', 'VII7', 'V7', 'iii7'], 2, 'E is degree 5, and the G♯ is the raised 7th.', ['E is the 5th degree of A minor. E–G♯–B–D is a major triad plus a minor 7th: a dominant seventh.', 'So it is V7 (upper case because the triad is major).'], { staff: notes('treble', [['E4', 'G#4', 'B4', 'D5']], 'E G-sharp B D in A minor'), check: () => romanOf(['E4', 'G#4', 'B4', 'D5'], a) === 'V7' }),
      TASK('mt3-3-8', 2, 'Write **ii6 in C major**.', romanTask('ii6', C), 'ii is D–F–A; the figure 6 puts the third in the bass.', ['ii in C major is D–F–A (minor).', 'The 6 means first inversion: F in the bass, F–A–D.']),
    ],
    remember: ['Major: I ii iii IV V vi vii°.', 'Minor: i ii° III iv V VI vii° (raised 7th in V and vii°).', 'Case shows quality; ° = diminished; figures show inversion.'],
    checkIn: 'That completes Unit 3. Next: writing chords for four voices.',
  },
];

export const MUSIC_B_TUTOR: Record<string, LessonTutor> = {
  'mt2-3': {
    bigIdea: [
      'An interval has two parts to its name. The number (2nd, 3rd, 5th…) comes from counting letter names, including both ends. The quality (perfect, major, minor, augmented, diminished) comes from the exact number of half steps.',
      'The fastest way to find the quality is to imagine the lower note as the tonic of a major scale. If the top note is in that scale, the interval is major (for 2nds, 3rds, 6ths, 7ths) or perfect (for unisons, 4ths, 5ths, octaves). Then adjust for any accidental.',
      'Letters first, sound second: two intervals can sound identical (C–D♯ and C–E♭) and still have different names, because their letters span a different number of steps.',
    ],
    picture: { title: 'A ruler with two scales', t: 'Imagine a ruler marked in two ways: letter steps on top (that gives the size) and half steps underneath (that gives the quality). You read both marks to name an interval.' },
    words: [
      { term: 'Interval', means: 'The distance between two pitches.' },
      { term: 'Perfect', means: 'The quality of unisons, 4ths, 5ths and octaves in their normal form.' },
      { term: 'Augmented / diminished', means: 'One half step larger / smaller than perfect or major / perfect or minor.' },
      { term: 'Tritone', means: 'An augmented 4th or diminished 5th (six half steps).' },
    ],
    tools: [{ name: 'Major scales', refresher: 'Know the notes of each major scale; the top note\'s membership tells you major or perfect.', lesson: 'mt1-2' }],
    why: [
      ['Size always comes from letters.', 'The major scale of the lower note gives the "normal" version.', 'Compare and adjust by half steps.'],
      ['Count letters first.', 'Find the major-scale version.', 'One half step smaller than major is minor.'],
    ],
    walk: {
      'mt2-3-1': ['Count letters: E F G, three letters, a 3rd.', 'Count half steps: E–F, F–F♯, F♯–G is three.', 'Three half steps make a minor 3rd (choice C).'],
      'mt2-3-2': ['A 3rd above F uses the letter A.', 'F major has A natural as its 3rd degree.', 'So a major 3rd above F4 is A4.'],
      'mt2-3-3': ['Count up the keyboard from C.', 'C♯, D, D♯, E, F, F♯, G: seven steps.', 'A perfect 5th has 7 half steps.'],
      'mt2-3-4': ['A 5th above B uses the letter F.', 'In B major the 5th is F♯, a perfect 5th.', 'A diminished 5th is a half step smaller: F5.'],
      'mt2-3-5': ['Neighbouring letters always make a 2nd.', 'A 2nd that spans three half steps is augmented.', 'An augmented 2nd sounds like a minor 3rd (choice B).'],
      'mt2-3-6': ['Count letters A B C D E F: a 6th.', 'A♭ major contains F, so A♭–F is the major version.', 'It is a major 6th (choice B).'],
      'mt2-3-7': ['Going down seven letters from G reaches A.', 'A up to G♯ would be a major 7th; A up to G is a minor 7th.', 'Write A3 below the treble staff.'],
      'mt2-3-8': ['Listen for an open, hollow sound with no 3rd-like sweetness.', 'That sound belongs to perfect intervals; it is wider than a 4th.', 'It is a perfect 5th (choice C).'],
    },
    teach: {
      plan: ['Show size by counting letters on the staff.', 'Show quality by counting half steps on a keyboard.', 'Teach the major-scale method with two examples.', 'End with a pair of intervals that sound the same but are spelled differently.'],
      questions: [
        { q: 'Why is a 4th "perfect" but a 3rd "major"?', a: 'Perfect intervals (1, 4, 5, 8) have only one normal form; 2nds, 3rds, 6ths and 7ths come in two normal forms, major and minor.' },
        { q: 'Can an interval be "minor" and "augmented"?', a: 'No. Each interval has exactly one quality, found by its half-step count for its size.' },
      ],
      keyPoints: ['Size from letters, quality from half steps.', 'Use the major scale of the lower note.', 'Know the half-step counts of common intervals.'],
    },
  },
  'mt2-4': {
    bigIdea: [
      'Flipping an interval upside down (inverting it) changes it in a predictable way: the sizes add up to 9, major and minor swap, augmented and diminished swap, and perfect stays perfect.',
      'Compound intervals are just simple intervals plus octaves. Take away 7 from the number and keep the quality: a minor 10th is a minor 3rd an octave wider.',
      'Intervals also have a character. Perfect consonances (unison, 5th, octave) sound hollow and stable, imperfect consonances (3rds and 6ths) sound sweet and stable, and dissonances (2nds, 7ths, altered intervals) sound tense and want to move.',
    ],
    picture: { title: 'Two halves of an octave', t: 'An interval and its inversion are two pieces that fit together to make one octave, like two puzzle pieces. A major 3rd (4 half steps) plus its inversion, a minor 6th (8 half steps), makes exactly 12.' },
    words: [
      { term: 'Inversion', means: 'Flipping an interval by moving one note an octave.' },
      { term: 'Compound interval', means: 'An interval larger than an octave.' },
      { term: 'Consonance', means: 'A stable interval: 1, 3, 5, 6, 8 (perfect or imperfect).' },
      { term: 'Dissonance', means: 'An unstable interval: 2nds, 7ths and altered intervals.' },
    ],
    tools: [{ name: 'Naming intervals', refresher: 'Letters give the size; half steps give the quality.', lesson: 'mt2-3' }],
    why: [
      ['Sizes of an interval and its inversion add to 9.', 'Major and minor swap.'],
      ['Split the compound interval into an octave plus a simple interval.', 'Add the octave back to the size: 2 + 7 = 9.'],
    ],
    walk: {
      'mt2-4-1': ['Sizes add to 9: 9 − 6 = 3.', 'Major becomes minor.', 'The inversion is a minor 3rd (choice B).'],
      'mt2-4-2': ['Sizes add to 9: 9 − 4 = 5.', 'Perfect stays perfect.', 'The inversion is a perfect 5th.'],
      'mt2-4-3': ['3rds and 6ths are imperfect consonances; 5ths are perfect consonances.', '7ths are dissonances.', 'The major 7th is the dissonance (choice B).'],
      'mt2-4-4': ['D4 to D5 is one octave.', 'D5 to F5 is three half steps, a minor 3rd.', 'Octave + minor 3rd = minor 10th (choice A).'],
      'mt2-4-5': ['A major 10th is a major 3rd plus an octave.', 'A major 3rd above F is A.', 'An octave higher than A2 is A3, the top line of the bass staff.'],
      'mt2-4-6': ['A tritone is three whole steps.', 'That is an augmented 4th (F–B) or a diminished 5th (B–F).', 'So the answer is the augmented 4th or diminished 5th (choice C).'],
      'mt2-4-7': ['A minor 3rd inverts to a major 6th.', 'A major 6th has 9 half steps.', 'Check: 3 + 9 = 12, an octave.'],
      'mt2-4-8': ['The sound is harsh and unstable: a dissonance.', 'It is almost an octave, one half step short.', 'That is a major 7th (choice C).'],
    },
    teach: {
      plan: ['Show an interval and its inversion on the staff.', 'State the rule of 9 and the quality swaps.', 'Reduce two compound intervals.', 'Play consonances and dissonances and let your student sort them.'],
      questions: [
        { q: 'Why do inversions add to 9 and not 8?', a: 'Because the shared note is counted twice: both intervals count it as "1".' },
        { q: 'Why is the 4th sometimes a dissonance?', a: 'Above the bass, a 4th sounds unstable in common-practice style and usually resolves; between upper voices it is fine.' },
      ],
      keyPoints: ['Inversions add to 9; M↔m, A↔d, P stays P.', 'Compound = simple + octave(s).', 'Consonances 1 3 5 6 8; dissonances 2 7 and altered intervals.'],
    },
  },
  'mt3-1': {
    bigIdea: [
      'A triad is three notes stacked in 3rds: a root, a third and a fifth. The kinds of 3rds decide the quality: major (major 3rd on the bottom), minor (minor 3rd on the bottom), diminished (two minor 3rds) and augmented (two major 3rds).',
      'Chords are often spread out or rearranged, but their identity does not change. Restack the notes into 3rds to find the root and quality.',
      'Which note is lowest decides the inversion: root position, first inversion (third in the bass, figure 6) or second inversion (fifth in the bass, figure 6/4). Figured bass counts intervals above the bass.',
    ],
    picture: { title: 'A snowman', t: 'Stack a chord like a snowman: three balls touching, all on lines or all in spaces. The bottom ball is the root, however the notes were arranged before.' },
    words: [
      { term: 'Root', means: 'The note a triad is built on.' },
      { term: 'Inversion', means: 'Which chord member is in the bass.' },
      { term: 'Figured bass', means: 'Numbers showing intervals above the bass note.' },
      { term: 'Diminished triad', means: 'Two stacked minor 3rds.' },
    ],
    tools: [{ name: 'Major and minor 3rds', refresher: 'A major 3rd has 4 half steps; a minor 3rd has 3.', lesson: 'mt2-3' }],
    why: [
      ['Measure each 3rd in the stack.', 'Two minor 3rds give a diminished triad.'],
      ['Restack the notes in 3rds to find the root.', 'Measure the 3rds for the quality.', 'Then look at the bass for the inversion.'],
    ],
    walk: {
      'mt3-1-1': ['Start on D.', 'A major 3rd above D is F♯; a perfect 5th above D is A.', 'D major is D–F♯–A.'],
      'mt3-1-2': ['G to B♭ is a minor 3rd.', 'B♭ to D is a major 3rd.', 'Minor 3rd then major 3rd: minor (choice B).'],
      'mt3-1-3': ['B up a minor 3rd is D.', 'D up a minor 3rd is F.', 'B diminished is B–D–F.'],
      'mt3-1-4': ['Restack the notes: A–C♯–E.', 'A–C♯ is a major 3rd, so it is A major.', 'E is in the bass, the fifth: second inversion (choice D).'],
      'mt3-1-5': ['Second inversion puts the fifth in the bass.', 'Above it are a 4th (the root) and a 6th (the third).', 'The figure is 6/4.'],
      'mt3-1-6': ['A♭ major is A♭–C–E♭.', 'First inversion puts the third, C, in the bass.', 'Write C–E♭–A♭.'],
      'mt3-1-7': ['Augmented means "made larger".', 'Two major 3rds stack to an augmented 5th.', 'That is the augmented triad (choice D).'],
      'mt3-1-8': ['The chord is stable, with a perfect 5th on the outside.', 'It sounds darker than major.', 'Stable and dark means minor (choice B).'],
    },
    teach: {
      plan: ['Build the four triads on one root and play each one.', 'Teach the snowman trick for finding roots.', 'Show the three inversions with their figures.', 'Have your student label three mixed-up chords.'],
      questions: [
        { q: 'If I double a note, is it still a triad?', a: 'Yes. A triad has three different pitch classes; doublings and spacing do not change it.' },
        { q: 'Why is root position labelled 5/3?', a: 'Above the bass (the root) there is a 3rd and a 5th. It is so common that the numbers are usually left out.' },
      ],
      keyPoints: ['Quality from the stacked 3rds.', 'Restack to find the root.', 'Bass note decides the inversion: blank, 6, 6/4.'],
    },
  },
  'mt3-2': {
    bigIdea: [
      'A seventh chord is a triad with one more 3rd on top, so it spans a 7th from root to top. That added 7th is a dissonance, which gives seventh chords their forward pull.',
      'There are five common types. Name each by its triad plus its 7th: major seventh (major + major 7th), dominant seventh (major + minor 7th), minor seventh (minor + minor 7th), half-diminished (diminished + minor 7th) and fully diminished (diminished + diminished 7th).',
      'Seventh chords have four positions, so their figures are 7, 6/5, 4/3 and 4/2, depending on whether the root, third, fifth or seventh is in the bass.',
    ],
    picture: { title: 'A triad wearing a hat', t: 'A seventh chord is a triad wearing a hat (the 7th). The triad tells you the first half of the name, and the hat (major, minor or diminished 7th) tells you the second half.' },
    words: [
      { term: 'Dominant seventh', means: 'Major triad + minor 7th (Mm7), like G–B–D–F.' },
      { term: 'Half-diminished seventh', means: 'Diminished triad + minor 7th (ø7).' },
      { term: 'Fully diminished seventh', means: 'Diminished triad + diminished 7th (°7): all minor 3rds.' },
      { term: '6/5, 4/3, 4/2', means: 'Figures for first, second and third inversion of a seventh chord.' },
    ],
    tools: [{ name: 'Triads', refresher: 'Major, minor, diminished and augmented triads and their inversions.', lesson: 'mt3-1' }],
    why: [
      ['First name the triad.', 'Then measure the 7th from the root.'],
      ['4/2 is the last inversion.', 'In it, the seventh is the lowest note.'],
    ],
    walk: {
      'mt3-2-1': ['Build C major: C–E–G.', 'Add a major 7th above C: B.', 'CM7 is C–E–G–B.'],
      'mt3-2-2': ['F–A–C is a major triad.', 'F to E♭ is a minor 7th.', 'Major triad + minor 7th = dominant seventh (choice C).'],
      'mt3-2-3': ['6/5 means a 6th and a 5th above the bass.', 'That happens when the third is in the bass.', 'So it is first inversion (choice C).'],
      'mt3-2-4': ['E diminished is E–G–B♭.', 'A minor 7th above E is D.', 'E half-diminished: E–G–B♭–D.'],
      'mt3-2-5': ['Restack in 3rds: G–B–D–F.', 'It is a G dominant seventh.', 'D, the fifth, is in the bass: 4/3 (choice C).'],
      'mt3-2-6': ['Start on G♯ and stack minor 3rds.', 'G♯–B, B–D, D–F.', 'G♯°7 is G♯–B–D–F.'],
      'mt3-2-7': ['Third inversion puts the seventh in the bass.', 'Above it are a 2nd (the root) and a 4th (the third).', 'The figure is 4/2.'],
      'mt3-2-8': ['The lower three notes are a bright major triad.', 'The top note adds a minor 7th that wants to fall.', 'That is a dominant seventh (choice B).'],
    },
    teach: {
      plan: ['Write the five seventh chords on one root.', 'Show "triad + 7th" naming.', 'Show the four positions of V7 with figures.', 'Play the dominant seventh and resolve it.'],
      questions: [
        { q: 'Why is it called a dominant seventh?', a: 'Because in major and minor keys it is the seventh chord built on the dominant, scale degree 5.' },
        { q: 'How are half- and fully diminished sevenths different?', a: 'Both start with a diminished triad; half-diminished adds a minor 7th, fully diminished adds a diminished 7th.' },
      ],
      keyPoints: ['Name = triad + type of 7th.', 'Five types: MM7, Mm7, mm7, ø7, °7.', 'Figures 7, 6/5, 4/3, 4/2.'],
    },
  },
  'mt3-3': {
    bigIdea: [
      'Every note of a scale can be the root of a chord made only from that scale. In major keys this gives the same pattern every time: I, ii, iii, IV, V, vi, vii°.',
      'Roman numerals encode a lot at once: the scale degree (which numeral), the quality (upper case major, lower case minor, ° diminished, + augmented) and, with figures, the inversion.',
      'Minor keys borrow the raised 7th from harmonic minor for the dominant (V) and leading-tone (vii°) chords, so they can lead home as strongly as in major.',
    ],
    picture: { title: 'A family photo', t: 'Each key is a family of seven chords. The tonic (I) is the parent everyone returns to, the dominant (V) is the eldest child who always comes home, and vii° is the restless one who points straight back to I.' },
    words: [
      { term: 'Diatonic', means: 'Using only the notes of the key.' },
      { term: 'Roman numeral', means: 'A label showing a chord\'s scale degree and quality.' },
      { term: 'vii°', means: 'The diminished triad on the leading tone.' },
      { term: 'V7', means: 'The dominant seventh chord.' },
    ],
    tools: [
      { name: 'Triads and seventh chords', refresher: 'Quality from stacked 3rds; figures 6, 6/4, 6/5, 4/3, 4/2.', lesson: 'mt3-2' },
      { name: 'Minor scales', refresher: 'Harmonic minor raises the 7th degree.', lesson: 'mt2-1' },
    ],
    why: [
      ['List the key\'s scale.', 'Stack 3rds from degree 6 using only notes of the key.'],
      ['Find the 5th degree.', 'Raise the 7th of the minor scale and stack the dominant seventh.'],
    ],
    walk: {
      'mt3-3-1': ['In C major, the triad on B is B–D–F.', 'B–D and D–F are both minor 3rds: diminished.', 'B is degree 7, so it is vii° (choice D).'],
      'mt3-3-2': ['F major: F G A B♭ C D E.', 'The 4th degree is B♭.', 'IV is B♭–D–F, a major triad.'],
      'mt3-3-3': ['In B♭ major, C is degree 2.', 'C–E♭–G is a minor triad.', 'A minor triad on 2 is ii (choice A).'],
      'mt3-3-4': ['The dominant of D minor is A.', 'Raise the 7th: C becomes C♯.', 'V7 is A–C♯–E–G.'],
      'mt3-3-5': ['In A minor the raised 7th is G♯.', 'G♯–B–D is two minor 3rds.', 'It is diminished (choice C).'],
      'mt3-3-6': ['A major: A B C♯ D E F♯ G♯.', 'The 6th degree is F♯.', 'vi is F♯–A–C♯, so the root is F♯.'],
      'mt3-3-7': ['E is degree 5 of A minor.', 'E–G♯–B–D is a major triad + minor 7th.', 'That is V7 (choice C).'],
      'mt3-3-8': ['ii in C is D–F–A.', 'The 6 means the third (F) is in the bass.', 'Write F–A–D.'],
    },
    teach: {
      plan: ['Build the seven triads of C major and label them.', 'Do the same in A minor, adding G♯ for V and vii°.', 'Explain how case, ° and figures work together.', 'Spell three Roman numerals in new keys.'],
      questions: [
        { q: 'Why is V major in a minor key?', a: 'Composers raise the 7th degree so the dominant chord contains a leading tone, which makes a stronger pull to the tonic.' },
        { q: 'What does ii6 mean exactly?', a: 'The supertonic triad (minor in major keys) with its third in the bass.' },
      ],
      keyPoints: ['Major: I ii iii IV V vi vii°.', 'Minor: i ii° III iv V VI vii° with the raised 7th.', 'Case shows quality; figures show inversion.'],
    },
  },
};

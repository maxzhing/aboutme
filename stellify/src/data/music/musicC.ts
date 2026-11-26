import type { CalcLesson, LessonTutor } from '../calc/types';
import { MC, TASK, chords, hear, notes, satb } from './lib';
import { checkSatb, chord, diatonicChord, errorsOnly, identify, ivName, parseRoman, pc, romanOf, spell, transpose, type Key, type Satb } from '../../lib/music/theory';
import { romanTask, satbTask } from '../../lib/music/tasks';

const K = (tonic: string, mode: 'major' | 'minor' = 'major'): Key => ({ tonic, mode });
const C = K('C');
const rulesOf = (cs: Satb[], k: Key, rs?: string[]) => errorsOnly(checkSatb(cs, k, rs)).map((e) => e.rule);
const bassOnly = (cs: Satb[]) => cs.map((c) => ({ B: c.B }));

/* model realizations (each one is checked by the voice-leading engine in the tests) */
export const I_IV_V_I: Satb[] = [{ S: 'G4', A: 'E4', T: 'C4', B: 'C3' }, { S: 'A4', A: 'F4', T: 'C4', B: 'F2' }, { S: 'G4', A: 'D4', T: 'B3', B: 'G2' }, { S: 'G4', A: 'E4', T: 'C4', B: 'C3' }];
export const F_PROG: Satb[] = [{ S: 'C5', A: 'F4', T: 'A3', B: 'F3' }, { S: 'D5', A: 'F4', T: 'Bb3', B: 'Bb2' }, { S: 'C5', A: 'E4', T: 'G3', B: 'C3' }, { S: 'C5', A: 'F4', T: 'A3', B: 'F2' }];
export const DECEPTIVE: Satb[] = [{ S: 'D5', A: 'G4', T: 'B3', B: 'G2' }, { S: 'C5', A: 'E4', T: 'C4', B: 'A2' }];
export const PAC: Satb[] = [{ S: 'D5', A: 'G4', T: 'B3', B: 'G2' }, { S: 'C5', A: 'E4', T: 'C4', B: 'C3' }];
export const II6_PROG: Satb[] = [{ S: 'C5', A: 'G4', T: 'E4', B: 'C3' }, { S: 'D5', A: 'A4', T: 'F4', B: 'F3' }, { S: 'B4', A: 'G4', T: 'D4', B: 'G3' }, { S: 'C5', A: 'G4', T: 'E4', B: 'C3' }];
export const V7_I: Satb[] = [{ S: 'F5', A: 'B4', T: 'D4', B: 'G2' }, { S: 'E5', A: 'C5', T: 'C4', B: 'C3' }];
export const V65_I: Satb[] = [{ S: 'D5', A: 'A4', T: 'C4', B: 'F#3' }, { S: 'D5', A: 'G4', T: 'B3', B: 'G3' }];
export const CAD64: Satb[] = [{ S: 'D5', A: 'A4', T: 'F4', B: 'F3' }, { S: 'C5', A: 'G4', T: 'E4', B: 'G3' }, { S: 'B4', A: 'G4', T: 'D4', B: 'G3' }, { S: 'C5', A: 'G4', T: 'E4', B: 'C3' }];
export const PASSING64: Satb[] = [{ S: 'C5', A: 'G4', T: 'E4', B: 'C3' }, { S: 'B4', A: 'G4', T: 'D4', B: 'D3' }, { S: 'C5', A: 'G4', T: 'C4', B: 'E3' }];
export const G_I_V: Satb[] = [{ S: 'B4', A: 'G4', T: 'D4', B: 'G2' }, { S: 'A4', A: 'F#4', T: 'D4', B: 'D3' }];
export const C_I_IV: Satb[] = [{ S: 'E5', A: 'G4', T: 'C4', B: 'C3' }, { S: 'F5', A: 'A4', T: 'C4', B: 'F3' }];

/** AP Music Theory, Units 4–5. Original lessons and problems; every computable answer is checked by the music engine. */
export const MUSIC_C: CalcLesson[] = [
  {
    id: 'mt4-1', unit: 4, n: 1, title: 'Four-part writing: voices, spacing and doubling',
    intro: 'The exam\'s part-writing questions ask you to write chords for four voices, soprano, alto, tenor and bass, the way a choir would sing them. Today you learn the ranges of each voice, how far apart they may be, and which chord member to double.',
    goals: ['Write SATB chords with correct stems and staves', 'Keep each voice in range', 'Space the voices correctly and never cross them', 'Choose good doublings (never the leading tone)'],
    notes: [
      { k: 'p', t: 'In four-part (SATB) writing, the **soprano** and **alto** share the treble staff and the **tenor** and **bass** share the bass staff. Stems show the voice: soprano and tenor stems go **up**, alto and bass stems go **down**.' },
      { k: 'rule', title: 'Voice ranges', t: 'Approximate ranges: **soprano C4–G5**, **alto G3–D5**, **tenor C3–G4**, **bass E2–D4**. Stay inside them; the middle of each range is best.' },
      { k: 'rule', title: 'Spacing and crossing', t: 'Keep no more than an **octave** between soprano and alto, and between alto and tenor. The tenor and bass may be farther apart (up to about a 12th). Voices must not **cross**: the alto never goes above the soprano, the tenor never above the alto, and so on.' },
      { k: 'staff', staff: satb(0, [{ S: 'E5', A: 'G4', T: 'C4', B: 'C3' }, { S: 'C5', A: 'G4', T: 'E4', B: 'C3' }], ['I', 'I'], 'Two good voicings of the C major chord'), caption: 'Two good voicings of I in C major: root doubled, all voices in range, upper voices within an octave of each other.' },
      { k: 'rule', title: 'Doubling', t: 'A triad has three notes but four voices, so one note is doubled. In **root position**, double the **root**. **Never double the leading tone** or a chordal seventh (they have to resolve one way, and doubling them causes parallels). In first inversion, double a stable note (scale degree 1, 4 or 5); in second inversion, double the bass.' },
      { k: 'tip', t: 'Write the bass first, then the soprano, then fill in the alto and tenor with the remaining chord tones, keeping the upper voices close together.' },
      { k: 'try', prompt: 'Write a **C major (I) chord** in four parts with the root doubled. Choose a voice (Soprano, Alto, Tenor, Bass), then click the staff.', task: satbTask(C, 0, ['I'], [{ S: 'E5', A: 'G4', T: 'C4', B: 'C3' }]) },
    ],
    examples: [
      { q: 'Is this I chord in C major correct? Soprano E5, alto G4, tenor C4, bass C3.', staff: satb(0, [{ S: 'E5', A: 'G4', T: 'C4', B: 'C3' }], ['I'], 'Soprano E5, alto G4, tenor C4, bass C3'), steps: ['The notes are C, E and G, with C doubled: correct spelling and doubling.', 'Soprano to alto is a 6th and alto to tenor is a 4th, both within an octave, and every voice is in range, so the chord is correct.'], a: 'Yes, it is correct.' },
      { q: 'What is wrong with: soprano G5, alto E4, tenor C4, bass C3?', staff: satb(0, [{ S: 'G5', A: 'E4', T: 'C4', B: 'C3' }], ['I'], 'Soprano G5, alto E4, tenor C4, bass C3'), steps: ['The chord tones are fine (C, E, G with C doubled).', 'But soprano G5 to alto E4 is more than an octave (a 13th), a spacing error.'], a: 'Too much space between soprano and alto.' },
    ],
    practice: [
      MC('mt4-1-1', 1, 'Which voices are written on the bass staff in SATB style?', ['Soprano and alto', 'Alto and tenor', 'Tenor and bass', 'Bass only'], 2, 'Two voices per staff.', ['Soprano and alto are on the treble staff; tenor and bass are on the bass staff.']),
      MC('mt4-1-2', 1, 'What is the most space allowed between the alto and tenor?', ['A 5th', 'An octave', 'A 10th', 'A 12th'], 1, 'The upper three voices stay close.', ['Adjacent upper voices (S–A and A–T) should be no more than an octave apart. Only tenor and bass may be farther apart.']),
      TASK('mt4-1-3', 1, 'The bass G2 is given. Write the soprano, alto and tenor for a root-position **G major (I) chord in G major**.', satbTask(K('G'), 1, ['I'], [{ S: 'D5', A: 'G4', T: 'B3', B: 'G2' }], [{ B: 'G2' }]), 'G major is G–B–D. Double the root.', ['The chord is G–B–D. With G in the bass, put B and D and another G in the upper voices.', 'One good answer: soprano D5, alto G4, tenor B3. Upper voices are within an octave of each other.']),
      MC('mt4-1-4', 1, 'In a root-position triad, which chord member is usually doubled?', ['The root', 'The third', 'The fifth', 'Any member, equally'], 0, 'The most stable note of the chord.', ['In root position the root is the most stable note, so it is usually the one doubled.']),
      MC('mt4-1-5', 1, 'Which scale degree must never be doubled?', ['The tonic', 'The dominant', 'The subdominant', 'The leading tone'], 3, 'It has to resolve up by step.', ['The leading tone must rise to the tonic. If two voices have it, both would rise to the same note and create parallel octaves, so never double it.']),
      TASK('mt4-1-6', 2, 'The bass C3 is given. Write the upper voices for **V in F major** without doubling the leading tone.', satbTask(K('F'), -1, ['V'], [{ S: 'C5', A: 'G4', T: 'E4', B: 'C3' }], [{ B: 'C3' }]), 'V in F major is C–E–G; E is the leading tone.', ['V in F major is C–E–G, and E is the leading tone, so use E only once.', 'Double the root C: for example soprano C5, alto G4, tenor E4.']),
      MC('mt4-1-7', 2, 'What is the error in this I chord?', ['Parallel fifths', 'Voice crossing', 'Missing third', 'Too much space between soprano and alto'], 3, 'Measure soprano to alto.', ['Soprano E5 to alto C4 is a 10th, more than an octave.', 'That is a spacing error between soprano and alto.'], { staff: satb(0, [{ S: 'E5', A: 'C4', T: 'G3', B: 'C3' }], ['I'], 'Soprano E5, alto C4, tenor G3, bass C3'), check: () => { const r = rulesOf([{ S: 'E5', A: 'C4', T: 'G3', B: 'C3' }], C, ['I']); return r.includes('spacing') && !r.includes('crossing') && !r.includes('third'); } }),
      MC('mt4-1-8', 1, 'In a first-inversion triad, the third of the chord is in which voice?', ['The soprano', 'The tenor', 'The bass', 'Any voice except the bass'], 2, 'Inversion is decided by the lowest note.', ['First inversion means the third is the lowest note, so it is in the bass.']),
    ],
    remember: ['S and A on treble (stems up/down); T and B on bass (stems up/down).', 'Ranges: S C4–G5, A G3–D5, T C3–G4, B E2–D4.', 'S–A and A–T within an octave; no crossing.', 'Double the root in root position; never the leading tone.'],
    checkIn: 'Next: how voices move from chord to chord.',
  },
  {
    id: 'mt4-2', unit: 4, n: 2, title: 'Voice leading: motion and parallels',
    intro: 'Good part writing is about how each voice moves from one chord to the next. Today you learn the four types of motion, why parallel fifths and octaves are forbidden, and the habits that make voice leading smooth.',
    goals: ['Name parallel, similar, contrary and oblique motion', 'Find parallel fifths and octaves', 'Spot direct (hidden) fifths and octaves in the outer voices', 'Write smooth progressions with common tones and steps'],
    notes: [
      { k: 'rule', title: 'Four types of motion', t: '**Parallel:** both voices move the same direction by the same interval. **Similar:** same direction, different interval. **Contrary:** opposite directions. **Oblique:** one voice holds while the other moves.' },
      { k: 'rule', title: 'Forbidden parallels', t: 'Two voices may not move from a perfect 5th to another perfect 5th, or from an octave (or unison) to another octave, whether in parallel or in contrary motion. These **parallel fifths and octaves** make the voices lose their independence.' },
      { k: 'staff', staff: { clef: 'grand', label: 'Parallel fifths and octaves: every voice moves up a step from I to ii', events: [{ satb: { S: 'C5', A: 'G4', T: 'E4', B: 'C3' }, dur: 'h', label: 'I' }, { satb: { S: 'D5', A: 'A4', T: 'F4', B: 'D3' }, dur: 'h', label: 'ii', tone: 'bad' }] }, caption: 'Wrong: all four voices move up together, so soprano–bass makes parallel octaves (C–C to D–D) and alto–bass makes parallel fifths (G–C to A–D).' },
      { k: 'warn', t: '**Direct (hidden) fifths and octaves:** when the soprano and bass move in the same direction into a perfect 5th or octave and the soprano **leaps**, the effect is poor. Avoid it in the outer voices.' },
      { k: 'rule', title: 'Smooth voice leading', t: 'Keep **common tones** in the same voice. Move the other upper voices by **step** or small leap; the bass may leap. When the bass moves by step (IV to V), move the upper voices in **contrary motion** to the bass. Avoid melodic augmented 2nds (in minor) and leaps larger than an octave.' },
      { k: 'try', prompt: 'The bass is given: F2 then G2 (IV to V in C major). Write the soprano, alto and tenor so that the upper voices move **opposite** to the bass.', task: satbTask(C, 0, ['IV', 'V'], [{ S: 'A4', A: 'F4', T: 'C4', B: 'F2' }, { S: 'G4', A: 'D4', T: 'B3', B: 'G2' }], [{ B: 'F2' }, { B: 'G2' }]) },
    ],
    examples: [
      { q: 'Soprano C5 → D5 while the bass goes C3 → B2. What kind of motion?', steps: ['The soprano moves up; the bass moves down.', 'Opposite directions: contrary motion.'], a: 'Contrary motion' },
      { q: 'Find the errors from I (S E5, A G4, T C4, B C3) to ii (S F5, A A4, T D4, B D3).', steps: ['Tenor and bass: C4 over C3 is an octave, and D4 over D3 is an octave, both moving up: parallel octaves.', 'The alto\'s G4 is a perfect 5th above both the tenor (C4) and the bass (C3), and its A4 is again a perfect 5th above D4 and D3: parallel fifths, alto–tenor and alto–bass.'], a: 'Parallel octaves (tenor–bass) and parallel fifths (alto–tenor and alto–bass)' },
    ],
    practice: [
      MC('mt4-2-1', 1, 'Two voices move in the same direction and stay a perfect 5th apart. This is…', ['Contrary motion', 'Oblique motion', 'Parallel fifths', 'Direct fifths'], 2, 'Same direction, same interval.', ['Moving in the same direction while staying a perfect 5th apart is parallel fifths, which is forbidden in common-practice part writing.']),
      MC('mt4-2-2', 1, 'One voice holds a note while the other moves. This is…', ['Oblique motion', 'Similar motion', 'Contrary motion', 'Parallel motion'], 0, 'One voice stays still.', ['When one voice is stationary and the other moves, the motion is oblique.']),
      TASK('mt4-2-3', 2, 'The bass is given (C3 then F3). Write the upper voices for **I – IV in C major**, keeping the common tone C in the same voice.', satbTask(C, 0, ['I', 'IV'], C_I_IV, bassOnly(C_I_IV)), 'C is in both chords. Hold it in one voice.', ['I is C–E–G and IV is F–A–C; C is the common tone.', 'One good answer: soprano E5–F5, alto G4–A4, tenor holds C4. The other voices move by step.']),
      MC('mt4-2-4', 2, 'What error appears between these two chords?', ['Parallel fifths', 'Parallel octaves', 'Voice crossing', 'A doubled leading tone'], 1, 'Check the outer voices: C over C, then D over D.', ['Soprano and bass go from C5 over C3 (an octave, compound) to D5 over D3, another octave, both moving up.', 'That is parallel octaves.'], { staff: satb(0, [{ S: 'C5', A: 'G4', T: 'E4', B: 'C3' }, { S: 'D5', A: 'F4', T: 'D4', B: 'D3' }], ['I', 'ii'], 'Soprano C5 to D5 over bass C3 to D3'), check: () => { const e = errorsOnly(checkSatb([{ S: 'C5', A: 'G4', T: 'E4', B: 'C3' }, { S: 'D5', A: 'F4', T: 'D4', B: 'D3' }], C)).filter((x) => x.rule === 'parallels'); return e.length === 1 && e[0].msg.includes('octaves') && e[0].voices!.includes('S') && e[0].voices!.includes('B'); } }),
      MC('mt4-2-5', 1, 'Which of these parallels is allowed?', ['Parallel fifths', 'Parallel octaves', 'Parallel unisons', 'Parallel thirds'], 3, 'Only perfect intervals are forbidden in parallel.', ['Parallel 3rds and 6ths are fine and very common. Only perfect intervals (unisons, 5ths, octaves) are forbidden in parallel.']),
      TASK('mt4-2-6', 2, 'The bass is given (G2 then D3). Write the upper voices for **I – V in G major**.', satbTask(K('G'), 1, ['I', 'V'], G_I_V, bassOnly(G_I_V)), 'D is common to both chords.', ['I is G–B–D and V is D–F♯–A; D is the common tone. Keep it in the tenor.', 'One good answer: soprano B4–A4, alto G4–F♯4, tenor D4–D4.']),
      MC('mt4-2-7', 2, 'The soprano leaps up into an octave with the bass, both voices moving up. This is…', ['Direct (hidden) octaves', 'Parallel octaves', 'Contrary octaves', 'Oblique motion'], 0, 'They arrive at an octave from a different interval.', ['They were not an octave apart before, so it is not parallel octaves; arriving at an octave in similar motion with a soprano leap is a direct (hidden) octave.']),
      MC('mt4-2-8', 2, 'In A minor, the alto moves from F to G♯. What is the problem?', ['Nothing is wrong', 'It is a tritone', 'It is an augmented 2nd, which is awkward to sing', 'It crosses the tenor'], 2, 'Count letters and half steps from F to G♯.', ['F to G♯ spans two letters (a 2nd) but three half steps: an augmented 2nd, an awkward melodic interval to avoid.'], { check: () => ivName('F4', 'G#4') === 'A2' }),
    ],
    remember: ['Motion: parallel, similar, contrary, oblique.', 'No parallel (or contrary) 5ths or octaves.', 'Avoid direct 5ths/8ves in the outer voices with a soprano leap.', 'Hold common tones; move by step; contrary motion against a stepping bass.'],
    checkIn: 'Next: chord function and how progressions move.',
  },
  {
    id: 'mt4-3', unit: 4, n: 3, title: 'Harmonic function and root-position progressions',
    intro: 'Chords have jobs. Some feel like home, some prepare the dominant, and some push strongly back to the tonic. Today you learn tonic, predominant and dominant function, the typical order of a phrase, and how to connect root-position chords smoothly.',
    goals: ['Label chords as tonic, predominant or dominant', 'Recognize the T–PD–D–T phrase model', 'Know common root movements (descending fifths, thirds, ascending seconds)', 'Voice-lead root-position progressions'],
    notes: [
      { k: 'rule', title: 'Three functions', t: '**Tonic (T):** I (also vi, and sometimes iii). **Predominant (PD):** IV and ii (iv and ii° in minor). **Dominant (D):** V, V7 and vii°. A typical phrase moves **T → PD → D → T**.' },
      { k: 'staff', staff: satb(0, I_IV_V_I, ['I', 'IV', 'V', 'I'], 'I IV V I in C major'), caption: 'I – IV – V – I in C major: tonic, predominant, dominant, tonic. The bass may leap; the upper voices move smoothly.' },
      { k: 'p', t: 'Common root movements: **descending fifths** (vi–ii–V–I), **descending thirds** (I–vi–IV–ii) and **ascending seconds** (IV–V, V–vi). A **retrogression**, such as V going to IV, runs against the usual flow and is rare in common-practice style.' },
      { k: 'rule', title: 'Connecting root-position chords', t: 'Roots a **5th** apart: keep the one common tone and move the other two upper voices by step. Roots a **3rd** apart: keep two common tones. Roots a **2nd** apart (no common tones): move all three upper voices **opposite** to the bass.' },
      { k: 'tip', t: 'In the **deceptive progression** V–vi, double the **third** of vi (the tonic note), so the leading tone can rise to it without creating parallels.' },
      { k: 'try', prompt: 'The bass is given. Write the upper voices for **V – vi in C major** (a deceptive progression), doubling the third of vi.', task: satbTask(C, 0, ['V', 'vi'], DECEPTIVE, bassOnly(DECEPTIVE)) },
    ],
    examples: [
      { q: 'Label the function of each chord in I – ii – V – I.', steps: ['I is tonic.', 'ii is predominant.', 'V is dominant, and the final I is tonic again.'], a: 'T – PD – D – T' },
      { q: 'Which chord best fills the gap in I – ? – V – I?', steps: ['Between tonic and dominant, a predominant chord is expected.', 'The predominants in major are IV and ii.'], a: 'IV or ii' },
    ],
    practice: [
      MC('mt4-3-1', 1, 'Which chords have dominant function?', ['IV and ii', 'I and vi', 'V and vii°', 'iii and vi'], 2, 'They contain the leading tone.', ['V and vii° both contain the leading tone and push strongly to the tonic: dominant function.']),
      MC('mt4-3-2', 1, 'Which progression follows the typical T–PD–D–T order?', ['I–V–IV–I', 'I–ii–V–I', 'I–V–ii–I', 'I–vii°–IV–I'], 1, 'Predominant before dominant.', ['I (T), ii (PD), V (D), I (T) is the model order.']),
      TASK('mt4-3-3', 3, 'The bass is given. Write the upper voices for **I – IV – V – I in F major**.', satbTask(K('F'), -1, ['I', 'IV', 'V', 'I'], F_PROG, bassOnly(F_PROG)), 'IV to V has no common tones: move the upper voices against the bass.', ['I: F–A–C, IV: B♭–D–F, V: C–E–G, I: F–A–C.', 'One good answer: soprano C5–D5–C5–C5, alto F4–F4–E4–F4, tenor A3–B♭3–G3–A3.', 'From IV to V the bass rises a step, so all three upper voices move down.']),
      MC('mt4-3-4', 2, 'vi – ii – V – I: how do the roots move?', ['Ascending seconds', 'Descending fifths', 'Descending thirds', 'Repeated notes'], 1, 'In C: A, D, G, C.', ['In C major the roots are A, D, G, C. Each is a perfect 5th below the one before: descending fifths.'], { check: () => { const r = ['vi', 'ii', 'V', 'I'].map((x) => parseRoman(x, C).root); return r.every((p, i) => i === 0 || pc(transpose(r[i - 1], 'P5', true)) === pc(p)); } }),
      MC('mt4-3-5', 1, 'In C major, which chord can stand in for I as a tonic-function chord?', ['ii', 'IV', 'V', 'vi'], 3, 'It shares two notes with I.', ['vi (A–C–E) shares C and E with I (C–E–G), so it can act as a tonic substitute, as in the deceptive progression.']),
      MC('mt4-3-6', 2, 'In the deceptive progression V–vi, which note of vi is usually doubled?', ['Its root', 'Its third (the tonic note)', 'Its fifth', 'The leading tone'], 1, 'Where does the leading tone want to go?', ['The leading tone rises to the tonic, which is the third of vi. Doubling that third keeps the voice leading smooth and avoids parallels.']),
      TASK('mt4-3-7', 2, 'The bass is given (G2 then A2). Write the upper voices for **V – vi in C major**.', satbTask(C, 0, ['V', 'vi'], DECEPTIVE, bassOnly(DECEPTIVE)), 'Let the leading tone rise to C, and double C in vi.', ['V is G–B–D; vi is A–C–E.', 'One good answer: soprano D5–C5, alto G4–E4, tenor B3–C4. The leading tone B rises to C, so C (the third of vi) is doubled.']),
      MC('mt4-3-8', 2, 'Which progression is a retrogression in common-practice style?', ['IV–V', 'ii–V', 'V–IV', 'vi–ii'], 2, 'Which one moves backward from D to PD?', ['V (dominant) to IV (predominant) reverses the usual T–PD–D order, so it is a retrogression.']),
    ],
    remember: ['T: I, vi. PD: IV, ii. D: V, V7, vii°.', 'Typical order: T → PD → D → T.', 'Roots a 5th apart: hold one common tone; a 2nd apart: contrary motion to the bass.', 'V–vi: double the third of vi.'],
    checkIn: 'Next: how phrases end, the cadences.',
  },
  {
    id: 'mt4-4', unit: 4, n: 4, title: 'Cadences and phrases',
    intro: 'Cadences are the punctuation of music: some are full stops, some are commas, and some are surprises. Today you learn to name every cadence the exam asks about, by eye and by ear.',
    goals: ['Name PAC, IAC, HC, plagal, deceptive and Phrygian half cadences', 'Tell perfect from imperfect authentic cadences', 'Hear the difference between cadence types', 'Write a perfect authentic cadence'],
    notes: [
      { k: 'p', t: 'A **phrase** is a complete musical thought, and it ends with a **cadence**: a harmonic arrival point.' },
      { k: 'rule', title: 'Authentic cadences', t: 'An **authentic cadence** is V(7) – I. It is **perfect (PAC)** when both chords are in root position and the soprano ends on the tonic. Otherwise (the soprano ends on 3 or 5, or a chord is inverted, or vii° replaces V) it is **imperfect (IAC)**.' },
      { k: 'staff', staff: satb(0, PAC, ['V', 'I'], 'A perfect authentic cadence in C major'), caption: 'A PAC in C major: V – I, both in root position, with the soprano falling D5 to C5 to end on the tonic.' },
      { k: 'rule', title: 'Other cadences', t: '**Half cadence (HC):** the phrase ends **on V**. **Phrygian half cadence:** iv6 – V in minor (the bass falls a half step to the dominant). **Plagal (PC):** IV – I (the "Amen" cadence). **Deceptive (DC):** V – vi, where the ear expects I.' },
      { k: 'tip', t: 'Listening for cadences: if the last chord is V, it is a half cadence. If it ends on I after V, check the soprano: tonic on top (and root positions) means PAC. If V goes somewhere unexpected, usually vi, it is deceptive.' },
      { k: 'staff', staff: satb(0, DECEPTIVE, ['V', 'vi'], 'A deceptive cadence in C major'), caption: 'A deceptive cadence: V – vi. Listen to how the ending feels unfinished.' },
    ],
    examples: [
      { q: 'A phrase ends ii6 – V in C major. Which cadence is it?', steps: ['The phrase ends on V.', 'Ending on V is a half cadence.'], a: 'Half cadence' },
      { q: 'A phrase ends V – I, both in root position, with E5 in the soprano at the end. Which cadence?', steps: ['V – I is an authentic cadence.', 'The soprano ends on E, scale degree 3, not the tonic, so it is imperfect: an IAC.'], a: 'Imperfect authentic cadence' },
    ],
    practice: [
      MC('mt4-4-1', 1, 'A phrase that ends on V has a…', ['perfect authentic cadence', 'half cadence', 'plagal cadence', 'deceptive cadence'], 1, 'Where does it stop?', ['Stopping on the dominant, like a comma, is a half cadence.']),
      MC('mt4-4-2', 1, 'V – vi is called a…', ['plagal cadence', 'half cadence', 'deceptive cadence', 'Phrygian half cadence'], 2, 'The ear expects I.', ['V usually goes to I. Going to vi instead "deceives" the ear: a deceptive cadence.']),
      MC('mt4-4-3', 2, 'Which cadence is this?', ['Perfect authentic cadence', 'Imperfect authentic cadence', 'Half cadence', 'Plagal cadence'], 0, 'Check both bass notes and the last soprano note.', ['V to I, both in root position (bass G then C).', 'The soprano ends on C, the tonic, so it is a perfect authentic cadence.'], { staff: satb(0, PAC, ['V', 'I'], 'V to I with the soprano ending on C5'), check: () => romanOf(chords(PAC)[0], C) === 'V' && pc(PAC[0].B!) === 'G' && pc(PAC[1].B!) === 'C' && pc(PAC[1].S!) === 'C' && errorsOnly(checkSatb(PAC, C, ['V', 'I'])).length === 0 }),
      MC('mt4-4-4', 2, 'iv6 – V in a minor key is a…', ['Phrygian half cadence', 'plagal cadence', 'deceptive cadence', 'perfect authentic cadence'], 0, 'The bass falls a half step to the dominant.', ['iv6 – V ends on V, so it is a half cadence; with the bass falling a half step (6 to 5 in minor) it is the special Phrygian half cadence.']),
      MC('mt4-4-5', 2, 'Listen to this short progression. How does it end?', ['Authentic cadence', 'Half cadence', 'Plagal cadence', 'Deceptive cadence'], 3, 'Does the last chord sound like home, or a surprise?', ['The progression builds to V, then moves to a minor chord instead of home.', 'V going to vi is a deceptive cadence.'], { listen: hear(chords([I_IV_V_I[0], I_IV_V_I[1], ...DECEPTIVE]), [1, 1, 1, 2], 72), check: () => romanOf(chords(DECEPTIVE)[1], C) === 'vi' }),
      TASK('mt4-4-6', 2, 'Write a **perfect authentic cadence** in C major. The bass (G2, C3) and the final soprano C5 are given.', satbTask(C, 0, ['V', 'I'], PAC, [{ B: 'G2' }, { B: 'C3', S: 'C5' }]), 'The leading tone must rise to C.', ['V is G–B–D. Put D5 in the soprano so it can step down to C5.', 'Fill in: alto G4–E4, tenor B3–C4 (the leading tone rises).', 'The final I is C–E–C–C: an incomplete tonic (no fifth) is fine.']),
      MC('mt4-4-7', 1, 'IV – I at the end of a phrase is a…', ['half cadence', 'plagal cadence', 'deceptive cadence', 'authentic cadence'], 1, 'The "Amen" sound.', ['IV – I is the plagal cadence, often heard as the "Amen" at the end of a hymn.']),
      MC('mt4-4-8', 2, 'What makes an authentic cadence "perfect"?', ['The V chord has a seventh', 'It ends on V', 'Both chords are in root position and the soprano ends on the tonic', 'It is in a major key'], 2, 'Two conditions.', ['A PAC needs V and I in root position, with the tonic in the soprano at the end.']),
    ],
    remember: ['PAC: V–I, root positions, tonic in the soprano.', 'IAC: any other V–I (or vii°–I).', 'HC ends on V; Phrygian HC: iv6–V in minor.', 'Plagal IV–I; deceptive V–vi.'],
    checkIn: 'That completes Unit 4. Next: predominant chords and first inversions.',
  },
  {
    id: 'mt5-1', unit: 5, n: 1, title: 'Predominant chords and first inversions',
    intro: 'The predominant chord sets up the dominant. Today you learn the predominant chords (IV, ii, ii6 and ii7), why ii6 is so common, and how first-inversion chords make smooth bass lines.',
    goals: ['Use IV, ii, ii6 and ii7 as predominants', 'Use ii°6 in minor keys', 'Double correctly in first-inversion chords', 'Recognize predominants by their bass note (scale degree 4)'],
    notes: [
      { k: 'rule', title: 'The predominants', t: 'In major: **IV, ii, ii6, ii7** (and ii65). In minor: **iv**, and **ii°6** (the supertonic triad is diminished in minor, so it is almost always in first inversion). They usually lead to V or to a cadential 6/4.' },
      { k: 'p', t: 'Many predominants put **scale degree 4** in the bass (IV and ii6 both do). From 4 the bass rises a step to 5 for the dominant, a strong, smooth bass line.' },
      { k: 'staff', staff: satb(0, II6_PROG, ['I', 'ii6', 'V', 'I'], 'I ii6 V I in C major'), caption: 'I – ii6 – V – I in C major. The bass climbs C – F – G and falls back to C; in ii6 the bass F is doubled.' },
      { k: 'rule', title: 'Doubling in first inversion', t: 'In a first-inversion triad, double a **stable** scale degree: 1, 4 or 5. In ii6 that usually means doubling the **bass** (scale degree 4). Never double the leading tone.' },
      { k: 'tip', t: 'First-inversion chords (6 chords) let the bass move by step instead of leaping, and they are lighter than root position, which makes them good for the middle of a phrase.' },
      { k: 'try', prompt: 'Write **ii6 in E♭ major**.', task: romanTask('ii6', K('Eb')) },
    ],
    examples: [
      { q: 'Spell ii6 in G major.', steps: ['ii in G major is built on A: A–C–E (minor).', 'The 6 means first inversion, with the third, C, in the bass: C–E–A.'], a: 'C–E–A (C in the bass)' },
      { q: 'In D minor, which predominant chord is usually in first inversion?', steps: ['In D minor the supertonic triad is E–G–B♭, a diminished triad.', 'Diminished triads sound harsh in root position, so it appears as ii°6, with G in the bass.'], a: 'ii°6' },
    ],
    practice: [
      MC('mt5-1-1', 1, 'Which scale degree is in the bass of a ii6 chord?', ['2', '6', '4', '5'], 2, 'The third of the ii chord.', ['ii is built on degree 2; its third is degree 4. In first inversion that third is in the bass.'], { check: () => { const r = parseRoman('ii6', C); return pc(chord(r.root, r.q)[r.inversion]) === 'F'; } }),
      TASK('mt5-1-2', 2, 'Write **ii6 in E♭ major**.', romanTask('ii6', K('Eb')), 'ii in E♭ major is built on F.', ['ii in E♭ major is F–A♭–C (minor).', 'First inversion puts A♭ in the bass: A♭–C–F.']),
      TASK('mt5-1-3', 3, 'The bass is given. Write the upper voices for **I – ii6 – V – I in C major**.', satbTask(C, 0, ['I', 'ii6', 'V', 'I'], II6_PROG, bassOnly(II6_PROG)), 'In ii6, double the bass F. Watch for parallel fifths between the upper voices.', ['I: C–E–G; ii6: D–F–A with F in the bass; V: G–B–D; I: C–E–G.', 'One good answer: soprano C5–D5–B4–C5, alto G4–A4–G4–G4, tenor E4–F4–D4–E4.', 'Check: the leading tone B4 in the soprano rises to C5 at the end.']),
      MC('mt5-1-4', 1, 'In minor keys the supertonic triad is diminished, so it usually appears as…', ['ii°', 'ii°6', 'II', 'ii°6/4'], 1, 'Diminished triads avoid root position.', ['A diminished triad in root position sounds harsh (a tritone above the bass), so composers use ii°6.']),
      MC('mt5-1-5', 1, 'Which of these is NOT a predominant chord?', ['IV', 'ii6', 'ii7', 'vii°'], 3, 'One of them contains the leading tone.', ['vii° contains the leading tone and has dominant function. IV, ii6 and ii7 are predominants.']),
      { ...MC('mt5-1-6', 2, 'In F major, which note is in the bass of a ii6 chord?', ['G', 'D', 'B♭', 'C'], 2, 'ii in F is built on G; find its third.', ['ii in F major is G–B♭–D. The 6 puts the third, B♭, in the bass.'], { check: () => { const r = parseRoman('ii6', K('F')); return pc(chord(r.root, r.q)[r.inversion]) === 'Bb'; } }) },
      MC('mt5-1-7', 2, 'In G major, what is the Roman numeral of this chord?', ['IV', 'ii6', 'vi6/4', 'ii'], 1, 'Restack the notes in 3rds, then look at the bass.', ['Restacked: A–C–E, built on degree 2 of G major: ii.', 'C, the third, is in the bass, so it is ii6.'], { staff: notes('treble', [['C4', 'E4', 'A4']], 'C E A in G major', { fifths: 1 }), check: () => romanOf(['C4', 'E4', 'A4'], K('G')) === 'ii6' }),
      MC('mt5-1-8', 2, 'Listen to the progression. Which bass line do you hear (in scale degrees)?', ['1 – 5 – 4 – 1', '1 – 2 – 5 – 1', '1 – 4 – 5 – 1', '1 – 6 – 5 – 1'], 2, 'Follow the lowest notes: does the second one go up a 4th or a 2nd?', ['The bass starts on 1, drops to 4, rises a step to 5, and falls back to 1.', 'That is 1 – 4 – 5 – 1, the bass of I – IV – V – I.'], { listen: hear(chords(I_IV_V_I), [1, 1, 1, 2], 70), check: () => I_IV_V_I.map((c) => pc(c.B!)).join() === 'C,F,G,C' }),
    ],
    remember: ['Predominants: IV, ii, ii6, ii7 (iv and ii°6 in minor).', 'ii6 and IV put scale degree 4 in the bass.', 'In 6 chords double a stable degree (often the bass); never the leading tone.'],
    checkIn: 'Next: the dominant seventh and how it resolves.',
  },
  {
    id: 'mt5-2', unit: 5, n: 2, title: 'The dominant seventh and its resolution',
    intro: 'The dominant seventh is the engine of tonal music: it contains two tendency tones that pull hard toward the tonic chord. Today you learn exactly where each note of V7 goes, in root position and in every inversion.',
    goals: ['Resolve the leading tone up and the chordal 7th down', 'Choose complete or incomplete chords to avoid errors', 'Resolve V65, V43 and V42 correctly', 'Hear V7 resolving to I and to vi'],
    notes: [
      { k: 'rule', title: 'Tendency tones of V7', t: 'In V7 (G–B–D–F in C major) the **third** is the leading tone and must **rise** to the tonic (B → C). The **seventh** is a dissonance and must **fall by step** to scale degree 3 (F → E).' },
      { k: 'staff', staff: satb(0, V7_I, ['V7', 'I'], 'V7 to I in C major: B rises to C, F falls to E'), caption: 'V7 – I in C major: the leading tone B4 rises to C5, the seventh F5 falls to E5, and the bass leaps G to C.' },
      { k: 'rule', title: 'Complete and incomplete chords', t: 'Root-position **V7 – I**: a complete V7 resolves to an **incomplete I** (tripled root, no fifth), or an incomplete V7 (no fifth, doubled root) resolves to a complete I. Trying to keep both chords complete usually causes errors.' },
      { k: 'rule', title: 'Inversions', t: '**V65** has the leading tone in the bass, so the bass rises to 1 (V65 – I). **V43** has scale degree 2 in the bass and usually goes to I or I6. **V42** has the seventh in the bass, so the bass falls to 3: **V42 – I6**.' },
      { k: 'warn', t: 'In an inner voice of a complete V7 going to a complete I, the leading tone may drop to scale degree 5 ("frustrated leading tone"). In the soprano or bass it must always rise.' },
      { k: 'try', prompt: 'Write **V42 in C major** (the dominant seventh with its seventh in the bass).', task: romanTask('V42', C) },
    ],
    examples: [
      { q: 'Resolve G7 (G–B–D–F) to C major. Where does each note go?', steps: ['B, the leading tone, rises to C.', 'F, the seventh, falls to E.', 'D moves to C (or E), and the bass G leaps to C.'], a: 'B→C, F→E, D→C, G→C' },
      { q: 'V42 normally resolves to which inversion of I?', steps: ['In V42 the seventh is in the bass.', 'The seventh must fall by step to scale degree 3, which puts the third of I in the bass: I6.'], a: 'I6' },
    ],
    practice: [
      MC('mt5-2-1', 1, 'In V7, which chord member must resolve down by step?', ['The root', 'The third', 'The fifth', 'The seventh'], 3, 'It is the dissonance.', ['The seventh is a dissonance against the root and resolves down by step (F to E in C major).']),
      { ...MC('mt5-2-2', 1, 'In D major, which note is the seventh of V7?', ['A', 'C♯', 'G', 'E'], 2, 'V7 in D is built on A.', ['V7 in D major is A–C♯–E–G. Its seventh is G.'], { check: () => { const r = parseRoman('V7', K('D')); return pc(chord(r.root, r.q)[3]) === 'G'; } }) },
      TASK('mt5-2-3', 2, 'The bass is given (G2 then C3). Write the upper voices for **V7 – I in C major**.', satbTask(C, 0, ['V7', 'I'], V7_I, bassOnly(V7_I)), 'B rises to C; F falls to E.', ['A complete V7 over G2: soprano F5, alto B4, tenor D4.', 'Resolve: F5 → E5 (the seventh falls), B4 → C5 (the leading tone rises), D4 → C4.', 'The final I is incomplete (C–E with C tripled), which is correct here.']),
      MC('mt5-2-4', 1, 'V42 normally resolves to…', ['I', 'I6', 'I6/4', 'vi'], 1, 'The bass is the seventh, which falls by step.', ['The bass of V42 is the seventh; it falls a step to scale degree 3, so the tonic chord is in first inversion: I6.']),
      TASK('mt5-2-5', 2, 'Write **V65 in F major**.', romanTask('V65', K('F')), 'V7 in F is C–E–G–B♭; 6/5 puts the third in the bass.', ['V7 in F major is C–E–G–B♭.', 'V65 puts the third, E (the leading tone), in the bass: E–G–B♭–C.']),
      MC('mt5-2-6', 2, 'A complete V7 resolving to I in root position usually produces…', ['a complete I with a doubled third', 'an incomplete I (tripled root, no fifth)', 'parallel fifths', 'a I6/4 chord'], 1, 'Follow each tendency tone.', ['When every tendency tone of a complete V7 resolves correctly, the fifth of I is not reached, so I has a tripled root and no fifth.']),
      TASK('mt5-2-7', 3, 'The bass is given (F♯3 then G3). Write the upper voices for **V65 – I in G major**.', satbTask(K('G'), 1, ['V65', 'I'], V65_I, bassOnly(V65_I)), 'The bass is the leading tone. Find the seventh (C) and resolve it down.', ['V65 in G is D–F♯–A–C with F♯ in the bass. One voicing: soprano D5, alto A4, tenor C4.', 'Resolve: the bass F♯ rises to G, the seventh C4 falls to B3, A4 moves to G4, and D5 holds.']),
      MC('mt5-2-8', 2, 'Listen: where does the dominant seventh go?', ['V7 – I', 'V7 – vi', 'IV – I', 'V7 – IV'], 1, 'Does the second chord sound like home?', ['The second chord sounds like a surprise, a minor chord, not home.', 'The dominant seventh moved to vi: V7 – vi.'], { listen: hear([['G2', 'D4', 'B4', 'F5'], ['A2', 'C4', 'C5', 'E5']], [2, 3], 66), check: () => romanOf(['A2', 'C4', 'C5', 'E5'], C) === 'vi' && romanOf(['G2', 'D4', 'B4', 'F5'], C) === 'V7' }),
    ],
    remember: ['Leading tone up; chordal 7th down by step.', 'Complete V7 → incomplete I (or the reverse).', 'V65 → I (bass up); V42 → I6 (bass down).'],
    checkIn: 'Next: the four kinds of six-four chord.',
  },
  {
    id: 'mt5-3', unit: 5, n: 3, title: 'Six-four chords',
    intro: 'Second-inversion (6/4) chords are unstable, so in common-practice music they appear only in four special situations. Today you learn all four (cadential, passing, pedal and arpeggiating) and how to write the most important one, the cadential 6/4.',
    goals: ['Recognize cadential, passing, pedal and arpeggiating 6/4 chords', 'Write a cadential 6/4 progression', 'Double the bass in any 6/4 chord', 'Label the cadential 6/4'],
    notes: [
      { k: 'rule', title: 'Four kinds of 6/4', t: '**Cadential 6/4:** I64 over the dominant bass, resolving to V (the upper voices move down by step: 6–5 and 4–3 above the bass). **Passing 6/4:** the bass passes by step between two positions of a chord (I – V64 – I6). **Pedal (neighboring) 6/4:** the bass holds while the upper voices decorate (I – IV64 – I). **Arpeggiating 6/4:** the bass arpeggiates one chord.' },
      { k: 'staff', staff: satb(0, CAD64, ['ii6', 'I64', 'V', 'I'], 'ii6 I64 V I in C major: a cadential six-four'), caption: 'A cadential 6/4 in C major: over the bass G, C and E fall to B and D (6–5 and 4–3), then V resolves to I.' },
      { k: 'staff', staff: satb(0, PASSING64, ['I', 'V64', 'I6'], 'I V64 I6 in C major: a passing six-four'), caption: 'A passing 6/4: the bass walks C – D – E, and V64 fills the gap between I and I6.' },
      { k: 'rule', title: 'Doubling', t: 'In any 6/4 chord, **double the bass** (the fifth of the chord).' },
      { k: 'tip', t: 'The cadential 6/4 sounds like a tonic chord but acts as a decoration of V: it appears on a strong beat just before the dominant. You may label it I64 – V or V(64–53).' },
      { k: 'try', prompt: 'Write **I64 in B♭ major**.', task: romanTask('I64', K('Bb')) },
    ],
    examples: [
      { q: 'The bass G holds while the upper voices move C and E down to B and D. What is the first chord?', steps: ['Over G, the notes C and E form C–E–G: a tonic triad in second inversion.', 'It sits on the dominant bass and resolves down to V: a cadential 6/4.'], a: 'A cadential 6/4' },
      { q: 'I – V64 – I6 with the bass C – D – E. Which kind of 6/4?', steps: ['The bass moves by step through D.', 'A 6/4 on a stepwise bass between two positions of the same chord is a passing 6/4.'], a: 'Passing 6/4' },
    ],
    practice: [
      MC('mt5-3-1', 1, 'In a cadential 6/4, which scale degree is in the bass?', ['The tonic', 'The subdominant', 'The dominant', 'The leading tone'], 2, 'It leads into V.', ['The cadential 6/4 is a tonic triad over the dominant note, which stays in the bass for the V that follows.'], { check: () => { const r = parseRoman('I64', C); return pc(chord(r.root, r.q)[r.inversion]) === 'G'; } }),
      MC('mt5-3-2', 1, 'I – V64 – I6 with a stepwise bass is a…', ['cadential 6/4', 'passing 6/4', 'pedal 6/4', 'arpeggiating 6/4'], 1, 'The bass passes between two notes.', ['The bass steps 1 – 2 – 3 and the 6/4 fills the gap: a passing 6/4.']),
      MC('mt5-3-3', 1, 'I – IV64 – I over a held tonic bass is a…', ['pedal (neighboring) 6/4', 'passing 6/4', 'cadential 6/4', 'arpeggiating 6/4'], 0, 'The bass does not move.', ['The bass holds the tonic while the upper voices move to IV64 and back: a pedal (neighboring) 6/4.']),
      TASK('mt5-3-4', 3, 'The bass is given. Write the upper voices for **ii6 – I64 – V – I in C major** (a cadential 6/4).', satbTask(C, 0, ['ii6', 'I64', 'V', 'I'], CAD64, bassOnly(CAD64)), 'Over the held G, move C→B and E→D.', ['ii6: D–F–A with F in the bass (soprano D5, alto A4, tenor F4).', 'I64: soprano C5, alto G4, tenor E4 over G3; then V: soprano B4, tenor D4 (the 6–5 and 4–3 motion).', 'Final I: soprano C5 (the leading tone rises), alto G4, tenor E4 over C3.']),
      MC('mt5-3-5', 2, 'Which kind of 6/4 is the middle chord here?', ['Cadential', 'Pedal', 'Passing', 'Arpeggiating'], 2, 'Follow the bass: C – D – E.', ['The bass walks up by step C – D – E, and the middle chord (V64) is between I and I6: a passing 6/4.'], { staff: satb(0, PASSING64, ['I', 'V64', 'I6'], 'I V64 I6 over a bass C D E'), check: () => romanOf(chords(PASSING64)[1], C) === 'V64' && romanOf(chords(PASSING64)[2], C) === 'I6' }),
      MC('mt5-3-6', 1, 'Which chord member do you double in a six-four chord?', ['The root', 'The third', 'The bass (the fifth)', 'The seventh'], 2, 'The note on the bottom.', ['In 6/4 chords, double the bass note, which is the fifth of the chord.']),
      TASK('mt5-3-7', 2, 'Write **I64 in B♭ major**.', romanTask('I64', K('Bb')), 'I in B♭ is B♭–D–F; 6/4 puts the fifth in the bass.', ['I in B♭ major is B♭–D–F.', 'Second inversion puts F in the bass: F–B♭–D.']),
      MC('mt5-3-8', 2, 'The cadential 6/4 functions as…', ['a tonic chord', 'a decoration of the dominant', 'a predominant', 'a secondary dominant'], 1, 'What chord does it resolve into, over the same bass?', ['It contains the tonic triad\'s notes, but it sits on the dominant bass and resolves into V, so it acts as an embellishment of the dominant.']),
    ],
    remember: ['Four 6/4 types: cadential, passing, pedal, arpeggiating.', 'Cadential 6/4: I64 → V over the dominant bass (6–5, 4–3).', 'Double the bass in a 6/4.'],
    checkIn: 'That completes Unit 5. Next: non-chord tones.',
  },
];

export const MUSIC_C_TUTOR: Record<string, LessonTutor> = {
  'mt4-1': {
    bigIdea: [
      'Four-part writing imitates a choir. Each of the four voices (soprano, alto, tenor, bass) sings one note of every chord, so one chord tone is always doubled.',
      'Each voice has a comfortable range, and the upper three voices stay close together (no more than an octave apart), while the bass can sit lower. Voices never cross.',
      'The doubling choice matters: double the root in root position, and never double the leading tone, because it has only one good place to go and two voices going there would make parallel octaves.',
    ],
    picture: { title: 'A choir on risers', t: 'Picture four singers on risers. Each stays in their own row (no crossing), the top three stand close together, and the bass can stand a little apart. Whoever has the most stable note can share it with a neighbour.' },
    words: [
      { term: 'SATB', means: 'Soprano, alto, tenor, bass: four-part vocal texture.' },
      { term: 'Spacing', means: 'The distance between neighbouring voices.' },
      { term: 'Voice crossing', means: 'A lower voice going above a higher one.' },
      { term: 'Doubling', means: 'Giving the same chord member to two voices.' },
    ],
    tools: [{ name: 'Diatonic chords', refresher: 'Spell the chord from its Roman numeral first.', lesson: 'mt3-3' }],
    why: [
      ['Check spelling and doubling first.', 'Then check spacing and ranges.'],
      ['The notes are right, so look at spacing.', 'Soprano to alto is more than an octave.'],
    ],
    walk: {
      'mt4-1-1': ['SATB uses two staves.', 'Treble staff: soprano and alto. Bass staff: tenor and bass.', 'So tenor and bass (choice C).'],
      'mt4-1-2': ['The upper three voices must stay close.', 'Adjacent upper voices may be at most an octave apart.', 'The answer is an octave (choice B).'],
      'mt4-1-3': ['The I chord in G major is G–B–D.', 'With G2 in the bass, give the upper voices D, G and B.', 'For example soprano D5, alto G4, tenor B3.'],
      'mt4-1-4': ['Root position is built on the root.', 'The root is the most stable member.', 'Double the root (choice A).'],
      'mt4-1-5': ['The leading tone must resolve up to the tonic.', 'Doubling it would force parallel octaves.', 'Never double the leading tone (choice D).'],
      'mt4-1-6': ['V in F major is C–E–G; E is the leading tone.', 'Double the root C instead.', 'For example soprano C5, alto G4, tenor E4.'],
      'mt4-1-7': ['The chord has C, E and G: spelling is fine.', 'Soprano E5 to alto C4 is a 10th.', 'That is a spacing error between soprano and alto (choice D).'],
      'mt4-1-8': ['First inversion is named for its bass note.', 'The third of the chord is the lowest note.', 'So the third is in the bass (choice C).'],
    },
    teach: {
      plan: ['Draw a grand staff and place S, A, T, B with their stems.', 'List the four ranges.', 'Show a good chord and one with a spacing error.', 'Explain the doubling rules with the leading tone as the big exception.'],
      questions: [
        { q: 'Can the tenor and bass be more than an octave apart?', a: 'Yes. Only the upper pairs (soprano–alto, alto–tenor) must stay within an octave.' },
        { q: 'What if I leave out the fifth?', a: 'In a root-position triad you may leave out the fifth (triple the root), but never leave out the third.' },
      ],
      keyPoints: ['Two voices per staff, with stem directions.', 'Stay in range and within an octave for S–A and A–T.', 'Double the root; never the leading tone.'],
    },
  },
  'mt4-2': {
    bigIdea: [
      'Between two chords, each pair of voices moves in one of four ways: parallel, similar, contrary or oblique. Good part writing uses lots of contrary and oblique motion.',
      'Perfect 5ths and octaves are so blended that when two voices move from one to another, they stop sounding like two voices. That is why parallel fifths and octaves are forbidden.',
      'The smoothest connection keeps common tones in the same voice and moves the other voices to the nearest available chord tone.',
    ],
    picture: { title: 'Dancers on a stage', t: 'Imagine four dancers. If two copy each other exactly (parallel fifths or octaves), they look like one dancer. The choreography is best when they mirror each other (contrary motion) or one holds still while the other moves (oblique).' },
    words: [
      { term: 'Contrary motion', means: 'Voices moving in opposite directions.' },
      { term: 'Parallel fifths/octaves', means: 'Two voices moving between the same perfect interval: forbidden.' },
      { term: 'Direct (hidden) octaves', means: 'Outer voices moving in the same direction into an octave, with a soprano leap.' },
      { term: 'Common tone', means: 'A note shared by two consecutive chords.' },
    ],
    tools: [{ name: 'Four-part writing', refresher: 'Ranges, spacing, doubling.', lesson: 'mt4-1' }],
    why: [
      ['Compare each voice\'s direction.', 'Opposite directions are contrary motion.'],
      ['Check every pair of voices for a perfect interval in both chords.', 'Look for perfect fifths too, not just octaves.'],
    ],
    walk: {
      'mt4-2-1': ['Same direction, same interval.', 'The interval is a perfect 5th each time.', 'That is parallel fifths (choice C).'],
      'mt4-2-2': ['One voice holds still.', 'The other moves.', 'That is oblique motion (choice A).'],
      'mt4-2-3': ['C is in both I and IV: keep it in the tenor.', 'Move E up to F and G up to A.', 'Soprano E5–F5, alto G4–A4, tenor C4–C4.'],
      'mt4-2-4': ['Soprano C5 over bass C3 is an octave.', 'Both move up a step to D5 over D3, another octave.', 'Parallel octaves (choice B).'],
      'mt4-2-5': ['Only perfect intervals are forbidden in parallel.', 'Thirds are imperfect consonances.', 'Parallel thirds are allowed (choice D).'],
      'mt4-2-6': ['D is common to I and V in G major: hold it in the tenor.', 'B moves to A and G moves to F♯.', 'Soprano B4–A4, alto G4–F♯4, tenor D4–D4.'],
      'mt4-2-7': ['They arrive at an octave from a different interval.', 'Both move up, and the soprano leaps.', 'That is a direct (hidden) octave (choice A).'],
      'mt4-2-8': ['F to G♯ spans two letters, a 2nd.', 'It covers three half steps, so it is augmented.', 'An augmented 2nd is awkward to sing (choice C).'],
    },
    teach: {
      plan: ['Demonstrate the four kinds of motion with two hands.', 'Play parallel fifths and explain why voices lose independence.', 'Show how to keep common tones.', 'Fix one faulty progression together.'],
      questions: [
        { q: 'Are parallel fourths allowed?', a: 'Between upper voices, yes. The strict ban is on parallel fifths, octaves and unisons.' },
        { q: 'Are contrary fifths okay?', a: 'No. Moving from a perfect fifth to a perfect fifth in contrary motion is still treated as an error on the AP exam.' },
      ],
      keyPoints: ['Parallel, similar, contrary, oblique.', 'No consecutive 5ths or 8ves.', 'Hold common tones; move by step.'],
    },
  },
  'mt4-3': {
    bigIdea: [
      'Chords group into three families by function: tonic (home), predominant (moving away) and dominant (tension pulling home). Most phrases go tonic, predominant, dominant, tonic.',
      'The roots of chords tend to move in patterns: down by fifth is the strongest (vi–ii–V–I), down by third and up by step are also common. Moving from V back to IV (a retrogression) goes against the grain.',
      'How the roots move tells you how to voice-lead: keep one common tone when roots are a fifth apart, two when they are a third apart, and move the upper voices against the bass when the roots are a step apart.',
    ],
    picture: { title: 'A trip away and back', t: 'A phrase is a short trip: leave home (tonic), head toward the airport (predominant), board the plane (dominant), and land back home (tonic).' },
    words: [
      { term: 'Tonic function', means: 'The feeling of rest: I (and vi).' },
      { term: 'Predominant', means: 'Chords that lead to the dominant: IV, ii.' },
      { term: 'Dominant function', means: 'Chords that pull to the tonic: V, V7, vii°.' },
      { term: 'Retrogression', means: 'A progression that moves backward, like V to IV.' },
    ],
    tools: [{ name: 'Voice leading', refresher: 'Avoid parallel fifths and octaves; hold common tones.', lesson: 'mt4-2' }],
    why: [
      ['I is home.', 'ii prepares V.', 'V pulls back to I.'],
      ['A phrase normally passes through a predominant.', 'IV and ii are the predominants in major.'],
    ],
    walk: {
      'mt4-3-1': ['Dominant chords contain the leading tone.', 'V and vii° both do.', 'Answer: V and vii° (choice C).'],
      'mt4-3-2': ['The model is T, PD, D, T.', 'I is T, ii is PD, V is D.', 'I–ii–V–I (choice B).'],
      'mt4-3-3': ['Spell the chords: F–A–C, B♭–D–F, C–E–G, F–A–C.', 'From IV to V the bass rises a step, so move the upper voices down.', 'Soprano C5–D5–C5–C5, alto F4–F4–E4–F4, tenor A3–B♭3–G3–A3.'],
      'mt4-3-4': ['Find the roots in C: A, D, G, C.', 'Each falls a perfect 5th.', 'Descending fifths (choice B).'],
      'mt4-3-5': ['vi shares two notes with I.', 'It can act as a tonic substitute.', 'The answer is vi (choice D).'],
      'mt4-3-6': ['The leading tone rises to the tonic.', 'The tonic note is the third of vi.', 'Double the third of vi (choice B).'],
      'mt4-3-7': ['V: G–B–D. vi: A–C–E.', 'Let B rise to C and double C in vi.', 'Soprano D5–C5, alto G4–E4, tenor B3–C4.'],
      'mt4-3-8': ['Normal order: PD before D.', 'V to IV goes from D back to PD.', 'V–IV is the retrogression (choice C).'],
    },
    teach: {
      plan: ['Sort the seven chords into T, PD and D.', 'Play I–IV–V–I and I–ii–V–I.', 'Explain the three root-movement voice-leading rules.', 'Write one progression together.'],
      questions: [
        { q: 'Is iii a tonic or dominant chord?', a: 'It is weak and can lean either way, but it is uncommon in AP part writing; treat it as a tonic substitute that often moves to vi or IV.' },
        { q: 'Why double the third in vi after V?', a: 'The leading tone must rise to the tonic, which is vi\'s third; doubling it lets every voice move smoothly.' },
      ],
      keyPoints: ['T: I, vi; PD: IV, ii; D: V, V7, vii°.', 'T–PD–D–T.', 'Roots a 2nd apart: upper voices move against the bass.'],
    },
  },
  'mt4-4': {
    bigIdea: [
      'Cadences mark the ends of phrases, like punctuation. An authentic cadence (V–I) is a full stop; a half cadence (ending on V) is a comma; a deceptive cadence (V–vi) is a surprise.',
      'Authentic cadences come in two strengths. A perfect authentic cadence needs both chords in root position and the tonic in the soprano at the end; anything else is imperfect.',
      'Plagal cadences (IV–I) add an "Amen" after a phrase, and the Phrygian half cadence (iv6–V in minor) is a special half cadence with a half-step fall in the bass.',
    ],
    picture: { title: 'Punctuation marks', t: 'Read music like a sentence. PAC is a period. IAC is a period that is not quite final. HC is a comma. A deceptive cadence is a sentence that ends with "…and then something unexpected happened."' },
    words: [
      { term: 'PAC', means: 'V–I, both root position, tonic in the soprano.' },
      { term: 'IAC', means: 'Any other authentic cadence.' },
      { term: 'Half cadence', means: 'A phrase ending on V.' },
      { term: 'Deceptive cadence', means: 'V moving to vi instead of I.' },
    ],
    tools: [{ name: 'Harmonic function', refresher: 'Dominant chords pull to the tonic.', lesson: 'mt4-3' }],
    why: [
      ['Look at the final chord.', 'Ending on V is a half cadence.'],
      ['V–I is authentic.', 'A soprano on 3 makes it imperfect.'],
    ],
    walk: {
      'mt4-4-1': ['Find the final chord: V.', 'A phrase ending on V is open, like a comma.', 'Half cadence (choice B).'],
      'mt4-4-2': ['V normally goes to I.', 'Here it goes to vi instead.', 'Deceptive cadence (choice C).'],
      'mt4-4-3': ['Both chords are in root position (bass G, then C).', 'The soprano ends on C, the tonic.', 'It is a PAC (choice A).'],
      'mt4-4-4': ['It ends on V, so it is a kind of half cadence.', 'iv6–V in minor is the Phrygian half cadence.', 'Answer: Phrygian half cadence (choice A).'],
      'mt4-4-5': ['The progression builds to V.', 'The last chord is minor, not the tonic.', 'V to vi is deceptive (choice D).'],
      'mt4-4-6': ['V is G–B–D; give D5 to the soprano so it can fall to C5.', 'Alto G4 to E4; tenor B3 rises to C4.', 'The final chord C–E–C–C is a correct incomplete tonic.'],
      'mt4-4-7': ['IV moving to I at the end.', 'That is the "Amen" sound.', 'Plagal cadence (choice B).'],
      'mt4-4-8': ['Two conditions make it perfect.', 'Root position chords and the tonic in the soprano.', 'Choice C.'],
    },
    teach: {
      plan: ['Play each cadence type and describe its feeling.', 'Give the rules for PAC versus IAC.', 'Show the Phrygian half cadence in minor.', 'Quiz your student by ear.'],
      questions: [
        { q: 'Is vii°6–I an authentic cadence?', a: 'It acts like one, but it counts as imperfect (IAC) because V is replaced by vii°.' },
        { q: 'Why does a half cadence feel unfinished?', a: 'It stops on the dominant, the chord with the most tension pulling back to the tonic.' },
      ],
      keyPoints: ['PAC needs root positions and the tonic on top.', 'HC ends on V.', 'Deceptive: V–vi. Plagal: IV–I.'],
    },
  },
  'mt5-1': {
    bigIdea: [
      'Predominant chords prepare the dominant. In major they are IV and ii (and ii7); in minor, iv and ii°6.',
      'The bass note 4 is the heart of the predominant: IV and ii6 both put it in the bass, so the bass can step up to 5.',
      'First-inversion chords give the bass a smooth, stepwise line and feel lighter. Double a stable note in them, usually the bass when it is scale degree 4.',
    ],
    picture: { title: 'The runway', t: 'If the dominant is the plane taking off, the predominant is the runway. The bass climbing 4 to 5 is the plane rolling forward just before lift-off.' },
    words: [
      { term: 'Predominant', means: 'A chord that prepares V (IV, ii, ii6, ii7).' },
      { term: 'ii6', means: 'The supertonic triad with its third (degree 4) in the bass.' },
      { term: 'ii°6', means: 'The diminished supertonic of minor, in first inversion.' },
    ],
    tools: [{ name: 'Harmonic function', refresher: 'T → PD → D → T.', lesson: 'mt4-3' }],
    why: [
      ['Build ii on degree 2.', 'The figure 6 puts the third in the bass.'],
      ['The supertonic in minor is diminished.', 'Diminished triads appear in first inversion.'],
    ],
    walk: {
      'mt5-1-1': ['ii is built on degree 2.', 'Its third is degree 4.', 'In ii6 the bass is degree 4 (choice C).'],
      'mt5-1-2': ['ii in E♭ major is F–A♭–C.', 'First inversion puts A♭ in the bass.', 'Write A♭–C–F.'],
      'mt5-1-3': ['Spell: I C–E–G, ii6 D–F–A over F, V G–B–D, I C–E–G.', 'Move the upper voices up by step into ii6, doubling the bass F.', 'Soprano C5–D5–B4–C5, alto G4–A4–G4–G4, tenor E4–F4–D4–E4.'],
      'mt5-1-4': ['In minor the supertonic triad is diminished.', 'Diminished triads are used in first inversion.', 'ii°6 (choice B).'],
      'mt5-1-5': ['IV, ii6 and ii7 are predominants.', 'vii° contains the leading tone.', 'vii° is the odd one out (choice D).'],
      'mt5-1-6': ['ii in F major is G–B♭–D.', 'The figure 6 puts the third in the bass.', 'The bass is B♭ (choice C).'],
      'mt5-1-7': ['Restack C–E–A as A–C–E.', 'A is degree 2 of G major: ii.', 'C (the third) is in the bass: ii6 (choice B).'],
      'mt5-1-8': ['Follow the lowest notes.', 'They go 1, down to 4, up to 5, back to 1.', 'Answer: 1 – 4 – 5 – 1 (choice C).'],
    },
    teach: {
      plan: ['List the predominants in major and minor.', 'Show that IV and ii6 share the bass note 4.', 'Explain doubling in first inversion.', 'Write I–ii6–V–I together.'],
      questions: [
        { q: 'Why is ii6 more common than ii?', a: 'It puts scale degree 4 in the bass, which leads smoothly up to 5.' },
        { q: 'Can IV go to I?', a: 'Yes, as a plagal motion, but in a T–PD–D–T phrase it usually goes to V.' },
      ],
      keyPoints: ['IV, ii, ii6, ii7 (iv, ii°6 in minor).', 'Degree 4 in the bass leads to 5.', 'Double a stable note in 6 chords.'],
    },
  },
  'mt5-2': {
    bigIdea: [
      'The dominant seventh contains two tendency tones. The leading tone (its third) rises to the tonic, and the seventh falls by step. Resolving them correctly is the most graded skill in part writing.',
      'Because of those resolutions, V7–I in root position usually connects a complete chord with an incomplete one (missing its fifth). That is not a mistake; it is the cleanest solution.',
      'In inversion, the bass is a tendency tone too: in V65 the bass is the leading tone (it rises), and in V42 the bass is the seventh (it falls, so V42 goes to I6).',
    ],
    picture: { title: 'Two magnets', t: 'Picture the leading tone as a magnet pulled up to the tonic, and the seventh as a weight sliding down one step. Every other note just moves to the nearest place left.' },
    words: [
      { term: 'Tendency tone', means: 'A note that strongly wants to move one way.' },
      { term: 'Chordal seventh', means: 'The 7th of a seventh chord: resolves down by step.' },
      { term: 'Incomplete chord', means: 'A chord missing its fifth.' },
      { term: 'Frustrated leading tone', means: 'An inner-voice leading tone that drops to 5 instead of rising.' },
    ],
    tools: [{ name: 'Seventh chords', refresher: 'V7 is a dominant seventh: G–B–D–F in C.', lesson: 'mt3-2' }],
    why: [
      ['The leading tone rises.', 'The seventh falls by step.', 'The other notes move to the nearest chord tone.'],
      ['V42 has the seventh in the bass.', 'The seventh falls to 3, so I is in first inversion.'],
    ],
    walk: {
      'mt5-2-1': ['The 7th of V7 is a dissonance.', 'Dissonances resolve down by step.', 'The seventh (choice D).'],
      'mt5-2-2': ['V7 in D is built on A.', 'A–C♯–E–G.', 'The seventh is G (choice C).'],
      'mt5-2-3': ['Complete V7 over G2: soprano F5, alto B4, tenor D4.', 'F5 falls to E5, B4 rises to C5, D4 goes to C4.', 'The final I is incomplete, which is correct.'],
      'mt5-2-4': ['V42 has the seventh in the bass.', 'The seventh must fall to scale degree 3.', 'So V42 goes to I6 (choice B).'],
      'mt5-2-5': ['V7 in F is C–E–G–B♭.', 'V65 puts the third, E, in the bass.', 'Write E–G–B♭–C.'],
      'mt5-2-6': ['Every tendency tone resolves to C or E.', 'Nothing moves to the fifth of I.', 'So I is incomplete, with a tripled root (choice B).'],
      'mt5-2-7': ['V65 in G: D–F♯–A–C, F♯ in the bass.', 'The bass F♯ rises to G; the seventh C falls to B.', 'Soprano D5–D5, alto A4–G4, tenor C4–B3.'],
      'mt5-2-8': ['The first chord is a dominant seventh.', 'The second chord sounds minor, not home.', 'V7 – vi (choice B).'],
    },
    teach: {
      plan: ['Write V7–I and draw arrows for the two tendency tones.', 'Explain complete versus incomplete chords.', 'Show V65–I and V42–I6.', 'Play V7–I and V7–vi and compare.'],
      questions: [
        { q: 'Why does the I chord end up missing its fifth?', a: 'Because all the voices of V7 resolve to C or E. To get a complete I you would have to break a resolution, so you use an incomplete chord instead.' },
        { q: 'Can the seventh go up?', a: 'Not in AP-style part writing. Treat the chordal seventh as a dissonance that resolves down by step.' },
      ],
      keyPoints: ['Leading tone up; seventh down by step.', 'Complete to incomplete (or the reverse) in V7–I.', 'V65 → I; V42 → I6.'],
    },
  },
  'mt5-3': {
    bigIdea: [
      'A 6/4 chord has a 4th above the bass, which sounds unstable, so 6/4 chords appear only in a few standard patterns.',
      'The most important is the cadential 6/4: the tonic triad over the dominant bass, right before V. The notes a 6th and 4th above the bass step down to the 5th and 3rd of V.',
      'The others are passing 6/4 (the bass steps through it), pedal 6/4 (the bass holds while the upper voices move) and arpeggiating 6/4 (the bass moves through a chord\'s notes). In all of them, double the bass.',
    ],
    picture: { title: 'Dressing up the dominant', t: 'Think of the cadential 6/4 as the dominant putting on a fancy coat (the tonic\'s notes) before taking it off and showing the real V underneath.' },
    words: [
      { term: 'Cadential 6/4', means: 'I64 over the dominant bass, resolving to V.' },
      { term: 'Passing 6/4', means: 'A 6/4 on a stepwise bass between two chords.' },
      { term: 'Pedal 6/4', means: 'A 6/4 over a held bass note.' },
      { term: 'Arpeggiating 6/4', means: 'A 6/4 created by a bass that arpeggiates a chord.' },
    ],
    tools: [{ name: 'Triad inversions', refresher: 'Second inversion = fifth in the bass, figure 6/4.', lesson: 'mt3-1' }],
    why: [
      ['Over the held G, C and E form a tonic triad.', 'It resolves to V over the same bass: cadential.'],
      ['The bass steps through D.', 'A 6/4 on a stepping bass is passing.'],
    ],
    walk: {
      'mt5-3-1': ['The cadential 6/4 leads into V.', 'Its bass stays on the dominant note.', 'The dominant (choice C).'],
      'mt5-3-2': ['The bass steps 1 – 2 – 3.', 'The 6/4 fills the step in the middle.', 'Passing 6/4 (choice B).'],
      'mt5-3-3': ['The bass holds the tonic.', 'The upper voices move to IV64 and back.', 'Pedal 6/4 (choice A).'],
      'mt5-3-4': ['ii6: soprano D5, alto A4, tenor F4 over F3.', 'I64 over G3: C5, G4, E4; then V: B4, G4, D4.', 'Final I: C5, G4, E4 over C3.'],
      'mt5-3-5': ['The bass walks C – D – E.', 'The middle chord, V64, sits on the passing D.', 'Passing 6/4 (choice C).'],
      'mt5-3-6': ['6/4 chords are unstable.', 'Doubling the bass makes them as solid as possible.', 'Double the bass, the fifth (choice C).'],
      'mt5-3-7': ['I in B♭ is B♭–D–F.', '6/4 means the fifth is in the bass.', 'Write F–B♭–D.'],
      'mt5-3-8': ['The cadential 6/4 sits on the dominant bass.', 'It resolves into V over the same note.', 'It decorates the dominant (choice B).'],
    },
    teach: {
      plan: ['Explain why the 4th above the bass is unstable.', 'Write the cadential 6/4 and show the 6–5 / 4–3 motion.', 'Show the passing and pedal 6/4.', 'Have your student label each one.'],
      questions: [
        { q: 'If I64 has tonic notes, why isn\'t it a tonic chord?', a: 'It is on the dominant bass and resolves to V, so it works as part of the dominant.' },
        { q: 'Can I use a 6/4 anywhere?', a: 'In common-practice style, only in the four standard situations.' },
      ],
      keyPoints: ['Cadential, passing, pedal, arpeggiating.', 'Cadential 6/4 resolves to V over the same bass.', 'Double the bass.'],
    },
  },
};

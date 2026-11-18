import type { CalcLesson, LessonTutor } from '../calc/types';
import { MC, NOTE, P, TASK, chords, hear, inKey, notes, satb } from './lib';
import type { ListenSpec, StaffSpec } from '../../lib/music/score';
import {
  checkSatb, chord, diatonicChord, errorsOnly, fifthsOf, identify, ivName, parseRoman, pc, relative, romanOf, scale, simpleName, spell, transpose, type Key, type Satb,
} from '../../lib/music/theory';
import { melodyTask, romanTask, satbTask, scaleTask } from '../../lib/music/tasks';

const K = (tonic: string, mode: 'major' | 'minor' = 'major'): Key => ({ tonic, mode });
const C = K('C');
const sc = (t: string, k: Parameters<typeof scale>[1]) => scale(t, k).map(spell);
const triad = (r: string) => { const x = parseRoman(r, C); return chord(x.root, x.q).map(spell); };
const inTriad = (note: string, r: string) => triad(r).some((t) => pc(t) === pc(note));
/** a melody played with its chord on every note */
const over = (mel: string[], chs: string[][], beats?: number[]): ListenSpec => ({ steps: mel.map((m, i) => [...chs[i], m]), beats, tempo: 72 });

const I = ['C3', 'G3', 'E4'], V = ['G2', 'D3', 'B3'];
const NCT1: StaffSpec = { ...notes('treble', ['E5', 'D5', 'C5', 'D5', 'C5'], 'Melody E D C D C over a C major chord: D is first a passing tone, then a neighbor tone', { dur: 'q', labels: ['I'], above: ['', 'PT', '', 'NT', ''] }) };
const NCT2: StaffSpec = { ...notes('treble', ['B4', 'C5', 'G4', 'C5', 'C5'], 'Melody B C G C over V, then C over I: an escape tone and an anticipation', { dur: 'q', labels: ['V', '', '', '', 'I'], above: ['', 'ET', '', 'ANT', ''] }) };
const SUS43: Satb[] = [{ S: 'C5', A: 'G4', T: 'E4', B: 'C3' }, { S: 'C5', A: 'G4', T: 'D4', B: 'G2' }, { S: 'B4', A: 'G4', T: 'D4', B: 'G2' }, { S: 'C5', A: 'G4', T: 'E4', B: 'C3' }];
const MOTIVES: StaffSpec = {
  clef: 'treble', time: [4, 4], label: 'A motive C D E C, then its inversion, retrograde and augmentation',
  events: [
    { notes: ['C5'], dur: 'q', above: 'motive' }, { notes: ['D5'], dur: 'q' }, { notes: ['E5'], dur: 'q' }, { notes: ['C5'], dur: 'q', bar: true },
    { notes: ['C5'], dur: 'q', above: 'inversion' }, { notes: ['B4'], dur: 'q' }, { notes: ['A4'], dur: 'q' }, { notes: ['C5'], dur: 'q', bar: true },
    { notes: ['C5'], dur: 'q', above: 'retrograde' }, { notes: ['E5'], dur: 'q' }, { notes: ['D5'], dur: 'q' }, { notes: ['C5'], dur: 'q', bar: true },
    { notes: ['C5'], dur: 'h', above: 'augmentation' }, { notes: ['D5'], dur: 'h', bar: true }, { notes: ['E5'], dur: 'h' }, { notes: ['C5'], dur: 'h' },
  ],
};
export const SEC_DOM: Satb[] = [{ S: 'C5', A: 'G4', T: 'E4', B: 'C3' }, { S: 'C5', A: 'F#4', T: 'A3', B: 'D3' }, { S: 'B4', A: 'G4', T: 'G3', B: 'G2' }, { S: 'C5', A: 'E4', T: 'G3', B: 'C3' }];
export const I_VI_IV_V_I: Satb[] = [{ S: 'E5', A: 'G4', T: 'C4', B: 'C3' }, { S: 'E5', A: 'A4', T: 'C4', B: 'A2' }, { S: 'F5', A: 'A4', T: 'C4', B: 'F2' }, { S: 'D5', A: 'G4', T: 'B3', B: 'G2' }, { S: 'C5', A: 'E4', T: 'C4', B: 'C3' }];
const ANT = ['C5', 'E5', 'D5', 'C5', 'B4', 'C5', 'D5', 'G4', 'A4', 'B4', 'C5', 'E5', 'D5'];
const CONS = ['C5', 'E5', 'D5', 'C5', 'B4', 'C5', 'D5', 'G4', 'A4', 'F5', 'E5', 'D5', 'C5'];
const phrase = (ns: string[], end: string) => ns.map((n, i) => ({ notes: [n], dur: (i === ns.length - 1 ? 'w' : 'q') as 'w' | 'q', bar: i % 4 === 3 || i === ns.length - 1, label: i === ns.length - 1 ? end : undefined }));
const PERIOD: StaffSpec = { clef: 'treble', time: [4, 4], label: 'An eight-measure melody in C major: two phrases that begin alike; the first ends on D (half cadence), the second on C (authentic cadence)', events: [...phrase(ANT, 'HC'), ...phrase(CONS, 'PAC')] };

/** AP Music Theory, Units 6–8. Original lessons and problems; every computable answer is checked by the music engine. */
export const MUSIC_D: CalcLesson[] = [
  {
    id: 'mt6-1', unit: 6, n: 1, title: 'Non-chord tones: passing, neighbor and more',
    intro: 'Real melodies do not use only chord tones; they decorate them. Today you learn to classify non-chord tones by how they are approached and left: passing tones, neighbor tones, appoggiaturas, escape tones and anticipations.',
    goals: ['Decide whether a melody note belongs to the chord', 'Classify non-chord tones by approach and resolution', 'Tell accented from unaccented non-chord tones', 'Label non-chord tones in a melody'],
    notes: [
      { k: 'p', t: 'A **non-chord tone (NCT)** is a note that does not belong to the chord sounding with it. Classify it by two questions: **how is it approached** (by step, by leap, or repeated) and **how is it left**?' },
      { k: 'list', items: ['**Passing tone (PT):** step in, step out, in the **same** direction (fills in a 3rd).', '**Neighbor tone (NT):** step away and step **back** to the same note (upper or lower neighbor).', '**Appoggiatura (APP):** **leap** in, step out (usually in the opposite direction, often on a strong beat).', '**Escape tone (ET):** step in, **leap** out in the opposite direction.', '**Anticipation (ANT):** a note of the **next** chord arrives early, then is repeated when that chord comes.'] },
      { k: 'staff', staff: NCT1, listen: over(['E5', 'D5', 'C5', 'D5', 'C5'], [I, I, I, I, I]), caption: 'Over a C major chord: D first passes between E and C (PT), then steps up from C and back (NT).' },
      { k: 'staff', staff: NCT2, listen: over(['B4', 'C5', 'G4', 'C5', 'C5'], [V, V, V, V, I]), caption: 'Over V: C steps up from B and leaps away (ET); the second C arrives before the I chord (ANT).' },
      { k: 'rule', title: 'Accented and unaccented', t: 'An NCT on a strong beat (where the chord changes) is **accented**; one between beats is **unaccented**. Accented passing tones and appoggiaturas create stronger dissonance.' },
      { k: 'tip', t: 'First list the chord tones; every other melody note is a non-chord tone. Then look one note back and one note forward.' },
    ],
    examples: [
      { q: 'Over a C major chord, the melody goes E – F – G. What is F?', steps: ['C major is C–E–G, so F is not a chord tone.', 'F is reached by step from E and left by step to G, continuing upward: a passing tone.'], a: 'Passing tone' },
      { q: 'Over a C major chord, the melody goes E – F – E. What is F?', steps: ['F is not in C–E–G.', 'It steps up from E and steps back down to E: an (upper) neighbor tone.'], a: 'Neighbor tone' },
    ],
    practice: [
      MC('mt6-1-1', 1, 'A non-chord tone approached by step and left by step in the same direction is a…', ['neighbor tone', 'passing tone', 'appoggiatura', 'escape tone'], 1, 'It "passes" between two chord tones.', ['Step in, step out, same direction: a passing tone.']),
      MC('mt6-1-2', 1, 'A non-chord tone approached by leap and resolved by step (often on the beat) is a…', ['passing tone', 'escape tone', 'appoggiatura', 'anticipation'], 2, 'Leap in, step out.', ['The appoggiatura leaps in to a dissonance and resolves by step, usually in the opposite direction.']),
      MC('mt6-1-3', 1, 'The melody goes G – A – G over a C major chord. What is the A?', ['Passing tone', 'Escape tone', 'Anticipation', 'Neighbor tone'], 3, 'Where does the melody go after A?', ['A is not in C–E–G. It steps up from G and returns to G: an (upper) neighbor tone.'], { staff: notes('treble', ['G4', 'A4', 'G4'], 'G A G over a C major chord', { dur: 'q', labels: ['I'] }), listen: over(['G4', 'A4', 'G4'], [I, I, I]), check: () => !inTriad('A4', 'I') && inTriad('G4', 'I') }),
      MC('mt6-1-4', 1, 'Approached by step, left by leap in the opposite direction:', ['Escape tone', 'Appoggiatura', 'Neighbor tone', 'Suspension'], 0, 'The opposite of an appoggiatura.', ['Step in, leap out the other way: an escape tone (échappée).']),
      MC('mt6-1-5', 1, 'A note of the next chord that sounds early is called…', ['a retardation', 'an anticipation', 'a pedal point', 'a passing tone'], 1, 'It arrives ahead of time.', ['It anticipates the next chord: an anticipation.']),
      MC('mt6-1-6', 2, 'Over V and then I in C major, the melody is D – C | C. What is the first C?', ['Passing tone', 'Neighbor tone', 'Anticipation', 'Appoggiatura'], 2, 'Is C in the V chord? Where does it go?', ['C is not in V (G–B–D). It steps down from D and is repeated when the I chord arrives.', 'A note of the next chord arriving early is an anticipation.'], { staff: notes('treble', ['D5', 'C5', 'C5'], 'D C over V, then C over I', { dur: 'q', labels: ['V', '', 'I'] }), listen: over(['D5', 'C5', 'C5'], [V, V, I]), check: () => !inTriad('C5', 'V') && inTriad('C5', 'I') && inTriad('D5', 'V') }),
      MC('mt6-1-7', 2, 'Over a C major chord, the melody leaps from C up to F, then steps down to E. What is the F?', ['Escape tone', 'Passing tone', 'Neighbor tone', 'Appoggiatura'], 3, 'Leap in, step out.', ['F is not in C–E–G. It is approached by leap (C up to F) and left by step (down to E): an appoggiatura.'], { staff: notes('treble', ['C5', 'F5', 'E5'], 'C F E over a C major chord', { dur: 'q', labels: ['I'] }), listen: over(['C5', 'F5', 'E5'], [I, I, I]), check: () => !inTriad('F5', 'I') && simpleName(ivName('C5', 'F5')) === 'P4' && ivName('E5', 'F5') === 'm2' }),
      P('mt6-1-8', 2, 'Over a G major chord, the melody goes B – C – D. Which note is the passing tone? (letter name)', NOTE('C'), 'Which note is not in G–B–D?', ['G major is G–B–D. C is the only note not in the chord.', 'It is reached by step from B and left by step to D, same direction: a passing tone.'], { check: () => !chord('G4', 'M').some((t) => pc(t) === 'C') && ['B', 'D'].every((n) => chord('G4', 'M').some((t) => pc(t) === n)) }),
    ],
    remember: ['PT: step–step, same direction. NT: step–step, back.', 'APP: leap–step. ET: step–leap.', 'ANT: the next chord\'s note, early.'],
    checkIn: 'Next: suspensions, retardations and pedal points.',
  },
  {
    id: 'mt6-2', unit: 6, n: 2, title: 'Suspensions, retardations and pedal points',
    intro: 'A suspension holds a note over from one chord into the next, where it clashes, then lets it fall into place. It is one of the most expressive sounds in music, and the exam expects you to name suspensions by their intervals.',
    goals: ['Identify preparation, suspension and resolution', 'Name 4–3, 7–6, 9–8 and 2–3 suspensions', 'Tell a retardation from a suspension', 'Recognize pedal points'],
    notes: [
      { k: 'rule', title: 'The suspension', t: 'A **suspension** has three stages: the **preparation** (a chord tone), the **suspension** (the same note held or tied into the next chord, where it is dissonant, on a strong beat) and the **resolution** (down by step to a chord tone).' },
      { k: 'staff', staff: satb(0, SUS43, ['I', 'V', 'V', 'I'], 'A 4-3 suspension: the soprano holds C over the V chord, then falls to B'), caption: 'A 4–3 suspension in C major: the soprano C (prepared in I) is held over the G bass of V, a 4th above it, then falls to B, a 3rd above it.' },
      { k: 'rule', title: 'Naming suspensions', t: 'Name a suspension by the intervals above the **bass**, reduced to simple intervals: **4–3**, **7–6** and **9–8** (the 9 keeps its name so it is not confused with 2–3). In a **2–3** suspension the **bass** is suspended and resolves down while the upper voice forms a 2nd, then a 3rd.' },
      { k: 'rule', title: 'Retardation and pedal point', t: 'A **retardation** is like a suspension but resolves **up** by step (for example 7–8). A **pedal point** is a long note, usually in the bass (often the tonic or dominant), held while the harmonies above it change.' },
      { k: 'warn', t: 'Measure from the bass, not from a neighbouring voice. A tenor D4 over a bass C3 is a 9th (a 2nd plus an octave): when it falls to C4 it is a 9–8 suspension, not a "2–1".' },
    ],
    examples: [
      { q: 'The bass is G3. The soprano holds C5 from the previous chord, then moves to B4. Name the suspension.', steps: ['G3 up to C5 is an 11th, which reduces to a 4th.', 'G3 up to B4 is a 10th, which reduces to a 3rd. The suspension is a 4–3.'], a: '4–3 suspension' },
      { q: 'The bass is C3. The tenor holds D4, then falls to C4. Name the suspension.', steps: ['C3 up to D4 is a major 9th.', 'C3 up to C4 is an octave. It is a 9–8 suspension.'], a: '9–8 suspension' },
    ],
    practice: [
      MC('mt6-2-1', 1, 'The three stages of a suspension are…', ['approach, leap, return', 'preparation, suspension, resolution', 'tonic, predominant, dominant', 'attack, sustain, release'], 1, 'Before, during, after.', ['A suspension is prepared as a chord tone, held over as a dissonance, then resolved.']),
      MC('mt6-2-2', 1, 'A suspension normally resolves…', ['down by step', 'up by step', 'by leap', 'by repeating the note'], 0, 'The dissonance "falls" into place.', ['Suspensions resolve down by step. One that resolves up is a retardation.']),
      MC('mt6-2-3', 2, 'The bass is E3. The soprano holds D5, then falls to C5. Name the suspension.', ['4–3', '9–8', '7–6', '2–3'], 2, 'Measure E3 to D5 and E3 to C5, then reduce.', ['E3 to D5 is a minor 14th, which reduces to a 7th; E3 to C5 is a minor 13th, which reduces to a 6th.', 'So it is a 7–6 suspension.'], { check: () => simpleName(ivName('E3', 'D5')) === 'm7' && simpleName(ivName('E3', 'C5')) === 'm6' }),
      P('mt6-2-4', 2, 'The bass is C3. The tenor holds D4, then falls to C4. Name the suspension with two numbers (like 4-3).', ['9-8', '9–8', '98'], 'Measure from the bass. Do not reduce the 9.', ['C3 to D4 is a major 9th; C3 to C4 is an octave.', 'It is a 9–8 suspension.'], { check: () => ivName('C3', 'D4') === 'M9' && ivName('C3', 'C4') === 'P8' }),
      MC('mt6-2-5', 1, 'A suspension-like figure that resolves UP by step is a…', ['retardation', 'escape tone', 'pedal point', 'appoggiatura'], 0, 'It delays (retards) an upward arrival.', ['A held note that resolves up by step is a retardation.']),
      MC('mt6-2-6', 1, 'A long, held bass note under changing harmonies is a…', ['suspension', 'anticipation', 'pedal point', 'retardation'], 2, 'Think of an organ pedal held down.', ['A note sustained (usually in the bass) while harmonies change above it is a pedal point.']),
      MC('mt6-2-7', 2, 'In a 2–3 suspension, which voice is suspended?', ['The soprano', 'The alto', 'The tenor', 'The bass'], 3, 'The numbers count up from the suspended note.', ['In a 2–3 the bass itself is held over and then falls, so the interval with the upper voice goes from a 2nd to a 3rd.']),
      P('mt6-2-8', 2, 'The bass is G2. The soprano holds C5 over it, then falls to B4. Name the suspension (like 7-6).', ['4-3', '4–3', '43'], 'Reduce G2–C5 and G2–B4 to simple intervals.', ['G2 to C5 is a compound perfect 4th; G2 to B4 is a compound major 3rd.', 'It is a 4–3 suspension.'], { check: () => simpleName(ivName('G2', 'C5')) === 'P4' && simpleName(ivName('G2', 'B4')) === 'M3' }),
    ],
    remember: ['Preparation → suspension (strong beat) → resolution down by step.', '4–3, 7–6, 9–8 (upper voice); 2–3 (bass).', 'Retardation resolves up. Pedal point: a held bass under changing chords.'],
    checkIn: 'Next: motives and how composers develop them.',
  },
  {
    id: 'mt6-3', unit: 6, n: 3, title: 'Motives, sequences and melodic devices',
    intro: 'Composers build whole pieces from tiny ideas. Today you learn the motive and the standard ways to transform it, inversion, retrograde, augmentation, diminution, fragmentation and sequence, and the difference between real and tonal sequences.',
    goals: ['Recognize a motive and its transformations', 'Write the inversion of a motive', 'Tell real from tonal sequences', 'Follow a descending-fifths harmonic sequence'],
    notes: [
      { k: 'rule', title: 'Transforming a motive', t: '**Repetition** (same notes again), **transposition** (same shape, new pitch level), **sequence** (successive transpositions), **inversion** (every interval turned upside down), **retrograde** (backwards), **augmentation** (longer note values), **diminution** (shorter values), **fragmentation** (using just part of it) and **extension** (adding to it).' },
      { k: 'staff', staff: MOTIVES, caption: 'A motive (C D E C), its inversion (C B A C), its retrograde (C E D C) and its augmentation (twice as slow).' },
      { k: 'rule', title: 'Real and tonal sequences', t: 'A **real** sequence keeps every interval\'s exact quality, so it often brings in accidentals and leaves the key. A **tonal** (diatonic) sequence stays in the key, so a major 2nd may become a minor 2nd.' },
      { k: 'rule', title: 'Harmonic sequence', t: 'The most common harmonic sequence is the **descending-fifths** (circle-of-fifths) sequence: each chord\'s root falls a 5th (or rises a 4th). In C major: I – IV – vii° – iii – vi – ii – V – I.' },
      { k: 'try', prompt: 'Write the **retrograde** (backwards) of the motive G4 – A4 – C5.', task: melodyTask(['C5', 'A4', 'G4'], 'treble', 'A retrograde plays the same notes in reverse order.') },
    ],
    examples: [
      { q: 'A motive C–D–E is followed by D–E–F and then E–F–G. What device is this?', steps: ['The same three-note shape appears three times, each a step higher.', 'Successive transpositions of a motive form an ascending sequence; since it stays in C major, it is a tonal sequence.'], a: 'An ascending (tonal) sequence' },
      { q: 'A motive C–E–G is answered by G–E–C. What device is this?', steps: ['The same notes appear in reverse order.', 'Playing a motive backwards is retrograde.'], a: 'Retrograde' },
    ],
    practice: [
      MC('mt6-3-1', 1, 'Playing a motive with every note value doubled is called…', ['diminution', 'augmentation', 'inversion', 'retrograde'], 1, 'The note values get longer.', ['Longer note values (twice as slow) are augmentation; shorter ones are diminution.']),
      MC('mt6-3-2', 2, 'The second group here is the first group in…', ['retrograde', 'augmentation', 'inversion', 'sequence'], 2, 'Compare directions: up a step becomes…?', ['The first group rises by step (C–D–E); the second falls by step (C–B–A).', 'Each interval is turned upside down: inversion.'], { staff: notes('treble', ['C5', 'D5', 'E5', 'C5', 'B4', 'A4'], 'C D E, then C B A', { dur: 'q' }) }),
      MC('mt6-3-3', 1, 'Repeating a motive at successively higher or lower pitch levels is…', ['fragmentation', 'retrograde', 'a pedal point', 'a sequence'], 3, 'Like climbing stairs with the same step.', ['Successive transpositions of the same idea form a sequence.']),
      MC('mt6-3-4', 2, 'A sequence that keeps every interval\'s exact quality, even if it leaves the key, is…', ['a real sequence', 'a tonal sequence', 'diminution', 'an ostinato'], 0, 'Exact copies.', ['A real sequence copies intervals exactly (often adding accidentals). A tonal sequence adjusts them to stay in the key.']),
      P('mt6-3-5', 2, 'The motive G4–A4–C5 is transposed up a major 2nd. What is its last note? (letter and octave, like D5)', ['D5'], 'Move each note up a whole step.', ['Up a major 2nd: G4 → A4, A4 → B4, C5 → D5.', 'The last note is D5.'], { check: () => spell(transpose('C5', 'M2')) === 'D5' }),
      MC('mt6-3-6', 1, 'Developing a motive by using only its first two notes is…', ['extension', 'augmentation', 'fragmentation', 'inversion'], 2, 'Breaking it into pieces.', ['Using a fragment of a motive is fragmentation.']),
      MC('mt6-3-7', 2, 'In the descending-fifths sequence in C major, which chord comes right after iii?', ['ii', 'IV', 'V', 'vi'], 3, 'The root falls a 5th from E.', ['iii has root E. A 5th below E is A, the root of vi.'], { check: () => pc(transpose(diatonicChord(C, 3).root, 'P5', true)) === pc(diatonicChord(C, 6).root) }),
      TASK('mt6-3-8', 2, 'Write the **inversion** of the motive C5 – D5 – E5, starting on C5 and staying in C major (a tonal inversion).', melodyTask(['C5', 'B4', 'A4'], 'treble', 'Each step up becomes a step down.'), 'Up a step becomes down a step.', ['The motive goes up a step, then up another step.', 'The inversion goes down a step, then down another: C5 – B4 – A4.']),
    ],
    remember: ['Inversion flips intervals; retrograde reverses order.', 'Augmentation = longer values; diminution = shorter.', 'Sequence = successive transpositions (real = exact, tonal = in key).', 'Descending fifths: I IV vii° iii vi ii V I.'],
    checkIn: 'That completes Unit 6. Next: secondary dominants.',
  },
  {
    id: 'mt7-1', unit: 7, n: 1, title: 'Secondary dominants',
    intro: 'Sometimes a chord borrows a dominant of its own. A secondary (applied) dominant is the V or V7 of a chord other than I, and it is why accidentals appear in music that otherwise stays in one key. Today you learn to spell, label and resolve them.',
    goals: ['Spell V/x and V7/x for any diatonic major or minor chord', 'Label secondary dominants with slash notation', 'Spot them from accidentals in the music', 'Resolve their leading tone and seventh'],
    notes: [
      { k: 'p', t: 'A **secondary dominant** treats another chord as a temporary tonic. **V/V** ("five of five") is the dominant of the dominant; **V7/IV** is the dominant seventh of the subdominant. Briefly emphasizing a chord this way is called **tonicization**.' },
      { k: 'rule', title: 'Spelling V/x', t: 'Find the root of the target chord, go **up a perfect 5th**, and build a **major triad** (for V/x) or a **dominant seventh** (for V7/x) on it. Only major or minor chords can be tonicized, never vii° (or ii° in minor).' },
      { k: 'staff', staff: notes('treble', [['D4', 'F#4', 'A4'], ['G4', 'B4', 'D5'], ['C4', 'E4', 'G4', 'Bb4'], ['F4', 'A4', 'C5'], ['E4', 'G#4', 'B4'], ['A4', 'C5', 'E5']], 'Secondary dominants in C major and the chords they resolve to', { labels: ['V/V', 'V', 'V7/IV', 'IV', 'V/vi', 'vi'] }), caption: 'In C major: V/V (D–F♯–A) → V, V7/IV (C–E–G–B♭) → IV, V/vi (E–G♯–B) → vi.' },
      { k: 'rule', title: 'Resolution', t: 'Treat the secondary dominant like a real V: its **third** is a temporary leading tone and **rises** a half step to the target\'s root (F♯ → G in V/V), and its **seventh falls** by step.' },
      { k: 'tip', t: 'A raised note (a sharp or a natural that cancels a flat) is often the leading tone of the next chord. In C major, F♯ points to G, G♯ points to A, and C♯ points to D.' },
      { k: 'try', prompt: 'Write **V7/V in C major**.', task: romanTask('V7/V', C) },
    ],
    examples: [
      { q: 'Spell V7/V in D major.', steps: ['V of D major is A.', 'The dominant seventh on the 5th above A (E): E–G♯–B–D.'], a: 'E–G♯–B–D' },
      { q: 'In C major, the chord E–G♯–B moves to A minor. Label it.', steps: ['E–G♯–B is a major triad whose root is a 5th above A.', 'It is the dominant of vi: V/vi.'], a: 'V/vi' },
    ],
    practice: [
      TASK('mt7-1-1', 2, 'Write **V/V in G major**.', romanTask('V/V', K('G')), 'V in G is D; go up a 5th from D.', ['V of G major is D. A 5th above D is A.', 'V/V is a major triad on A: A–C♯–E.']),
      MC('mt7-1-2', 1, 'In F major, which chord is V/V?', ['C–E–G', 'G–B–D', 'D–F♯–A', 'A–C♯–E'], 1, 'V in F is C; go up a 5th.', ['V in F major is C. A 5th above C is G, so V/V is G–B–D (with B♮, not the key\'s B♭).'], { check: () => { const x = parseRoman('V/V', K('F')); return chord(x.root, x.q).map((p) => pc(p)).join() === 'G,B,D'; } }),
      P('mt7-1-3', 1, 'In C major, which altered note appears in V7/IV? (letter and accidental)', NOTE('Bb'), 'V7/IV is the dominant seventh on C.', ['V7/IV in C major is C–E–G–B♭ (the dominant seventh of F).', 'B♭ is the note outside C major.'], { check: () => { const x = parseRoman('V7/IV', C); return chord(x.root, x.q).some((p) => pc(p) === 'Bb'); } }),
      MC('mt7-1-4', 2, 'In C major, label this chord.', ['V7/V', 'vi7', 'V7/vi', 'V7/ii'], 3, 'A–C♯–E–G: whose dominant is it?', ['A–C♯–E–G is a dominant seventh on A.', 'A is a 5th above D, the root of ii, so it is V7/ii.'], { staff: notes('treble', [['A3', 'C#4', 'E4', 'G4']], 'A C-sharp E G in C major'), check: () => romanOf(['A3', 'C#4', 'E4', 'G4'], C) === 'V7/ii' }),
      MC('mt7-1-5', 1, 'Which chord cannot be tonicized in a major key?', ['ii', 'IV', 'vi', 'vii°'], 3, 'A temporary tonic must be major or minor.', ['A diminished triad cannot act as a tonic, so vii° is never tonicized.'], { check: () => diatonicChord(C, 7).q === 'd' }),
      TASK('mt7-1-6', 2, 'Write **V7/IV in B♭ major**.', romanTask('V7/IV', K('Bb')), 'IV in B♭ is E♭; its dominant seventh is built on B♭.', ['IV in B♭ major is E♭. A 5th above E♭ is B♭.', 'V7/IV is B♭–D–F–A♭ (the A♭ is the added accidental).']),
      MC('mt7-1-7', 1, 'V7/V usually resolves to…', ['I', 'V', 'IV', 'vi'], 1, 'It is the dominant of V.', ['A secondary dominant resolves to its target: V7/V goes to V.']),
      TASK('mt7-1-8', 3, 'The bass is given. Write the upper voices for **I – V7/V – V – I in C major**.', satbTask(C, 0, ['I', 'V7/V', 'V', 'I'], SEC_DOM, SEC_DOM.map((c) => ({ B: c.B }))), 'In V7/V, F♯ rises to G and C falls to B.', ['V7/V is D–F♯–A–C. One voicing: soprano C5, alto F♯4, tenor A3 over D3.', 'Into V: C5 falls to B4 (the seventh), F♯4 rises to G4 (the temporary leading tone), A3 moves to G3.', 'Then V – I as usual: B4 rises to C5.']),
    ],
    remember: ['V/x: a major triad a 5th above x\'s root (V7/x adds a minor 7th).', 'Its third rises to x; its seventh falls.', 'Only major or minor chords can be tonicized.', 'Raised notes often signal a secondary dominant.'],
    checkIn: 'Next: secondary leading-tone chords and modulation.',
  },
  {
    id: 'mt7-2', unit: 7, n: 2, title: 'Secondary leading-tone chords, tonicization and modulation',
    intro: 'Leading-tone chords can be applied to other chords too, just like dominants. Today you learn vii°/x and vii°7/x, the difference between tonicizing a chord and modulating to a new key, and how a pivot chord connects two closely related keys.',
    goals: ['Spell vii°/x, vii°7/x and viiø7/x', 'Tell tonicization from modulation', 'List the closely related keys of any key', 'Find a pivot chord between two keys'],
    notes: [
      { k: 'rule', title: 'Secondary leading-tone chords', t: 'Build a diminished triad (vii°/x), a fully diminished seventh (vii°7/x) or a half-diminished seventh (viiø7/x) on the note a **half step below** the target chord\'s root. vii°7/x can precede major or minor targets; viiø7/x is used only before **major** targets.' },
      { k: 'staff', staff: notes('treble', [['F#4', 'A4', 'C5', 'Eb5'], ['G4', 'B4', 'D5']], 'vii fully diminished seven of V, resolving to V, in C major', { labels: ['viio7/V', 'V'] }), caption: 'vii°7/V in C major: F♯–A–C–E♭ resolves to G–B–D. F♯ rises to G; E♭ and C fall.' },
      { k: 'rule', title: 'Tonicization or modulation?', t: '**Tonicization** briefly emphasizes a chord (one or two secondary chords) without leaving the key. **Modulation** establishes a new key, confirmed by a **cadence** in that key.' },
      { k: 'rule', title: 'Closely related keys', t: 'Keys whose signatures differ by **at most one** sharp or flat: the relative key, the keys a 5th above and below, and their relatives. For C major: A minor, G major, E minor, F major and D minor.' },
      { k: 'p', t: 'A **pivot chord** belongs to both keys and links them. Going from C major to G major, A–C–E is vi in C and ii in G: it can be heard in the old key and understood in the new one.' },
      { k: 'try', prompt: 'Write **vii°7/V in G major** (built on the leading tone of D).', task: romanTask('viio7/V', K('G')) },
    ],
    examples: [
      { q: 'Spell vii°7/V in G major.', steps: ['V in G major is D, and the leading tone of D is C♯.', 'Stack minor 3rds on C♯: C♯–E–G–B♭.'], a: 'C♯–E–G–B♭' },
      { q: 'Moving from C major to G major, which chord can act as a pivot?', steps: ['A pivot chord must be diatonic in both keys.', 'A–C–E is vi in C major and ii in G major, so it can pivot (as can C–E–G: I in C, IV in G).'], a: 'A minor (vi = ii)' },
    ],
    practice: [
      TASK('mt7-2-1', 2, 'Write **vii°7/V in C major**.', romanTask('viio7/V', C), 'V is G; its leading tone is F♯.', ['The leading tone of G is F♯.', 'Stack minor 3rds: F♯–A–C–E♭.']),
      MC('mt7-2-2', 2, 'Which keys are closely related to D major?', ['D minor and F major only', 'B minor, A major, F♯ minor, G major, E minor', 'E♭ major and C minor', 'Only B minor'], 1, 'Signatures within one accidental of two sharps.', ['D major has two sharps. B minor (2), A major and F♯ minor (3), G major and E minor (1) all differ by at most one.'], { check: () => ['B minor', 'A major', 'F# minor', 'G major', 'E minor'].every((s) => { const [t, m] = s.split(' '); return Math.abs(fifthsOf(K(t, m as 'major')) - fifthsOf(K('D'))) <= 1; }) }),
      MC('mt7-2-3', 2, 'In C major, label this chord.', ['V7/vi', 'viio7', 'viio7/V', 'viio7/vi'], 3, 'G♯ is a half step below A.', ['G♯–B–D–F is a fully diminished seventh on G♯.', 'G♯ is the leading tone of A, the root of vi: vii°7/vi.'], { staff: notes('treble', [['G#4', 'B4', 'D5', 'F5']], 'G-sharp B D F in C major'), check: () => romanOf(['G#4', 'B4', 'D5', 'F5'], C) === 'viio7/vi' }),
      MC('mt7-2-4', 1, 'A brief emphasis on a chord other than I, with no cadence in a new key, is…', ['modulation', 'tonicization', 'a pivot chord', 'a deceptive cadence'], 1, 'Brief, not established.', ['Tonicization is momentary; modulation needs a cadence that confirms the new key.']),
      MC('mt7-2-5', 2, 'In a pivot-chord modulation from C major to G major, the chord A–C–E is…', ['ii in C and vi in G', 'IV in C and I in G', 'vi in C and ii in G', 'V in C and I in G'], 2, 'Find A\'s degree in each key.', ['A is degree 6 of C major (vi) and degree 2 of G major (ii).'], { check: () => romanOf(['A3', 'C4', 'E4'], C) === 'vi' && romanOf(['A3', 'C4', 'E4'], K('G')) === 'ii' }),
      P('mt7-2-6', 1, 'The relative minor of E♭ major is closely related to it. What is its tonic?', NOTE('C'), 'Down a minor 3rd from E♭.', ['A minor 3rd below E♭ is C. C minor shares E♭ major\'s three flats.'], { check: () => relative(K('Eb')).tonic === 'C' }),
      TASK('mt7-2-7', 3, 'Write **vii°7/ii in F major**.', romanTask('viio7/ii', K('F')), 'ii in F is G minor; the leading tone of G is F♯.', ['ii in F major is G–B♭–D, so the target root is G.', 'A half step below G is F♯. Stack minor 3rds: F♯–A–C–E♭.']),
      MC('mt7-2-8', 2, 'A half-diminished secondary chord (viiø7/x) is used only when the target chord is…', ['major', 'minor', 'diminished', 'augmented'], 0, 'Compare viiø7 in a major key.', ['viiø7 occurs naturally in major keys, so applied viiø7 chords point to major targets. Minor targets take vii°7/x.']),
    ],
    remember: ['vii°7/x: a °7 chord a half step below x\'s root.', 'viiø7/x only before major chords.', 'Tonicization = brief; modulation = new key confirmed by a cadence.', 'Closely related keys differ by at most one accidental.'],
    checkIn: 'That completes Unit 7. Next: the modes.',
  },
  {
    id: 'mt8-1', unit: 8, n: 1, title: 'The diatonic modes',
    intro: 'Long before major and minor took over, music used modes, and they are still everywhere in folk, jazz, film and pop. Today you learn the seven diatonic modes and the one characteristic note that makes each sound different.',
    goals: ['Name the seven diatonic modes', 'Spell any mode from any starting note', 'Compare each mode with major or natural minor', 'Recognize modes by ear'],
    notes: [
      { k: 'rule', title: 'Seven modes from one scale', t: 'Start a major scale on each of its degrees: 1 **Ionian** (= major), 2 **Dorian**, 3 **Phrygian**, 4 **Lydian**, 5 **Mixolydian**, 6 **Aeolian** (= natural minor), 7 **Locrian**. On the white keys: C Ionian, D Dorian, E Phrygian, F Lydian, G Mixolydian, A Aeolian, B Locrian.' },
      { k: 'staff', staff: notes('treble', sc('D4', 'dorian'), 'D Dorian: the white keys from D to D'), caption: 'D Dorian: like D natural minor, but with B♮ (a raised 6th).' },
      { k: 'rule', title: 'Compare with major and minor', t: 'Major-type modes: **Lydian** = major with a **raised 4**; **Mixolydian** = major with a **lowered 7**. Minor-type modes: **Dorian** = natural minor with a **raised 6**; **Phrygian** = natural minor with a **lowered 2**; **Locrian** = natural minor with a lowered 2 and a **lowered 5** (its tonic triad is diminished).' },
      { k: 'staff', staff: notes('treble', sc('F4', 'lydian'), 'F Lydian: F G A B C D E F'), caption: 'F Lydian: like F major but with B♮ instead of B♭, a bright raised 4th.' },
      { k: 'tip', t: 'To spell a mode on any note, start from the major or natural minor scale on that note and change the characteristic degree. E Dorian = E natural minor (E F♯ G A B C D) with a raised 6th: C♯.' },
      { k: 'try', prompt: 'Write **G Mixolydian**, G4 to G5.', task: scaleTask('G4', 'mixolydian') },
    ],
    examples: [
      { q: 'Spell E Dorian.', steps: ['E natural minor is E F♯ G A B C D E.', 'Dorian raises the 6th: C becomes C♯. E Dorian is E F♯ G A B C♯ D E.'], a: 'E F♯ G A B C♯ D E', staff: notes('treble', sc('E4', 'dorian'), 'E Dorian') },
      { q: 'G A B C D E F G: which mode is it?', steps: ['It starts on G and has a major 3rd (B), so compare with G major (which has F♯).', 'Only the 7th is lowered (F♮): major with a lowered 7th is Mixolydian.'], a: 'G Mixolydian' },
    ],
    practice: [
      MC('mt8-1-1', 1, 'Which mode is a major scale with a raised 4th?', ['Mixolydian', 'Dorian', 'Lydian', 'Phrygian'], 2, 'F to F on the white keys.', ['Lydian is major with a raised 4th (F Lydian has B♮ where F major has B♭).'], { check: () => pc(scale('F4', 'lydian')[3]) === 'B' && pc(scale('F4', 'major')[3]) === 'Bb' }),
      TASK('mt8-1-2', 2, 'Write **D Dorian**, D4 to D5.', scaleTask('D4', 'dorian'), 'The white keys from D to D.', ['D Dorian uses the white keys: D E F G A B C D.', 'Compared with D natural minor (which has B♭), the 6th is raised to B♮.']),
      MC('mt8-1-3', 2, 'Which mode is this?', ['E Aeolian', 'E Dorian', 'E Locrian', 'E Phrygian'], 3, 'White keys from E. Check the 2nd degree.', ['E to E on the white keys is E Phrygian: natural minor with a lowered 2nd (F♮ instead of F♯).'], { staff: notes('treble', sc('E4', 'phrygian'), 'E F G A B C D E'), check: () => sc('E4', 'phrygian').join() === 'E4,F4,G4,A4,B4,C5,D5,E5' }),
      P('mt8-1-4', 1, 'Mixolydian lowers which degree of the major scale? (a number)', ['7'], 'G to G on the white keys.', ['G Mixolydian (G A B C D E F G) differs from G major only at the 7th: F♮ instead of F♯.'], { check: () => pc(scale('G4', 'mixolydian')[6]) === 'F' && pc(scale('G4', 'major')[6]) === 'F#' }),
      TASK('mt8-1-5', 2, 'Write **A Lydian**, A4 to A5.', scaleTask('A4', 'lydian'), 'A major with a raised 4th.', ['A major is A B C♯ D E F♯ G♯ A.', 'Raise the 4th (D → D♯): A Lydian is A B C♯ D♯ E F♯ G♯ A.']),
      MC('mt8-1-6', 1, 'The Aeolian mode is the same as…', ['natural minor', 'harmonic minor', 'major', 'melodic minor'], 0, 'A to A on the white keys.', ['A Aeolian (A to A on the white keys) is A natural minor.']),
      MC('mt8-1-7', 2, 'Which mode has a diminished tonic triad?', ['Phrygian', 'Aeolian', 'Locrian', 'Lydian'], 2, 'B to B on the white keys: B–D–F.', ['Locrian (B to B on the white keys) has B–D–F as its tonic triad: diminished, because of its lowered 5th.'], { check: () => { const s = scale('B4', 'locrian'); return identify([s[0], s[2], s[4]].map(spell))?.q === 'd'; } }),
      MC('mt8-1-8', 3, 'Listen to the scale. Which mode is it?', ['Major (Ionian)', 'Lydian', 'Mixolydian', 'Dorian'], 1, 'It sounds major. Listen to the 4th note.', ['The scale sounds major (a major 3rd), but its 4th note is a half step higher than in a major scale, giving a bright, floating sound.', 'Major with a raised 4th is Lydian.'], { listen: hear(sc('C4', 'lydian'), undefined, 110), check: () => pc(scale('C4', 'lydian')[3]) === 'F#' }),
    ],
    remember: ['Ionian 1, Dorian 2, Phrygian 3, Lydian 4, Mixolydian 5, Aeolian 6, Locrian 7.', 'Lydian ♯4, Mixolydian ♭7 (vs major).', 'Dorian ♯6, Phrygian ♭2, Locrian ♭2 ♭5 (vs natural minor).'],
    checkIn: 'Next: how phrases combine into periods.',
  },
  {
    id: 'mt8-2', unit: 8, n: 2, title: 'Phrase structure: periods and phrase groups',
    intro: 'Phrases combine into larger shapes, like questions and answers. Today you learn the antecedent–consequent period, its parallel and contrasting forms, double periods and phrase groups, and the letters musicians use to diagram them.',
    goals: ['Identify antecedent and consequent phrases', 'Tell parallel from contrasting periods', 'Recognize double periods and phrase groups', 'Diagram phrases with letters'],
    notes: [
      { k: 'rule', title: 'The period', t: 'A **period** is two phrases in a question–answer relationship: the **antecedent** ends with a weaker cadence (usually a half cadence or IAC) and the **consequent** ends with a stronger one (usually a PAC).' },
      { k: 'staff', staff: PERIOD, caption: 'A parallel period in C major: both phrases begin alike; the first ends on D over V (half cadence), the second on C over I (PAC).' },
      { k: 'rule', title: 'Parallel or contrasting', t: 'In a **parallel period** both phrases begin with the same (or very similar) material: a a′. In a **contrasting period** they begin differently: a b. A **double period** has four phrases: two antecedents and then the consequent cadence.' },
      { k: 'rule', title: 'Phrase groups', t: 'Phrases that do not form an antecedent–consequent pair (for example, both end with a PAC, or three phrases in a row) are a **phrase group**.' },
      { k: 'list', items: ['**Phrase extension:** a phrase lengthened (by repetition, a deceptive cadence, or an added ending).', '**Elision:** the last note of one phrase is also the first note of the next.', 'Typical phrase length: four measures, but many are three, five or more.'] },
    ],
    examples: [
      { q: 'Phrase 1 ends with a half cadence and phrase 2 with a PAC, and both begin with the same melody. What is the structure?', steps: ['Weaker cadence, then stronger cadence: antecedent and consequent, a period.', 'Both phrases begin alike, so it is a parallel period.'], a: 'Parallel period' },
      { q: 'Two phrases both end with a PAC. Is it a period?', steps: ['A period needs a weaker first cadence and a stronger second one.', 'Two equally strong PACs do not form a question and answer, so it is a phrase group.'], a: 'No: a phrase group' },
    ],
    practice: [
      MC('mt8-2-1', 1, 'An antecedent phrase usually ends with…', ['a PAC', 'a weaker cadence, often a half cadence', 'no cadence at all', 'a plagal cadence only'], 1, 'It is the "question".', ['The antecedent asks a question, ending with a weaker cadence (HC or IAC), so the consequent can answer it.']),
      MC('mt8-2-2', 2, 'Two phrases begin with different material, and the second ends with a stronger cadence. This is…', ['a parallel period', 'a phrase group', 'a contrasting period', 'a double period'], 2, 'Question and answer, but different beginnings.', ['Weaker then stronger cadence makes a period; different openings make it contrasting (a b).']),
      MC('mt8-2-3', 2, 'What structure is this melody?', ['Contrasting period', 'Parallel period', 'Phrase group', 'Double period'], 1, 'Compare the openings and the cadences.', ['Both phrases open with the same notes (C E D C | B C D G).', 'The first ends on D (half cadence), the second on C (PAC): a parallel period.'], { staff: PERIOD, check: () => ANT.slice(0, 8).join() === CONS.slice(0, 8).join() && pc(ANT[ANT.length - 1]) === 'D' && pc(CONS[CONS.length - 1]) === 'C' }),
      P('mt8-2-4', 1, 'How many phrases are in a double period?', ['4'], 'Two periods\' worth.', ['A double period has four phrases: the first cadence of the pair is weaker, and the final cadence is the strongest.']),
      MC('mt8-2-5', 1, 'When the last note of one phrase is also the first note of the next, it is called…', ['phrase extension', 'an anacrusis', 'a cadence', 'phrase elision'], 3, 'The phrases overlap.', ['An overlap where one note both ends one phrase and begins the next is an elision.']),
      MC('mt8-2-6', 1, 'A consequent phrase usually ends with…', ['a half cadence', 'a PAC', 'a deceptive cadence', 'no cadence'], 1, 'It is the "answer".', ['The consequent answers with a strong, conclusive cadence, usually a PAC.']),
      MC('mt8-2-7', 1, 'The letters a a′ describe phrases that…', ['are in different keys', 'are completely different', 'start alike (parallel)', 'both end with half cadences'], 2, 'The prime mark means "a varied".', ['a and a′ begin with the same material, with some change (usually the ending): parallel phrases.']),
      MC('mt8-2-8', 2, 'Phrase 1 ends with a PAC and phrase 2 also ends with a PAC. Together they form…', ['an antecedent–consequent period', 'a double period', 'a parallel period', 'a phrase group'], 3, 'Is there a weaker first cadence?', ['A period needs a weaker cadence first. Two PACs do not make a question and answer, so they form a phrase group.']),
    ],
    remember: ['Period: antecedent (weaker cadence) + consequent (stronger, usually PAC).', 'Parallel (a a′) vs contrasting (a b).', 'Double period = 4 phrases; phrase group = no question–answer.'],
    checkIn: 'Next: the forms of whole pieces.',
  },
  {
    id: 'mt8-3', unit: 8, n: 3, title: 'Form: binary, ternary and more',
    intro: 'Zoom out from phrases to whole pieces. Today you learn the common forms the exam asks about: binary (simple and rounded), ternary, strophic, through-composed, theme and variations, and rondo, and the questions to ask when you hear a piece.',
    goals: ['Diagram binary, rounded binary and ternary forms', 'Tell sectional from continuous binary', 'Recognize strophic, through-composed, variations and rondo', 'Use letters to describe form'],
    notes: [
      { k: 'rule', title: 'Binary form', t: '**Binary form (AB)** has two sections, often each repeated: ||: A :||: B :||. If A ends with a PAC in the home key it is **sectional**; if A ends in a new key or on a half cadence it is **continuous**. In **rounded binary**, the second section ends with a return of A\'s opening material: ||: A :||: B A′ :||.' },
      { k: 'rule', title: 'Ternary form', t: '**Ternary form (ABA)** has three sections. The first A is complete and closed (it ends with a PAC in the tonic), B contrasts (often in a new key), and A returns.' },
      { k: 'list', items: ['**Strophic:** the same music for every verse of a song (AAA…).', '**Through-composed:** new music for each section of text.', '**Theme and variations:** a theme, then varied versions of it (A A′ A″ …).', '**Rondo:** a refrain that keeps returning between contrasting episodes (ABACA…).', '**32-bar song form:** AABA.'] },
      { k: 'tip', t: 'Three questions identify most forms: How does the first section end (closed in the tonic or not)? Does the opening material return? How many contrasting sections are there?' },
      { k: 'warn', t: 'Rounded binary and ternary can look alike (both have a return of A). In ternary, the first A is closed in the home key; in rounded binary, the first section usually ends open (often in a new key), and the two halves are each repeated.' },
    ],
    examples: [
      { q: 'A piece is laid out ||: A :||: B A′ :||. Name the form.', steps: ['Two repeated sections: binary.', 'The second section ends with a return of the opening (A′): rounded binary.'], a: 'Rounded binary' },
      { q: 'A song uses the same music for every verse. Name the form.', steps: ['Every verse repeats the same music.', 'That is strophic form.'], a: 'Strophic' },
    ],
    practice: [
      MC('mt8-3-1', 1, 'ABA, with a complete, closed first A section, is…', ['binary form', 'ternary form', 'strophic form', 'through-composed form'], 1, 'Three parts, with a return.', ['A closed A, a contrasting B, and A again: ternary form.']),
      MC('mt8-3-2', 2, '||: A :||: B A′ :|| is…', ['simple binary', 'ternary', 'rondo', 'rounded binary'], 3, 'Look at how the second half ends.', ['Two repeated halves (binary), with the opening returning at the end of the second half: rounded binary.']),
      MC('mt8-3-3', 1, 'A song with new music for each section of its text is…', ['strophic', 'through-composed', 'binary', 'theme and variations'], 1, 'No section repeats.', ['New music throughout, following the text, is through-composed.']),
      MC('mt8-3-4', 2, 'In continuous binary form, the first section ends…', ['with a PAC in the tonic', 'with the B theme', 'not closed in the tonic (in a new key or on a half cadence)', 'with a fermata'], 2, 'Continuous means it cannot stand alone.', ['If the A section does not close in the home key, the music must continue: continuous binary.']),
      MC('mt8-3-5', 1, 'ABACA is…', ['rondo', 'ternary', 'rounded binary', 'strophic'], 0, 'A keeps coming back.', ['A refrain (A) returning between contrasting episodes (B, C) is rondo form.']),
      MC('mt8-3-6', 1, 'A melody repeated several times, changed each time in harmony, rhythm or ornament, is…', ['strophic form', 'through-composed form', 'binary form', 'theme and variations'], 3, 'The same theme in new clothes.', ['A theme followed by varied versions of it is theme and variations.']),
      P('mt8-3-7', 1, 'In AABA (32-bar song form), how many sections use the A material?', ['3'], 'Count the A\'s.', ['A, A, B, A: three sections use A.']),
      MC('mt8-3-8', 1, 'Strophic form means…', ['new music for every verse', 'two contrasting halves', 'a returning refrain between episodes', 'the same music for every verse'], 3, 'Think of a hymn with many verses.', ['Strophic form repeats the same music for every verse (stanza) of the text.']),
    ],
    remember: ['Binary AB; rounded binary ||: A :||: B A′ :||.', 'Ternary ABA with a closed first A.', 'Strophic (same music), through-composed (new music), variations, rondo (ABACA), AABA.'],
    checkIn: 'Next: putting it all together for the exam\'s listening questions.',
  },
  {
    id: 'mt8-4', unit: 8, n: 4, title: 'Aural skills and the AP exam',
    intro: 'Much of the AP Music Theory exam is about listening: melodic and harmonic dictation, sight-singing, and aural multiple-choice questions. Today you learn how the exam is laid out and a step-by-step strategy for each listening task, then practise with real sounds.',
    goals: ['Know the layout of the AP exam', 'Use a strategy for melodic and harmonic dictation', 'Prepare for sight-singing', 'Identify intervals, chords, cadences and meters by ear'],
    notes: [
      { k: 'rule', title: 'The exam (check the College Board site for the current details)', t: '**Section I:** 75 multiple-choice questions in about 80 minutes, many with recorded music, about **45%** of the score. **Section II:** 9 free-response questions, about **55%**: 2 melodic dictations, 2 harmonic dictations, 2 part-writing questions (one from figured bass, one from Roman numerals), 1 harmonization (writing a bass line and Roman numerals for a melody) and 2 sight-singing questions.' },
      { k: 'rule', title: 'Melodic dictation', t: 'Before writing, listen for the **tonic** and the **meter**. On the first hearing, sketch the **contour** and **rhythm**; then fill in **scale degrees** (or solfège), anchoring on the tonic and the dominant. Check that the melody ends on a stable degree (usually 1).' },
      { k: 'rule', title: 'Harmonic dictation', t: 'Write the **bass line** first (as scale degrees), then the **soprano**. Then choose Roman numerals that fit both: bass 5 under a soprano 7 or 2 means V; bass 4 often means IV or ii6. Most excerpts end with a cadence, so start from the end if you are stuck.' },
      { k: 'rule', title: 'Sight-singing', t: 'Use your practice time: find the key and tonic, sing the tonic triad, tap the beat, and scan for leaps. Sing on solfège or numbers at a steady tempo; keep going after a mistake. Scoring is by segments, so a slip in one place does not ruin the rest.' },
      { k: 'staff', staff: notes('treble', ['C4', 'D4', 'E4', 'G4', 'E4', 'D4', 'C4'], 'A short melody: C D E G E D C', { dur: 'q', above: ['1', '2', '3', '5', '3', '2', '1'] }), caption: 'Think in scale degrees: 1 2 3 5 3 2 1. Press play, then sing it back on numbers.' },
      { k: 'tip', t: 'Practise a little every day: ten minutes in the Music Studio ear trainer is worth more than an hour the week before the exam.' },
    ],
    examples: [
      { q: 'Listen: after the tonic chord, a melody starts on 1. What are its scale degrees?', listen: inKey(['C4', 'E4', 'G4'], ['C4', 'D4', 'E4', 'C4', 'G4'], [1, 1, 1, 1, 2]), steps: ['The first three notes climb by step from the tonic: 1 2 3.', 'It drops back to 1, then leaps up to a stable note a 5th above: 5.'], a: '1 2 3 1 5' },
      { q: 'Harmonic dictation: you hear the bass 1 – 4 – 5 – 1 under the soprano 5 – 6 – 5 – 5. Which chords?', listen: hear(chords([{ S: 'G4', A: 'E4', T: 'C4', B: 'C3' }, { S: 'A4', A: 'F4', T: 'C4', B: 'F2' }, { S: 'G4', A: 'D4', T: 'B3', B: 'G2' }, { S: 'G4', A: 'E4', T: 'C4', B: 'C3' }]), [1, 1, 1, 2], 70), steps: ['Bass 1 suggests I; bass 4 suggests IV (or ii6).', 'Bass 5 suggests V, and bass 1 at the end is I: I – IV – V – I.'], a: 'I – IV – V – I' },
    ],
    practice: [
      MC('mt8-4-1', 2, 'Listen: the tonic chord sounds, then a melody. Which scale degrees do you hear?', ['1 2 3 4 3 2 1', '1 2 3 5 3 2 1', '1 3 5 3 1 2 1', '1 2 3 6 3 2 1'], 1, 'The 4th note is a leap. How far?', ['The melody climbs 1 2 3 by step, then leaps up to a stable note: 5.', 'It then steps back down 3 2 1. Answer: 1 2 3 5 3 2 1.'], { listen: inKey(['C4', 'E4', 'G4'], ['C4', 'D4', 'E4', 'G4', 'E4', 'D4', 'C4'], [1, 1, 1, 1, 1, 1, 2]) }),
      MC('mt8-4-2', 2, 'Listen to the progression. Which bass line (scale degrees) do you hear?', ['1 – 6 – 4 – 5 – 1', '1 – 4 – 6 – 5 – 1', '1 – 6 – 2 – 5 – 1', '1 – 3 – 4 – 5 – 1'], 0, 'After 1, the bass drops a 3rd.', ['The bass goes from 1 down a 3rd to 6, down another 3rd to 4, up a step to 5, and back to 1.', 'That is the bass of I – vi – IV – V – I.'], { listen: hear(chords(I_VI_IV_V_I), [1, 1, 1, 1, 2], 70), check: () => checkSatb(I_VI_IV_V_I, C, ['I', 'vi', 'IV', 'V', 'I']).length === 0 && I_VI_IV_V_I.map((c) => pc(c.B!)).join() === 'C,A,F,G,C' }),
      MC('mt8-4-3', 2, 'Listen: how does this phrase end?', ['Perfect authentic cadence', 'Plagal cadence', 'Deceptive cadence', 'Half cadence'], 3, 'Does it sound finished?', ['The phrase stops on a chord that still sounds tense and open, the dominant.', 'Ending on V is a half cadence.'], { listen: hear(chords([{ S: 'E5', A: 'G4', T: 'C4', B: 'C3' }, { S: 'D5', A: 'A4', T: 'F4', B: 'F3' }, { S: 'D5', A: 'G4', T: 'B3', B: 'G3' }]), [1, 1, 3], 70), check: () => romanOf(['G3', 'B3', 'G4', 'D5'], C) === 'V' }),
      MC('mt8-4-4', 1, 'Listen to the melodic interval. Which is it?', ['Minor 6th', 'Perfect 5th', 'Minor 7th', 'Major 6th'], 3, 'Wider than a 5th; sweet rather than tense.', ['The leap is wider than a 5th and sounds sweet and consonant, not tense.', 'C up to A is a major 6th.'], { listen: hear(['C4', 'A4', ['C4', 'A4']], [1, 1, 2], 70), check: () => ivName('C4', 'A4') === 'M6' }),
      MC('mt8-4-5', 1, 'Listen to the triad. Which quality is it?', ['Major', 'Minor', 'Diminished', 'Augmented'], 2, 'Small and tense, with no perfect 5th.', ['The triad sounds compressed and tense: its outer notes make a diminished 5th.', 'Two minor 3rds (B–D–F) make a diminished triad.'], { listen: hear([['B3', 'D4', 'F4']], [3], 70, true), check: () => identify(['B3', 'D4', 'F4'])?.q === 'd' }),
      MC('mt8-4-6', 1, 'About how much of the AP exam score comes from the free-response section?', ['About 25%', 'About 45%', 'About 55%', 'About 75%'], 2, 'Multiple choice is the smaller part.', ['Section I (multiple choice) is about 45% and Section II (free response) about 55%.']),
      MC('mt8-4-7', 1, 'In harmonic dictation, what is usually best to write first?', ['The alto line', 'The bass line', 'The inner-voice rhythm', 'The tempo marking'], 1, 'The lowest voice shows the harmony.', ['The bass line, with the soprano, tells you most of the chords; write it first.']),
      MC('mt8-4-8', 2, 'Listen to the rhythm. Which meter fits it?', ['Simple duple', 'Compound duple', 'Simple triple', 'Simple quadruple'], 2, 'Count the long–short pattern: how many beats per group?', ['The pattern repeats as long–short (two beats, then one), grouping the beats in threes.', 'Three quarter-note beats per measure is simple triple (3/4).'], { listen: hear(['C5', 'E5', 'G5', 'E5', 'F5', 'D5', 'C5'], [2, 1, 2, 1, 2, 1, 3], 100) }),
    ],
    remember: ['Section I ≈ 45% (75 MC); Section II ≈ 55% (9 free-response questions).', 'Dictation: tonic and meter first, then contour, rhythm, scale degrees.', 'Harmonic dictation: bass first, then soprano, then Roman numerals.', 'Sight-singing: key, tonic triad, steady beat, keep going.'],
    checkIn: 'You have finished the course. Review your weakest units, then practise daily in the Music Studio.',
  },
];


export const MUSIC_D_TUTOR: Record<string, LessonTutor> = {
  'mt6-1': {
    bigIdea: [
      'Melodies decorate chords with notes that do not belong to them. These non-chord tones add motion and expression; without them, melodies would only jump between chord tones.',
      'Every non-chord tone has a name based on two moves: how you get to it and how you leave it. Step–step in the same direction is a passing tone; step away and back is a neighbor; leap–step is an appoggiatura; step–leap is an escape tone.',
      'An anticipation is different: it is a note of the next chord that arrives a little early.',
    ],
    picture: { title: 'Stepping stones', t: 'Chord tones are stones in a stream. A passing tone is a small stone between two big ones on your way across; a neighbor is a stone you step onto and then step back from.' },
    words: [
      { term: 'Non-chord tone', means: 'A melody note that does not belong to the chord.' },
      { term: 'Passing tone', means: 'Step in, step out, same direction.' },
      { term: 'Neighbor tone', means: 'Step away and back to the same note.' },
      { term: 'Appoggiatura', means: 'Leap in, step out.' },
      { term: 'Escape tone', means: 'Step in, leap out the other way.' },
    ],
    tools: [{ name: 'Triads', refresher: 'List the chord\'s three notes first.', lesson: 'mt3-1' }],
    why: [
      ['Check whether the note is in the chord.', 'Look at the move in and the move out.'],
      ['F is not in the chord.', 'Step up and back down is a neighbor.'],
    ],
    walk: {
      'mt6-1-1': ['Step in and step out.', 'Same direction, filling the gap between two chord tones.', 'Passing tone (choice B).'],
      'mt6-1-2': ['It is reached by a leap.', 'It is left by a step.', 'Appoggiatura (choice C).'],
      'mt6-1-3': ['A is not in C–E–G.', 'G steps up to A and returns to G.', 'Neighbor tone (choice D).'],
      'mt6-1-4': ['Step in.', 'Leap out in the opposite direction.', 'Escape tone (choice A).'],
      'mt6-1-5': ['The note belongs to the next chord.', 'It sounds before that chord arrives.', 'Anticipation (choice B).'],
      'mt6-1-6': ['V is G–B–D, so C is not a chord tone.', 'C is repeated when I arrives.', 'It anticipates the I chord (choice C).'],
      'mt6-1-7': ['F is not in C–E–G.', 'C leaps up to F; F steps down to E.', 'Appoggiatura (choice D).'],
      'mt6-1-8': ['G major is G–B–D.', 'C is the note that is not in the chord.', 'B to C to D: step, step, same direction, so C is a passing tone.'],
    },
    teach: {
      plan: ['Write a chord and a melody above it; circle the non-chord tones.', 'Draw arrows for "in" and "out" motion.', 'Name each type with the approach/leave table.', 'Have your student invent one of each.'],
      questions: [
        { q: 'Can a passing tone be on the beat?', a: 'Yes. Then it is an accented passing tone, which sounds more dissonant.' },
        { q: 'How is an appoggiatura different from an escape tone?', a: 'Reversed motion: an appoggiatura leaps in and steps out; an escape tone steps in and leaps out.' },
      ],
      keyPoints: ['Find the chord tones first.', 'Classify by approach and departure.', 'PT, NT, APP, ET, ANT.'],
    },
  },
  'mt6-2': {
    bigIdea: [
      'A suspension holds a note from one chord into the next, where it clashes, and then lets it fall to a chord tone. It is a delayed resolution that creates expressive tension.',
      'Suspensions are named by intervals above the bass: 4–3, 7–6, 9–8, and 2–3 when the bass itself is held.',
      'A retardation is a suspension that resolves upward, and a pedal point is a long note (usually in the bass) held under changing harmonies.',
    ],
    picture: { title: 'Holding a door', t: 'A suspension is like holding a door open a moment after everyone has moved on, then letting it close. The held note is the door, and the falling resolution is the click as it shuts.' },
    words: [
      { term: 'Preparation', means: 'The consonant note before the suspension.' },
      { term: 'Suspension', means: 'The held note that becomes dissonant.' },
      { term: 'Resolution', means: 'The step down to a chord tone.' },
      { term: 'Pedal point', means: 'A long held note under changing harmonies.' },
    ],
    tools: [{ name: 'Compound intervals', refresher: 'Subtract 7 to reduce a compound interval.', lesson: 'mt2-4' }],
    why: [
      ['Measure the suspended note from the bass and reduce.', 'Measure the resolution the same way.'],
      ['Measure the held note from the bass.', 'The 9th keeps its name.'],
    ],
    walk: {
      'mt6-2-1': ['First the note is a chord tone.', 'Then it is held into a new chord.', 'Then it resolves: preparation, suspension, resolution (choice B).'],
      'mt6-2-2': ['The suspended note is a dissonance.', 'It falls into a consonance.', 'Down by step (choice A).'],
      'mt6-2-3': ['E3 to D5 reduces to a 7th.', 'E3 to C5 reduces to a 6th.', 'A 7–6 suspension (choice C).'],
      'mt6-2-4': ['C3 to D4 is a 9th.', 'C3 to C4 is an octave.', 'A 9–8 suspension.'],
      'mt6-2-5': ['It is held like a suspension.', 'It resolves upward.', 'Retardation (choice A).'],
      'mt6-2-6': ['A long note stays in the bass.', 'The chords change above it.', 'Pedal point (choice C).'],
      'mt6-2-7': ['In a 2–3, the numbers count up from the held note.', 'The held note is the lowest one.', 'The bass is suspended (choice D).'],
      'mt6-2-8': ['G2 to C5 reduces to a 4th.', 'G2 to B4 reduces to a 3rd.', 'A 4–3 suspension.'],
    },
    teach: {
      plan: ['Play a 4–3 suspension slowly.', 'Label preparation, suspension and resolution.', 'Show how to measure from the bass.', 'Contrast suspension, retardation and pedal point.'],
      questions: [
        { q: 'Why is 9–8 not called 2–1?', a: 'To tell it apart from the 2–3 suspension, where the bass is suspended; and in practice the voices are more than an octave apart.' },
        { q: 'Does the suspension have to be tied?', a: 'Often it is tied, but the note can also be re-struck. What matters is that it is prepared, held into a dissonance, and resolved down.' },
      ],
      keyPoints: ['Three stages: preparation, suspension, resolution.', 'Name by intervals above the bass.', 'Retardation resolves up; pedal is a held bass.'],
    },
  },
  'mt6-3': {
    bigIdea: [
      'A motive is a short musical idea that keeps coming back, and composers develop it in standard ways: transposing, sequencing, inverting, reversing, stretching or shrinking it, or using just a fragment.',
      'A sequence repeats a pattern at new pitch levels. A real sequence copies every interval exactly (often leaving the key); a tonal sequence keeps the pattern inside the key.',
      'Harmony has sequences too. The most famous is the descending-fifths sequence, where each chord\'s root falls a fifth: I, IV, vii°, iii, vi, ii, V, I.',
    ],
    picture: { title: 'A logo redesigned', t: 'A motive is like a company logo: it can be flipped (inversion), mirrored (retrograde), enlarged (augmentation), shrunk (diminution) or cropped (fragmentation), and you still recognize it.' },
    words: [
      { term: 'Motive', means: 'A short, recognizable musical idea.' },
      { term: 'Inversion', means: 'The motive with its intervals turned upside down.' },
      { term: 'Retrograde', means: 'The motive played backwards.' },
      { term: 'Sequence', means: 'A pattern repeated at successive pitch levels.' },
    ],
    tools: [{ name: 'Intervals', refresher: 'Up a step becomes down a step when inverted.', lesson: 'mt2-3' }],
    why: [
      ['The same shape appears at new pitch levels.', 'Staying in the key makes it a tonal sequence.'],
      ['The notes appear in reverse order.', 'Backwards is retrograde.'],
    ],
    walk: {
      'mt6-3-1': ['Doubled values make the motive slower.', 'Longer values are augmentation.', 'Augmentation (choice B).'],
      'mt6-3-2': ['The first group goes up by step.', 'The second goes down by step from the same note.', 'Inversion (choice C).'],
      'mt6-3-3': ['The motive returns at higher or lower pitch levels.', 'One after another.', 'Sequence (choice D).'],
      'mt6-3-4': ['Exact interval copies.', 'Even if accidentals take it out of the key.', 'Real sequence (choice A).'],
      'mt6-3-5': ['Move every note up a whole step.', 'C5 up a major 2nd is D5.', 'The last note is D5.'],
      'mt6-3-6': ['Only part of the motive is used.', 'A piece of it is a fragment.', 'Fragmentation (choice C).'],
      'mt6-3-7': ['iii has root E.', 'A 5th below E is A.', 'vi comes next (choice D).'],
      'mt6-3-8': ['The motive rises a step, then another step.', 'The inversion falls a step, then another.', 'Write C5 – B4 – A4.'],
    },
    teach: {
      plan: ['Sing a four-note motive.', 'Show inversion, retrograde, augmentation and diminution on the staff.', 'Play a real and a tonal sequence.', 'Walk through the descending-fifths progression.'],
      questions: [
        { q: 'Is a tonal sequence "wrong" because the intervals change?', a: 'No. It keeps the music in the key; the general shape is what we recognize.' },
        { q: 'What is the difference between repetition and sequence?', a: 'Repetition is the same pitches again; a sequence moves the pattern to new pitch levels.' },
      ],
      keyPoints: ['Inversion, retrograde, augmentation, diminution, fragmentation.', 'Real vs tonal sequence.', 'Descending fifths: each root falls a fifth.'],
    },
  },
  'mt7-1': {
    bigIdea: [
      'Any major or minor chord in a key can have its own dominant. That secondary dominant makes the chord sound briefly like a tonic, which is called tonicization.',
      'To spell V/x, go up a perfect fifth from x\'s root and build a major triad (or a dominant seventh for V7/x). The result usually needs an accidental, and that accidental is the clue that a secondary dominant is present.',
      'Resolve it like any dominant: its third (a temporary leading tone) rises to x\'s root, and its seventh falls by step.',
    ],
    picture: { title: 'Borrowing a spotlight', t: 'Normally only the tonic gets the spotlight. A secondary dominant points a spotlight at another chord for a moment, so that chord feels like home just briefly.' },
    words: [
      { term: 'Secondary (applied) dominant', means: 'The V or V7 of a chord other than I.' },
      { term: 'Tonicization', means: 'Making a chord briefly sound like a tonic.' },
      { term: 'V/V', means: 'The dominant of the dominant.' },
    ],
    tools: [
      { name: 'Dominant seventh', refresher: 'Major triad + minor 7th; third rises, seventh falls.', lesson: 'mt5-2' },
      { name: 'Roman numerals', refresher: 'Know the diatonic chords of the key.', lesson: 'mt3-3' },
    ],
    why: [
      ['V of D is A; the 5th above A is E.', 'Build a dominant seventh on E.'],
      ['E–G♯–B is a major triad.', 'E is a 5th above A, the root of vi.'],
    ],
    walk: {
      'mt7-1-1': ['V in G major is D.', 'A 5th above D is A.', 'V/V is A–C♯–E.'],
      'mt7-1-2': ['V in F major is C.', 'A 5th above C is G.', 'V/V is G–B–D (choice B).'],
      'mt7-1-3': ['V7/IV in C is built on C.', 'C–E–G–B♭ is a dominant seventh.', 'The altered note is B♭.'],
      'mt7-1-4': ['A–C♯–E–G is a dominant seventh on A.', 'A is a 5th above D (ii).', 'V7/ii (choice D).'],
      'mt7-1-5': ['A temporary tonic must be major or minor.', 'vii° is diminished.', 'vii° cannot be tonicized (choice D).'],
      'mt7-1-6': ['IV in B♭ is E♭.', 'Its dominant is B♭; add a minor 7th.', 'V7/IV is B♭–D–F–A♭.'],
      'mt7-1-7': ['V7/V is the dominant of V.', 'It resolves to its target.', 'It goes to V (choice B).'],
      'mt7-1-8': ['V7/V: D–F♯–A–C, voiced C5, F♯4, A3 over D3.', 'C falls to B and F♯ rises to G as V arrives.', 'Then B4 rises to C5 in the final I.'],
    },
    teach: {
      plan: ['Show V/V in C and why F♯ appears.', 'Give the "up a 5th, build major" recipe.', 'Resolve V7/V to V on the staff.', 'Find secondary dominants by their accidentals.'],
      questions: [
        { q: 'Is V/V the same as the II chord?', a: 'It has the same root as ii, but it is major (with a raised third) and it functions as a dominant of V, so we label it V/V.' },
        { q: 'Why can\'t vii° be tonicized?', a: 'A tonic must be a stable major or minor triad; a diminished triad cannot sound like home.' },
      ],
      keyPoints: ['V/x: up a 5th from x, major triad (or Mm7).', 'Third rises to x; seventh falls.', 'Accidentals reveal secondary dominants.'],
    },
  },
  'mt7-2': {
    bigIdea: [
      'Leading-tone chords can be applied to other chords too: vii°/x, vii°7/x and viiø7/x are built on the note a half step below the target chord\'s root.',
      'Briefly emphasizing a chord is tonicization; actually moving to a new key, confirmed by a cadence there, is modulation.',
      'Composers modulate most smoothly to closely related keys (signatures differing by at most one accidental), often through a pivot chord that belongs to both keys.',
    ],
    picture: { title: 'Moving house', t: 'Tonicization is visiting a friend\'s house for dinner. Modulation is moving in, and the cadence in the new key is unpacking your boxes. A pivot chord is the doorway that belongs to both houses.' },
    words: [
      { term: 'vii°7/x', means: 'A fully diminished seventh built a half step below x\'s root.' },
      { term: 'Modulation', means: 'A change of key confirmed by a cadence.' },
      { term: 'Closely related keys', means: 'Keys whose signatures differ by at most one accidental.' },
      { term: 'Pivot chord', means: 'A chord that is diatonic in both the old and the new key.' },
    ],
    tools: [{ name: 'Secondary dominants', refresher: 'Applied chords point to a target chord.', lesson: 'mt7-1' }],
    why: [
      ['Find the target root (D) and its leading tone.', 'Stack minor 3rds.'],
      ['A pivot must be diatonic in both keys.', 'Find its Roman numeral in each key.'],
    ],
    walk: {
      'mt7-2-1': ['V in C is G; its leading tone is F♯.', 'Stack minor 3rds from F♯.', 'F♯–A–C–E♭.'],
      'mt7-2-2': ['D major has two sharps.', 'Keys with 1, 2 or 3 sharps (and the right modes) are related.', 'B minor, A major, F♯ minor, G major, E minor (choice B).'],
      'mt7-2-3': ['G♯–B–D–F is a fully diminished seventh.', 'G♯ is a half step below A (vi).', 'vii°7/vi (choice D).'],
      'mt7-2-4': ['The emphasis is brief.', 'No cadence confirms a new key.', 'Tonicization (choice B).'],
      'mt7-2-5': ['A is degree 6 in C: vi.', 'A is degree 2 in G: ii.', 'vi in C and ii in G (choice C).'],
      'mt7-2-6': ['A minor 3rd below E♭ is C.', 'C minor shares three flats with E♭ major.', 'The tonic is C.'],
      'mt7-2-7': ['ii in F is G minor.', 'A half step below G is F♯.', 'F♯–A–C–E♭.'],
      'mt7-2-8': ['viiø7 belongs naturally to major keys.', 'So applied viiø7 points to a major target.', 'Major (choice A).'],
    },
    teach: {
      plan: ['Build vii°7/V and resolve it.', 'Explain tonicization versus modulation.', 'List closely related keys on the circle of fifths.', 'Find a pivot chord between C and G major.'],
      questions: [
        { q: 'How do I know if a passage modulated?', a: 'Look for a cadence (usually V–I) in the new key. Without one, it is just tonicization.' },
        { q: 'Why are closely related keys easy to modulate to?', a: 'They share almost all their notes, so many chords belong to both keys.' },
      ],
      keyPoints: ['vii°7/x: half step below x\'s root.', 'Modulation needs a confirming cadence.', 'Closely related keys differ by at most one accidental.', 'Pivot chords belong to both keys.'],
    },
  },
  'mt8-1': {
    bigIdea: [
      'A mode is a scale that uses the same notes as a major scale but starts on a different degree. That shifts where the half steps fall, which changes the color completely.',
      'On the white keys: C Ionian (major), D Dorian, E Phrygian, F Lydian, G Mixolydian, A Aeolian (natural minor) and B Locrian.',
      'Each mode is easiest to remember as major or minor with one changed note: Lydian ♯4, Mixolydian ♭7, Dorian ♯6, Phrygian ♭2, Locrian ♭2 and ♭5.',
    ],
    picture: { title: 'One staircase, seven front doors', t: 'Imagine the same staircase entered from seven different floors. The steps are identical, but where the short steps fall relative to your starting floor is different each time, and that is the mode\'s color.' },
    words: [
      { term: 'Mode', means: 'A scale built by starting a major scale on another degree.' },
      { term: 'Dorian', means: 'Natural minor with a raised 6th.' },
      { term: 'Lydian', means: 'Major with a raised 4th.' },
      { term: 'Mixolydian', means: 'Major with a lowered 7th.' },
    ],
    tools: [
      { name: 'Major and minor scales', refresher: 'Compare each mode with the major or natural minor scale on the same note.', lesson: 'mt2-1' },
    ],
    why: [
      ['Start from E natural minor.', 'Raise the 6th for Dorian.'],
      ['Compare with G major.', 'Only the 7th is lowered: Mixolydian.'],
    ],
    walk: {
      'mt8-1-1': ['Compare each mode with major.', 'Lydian raises the 4th.', 'Lydian (choice C).'],
      'mt8-1-2': ['D Dorian is the white keys from D.', 'D E F G A B C D.', 'B♮ is the raised 6th compared with D minor.'],
      'mt8-1-3': ['These are the white keys from E.', 'The 2nd is a half step above E (F♮).', 'E Phrygian (choice D).'],
      'mt8-1-4': ['Compare G Mixolydian with G major.', 'Only F differs: F♮ instead of F♯.', 'Degree 7 is lowered.'],
      'mt8-1-5': ['A major: A B C♯ D E F♯ G♯ A.', 'Raise the 4th: D becomes D♯.', 'A B C♯ D♯ E F♯ G♯ A.'],
      'mt8-1-6': ['Aeolian is degree 6 of the major scale.', 'That is the relative minor.', 'Natural minor (choice A).'],
      'mt8-1-7': ['Locrian\'s tonic triad on B is B–D–F.', 'B–D–F has a diminished 5th.', 'Locrian (choice C).'],
      'mt8-1-8': ['The 3rd is major, so it is a major-type mode.', 'The 4th note is raised.', 'Lydian (choice B).'],
    },
    teach: {
      plan: ['Play the white-key modes one by one.', 'Name each mode\'s characteristic note.', 'Spell one mode on a new tonic.', 'Play two modes and ask which is which.'],
      questions: [
        { q: 'Is Ionian just major?', a: 'Yes. Ionian is the major scale, and Aeolian is the natural minor scale.' },
        { q: 'How do I spell F♯ Dorian?', a: 'Start with F♯ natural minor (F♯ G♯ A B C♯ D E) and raise the 6th: D♯.' },
      ],
      keyPoints: ['Seven modes from the white keys C to B.', 'Major-type: Lydian ♯4, Mixolydian ♭7.', 'Minor-type: Dorian ♯6, Phrygian ♭2, Locrian ♭2 ♭5.'],
    },
  },
  'mt8-2': {
    bigIdea: [
      'Phrases pair up like a question and an answer. The first (antecedent) ends with a weaker cadence, and the second (consequent) ends with a stronger one. Together they form a period.',
      'If both phrases begin the same way it is a parallel period (a a′); if they begin differently it is a contrasting period (a b).',
      'When phrases do not make a question-and-answer pair, for example two PACs in a row, they form a phrase group instead.',
    ],
    picture: { title: 'Question and answer', t: '"Are we there yet?" (a half cadence: unfinished) "Yes, we\'re home." (a PAC: complete). That pairing is a period.' },
    words: [
      { term: 'Antecedent', means: 'The first phrase of a period, ending with a weaker cadence.' },
      { term: 'Consequent', means: 'The second phrase, ending with a stronger cadence.' },
      { term: 'Parallel period', means: 'A period whose phrases begin alike.' },
      { term: 'Phrase group', means: 'Phrases without an antecedent–consequent relationship.' },
    ],
    tools: [{ name: 'Cadences', refresher: 'HC is weaker; PAC is the strongest.', lesson: 'mt4-4' }],
    why: [
      ['Weaker cadence then stronger cadence: a period.', 'Same beginnings make it parallel.'],
      ['A period needs a weaker first cadence.', 'Two PACs make a phrase group.'],
    ],
    walk: {
      'mt8-2-1': ['The antecedent asks a question.', 'It ends with a weaker cadence.', 'Often a half cadence (choice B).'],
      'mt8-2-2': ['Weaker then stronger cadence: a period.', 'Different beginnings.', 'Contrasting period (choice C).'],
      'mt8-2-3': ['Both phrases start C E D C | B C D G.', 'The first ends on D (HC), the second on C (PAC).', 'Parallel period (choice B).'],
      'mt8-2-4': ['A double period is two periods\' worth.', 'Each period has two phrases.', 'Four phrases.'],
      'mt8-2-5': ['The phrases overlap on one note.', 'That note both ends and begins a phrase.', 'Elision (choice D).'],
      'mt8-2-6': ['The consequent answers the question.', 'It closes strongly.', 'Usually a PAC (choice B).'],
      'mt8-2-7': ['a′ means a varied version of a.', 'The phrases start alike.', 'Parallel (choice C).'],
      'mt8-2-8': ['Both phrases close with a PAC.', 'There is no weaker first cadence.', 'Phrase group (choice D).'],
    },
    teach: {
      plan: ['Sing a question phrase and an answer phrase.', 'Label the cadences HC and PAC.', 'Show parallel and contrasting openings.', 'Explain phrase groups and double periods.'],
      questions: [
        { q: 'Can a period end with an IAC?', a: 'The consequent should be stronger than the antecedent. An IAC after an HC can work, but a PAC is the typical ending.' },
        { q: 'Are phrases always four measures?', a: 'No. Four is common, but phrases are defined by cadences, not by measure counts.' },
      ],
      keyPoints: ['Antecedent: weaker cadence. Consequent: stronger (usually PAC).', 'Parallel a a′; contrasting a b.', 'Two PACs: a phrase group.'],
    },
  },
  'mt8-3': {
    bigIdea: [
      'Form is the plan of a whole piece. Letters show which sections are alike: A, B, A′ (A varied).',
      'Binary form has two parts (AB), usually both repeated; rounded binary brings the opening back at the end of the second part. Ternary form has three parts (ABA), with a first A that closes completely in the home key.',
      'Songs and longer pieces use other plans: strophic (the same music for every verse), through-composed (always new), theme and variations, and rondo (a refrain returning between episodes).',
    ],
    picture: { title: 'Sandwiches and stories', t: 'Ternary form is a sandwich: bread, filling, bread (ABA). Rondo is a song with a chorus between verses (ABACA). Through-composed is a story that never repeats a page.' },
    words: [
      { term: 'Binary', means: 'Two-part form, AB.' },
      { term: 'Rounded binary', means: 'AB with A material returning at the end of B.' },
      { term: 'Ternary', means: 'Three-part form, ABA, with a closed first A.' },
      { term: 'Rondo', means: 'A recurring refrain between contrasting episodes.' },
    ],
    tools: [{ name: 'Phrases and periods', refresher: 'Sections are built from phrases ending in cadences.', lesson: 'mt8-2' }],
    why: [
      ['Two repeated halves: binary.', 'The opening returns at the end: rounded.'],
      ['Every verse uses the same music.', 'That is strophic.'],
    ],
    walk: {
      'mt8-3-1': ['There are three parts with a return.', 'The first A is closed.', 'Ternary (choice B).'],
      'mt8-3-2': ['Two repeated halves.', 'A′ returns at the end of the second half.', 'Rounded binary (choice D).'],
      'mt8-3-3': ['No section repeats.', 'New music follows the text.', 'Through-composed (choice B).'],
      'mt8-3-4': ['Continuous means it cannot end there.', 'The first section is not closed in the tonic.', 'Choice C.'],
      'mt8-3-5': ['A returns between B and C.', 'A recurring refrain.', 'Rondo (choice A).'],
      'mt8-3-6': ['The same theme returns, changed each time.', 'Each version is a variation.', 'Theme and variations (choice D).'],
      'mt8-3-7': ['AABA has four sections.', 'A appears in sections 1, 2 and 4.', 'Three sections use A.'],
      'mt8-3-8': ['Strophic songs repeat their music.', 'Each verse gets the same tune.', 'The same music for every verse (choice D).'],
    },
    teach: {
      plan: ['Draw letter diagrams for binary, rounded binary and ternary.', 'Explain sectional versus continuous binary.', 'List strophic, through-composed, variations and rondo.', 'Diagram a song your student knows.'],
      questions: [
        { q: 'How is rounded binary different from ternary?', a: 'In ternary the first A is closed in the tonic and complete on its own; in rounded binary the first section usually ends open, and each half is repeated.' },
        { q: 'Is verse–chorus pop music strophic?', a: 'Partly: the verses share music like strophic form, but the returning chorus also makes it rondo-like.' },
      ],
      keyPoints: ['Binary AB; rounded binary returns to A.', 'Ternary ABA with a closed A.', 'Strophic, through-composed, variations, rondo.'],
    },
  },
  'mt8-4': {
    bigIdea: [
      'The AP exam rewards your ears as much as your eyes: dictation, sight-singing and many multiple-choice questions use recorded music.',
      'Every listening task gets easier with a routine. Find the tonic and meter first, then the shape and rhythm, then the exact scale degrees. For harmony, write the bass, then the soprano, then the chords.',
      'Ear skills grow with short, daily practice, not cramming. Practise intervals, chord qualities, cadences and short melodies a little every day.',
    ],
    picture: { title: 'A detective at work', t: 'Listening is detective work. First gather the big clues (key, meter, contour), then zoom in on the details (exact pitches and rhythms). Never start with the details.' },
    words: [
      { term: 'Melodic dictation', means: 'Writing down a melody you hear.' },
      { term: 'Harmonic dictation', means: 'Writing the bass, soprano and Roman numerals of a progression you hear.' },
      { term: 'Sight-singing', means: 'Singing written music at first sight.' },
    ],
    tools: [
      { name: 'Scale degrees and solfège', refresher: 'do re mi fa sol la ti = 1 2 3 4 5 6 7.', lesson: 'mt1-2' },
      { name: 'Cadences', refresher: 'PAC, IAC, HC, plagal, deceptive.', lesson: 'mt4-4' },
    ],
    why: [
      ['Steps up from the tonic are 1 2 3.', 'A leap to a stable note a 5th above the tonic is 5.'],
      ['The bass reveals the harmony.', 'Match each bass degree to a chord.'],
    ],
    walk: {
      'mt8-4-1': ['The first three notes climb by step from 1: 1 2 3.', 'Then a leap up to 5, then down 3 2 1.', '1 2 3 5 3 2 1 (choice B).'],
      'mt8-4-2': ['The bass starts on 1, then drops a 3rd to 6.', 'Then another 3rd down to 4, up to 5, and home to 1.', '1 – 6 – 4 – 5 – 1 (choice A).'],
      'mt8-4-3': ['The last chord sounds tense and open.', 'It is the dominant.', 'Half cadence (choice D).'],
      'mt8-4-4': ['The leap is wider than a 5th.', 'It sounds sweet and consonant.', 'Major 6th (choice D).'],
      'mt8-4-5': ['The chord sounds tense and compressed.', 'Its outer notes are a diminished 5th apart.', 'Diminished (choice C).'],
      'mt8-4-6': ['Free response is the larger section.', 'It counts for about 55%.', 'About 55% (choice C).'],
      'mt8-4-7': ['The bass line carries the harmony.', 'Write it first, then the soprano.', 'The bass line (choice B).'],
      'mt8-4-8': ['The pattern is long–short: two beats, then one.', 'Beats group in threes.', 'Simple triple (choice C).'],
    },
    teach: {
      plan: ['Describe the exam\'s two sections and their weights.', 'Model melodic dictation step by step.', 'Model harmonic dictation: bass, soprano, numerals.', 'Run a one-minute sight-singing routine together.'],
      questions: [
        { q: 'What if I miss a note in dictation?', a: 'Keep going and fill gaps on later hearings. Scoring is by parts, so the rest still counts.' },
        { q: 'How can I practise sight-singing alone?', a: 'Pick a short melody, find the key, sing the tonic triad, and sing on numbers with a steady beat. Record yourself and check against an instrument.' },
      ],
      keyPoints: ['Section I ≈ 45%, Section II ≈ 55%.', 'Dictation: big picture first, details second.', 'Practise ear skills daily.'],
    },
  },
};

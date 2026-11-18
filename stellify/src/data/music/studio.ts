import { satbTask, type MusicTask } from '../../lib/music/tasks';
import type { Satb } from '../../lib/music/theory';
import { CAD64, F_PROG, II6_PROG, I_IV_V_I, V7_I } from './musicC';
import { I_VI_IV_V_I, SEC_DOM } from './musicD';

/** A-minor i–iv–V–i (checked by the voice-leading engine in the tests). */
export const MINOR_PROG: Satb[] = [{ S: 'E5', A: 'A4', T: 'C4', B: 'A2' }, { S: 'F5', A: 'A4', T: 'D4', B: 'D3' }, { S: 'E5', A: 'G#4', T: 'B3', B: 'E3' }, { S: 'E5', A: 'A4', T: 'C4', B: 'A2' }];
const bass = (cs: Satb[]) => cs.map((c) => ({ B: c.B }));

export interface StudioExercise { id: string; title: string; level: 'Warm-up' | 'AP level' | 'Challenge'; brief: string; task: MusicTask }
/** Part-writing workshop: the bass (or nothing) is given; the engine checks every rule. */
export const STUDIO_EXERCISES: StudioExercise[] = [
  { id: 'pw-1', title: 'I – IV – V – I in C major', level: 'Warm-up', brief: 'The bass is given. Keep the common tone in IV, and move the upper voices against the bass from IV to V.', task: satbTask({ tonic: 'C', mode: 'major' }, 0, ['I', 'IV', 'V', 'I'], I_IV_V_I, bass(I_IV_V_I)) },
  { id: 'pw-2', title: 'V7 – I in C major', level: 'Warm-up', brief: 'Resolve the leading tone up and the seventh down by step.', task: satbTask({ tonic: 'C', mode: 'major' }, 0, ['V7', 'I'], V7_I, bass(V7_I)) },
  { id: 'pw-3', title: 'I – ii6 – V – I in C major', level: 'AP level', brief: 'Double the bass in ii6 and watch for parallel fifths.', task: satbTask({ tonic: 'C', mode: 'major' }, 0, ['I', 'ii6', 'V', 'I'], II6_PROG, bass(II6_PROG)) },
  { id: 'pw-4', title: 'I – IV – V – I in F major', level: 'AP level', brief: 'The same progression in a new key: watch the B♭ in IV.', task: satbTask({ tonic: 'F', mode: 'major' }, -1, ['I', 'IV', 'V', 'I'], F_PROG, bass(F_PROG)) },
  { id: 'pw-5', title: 'i – iv – V – i in A minor', level: 'AP level', brief: 'Raise the leading tone (G♯) in V and avoid the augmented 2nd F–G♯.', task: satbTask({ tonic: 'A', mode: 'minor' }, 0, ['i', 'iv', 'V', 'i'], MINOR_PROG, bass(MINOR_PROG)) },
  { id: 'pw-6', title: 'ii6 – I64 – V – I (cadential 6/4)', level: 'Challenge', brief: 'Over the held dominant bass, move 6–5 and 4–3.', task: satbTask({ tonic: 'C', mode: 'major' }, 0, ['ii6', 'I64', 'V', 'I'], CAD64, bass(CAD64)) },
  { id: 'pw-7', title: 'I – V7/V – V – I (secondary dominant)', level: 'Challenge', brief: 'F♯ is a temporary leading tone: it rises to G. The seventh (C) falls.', task: satbTask({ tonic: 'C', mode: 'major' }, 0, ['I', 'V7/V', 'V', 'I'], SEC_DOM, bass(SEC_DOM)) },
  { id: 'pw-8', title: 'I – vi – IV – V – I, all four voices', level: 'Challenge', brief: 'Nothing is given: write every voice yourself.', task: satbTask({ tonic: 'C', mode: 'major' }, 0, ['I', 'vi', 'IV', 'V', 'I'], I_VI_IV_V_I) },
];

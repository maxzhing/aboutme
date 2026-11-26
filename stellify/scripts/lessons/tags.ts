/** Writes every misconception tag the app knows (math chapter traps, R&W trap codes) for the lesson verifier. */
import { writeFileSync } from 'node:fs';
import { TRAP } from '../../src/data/courses';
import { TRAPS } from '../../src/data/questions/distractors';
writeFileSync(process.argv[2], JSON.stringify({ math: Object.keys(TRAP).sort(), rw: Object.keys(TRAPS).sort() }, null, 1) + '\n');

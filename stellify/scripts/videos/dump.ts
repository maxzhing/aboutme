/** Writes every video's timeline (the narration for each shot) as JSON for the voice script. */
import { writeFileSync } from 'node:fs';
import { VIDEOS } from '../../src/data/videos';
import { shotsOf } from '../../src/data/videos/types';

const out = Object.fromEntries(VIDEOS.map((v) => [v.skill, shotsOf(v)]));
writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log(`${VIDEOS.length} videos, ${Object.values(out).flat().length} shots`);

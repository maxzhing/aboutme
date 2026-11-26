/** Writes every lesson's timeline (narration per shot) as JSON, keyed by lesson id, for the voice script. */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { VIDEOS } from '../../src/data/videos';
import { shotsOf, type Video } from '../../src/data/videos/types';
import { WALKTHROUGHS } from '../../src/data/narrated/content';

const out: Record<string, { skill: string; kind: string; shots: ReturnType<typeof shotsOf>; hash: string }> = {};
const add = (id: string, kind: string, v: Video) => {
  const shots = shotsOf(v);
  out[id] = { skill: v.skill, kind, shots, hash: createHash('sha256').update(JSON.stringify(shots)).digest('hex').slice(0, 16) };
};
for (const v of VIDEOS) add(`v-${v.skill}`, 'skill-video', v);
for (const w of WALKTHROUGHS) add(w.id, 'walkthrough', JSON.parse(readFileSync(join(__dirname, '../../content/lessons', w.skill, w.id, 'scene.json'), 'utf8')) as Video);
writeFileSync(process.argv[2], JSON.stringify(out));
console.log(`${Object.keys(out).length} lessons, ${Object.values(out).reduce((n, l) => n + l.shots.length, 0)} shots`);

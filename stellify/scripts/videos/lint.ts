/**
 * Script lint for lesson narration (the brief's Section 3): banned filler, stiff "let us", very long sentences,
 * markup that a voice would read aloud, and "minus" for a negative number. Exit code 1 on any error.
 *   npx tsx scripts/videos/lint.ts
 */
import { VIDEOS } from '../../src/data/videos';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { shotsOf, type Video } from '../../src/data/videos/types';
import { WALKTHROUGHS } from '../../src/data/narrated/content';
const ALL: Video[] = [...VIDEOS, ...WALKTHROUGHS.map((w) => JSON.parse(readFileSync(join(__dirname, '../../content/lessons', w.skill, w.id, 'scene.json'), 'utf8')) as Video)];

const BANNED = /\b(simply|just|obviously|clearly|as we all know)\b/i;
let errors = 0, warns = 0;
for (const v of ALL) for (const s of shotsOf(v)) {
  const t = s.say; if (!t) continue;
  const where = `${v.skill} scene ${s.scene + 1}`;
  if (BANNED.test(t)) { errors++; console.log(`ERROR ${where}: banned filler "${t.match(BANNED)![0]}": ${t}`); }
  if (/\bLet us\b/.test(t)) { errors++; console.log(`ERROR ${where}: say "let's", not "let us": ${t}`); }
  if (/[$\\{}]/.test(t)) { errors++; console.log(`ERROR ${where}: markup in narration: ${t}`); }
  if (/\bminus (one|two|three|four|five|six|seven|eight|nine|ten)\b(?! (from|of))/i.test(t) && /^[^.]*\b(is|equals|be|at)\s+minus\b/i.test(t)) { errors++; console.log(`ERROR ${where}: a negative number is "negative", not "minus": ${t}`); }
  for (const sentence of t.split(/(?<=[.?!])\s+/)) if (sentence.split(/\s+/).length > 32) { warns++; console.log(`warn  ${where}: long sentence (${sentence.split(/\s+/).length} words)`); }
}
console.log(`${errors} errors, ${warns} warnings`);
process.exit(errors ? 1 : 0);

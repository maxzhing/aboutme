/**
 * Question-bank validation gate.
 * Runs structural, rendering and (for math) independent numeric verification on every
 * authored question, then writes src/data/questions/validated.json. The app only serves
 * questions whose current content hash appears in that manifest.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import katex from 'katex';
import { ALL_RAW } from '../src/data/questions/all';
import { contentHash } from '../src/data/questions/hash';
import { validateQuestion, validateBank } from '../src/data/questions/rules';

const renderMath = (tex: string) => { katex.renderToString(tex, { throwOnError: true }); };

const failures: string[] = [];
const ids: Record<string, string> = {};
for (const q of ALL_RAW) {
  const errs = validateQuestion(q, renderMath);
  if (errs.length) failures.push(...errs.map((e) => `${q.id}: ${e}`));
  else ids[q.id] = contentHash(q);
}
const bankErrors = validateBank(ALL_RAW);

const passed = Object.keys(ids).length;
const strict = process.argv.includes('--strict');
console.log(`Questions authored: ${ALL_RAW.length}`);
console.log(`Questions validated: ${passed}`);
if (failures.length) { console.log(`\nQuestion failures (${failures.length}):`); failures.forEach((f) => console.log('  ✗ ' + f)); }
if (bankErrors.length) { console.log(`\nBank-level issues (${bankErrors.length}):`); bankErrors.forEach((f) => console.log('  ! ' + f)); }

writeFileSync(
  join(__dirname, '../src/data/questions/validated.json'),
  JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), count: passed, ids }, null, 1) + '\n',
);
console.log(`\nManifest written (${passed} ids).`);
if (failures.length || (strict && bankErrors.length)) process.exit(1);

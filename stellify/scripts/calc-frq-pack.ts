/**
 * Adds official AP Calculus BC free-response questions, written up as guided workouts in private/frq-*.ts
 * (files the student keeps out of git), to the private pack. Every step's keyed answer and independent
 * check() must pass first; nothing is written otherwise.
 *
 *   npx tsx scripts/calc-frq-pack.ts private/pack.json private/frq-2023.ts private/frq-2025.ts …
 *
 * Then build the personal copy: node scripts/build.mjs --pack private/pack.json
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { calcCorrect } from '../src/data/calc/types';
import { CALC_FORMULA } from '../src/data/calc/formulas';
import type { Frq } from '../src/data/calc/frq';

const [packPath, ...sources] = process.argv.slice(2);
if (!packPath || !sources.length) { console.error('usage: calc-frq-pack.ts <pack.json> <frq-file.ts> …'); process.exit(1); }

async function main() {
const all: Frq[] = [];
for (const src of sources) {
  const mod = await import(pathToFileURL(resolve(src)).href);
  for (const v of Object.values(mod)) if (Array.isArray(v)) all.push(...(v as Frq[]));
}
const errors: string[] = [];
const ids = new Set<string>();
let steps = 0;
for (const f of all) {
  if (ids.has(f.id)) errors.push(`duplicate id ${f.id}`); ids.add(f.id);
  if (!f.official || !f.source) errors.push(`${f.id}: official questions must be marked official with a source`);
  for (const p of f.parts) {
    if (!p.write || !p.trap) errors.push(`${f.id}${p.label}: missing full-credit note or trap`);
    for (const s of p.steps) {
      steps++;
      const fake = { id: 'x', q: '', answer: s.answer, hint: '', solution: [], level: 3 as const };
      if (!calcCorrect(fake, s.answer[0])) errors.push(`${f.id}${p.label}: keyed answer "${s.answer[0]}" is not accepted`);
      if (s.check) { try { if (s.check() !== true) errors.push(`${f.id}${p.label}: check() failed for "${s.prompt.slice(0, 60)}"`); } catch (e) { errors.push(`${f.id}${p.label}: check() threw ${(e as Error).message}`); } }
      if (s.formula && !CALC_FORMULA[s.formula]) errors.push(`${f.id}${p.label}: unknown formula id ${s.formula}`);
      if (s.explain.length < 160) errors.push(`${f.id}${p.label}: explanation too thin`);
    }
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

// functions do not survive JSON; the checks have already run
const plain = JSON.parse(JSON.stringify(all));
const pack = existsSync(packPath) ? JSON.parse(readFileSync(packPath, 'utf8')) : { items: [] };
const obj = Array.isArray(pack) ? { items: pack } : pack;
obj.calcFrqs = plain;
writeFileSync(packPath, JSON.stringify(obj));
console.log(`Added ${all.length} official free-response questions (${steps} checked steps) to ${packPath}. Keep it private.`);
}
main();

/**
 * Audits every original question against the Stellify question standard (src/data/questions/standard.ts) and
 * writes docs/QUESTION-STANDARD.md. Usage: npx tsx scripts/standard-audit.ts [--skill sys] [--ids]
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_RAW } from '../src/data/questions/all';
import { RULES, standardIssues, type RuleId } from '../src/data/questions/standard';
import { SKILL } from '../src/lib/taxonomy';

const only = process.argv.includes('--skill') ? process.argv[process.argv.indexOf('--skill') + 1] : null;
const qs = ALL_RAW.filter((q) => !only || q.skill === only);
const res = qs.map((q) => ({ q, issues: standardIssues(q) }));
const pass = res.filter((r) => !r.issues.length).length;

const perRule = new Map<RuleId, number>();
for (const r of res) for (const rule of new Set(r.issues.map((i) => i.rule))) perRule.set(rule, (perRule.get(rule) ?? 0) + 1);
const perSkill = new Map<string, { n: number; pass: number }>();
for (const r of res) { const s = perSkill.get(r.q.skill) ?? { n: 0, pass: 0 }; s.n++; if (!r.issues.length) s.pass++; perSkill.set(r.q.skill, s); }

const lines = [
  '# Question standard audit',
  '',
  `Generated ${new Date().toISOString().slice(0, 10)} by \`scripts/standard-audit.ts\`. The rules are in \`src/data/questions/standard.ts\`.`,
  '',
  `**${pass} of ${qs.length}** original questions meet the standard.`,
  '',
  '## Questions failing each rule',
  '',
  '| Rule | What it requires | Failing |',
  '|---|---|---|',
  ...(Object.keys(RULES).map(Number) as RuleId[]).map((k) => `| ${k} | ${RULES[k]} | ${perRule.get(k) ?? 0} |`),
  '',
  '## By skill',
  '',
  '| Skill | Questions | Meet the standard |',
  '|---|---|---|',
  ...[...perSkill].map(([k, v]) => `| ${SKILL[k as keyof typeof SKILL]?.name ?? k} (\`${k}\`) | ${v.n} | ${v.pass} |`),
  '',
];
if (!only) writeFileSync(join(__dirname, '../docs/QUESTION-STANDARD.md'), lines.join('\n'));
console.log(lines.slice(4).join('\n'));
if (process.argv.includes('--ids')) for (const r of res) if (r.issues.length) console.log(`${r.q.id}\t${r.issues.map((i) => `[${i.rule}] ${i.msg}`).join('; ')}`);

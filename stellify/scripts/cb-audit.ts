/**
 * Lists hard and very hard Reading and Writing questions that fall below the College Board’s hard level
 * (see CB_BAR in src/data/questions/rules.ts). Usage: npx tsx scripts/cb-audit.ts [--ids]
 */
import { ALL_RAW } from '../src/data/questions/all';
import { cbBarIssues } from '../src/data/questions/rules';

const below = ALL_RAW.map((q) => ({ q, issues: cbBarIssues(q) })).filter((x) => x.issues.length);
const hard = ALL_RAW.filter((q) => q.id.startsWith('r-') && q.d !== 'M').length;
console.log(`Below the College Board hard bar: ${below.length} of ${hard} hard/very hard Reading and Writing questions`);
const bySkill: Record<string, number> = {};
for (const { q } of below) bySkill[q.skill] = (bySkill[q.skill] ?? 0) + 1;
console.log(Object.entries(bySkill).map(([k, v]) => `${k} ${v}`).join(', '));
if (process.argv.includes('--ids')) for (const { q, issues } of below) console.log(`${q.id}\t${issues.join('; ')}`);

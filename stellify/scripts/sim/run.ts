/**
 * Study simulator: runs synthetic students (./model.ts) through the app's own decision code for up to four weeks
 * and reports how well each version personalises, how hard the questions it serves are for each student, and the
 * modelled score change. Usage: npx tsx scripts/sim/run.ts [students=400] [policy ...]
 *
 * Read the results as a comparison under one set of stated assumptions, not as a prediction for real students.
 */
import { spawn } from 'node:child_process';
import os from 'node:os';
import { getQuestion } from '../../src/data/questions';
import { initialState } from '../../src/lib/state';
import type { AppState, SkillId } from '../../src/lib/types';
import { SKILLS } from '../../src/lib/taxonomy';
import { generatePlan, todaysMission } from '../../src/lib/engine/plan';
import { engineInput } from '../../src/lib/path/input';
import { todayPlan, upcomingSkills } from '../../src/lib/path/next';
import { rankSkills } from '../../src/lib/engine/adaptive';
import { addDays, dateKey, parseDateKey } from '../../src/lib/util';
import { makeStudents, opportunity, totalScore, type Student } from './model';
import { doTask, newWorld, runDiagnostic, type World } from './app';
import { POLICIES_V2 } from './policies-v2';

export const START = '2026-09-07'; // a Monday
export const at = (day: number, hour = 16) => parseDateKey(addDays(START, day)) + hour * 3_600_000;

export interface Policy {
  name: string;
  label: string;
  /** set-up on day 0 (intake, diagnostic or placement) */
  setup(w: World): void;
  /** the student's tasks for today, in order */
  today(w: World): { href: string; minutes: number; skill?: SkillId }[];
  /** what the app would tell this student to work on first, right after set-up (for the personalisation measure) */
  firstSkills(w: World): SkillId[];
  /** the app's ranking of the student's skills, weakest first, right after set-up */
  ranking(w: World): SkillId[];
  /** chance this student quits during set-up */
  setupQuit(st: Student): number;
}

export function profileState(st: Student): AppState {
  const s = initialState();
  s.profile = { ...s.profile, targetScore: st.target, dailyMinutes: st.minutes, restDays: st.restDays, examDate: st.examIn ? addDays(START, st.examIn) : undefined, onboardedAt: at(0, 15) };
  return s;
}

const V1_SETUP_QUIT = (st: Student) => 0.08 + (st.grade <= 9 ? 0.2 : 0) + (st.minutes <= 20 ? 0.12 : 0); // a 40-minute diagnostic up front

export const V1: Policy[] = [
  {
    name: 'v1-plan', label: 'Current app, following the Study plan card (calendar plan)',
    setup(w) { w.s = profileState(w.st); if (!w.quitSetup) { runDiagnostic(w); w.s = { ...w.s, profile: { ...w.s.profile, diagnosticAt: w.now } }; } w.s = { ...w.s, plan: generatePlan(w.s, getQuestion, w.now), planDone: {} }; },
    today(w) { return todaysMission(w.s, getQuestion, w.now).tasks.map((t) => ({ href: t.href, minutes: t.minutes, skill: t.skill })); },
    firstSkills(w) { return (w.s.plan?.days ?? []).flatMap((d) => d.tasks.map((t) => t.skill)).filter((k): k is SkillId => !!k).filter((k, i, a) => a.indexOf(k) === i).slice(0, 3); },
    ranking(w) { const m = rankSkills(w.s, getQuestion, w.now); return m.map((r) => r.skill); },
    setupQuit: V1_SETUP_QUIT,
  },
  {
    name: 'v1-path', label: 'Current app, following the Today panel (Path engine)',
    setup(w) { w.s = profileState(w.st); if (!w.quitSetup) { runDiagnostic(w); w.s = { ...w.s, profile: { ...w.s.profile, diagnosticAt: w.now } }; } },
    today(w) { return todayPlan(engineInput(w.s, w.now)).filter((i) => !i.done).map((i) => ({ href: i.href, minutes: i.minutes, skill: i.skill })); },
    firstSkills(w) { return upcomingSkills(engineInput(w.s, w.now), 3); },
    ranking(w) { return rankSkills(w.s, getQuestion, w.now).map((r) => r.skill); },
    setupQuit: V1_SETUP_QUIT,
  },
];

declare module './app' { interface World { quitSetup?: boolean; quitDay?: number } }

export interface Result {
  st: Student; policy: string; start: number; end: number; horizon: number; quitDay: number | null;
  first: SkillId[]; ranking: SkillId[];
  /** share of days 0–13 skill minutes on the student's five biggest true opportunities */
  onTarget: number;
  /** knowing probability of every question served */
  know: number[];
  served?: import('./app').Served[];
  overBudgetDays: number; studyDays: number;
  notes: string[];
}

/** hazard of quitting on a study day: frustration (questions far too hard) and age */
const quitHazard = (st: Student, frust: number) => 0.006 + 0.06 * Math.max(0, frust - 0.3) + (st.grade <= 9 ? 0.006 : 0);

export function simulate(st0: Student, pol: Policy, opts: { dropout: boolean; detail?: boolean }): Result {
  const st: Student = structuredClone(st0);
  const w = newWorld(st, initialState(), at(0));
  const r0 = w.rand;
  w.quitSetup = opts.dropout && r0() < pol.setupQuit(st);
  pol.setup(w);
  const first = pol.firstSkills(w), ranking = pol.ranking(w);
  const horizon = Math.min(28, st.examIn ?? 28);
  let quitDay: number | null = w.quitSetup ? 0 : null;
  let over = 0, days = 0;
  for (let d = 0; d < horizon && quitDay === null; d++) {
    w.day = d; w.now = at(d);
    const dow = new Date(parseDateKey(addDays(START, d))).getDay();
    if (st.restDays.includes(dow)) continue;
    days++;
    w.used = 0;
    const startServed = w.served.length;
    const planned = pol.today(w);
    const plannedMin = planned.reduce((t, x) => t + x.minutes, 0);
    if (plannedMin > st.minutes + 10) over++;
    let guard = 0;
    let tasks = planned;
    while (w.used < st.minutes && guard++ < 10) {
      const t = tasks.shift();
      if (!t) { tasks = pol.today(w); if (!tasks.length || guard > 6) break; continue; }
      doTask(w, t.href, t.minutes);
    }
    const today = w.served.slice(startServed);
    const frust = today.length ? today.filter((x) => x.know < 0.3).length / today.length : 0;
    if (opts.dropout && w.rand() < quitHazard(st, frust)) quitDay = d;
  }
  const opp = [...SKILLS].sort((a, b) => opportunity(st0.theta, b.id) - opportunity(st0.theta, a.id)).slice(0, 5).map((k) => k.id);
  const early = w.skillMin.filter((x) => x.day < 14);
  const tot = early.reduce((t, x) => t + x.min, 0);
  const onTarget = tot ? early.filter((x) => opp.includes(x.skill)).reduce((t, x) => t + x.min, 0) / tot : 0;
  return { st: st0, policy: pol.name, start: totalScore(st0.theta), end: totalScore(st.theta), horizon, quitDay, first, ranking, onTarget, know: w.served.map((x) => x.know), served: opts.detail ? w.served : undefined, overBudgetDays: over, studyDays: days, notes: w.notes };
}

// ── report ──────────────────────────────────────────────────────────────────────────
const mean = (a: number[]) => (a.length ? a.reduce((t, x) => t + x, 0) / a.length : 0);
const median = (a: number[]) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const pctS = (x: number) => `${Math.round(x * 100)}%`;
function spearman(a: SkillId[], truth: Record<SkillId, number>) {
  if (a.length < 3) return 0;
  const ranked = [...a].sort((x, y) => truth[x] - truth[y]);
  const n = a.length; let d2 = 0;
  a.forEach((k, i) => { const j = ranked.indexOf(k); d2 += (i - j) ** 2; });
  return 1 - (6 * d2) / (n * (n * n - 1));
}
export const BANDS: [string, (s: number) => boolean][] = [['under 900', (s) => s < 900], ['900–1090', (s) => s >= 900 && s < 1100], ['1100–1290', (s) => s >= 1100 && s < 1300], ['1300 and up', (s) => s >= 1300]];

export function report(results: Result[], label: string) {
  const lines: string[] = [];
  const seqs = new Map<string, number>();
  for (const r of results) { const k = r.first.join(' → '); seqs.set(k, (seqs.get(k) ?? 0) + 1); }
  const top = [...seqs.entries()].sort((a, b) => b[1] - a[1])[0];
  const all = results.flatMap((r) => r.know);
  lines.push(`### ${label}`, '');
  lines.push(`- Different first-three-skill sequences: **${seqs.size}** for ${results.length} students. The most common one (${top[0] || 'none'}) went to **${pctS(top[1] / results.length)}** of students.`);
  lines.push(`- How well the app's skill ranking right after set-up matches each student's true weakest skills (Spearman, 1 = perfect, 0 = no relation): **${mean(results.map((r) => spearman(r.ranking, r.st.theta))).toFixed(2)}**.`);
  lines.push(`- Share of the first two weeks' study time spent on the student's five biggest true opportunities: **${pctS(mean(results.map((r) => r.onTarget)))}** (random would be about 17%).`);
  lines.push(`- Questions served that were far too hard (under a 30% chance the student knows how): **${pctS(all.filter((k) => k < 0.3).length / Math.max(1, all.length))}**; in a useful range (40–90%): **${pctS(all.filter((k) => k >= 0.4 && k <= 0.9).length / Math.max(1, all.length))}**.`);
  lines.push(`- Study days where the plan asked for more than the student's daily minutes plus 10: **${pctS(results.reduce((t, r) => t + r.overBudgetDays, 0) / Math.max(1, results.reduce((t, r) => t + r.studyDays, 0)))}**.`);
  lines.push('', '| Starting score | Students | Far-too-hard questions | Modelled change, all who started | Quit (modelled) |', '| --- | --- | --- | --- | --- |');
  for (const [b, f] of BANDS) {
    const rs = results.filter((r) => f(r.start));
    if (!rs.length) continue;
    const kn = rs.flatMap((r) => r.know);
    lines.push(`| ${b} | ${rs.length} | ${pctS(kn.filter((k) => k < 0.3).length / Math.max(1, kn.length))} | +${Math.round(mean(rs.map((r) => r.end - r.start)))} (median +${median(rs.map((r) => r.end - r.start))}) | ${pctS(rs.filter((r) => r.quitDay !== null).length / rs.length)} |`);
  }
  lines.push(`| **all** | ${results.length} | ${pctS(all.filter((k) => k < 0.3).length / Math.max(1, all.length))} | **+${Math.round(mean(results.map((r) => r.end - r.start)))}** | ${pctS(results.filter((r) => r.quitDay !== null).length / results.length)} |`, '');
  return lines.join('\n');
}

if (process.argv[1]?.endsWith('run.ts')) {
  const n = Number(process.argv[2]) || 400;
  const want = process.argv.slice(3).filter((a) => !a.startsWith('--'));
  const shard = process.argv.find((a) => a.startsWith('--shard='))?.slice(8);
  const students = makeStudents(n);
  const pols = [...V1, ...POLICIES_V2].filter((p) => !want.length || want.includes(p.name));
  if (shard) {
    // a worker: simulate every k-th student and print raw results as JSON
    const [i, k] = shard.split('/').map(Number);
    const mine = students.filter((s) => s.id % k === i);
    const out = pols.map((pol) => ({ name: pol.name, res: mine.map((st) => simulate(st, pol, { dropout: true })), noDrop: mine.map((st) => simulate(st, pol, { dropout: false }).end - totalScore(st.theta)) }));
    process.stdout.write(JSON.stringify(out));
  } else void (async () => {
    const k = Math.max(1, Math.min(8, Number(process.env.SIM_WORKERS) || os.cpus().length));
    const t0 = Date.now();
    const parts = await Promise.all(Array.from({ length: k }, (_, i) => new Promise<{ name: string; res: Result[]; noDrop: number[] }[]>((ok, fail) => {
      const c = spawn(process.execPath, [...process.execArgv, process.argv[1], String(n), ...want, `--shard=${i}/${k}`], { stdio: ['ignore', 'pipe', 'inherit'] });
      let buf = ''; c.stdout.on('data', (d) => { buf += d; }); c.on('close', (code) => (code === 0 ? ok(JSON.parse(buf)) : fail(new Error(`worker ${i} exited ${code}`))));
    })));
    const out: string[] = [`Simulated ${n} students, up to 28 days each (or until their test), with the app's own code. ${((Date.now() - t0) / 1000).toFixed(0)} s on ${k} workers.`, ''];
    for (const pol of pols) {
      const res = parts.flatMap((p) => p.find((x) => x.name === pol.name)!.res);
      const noDrop = parts.flatMap((p) => p.find((x) => x.name === pol.name)!.noDrop);
      out.push(report(res, pol.label));
      out.push(`- Without any quitting: modelled change **+${Math.round(mean(noDrop))}** on average.`);
      const notes = res.flatMap((r) => r.notes);
      if (notes.length) out.push(`- Simulator notes: ${notes.length} (for example: ${[...new Set(notes.map((x) => x.replace(/^day \d+: /, '')))].slice(0, 3).join('; ')}).`);
      out.push('');
    }
    console.log(out.join('\n'));
  })();
}

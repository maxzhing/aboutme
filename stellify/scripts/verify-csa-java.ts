/**
 * Runs the AP Computer Science A practice answers through a real Java compiler.
 *
 *   npm run verify:csa-java
 *
 * Needs `javac` and `java` on the PATH (skips with a message if they are missing). Each typed-answer
 * problem becomes a small Java program: code blocks and ⟦…⟧ snippets from the question are wrapped in
 * a class, together with the classes and methods declared in the lesson's notes and examples, and the
 * program's output is compared with the keyed answer the same way the app grades it (exactly,
 * ignoring spaces and capital letters). Problems whose code is described in words rather than shown
 * are written out in MANUAL below, reusing the lesson's own code blocks wherever the question
 * refers to them ("using the digit-sum loop", "binary search (code in the notes)").
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { COURSES } from '../src/data/apCourses';
import { normalizeCalc, type CalcLesson, type CalcProblem } from '../src/data/calc/types';

interface Program { decl: string[]; body: string[]; file?: string }

const blocks = (s: string) => [...s.matchAll(/~~~[a-z]*\n?([\s\S]*?)\n?~~~/g)].map((m) => m[1]);
const snippets = (s: string) => [...s.replace(/~~~[\s\S]*?~~~/g, '').matchAll(/⟦([^⟧]*)⟧/g)].map((m) => m[1].trim());
const isDecl = (code: string) => /^\s*(public|private|protected|static|class|abstract|final)\b/.test(code.trim().split('\n')[0] ?? '');
const asStmt = (s: string) => (/[;}]\s*$/.test(s) ? s : s + ';');
const noImports = (code: string) => code.split('\n').filter((l) => !/^\s*import\s/.test(l)).join('\n');
/** top-level classes become static nested classes so one file holds everything */
const nest = (code: string) => code.replace(/^(\s*)public class /gm, '$1static class ').replace(/^(\s*)class /gm, '$1static class ');
/** "method … // in main: statements" blocks: the part before the marker is a declaration */
const split = (code: string): [string, string] => {
  const i = code.indexOf('// in main:');
  return i < 0 ? (isDecl(code) ? [code, ''] : ['', code]) : [code.slice(0, i), code.slice(i + '// in main:'.length)];
};

/** every code block of a lesson's notes and examples, in order */
const lessonBlocks = (l: CalcLesson) => [...l.notes.map((n) => ('t' in n ? n.t : '')), ...l.examples.map((e) => e.q)].flatMap(blocks);
/** declarations from the notes and examples, plus any class a practice question defines ("Using Counter:") */
const lessonDecls = (l: CalcLesson) => [...new Set([
  ...lessonBlocks(l).map((b) => split(noImports(b))[0]),
  ...l.practice.flatMap((p) => blocks(p.q)).filter((b) => /^\s*(public )?class /.test(b)),
].map((d) => d.trim()).filter(Boolean))];

/** binary search from the notes, counting each element it examines */
const countedSearch = (b: string[]) => `static int examined = 0;
public static int search(int[] arr, int target) {
${b[0].replace('int mid = (lo + hi) / 2;', 'int mid = (lo + hi) / 2; examined++;')}
}`;

/** Programs for problems that describe the code in words; L = the lesson's code blocks. */
const MANUAL: Record<string, (L: string[]) => Program> = {
  'cs2-4-1': (L) => ({ decl: [], body: ['int n = 4721;', L[0], 'System.out.println(sum);'] }),
  'cs2-4-3': (L) => ({ decl: [`public static String reverse(String s) {\n${L[1]}\n}`], body: ['System.out.println(reverse("loop"));'] }),
  'cs3-1-5': () => ({ decl: ['static class Player { private int points; public Player() { } }'], body: ['System.out.println(new Player().points);'] }),
  'cs3-3-1': () => ({ decl: [], body: ['new Ticket(); new Ticket(); new Ticket();', 'System.out.println(Ticket.getCount());'] }),
  'cs3-3-4': () => ({ decl: ['static class Box { private int x = 10; public int f() { int x = 3; return x + this.x; } }'], body: ['System.out.println(new Box().f());'] }),
  'cs3-3-5': () => ({ decl: ['static class Pet { private int age; public Pet(int a) { age = a; } public void setAge(int age) { age = age; } public int getAge() { return age; } }'], body: ['Pet d = new Pet(4);', 'd.setAge(9);', 'System.out.println(d.getAge());'] }),
  'cs4-2-1': (L) => ({ decl: [], body: ['int[] arr = {7, -2, 19, 4};', L[0], 'System.out.println(max);'] }),
  'cs4-2-2': () => ({ decl: [], body: ['int[] arr = {2, 5, 8, 11, 14};', 'int count = 0;', 'for (int v : arr) if (v % 2 == 0) count++;', 'System.out.println(count);'] }),
  'cs4-2-4': () => ({ decl: [], body: ['int[] a = {1, 2, 3, 4, 5};', 'for (int i = 0; i < a.length / 2; i++) { int t = a[i]; a[i] = a[a.length - 1 - i]; a[a.length - 1 - i] = t; }', 'System.out.println(a[1]);'] }),
  'cs4-2-5': () => ({ decl: [], body: ['int[] a = {10, 20, 30, 40};', 'int first = a[0];', 'for (int i = 0; i < a.length - 1; i++) a[i] = a[i + 1];', 'a[a.length - 1] = first;', 'System.out.println(a[3]);'] }),
  'cs4-4-2': () => ({ decl: [], body: ['System.out.println(total("@FILE"));'], file: '4 7 1 9' }),
  'cs4-5-2': (L) => ({ decl: [], body: [L[0], 'System.out.println(g.length * g[0].length);'] }),
  'cs4-5-3': (L) => ({ decl: [], body: [L[0], 'int sum = 0;', L[1].replace('// use g[r][c]', 'sum += g[r][c];'), 'System.out.println(sum);'] }),
  'cs4-6-1': () => ({ decl: [], body: ['int[] arr = {4, 8, 15, 16};', 'int idx = -1;', 'for (int i = 0; i < arr.length; i++) if (arr[i] == 15) { idx = i; break; }', 'System.out.println(idx);'] }),
  'cs4-6-2': (L) => ({ decl: [countedSearch(L)], body: ['search(new int[] {2, 5, 8, 12, 16, 23, 38, 56, 72, 91}, 23);', 'System.out.println(examined);'] }),
  'cs4-6-4': () => ({ decl: [], body: ['int[] a = {5, 3, 8, 1};', 'int m = 0;', 'for (int j = 1; j < a.length; j++) if (a[j] < a[m]) m = j;', 'int t = a[0]; a[0] = a[m]; a[m] = t;', 'System.out.println(a[3]);'] }),
  'cs4-6-5': () => ({ decl: [], body: ['int[] a = {4, 3, 2, 10, 12};', 'for (int i = 1; i <= 2; i++) { int key = a[i]; int j = i - 1; while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; j--; } a[j + 1] = key; }', 'System.out.println(a[0]);'] }),
  'cs4-6-6': (L) => ({ decl: [countedSearch(L)], body: ['int[] arr = new int[1000];', 'for (int i = 0; i < 1000; i++) arr[i] = 2 * i;', 'int worst = 0;', 'for (int t = -1; t <= 2000; t++) { examined = 0; search(arr, t); worst = Math.max(worst, examined); }', 'System.out.println(worst);'] }),
  'cs4-7-1': () => ({ decl: [], body: ['System.out.println(sum(4));'] }),
};

function program(l: CalcLesson, p: CalcProblem): Program | null {
  if (MANUAL[p.id]) return MANUAL[p.id](lessonBlocks(l));
  const decl: string[] = [], body: string[] = [];
  const qb = blocks(p.q), qs = snippets(p.q);
  const file = p.q.match(/A file contains ⟦([^⟧]*)⟧/)?.[1];
  if (file) body.push('Scanner sc = new Scanner(new File("@FILE"));');
  for (const b of qb) { const [d, s] = split(b); if (d.trim()) decl.push(d); if (s.trim()) body.push(s); }
  const loop = p.q.match(/How many times does the body of ⟦([^⟧]*)⟧ run\?/)?.[1];
  if (loop) return { decl, body: [...body, 'int runs = 0;', `${loop} runs++;`, 'System.out.println(runs);'] };
  if (/How many times does ⟦count\+\+⟧ run\?/.test(p.q)) return { decl, body: ['int count = 0;', ...body, 'System.out.println(count);'] };
  if (qb.length && /what is printed\?|Using \w+:/i.test(p.q) && body.some((s) => s.includes('System.out.print'))) {
    for (const s of qs) if (!file && !isDecl(s)) return null;
    return { decl, body, file };
  }
  if (!qs.length) return null;
  const target = qs[qs.length - 1];
  for (const s of qs.slice(0, -1)) {
    if (/^(public|private) static\b/.test(s)) decl.push(s);
    else if (/^(public|private)\b/.test(s)) return null;
    else body.push(asStmt(s));
  }
  if (/printed by ⟦/.test(p.q)) body.push(asStmt(target));
  else if (/What (is|does) (the value of )?⟦[^⟧]*⟧( return)?\?\s*$/.test(p.q.replace(/~~~[\s\S]*?~~~/g, '').trim())) body.push(`System.out.println(${target});`);
  else return null;
  return { decl, body, file };
}

/** the sandbox can set JAVA_TOOL_OPTIONS, which makes every java call print a banner */
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'JAVA_TOOL_OPTIONS'));

function main() {
  if (spawnSync('javac', ['-version'], { env }).status !== 0) { console.log('javac not found: skipping the Java check.'); return; }
  const dir = mkdtempSync(join(tmpdir(), 'csa-java-'));
  const jobs: { p: CalcProblem; cls: string }[] = [];
  const skipped: string[] = [];
  for (const l of COURSES.csa.lessons) {
    const shared = lessonDecls(l);
    for (const p of l.practice) {
      if (typeof p.answer === 'number') continue;
      const prog = program(l, p);
      if (!prog) { skipped.push(p.id); continue; }
      const cls = 'Q_' + p.id.replace(/-/g, '_');
      const path = join(dir, cls + '.txt');
      if (prog.file !== undefined) writeFileSync(path, prog.file + '\n');
      const src = [
        'import java.util.*;', 'import java.io.*;', `public class ${cls} {`,
        ...[...new Set([...shared, ...prog.decl.map((d) => d.trim())])].map(nest),
        '  public static void main(String[] args) throws Exception {', ...prog.body, '  }', '}',
      ].join('\n').replaceAll('@FILE', path);
      writeFileSync(join(dir, cls + '.java'), src);
      jobs.push({ p, cls });
    }
  }
  const failed: string[] = [];
  // compile each file on its own, so one broken snippet does not hide the others
  for (const j of jobs) {
    const c = spawnSync('javac', ['-nowarn', '-d', dir, join(dir, j.cls + '.java')], { encoding: 'utf8', env });
    if (c.status !== 0) { failed.push(`${j.p.id}: does not compile\n${c.stderr.split('\n').slice(0, 6).join('\n')}`); continue; }
    let out = '';
    try { out = execFileSync('java', ['-cp', dir, j.cls], { encoding: 'utf8', timeout: 10000, env, stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { failed.push(`${j.p.id}: crashed: ${String(e).slice(0, 200)}`); continue; }
    if (!(j.p.answer as string[]).map(normalizeCalc).includes(normalizeCalc(out))) failed.push(`${j.p.id}: Java printed ${JSON.stringify(out.trim())}, the key says ${JSON.stringify(j.p.answer)}`);
  }
  rmSync(dir, { recursive: true, force: true });
  console.log(`Java verified ${jobs.length - failed.length} of ${jobs.length} typed-answer CSA problems.${skipped.length ? ` No program yet for: ${skipped.join(', ')}.` : ''}`);
  if (failed.length) console.log(failed.join('\n\n'));
  if (failed.length || skipped.length) process.exitCode = 1;
}
main();

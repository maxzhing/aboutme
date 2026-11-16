import type { CalcLesson, CalcProblem, LessonTutor } from '../calc/types';

const r = String.raw;
const P = (id: string, level: 1 | 2 | 3, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, hint, solution, ...extra });
const idiv = (a: number, b: number) => Math.trunc(a / b);

/** AP CSA Unit 2 · Selection and Iteration. Original lessons and problems. */
export const CSA2: CalcLesson[] = [
  {
    id: 'cs2-1', unit: 2, n: 1, title: 'Boolean expressions and if statements',
    intro: 'Programs become interesting when they can make decisions. A Boolean expression asks a yes-or-no question, and an if statement runs code only when the answer is yes. Today you learn relational operators, if-else, and else-if chains, and how to trace them exactly.',
    goals: ['Write Boolean expressions with relational operators', 'Trace if and if-else statements', 'Trace else-if chains and nested ifs', 'Tell a chain of separate ifs from an else-if chain'],
    notes: [
      { k: 'list', items: [r`Relational operators: ⟦==⟧ ⟦!=⟧ ⟦<⟧ ⟦<=⟧ ⟦>⟧ ⟦>=⟧. They produce a boolean.`, r`⟦x % 2 == 0⟧ is true when ⟦x⟧ is even.`, r`A boolean expression can be stored: ⟦boolean big = n > 100;⟧.`] },
      { k: 'p', t: r`⟦if (condition) { … }⟧ runs the block only when the condition is true. ⟦if … else …⟧ runs exactly one of two blocks.` },
      { k: 'rule', title: 'else-if chains', t: r`In ⟦if … else if … else …⟧, the conditions are checked top to bottom and **only the first true branch runs**; the rest are skipped. Order matters.` },
      { k: 'warn', t: r`Several separate ⟦if⟧ statements are all checked, one after another, and each can change variables that later ones test. That behaves very differently from an else-if chain.` },
      { k: 'tip', t: r`Without braces, an ⟦if⟧ controls only the single next statement. Indentation does not change that, so trace by the braces, not the spacing.` },
    ],
    examples: [
      { q: r`What is printed?
~~~
int score = 85;
String grade;
if (score >= 90) grade = "A";
else if (score >= 80) grade = "B";
else if (score >= 70) grade = "C";
else grade = "F";
System.out.println(grade);
~~~`, steps: [r`85 ≥ 90 is false, so move on.`, r`85 ≥ 80 is true: ⟦grade⟧ is "B", and the rest of the chain is skipped. Prints ⟦B⟧.`], a: 'B' },
      { q: r`What is printed?
~~~
int n = 15;
if (n > 10) n -= 5;
if (n > 5) n -= 5;
if (n > 0) n -= 5;
System.out.println(n);
~~~`, steps: [r`Three separate ifs, each checked in turn: 15 > 10, so n becomes 10.`, r`10 > 5, so n becomes 5; then 5 > 0, so n becomes 0. Prints ⟦0⟧.`], a: '0' },
    ],
    practice: [
      P('cs2-1-1', 1, r`What is printed?
~~~
int x = 7;
if (x > 5) x = x * 2;
else x = x + 1;
System.out.println(x);
~~~`, ['14'], 'Is the condition true?', [r`7 > 5 is true, so ⟦x⟧ becomes 14 and the else is skipped.`], { check: () => (7 > 5 ? 7 * 2 : 7 + 1) === 14 }),
      P('cs2-1-2', 1, r`What is printed by ⟦System.out.println(10 % 3 == 1);⟧?`, ['true'], 'Evaluate 10 % 3 first.', [r`10 % 3 is 1, and 1 == 1 is true.`], { check: () => 10 % 3 === 1 }),
      P('cs2-1-3', 2, r`What is printed?
~~~
int t = 27;
String s;
if (t > 30) s = "hot";
else if (t > 20) s = "warm";
else if (t > 25) s = "nice";
else s = "cool";
System.out.println(s);
~~~`, ['warm'], 'Only the first true branch runs.', [r`27 > 30 is false; 27 > 20 is true, so ⟦s⟧ is "warm". The "nice" branch is never reached.`], { check: () => { const t = 27; const s = t > 30 ? 'hot' : t > 20 ? 'warm' : t > 25 ? 'nice' : 'cool'; return s === 'warm'; } }),
      P('cs2-1-4', 2, r`What is printed?
~~~
int a = 3, b = 5, c = 4;
if (a > b) {
  if (a > c) System.out.println(a);
  else System.out.println(c);
} else {
  System.out.println(b);
}
~~~`, ['5'], 'Check the outer condition first.', [r`⟦a > b⟧ is 3 > 5, false, so the outer else runs and prints 5.`], { check: () => { const a = 3, b = 5, c = 4; return (a > b ? (a > c ? a : c) : b) === 5; } }),
      P('cs2-1-5', 2, r`What is printed?
~~~
int n = 15;
if (n > 10) n -= 5;
else if (n > 5) n -= 5;
else if (n > 0) n -= 5;
System.out.println(n);
~~~`, ['10'], 'Compare with the version that uses three separate ifs.', [r`15 > 10 is true, so n becomes 10, and the rest of the chain is skipped.`], { check: () => { let n = 15; if (n > 10) n -= 5; else if (n > 5) n -= 5; else if (n > 0) n -= 5; return n === 10; } }),
      P('cs2-1-6', 3, r`What is printed?
~~~
int x = 4;
if (x > 5)
  x = x + 10;
  x = x * 3;
System.out.println(x);
~~~`, ['12'], 'Without braces, the if controls only one statement.', [r`The if controls only ⟦x = x + 10;⟧, which is skipped because 4 > 5 is false.`, r`⟦x = x * 3;⟧ always runs despite the indentation: 4 × 3 = 12.`], { check: () => { let x = 4; if (x > 5) x = x + 10; x = x * 3; return x === 12; } }),
    ],
    remember: ['Relational operators give booleans.', 'else-if: only the first true branch runs.', 'Separate ifs are all checked; braces, not indentation, decide what an if controls.'],
    checkIn: 'Next: combining conditions with &&, || and !, and simplifying them with De Morgan’s laws.',
  },
  {
    id: 'cs2-2', unit: 2, n: 2, title: 'Compound Boolean expressions and De Morgan’s laws',
    intro: 'Real decisions combine conditions: “if it is a weekday AND before 9 am”. Java joins conditions with && (and), || (or) and ! (not). Today you learn the rules, short-circuit evaluation, and De Morgan’s laws, which let you rewrite any condition into an equivalent one.',
    goals: ['Evaluate expressions with &&, || and !', 'Apply operator precedence: ! then && then ||', 'Use short-circuit evaluation to avoid errors', 'Write equivalent expressions with De Morgan’s laws'],
    notes: [
      { k: 'list', items: [r`⟦a && b⟧ is true only if both are true.`, r`⟦a || b⟧ is true if at least one is true.`, r`⟦!a⟧ flips true and false.`, r`Precedence: ⟦!⟧ first, then ⟦&&⟧, then ⟦||⟧.`] },
      { k: 'rule', title: 'Short-circuit evaluation', t: r`Java stops as soon as the answer is known: in ⟦a && b⟧, if ⟦a⟧ is false, ⟦b⟧ is never evaluated; in ⟦a || b⟧, if ⟦a⟧ is true, ⟦b⟧ is skipped. ⟦count != 0 && total / count > 2⟧ can never divide by zero.` },
      { k: 'formula', t: r`!(a \;\&\&\; b) \equiv\ !a \;||\; !b \qquad !(a \;||\; b) \equiv\ !a \;\&\&\; !b` },
      { k: 'p', t: r`De Morgan’s laws: to push a ⟦!⟧ inside parentheses, negate each part and swap ⟦&&⟧ with ⟦||⟧. Negating a comparison flips it: the opposite of ⟦x >= 5⟧ is ⟦x < 5⟧ (not ⟦x <= 5⟧).` },
      { k: 'warn', t: r`For objects, ⟦==⟧ tests whether two references refer to the same object (aliases); ⟦equals⟧ tests whether their contents match.` },
    ],
    examples: [
      { q: r`Rewrite ⟦!(x >= 5 && y < 3)⟧ without the outer ⟦!⟧.`, steps: [r`Negate each part: ⟦!(x >= 5)⟧ is ⟦x < 5⟧ and ⟦!(y < 3)⟧ is ⟦y >= 3⟧.`, r`Swap ⟦&&⟧ for ⟦||⟧: ⟦x < 5 || y >= 3⟧.`], a: 'x < 5 || y >= 3' },
      { q: r`⟦int count = 0;⟧ Is ⟦count != 0 && 10 / count > 2⟧ safe to evaluate?`, steps: [r`⟦count != 0⟧ is false.`, r`Short-circuit: the division is never evaluated, so there is no division by zero; the result is false.`], a: 'yes, it is false' },
    ],
    practice: [
      P('cs2-2-1', 1, r`⟦int x = 10;⟧ What is the value of ⟦(x > 0) && (x < 10)⟧?`, ['false'], 'Both parts must be true.', [r`⟦x < 10⟧ is false when x is 10, so the whole expression is false.`], { check: () => (10 > 0 && 10 < 10) === false }),
      P('cs2-2-2', 2, r`Which expression is equivalent to ⟦!(a || b)⟧?`, 1, 'Negate each part and swap the operator.', [r`De Morgan: ⟦!(a || b)⟧ is ⟦!a && !b⟧.`], { choices: [r`⟦!a || !b⟧`, r`⟦!a && !b⟧`, r`⟦a && b⟧`, r`⟦!a || b⟧`] }),
      P('cs2-2-3', 2, r`What is printed?
~~~
int count = 0;
if (count != 0 && 10 / count > 2) System.out.println("big");
else System.out.println("safe");
~~~`, ['safe'], 'Does the division ever run?', [r`⟦count != 0⟧ is false, so && short-circuits and the division is skipped. The condition is false: "safe".`], { check: () => { const count = 0; const ok = count !== 0 && 10 / count > 2; return ok === false; } }),
      P('cs2-2-4', 2, r`⟦boolean p = true, q = false;⟧ What is printed by ⟦System.out.println(p || q && !p);⟧?`, ['true'], '&& is evaluated before ||.', [r`First ⟦q && !p⟧ is false && false = false.`, r`Then ⟦p || false⟧ is true.`], { check: () => { const p = true, q = false; return (p || (q && !p)) === true; } }),
      P('cs2-2-5', 3, r`Which expression is equivalent to ⟦!(x >= 5 && y < 3)⟧?`, 3, 'The opposite of >= is <, and the opposite of < is >=.', [r`Negate each comparison and swap && for ||: ⟦x < 5 || y >= 3⟧.`], { choices: [r`⟦x <= 5 || y > 3⟧`, r`⟦x < 5 && y >= 3⟧`, r`⟦x > 5 || y <= 3⟧`, r`⟦x < 5 || y >= 3⟧`] }),
      P('cs2-2-6', 3, r`What is printed?
~~~
String s1 = new String("hi");
String s2 = s1;
String s3 = new String("hi");
System.out.println((s1 == s2) + " " + (s1 == s3));
~~~`, ['true false'], '== asks: same object?', [r`⟦s2⟧ refers to the same object as ⟦s1⟧, so ⟦s1 == s2⟧ is true.`, r`⟦s3⟧ is a separate object, so ⟦s1 == s3⟧ is false even though the contents match.`], { check: () => { const o1 = { v: 'hi' }; const o2 = o1; const o3 = { v: 'hi' }; return `${o1 === o2} ${o1 === o3}` === 'true false'; } }),
    ],
    remember: ['&& needs both; || needs one; ! flips.', 'Precedence: !, then &&, then ||; short-circuit skips the rest.', 'De Morgan: negate each part and swap && ↔ ||.'],
    checkIn: 'Next: loops, so programs can repeat work.',
  },
  {
    id: 'cs2-3', unit: 2, n: 3, title: 'while loops and for loops',
    intro: 'Loops let a program repeat steps without rewriting them. A while loop repeats while a condition stays true; a for loop packages a counter, a condition and an update into one line. Today you learn to trace loops exactly, count their iterations and spot infinite loops.',
    goals: ['Trace while loops and for loops', 'Count how many times a loop body runs', 'Identify infinite loops and off-by-one errors', 'Choose between while and for'],
    notes: [
      { k: 'p', t: r`⟦while (condition) { body }⟧ checks the condition before each pass. If it is false at the start, the body never runs.` },
      { k: 'rule', title: 'for loop', t: r`⟦for (initialize; condition; update) { body }⟧: initialize once, then repeat (check condition → run body → update).` },
      { k: 'formula', t: r`\text{iterations of } \texttt{for (int i = a; i < b; i++)} = b - a \qquad \text{with } i \le b:\ b - a + 1` },
      { k: 'warn', t: r`If nothing in the body moves the loop toward ending (for example, the counter is never changed), the loop runs forever: an infinite loop.` },
      { k: 'tip', t: r`Use a trace table: one column per variable, one row per iteration. Write the values after each pass, and note the value that makes the condition false.` },
      { k: 'p', t: r`Use ⟦for⟧ when you know how many times to repeat; use ⟦while⟧ when you repeat until something happens (like reading input until it runs out).` },
    ],
    examples: [
      { q: r`What is printed?
~~~
int sum = 0;
for (int i = 1; i <= 5; i++) sum += i;
System.out.println(sum);
~~~`, steps: [r`i takes 1, 2, 3, 4, 5; sum becomes 1, 3, 6, 10, 15.`, r`When i is 6 the condition fails. Prints ⟦15⟧.`], a: '15' },
      { q: r`What is printed?
~~~
int n = 1;
while (n < 50) n *= 3;
System.out.println(n);
~~~`, steps: [r`n goes 1 → 3 → 9 → 27 → 81.`, r`At 81 the condition ⟦n < 50⟧ is false, so the loop stops. Prints ⟦81⟧.`], a: '81' },
    ],
    practice: [
      P('cs2-3-1', 1, r`What is printed?
~~~
int sum = 0;
for (int i = 1; i <= 5; i++) sum += i;
System.out.println(sum);
~~~`, ['15'], 'Add 1 through 5.', [r`1 + 2 + 3 + 4 + 5 = 15.`], { check: () => { let s = 0; for (let i = 1; i <= 5; i++) s += i; return s === 15; } }),
      P('cs2-3-2', 1, r`How many times does the body of ⟦for (int i = 0; i < 10; i += 2)⟧ run?`, ['5'], 'List the values of i.', [r`i is 0, 2, 4, 6, 8: five times.`], { check: () => { let c = 0; for (let i = 0; i < 10; i += 2) c++; return c === 5; } }),
      P('cs2-3-3', 2, r`What is printed?
~~~
int k = 10;
while (k > 0) {
  k -= 3;
}
System.out.println(k);
~~~`, ['-2'], 'Keep going until the condition fails.', [r`k: 10 → 7 → 4 → 1 → −2. At −2, ⟦k > 0⟧ is false.`], { check: () => { let k = 10; while (k > 0) k -= 3; return k === -2; } }),
      P('cs2-3-4', 2, r`What is printed?
~~~
int n = 1;
while (n < 50) n *= 3;
System.out.println(n);
~~~`, ['81'], 'Multiply until the condition fails.', [r`1, 3, 9, 27, 81. 81 is the first value not less than 50.`], { check: () => { let n = 1; while (n < 50) n *= 3; return n === 81; } }),
      P('cs2-3-5', 2, r`What happens when this code runs?
~~~
int i = 0;
while (i < 5) {
  System.out.print(i);
}
~~~`, 2, 'Does anything change i?', [r`⟦i⟧ never changes, so ⟦i < 5⟧ is always true: an infinite loop printing 0 forever.`], { choices: ['It prints 01234', 'It prints 0', 'It prints 0 over and over without stopping', 'It does not compile'] }),
      P('cs2-3-6', 3, r`What is printed?
~~~
int count = 0;
for (int i = 5; i >= -5; i -= 2) count++;
System.out.println(count);
~~~`, ['6'], 'List the values of i until the condition fails.', [r`i: 5, 3, 1, −1, −3, −5 (then −7 fails): 6 iterations.`], { check: () => { let c = 0; for (let i = 5; i >= -5; i -= 2) c++; return c === 6; } }),
    ],
    remember: ['while checks first; the body may run zero times.', 'for: initialize → (check → body → update) repeated.', 'Count iterations by listing the counter values.'],
    checkIn: 'Next: the standard algorithms built from loops, including String traversals.',
  },
  {
    id: 'cs2-4', unit: 2, n: 4, title: 'Loop algorithms and String traversal',
    intro: 'A handful of loop patterns solve most problems: accumulate a sum, count matches, find a maximum, pull apart the digits of a number, and walk through a String one character at a time. Learn these patterns and you can write most AP free-response loops.',
    goals: ['Write accumulator and counter loops', 'Extract digits with % 10 and / 10', 'Traverse a String with substring', 'Build a new String in a loop (reverse, filter)'],
    notes: [
      { k: 'list', items: [r`**Accumulate:** start ⟦sum = 0⟧, add each value.`, r`**Count:** start ⟦count = 0⟧, add 1 when a condition holds.`, r`**Max/min:** start with the first value, update when a bigger/smaller one appears.`] },
      { k: 'p', t: r`Digits of a positive int: ⟦n % 10⟧ is the last digit and ⟦n / 10⟧ removes it. Loop ⟦while (n > 0)⟧ to visit every digit.` },
      { k: 'rule', title: 'String traversal', t: r`⟦for (int i = 0; i < s.length(); i++)⟧ visits indexes 0 to length − 1. The character at ⟦i⟧ as a String is ⟦s.substring(i, i + 1)⟧.` },
      { k: 'p', t: r`Reverse a String by adding each character to the front: ⟦rev = s.substring(i, i + 1) + rev;⟧.` },
      { k: 'warn', t: r`Using ⟦i <= s.length()⟧ makes ⟦substring(i, i + 1)⟧ go past the end and throws a StringIndexOutOfBoundsException.` },
    ],
    examples: [
      { q: r`What is the sum of the digits found by this loop when ⟦n⟧ starts at 4721?
~~~
int sum = 0;
while (n > 0) {
  sum += n % 10;
  n /= 10;
}
~~~`, steps: [r`Last digits: 1, then 2, then 7, then 4 (n becomes 472, 47, 4, 0).`, r`1 + 2 + 7 + 4 = 14.`], a: '14' },
      { q: r`What does this return for ⟦s = "loop"⟧?
~~~
String rev = "";
for (int i = 0; i < s.length(); i++) rev = s.substring(i, i + 1) + rev;
return rev;
~~~`, steps: [r`Each character goes in front: "l", "ol", "ool", "pool".`, r`Returns "pool".`], a: 'pool' },
    ],
    practice: [
      P('cs2-4-1', 1, r`Using the digit-sum loop, what is the sum of the digits of 4721?`, ['14'], '% 10 gives the last digit; / 10 removes it.', [r`1 + 2 + 7 + 4 = 14.`], { check: () => { let n = 4721, s = 0; while (n > 0) { s += n % 10; n = idiv(n, 10); } return s === 14; } }),
      P('cs2-4-2', 1, r`What is printed?
~~~
String s = "banana";
int count = 0;
for (int i = 0; i < s.length(); i++)
  if (s.substring(i, i + 1).equals("a")) count++;
System.out.println(count);
~~~`, ['3'], 'Count the a’s.', [r`b-a-n-a-n-a has three a’s.`], { check: () => [...'banana'].filter((c) => c === 'a').length === 3 }),
      P('cs2-4-3', 1, r`Using the reversal loop, what is returned for ⟦s = "loop"⟧?`, ['pool'], 'Each character is added to the front.', [r`l → ol → ool → pool.`], { check: () => { let rev = ''; for (const ch of 'loop') rev = ch + rev; return rev === 'pool'; } }),
      P('cs2-4-4', 2, r`What is printed?
~~~
int count = 0;
for (int i = 1; i <= 20; i++)
  if (i % 3 == 0) count++;
System.out.println(count);
~~~`, ['6'], 'Multiples of 3 up to 20.', [r`3, 6, 9, 12, 15, 18: six numbers.`], { check: () => { let c = 0; for (let i = 1; i <= 20; i++) if (i % 3 === 0) c++; return c === 6; } }),
      P('cs2-4-5', 2, r`What does ⟦find("level")⟧ return?
~~~
public static int find(String s) {
  for (int i = 0; i < s.length(); i++)
    if (s.substring(i, i + 1).equals("e")) return i;
  return -1;
}
~~~`, ['1'], 'A return inside the loop ends the method immediately.', [r`l0 e1: the first "e" is at index 1, and the method returns right away.`], { check: () => 'level'.indexOf('e') === 1 }),
      P('cs2-4-6', 3, r`What is printed?
~~~
String s = "computer";
String result = "";
for (int i = 0; i < s.length(); i += 2)
  result += s.substring(i, i + 1);
System.out.println(result);
~~~`, ['cmue'], 'i takes the values 0, 2, 4, 6.', [r`Indexes 0, 2, 4, 6 hold c, m, u, e.`, r`Result: "cmue".`], { check: () => { let res = ''; const s = 'computer'; for (let i = 0; i < s.length; i += 2) res += s.substring(i, i + 1); return res === 'cmue'; } }),
    ],
    remember: ['Accumulate, count, max/min: initialize before the loop.', 'n % 10 and n / 10 peel off digits.', 'Traverse Strings with i < s.length() and substring(i, i + 1).'],
    checkIn: 'Next: loops inside loops, and counting how much work a program does.',
  },
  {
    id: 'cs2-5', unit: 2, n: 5, title: 'Nested loops and informal run-time analysis',
    intro: 'A loop inside a loop runs its inner body many times: once for every combination of the two counters. Nested loops print patterns and process grids, and counting how many times a statement runs gives a first sense of how fast an algorithm is.',
    goals: ['Trace nested loops', 'Count how many times an inner statement executes', 'Predict printed patterns', 'Compare the amount of work done by different loops'],
    notes: [
      { k: 'p', t: r`For each single pass of the outer loop, the inner loop runs all of its iterations from the start.` },
      { k: 'formula', t: r`\text{outer } n \text{ times, inner } m \text{ times} \Rightarrow n \times m \text{ executions}` },
      { k: 'p', t: r`If the inner loop depends on the outer counter (like ⟦j <= i⟧), add the inner counts row by row: 1 + 2 + 3 + … + n = $\frac{n(n+1)}{2}$.` },
      { k: 'rule', title: 'Informal run-time', t: r`Run-time analysis counts how many times key statements execute as the input size grows. A single loop over n items does about n steps; two nested loops over n items do about $n^2$.` },
      { k: 'tip', t: r`To predict printed output, write the outer counter’s value, then everything the inner loop prints for it, row by row.` },
    ],
    examples: [
      { q: r`How many times is ⟦count++⟧ executed?
~~~
for (int i = 1; i <= 4; i++)
  for (int j = 1; j <= i; j++)
    count++;
~~~`, steps: [r`Inner runs i times: 1, 2, 3, 4.`, r`1 + 2 + 3 + 4 = 10.`], a: '10' },
      { q: r`What is printed?
~~~
for (int r = 1; r <= 3; r++)
  for (int c = 1; c <= r; c++)
    System.out.print(r);
~~~`, steps: [r`r = 1 prints "1"; r = 2 prints "22"; r = 3 prints "333".`, r`All on one line: ⟦122333⟧.`], a: '122333' },
    ],
    practice: [
      P('cs2-5-1', 1, r`How many times does ⟦count++⟧ run?
~~~
for (int i = 0; i < 3; i++)
  for (int j = 0; j < 4; j++)
    count++;
~~~`, ['12'], 'Outer × inner.', [r`3 × 4 = 12.`], { check: () => { let c = 0; for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) c++; return c === 12; } }),
      P('cs2-5-2', 2, r`How many times does ⟦count++⟧ run?
~~~
for (int i = 1; i <= 4; i++)
  for (int j = 1; j <= i; j++)
    count++;
~~~`, ['10'], 'The inner loop runs i times.', [r`1 + 2 + 3 + 4 = 10.`], { check: () => { let c = 0; for (let i = 1; i <= 4; i++) for (let j = 1; j <= i; j++) c++; return c === 10; } }),
      P('cs2-5-3', 2, r`What is printed?
~~~
for (int r = 1; r <= 3; r++)
  for (int c = 1; c <= r; c++)
    System.out.print(r);
~~~`, ['122333'], 'Row r prints r, r times.', [r`"1" + "22" + "333" = 122333.`], { check: () => { let out = ''; for (let r0 = 1; r0 <= 3; r0++) for (let c = 1; c <= r0; c++) out += r0; return out === '122333'; } }),
      P('cs2-5-4', 1, r`Two nested loops each run from 0 to n − 1. About how many times does the inner statement run?`, 2, 'n passes, each doing n steps.', [r`n × n = $n^2$ times.`], { choices: [r`$n$`, r`$2n$`, r`$n^2$`, r`$n + 2$`] }),
      P('cs2-5-5', 2, r`How many times does ⟦count++⟧ run?
~~~
for (int i = 0; i < 5; i++)
  for (int j = i; j < 5; j++)
    count++;
~~~`, ['15'], 'The inner loop starts at i.', [r`Inner counts: 5, 4, 3, 2, 1. Total 15.`], { check: () => { let c = 0; for (let i = 0; i < 5; i++) for (let j = i; j < 5; j++) c++; return c === 15; } }),
      P('cs2-5-6', 3, r`What is printed?
~~~
int total = 0;
for (int i = 1; i <= 3; i++)
  for (int j = 1; j <= 3; j++)
    if (i != j) total += i * j;
System.out.println(total);
~~~`, ['22'], 'All pairs minus the pairs where i equals j.', [r`All 9 products sum to $(1 + 2 + 3)^2 = 36$.`, r`The diagonal (1, 4, 9) sums to 14, so 36 − 14 = 22.`], { check: () => { let t = 0; for (let i = 1; i <= 3; i++) for (let j = 1; j <= 3; j++) if (i !== j) t += i * j; return t === 22; } }),
    ],
    remember: ['The inner loop restarts for every outer pass.', 'Independent loops: multiply; dependent loops: add row by row.', 'Nested loops over n items do about n² work.'],
    checkIn: 'Unit 2 complete. Take the review; Unit 3 teaches you to write your own classes.',
  },
];

/** Tutor layer for Unit 2. */
export const CSA2_TUTOR: Record<string, LessonTutor> = {
  'cs2-1': {
    bigIdea: [
      r`Every app you use makes decisions constantly: if the password is right, log in; otherwise, show an error. In Java, a decision starts with a Boolean expression: a question whose answer is only true or false, like ⟦age >= 13⟧.`,
      r`An ⟦if⟧ statement runs some code only when its condition is true. ⟦if-else⟧ chooses between two paths, and an ⟦else if⟧ chain chooses among many, checking the conditions from top to bottom and stopping at the first one that is true.`,
      r`The biggest trap is confusing an else-if chain (pick ONE branch) with a list of separate ifs (check EVERY one, in order, each possibly changing the variables for the next).`,
    ],
    picture: { title: 'A choose-your-path sign', t: r`An else-if chain is like a road with exits: “Exit 1 if you are going north, otherwise Exit 2 if east, otherwise keep going.” You take the first exit that fits and never see the later ones. Separate ifs are a row of checkpoints: you stop at every one.` },
    words: [
      { term: 'Boolean expression', means: 'An expression whose value is true or false.' },
      { term: 'Relational operator', means: r`⟦==⟧, ⟦!=⟧, ⟦<⟧, ⟦<=⟧, ⟦>⟧, ⟦>=⟧: they compare two values.` },
      { term: 'Branch', means: 'One of the possible paths in an if statement.' },
      { term: 'else-if chain', means: 'A sequence of conditions where only the first true branch runs.' },
      { term: 'Nested if', means: 'An if statement inside another if or else block.' },
    ],
    tools: [
      { name: 'Remainder operator', refresher: r`⟦n % 2 == 0⟧ tests for even numbers.`, lesson: 'cs1-2' },
      { name: 'Assignment and tracing', refresher: 'Track each variable’s value line by line.', lesson: 'cs1-1' },
    ],
    why: [
      [r`The chain checks conditions in order; 85 fails the first test.`, r`Once a branch is true, the remaining else-ifs are skipped entirely, so only one grade is assigned.`],
      [r`These are separate if statements, so each one is checked no matter what happened before.`, r`Each if sees the value changed by the previous one, so n keeps dropping.`],
    ],
    walk: {
      'cs2-1-1': [r`Check the condition: 7 > 5 is true.`, r`The if branch runs: ⟦x = 7 * 2⟧ = 14. The else is skipped.`, r`Printed: 14.`],
      'cs2-1-2': [r`Arithmetic before comparison: ⟦10 % 3⟧ is 1.`, r`Then ⟦1 == 1⟧ is true.`, r`println shows ⟦true⟧.`],
      'cs2-1-3': [r`27 > 30? No.`, r`27 > 20? Yes: s = "warm", and the chain stops.`, r`The "nice" branch is unreachable for 27 because the earlier branch already caught it. Printed: warm.`],
      'cs2-1-4': [r`Outer condition: ⟦a > b⟧ is 3 > 5, false.`, r`Skip the whole inner if; go to the outer else.`, r`Print b: 5.`],
      'cs2-1-5': [r`This time it is an else-if chain.`, r`15 > 10 is true: n becomes 10, and the remaining branches are skipped.`, r`Printed: 10 (compare with 0 for three separate ifs).`],
      'cs2-1-6': [r`Without braces, the if controls only the next single statement: ⟦x = x + 10;⟧.`, r`4 > 5 is false, so that statement is skipped.`, r`⟦x = x * 3;⟧ is NOT part of the if, so it runs: 12.`],
    },
    teach: {
      plan: [r`Ask yes/no questions about the room to introduce Boolean expressions.`, r`Show if and if-else with a simple temperature example.`, r`Act out an else-if chain as highway exits.`, r`Compare an else-if chain with separate ifs on the same input.`, r`Show the missing-braces trap.`],
      questions: [
        { q: 'Why does the order of else-if conditions matter?', a: 'Only the first true branch runs. If a broad condition comes first, it catches cases meant for later, narrower branches.' },
        { q: r`What is the difference between ⟦=⟧ and ⟦==⟧?`, a: r`⟦=⟧ assigns a value; ⟦==⟧ compares two values and gives true or false.` },
        { q: 'Do I always need braces?', a: 'Not if the if controls one statement, but using braces always prevents the indentation trap.' },
      ],
      keyPoints: ['Conditions are boolean expressions.', 'if-else runs exactly one of two blocks.', 'else-if chains run only the first true branch.', 'Separate ifs are all checked; braces define the body.'],
    },
  },
  'cs2-2': {
    bigIdea: [
      r`Many decisions need more than one condition. “You can go to the park if your homework is done AND it is not raining.” Java has three logical operators: ⟦&&⟧ (and), ⟦||⟧ (or) and ⟦!⟧ (not).`,
      r`Java is efficient: it stops evaluating as soon as it knows the answer. If the left side of ⟦&&⟧ is false, the whole thing must be false, so the right side is skipped. Programmers use this to guard against errors, like checking ⟦count != 0⟧ before dividing by count.`,
      r`De Morgan’s laws tell you how to flip a whole condition: “not (A and B)” is the same as “(not A) or (not B)”. They let you rewrite conditions in the form that is easiest to read, and the exam tests them constantly.`,
    ],
    picture: { title: 'Two light switches', t: r`Wire two switches in a row (series): the light is on only if both are on, that is ⟦&&⟧. Wire them side by side (parallel): the light is on if either is on, that is ⟦||⟧. If the first switch in series is off, you already know the light is off without checking the second: short-circuiting.` },
    words: [
      { term: r`⟦&&⟧ (and)`, means: 'True only when both sides are true.' },
      { term: r`⟦||⟧ (or)`, means: 'True when at least one side is true.' },
      { term: r`⟦!⟧ (not)`, means: 'Reverses a boolean value.' },
      { term: 'Short-circuit evaluation', means: 'Stopping as soon as the result is known, skipping the right side.' },
      { term: 'De Morgan’s laws', means: r`⟦!(a && b)⟧ = ⟦!a || !b⟧ and ⟦!(a || b)⟧ = ⟦!a && !b⟧.` },
    ],
    tools: [
      { name: 'If statements', refresher: 'Compound conditions go inside if statements.', lesson: 'cs2-1' },
      { name: 'References and ==', refresher: r`For objects, ⟦==⟧ compares references, ⟦equals⟧ compares contents.`, lesson: 'cs1-4' },
    ],
    why: [
      [r`De Morgan says each part gets negated; the opposite of “at least 5” is “less than 5”, and the opposite of “less than 3” is “at least 3”.`, r`Negating an && turns it into an ||.`],
      [r`The left side decides: false && anything is false.`, r`Because Java never evaluates the right side, the division by zero never happens.`],
    ],
    walk: {
      'cs2-2-1': [r`Left part: 10 > 0 is true.`, r`Right part: 10 < 10 is false.`, r`true && false = false.`],
      'cs2-2-2': [r`De Morgan: push the ! inside and swap the operator.`, r`⟦!(a || b)⟧ becomes ⟦!a && !b⟧.`, r`Choice B. (A is the rule for ⟦!(a && b)⟧ instead.)`],
      'cs2-2-3': [r`⟦count != 0⟧ is false because count is 0.`, r`&& short-circuits: ⟦10 / count⟧ is never computed, so no crash.`, r`The condition is false, so the else prints "safe".`],
      'cs2-2-4': [r`Precedence: ⟦!⟧ first, then ⟦&&⟧, then ⟦||⟧. So it is ⟦p || (q && !p)⟧.`, r`⟦q && !p⟧ is false && false = false.`, r`⟦true || false⟧ = true.`],
      'cs2-2-5': [r`Negate each comparison: ⟦!(x >= 5)⟧ is ⟦x < 5⟧; ⟦!(y < 3)⟧ is ⟦y >= 3⟧.`, r`Swap && for ||.`, r`⟦x < 5 || y >= 3⟧: choice D.`],
      'cs2-2-6': [r`⟦s2 = s1⟧ copies the reference: both point to the same object, so ⟦s1 == s2⟧ is true.`, r`⟦s3⟧ was created with new, so it is a different object: ⟦s1 == s3⟧ is false.`, r`Printed: ⟦true false⟧.`],
    },
    teach: {
      plan: [r`Use the two-switch picture for && and ||.`, r`Make truth tables for &&, || and !.`, r`Show precedence with ⟦p || q && !p⟧.`, r`Demonstrate short-circuiting with the division-by-zero guard.`, r`Practice De Morgan with three examples.`],
      questions: [
        { q: r`Why is the opposite of ⟦x >= 5⟧ not ⟦x <= 5⟧?`, a: r`Because 5 itself satisfies both. The exact opposite of “at least 5” is “less than 5”: ⟦x < 5⟧.` },
        { q: 'When does short-circuiting matter?', a: 'When the right side could crash or has side effects, such as dividing by a variable that might be 0 or calling a method on something that might be null.' },
        { q: 'How do I remember De Morgan?', a: '“Break the line, change the sign”: distribute the not to each part, and switch and/or.' },
      ],
      keyPoints: ['&& both, || at least one, ! flips.', 'Precedence: !, &&, ||.', 'Short-circuit can prevent errors.', 'De Morgan: negate parts, swap && and ||.'],
    },
  },
  'cs2-3': {
    bigIdea: [
      r`Imagine writing ⟦System.out.println⟧ a thousand times to print a thousand lines. Loops let you write the instruction once and repeat it. They are the engine behind almost every interesting program.`,
      r`A ⟦while⟧ loop keeps going as long as a condition is true, like “keep stirring while the sauce is lumpy”. A ⟦for⟧ loop is a counting loop: it sets up a counter, checks it, and updates it, all in one line, like “do 10 push-ups”.`,
      r`The skill the exam tests most is tracing: following a loop pass by pass and knowing exactly when it stops. And always ask: does something in the loop move it toward stopping? If not, it runs forever.`,
    ],
    picture: { title: 'Laps around a track', t: r`A for loop is like running laps: start at lap 1, check “have I done 5 laps?”, run a lap, add one to the counter, check again. A while loop is like running until the bell rings: you do not know in advance how many laps it will take.` },
    words: [
      { term: 'Loop / iteration', means: 'Repeating code; one pass through the loop body is an iteration.' },
      { term: 'Loop condition', means: 'The boolean expression checked before each iteration.' },
      { term: 'Loop control variable', means: r`The counter that changes each pass, like ⟦i⟧.` },
      { term: 'Infinite loop', means: 'A loop whose condition never becomes false.' },
      { term: 'Off-by-one error', means: r`A loop that runs one time too many or too few, often from ⟦<⟧ vs ⟦<=⟧.` },
    ],
    tools: [
      { name: 'Compound assignment', refresher: r`⟦sum += i⟧ and ⟦i++⟧ update variables inside loops.`, lesson: 'cs1-2' },
      { name: 'Boolean conditions', refresher: 'The loop runs while the condition is true.', lesson: 'cs2-1' },
    ],
    why: [
      [r`Listing each value of i and the running sum is a trace table in miniature.`, r`The loop ends when i becomes 6, which fails ⟦i <= 5⟧; the sum after the last pass is printed.`],
      [r`Each pass triples n; we keep going until n is no longer less than 50.`, r`81 is the first value that fails the condition, and it is what remains in n.`],
    ],
    walk: {
      'cs2-3-1': [r`i goes 1, 2, 3, 4, 5.`, r`sum: 1, 3, 6, 10, 15.`, r`When i = 6 the condition fails; prints 15.`],
      'cs2-3-2': [r`List the values of i: start 0, add 2 each time, stop before 10.`, r`0, 2, 4, 6, 8. Next would be 10, which fails ⟦i < 10⟧.`, r`Five iterations.`],
      'cs2-3-3': [r`k starts at 10; each pass subtracts 3.`, r`10 → 7 → 4 → 1 → −2. After reaching 1, the condition 1 > 0 is still true, so one more pass makes −2.`, r`−2 > 0 is false; prints −2.`],
      'cs2-3-4': [r`n: 1 → 3 → 9 → 27 → 81.`, r`27 < 50 is true, so 27 becomes 81.`, r`81 < 50 is false; prints 81.`],
      'cs2-3-5': [r`Look for anything in the body that changes i. Nothing does.`, r`So ⟦i < 5⟧ is true forever.`, r`It prints 0 again and again: an infinite loop (choice C).`],
      'cs2-3-6': [r`i starts at 5 and goes down by 2.`, r`5, 3, 1, −1, −3, −5 all satisfy ⟦i >= -5⟧; −7 does not.`, r`Six values, so count is 6.`],
    },
    teach: {
      plan: [r`Contrast “do 5 push-ups” (for) with “stir until smooth” (while).`, r`Label the three parts of a for loop header.`, r`Trace a loop with a table on the board.`, r`Show an infinite loop and ask how to fix it.`, r`Practice counting iterations by listing counter values.`],
      questions: [
        { q: 'Can a while loop run zero times?', a: 'Yes. The condition is checked first; if it is false at the start, the body never runs.' },
        { q: 'How do I count iterations quickly?', a: r`For ⟦i = a; i < b; i++⟧ it is b − a. Otherwise list the values the counter takes.` },
        { q: 'Which loop should I use?', a: 'for when you know the number of repetitions; while when you repeat until some condition changes.' },
      ],
      keyPoints: ['while: check, then run, repeat.', 'for: init; condition; update.', 'Trace with a table; know the stopping value.', 'Avoid infinite loops and off-by-one errors.'],
    },
  },
  'cs2-4': {
    bigIdea: [
      r`Most loops you will ever write follow a few patterns. Need a total? Start a variable at 0 and add as you go (accumulator). Need to know how many? Add 1 each time something matches (counter). Need the biggest? Remember the best so far and update when you find better.`,
      r`Numbers can be taken apart with the same tools: ⟦% 10⟧ gives the last digit and ⟦/ 10⟧ removes it. Repeat until nothing is left, and you have visited every digit.`,
      r`Strings are traversed the same way, index by index from 0 to ⟦length() - 1⟧, grabbing one character at a time with ⟦substring(i, i + 1)⟧. Build new Strings by adding characters to the end (copy) or to the front (reverse).`,
    ],
    picture: { title: 'Counting change in a jar', t: r`Pour coins from a jar one at a time. To find the total value, add each coin (accumulator). To count quarters, add 1 whenever you see a quarter (counter). To find the oldest coin, keep the oldest so far in your hand and swap when you see an older one (max).` },
    words: [
      { term: 'Accumulator', means: 'A variable that collects a running total.' },
      { term: 'Counter', means: 'A variable that counts how many times something happens.' },
      { term: 'Traversal', means: 'Visiting every element (character, digit, item) in order.' },
      { term: 'StringIndexOutOfBoundsException', means: 'The error from using an index outside 0 to length − 1.' },
    ],
    tools: [
      { name: 'while and for loops', refresher: 'The patterns live inside loops.', lesson: 'cs2-3' },
      { name: 'substring and length', refresher: r`⟦s.substring(i, i + 1)⟧ is the character at index ⟦i⟧.`, lesson: 'cs1-4' },
      { name: '% and integer division', refresher: r`⟦n % 10⟧ last digit; ⟦n / 10⟧ drops it.`, lesson: 'cs1-2' },
    ],
    why: [
      [r`% 10 isolates the last digit, and / 10 throws it away, so each pass handles one digit from the right.`, r`The loop ends when n reaches 0, after every digit has been added.`],
      [r`Putting each new character in front reverses the order.`, r`After the last character, rev holds the whole word backwards.`],
    ],
    walk: {
      'cs2-4-1': [r`4721 % 10 = 1, then n = 472.`, r`Then 2 (n = 47), 7 (n = 4), 4 (n = 0).`, r`1 + 2 + 7 + 4 = 14.`],
      'cs2-4-2': [r`Visit indexes 0 to 5 of "banana".`, r`The character is "a" at indexes 1, 3 and 5.`, r`count = 3.`],
      'cs2-4-3': [r`i = 0: rev = "l".`, r`i = 1: "o" + "l" = "ol"; i = 2: "ool"; i = 3: "pool".`, r`Returns "pool".`],
      'cs2-4-4': [r`Count i from 1 to 20 where i % 3 == 0.`, r`3, 6, 9, 12, 15, 18.`, r`count = 6.`],
      'cs2-4-5': [r`Check index 0: "l", not "e".`, r`Index 1: "e", so return 1 immediately.`, r`The later "e" at index 3 is never reached.`],
      'cs2-4-6': [r`i takes 0, 2, 4, 6 (8 fails i < 8).`, r`Characters: c (0), m (2), u (4), e (6).`, r`result = "cmue".`],
    },
    teach: {
      plan: [r`Use the coin jar to introduce accumulator, counter and max.`, r`Peel digits off 4721 together with % and /.`, r`Number the characters of a word and traverse it.`, r`Build "pool" from "loop" step by step.`, r`Show what goes wrong with ⟦i <= s.length()⟧.`],
      questions: [
        { q: 'Why initialize sum to 0 but max to the first value?', a: r`0 does not change a sum. But 0 could be bigger than every value (if all are negative), so the max should start with a real value.` },
        { q: r`Why ⟦substring(i, i + 1)⟧ and not ⟦substring(i)⟧?`, a: r`⟦substring(i)⟧ gives everything from i to the end; ⟦substring(i, i + 1)⟧ gives just one character.` },
        { q: 'Does return inside a loop stop the loop?', a: 'Yes. return ends the whole method immediately.' },
      ],
      keyPoints: ['Accumulator: start 0, add. Counter: start 0, add 1 on a match.', 'Max/min: start with a real value.', 'Digits: % 10 and / 10 in a while (n > 0) loop.', 'Strings: i from 0 to length() − 1, substring(i, i + 1).'],
    },
  },
  'cs2-5': {
    bigIdea: [
      r`Put one loop inside another and the inner loop runs completely for every single pass of the outer loop. Think of a clock: the minute hand goes all the way around for every one step of the hour hand.`,
      r`Nested loops build rows and columns: tables, grids, patterns of stars. Tracing them means: fix the outer counter, run the inner loop all the way, then move the outer counter forward and start the inner loop over.`,
      r`Counting how many times the innermost statement runs measures how much work the code does. If each loop runs n times, the total is n × n, which grows fast. That counting is called informal run-time analysis.`,
    ],
    picture: { title: 'An odometer', t: r`On a car’s odometer, the ones digit spins through 0–9 for every single tick of the tens digit. The ones digit is the inner loop; the tens digit is the outer loop. 10 tens × 10 ones = 100 readings.` },
    words: [
      { term: 'Nested loop', means: 'A loop inside the body of another loop.' },
      { term: 'Outer / inner loop', means: 'The containing loop / the loop inside it.' },
      { term: 'Statement execution count', means: 'How many times a statement runs; used to compare algorithms.' },
      { term: 'Run-time analysis', means: 'Estimating how the amount of work grows with the input size.' },
    ],
    tools: [
      { name: 'Loop tracing', refresher: 'List the values each counter takes.', lesson: 'cs2-3' },
      { name: 'Sums 1 + 2 + … + n', refresher: r`$1 + 2 + \cdots + n = \frac{n(n+1)}{2}$; for n = 4 it is 10.` },
    ],
    why: [
      [r`The inner loop’s limit is i, so it runs a different number of times on each outer pass.`, r`Adding the row counts gives the total.`],
      [r`For each value of r, the inner loop prints r exactly r times.`, r`print (not println) keeps everything on one line.`],
    ],
    walk: {
      'cs2-5-1': [r`The inner loop does not depend on i: 4 runs every time.`, r`The outer loop runs 3 times.`, r`3 × 4 = 12.`],
      'cs2-5-2': [r`Inner count for i = 1, 2, 3, 4 is 1, 2, 3, 4.`, r`Add them: 1 + 2 + 3 + 4.`, r`= 10.`],
      'cs2-5-3': [r`r = 1: print "1" once.`, r`r = 2: "22"; r = 3: "333".`, r`Together on one line: 122333.`],
      'cs2-5-4': [r`The outer loop runs n times.`, r`Each outer pass runs the inner loop n times.`, r`n × n = n²: choice C.`],
      'cs2-5-5': [r`j starts at i, so the inner loop runs 5 − i times.`, r`i = 0..4 gives 5, 4, 3, 2, 1.`, r`Total: 15.`],
      'cs2-5-6': [r`The sum of i × j over all 9 pairs is (1 + 2 + 3) × (1 + 2 + 3) = 36.`, r`Remove the pairs where i equals j: 1, 4, 9, which sum to 14.`, r`36 − 14 = 22.`],
    },
    teach: {
      plan: [r`Show an odometer or clock to explain inner vs outer loops.`, r`Trace a 3 × 4 nested loop with a table of (i, j) pairs.`, r`Print a triangle pattern and connect each row to the outer counter.`, r`Count executions for independent and dependent inner loops.`, r`Introduce n² growth with a quick table (n = 10, 100, 1000).`],
      questions: [
        { q: 'Does the inner loop remember where it stopped?', a: 'No. Each time the outer loop moves on, the inner loop starts over from its initialization.' },
        { q: 'How do I count executions when the inner limit changes?', a: 'Write the inner count for each outer value and add them up.' },
        { q: 'Why does n² matter?', a: 'Doubling n quadruples the work, so nested loops get slow quickly on large inputs.' },
      ],
      keyPoints: ['The inner loop runs fully for each outer pass.', 'Independent loops multiply; dependent loops add.', 'Trace row by row for printed patterns.', 'Nested loops over n items ≈ n² steps.'],
    },
  },
};

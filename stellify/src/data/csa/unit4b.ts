import type { CalcLesson, CalcProblem, LessonTutor } from '../calc/types';

const r = String.raw;
const P = (id: string, level: 1 | 2 | 3, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, hint, solution, ...extra });
const idiv = (a: number, b: number) => Math.trunc(a / b);
/** iterative binary search that counts how many elements are examined */
const bsearchSteps = (a: number[], t: number) => { let lo = 0, hi = a.length - 1, steps = 0; while (lo <= hi) { const mid = idiv(lo + hi, 2); steps++; if (a[mid] === t) return steps; if (a[mid] < t) lo = mid + 1; else hi = mid - 1; } return steps; };

/** AP CSA Unit 4 · Data Collections (lessons 5–7). Original lessons and problems. */
export const CSA4B: CalcLesson[] = [
  {
    id: 'cs4-5', unit: 4, n: 5, title: '2D arrays',
    intro: 'Many data sets are grids: seats in a theater, pixels in an image, a game board. A 2D array is an array of rows, each row an array. Today you create 2D arrays, access cells with two indexes, and traverse them row by row and column by column.',
    goals: ['Create and initialize 2D arrays', 'Access elements with [row][col] and use the two lengths', 'Traverse in row-major and column-major order', 'Apply standard algorithms (sum, count, max) to a whole grid, a row or a column'],
    notes: [
      { k: 'p', t: r`⟦int[][] g = new int[3][4];⟧ creates 3 rows of 4 columns, filled with 0. An initializer list writes each row in braces:
~~~
int[][] g = { {1, 2, 3},
              {4, 5, 6} };
~~~` },
      { k: 'rule', title: 'Indexes and sizes', t: r`⟦g[r][c]⟧ is row ⟦r⟧, column ⟦c⟧. ⟦g.length⟧ is the number of rows; ⟦g[0].length⟧ is the number of columns.` },
      { k: 'p', t: r`Row-major traversal (row by row):
~~~
for (int r = 0; r < g.length; r++)
  for (int c = 0; c < g[0].length; c++)
    // use g[r][c]
~~~
Column-major traversal swaps the loops: the outer loop runs over columns.` },
      { k: 'p', t: r`Enhanced for loops work too: ⟦for (int[] row : g) for (int v : row) …⟧. The outer variable is a whole row (an ⟦int[]⟧).` },
      { k: 'warn', t: r`Mixing up rows and columns is the most common error. Name your loop variables ⟦r⟧ and ⟦c⟧, not ⟦i⟧ and ⟦j⟧, and check the bounds: rows use ⟦g.length⟧, columns use ⟦g[0].length⟧.` },
    ],
    examples: [
      { q: r`⟦int[][] g = {{1, 2, 3}, {4, 5, 6}};⟧ What is ⟦g[1][2]⟧, and what are ⟦g.length⟧ and ⟦g[0].length⟧?`, steps: [r`Row 1 is {4, 5, 6}; column 2 of it is 6.`, r`There are 2 rows, and each row has 3 columns.`], a: '6; 2 and 3' },
      { q: r`Sum column 1 of the same ⟦g⟧.`, steps: [r`Fix the column at 1 and loop over the rows: g[0][1] = 2, g[1][1] = 5.`, r`2 + 5 = 7.`], a: '7' },
    ],
    practice: [
      P('cs4-5-1', 1, r`⟦int[][] g = {{1, 2, 3}, {4, 5, 6}};⟧ What is ⟦g[1][2]⟧?`, ['6'], 'Row first, then column.', [r`Row 1 is {4, 5, 6}; index 2 is 6.`], { check: () => [[1, 2, 3], [4, 5, 6]][1][2] === 6 }),
      P('cs4-5-2', 1, r`For the same ⟦g⟧, what is ⟦g.length * g[0].length⟧?`, ['6'], 'Rows times columns.', [r`2 rows × 3 columns = 6 elements.`], { check: () => 2 * 3 === 6 }),
      P('cs4-5-3', 1, r`What is the sum of all elements of ⟦g = {{1, 2, 3}, {4, 5, 6}}⟧ computed by a row-major traversal?`, ['21'], 'Visit every cell once.', [r`1 + 2 + 3 + 4 + 5 + 6 = 21.`], { check: () => [[1, 2, 3], [4, 5, 6]].flat().reduce((a, b) => a + b, 0) === 21 }),
      P('cs4-5-4', 2, r`What is printed?
~~~
int[][] g = {{1, 2, 3}, {4, 5, 6}};
int sum = 0;
for (int r = 0; r < g.length; r++) sum += g[r][1];
System.out.println(sum);
~~~`, ['7'], 'Only column 1 is visited.', [r`g[0][1] + g[1][1] = 2 + 5 = 7.`], { check: () => { const g = [[1, 2, 3], [4, 5, 6]]; let s = 0; for (let i = 0; i < g.length; i++) s += g[i][1]; return s === 7; } }),
      P('cs4-5-5', 2, r`Which loop header pair visits a 2D array ⟦g⟧ in column-major order?`, 0, 'The outer loop controls which column you are in.', [r`For column-major order, the outer loop runs over columns (⟦g[0].length⟧) and the inner loop over rows (⟦g.length⟧).`], { choices: [r`⟦for (int c = 0; c < g[0].length; c++)⟧ then ⟦for (int r = 0; r < g.length; r++)⟧`, r`⟦for (int r = 0; r < g.length; r++)⟧ then ⟦for (int c = 0; c < g[0].length; c++)⟧`, r`⟦for (int c = 0; c < g.length; c++)⟧ then ⟦for (int r = 0; r < g[0].length; r++)⟧`, r`⟦for (int[] row : g)⟧ then ⟦for (int v : row)⟧`] }),
      P('cs4-5-6', 3, r`What is printed?
~~~
int[][] m = {{4, 1}, {7, 3}, {2, 9}};
int count = 0;
for (int[] row : m)
  for (int v : row)
    if (v > 3) count++;
System.out.println(count);
~~~`, ['3'], 'Count the values greater than 3.', [r`4, 7 and 9 are greater than 3: count is 3.`], { check: () => [[4, 1], [7, 3], [2, 9]].flat().filter((v) => v > 3).length === 3 }),
    ],
    remember: ['g[row][col]; g.length rows, g[0].length columns.', 'Row-major: outer loop over rows. Column-major: outer over columns.', 'Enhanced for: outer variable is a whole row.'],
    checkIn: 'Next: searching and sorting algorithms.',
  },
  {
    id: 'cs4-6', unit: 4, n: 6, title: 'Searching and sorting',
    intro: 'Finding and ordering data are two of the oldest problems in computing. Linear search checks items one by one; binary search halves a sorted list again and again. Selection, insertion and merge sort put data in order in different ways. You need to trace all of them.',
    goals: ['Trace linear search and binary search', 'Explain why binary search needs sorted data and is faster', 'Trace selection sort and insertion sort pass by pass', 'Describe how merge sort divides and merges'],
    notes: [
      { k: 'p', t: r`**Linear search** checks each element from the start until it finds the target (return its index) or reaches the end (return −1). It works on any array and takes up to n checks.` },
      { k: 'p', t: r`**Binary search** (sorted data only):
~~~
int lo = 0, hi = arr.length - 1;
while (lo <= hi) {
  int mid = (lo + hi) / 2;
  if (arr[mid] == target) return mid;
  if (arr[mid] < target) lo = mid + 1;
  else hi = mid - 1;
}
return -1;
~~~
Each step discards half of what remains, so about $\log_2 n$ checks are needed.` },
      { k: 'list', items: [r`**Selection sort:** on pass ⟦i⟧, find the smallest remaining element and swap it into position ⟦i⟧.`, r`**Insertion sort:** on pass ⟦i⟧, take ⟦arr[i]⟧ and slide it left into its place among the already-sorted elements before it.`, r`**Merge sort:** split the array in half, sort each half (recursively), then merge the two sorted halves. It is the fastest of the three on large data.`] },
      { k: 'tip', t: r`To answer “what does the array look like after k passes?”, perform exactly k passes on paper and stop.` },
      { k: 'warn', t: r`Binary search on unsorted data gives wrong answers, because discarding half of the array assumes everything on one side is smaller.` },
    ],
    examples: [
      { q: r`Selection sort on ⟦{5, 3, 8, 1}⟧: what does the array look like after the first pass?`, steps: [r`The smallest element is 1 (index 3).`, r`Swap it with index 0: {1, 3, 8, 5}.`], a: '{1, 3, 8, 5}' },
      { q: r`Insertion sort on ⟦{4, 3, 2, 10, 12}⟧: what does the array look like after two passes?`, steps: [r`Pass 1 inserts 3 before 4: {3, 4, 2, 10, 12}.`, r`Pass 2 inserts 2 at the front: {2, 3, 4, 10, 12}.`], a: '{2, 3, 4, 10, 12}' },
    ],
    practice: [
      P('cs4-6-1', 1, r`Linear search for 15 in ⟦{4, 8, 15, 16}⟧ returns what index?`, ['2'], 'Count from 0.', [r`4 (index 0), 8 (1), 15 (2): found at index 2.`], { check: () => [4, 8, 15, 16].indexOf(15) === 2 }),
      P('cs4-6-2', 2, r`Binary search (code in the notes) looks for 23 in ⟦{2, 5, 8, 12, 16, 23, 38, 56, 72, 91}⟧. How many elements does it examine?`, ['3'], 'Track lo, hi and mid.', [r`mid = 4 (16 < 23) → lo = 5; mid = 7 (56 > 23) → hi = 6; mid = 5 (23): found.`, r`Three elements examined.`], { check: () => bsearchSteps([2, 5, 8, 12, 16, 23, 38, 56, 72, 91], 23) === 3 }),
      P('cs4-6-3', 1, r`Which condition is required for binary search to work correctly?`, 2, 'Why can it discard half of the array?', [r`It relies on order: everything left of mid is smaller and everything right is larger.`], { choices: ['The array must have an even number of elements', 'The target must be in the array', 'The array must be sorted', 'The array must contain no negative numbers'] }),
      P('cs4-6-4', 2, r`Selection sort on ⟦{5, 3, 8, 1}⟧. After the first pass, what element is at index 3?`, ['5'], 'The minimum is swapped into index 0.', [r`1 and 5 swap: {1, 3, 8, 5}. Index 3 holds 5.`], { check: () => { const a = [5, 3, 8, 1]; let m = 0; for (let i = 1; i < a.length; i++) if (a[i] < a[m]) m = i; [a[0], a[m]] = [a[m], a[0]]; return a[3] === 5; } }),
      P('cs4-6-5', 2, r`Insertion sort on ⟦{4, 3, 2, 10, 12}⟧. After two passes, what element is at index 0?`, ['2'], 'Each pass inserts the next element into the sorted part.', [r`Pass 1: {3, 4, 2, 10, 12}. Pass 2: {2, 3, 4, 10, 12}. Index 0 is 2.`], { check: () => { const a = [4, 3, 2, 10, 12]; for (let i = 1; i <= 2; i++) { const k = a[i]; let j = i - 1; while (j >= 0 && a[j] > k) { a[j + 1] = a[j]; j--; } a[j + 1] = k; } return a[0] === 2; } }),
      P('cs4-6-6', 3, r`A sorted array has 1,000 elements. What is the greatest number of elements binary search could examine?`, ['10'], 'How many halvings until one element is left?', [r`Each step halves the range: 1000 → 500 → 250 → 125 → 62 → 31 → 15 → 7 → 3 → 1.`, r`At most 10 elements are examined ($2^{10} = 1024 > 1000$).`], { check: () => { const a = Array.from({ length: 1000 }, (_, i) => i); let worst = 0; for (const t of [...a, 1000]) worst = Math.max(worst, bsearchSteps(a, t)); return worst === 10; } }),
    ],
    remember: ['Linear search: any data, up to n checks.', 'Binary search: sorted data, about log₂ n checks.', 'Selection: swap the minimum in; insertion: slide the next one into place; merge: split and merge.'],
    checkIn: 'Last lesson: recursion, methods that call themselves.',
  },
  {
    id: 'cs4-7', unit: 4, n: 7, title: 'Recursion',
    intro: 'A recursive method solves a problem by calling itself on a smaller version of the same problem, until it reaches a case simple enough to answer directly. It sounds circular, but it is one of the most elegant ideas in computer science, and merge sort and binary search can both be written this way.',
    goals: ['Identify the base case and recursive call in a method', 'Trace recursive calls and returned values', 'Predict output of recursive methods that print', 'Recognize infinite recursion'],
    notes: [
      { k: 'rule', title: 'Two parts of every recursive method', t: r`A **base case** that returns without recursing, and a **recursive case** that calls the method on a smaller input, moving toward the base case.` },
      { k: 'p', t: r`Example:
~~~
public static int sum(int n) {
  if (n == 0) return 0;      // base case
  return n + sum(n - 1);     // recursive case
}
~~~
⟦sum(4)⟧ = 4 + sum(3) = 4 + 3 + sum(2) = … = 4 + 3 + 2 + 1 + 0 = 10.` },
      { k: 'tip', t: r`Trace recursion by writing each call on its own line, indenting deeper calls, then filling in the returned values from the bottom up.` },
      { k: 'p', t: r`If a method prints *after* its recursive call, the output appears in reverse order of the calls, because the deepest call finishes first.` },
      { k: 'warn', t: r`Without a reachable base case, the calls never stop and the program crashes with a ⟦StackOverflowError⟧.` },
      { k: 'p', t: r`Recursive binary search calls itself on half of the array; merge sort calls itself on each half and then merges. AP questions ask you to trace these, not to write them from scratch.` },
    ],
    examples: [
      { q: r`What does ⟦sum(4)⟧ return for the method in the notes?`, steps: [r`sum(4) = 4 + sum(3); sum(3) = 3 + sum(2); sum(2) = 2 + sum(1); sum(1) = 1 + sum(0); sum(0) = 0.`, r`Fill in upward: 1, 3, 6, 10. Returns 10.`], a: '10' },
      { q: r`What is printed by ⟦show(3)⟧?
~~~
public static void show(int n) {
  if (n > 0) {
    show(n - 1);
    System.out.print(n);
  }
}
~~~`, steps: [r`show(3) calls show(2) first, which calls show(1), which calls show(0) (does nothing).`, r`Then the prints happen as each call finishes: 1, then 2, then 3: ⟦123⟧.`], a: '123' },
    ],
    practice: [
      P('cs4-7-1', 1, r`Using ⟦sum⟧ from the notes, what is ⟦sum(4)⟧?`, ['10'], '4 + 3 + 2 + 1 + 0.', [r`10.`], { check: () => { const sum = (n: number): number => (n === 0 ? 0 : n + sum(n - 1)); return sum(4) === 10; } }),
      P('cs4-7-2', 1, r`What does ⟦fact(5)⟧ return?
~~~
public static int fact(int n) {
  if (n <= 1) return 1;
  return n * fact(n - 1);
}
~~~`, ['120'], '5 × 4 × 3 × 2 × 1.', [r`fact(5) = 5 · 4 · 3 · 2 · 1 = 120.`], { check: () => { const f = (n: number): number => (n <= 1 ? 1 : n * f(n - 1)); return f(5) === 120; } }),
      P('cs4-7-3', 2, r`What is printed by ⟦show(3)⟧ (method from the second example)?`, ['123'], 'The print happens after the recursive call.', [r`The deepest call prints first: 1, 2, 3.`], { check: () => { let out = ''; const show = (n: number): void => { if (n > 0) { show(n - 1); out += n; } }; show(3); return out === '123'; } }),
      P('cs4-7-4', 1, r`What happens when ⟦loop(5)⟧ is called?
~~~
public static int loop(int n) {
  return n + loop(n - 1);
}
~~~`, 3, 'Is there a base case?', [r`There is no base case, so the calls never stop and the program crashes with a StackOverflowError.`], { choices: ['It returns 15', 'It returns 0', 'It returns 5', 'It causes a StackOverflowError'] }),
      P('cs4-7-5', 2, r`What does ⟦pow2(5)⟧ return?
~~~
public static int pow2(int n) {
  if (n == 0) return 1;
  return 2 * pow2(n - 1);
}
~~~`, ['32'], 'Each level multiplies by 2.', [r`pow2(5) = 2 · 2 · 2 · 2 · 2 · 1 = 32.`], { check: () => { const p = (n: number): number => (n === 0 ? 1 : 2 * p(n - 1)); return p(5) === 32; } }),
      P('cs4-7-6', 3, r`What does ⟦mystery("abc")⟧ return?
~~~
public static String mystery(String s) {
  if (s.length() <= 1) return s;
  return mystery(s.substring(1)) + s.substring(0, 1);
}
~~~`, ['cba'], 'The first letter goes to the end of the result of the rest.', [r`mystery("abc") = mystery("bc") + "a" = (mystery("c") + "b") + "a" = "c" + "b" + "a".`, r`Returns "cba": the String reversed.`], { check: () => { const m = (s: string): string => (s.length <= 1 ? s : m(s.substring(1)) + s.substring(0, 1)); return m('abc') === 'cba'; } }),
    ],
    remember: ['Every recursive method needs a base case and a smaller recursive call.', 'Trace down the calls, then return values back up.', 'Printing after the call reverses the order; no base case → StackOverflowError.'],
    checkIn: 'You have finished AP CSA! Take the Unit 4 review, then mix reviews from all units before the exam.',
  },
];

/** Tutor layer for Unit 4, lessons 5–7. */
export const CSA4B_TUTOR: Record<string, LessonTutor> = {
  'cs4-5': {
    bigIdea: [
      r`Some data naturally form a grid: a chessboard, a spreadsheet, the seats in a theater, the pixels of a photo. A 2D array stores a grid as an array of rows, where each row is itself an array.`,
      r`To reach one cell you give two numbers: the row, then the column, like ⟦seats[2][5]⟧ for row 2, seat 5. ⟦g.length⟧ tells you how many rows there are, and ⟦g[0].length⟧ how many columns are in a row.`,
      r`Visiting every cell uses nested loops. Row-major order reads like a book: across row 0, then across row 1. Column-major order reads down each column first. Which loop is on the outside decides the order.`,
    ],
    picture: { title: 'Seats in a movie theater', t: r`Your ticket says Row 3, Seat 7: ⟦seats[3][7]⟧. The usher checks tickets row by row, walking along each row (row-major). A camera filming down each aisle sees column by column (column-major).` },
    words: [
      { term: '2D array', means: 'An array of arrays: a grid of rows and columns.' },
      { term: r`⟦g[r][c]⟧`, means: 'The element in row r, column c.' },
      { term: 'Row-major order', means: 'Traversing one whole row at a time.' },
      { term: 'Column-major order', means: 'Traversing one whole column at a time.' },
    ],
    tools: [
      { name: 'Nested loops', refresher: 'The inner loop runs fully for each outer pass.', lesson: 'cs2-5' },
      { name: 'Array traversal', refresher: 'Each row is an ordinary 1D array.', lesson: 'cs4-1' },
    ],
    why: [
      [r`The first index chooses the row, giving the array {4, 5, 6}; the second index chooses within it.`, r`g.length counts the rows; g[0].length counts the elements in row 0.`],
      [r`Summing one column means the column index stays fixed while the row changes.`, r`So only one loop is needed, over the rows.`],
    ],
    walk: {
      'cs4-5-1': [r`g[1] is row 1: {4, 5, 6}.`, r`Column index 2 in that row is the third value.`, r`6.`],
      'cs4-5-2': [r`g.length = 2 rows.`, r`g[0].length = 3 columns.`, r`2 × 3 = 6.`],
      'cs4-5-3': [r`Row-major visits row 0 (1, 2, 3) then row 1 (4, 5, 6).`, r`6 + 15.`, r`= 21.`],
      'cs4-5-4': [r`The loop varies the row; the column is fixed at 1.`, r`g[0][1] = 2 and g[1][1] = 5.`, r`2 + 5 = 7.`],
      'cs4-5-5': [r`Column-major means the outer loop moves across columns.`, r`Columns are counted by g[0].length; rows by g.length.`, r`Choice A. (C mixes up the two lengths.)`],
      'cs4-5-6': [r`The enhanced loops visit 4, 1, 7, 3, 2, 9.`, r`Those greater than 3: 4, 7, 9.`, r`count = 3.`],
    },
    teach: {
      plan: [r`Draw a 2 × 3 grid and label rows and columns from 0.`, r`Practice reading ⟦g[r][c]⟧ for several cells.`, r`Write the row-major nested loop and trace the visit order.`, r`Swap the loops to show column-major order.`, r`Do a column sum and a count of values above a threshold.`],
      questions: [
        { q: r`Is it ⟦g[col][row]⟧ or ⟦g[row][col]⟧?`, a: r`Row first: ⟦g[row][col]⟧, like reading a seat ticket.` },
        { q: r`Why is the column count ⟦g[0].length⟧?`, a: 'Each row is an array, and g[0] is the first row; its length is the number of columns.' },
        { q: 'When would I use column-major order?', a: 'When you need to process each column, such as finding each column’s total.' },
      ],
      keyPoints: ['A 2D array is an array of rows.', 'g[r][c]; g.length rows; g[0].length columns.', 'Outer loop on rows = row-major; on columns = column-major.', 'Enhanced for: each outer item is a row.'],
    },
  },
  'cs4-6': {
    bigIdea: [
      r`How do you find a word in a dictionary? You don’t read every page from the start (that would be linear search). You open near the middle, see whether your word comes before or after, and throw away the wrong half. Repeat, and you find it in a few steps. That is binary search, and it only works because the dictionary is sorted.`,
      r`Linear search is simple and works on anything, but checking a million items can take a million steps. Binary search needs about 20 steps for a million sorted items. That difference is why sorting matters.`,
      r`Sorting algorithms put data in order. Selection sort repeatedly picks the smallest remaining item. Insertion sort builds a sorted section one item at a time, like sorting cards in your hand. Merge sort splits the list in halves, sorts them, and zips them back together; it is much faster on big data.`,
    ],
    picture: { title: 'Sorting a hand of cards', t: r`Insertion sort is how most people sort cards: pick up the next card and slide it left into the right spot among the cards already sorted. Selection sort is scanning the whole table for the lowest card, putting it first, then finding the next lowest, and so on.` },
    words: [
      { term: 'Linear search', means: 'Checking elements one by one from the start.' },
      { term: 'Binary search', means: 'Repeatedly halving a sorted range by comparing with the middle element.' },
      { term: 'Selection sort', means: 'Each pass swaps the smallest remaining element into place.' },
      { term: 'Insertion sort', means: 'Each pass inserts the next element into the sorted part on the left.' },
      { term: 'Merge sort', means: 'Recursively sorts halves and merges them.' },
    ],
    tools: [
      { name: 'Array algorithms and swaps', refresher: 'Sorting is built from comparisons and swaps.', lesson: 'cs4-2' },
      { name: 'Integer division', refresher: r`⟦mid = (lo + hi) / 2⟧ rounds down.`, lesson: 'cs1-2' },
      { name: 'Logarithms', refresher: r`$\log_2 1024 = 10$: the number of halvings from 1024 down to 1.`, lesson: 'c0-7' },
    ],
    why: [
      [r`Selection sort’s first pass looks through the entire array for the minimum.`, r`The minimum swaps places with whatever was at index 0.`],
      [r`Insertion sort grows a sorted section on the left, one element per pass.`, r`Each new element slides left past larger ones until it reaches its spot.`],
    ],
    walk: {
      'cs4-6-1': [r`Check index 0: 4. Not 15.`, r`Index 1: 8. Not 15.`, r`Index 2: 15. Found, return 2.`],
      'cs4-6-2': [r`lo = 0, hi = 9, mid = 4: arr[4] = 16 < 23, so lo = 5.`, r`mid = (5 + 9) / 2 = 7: arr[7] = 56 > 23, so hi = 6. mid = (5 + 6) / 2 = 5: arr[5] = 23, found.`, r`Elements examined: 16, 56, 23 → 3.`],
      'cs4-6-3': [r`Binary search throws away half of the array based on one comparison.`, r`That only works if smaller values are on one side and larger values on the other.`, r`So the array must be sorted (choice C).`],
      'cs4-6-4': [r`Find the minimum of {5, 3, 8, 1}: 1 at index 3.`, r`Swap it with index 0: {1, 3, 8, 5}.`, r`Index 3 holds 5.`],
      'cs4-6-5': [r`Pass 1 (i = 1): 3 slides before 4 → {3, 4, 2, 10, 12}.`, r`Pass 2 (i = 2): 2 slides past 4 and 3 to the front → {2, 3, 4, 10, 12}.`, r`Index 0 holds 2.`],
      'cs4-6-6': [r`Each comparison halves the range of candidates.`, r`Count halvings from 1000 down to 1: about 10.`, r`$2^{10} = 1024 \ge 1000$, so at most 10 elements are examined.`],
    },
    teach: {
      plan: [r`Play “guess my number from 1 to 100” to discover binary search.`, r`Trace binary search with lo, hi and mid on a sorted array.`, r`Sort a hand of cards with insertion sort, then with selection sort.`, r`Show merge sort by splitting a deck into halves and merging.`, r`Compare step counts: n for linear vs log₂ n for binary.`],
      questions: [
        { q: 'Why not always use binary search?', a: 'It requires sorted data. If the data are unsorted and you search only once, sorting first costs more than a linear search.' },
        { q: 'Which sort is fastest?', a: 'For large data, merge sort. Selection and insertion sort take roughly n² steps; merge sort takes about n log n.' },
        { q: 'What does a selection sort pass do exactly?', a: 'It finds the smallest element in the unsorted part and swaps it into the next position of the sorted part.' },
      ],
      keyPoints: ['Linear: any data, up to n checks.', 'Binary: sorted data, about log₂ n checks.', 'Selection swaps the minimum in; insertion slides elements left.', 'Merge sort splits, sorts and merges.'],
    },
  },
  'cs4-7': {
    bigIdea: [
      r`Recursion means solving a problem by using a smaller copy of the same problem. To add the numbers from 1 to 4, add 4 to the sum of the numbers from 1 to 3, and that smaller sum is solved the same way, until you reach a problem so small the answer is obvious.`,
      r`That obvious case is the base case. Every recursive method needs one, or it keeps calling itself forever until the computer runs out of room and crashes (a StackOverflowError).`,
      r`To trace recursion, go down the chain of calls, writing each one, until you hit the base case. Then come back up, filling in each answer. Work that happens after the recursive call happens on the way back up, which is why such methods often reverse things.`,
    ],
    picture: { title: 'Russian nesting dolls', t: r`Open a doll and there is a smaller doll inside, and another inside that, until you reach the tiny solid doll that cannot be opened: the base case. Then you close them back up in reverse order. Recursive calls open the dolls; returning values close them.` },
    words: [
      { term: 'Recursion', means: 'A method calling itself on a smaller input.' },
      { term: 'Base case', means: 'The input simple enough to answer directly, which stops the recursion.' },
      { term: 'Recursive case', means: 'The part that calls the method again with a smaller input.' },
      { term: 'Call stack', means: 'The list of method calls that have started but not finished.' },
      { term: 'StackOverflowError', means: 'The crash caused by too many unfinished calls, usually from a missing base case.' },
    ],
    tools: [
      { name: 'Calling methods and return values', refresher: 'A call is replaced by the value it returns.', lesson: 'cs1-3' },
      { name: 'substring', refresher: r`⟦s.substring(1)⟧ drops the first character; ⟦s.substring(0, 1)⟧ is the first character.`, lesson: 'cs1-4' },
    ],
    why: [
      [r`Write out the chain of calls until the base case, sum(0), which returns 0 directly.`, r`Then each call adds its own n to the value returned from below.`],
      [r`Each call makes its recursive call BEFORE printing, so nothing prints until the deepest call finishes.`, r`The calls then finish from the innermost (1) outward (3), printing in that order.`],
    ],
    walk: {
      'cs4-7-1': [r`sum(4) → 4 + sum(3) → … → sum(0) returns 0 (base case).`, r`Back up: sum(1) = 1, sum(2) = 3, sum(3) = 6.`, r`sum(4) = 4 + 6 = 10.`],
      'cs4-7-2': [r`fact(5) = 5 × fact(4) = 5 × 4 × fact(3) …`, r`Base case: fact(1) returns 1.`, r`5 × 4 × 3 × 2 × 1 = 120.`],
      'cs4-7-3': [r`show(3) calls show(2) before printing; show(2) calls show(1); show(1) calls show(0), which does nothing.`, r`show(1) prints 1 and finishes, then show(2) prints 2, then show(3) prints 3.`, r`Output: 123.`],
      'cs4-7-4': [r`Look for a base case: there is no if, so every call makes another call.`, r`loop(5) → loop(4) → … → loop(−1000) … never stops.`, r`The call stack overflows: StackOverflowError (choice D).`],
      'cs4-7-5': [r`pow2(5) = 2 × pow2(4) = … = 2 × 2 × 2 × 2 × 2 × pow2(0).`, r`Base case pow2(0) = 1.`, r`2⁵ = 32.`],
      'cs4-7-6': [r`mystery("abc") = mystery("bc") + "a".`, r`mystery("bc") = mystery("c") + "b", and mystery("c") = "c" (base case).`, r`"c" + "b" + "a" = "cba".`],
    },
    teach: {
      plan: [r`Open a set of nesting dolls (or draw them) to introduce base case and recursive case.`, r`Trace sum(4) by writing the calls down the page and the returns up the page.`, r`Show that printing after the call reverses the order.`, r`Remove the base case and ask what happens.`, r`Trace the String-reversing mystery method.`],
      questions: [
        { q: 'Isn’t a method calling itself circular?', a: 'It would be, except each call works on a smaller input and eventually reaches the base case, which answers without calling again.' },
        { q: 'How do I know the order of printed output?', a: 'Look at whether the print comes before or after the recursive call. Before: printed on the way down. After: printed on the way back up (reversed).' },
        { q: 'Is recursion better than loops?', a: 'Not always. Some problems (like merge sort or tree structures) are much simpler recursively; others are clearer with loops.' },
      ],
      keyPoints: ['Base case + smaller recursive call.', 'Trace down to the base case, then return values up.', 'Statements after the call run in reverse order.', 'No base case → StackOverflowError.'],
    },
  },
};

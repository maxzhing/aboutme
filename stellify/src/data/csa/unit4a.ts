import type { CalcLesson, CalcProblem, LessonTutor } from '../calc/types';

const r = String.raw;
const P = (id: string, level: 1 | 2 | 3, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, hint, solution, ...extra });

/** AP CSA Unit 4 · Data Collections (lessons 1–4). Original lessons and problems. */
export const CSA4A: CalcLesson[] = [
  {
    id: 'cs4-1', unit: 4, n: 1, title: 'Arrays: creation, access and traversal',
    intro: 'Real programs work with lots of data: every score in a class, every temperature in a month. An array stores many values of the same type under one name, each in a numbered slot. Today you create arrays, read and write their elements, and loop through them.',
    goals: ['Create arrays with new and with initializer lists', 'Access elements by index and use length', 'Traverse arrays with for and enhanced for loops', 'Avoid out-of-bounds errors and know when enhanced for cannot change an array'],
    notes: [
      { k: 'p', t: r`⟦int[] scores = new int[5];⟧ makes an array of 5 ints, all 0. ⟦int[] primes = {2, 3, 5, 7};⟧ creates and fills one. Default values: 0, 0.0, ⟦false⟧, or ⟦null⟧ for objects.` },
      { k: 'rule', title: 'Indexes and length', t: r`Elements are numbered 0 to ⟦length - 1⟧. ⟦arr.length⟧ (no parentheses) is the number of elements. Using index ⟦arr.length⟧ or a negative index throws an ⟦ArrayIndexOutOfBoundsException⟧.` },
      { k: 'p', t: r`Standard traversal:
~~~
for (int i = 0; i < arr.length; i++) {
  // use arr[i]
}
~~~` },
      { k: 'rule', title: 'Enhanced for loop', t: r`⟦for (int v : arr)⟧ visits each value in order. The variable ⟦v⟧ is a copy, so assigning to ⟦v⟧ does not change the array. Use an indexed loop when you need to change elements or know positions.` },
      { k: 'p', t: r`Data sets raise ethical and social questions: who collected the data, whether people consented, whether personal information is protected, and whether the data are biased toward some groups.` },
      { k: 'warn', t: r`Arrays have a fixed size once created. To “grow” one, you must create a bigger array and copy the elements (or use an ArrayList).` },
    ],
    examples: [
      { q: r`⟦int[] a = {4, 8, 15, 16};⟧ What is ⟦a[2] + a.length⟧?`, steps: [r`Indexes: a[0] = 4, a[1] = 8, a[2] = 15, a[3] = 16.`, r`⟦a.length⟧ is 4, so 15 + 4 = 19.`], a: '19' },
      { q: r`What does this code do to ⟦c = {3, 1, 4}⟧?
~~~
for (int v : c) v = v * 2;
~~~`, steps: [r`Each pass, ⟦v⟧ gets a copy of one element.`, r`Doubling the copy leaves the array unchanged: still {3, 1, 4}.`], a: 'Nothing changes' },
    ],
    practice: [
      P('cs4-1-1', 1, r`⟦int[] a = {4, 8, 15, 16};⟧ What is ⟦a[2] + a.length⟧?`, ['19'], 'Indexes start at 0.', [r`a[2] is 15 and the length is 4: 19.`], { check: () => { const a = [4, 8, 15, 16]; return a[2] + a.length === 19; } }),
      P('cs4-1-2', 1, r`⟦int[] b = new int[5];⟧ What is ⟦b[3]⟧?`, ['0'], 'Default values.', [r`A new int array is filled with 0s.`], { check: () => new Array(5).fill(0)[3] === 0 }),
      P('cs4-1-3', 1, r`⟦int[] a = {4, 8, 15, 16};⟧ What happens when ⟦System.out.println(a[a.length]);⟧ runs?`, 3, 'What is the last valid index?', [r`The last valid index is 3; index 4 is out of bounds, so an exception is thrown.`], { choices: ['It prints 16', 'It prints 0', 'It prints 4', 'An ArrayIndexOutOfBoundsException is thrown'] }),
      P('cs4-1-4', 1, r`What is printed?
~~~
int[] c = {3, 1, 4, 1, 5};
int s = 0;
for (int v : c) s += v;
System.out.println(s);
~~~`, ['14'], 'Add every element.', [r`3 + 1 + 4 + 1 + 5 = 14.`], { check: () => [3, 1, 4, 1, 5].reduce((x, y) => x + y, 0) === 14 }),
      P('cs4-1-5', 2, r`What is printed?
~~~
int[] arr = {1, 2, 3, 4, 5};
for (int i = 0; i < arr.length; i += 2) arr[i] = 0;
int sum = 0;
for (int v : arr) sum += v;
System.out.println(sum);
~~~`, ['6'], 'Which indexes are set to 0?', [r`Indexes 0, 2, 4 become 0: {0, 2, 0, 4, 0}.`, r`The sum is 6.`], { check: () => { const a = [1, 2, 3, 4, 5]; for (let i = 0; i < a.length; i += 2) a[i] = 0; return a.reduce((x, y) => x + y, 0) === 6; } }),
      P('cs4-1-6', 3, r`What is printed?
~~~
int[] c = {3, 1, 4};
for (int v : c) v = v * 2;
System.out.println(c[0]);
~~~`, ['3'], 'Does assigning to v change the array?', [r`⟦v⟧ is a copy of each element; changing it leaves the array alone. ⟦c[0]⟧ is still 3.`], { check: () => { const c = [3, 1, 4]; for (let v of c) { v = v * 2; void v; } return c[0] === 3; } }),
    ],
    remember: ['Indexes 0 to length − 1; length has no parentheses.', 'new int[n] fills with 0s.', 'Enhanced for gives copies: it cannot change the array.'],
    checkIn: 'Next: the standard array algorithms that appear on every free-response section.',
  },
  {
    id: 'cs4-2', unit: 4, n: 2, title: 'Standard array algorithms',
    intro: 'The AP exam expects you to write a core set of array algorithms from memory: sum and average, minimum and maximum, counting, checking for a property, reversing and shifting. Each is a loop with a carefully chosen starting value. Master these and free-response questions become assembly work.',
    goals: ['Compute sums, averages, minimums and maximums', 'Count elements and check whether any or all meet a condition', 'Reverse and shift arrays in place', 'Recognize and fix common bugs in these algorithms'],
    notes: [
      { k: 'p', t: r`Maximum (works even when every value is negative):
~~~
int max = arr[0];
for (int i = 1; i < arr.length; i++)
  if (arr[i] > max) max = arr[i];
~~~` },
      { k: 'p', t: r`Average: ⟦(double) sum / arr.length⟧. Without the cast, integer division drops the decimals.` },
      { k: 'list', items: [r`**Any:** start ⟦found = false⟧; set it true when a match appears.`, r`**All:** start ⟦ok = true⟧; set it false when a counterexample appears.`, r`**Duplicates:** compare every pair with nested loops (⟦j⟧ starting at ⟦i + 1⟧).`] },
      { k: 'p', t: r`Reverse in place by swapping ⟦arr[i]⟧ with ⟦arr[arr.length - 1 - i]⟧ for ⟦i⟧ in the first half. A swap needs a temporary variable.` },
      { k: 'warn', t: r`Starting ⟦max⟧ at 0 is a classic bug: if every value is negative, it returns 0, a number not even in the array.` },
    ],
    examples: [
      { q: r`What is the average of ⟦{2, 3, 4, 6}⟧ computed as ⟦(double) sum / arr.length⟧?`, steps: [r`The sum is 15 and the length is 4.`, r`15.0 / 4 = 3.75.`], a: '3.75' },
      { q: r`Shift ⟦{10, 20, 30, 40}⟧ left by one, moving the first element to the end.`, steps: [r`Save ⟦first = arr[0]⟧; then copy each element one position left.`, r`Put ⟦first⟧ in the last slot: {20, 30, 40, 10}.`], a: '{20, 30, 40, 10}' },
    ],
    practice: [
      P('cs4-2-1', 1, r`Using the maximum algorithm, what is the maximum of ⟦{7, -2, 19, 4}⟧?`, ['19'], 'Track the largest value seen so far.', [r`max: 7 → 7 → 19 → 19.`], { check: () => Math.max(7, -2, 19, 4) === 19 }),
      P('cs4-2-2', 1, r`How many even numbers are in ⟦{2, 5, 8, 11, 14}⟧?`, ['3'], 'Use % 2 == 0.', [r`2, 8 and 14 are even.`], { check: () => [2, 5, 8, 11, 14].filter((x) => x % 2 === 0).length === 3 }),
      P('cs4-2-3', 2, r`What is printed?
~~~
int[] arr = {2, 3, 4, 6};
int sum = 0;
for (int v : arr) sum += v;
System.out.println((double) sum / arr.length);
~~~`, ['3.75'], 'Cast before dividing.', [r`15.0 / 4 = 3.75.`], { check: () => 15 / 4 === 3.75 }),
      P('cs4-2-4', 2, r`After reversing ⟦{1, 2, 3, 4, 5}⟧ in place, what is the element at index 1?`, ['4'], 'Index 1 swaps with index length − 2.', [r`Reversed: {5, 4, 3, 2, 1}. Index 1 holds 4.`], { check: () => [1, 2, 3, 4, 5].reverse()[1] === 4 }),
      P('cs4-2-5', 2, r`After shifting ⟦{10, 20, 30, 40}⟧ left by one (first element moved to the end), what is at index 3?`, ['10'], 'Where does the old first element go?', [r`Result: {20, 30, 40, 10}. Index 3 holds 10.`], { check: () => { const a = [10, 20, 30, 40]; const f = a.shift()!; a.push(f); return a[3] === 10; } }),
      P('cs4-2-6', 3, r`A maximum method starts with ⟦int max = 0;⟧ instead of ⟦arr[0]⟧. For which array does it return the wrong answer?`, 2, 'When is 0 bigger than everything in the array?', [r`For {−5, −3, −8}, no element exceeds 0, so it returns 0 instead of −3.`], { choices: [r`⟦{5, 3, 8}⟧`, r`⟦{0, 1, 2}⟧`, r`⟦{-5, -3, -8}⟧`, r`⟦{7}⟧`] }),
    ],
    remember: ['Max/min: start with arr[0].', 'Average: cast before dividing.', 'Swap with a temporary variable; reverse swaps i with length − 1 − i.'],
    checkIn: 'Next: ArrayLists, which grow and shrink, and the wrapper classes that let them hold numbers.',
  },
  {
    id: 'cs4-3', unit: 4, n: 3, title: 'ArrayList and wrapper classes',
    intro: 'Arrays have a fixed size, but many lists grow and shrink: a playlist, a shopping cart. An ArrayList resizes automatically and comes with methods to add, remove and replace elements. Because it only holds objects, numbers are wrapped in Integer and Double objects.',
    goals: ['Create an ArrayList and use add, get, set, remove and size', 'Explain wrapper classes and autoboxing', 'Traverse an ArrayList with for and enhanced for loops', 'Remove elements during a traversal without skipping any'],
    notes: [
      { k: 'p', t: r`⟦ArrayList<Integer> list = new ArrayList<Integer>();⟧ creates an empty list. Import it with ⟦import java.util.ArrayList;⟧.` },
      { k: 'list', items: [r`⟦add(x)⟧ appends; ⟦add(i, x)⟧ inserts at index ⟦i⟧, shifting later elements right.`, r`⟦get(i)⟧ returns the element at ⟦i⟧; ⟦set(i, x)⟧ replaces it (and returns the old value).`, r`⟦remove(i)⟧ removes the element at ⟦i⟧, shifting later elements left, and returns it.`, r`⟦size()⟧ is the number of elements (a method, unlike an array’s ⟦length⟧).`] },
      { k: 'rule', title: 'Wrapper classes', t: r`An ArrayList cannot hold primitives, so ⟦int⟧ values are stored as ⟦Integer⟧ objects and ⟦double⟧ as ⟦Double⟧. Java converts automatically: autoboxing (⟦list.add(5)⟧) and unboxing (⟦int x = list.get(0);⟧).` },
      { k: 'warn', t: r`Removing while looping forward skips the element that slides into the removed spot. Loop backward, or only increment ⟦i⟧ when nothing was removed.` },
      { k: 'tip', t: r`Printing an ArrayList shows its contents in brackets: ⟦[2, 5, 9]⟧.` },
    ],
    examples: [
      { q: r`What is printed?
~~~
ArrayList<Integer> list = new ArrayList<Integer>();
list.add(5);
list.add(9);
list.add(0, 2);
System.out.println(list);
~~~`, steps: [r`After two adds: [5, 9].`, r`⟦add(0, 2)⟧ inserts 2 at the front, shifting the rest: ⟦[2, 5, 9]⟧.`], a: '[2, 5, 9]' },
      { q: r`Remove every even number from ⟦[2, 4, 4, 5]⟧ with a backward loop.`, steps: [r`Go from the last index down to 0; removing an element only shifts elements you have already visited.`, r`5 stays; both 4s and the 2 are removed: [5].`], a: '[5]' },
    ],
    practice: [
      P('cs4-3-1', 1, r`What is printed?
~~~
ArrayList<Integer> list = new ArrayList<Integer>();
list.add(5);
list.add(9);
list.add(0, 2);
System.out.println(list);
~~~`, ['[2, 5, 9]'], 'add(0, x) inserts at the front.', [r`[5, 9] becomes [2, 5, 9].`], { check: () => { const l = [5, 9]; l.splice(0, 0, 2); return l.join(',') === '2,5,9'; } }),
      P('cs4-3-2', 1, r`What is printed?
~~~
ArrayList<Integer> list = new ArrayList<Integer>();
list.add(3); list.add(7); list.add(1);
list.set(1, 4);
list.remove(0);
System.out.println(list.get(0));
~~~`, ['4'], 'Apply set, then remove.', [r`[3, 7, 1] → set index 1 → [3, 4, 1] → remove index 0 → [4, 1]. get(0) is 4.`], { check: () => { const l = [3, 7, 1]; l[1] = 4; l.splice(0, 1); return l[0] === 4; } }),
      P('cs4-3-3', 1, r`Which declaration is valid?`, 1, 'ArrayLists hold objects, not primitives.', [r`The element type must be a class: ⟦Integer⟧, not ⟦int⟧.`], { choices: [r`⟦ArrayList<int> nums = new ArrayList<int>();⟧`, r`⟦ArrayList<Integer> nums = new ArrayList<Integer>();⟧`, r`⟦ArrayList nums = new ArrayList<int>[10];⟧`, r`⟦int[] nums = new ArrayList<Integer>();⟧`] }),
      P('cs4-3-4', 2, r`What is printed?
~~~
ArrayList<String> words = new ArrayList<String>();
words.add("a"); words.add("b"); words.add("c");
words.add(1, "x");
System.out.println(words.size() + words.indexOf("b"));
~~~`, ['6'], 'Inserting shifts "b" to the right.', [r`The list becomes [a, x, b, c]: size 4, and "b" is at index 2. 4 + 2 = 6.`], { check: () => { const w = ['a', 'b', 'c']; w.splice(1, 0, 'x'); return w.length + w.indexOf('b') === 6; } }),
      P('cs4-3-5', 1, r`What is printed?
~~~
ArrayList<Integer> list = new ArrayList<Integer>();
list.add(3); list.add(6); list.add(9);
int total = 0;
for (int v : list) total += v;
System.out.println(total);
~~~`, ['18'], 'Unboxing happens automatically.', [r`3 + 6 + 9 = 18.`], { check: () => 3 + 6 + 9 === 18 }),
      P('cs4-3-6', 3, r`What is printed?
~~~
ArrayList<Integer> list = new ArrayList<Integer>();
list.add(2); list.add(4); list.add(4); list.add(5);
for (int i = 0; i < list.size(); i++)
  if (list.get(i) % 2 == 0) list.remove(i);
System.out.println(list);
~~~`, ['[4, 5]'], 'After a removal, the next element slides into position i, and then i increases.', [r`i = 0: remove 2 → [4, 4, 5]. i = 1: list.get(1) is 4, remove → [4, 5]. i = 2: stop (size 2).`, r`The first 4 slid into index 0 and was skipped: ⟦[4, 5]⟧.`], { check: () => { const l = [2, 4, 4, 5]; for (let i = 0; i < l.length; i++) if (l[i] % 2 === 0) l.splice(i, 1); return l.join(',') === '4,5'; } }),
    ],
    remember: ['add, add(i, x), get, set, remove, size().', 'ArrayLists hold objects; ints are autoboxed to Integer.', 'Removing while looping forward skips elements.'],
    checkIn: 'Next: reading data from text files into your programs.',
  },
  {
    id: 'cs4-4', unit: 4, n: 4, title: 'Text files and data sets',
    intro: 'Data usually lives in files, not in your code. Java’s Scanner can read a text file word by word or line by line, and String’s split method breaks a line like “Ana,17,Boston” into pieces. Today you read files, parse their values, and think about where data comes from.',
    goals: ['Create a Scanner that reads from a File', 'Use hasNext, next, nextInt and nextLine in a loop', 'Split a line into fields and convert them to numbers', 'Recognize ethical issues and bias in data sets'],
    notes: [
      { k: 'p', t: r`Reading every int in a file:
~~~
import java.io.File;
import java.io.IOException;
import java.util.Scanner;

public static int total(String filename) throws IOException {
  Scanner sc = new Scanner(new File(filename));
  int sum = 0;
  while (sc.hasNextInt()) sum += sc.nextInt();
  sc.close();
  return sum;
}
~~~` },
      { k: 'rule', title: 'Checked exceptions', t: r`Opening a file can fail, so the method must declare ⟦throws IOException⟧ (or handle the exception). Without it, the code does not compile.` },
      { k: 'list', items: [r`⟦hasNext()⟧ / ⟦hasNextInt()⟧: is there another word / int?`, r`⟦next()⟧: the next word (up to whitespace).`, r`⟦nextInt()⟧, ⟦nextDouble()⟧: the next number.`, r`⟦nextLine()⟧: the rest of the current line.`] },
      { k: 'p', t: r`⟦String[] parts = line.split(",");⟧ splits at every comma. Convert a numeric field with ⟦Integer.parseInt(parts[1])⟧ or ⟦Double.parseDouble(…)⟧.` },
      { k: 'warn', t: r`Data reflect how they were collected. A survey answered only online leaves out people without internet access; a data set can encode the biases of whoever collected it. Personal data must be protected.` },
    ],
    examples: [
      { q: r`⟦String[] parts = "Ana,17,Boston".split(",");⟧ What is ⟦Integer.parseInt(parts[1]) + 1⟧?`, steps: [r`parts is {"Ana", "17", "Boston"}; parts[1] is the String "17".`, r`parseInt turns it into the int 17; 17 + 1 = 18.`], a: '18' },
      { q: r`A file contains ⟦4 7 1 9⟧. What does ⟦total⟧ return?`, steps: [r`The loop reads 4, 7, 1, 9 while ⟦hasNextInt()⟧ is true.`, r`4 + 7 + 1 + 9 = 21.`], a: '21' },
    ],
    practice: [
      P('cs4-4-1', 1, r`A method creates ⟦new Scanner(new File("data.txt"))⟧. What must its header include (if it does not catch the exception)?`, 0, 'Opening a file can fail.', [r`File input can throw a checked ⟦IOException⟧, which must be declared with ⟦throws IOException⟧.`], { choices: [r`⟦throws IOException⟧`, r`⟦static⟧`, r`⟦returns File⟧`, r`⟦extends Scanner⟧`] }),
      P('cs4-4-2', 1, r`A file contains ⟦4 7 1 9⟧. What does the ⟦total⟧ method return?`, ['21'], 'Add every int.', [r`4 + 7 + 1 + 9 = 21.`], { check: () => [4, 7, 1, 9].reduce((a, b) => a + b, 0) === 21 }),
      P('cs4-4-3', 2, r`What is printed?
~~~
String[] parts = "Ana,17,Boston".split(",");
System.out.println(Integer.parseInt(parts[1]) + 1);
~~~`, ['18'], 'parts[1] is a String until it is parsed.', [r`parts[1] is "17"; parsed to 17; plus 1 is 18.`], { check: () => parseInt('Ana,17,Boston'.split(',')[1], 10) + 1 === 18 }),
      P('cs4-4-4', 2, r`A file contains ⟦the quick brown fox jumps⟧. What is printed?
~~~
int count = 0;
while (sc.hasNext()) {
  String w = sc.next();
  if (w.length() > 3) count++;
}
System.out.println(count);
~~~`, ['3'], 'Check each word’s length.', [r`quick, brown and jumps have more than 3 letters: 3.`], { check: () => 'the quick brown fox jumps'.split(' ').filter((w) => w.length > 3).length === 3 }),
      P('cs4-4-5', 2, r`A city surveys residents about public transit using only an app-based questionnaire. Which is the most serious concern about the resulting data set?`, 1, 'Who could not respond?', [r`Residents without smartphones or internet access, often older or lower-income residents, are left out, so the data are biased.`], { choices: ['The data set will be too large to store', 'Residents without smartphones are excluded, so the results may not represent everyone', 'App surveys cannot record numerical answers', 'The city would need to use an ArrayList instead of an array'] }),
      P('cs4-4-6', 3, r`A file contains ⟦12 -4 30 7⟧. What is printed?
~~~
int max = sc.nextInt();
while (sc.hasNextInt()) {
  int v = sc.nextInt();
  if (v > max) max = v;
}
System.out.println(max);
~~~`, ['30'], 'The first value starts the maximum.', [r`max: 12 → 12 → 30 → 30.`], { check: () => Math.max(12, -4, 30, 7) === 30 }),
    ],
    remember: ['Scanner + File; declare throws IOException.', 'hasNext/hasNextInt control the loop; next/nextInt read.', 'split(",") then Integer.parseInt; think about bias and privacy.'],
    checkIn: 'Next: two-dimensional arrays, for grids and tables.',
  },
];

/** Tutor layer for Unit 4, lessons 1–4. */
export const CSA4A_TUTOR: Record<string, LessonTutor> = {
  'cs4-1': {
    bigIdea: [
      r`Imagine needing a separate variable for every student’s score: score1, score2, … score300. An array solves this: one name, many numbered slots. ⟦scores[0]⟧ is the first slot, ⟦scores[1]⟧ the second, and so on.`,
      r`The numbering starts at 0, so the last slot of an array with length 5 is index 4. Reaching for slot 5 is like walking past the end of a row of lockers: Java stops the program with an out-of-bounds error.`,
      r`Loops and arrays go together. An indexed for loop visits every slot and can change values. The enhanced for loop (“for each value in the array”) is simpler to read but hands you copies, so it can read the array but not change it.`,
    ],
    picture: { title: 'A row of numbered lockers', t: r`An array is a row of lockers numbered from 0. Each locker holds one item of the same type. ⟦arr[2]⟧ means “open locker 2”. The row is built once with a fixed number of lockers, and you cannot add more later.` },
    words: [
      { term: 'Array', means: 'A fixed-size, ordered collection of values of one type.' },
      { term: 'Element / index', means: 'One stored value / its position number, starting at 0.' },
      { term: r`⟦length⟧`, means: 'The number of elements; the last index is length − 1.' },
      { term: 'Traversal', means: 'Visiting each element in order, usually with a loop.' },
      { term: 'Enhanced for loop', means: r`⟦for (type v : arr)⟧: visits each value; v is a copy.` },
    ],
    tools: [
      { name: 'for loops', refresher: r`⟦for (int i = 0; i < n; i++)⟧ runs n times.`, lesson: 'cs2-3' },
      { name: 'Accumulators', refresher: 'Sum and count patterns work the same on arrays.', lesson: 'cs2-4' },
    ],
    why: [
      [r`Write each index under its value so you pick the right element; index 2 is the third value.`, r`length counts elements (4), which is one more than the last index.`],
      [r`The enhanced for loop copies each element into v.`, r`Doubling v changes only the copy, so the array itself is never modified.`],
    ],
    walk: {
      'cs4-1-1': [r`Index the array: 0→4, 1→8, 2→15, 3→16.`, r`a[2] is 15; a.length is 4.`, r`15 + 4 = 19.`],
      'cs4-1-2': [r`new int[5] creates five slots.`, r`Every slot of an int array starts at 0.`, r`b[3] is 0.`],
      'cs4-1-3': [r`Valid indexes are 0 to length − 1, here 0 to 3.`, r`a[a.length] is a[4], one past the end.`, r`Java throws ArrayIndexOutOfBoundsException (choice D).`],
      'cs4-1-4': [r`The enhanced for gives each value in turn: 3, 1, 4, 1, 5.`, r`s accumulates them.`, r`Total 14.`],
      'cs4-1-5': [r`i takes 0, 2, 4, so those slots become 0: {0, 2, 0, 4, 0}.`, r`The second loop sums the array.`, r`2 + 4 = 6.`],
      'cs4-1-6': [r`v receives a copy of each element.`, r`v = v * 2 changes only the copy.`, r`c[0] is still 3.`],
    },
    teach: {
      plan: [r`Draw a row of numbered lockers starting at 0.`, r`Create arrays both ways (new and an initializer list).`, r`Practice indexing, including the last index, length − 1.`, r`Traverse with an indexed loop and with an enhanced for loop.`, r`Show that the enhanced for loop cannot change elements.`],
      questions: [
        { q: 'Why do indexes start at 0?', a: 'The index is how far the element is from the start: the first element is 0 steps away.' },
        { q: r`Why ⟦arr.length⟧ but ⟦s.length()⟧?`, a: r`For arrays, length is a field (no parentheses); for Strings and ArrayList sizes, it is a method call.` },
        { q: 'When should I use the enhanced for loop?', a: 'When you only need to read every value and do not need the index or to change elements.' },
      ],
      keyPoints: ['Indexes go from 0 to length − 1.', 'New arrays hold default values.', 'Out-of-bounds indexes throw an exception.', 'Enhanced for loops give copies.'],
    },
  },
  'cs4-2': {
    bigIdea: [
      r`A few array recipes come up again and again: add everything up, find the biggest, count how many match, check whether any (or all) fit a rule, reverse the order, shift everything over. The AP exam expects you to write these quickly and correctly.`,
      r`Each recipe is a loop plus a starting value chosen with care. A sum starts at 0. A maximum starts with the first element, never 0, because the array might contain only negative numbers. An “all” check starts true and looks for a single counterexample.`,
      r`Rearranging arrays in place needs swaps, and a swap needs a temporary variable, just like swapping two drinks between two full glasses needs a third glass.`,
    ],
    picture: { title: 'Finding the tallest person in line', t: r`Walk down a line of people. Remember the tallest so far, starting with the first person. Each time you meet someone taller, they become the new “tallest so far”. When you reach the end, the person you remember is the tallest overall. Starting with a 0-foot imaginary person would fail only if everyone were… shorter than 0, which is exactly what negative numbers do.` },
    words: [
      { term: 'In place', means: 'Rearranging the array itself rather than making a new one.' },
      { term: 'Swap', means: r`Exchanging two elements using a temporary variable.` },
      { term: 'Any / all check', means: 'Whether at least one / every element satisfies a condition.' },
      { term: 'Edge case', means: 'An unusual input (empty, all negative, one element) that breaks careless code.' },
    ],
    tools: [
      { name: 'Array traversal', refresher: 'Indexed loops can read and write elements.', lesson: 'cs4-1' },
      { name: 'Casting for averages', refresher: r`⟦(double) sum / n⟧ keeps the decimals.`, lesson: 'cs1-2' },
    ],
    why: [
      [r`Integer division would give 3, so the cast makes the division keep decimals.`, r`15 / 4 as doubles is 3.75.`],
      [r`Saving the first element first prevents it from being overwritten during the shift.`, r`After everything moves left, the saved value fills the last slot.`],
    ],
    walk: {
      'cs4-2-1': [r`max starts at 7 (the first element).`, r`−2 is not bigger; 19 is, so max = 19; 4 is not.`, r`Result: 19.`],
      'cs4-2-2': [r`Test each value with % 2 == 0.`, r`2 yes, 5 no, 8 yes, 11 no, 14 yes.`, r`Count: 3.`],
      'cs4-2-3': [r`sum = 2 + 3 + 4 + 6 = 15.`, r`(double) sum makes 15.0, so the division keeps decimals.`, r`15.0 / 4 = 3.75.`],
      'cs4-2-4': [r`Reversing swaps index 0 with 4 and index 1 with 3; index 2 stays.`, r`Result: {5, 4, 3, 2, 1}.`, r`Index 1 holds 4.`],
      'cs4-2-5': [r`Save first = 10.`, r`Move 20, 30, 40 left: {20, 30, 40, 40}; then put 10 at the end.`, r`{20, 30, 40, 10}: index 3 is 10.`],
      'cs4-2-6': [r`With max = 0, the method returns 0 whenever no element is greater than 0.`, r`In {−5, −3, −8}, every element is negative, so max stays 0.`, r`The true maximum is −3, so choice C fails.`],
    },
    teach: {
      plan: [r`List the core algorithms on the board: sum, average, max/min, count, any/all, reverse, shift.`, r`Trace the maximum algorithm with the tallest-person story.`, r`Break the max algorithm by starting at 0 and testing all negatives.`, r`Show a swap with three cups.`, r`Write reverse together using the swap.`],
      questions: [
        { q: 'Why loop only through the first half when reversing?', a: 'Each swap fixes two elements. Going past the middle would swap them back to where they started.' },
        { q: 'How do I check whether ALL elements satisfy something?', a: 'Start with true and set it to false as soon as one element fails; you can return false immediately.' },
        { q: 'What edge cases should I test?', a: 'An array with one element, all negative values, duplicates, and the first or last element being the special one.' },
      ],
      keyPoints: ['Start max/min with arr[0].', 'Cast before dividing for averages.', 'Swaps need a temporary variable.', 'Test edge cases: negatives, one element, ends.'],
    },
  },
  'cs4-3': {
    bigIdea: [
      r`An array is a fixed row of lockers; an ArrayList is a stretchy list. You can add items, insert them in the middle, remove them, and the list resizes itself. Its methods (⟦add⟧, ⟦get⟧, ⟦set⟧, ⟦remove⟧, ⟦size⟧) replace the square-bracket notation of arrays.`,
      r`ArrayLists can only hold objects, not primitive values. So Java wraps each ⟦int⟧ in an ⟦Integer⟧ object (and ⟦double⟧ in ⟦Double⟧) automatically. This wrapping and unwrapping is called autoboxing and unboxing, and mostly you do not even notice it.`,
      r`The big trap: when you remove an element, everything after it slides one position left. If your loop then moves forward, it skips the element that just slid into place. Loop backward, or don’t advance after removing.`,
    ],
    picture: { title: 'People in a queue', t: r`A queue of people is an ArrayList: people can join at the end, cut in at position 2, or leave. When someone leaves, everyone behind them steps forward one place. If you were checking tickets and stepped forward at the same moment, you would miss the person who just moved into your spot.` },
    words: [
      { term: 'ArrayList', means: 'A resizable list of objects with methods to add, get, set and remove.' },
      { term: 'Wrapper class', means: r`A class that wraps a primitive: ⟦Integer⟧ for int, ⟦Double⟧ for double.` },
      { term: 'Autoboxing / unboxing', means: 'Automatic conversion from primitive to wrapper object and back.' },
      { term: r`⟦size()⟧`, means: 'The number of elements in an ArrayList.' },
    ],
    tools: [
      { name: 'Arrays and traversal', refresher: 'Same index ideas, but method calls instead of brackets.', lesson: 'cs4-1' },
      { name: 'Objects and generics', refresher: r`⟦ArrayList<Integer>⟧ means a list whose elements are Integer objects.`, lesson: 'cs1-4' },
    ],
    why: [
      [r`Appending puts items at the end in order: [5, 9].`, r`Inserting at index 0 pushes the existing items to the right.`],
      [r`Going backward means a removal only shifts elements you have already checked.`, r`So no element is skipped and every even number is removed.`],
    ],
    walk: {
      'cs4-3-1': [r`add(5), add(9) → [5, 9].`, r`add(0, 2) inserts at index 0 → [2, 5, 9].`, r`Printed: [2, 5, 9].`],
      'cs4-3-2': [r`[3, 7, 1]; set(1, 4) replaces 7 → [3, 4, 1].`, r`remove(0) removes 3 → [4, 1].`, r`get(0) → 4.`],
      'cs4-3-3': [r`Generic type arguments must be classes.`, r`int is a primitive, so ArrayList<int> does not compile; the other wrong choices mix arrays and ArrayLists.`, r`Choice B uses Integer correctly.`],
      'cs4-3-4': [r`[a, b, c] → add(1, "x") → [a, x, b, c].`, r`size() = 4; indexOf("b") = 2.`, r`4 + 2 = 6.`],
      'cs4-3-5': [r`The enhanced for unboxes each Integer to an int.`, r`3 + 6 + 9.`, r`= 18.`],
      'cs4-3-6': [r`i = 0: 2 is even → remove → [4, 4, 5]. Now i becomes 1.`, r`i = 1: get(1) is the second 4 → remove → [4, 5]. i becomes 2, which is not < 2, so the loop ends.`, r`The first 4 slid to index 0 after the first removal and was never checked: [4, 5].`],
    },
    teach: {
      plan: [r`Compare an array (fixed lockers) with an ArrayList (stretchy queue).`, r`Demonstrate add, add(i, x), get, set, remove and size with sticky notes.`, r`Explain wrapper classes and autoboxing.`, r`Act out the removal-skip bug with a line of students.`, r`Fix it by looping backward.`],
      questions: [
        { q: 'When should I use an ArrayList instead of an array?', a: 'When the number of elements changes, or you need easy insertions and removals.' },
        { q: r`Why not ⟦ArrayList<int>⟧?`, a: 'ArrayLists hold objects only. Use the wrapper class Integer; Java converts values automatically.' },
        { q: 'How do I safely remove items during a loop?', a: 'Loop from the end toward the start, or decrement i after a removal so the shifted element is checked.' },
      ],
      keyPoints: ['add, add(i, x), get, set, remove, size().', 'Wrapper classes + autoboxing.', 'Removal shifts later elements left.', 'Loop backward when removing.'],
    },
  },
  'cs4-4': {
    bigIdea: [
      r`Programs become much more useful when they can read real data, like a file of weather readings, a list of names, or a spreadsheet saved as text. Java’s Scanner, which you may know from reading keyboard input, can also read from a File.`,
      r`Reading usually follows the same loop: while there is more data, read the next piece and do something with it. Lines with several fields, like ⟦Ana,17,Boston⟧, are split at the commas, and numeric fields are converted from text with ⟦Integer.parseInt⟧.`,
      r`Data are never neutral. Every data set was collected by someone, in some way, from some people. Asking who is missing, whether consent was given, and how the data are protected is part of computer science, and the AP exam asks about it.`,
    ],
    picture: { title: 'Reading a grocery receipt', t: r`A receipt is a text file: one line per item, with the name and price separated. You read it line by line (while there are more lines), split each line into name and price, and turn the price text into a number before adding it to your total.` },
    words: [
      { term: r`⟦Scanner⟧`, means: 'A class that reads input word by word, number by number, or line by line.' },
      { term: r`⟦File⟧`, means: 'An object representing a file on disk.' },
      { term: r`⟦IOException⟧`, means: 'A checked exception for input/output problems such as a missing file.' },
      { term: r`⟦split⟧`, means: 'A String method that breaks a String into an array of pieces at a separator.' },
      { term: 'Parsing', means: r`Converting text into a value, as ⟦Integer.parseInt("17")⟧ gives 17.` },
      { term: 'Bias in data', means: 'When the way data were collected makes them unrepresentative of the whole population.' },
    ],
    tools: [
      { name: 'while loops', refresher: 'Read while there is more input.', lesson: 'cs2-3' },
      { name: 'Arrays', refresher: r`⟦split⟧ returns an array of Strings.`, lesson: 'cs4-1' },
    ],
    why: [
      [r`split breaks the line at each comma into an array of three Strings.`, r`parts[1] is text, so it must be parsed to an int before arithmetic.`],
      [r`hasNextInt keeps the loop going exactly as long as there are numbers left.`, r`Each nextInt is added to the sum.`],
    ],
    walk: {
      'cs4-4-1': [r`Creating a Scanner on a File can fail (for example, if the file is missing).`, r`That failure is a checked IOException, which the compiler forces you to handle or declare.`, r`Add ⟦throws IOException⟧ to the header (choice A).`],
      'cs4-4-2': [r`The loop reads 4, then 7, then 1, then 9.`, r`After 9, hasNextInt() is false.`, r`Sum: 21.`],
      'cs4-4-3': [r`split(",") gives {"Ana", "17", "Boston"}.`, r`parts[1] is "17"; parseInt makes 17.`, r`17 + 1 = 18.`],
      'cs4-4-4': [r`Words: the (3), quick (5), brown (5), fox (3), jumps (5).`, r`Count those with length greater than 3.`, r`3.`],
      'cs4-4-5': [r`Ask who cannot answer an app-only survey.`, r`People without smartphones or internet would be missing, which biases the results.`, r`Choice B.`],
      'cs4-4-6': [r`max starts with the first value, 12.`, r`−4 is not bigger; 30 is, so max = 30; 7 is not.`, r`Printed: 30.`],
    },
    teach: {
      plan: [r`Show a small text file and the Scanner loop that reads it.`, r`Explain why the method needs throws IOException.`, r`Split a CSV line and parse a number from it.`, r`Count and find maxima while reading.`, r`Discuss who is left out of an app-only survey.`],
      questions: [
        { q: r`What is the difference between ⟦next()⟧ and ⟦nextLine()⟧?`, a: r`⟦next()⟧ reads one word (up to a space); ⟦nextLine()⟧ reads everything up to the end of the line.` },
        { q: 'Why do I need parseInt if the file contains numbers?', a: r`When you read text (for example, with split), the numbers arrive as Strings like "17". parseInt converts them to ints.` },
        { q: 'Why is data ethics on a programming exam?', a: 'Programs built on biased or misused data can harm people, so programmers are responsible for how data are collected and used.' },
      ],
      keyPoints: ['new Scanner(new File(name)) with throws IOException.', 'Loop while hasNext / hasNextInt.', 'split then parse numeric fields.', 'Ask who is missing from the data and how it is protected.'],
    },
  },
};

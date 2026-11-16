import type { CalcLesson, CalcProblem, LessonTutor } from '../calc/types';

const r = String.raw;
const P = (id: string, level: 1 | 2 | 3, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, hint, solution, ...extra });
/** Java int arithmetic: truncating division and 32-bit wrap-around */
const idiv = (a: number, b: number) => Math.trunc(a / b);
/** Java String.compareTo */
const cmp = (a: string, b: string) => { for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a.charCodeAt(i) - b.charCodeAt(i); return a.length - b.length; };

/** AP CSA Unit 1 · Using Objects and Methods. Original lessons and problems. */
export const CSA1: CalcLesson[] = [
  {
    id: 'cs1-1', unit: 1, n: 1, title: 'Programs, variables and primitive types',
    intro: 'A program is a precise list of instructions a computer follows exactly, one after another. Today you learn how Java code becomes a running program, how variables store values, and the three primitive types the AP exam uses: int, double and boolean.',
    goals: ['Describe how source code is compiled and run', 'Declare and initialize variables of type int, double and boolean', 'Trace assignment statements', 'Tell compile-time, run-time and logic errors apart'],
    notes: [
      { k: 'p', t: r`An algorithm is a step-by-step process for solving a problem. A program is an algorithm written in a programming language. Java source code is translated by the **compiler** into bytecode, which the Java Virtual Machine runs.` },
      { k: 'rule', title: 'Variables', t: r`A variable is a named storage location with a type. ⟦int count = 3;⟧ declares a variable named ⟦count⟧ of type ⟦int⟧ and initializes it to 3. A variable holds one value at a time; assigning a new value replaces the old one.` },
      { k: 'list', items: [r`⟦int⟧: whole numbers, like ⟦-4⟧, ⟦0⟧, ⟦250⟧.`, r`⟦double⟧: numbers with decimals, like ⟦3.5⟧ or ⟦-0.25⟧. Printing a double always shows a decimal point: ⟦5.0⟧.`, r`⟦boolean⟧: only ⟦true⟧ or ⟦false⟧.`] },
      { k: 'p', t: r`Assignment ⟦=⟧ is not “equals” in the math sense. ⟦x = x + 3;⟧ means: evaluate the right side using the current value of ⟦x⟧, then store the result back in ⟦x⟧.` },
      { k: 'list', items: [r`**Compile-time (syntax) error:** the compiler rejects the code, e.g. a missing semicolon or an undeclared variable.`, r`**Run-time error (exception):** the code compiles but crashes while running, e.g. dividing an int by zero.`, r`**Logic error:** the program runs but gives the wrong answer.`] },
      { k: 'warn', t: r`Assigning one primitive variable to another copies the value. After ⟦int b = a;⟧, changing ⟦a⟧ does not change ⟦b⟧.` },
    ],
    examples: [
      { q: r`What is printed?
~~~
int x = 7;
x = x + 3;
x = x * 2;
System.out.println(x);
~~~`, steps: [r`Start: ⟦x⟧ is 7. After ⟦x = x + 3;⟧ it is 10.`, r`After ⟦x = x * 2;⟧ it is 20, so ⟦20⟧ is printed.`], a: '20' },
      { q: r`What is printed?
~~~
double price = 4;
System.out.println(price);
~~~`, steps: [r`The int 4 is stored in a double variable, so it becomes 4.0.`, r`Printing a double shows the decimal point: ⟦4.0⟧.`], a: '4.0' },
    ],
    practice: [
      P('cs1-1-1', 1, r`What is printed?
~~~
int x = 7;
x = x + 3;
System.out.println(x);
~~~`, ['10'], 'Use the current value of x on the right side.', [r`⟦x + 3⟧ is 10, which is stored back in ⟦x⟧.`], { check: () => 7 + 3 === 10 }),
      P('cs1-1-2', 1, r`Which declaration is valid in Java?`, 2, 'Check the type against the value.', [r`⟦boolean done = false;⟧ stores a boolean value in a boolean variable. The others mismatch types or use quotes for a number.`], { choices: [r`⟦int n = 3.5;⟧`, r`⟦boolean done = "false";⟧`, r`⟦boolean done = false;⟧`, r`⟦int n = "3";⟧`] }),
      P('cs1-1-3', 1, r`What is printed?
~~~
double d = 5;
System.out.println(d);
~~~`, ['5.0'], 'What does a double look like when printed?', [r`The value 5 is stored as the double 5.0, and doubles print with a decimal point.`], { check: () => (5).toFixed(1) === '5.0' }),
      P('cs1-1-4', 2, r`What is printed?
~~~
int a = 4;
int b = a;
a = 9;
System.out.println(b);
~~~`, ['4'], 'Assignment copies the value at that moment.', [r`⟦b⟧ received a copy of 4. Changing ⟦a⟧ later does not affect ⟦b⟧.`], { check: () => { let a = 4; const b = a; a = 9; return b === 4 && a === 9; } }),
      P('cs1-1-5', 2, r`Which of the following is a compile-time error?`, 0, 'Which problem does the compiler catch before the program runs?', [r`A missing semicolon breaks Java syntax, so the compiler rejects the code. Dividing by zero is a run-time error, and a wrong formula is a logic error.`], { choices: ['Leaving out a semicolon at the end of a statement', 'Dividing an int by zero while the program runs', 'Using the wrong formula, so the answer printed is incorrect', 'Entering a negative number when a positive one was expected'] }),
      P('cs1-1-6', 3, r`What is printed?
~~~
int p = 2;
int q = 5;
p = q;
q = p;
System.out.println(p + " " + q);
~~~`, ['5 5'], 'Trace each line in order; the old value of p is lost.', [r`⟦p = q;⟧ makes ⟦p⟧ 5. Then ⟦q = p;⟧ copies 5 back into ⟦q⟧.`, r`Both are 5, so ⟦5 5⟧ is printed. (Swapping needs a temporary variable.)`], { check: () => { let p = 2, q = 5; p = q; q = p; return `${p} ${q}` === '5 5'; } }),
    ],
    remember: ['Compiler → bytecode → JVM runs it.', 'int, double, boolean; doubles print with a decimal point.', '= stores a value; the right side is evaluated first.'],
    checkIn: 'Trace on paper: write each variable as a box and update it line by line. Next: expressions, division and casting.',
  },
  {
    id: 'cs1-2', unit: 1, n: 2, title: 'Expressions, compound assignment and casting',
    intro: 'Java follows strict rules when it computes. Integer division throws away the remainder, % gives that remainder, casting converts between types, and an int can even overflow. These rules cause most of the “gotcha” questions on the exam, so today we master them.',
    goals: ['Evaluate arithmetic expressions with correct precedence', 'Use integer division and the remainder operator %', 'Use compound assignment, ++ and --', 'Cast between int and double and recognize integer overflow'],
    notes: [
      { k: 'rule', title: 'Integer division', t: r`When both operands are ints, ⟦/⟧ gives an int and drops the fractional part: ⟦17 / 5⟧ is 3, and ⟦-7 / 2⟧ is -3 (it truncates toward zero). If either operand is a double, the result is a double: ⟦7 / 2.0⟧ is 3.5.` },
      { k: 'rule', title: 'Remainder %', t: r`⟦a % b⟧ is the remainder after dividing: ⟦17 % 5⟧ is 2. ⟦n % 2 == 0⟧ tests whether ⟦n⟧ is even, and ⟦n % 10⟧ gives the last digit.` },
      { k: 'p', t: r`Precedence: ⟦*⟧, ⟦/⟧, ⟦%⟧ happen before ⟦+⟧ and ⟦-⟧; operators of equal precedence go left to right. Parentheses override everything.` },
      { k: 'list', items: [r`⟦x += 5;⟧ means ⟦x = x + 5;⟧ (also ⟦-=⟧, ⟦*=⟧, ⟦/=⟧, ⟦%=⟧).`, r`⟦x++;⟧ adds 1 and ⟦x--;⟧ subtracts 1.`, r`⟦(int) 9.99⟧ is 9: casting a double to int truncates toward zero.`, r`⟦(double) 7 / 2⟧ is 3.5 because the cast happens before the division.`] },
      { k: 'tip', t: r`To round a non-negative double to the nearest int: ⟦(int) (x + 0.5)⟧.` },
      { k: 'warn', t: r`An int holds values from ⟦Integer.MIN_VALUE⟧ (−2,147,483,648) to ⟦Integer.MAX_VALUE⟧ (2,147,483,647). Going past the maximum wraps around to the minimum: integer overflow.` },
    ],
    examples: [
      { q: r`Evaluate ⟦3 + 4 * 2 % 3⟧.`, steps: [r`⟦*⟧ and ⟦%⟧ come first, left to right: ⟦4 * 2⟧ is 8, then ⟦8 % 3⟧ is 2.`, r`Then ⟦3 + 2⟧ is 5.`], a: '5' },
      { q: r`⟦int sum = 17; int count = 4;⟧ Compare ⟦sum / count⟧ and ⟦(double) sum / count⟧.`, steps: [r`Both ints: ⟦17 / 4⟧ is 4 (remainder dropped).`, r`Casting ⟦sum⟧ first makes it 17.0, so the division is 4.25.`], a: '4 and 4.25' },
    ],
    practice: [
      P('cs1-2-1', 1, r`What is the value of ⟦17 / 5⟧?`, ['3'], 'Both operands are ints.', [r`Integer division drops the remainder: 3.`], { check: () => idiv(17, 5) === 3 }),
      P('cs1-2-2', 1, r`What is the value of ⟦17 % 5⟧?`, ['2'], '5 goes into 17 three times; what is left?', [r`17 − 15 = 2.`], { check: () => 17 % 5 === 2 }),
      P('cs1-2-3', 1, r`What is printed by ⟦System.out.println(7 / 2.0);⟧?`, ['3.5'], 'One operand is a double.', [r`With a double operand the division keeps the fraction: 3.5.`], { check: () => 7 / 2 === 3.5 }),
      P('cs1-2-4', 2, r`What is printed?
~~~
int x = 10;
x += 5;
x *= 2;
x--;
System.out.println(x);
~~~`, ['29'], 'Apply each update in order.', [r`10 → 15 → 30 → 29.`], { check: () => { let x = 10; x += 5; x *= 2; x--; return x === 29; } }),
      P('cs1-2-5', 2, r`What is printed?
~~~
double avg = 9.99;
int whole = (int) avg;
System.out.println(whole + 1);
~~~`, ['10'], 'Casting to int truncates.', [r`⟦(int) 9.99⟧ is 9, and 9 + 1 is 10.`], { check: () => Math.trunc(9.99) + 1 === 10 }),
      P('cs1-2-6', 3, r`What is printed?
~~~
int big = Integer.MAX_VALUE;
big++;
System.out.println(big);
~~~`, ['-2147483648'], 'What happens just past the largest int?', [r`Adding 1 to the largest int wraps around to the smallest int: −2147483648.`], { check: () => ((2147483647 + 1) | 0) === -2147483648 }),
    ],
    remember: ['int / int drops the remainder; % gives it.', '(double) before dividing keeps the decimals.', '(int) truncates; ints overflow past ±2.1 billion.'],
    checkIn: 'If 17 / 5 = 3 now feels natural, you are ready for methods and the Math class.',
  },
  {
    id: 'cs1-3', unit: 1, n: 3, title: 'Calling methods and the Math class',
    intro: 'A method is a named block of code that does a job, like a recipe you can follow by name. Today you learn to read a method signature, call methods with arguments, use the value a method returns, and use Java’s built-in Math class.',
    goals: ['Read a method signature: return type, name, parameters', 'Call static methods with arguments and use return values', 'Use Math.abs, Math.pow, Math.sqrt and Math.random', 'Generate random integers in a range'],
    notes: [
      { k: 'p', t: r`An API (application programming interface) is the set of classes and methods a library provides, described by its documentation. You can use a method without knowing how it is written, as long as you know its signature.` },
      { k: 'rule', title: 'Method signature', t: r`⟦public static int square(int n)⟧: return type ⟦int⟧, name ⟦square⟧, one parameter ⟦n⟧ of type ⟦int⟧. A call must supply arguments that match the parameters in number, order and type.` },
      { k: 'p', t: r`A ⟦void⟧ method returns nothing; a non-void method returns a value that you should store or use, like ⟦int y = square(5);⟧. Arguments are passed by value: the method gets copies.` },
      { k: 'list', items: [r`⟦Math.abs(x)⟧: absolute value (int in, int out; double in, double out).`, r`⟦Math.pow(a, b)⟧: ⟦a⟧ to the power ⟦b⟧, always a double.`, r`⟦Math.sqrt(x)⟧: square root, a double.`, r`⟦Math.random()⟧: a double from 0.0 up to but not including 1.0.`] },
      { k: 'formula', t: r`\text{(int) (Math.random() * range) + min} \quad \text{gives an int from min to min + range − 1}` },
      { k: 'warn', t: r`⟦Math.pow⟧ and ⟦Math.sqrt⟧ return doubles, so ⟦Math.sqrt(49)⟧ prints ⟦7.0⟧, not ⟦7⟧.` },
    ],
    examples: [
      { q: r`Write an expression for a random int from 1 to 6 inclusive.`, steps: [r`⟦Math.random() * 6⟧ is a double in [0, 6).`, r`Casting gives 0–5; adding 1 gives 1–6: ⟦(int) (Math.random() * 6) + 1⟧.`], a: '(int) (Math.random() * 6) + 1' },
      { q: r`⟦public static int mystery(int a, int b) { return a / b + a % b; }⟧ What is ⟦mystery(17, 5)⟧?`, steps: [r`The parameters receive copies: ⟦a⟧ is 17, ⟦b⟧ is 5.`, r`⟦17 / 5⟧ is 3 and ⟦17 % 5⟧ is 2, so it returns 5.`], a: '5' },
    ],
    practice: [
      P('cs1-3-1', 1, r`What is printed by ⟦System.out.println(Math.sqrt(49));⟧?`, ['7.0'], 'What type does Math.sqrt return?', [r`⟦Math.sqrt⟧ returns a double, so it prints 7.0.`], { check: () => Math.sqrt(49).toFixed(1) === '7.0' }),
      P('cs1-3-2', 2, r`What is printed by ⟦System.out.println(Math.abs(-7) + Math.pow(2, 3));⟧?`, ['15.0'], 'Mixing an int with a double gives a double.', [r`⟦Math.abs(-7)⟧ is the int 7; ⟦Math.pow(2, 3)⟧ is the double 8.0.`, r`7 + 8.0 is the double 15.0.`], { check: () => (Math.abs(-7) + Math.pow(2, 3)).toFixed(1) === '15.0' }),
      P('cs1-3-3', 1, r`Which expression produces a random integer from 1 to 6 inclusive?`, 1, 'Scale, cast, then shift.', [r`⟦Math.random() * 6⟧ is in [0, 6); the cast gives 0–5; adding 1 gives 1–6.`], { choices: [r`⟦(int) Math.random() * 6 + 1⟧`, r`⟦(int) (Math.random() * 6) + 1⟧`, r`⟦(int) (Math.random() * 7)⟧`, r`⟦(int) (Math.random() * 6)⟧`] }),
      P('cs1-3-4', 1, r`⟦public static int square(int n) { return n * n; }⟧ What is ⟦square(square(2))⟧?`, ['16'], 'Inside first.', [r`⟦square(2)⟧ is 4, and ⟦square(4)⟧ is 16.`], { check: () => { const sq = (n: number) => n * n; return sq(sq(2)) === 16; } }),
      P('cs1-3-5', 2, r`⟦public static double average(int a, int b)⟧ Which statement correctly calls this method?`, 3, 'Match the number and types of arguments and use the returned double.', [r`Two int arguments and the result stored in a double: ⟦double r = average(3, 4);⟧.`], { choices: [r`⟦int r = average(3, 4);⟧`, r`⟦double r = average(3);⟧`, r`⟦average(3, 4) = r;⟧`, r`⟦double r = average(3, 4);⟧`] }),
      P('cs1-3-6', 3, r`⟦public static int mystery(int a, int b) { return a / b + a % b; }⟧ What is ⟦mystery(29, 4)⟧?`, ['8'], 'Integer division and remainder.', [r`⟦29 / 4⟧ is 7 and ⟦29 % 4⟧ is 1, so it returns 8.`], { check: () => idiv(29, 4) + (29 % 4) === 8 }),
    ],
    remember: ['Signature = return type + name + parameter list.', 'Arguments must match parameters in number, order and type.', 'Math.pow and Math.sqrt return doubles.'],
    checkIn: 'Next: objects, the heart of Java, and the String methods you will use constantly.',
  },
  {
    id: 'cs1-4', unit: 1, n: 4, title: 'Objects, references and String methods',
    intro: 'Java is object-oriented: a class is a blueprint, and objects are the things built from it. Strings are objects with many useful methods. Today you learn how objects are created and referenced, and the String methods that appear on every AP exam.',
    goals: ['Distinguish a class from an object; create objects with new', 'Explain references and null', 'Use length, substring, indexOf, equals and compareTo', 'Explain why Strings are immutable'],
    notes: [
      { k: 'p', t: r`A class defines what its objects know (attributes) and do (methods). ⟦new⟧ calls a constructor to build an object, and the variable stores a **reference** (the object’s address), not the object itself.` },
      { k: 'rule', title: 'null', t: r`A reference variable that refers to no object holds ⟦null⟧. Calling a method on ⟦null⟧ throws a ⟦NullPointerException⟧.` },
      { k: 'list', items: [r`⟦s.length()⟧: number of characters.`, r`⟦s.substring(a, b)⟧: characters from index ⟦a⟧ up to but not including ⟦b⟧; ⟦s.substring(a)⟧ goes to the end. Indexes start at 0.`, r`⟦s.indexOf(t)⟧: index of the first occurrence of ⟦t⟧, or −1.`, r`⟦s.equals(t)⟧: true if the characters match.`, r`⟦s.compareTo(t)⟧: negative if ⟦s⟧ comes first alphabetically, 0 if equal, positive if after.`] },
      { k: 'rule', title: 'Strings are immutable', t: r`String methods never change the original String; they return a new one. ⟦s.toUpperCase();⟧ on its own does nothing useful; write ⟦s = s.toUpperCase();⟧.` },
      { k: 'warn', t: r`Compare String contents with ⟦equals⟧, not ⟦==⟧. ⟦==⟧ checks whether two references point to the same object.` },
      { k: 'tip', t: r`⟦compareTo⟧ returns the difference of the first pair of characters that differ: ⟦"cat".compareTo("car")⟧ is ⟦'t' − 'r'⟧, which is 2.` },
    ],
    examples: [
      { q: r`⟦String s = "computer";⟧ What is ⟦s.substring(3, 6)⟧?`, steps: [r`Indexes: c0 o1 m2 p3 u4 t5 e6 r7.`, r`From index 3 up to (not including) 6: "put".`], a: 'put' },
      { q: r`What is printed?
~~~
String s = "AP";
s.concat("CSA");
System.out.println(s);
~~~`, steps: [r`⟦concat⟧ returns a new String "APCSA" but nothing stores it.`, r`⟦s⟧ still refers to "AP", so ⟦AP⟧ is printed.`], a: 'AP' },
    ],
    practice: [
      P('cs1-4-1', 1, r`What is ⟦"computer".substring(3, 6)⟧?`, ['put'], 'Count from index 0; stop before 6.', [r`Characters at indexes 3, 4, 5: p, u, t.`], { check: () => 'computer'.substring(3, 6) === 'put' }),
      P('cs1-4-2', 1, r`What is ⟦"banana".indexOf("na")⟧?`, ['2'], 'First occurrence, counting from 0.', [r`b0 a1 n2: "na" first starts at index 2.`], { check: () => 'banana'.indexOf('na') === 2 }),
      P('cs1-4-3', 2, r`What is printed?
~~~
String s = "AP";
s.concat("CSA");
System.out.println(s);
~~~`, ['AP'], 'Strings are immutable.', [r`The new String "APCSA" was never stored, so ⟦s⟧ is still "AP".`], { check: () => { const s = 'AP'; void s.concat('CSA'); return s === 'AP'; } }),
      P('cs1-4-4', 2, r`What is printed by ⟦System.out.println("cat".compareTo("car"));⟧?`, ['2'], 'Find the first characters that differ.', [r`"ca" matches; then 't' vs 'r'. 't' − 'r' is 2.`], { check: () => cmp('cat', 'car') === 2 }),
      P('cs1-4-5', 2, r`⟦String a = new String("hi"); String b = new String("hi");⟧ Which expression is ⟦true⟧?`, 2, 'equals compares characters; == compares references.', [r`They are two different objects, so ⟦a == b⟧ is false, but their characters match, so ⟦a.equals(b)⟧ is true.`], { choices: [r`⟦a == b⟧`, r`⟦a.compareTo(b) > 0⟧`, r`⟦a.equals(b)⟧`, r`⟦a.length() != b.length()⟧`] }),
      P('cs1-4-6', 3, r`What is printed by ⟦System.out.println("Hello".length() + "World".substring(1).length());⟧?`, ['9'], 'substring(1) drops the first character.', [r`⟦"Hello".length()⟧ is 5. ⟦"World".substring(1)⟧ is "orld", length 4.`, r`5 + 4 = 9 (both are ints, so this is addition).`], { check: () => 'Hello'.length + 'World'.substring(1).length === 9 }),
    ],
    remember: ['Variables of object type hold references; null means no object.', 'substring(a, b) excludes index b; indexes start at 0.', 'Use equals, not ==, for String contents; Strings are immutable.'],
    checkIn: 'Unit 1 done. Take the review, then Unit 2 teaches programs to make decisions and repeat.',
  },
];

/** Tutor layer for Unit 1. */
export const CSA1_TUTOR: Record<string, LessonTutor> = {
  'cs1-1': {
    bigIdea: [
      r`A computer is incredibly fast but has zero common sense. It does exactly what you write, in the exact order you write it, nothing more. Programming is the art of writing instructions so precise that even a machine with no judgment gets them right.`,
      r`Programs need to remember things while they run: a score, a price, whether the game is over. They store each value in a variable: a labeled box. In Java every box has a type that says what can go in it: ⟦int⟧ for whole numbers, ⟦double⟧ for decimals, ⟦boolean⟧ for true/false.`,
      r`The ⟦=⟧ sign means “put the value on the right into the box on the left”. So ⟦x = x + 3;⟧ is not a contradiction: it means “take what is in x, add 3, and put the result back in x”.`,
    ],
    picture: { title: 'Labeled jars in a kitchen', t: r`Each variable is a jar with a label (its name) and a shape that only fits one kind of thing (its type). Assigning a value empties the jar and puts in the new contents. Copying ⟦b = a⟧ fills jar b with a copy of what is in a; later changes to a do not touch b.` },
    words: [
      { term: 'Compiler', means: 'The program that checks your Java code and translates it into bytecode the computer can run.' },
      { term: 'Variable', means: 'A named storage location that holds one value of a specific type.' },
      { term: 'Primitive type', means: r`A basic built-in type: ⟦int⟧, ⟦double⟧ or ⟦boolean⟧ on the AP exam.` },
      { term: 'Declare / initialize', means: r`Declare: create the variable (⟦int x;⟧). Initialize: give it its first value (⟦x = 5;⟧).` },
      { term: 'Syntax, run-time and logic errors', means: 'Rejected by the compiler; crashes while running; runs but gives a wrong answer.' },
    ],
    tools: [
      { name: 'Order of operations', refresher: r`Java uses the same order as math class: multiplication and division before addition and subtraction.`, lesson: 'c0-1' },
      { name: 'Variables in algebra', refresher: 'A letter stands for a number; in Java the name can be a whole word like count.', lesson: 'c0-2' },
    ],
    why: [
      [r`Each assignment uses the CURRENT value of x on the right side, then overwrites x.`, r`The second line doubles the updated value, so we must use 10, not 7.`],
      [r`A double variable stores the number as a decimal, even if you wrote 4.`, r`Java always prints doubles with at least one digit after the point.`],
    ],
    walk: {
      'cs1-1-1': [r`Make a box for ⟦x⟧ holding 7.`, r`The right side ⟦x + 3⟧ is computed first using the current value: 10.`, r`10 is stored in ⟦x⟧ and printed.`],
      'cs1-1-2': [r`The type on the left must match the value on the right.`, r`⟦int n = 3.5;⟧ puts a decimal in an int box (compile error). Quotes make a String, which does not fit an int or boolean.`, r`⟦boolean done = false;⟧ fits: a boolean value in a boolean box.`],
      'cs1-1-3': [r`⟦d⟧ is a double, so the 5 becomes 5.0 when stored.`, r`⟦println⟧ shows doubles with a decimal point.`, r`Output: ⟦5.0⟧ (typing 5 would be marked wrong; the type matters).`],
      'cs1-1-4': [r`⟦b = a;⟧ copies the value 4 into ⟦b⟧.`, r`⟦a = 9;⟧ changes only ⟦a⟧’s box.`, r`⟦b⟧ still holds 4, so 4 is printed.`],
      'cs1-1-5': [r`Compile-time errors break the rules of the language, so the compiler refuses the code.`, r`A missing semicolon is a rule violation. Dividing by zero only fails when the line actually runs (run-time). A wrong formula runs fine but gives a wrong answer (logic).`, r`A negative input is a data problem, not a compile error. Answer: the missing semicolon.`],
      'cs1-1-6': [r`Start: p = 2, q = 5.`, r`⟦p = q;⟧ → p = 5. The original 2 is now gone forever.`, r`⟦q = p;⟧ → q = 5. Both print: ⟦5 5⟧. A correct swap saves one value in a temporary variable first.`],
    },
    teach: {
      plan: [r`Ask your student to give you instructions for making a sandwich and follow them absurdly literally, to show why code must be exact.`, r`Draw boxes for variables and explain types: int, double, boolean.`, r`Trace ⟦x = x + 3;⟧ by erasing and rewriting the box contents.`, r`Show the copy trap: ⟦int b = a; a = 9;⟧.`, r`Sort a few mistakes into syntax, run-time and logic errors.`],
      questions: [
        { q: 'Why does 5 print as 5.0?', a: r`Because the variable is a double. Java stores and prints doubles with a decimal point, no matter how you typed the value.` },
        { q: r`Isn’t ⟦x = x + 3⟧ impossible?`, a: r`Not in Java: ⟦=⟧ means “store”, not “is equal to”. The right side is computed first, then stored.` },
        { q: 'Why can’t I swap two variables with two lines?', a: 'The first assignment overwrites one value before you save it. Use a third variable to hold it temporarily.' },
      ],
      keyPoints: ['A program is exact instructions run in order.', 'Variables have a name and a type: int, double or boolean.', '= evaluates the right side, then stores it in the left variable.', 'Know syntax vs run-time vs logic errors.'],
    },
  },
  'cs1-2': {
    bigIdea: [
      r`Computers do arithmetic slightly differently from your calculator. When you divide one whole number (int) by another, Java gives a whole number answer and simply throws away any remainder. So ⟦17 / 5⟧ is 3, not 3.4.`,
      r`If you want the remainder, use ⟦%⟧ (“mod”): ⟦17 % 5⟧ is 2. Together they answer “how many groups, and how many left over?”: 17 students in teams of 5 make 3 teams with 2 left over.`,
      r`To get a decimal answer, at least one number must be a double. Casting converts a value’s type: ⟦(double) 17⟧ is 17.0, and ⟦(int) 9.99⟧ chops off the decimals to 9. Finally, an int box has a size limit; if you go past it, the number wraps around like an odometer.`,
    ],
    picture: { title: 'Sharing pizza slices', t: r`17 slices shared among 5 friends: each friend gets ⟦17 / 5 = 3⟧ whole slices, and ⟦17 % 5 = 2⟧ slices are left in the box. Java’s int division only reports the 3; the 2 needs the % operator.` },
    words: [
      { term: 'Integer division', means: 'Dividing two ints gives an int; the fractional part is dropped.' },
      { term: r`Remainder operator ⟦%⟧`, means: 'Gives what is left over after integer division.' },
      { term: 'Casting', means: r`Converting a value to another type: ⟦(double) x⟧ or ⟦(int) y⟧.` },
      { term: 'Compound assignment', means: r`Shorthand like ⟦x += 5⟧ for ⟦x = x + 5⟧.` },
      { term: 'Overflow', means: 'Going beyond the largest (or smallest) value an int can hold, which wraps around.' },
    ],
    tools: [
      { name: 'Division with remainders', refresher: r`17 ÷ 5 = 3 remainder 2, because 5 × 3 = 15 and 17 − 15 = 2.`, lesson: 'c0-1' },
      { name: 'Variables and types', refresher: 'int holds whole numbers, double holds decimals.', lesson: 'cs1-1' },
    ],
    why: [
      [r`Java follows precedence: ⟦*⟧, ⟦/⟧, ⟦%⟧ before ⟦+⟧, and equal-precedence operators go left to right.`, r`Only after those is the addition done.`],
      [r`Two ints divide as ints, losing the .25.`, r`The cast turns sum into a double BEFORE dividing, so the division keeps decimals.`],
    ],
    walk: {
      'cs1-2-1': [r`Both 17 and 5 are ints, so this is integer division.`, r`17 ÷ 5 = 3.4, but the fraction is dropped.`, r`Result: 3.`],
      'cs1-2-2': [r`% asks: what is left over?`, r`5 × 3 = 15 and 17 − 15 = 2.`, r`Result: 2.`],
      'cs1-2-3': [r`2.0 is a double, so the division is done in decimals.`, r`7 ÷ 2 = 3.5.`, r`Printed: ⟦3.5⟧.`],
      'cs1-2-4': [r`⟦x += 5⟧: 10 + 5 = 15.`, r`⟦x *= 2⟧: 15 × 2 = 30.`, r`⟦x--⟧: 30 − 1 = 29. Printed: 29.`],
      'cs1-2-5': [r`⟦(int) 9.99⟧ truncates (chops) to 9; it does not round.`, r`⟦whole⟧ is 9.`, r`⟦whole + 1⟧ is 10.`],
      'cs1-2-6': [r`⟦Integer.MAX_VALUE⟧ is 2,147,483,647, the biggest int.`, r`Adding 1 has nowhere to go, so the value wraps around to the smallest int.`, r`Printed: ⟦-2147483648⟧.`],
    },
    teach: {
      plan: [r`Use the pizza story to explain ⟦/⟧ and ⟦%⟧ for ints.`, r`Show ⟦7 / 2⟧ vs ⟦7 / 2.0⟧ vs ⟦(double) 7 / 2⟧ vs ⟦(double) (7 / 2)⟧.`, r`Evaluate an expression with precedence step by step.`, r`Practice ⟦+=⟧, ⟦++⟧ and ⟦--⟧ with a trace table.`, r`Show the odometer-style overflow.`],
      questions: [
        { q: r`Why is ⟦(double) (7 / 2)⟧ 3.0 but ⟦(double) 7 / 2⟧ 3.5?`, a: r`In the first, ⟦7 / 2⟧ is done as int division (3) before the cast. In the second, the cast makes 7.0 first, so the division keeps decimals.` },
        { q: r`Does ⟦(int)⟧ round?`, a: r`No, it truncates toward zero: ⟦(int) 9.99⟧ is 9 and ⟦(int) -2.7⟧ is −2. To round a positive number, add 0.5 first.` },
        { q: r`What is ⟦%⟧ good for?`, a: r`Testing even/odd (⟦n % 2 == 0⟧), getting the last digit (⟦n % 10⟧), and wrapping around (like clock arithmetic).` },
      ],
      keyPoints: ['int / int truncates; % gives the remainder.', 'A double operand gives a double result.', 'Casting: (double) keeps decimals, (int) truncates.', 'ints overflow and wrap around.'],
    },
  },
  'cs1-3': {
    bigIdea: [
      r`Imagine having to write the instructions for square roots every time you needed one. Instead, someone wrote them once and gave them a name: ⟦Math.sqrt⟧. A method is a named, reusable set of instructions. You “call” it by name, hand it some input, and it hands you back a result.`,
      r`The method’s signature is its instruction label: what it is called, what inputs it needs (parameters) and what kind of answer it gives back (return type). If the label says it needs two ints, you must give it exactly two ints.`,
      r`Java comes with a huge library of ready-made methods, the API. The Math class is your first taste: absolute value, powers, square roots and random numbers, all one call away.`,
    ],
    picture: { title: 'A vending machine', t: r`A vending machine (method) has a label: insert two coins (parameters), get a drink (return value). You do not need to know the machinery inside. Insert the wrong number of coins and it refuses, just like a call with the wrong arguments fails to compile.` },
    words: [
      { term: 'Method', means: 'A named block of code that performs a task and may return a value.' },
      { term: 'Parameter / argument', means: 'Parameter: the input variable in the method’s definition. Argument: the actual value you pass in the call.' },
      { term: 'Return type', means: r`The type of value a method gives back; ⟦void⟧ means nothing is returned.` },
      { term: 'Static method', means: r`A method called on the class name, like ⟦Math.sqrt(9)⟧.` },
      { term: 'API', means: 'The documented collection of classes and methods a library provides.' },
    ],
    tools: [
      { name: 'Functions', refresher: r`A method with a return value is like a function: input → output. ⟦square(4)⟧ is like $f(4)$.`, lesson: 'c0-3' },
      { name: 'Integer division and casting', refresher: r`Needed inside methods and for random numbers.`, lesson: 'cs1-2' },
      { name: 'Exponents and roots', refresher: r`$2^3 = 8$ and $\sqrt{49} = 7$.`, lesson: 'c0-5' },
    ],
    why: [
      [r`Multiplying by 6 stretches the range [0, 1) to [0, 6).`, r`Casting chops off decimals to give 0–5, and adding 1 shifts the range to 1–6.`],
      [r`Arguments are copied into the parameters in order: the first argument goes to the first parameter.`, r`Evaluate the return expression with those values; the result replaces the call.`],
    ],
    walk: {
      'cs1-3-1': [r`⟦Math.sqrt⟧ always returns a double.`, r`The square root of 49 is 7.`, r`As a double it prints ⟦7.0⟧.`],
      'cs1-3-2': [r`⟦Math.abs(-7)⟧: an int argument gives an int result, 7.`, r`⟦Math.pow(2, 3)⟧ always returns a double: 8.0.`, r`int + double = double: ⟦15.0⟧.`],
      'cs1-3-3': [r`We need 6 possible values starting at 1.`, r`⟦Math.random() * 6⟧ gives [0, 6); ⟦(int)⟧ gives 0–5; ⟦+ 1⟧ gives 1–6.`, r`Choice A casts ⟦Math.random()⟧ alone first (always 0), so it always gives 1. The answer is B.`],
      'cs1-3-4': [r`Work from the inside out: ⟦square(2)⟧ is 4.`, r`Then ⟦square(4)⟧ is 16.`, r`Result: 16.`],
      'cs1-3-5': [r`The method needs two ints and returns a double.`, r`A needs a double variable (int cannot hold a double). B passes only one argument. C tries to assign to a method call.`, r`D matches: two ints in, double stored.`],
      'cs1-3-6': [r`⟦a⟧ = 29, ⟦b⟧ = 4.`, r`⟦29 / 4⟧ = 7 (int division) and ⟦29 % 4⟧ = 1.`, r`7 + 1 = 8.`],
    },
    teach: {
      plan: [r`Use the vending machine to explain methods, parameters and return values.`, r`Read three signatures aloud: name, parameters, return type.`, r`Trace a call: copy arguments into parameters, evaluate, replace the call with the result.`, r`Tour the Math class and stress that pow and sqrt return doubles.`, r`Build the random-int formula together and test its smallest and largest values.`],
      questions: [
        { q: 'What is the difference between a parameter and an argument?', a: r`The parameter is the variable in the method definition (⟦int n⟧); the argument is the value you pass when calling (⟦square(5)⟧ passes 5).` },
        { q: r`Why can’t I write ⟦(int) Math.random() * 6⟧?`, a: r`The cast applies first, to ⟦Math.random()⟧ alone, which is always below 1, so it becomes 0. Put the multiplication in parentheses before casting.` },
        { q: 'What happens to the value a method returns if I don’t use it?', a: 'It is thrown away. Store it in a variable or use it in an expression.' },
      ],
      keyPoints: ['A signature gives the name, parameters and return type.', 'Arguments are copied into parameters in order.', 'Math.pow and Math.sqrt return doubles.', '(int) (Math.random() * range) + min gives a random int.'],
    },
  },
  'cs1-4': {
    bigIdea: [
      r`So far, variables held simple values. Objects are richer: they bundle data and behavior together. A class is the blueprint, like the plans for a house; each object is an actual house built from those plans. ⟦new⟧ is the construction crew.`,
      r`An object variable does not hold the house itself; it holds the address of the house: a reference. Two variables can hold the same address and point to the same object. A variable holding ⟦null⟧ has no address at all, and trying to visit it crashes the program.`,
      r`Strings are the objects you will use most. They come with methods to measure, slice and search text. One crucial rule: a String can never be changed. Every String method gives you back a brand-new String and leaves the original untouched.`,
    ],
    picture: { title: 'Addresses on envelopes', t: r`A reference is like an address written on an envelope. Copying the address onto another envelope does not build a second house; both envelopes lead to the same house. ⟦==⟧ asks “same address?”, while ⟦equals⟧ asks “do the houses look the same inside?”.` },
    words: [
      { term: 'Class / object', means: 'A class is a blueprint; an object is one instance built from it.' },
      { term: 'Reference', means: 'The value stored in an object variable: where the object lives in memory.' },
      { term: r`⟦null⟧`, means: 'A reference that points to no object.' },
      { term: 'Immutable', means: 'Cannot be changed after creation. Strings are immutable.' },
      { term: 'Index', means: 'A character’s position in a String, starting at 0.' },
    ],
    tools: [
      { name: 'Calling methods', refresher: r`Instance methods are called on an object with a dot: ⟦s.length()⟧.`, lesson: 'cs1-3' },
      { name: 'Counting from zero', refresher: r`In "cat", c is index 0, a is 1, t is 2; the length is 3.` },
    ],
    why: [
      [r`Writing the index under each letter prevents off-by-one mistakes.`, r`substring includes the start index and stops just before the end index.`],
      [r`Strings are immutable: concat makes a new String rather than changing s.`, r`Because the new String was never assigned to anything, s still refers to "AP".`],
    ],
    walk: {
      'cs1-4-1': [r`Number the letters: c0 o1 m2 p3 u4 t5 e6 r7.`, r`⟦substring(3, 6)⟧ takes indexes 3, 4, 5.`, r`p, u, t → "put".`],
      'cs1-4-2': [r`Number: b0 a1 n2 a3 n4 a5.`, r`Look for the first place "na" starts: index 2.`, r`Answer: 2.`],
      'cs1-4-3': [r`⟦s.concat("CSA")⟧ builds a new String "APCSA".`, r`Nothing stores it, so it is discarded.`, r`⟦s⟧ still holds "AP": printed ⟦AP⟧.`],
      'cs1-4-4': [r`Compare character by character: c = c, a = a.`, r`Third characters differ: 't' and 'r'.`, r`compareTo returns 't' − 'r' = 2 (t is two letters after r).`],
      'cs1-4-5': [r`⟦new⟧ twice means two separate objects at two addresses.`, r`⟦a == b⟧ compares addresses: false. ⟦compareTo⟧ is 0 for equal Strings, not positive; their lengths are equal.`, r`⟦a.equals(b)⟧ compares characters: true. Answer C.`],
      'cs1-4-6': [r`⟦"Hello".length()⟧ = 5.`, r`⟦"World".substring(1)⟧ = "orld", whose length is 4.`, r`Both are ints, so ⟦+⟧ adds: 9.`],
    },
    teach: {
      plan: [r`Explain class vs object with blueprints and houses.`, r`Draw a reference as an arrow from a variable to an object; draw ⟦null⟧ as an arrow to nothing.`, r`Number the letters of a word and practice ⟦substring⟧ and ⟦indexOf⟧.`, r`Show immutability with ⟦s.concat(...)⟧ that is never stored.`, r`Contrast ⟦==⟧ and ⟦equals⟧ with two separately created Strings.`],
      questions: [
        { q: r`Why does ⟦substring(3, 6)⟧ only give 3 characters?`, a: r`The end index is excluded. The length of the result is end − start: 6 − 3 = 3.` },
        { q: r`Why shouldn’t I use ⟦==⟧ for Strings?`, a: r`⟦==⟧ checks whether two references point to the same object. Two Strings with the same letters can be different objects, so use ⟦equals⟧.` },
        { q: 'What causes a NullPointerException?', a: r`Calling a method (or using a field) through a variable whose value is ⟦null⟧: there is no object to act on.` },
      ],
      keyPoints: ['Objects are built with new; variables hold references.', 'Indexes start at 0; substring(a, b) excludes b.', 'Strings are immutable: methods return new Strings.', 'Use equals for contents, == only for same object.'],
    },
  },
};

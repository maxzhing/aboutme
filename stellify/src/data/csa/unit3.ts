import type { CalcLesson, CalcProblem, LessonTutor } from '../calc/types';

const r = String.raw;
const P = (id: string, level: 1 | 2 | 3, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, hint, solution, ...extra });

const DOG = r`~~~
public class Dog {
  private String name;
  private int age;

  public Dog(String n, int a) {
    name = n;
    age = a;
  }

  public Dog() {
    name = "Unknown";
    age = 1;
  }

  public String getName() { return name; }
  public int getAge() { return age; }
  public void birthday() { age++; }
}
~~~`;

const ACCOUNT = r`~~~
public class Account {
  private double balance;

  public Account(double start) { balance = start; }

  public void deposit(double amt) {
    if (amt > 0) balance += amt;
  }

  public void withdraw(double amt) {
    if (amt <= balance) balance -= amt;
  }

  public double getBalance() { return balance; }
  public boolean isRich() { return balance > 1000; }
}
~~~`;

const COUNTER = r`~~~
public class Counter {
  private int count;
  public void increment() { count++; }
  public int getCount() { return count; }
}
~~~`;

/** Simple models of the classes above, for independent checks. */
class Dog { name: string; age: number; constructor(n = 'Unknown', a = 1) { this.name = n; this.age = a; } birthday() { this.age++; } }
class Account { balance: number; constructor(s: number) { this.balance = s; } deposit(a: number) { if (a > 0) this.balance += a; } withdraw(a: number) { if (a <= this.balance) this.balance -= a; } }
class Counter { count = 0; increment() { this.count++; } }

/** AP CSA Unit 3 · Class Creation. Original lessons and problems. */
export const CSA3: CalcLesson[] = [
  {
    id: 'cs3-1', unit: 3, n: 1, title: 'Anatomy of a class and constructors',
    intro: 'Until now you used classes other people wrote. Now you design your own. A class bundles private data (instance variables) with public behavior (methods), and constructors set up each new object. This is the core of object-oriented design.',
    goals: ['Identify instance variables, constructors and methods in a class', 'Explain why instance variables are private', 'Write constructors, including overloaded ones', 'Trace object creation and method calls, including aliases'],
    notes: [
      { k: 'p', t: r`Here is the class used in today’s examples and practice:
${DOG}` },
      { k: 'rule', title: 'Encapsulation', t: r`Instance variables are declared ⟦private⟧, so only code inside the class can touch them directly. Other classes use ⟦public⟧ methods. This protects the object’s data from being set to invalid values.` },
      { k: 'rule', title: 'Constructors', t: r`A constructor has the same name as the class and **no return type**. It runs when ⟦new⟧ creates an object and sets the instance variables. A class can have several constructors with different parameter lists (overloading).` },
      { k: 'p', t: r`If a constructor does not set an instance variable, it gets a default value: 0 for ⟦int⟧, 0.0 for ⟦double⟧, ⟦false⟧ for ⟦boolean⟧, ⟦null⟧ for object references.` },
      { k: 'warn', t: r`⟦Dog b = a;⟧ does not copy the dog. Both variables now refer to the same object (aliases), so a change made through ⟦b⟧ is visible through ⟦a⟧.` },
      { k: 'tip', t: r`Abstraction means hiding details behind a simple interface: a user of ⟦Dog⟧ only needs to know ⟦birthday()⟧ exists, not how the age is stored.` },
    ],
    examples: [
      { q: r`What is printed?
~~~
Dog d = new Dog("Rex", 3);
d.birthday();
d.birthday();
System.out.println(d.getAge());
~~~`, steps: [r`The constructor sets name "Rex" and age 3.`, r`Each ⟦birthday()⟧ adds 1: 4, then 5. Prints 5.`], a: '5' },
      { q: r`What is printed?
~~~
Dog a = new Dog("Ava", 1);
Dog b = a;
b.birthday();
System.out.println(a.getAge());
~~~`, steps: [r`⟦b = a⟧ copies the reference: one dog, two names for it.`, r`The birthday through ⟦b⟧ changes that one dog, so ⟦a.getAge()⟧ is 2.`], a: '2' },
    ],
    practice: [
      P('cs3-1-1', 1, r`Which statement about the private instance variables of ⟦Dog⟧ is true?`, 1, 'Who can access private members?', [r`Private members can be used only by code inside the ⟦Dog⟧ class; other classes must use its public methods.`], { choices: [r`Any class can read and change them directly.`, r`Only code inside the ⟦Dog⟧ class can access them directly.`, r`They can be read but not changed after the constructor runs.`, r`They are shared by every ⟦Dog⟧ object.`] }),
      P('cs3-1-2', 1, r`Using the Dog class, what is printed?
~~~
Dog d = new Dog("Rex", 3);
d.birthday();
d.birthday();
System.out.println(d.getAge());
~~~`, ['5'], 'Start at 3; add 1 twice.', [r`3 → 4 → 5.`], { check: () => { const d = new Dog('Rex', 3); d.birthday(); d.birthday(); return d.age === 5; } }),
      P('cs3-1-3', 2, r`Which is a valid constructor header for ⟦Dog⟧?`, 3, 'Constructors have no return type and share the class name.', [r`⟦public Dog(String n, int a)⟧: class name, no return type.`], { choices: [r`⟦public void Dog(String n, int a)⟧`, r`⟦public dog(String n, int a)⟧`, r`⟦public Dog makeDog(String n, int a)⟧`, r`⟦public Dog(String n, int a)⟧`] }),
      P('cs3-1-4', 2, r`Using the Dog class, what is printed?
~~~
Dog a = new Dog("Ava", 1);
Dog b = a;
b.birthday();
System.out.println(a.getAge());
~~~`, ['2'], 'How many Dog objects exist?', [r`Only one Dog exists; ⟦a⟧ and ⟦b⟧ both refer to it. Its age becomes 2.`], { check: () => { const a = new Dog('Ava', 1); const b = a; b.birthday(); return a.age === 2; } }),
      P('cs3-1-5', 2, r`A class has ⟦private int points;⟧ and a constructor that never assigns ⟦points⟧. What is the value of ⟦points⟧ in a new object?`, ['0'], 'Instance variables get default values.', [r`An unassigned int instance variable defaults to 0.`], { check: () => 0 === 0 }),
      P('cs3-1-6', 3, r`Using the Dog class, what is printed?
~~~
Dog d = new Dog();
System.out.println(d.getName().length() + d.getAge());
~~~`, ['8'], 'Which constructor runs with no arguments?', [r`The no-argument constructor sets name "Unknown" (7 letters) and age 1.`, r`7 + 1 = 8.`], { check: () => { const d = new Dog(); return d.name.length + d.age === 8; } }),
    ],
    remember: ['Private data, public methods: encapsulation.', 'Constructors: class name, no return type; can be overloaded.', 'Copying a reference creates an alias, not a new object.'],
    checkIn: 'Next: writing the methods themselves, and what happens when objects are passed to methods.',
  },
  {
    id: 'cs3-2', unit: 3, n: 2, title: 'Writing methods: accessors, mutators and passing objects',
    intro: 'Methods are where a class does its work. Accessors report data, mutators change it safely, and methods can take and return values, including references to objects. Today you write and trace them, and learn exactly what changes when you pass an object versus a number.',
    goals: ['Write accessor and mutator methods', 'Use return values and void methods correctly', 'Explain pass-by-value for primitives and references', 'Predict whether a method call changes an object'],
    notes: [
      { k: 'p', t: r`The class used today:
${ACCOUNT}` },
      { k: 'list', items: [r`**Accessor** (getter): returns information without changing the object, e.g. ⟦getBalance()⟧.`, r`**Mutator** (setter): changes the object’s state, usually ⟦void⟧, e.g. ⟦deposit⟧.`, r`A ⟦boolean⟧ method answers a question: ⟦isRich()⟧.`] },
      { k: 'rule', title: 'Pass by value', t: r`Java always passes a copy of the argument. For a primitive, the method gets a copy of the number, so the caller’s variable never changes. For an object, the method gets a copy of the **reference**, so it can change the object that reference points to.` },
      { k: 'warn', t: r`Assigning a new object to a parameter inside a method (⟦c = new Counter();⟧) only changes the method’s local copy of the reference. The caller still refers to the original object.` },
      { k: 'tip', t: r`Mutators that check their input (like ⟦if (amt > 0)⟧) are how a class keeps its data valid. That is the payoff of making the data private.` },
    ],
    examples: [
      { q: r`Using Account: what is printed?
~~~
Account a = new Account(100);
a.deposit(50);
a.withdraw(200);
a.withdraw(30);
System.out.println(a.getBalance());
~~~`, steps: [r`100 → 150 after the deposit. Withdrawing 200 is refused (200 > 150).`, r`Withdrawing 30 works: 120. It is a double, so ⟦120.0⟧ is printed.`], a: '120.0' },
      { q: r`What is printed?
~~~
public static void addOne(int x) { x++; }
// in main:
int n = 5;
addOne(n);
System.out.println(n);
~~~`, steps: [r`⟦x⟧ receives a copy of 5 and becomes 6 inside the method.`, r`⟦n⟧ is untouched, so 5 is printed.`], a: '5' },
    ],
    practice: [
      P('cs3-2-1', 2, r`Using Account, what is printed?
~~~
Account a = new Account(100);
a.deposit(50);
a.withdraw(200);
a.withdraw(30);
System.out.println(a.getBalance());
~~~`, ['120.0'], 'Does each withdrawal pass its check? Remember the type.', [r`100 → 150 → (200 refused) → 120, printed as the double 120.0.`], { check: () => { const a = new Account(100); a.deposit(50); a.withdraw(200); a.withdraw(30); return a.balance.toFixed(1) === '120.0'; } }),
      P('cs3-2-2', 1, r`Which Account method is a mutator?`, 0, 'Which one changes the object?', [r`⟦deposit⟧ changes the balance; the others only report information.`], { choices: [r`⟦deposit⟧`, r`⟦getBalance⟧`, r`⟦isRich⟧`, r`⟦toString⟧ (if it were added)`] }),
      P('cs3-2-3', 1, r`Using Account, what is printed?
~~~
Account a = new Account(500);
a.deposit(600);
System.out.println(a.isRich());
~~~`, ['true'], 'Compare the balance with 1000.', [r`500 + 600 = 1100, and 1100 > 1000 is true.`], { check: () => { const a = new Account(500); a.deposit(600); return a.balance > 1000; } }),
      P('cs3-2-4', 2, r`What is printed?
~~~
public static void addOne(int x) { x++; }
// in main:
int n = 5;
addOne(n);
System.out.println(n);
~~~`, ['5'], 'The method gets a copy.', [r`Only the copy ⟦x⟧ changes; ⟦n⟧ stays 5.`], { check: () => { const n = 5; const addOne = (x: number) => { x++; return x; }; addOne(n); return n === 5; } }),
      P('cs3-2-5', 2, r`Using Counter:
${COUNTER}
What is printed?
~~~
public static void bump(Counter c) { c.increment(); }
// in main:
Counter k = new Counter();
bump(k);
bump(k);
System.out.println(k.getCount());
~~~`, ['2'], 'The method receives a copy of the reference to the same object.', [r`Both calls increment the one Counter object that ⟦k⟧ refers to: 2.`], { check: () => { const k = new Counter(); const bump = (c: Counter) => c.increment(); bump(k); bump(k); return k.count === 2; } }),
      P('cs3-2-6', 3, r`Using Counter, what is printed?
~~~
public static void reset(Counter c) {
  c = new Counter();
  c.increment();
}
// in main:
Counter k = new Counter();
k.increment();
k.increment();
k.increment();
reset(k);
System.out.println(k.getCount());
~~~`, ['3'], 'What does assigning to the parameter change?', [r`⟦k⟧ counts to 3. Inside ⟦reset⟧, ⟦c⟧ is pointed at a brand-new Counter, which is incremented.`, r`The caller’s ⟦k⟧ still refers to the original Counter, which still holds 3.`], { check: () => { const k = new Counter(); k.increment(); k.increment(); k.increment(); const reset = (c: Counter) => { c = new Counter(); c.increment(); }; reset(k); return k.count === 3; } }),
    ],
    remember: ['Accessors report; mutators change.', 'Java passes copies: primitives can’t be changed by a method; objects can.', 'Reassigning a parameter doesn’t affect the caller.'],
    checkIn: 'Next: static members, scope and the keyword this.',
  },
  {
    id: 'cs3-3', unit: 3, n: 3, title: 'Static members, scope and the keyword this',
    intro: 'Some data belongs to the whole class rather than to one object, like a count of how many objects have been made. That is what static means. Today you also learn where each variable can be used (scope) and how the keyword this refers to the current object.',
    goals: ['Use static variables and methods', 'Explain what a static method can and cannot access', 'Determine the scope of local, parameter and instance variables', 'Use this to resolve name conflicts'],
    notes: [
      { k: 'p', t: r`A class that numbers its tickets:
~~~
public class Ticket {
  private static int count = 0;
  private int number;

  public Ticket() {
    count++;
    number = count;
  }

  public int getNumber() { return number; }
  public static int getCount() { return count; }
}
~~~` },
      { k: 'rule', title: 'static', t: r`A ⟦static⟧ variable has one copy shared by all objects of the class. A ⟦static⟧ method belongs to the class (called as ⟦Ticket.getCount()⟧) and cannot use instance variables or ⟦this⟧, because no particular object is involved.` },
      { k: 'rule', title: 'Scope', t: r`A local variable exists only inside the block where it is declared (a loop variable only inside its loop). A parameter exists only inside its method. Instance variables exist for the whole object.` },
      { k: 'p', t: r`When a local variable or parameter has the same name as an instance variable, the local one wins inside that method (shadowing). ⟦this.name⟧ always means the instance variable of the current object.` },
      { k: 'warn', t: r`⟦public void setAge(int age) { age = age; }⟧ assigns the parameter to itself and never changes the object. Write ⟦this.age = age;⟧.` },
    ],
    examples: [
      { q: r`Three Tickets are created with ⟦new Ticket()⟧. What is ⟦Ticket.getCount()⟧, and what is the second ticket’s number?`, steps: [r`Each constructor increments the shared ⟦count⟧: 1, 2, 3.`, r`Each object stores the count at its creation, so the second ticket’s number is 2; the count is 3.`], a: '3 and 2' },
      { q: r`⟦private int x = 10;⟧ and ⟦public int f() { int x = 3; return x + this.x; }⟧. What does ⟦f()⟧ return?`, steps: [r`Inside ⟦f⟧, ⟦x⟧ means the local variable, 3.`, r`⟦this.x⟧ means the instance variable, 10. Returns 13.`], a: '13' },
    ],
    practice: [
      P('cs3-3-1', 1, r`Using Ticket, three tickets are created. What is ⟦Ticket.getCount()⟧?`, ['3'], 'count is shared by all tickets.', [r`Each constructor adds 1 to the single shared count: 3.`], { check: () => { let count = 0; const make = () => { count++; return { number: count }; }; make(); make(); make(); return count === 3; } }),
      P('cs3-3-2', 2, r`Using Ticket:
~~~
Ticket t1 = new Ticket();
Ticket t2 = new Ticket();
Ticket t3 = new Ticket();
System.out.println(t2.getNumber());
~~~`, ['2'], 'Each ticket saves the count at its creation.', [r`t2 was the second ticket made, so its number is 2.`], { check: () => { let count = 0; const make = () => { count++; return { number: count }; }; make(); const t2 = make(); make(); return t2.number === 2; } }),
      P('cs3-3-3', 2, r`Why can’t the static method ⟦getCount⟧ return ⟦number⟧?`, 1, 'Which object’s number would it be?', [r`A static method is not called on any object, so there is no particular ⟦number⟧ (an instance variable) to return.`], { choices: ['Because number is private', 'Because a static method is not tied to any one object, so it cannot use instance variables', 'Because static methods cannot return int values', 'Because number is declared after count'] }),
      P('cs3-3-4', 2, r`⟦private int x = 10;⟧ ⟦public int f() { int x = 3; return x + this.x; }⟧ What does ⟦f()⟧ return?`, ['13'], 'Local x versus this.x.', [r`The local ⟦x⟧ is 3 and ⟦this.x⟧ is 10: 13.`], { check: () => { const obj = { x: 10, f() { const x = 3; return x + this.x; } }; return obj.f() === 13; } }),
      P('cs3-3-5', 3, r`A Dog has age 4. Its class contains ⟦public void setAge(int age) { age = age; }⟧. After ⟦d.setAge(9);⟧, what does ⟦d.getAge()⟧ return?`, ['4'], 'Which age does each side of = refer to?', [r`Inside the method, both sides mean the parameter, so the instance variable is never changed.`, r`The age is still 4. The fix is ⟦this.age = age;⟧.`], { check: () => { const d = { age: 4, setAge(age: number) { age = age; void age; } }; d.setAge(9); return d.age === 4; } }),
      P('cs3-3-6', 1, r`What is printed?
~~~
int total = 0;
for (int i = 0; i < 3; i++) {
  int temp = i * 2;
  total += temp;
}
System.out.println(total);
~~~`, ['6'], 'temp is created fresh on each pass.', [r`temp is 0, 2, 4 on the three passes; total is 6. (Using temp or i after the loop would not compile.)`], { check: () => { let t = 0; for (let i = 0; i < 3; i++) { const temp = i * 2; t += temp; } return t === 6; } }),
    ],
    remember: ['static: one shared copy; static methods have no this.', 'Scope: locals live in their block, parameters in their method.', 'this.x is the instance variable when a local x shadows it.'],
    checkIn: 'Unit 3 complete. Take the review; Unit 4, data collections, is the biggest part of the exam.',
  },
];

/** Tutor layer for Unit 3. */
export const CSA3_TUTOR: Record<string, LessonTutor> = {
  'cs3-1': {
    bigIdea: [
      r`A class is a blueprint for a kind of thing. A ⟦Dog⟧ class says every dog has a name and an age (its data) and can have a birthday (its behavior). Each actual dog you create with ⟦new⟧ is an object with its own name and age.`,
      r`Good classes keep their data ⟦private⟧. Outsiders cannot reach in and set a dog’s age to −50; they must go through public methods, which can check that changes make sense. Hiding the details behind simple methods is called encapsulation and abstraction.`,
      r`The constructor is the setup routine that runs when an object is born. It has the same name as the class and no return type. A class can have several constructors, so you can create objects in different ways.`,
    ],
    picture: { title: 'A cookie cutter', t: r`The class is the cookie cutter; each cookie is an object. All cookies share the cutter’s shape, but each can have its own frosting (its own instance variable values). The constructor is the act of pressing the cutter into the dough.` },
    words: [
      { term: 'Instance variable', means: 'Data each object stores for itself, declared in the class but outside any method.' },
      { term: 'Constructor', means: r`Special method that initializes a new object; same name as the class, no return type.` },
      { term: r`⟦private⟧ / ⟦public⟧`, means: 'Private: only this class can use it. Public: any class can use it.' },
      { term: 'Encapsulation', means: 'Keeping data private and controlling access through methods.' },
      { term: 'Overloading', means: 'Several constructors (or methods) with the same name but different parameter lists.' },
    ],
    tools: [
      { name: 'Objects and references', refresher: 'Variables hold references; new builds objects.', lesson: 'cs1-4' },
      { name: 'Calling methods', refresher: r`⟦d.birthday()⟧ calls an instance method on the object ⟦d⟧ refers to.`, lesson: 'cs1-3' },
    ],
    why: [
      [r`⟦new Dog("Rex", 3)⟧ chooses the two-parameter constructor, which copies the arguments into the instance variables.`, r`Each birthday call changes the same object’s age.`],
      [r`Assigning one reference variable to another copies the address, not the dog.`, r`Since only one object exists, a change through either name is seen through both.`],
    ],
    walk: {
      'cs3-1-1': [r`⟦private⟧ means “visible only inside this class”.`, r`Other classes must call public methods like ⟦getAge()⟧.`, r`Choice B. (Shared-by-all describes static variables, not private ones.)`],
      'cs3-1-2': [r`The constructor sets age 3.`, r`Two birthdays: 4, then 5.`, r`⟦getAge()⟧ returns 5.`],
      'cs3-1-3': [r`A constructor must match the class name exactly (capital D) and have no return type, not even void.`, r`A has void, B has lowercase dog, C has a return type and a different name.`, r`D is correct.`],
      'cs3-1-4': [r`⟦b = a⟧ makes b an alias for the same Dog.`, r`The birthday through b changes that Dog’s age from 1 to 2.`, r`Asking through a gives 2.`],
      'cs3-1-5': [r`Instance variables always start with a default value.`, r`For an int, the default is 0.`, r`So points is 0.`],
      'cs3-1-6': [r`No arguments → the no-argument constructor runs: name "Unknown", age 1.`, r`"Unknown" has 7 characters.`, r`7 + 1 = 8.`],
    },
    teach: {
      plan: [r`Use the cookie cutter to explain class vs object.`, r`Read the Dog class aloud and label instance variables, constructors and methods.`, r`Explain private data with the “age −50” example.`, r`Trace object creation and two birthday calls.`, r`Draw two arrows to one object to explain aliasing.`],
      questions: [
        { q: 'Why make instance variables private?', a: 'So outside code cannot put the object in an invalid state. All changes go through methods that can check the values.' },
        { q: 'Why does a constructor have no return type?', a: 'It is not called like a normal method that returns a value; it initializes the object that new is building.' },
        { q: 'What if I write no constructor at all?', a: 'Java provides a default no-argument constructor, and the instance variables get default values.' },
      ],
      keyPoints: ['Class = blueprint; object = instance.', 'Instance variables private; methods public.', 'Constructors initialize; they can be overloaded.', 'Copying a reference creates an alias.'],
    },
  },
  'cs3-2': {
    bigIdea: [
      r`Objects do their work through methods. Some methods just answer questions about the object (accessors, like ⟦getBalance()⟧). Others change the object (mutators, like ⟦deposit⟧). A well-designed mutator checks its input so the object never ends up in a nonsense state.`,
      r`When you pass something to a method, Java hands over a copy. If it is a number, the method plays with its own copy and your original never changes. If it is an object, the copy is a copy of the address, so the method can walk over to the same object and change it.`,
      r`But if the method points its copy of the address at a brand-new object, that does not affect your variable at all. Getting this exactly right is one of the most-tested ideas in AP CSA.`,
    ],
    picture: { title: 'Photocopies of a house key', t: r`Passing an int is like handing someone a photocopy of a number: they can scribble on it, but your paper is unchanged. Passing an object is like handing them a copy of your house key: they can go in and rearrange your furniture. If they throw away the key and grab a key to a different house, your house is unaffected.` },
    words: [
      { term: 'Accessor (getter)', means: 'A method that returns information about an object without changing it.' },
      { term: 'Mutator (setter)', means: 'A method that changes an object’s state.' },
      { term: 'Return value', means: 'The value a non-void method sends back to the caller.' },
      { term: 'Pass by value', means: 'Methods receive copies of arguments (for objects, copies of references).' },
    ],
    tools: [
      { name: 'Classes and constructors', refresher: 'Instance variables hold the object’s state.', lesson: 'cs3-1' },
      { name: 'if statements', refresher: 'Mutators use ifs to reject bad input.', lesson: 'cs2-1' },
    ],
    why: [
      [r`Trace the balance through each call, testing each withdraw’s condition.`, r`The withdrawal of 200 fails its check, so only the 30 comes out. getBalance returns a double, which prints with .0.`],
      [r`The parameter x is a separate variable holding a copy of n’s value.`, r`Changing the copy does not reach back to n.`],
    ],
    walk: {
      'cs3-2-1': [r`Start 100; deposit 50 → 150.`, r`withdraw(200): 200 <= 150 is false, so nothing happens. withdraw(30): allowed → 120.`, r`The balance is a double: ⟦120.0⟧.`],
      'cs3-2-2': [r`A mutator changes the object’s data.`, r`deposit adds to balance; getBalance and isRich only read it.`, r`Answer A.`],
      'cs3-2-3': [r`500 + 600 = 1100.`, r`isRich returns ⟦balance > 1000⟧.`, r`1100 > 1000 → true.`],
      'cs3-2-4': [r`addOne gets a copy of 5 in x.`, r`x++ makes the copy 6; n is a different variable.`, r`n is still 5.`],
      'cs3-2-5': [r`c receives a copy of k’s reference: both point to the same Counter.`, r`Each bump increments that one object.`, r`k.getCount() is 2.`],
      'cs3-2-6': [r`After three increments, k’s Counter holds 3.`, r`Inside reset, c is redirected to a new Counter, which gets incremented to 1. The original is untouched.`, r`k still refers to the original: 3.`],
    },
    teach: {
      plan: [r`Read the Account class and sort its methods into accessors and mutators.`, r`Trace deposits and withdrawals, including a refused withdrawal.`, r`Use the photocopy vs house-key story for pass-by-value.`, r`Trace addOne (no change) and bump (change).`, r`Finish with reset to show that reassigning a parameter changes nothing outside.`],
      questions: [
        { q: 'Does Java pass objects by reference?', a: 'No: it passes a copy of the reference. That is why a method can change the object but cannot make your variable point somewhere else.' },
        { q: 'Should mutators return a value?', a: 'Usually they are void, but some return a boolean to report whether the change succeeded.' },
        { q: 'Why check input in a mutator?', a: 'To keep the object valid, such as never letting a balance go negative.' },
      ],
      keyPoints: ['Accessors read; mutators change (and validate).', 'Primitive arguments can’t be changed by a method.', 'Object arguments can be changed through the copied reference.', 'Reassigning a parameter doesn’t affect the caller.'],
    },
  },
  'cs3-3': {
    bigIdea: [
      r`Usually every object has its own copy of each instance variable: every Ticket has its own number. But some information belongs to the class as a whole, like how many tickets have been printed so far. Marking a variable ⟦static⟧ creates one shared copy for the whole class.`,
      r`Static methods work at the class level too. They are called on the class name, and since no particular object is involved, they cannot use instance variables or ⟦this⟧.`,
      r`Scope answers “where can I use this name?”. A variable declared inside a loop or method disappears when that block ends. When a local name matches an instance variable’s name, the local one hides it, and ⟦this.⟧ reaches past it to the object’s own variable.`,
    ],
    picture: { title: 'A classroom whiteboard', t: r`Each student has their own notebook (instance variables). The whiteboard at the front is shared by everyone (a static variable): when one student updates the count on it, everyone sees the new count. “this” is a student pointing at their own notebook.` },
    words: [
      { term: r`⟦static⟧ variable`, means: 'One copy shared by all objects of the class.' },
      { term: r`⟦static⟧ method`, means: 'A method that belongs to the class, not an object; it cannot use instance variables.' },
      { term: 'Scope', means: 'The region of code where a variable can be used.' },
      { term: 'Shadowing', means: 'A local variable or parameter hiding an instance variable with the same name.' },
      { term: r`⟦this⟧`, means: 'A reference to the current object.' },
    ],
    tools: [
      { name: 'Classes and constructors', refresher: 'Constructors run once per new object.', lesson: 'cs3-1' },
      { name: 'Methods and parameters', refresher: 'Parameters are local to their method.', lesson: 'cs3-2' },
    ],
    why: [
      [r`count is static: all three constructors update the same variable.`, r`number is an instance variable copied from count at that moment, so each ticket remembers its own position.`],
      [r`Inside f, the local x shadows the instance variable.`, r`this.x explicitly refers to the object’s instance variable.`],
    ],
    walk: {
      'cs3-3-1': [r`count starts at 0 and is shared.`, r`Each of the three constructors adds 1.`, r`Ticket.getCount() returns 3.`],
      'cs3-3-2': [r`t1: count becomes 1, number = 1.`, r`t2: count becomes 2, number = 2.`, r`t3 later changes count to 3 but not t2’s number. Prints 2.`],
      'cs3-3-3': [r`getCount is called as Ticket.getCount(), with no object.`, r`number belongs to individual tickets, so “which ticket’s number?” has no answer.`, r`Choice B.`],
      'cs3-3-4': [r`Local x = 3 shadows the instance variable inside f.`, r`this.x refers to the instance variable, 10.`, r`3 + 10 = 13.`],
      'cs3-3-5': [r`In ⟦age = age⟧, both names refer to the parameter, which shadows the instance variable.`, r`So the parameter is assigned to itself; the object’s age is untouched.`, r`getAge() still returns 4. Fix: ⟦this.age = age;⟧.`],
      'cs3-3-6': [r`temp exists only inside the loop body; a new temp is made each pass.`, r`temp = 0, 2, 4 → total = 6.`, r`Printed 6.`],
    },
    teach: {
      plan: [r`Use the notebook vs whiteboard picture for instance vs static variables.`, r`Trace three Ticket constructions in a table.`, r`Ask why a static method cannot use number.`, r`Draw scope as nested boxes (class, method, loop).`, r`Show the ⟦age = age⟧ bug and fix it with this.`],
      questions: [
        { q: 'When should a variable be static?', a: 'When it describes the class as a whole rather than one object, like a count of objects created or a shared constant.' },
        { q: 'Can an instance method use a static variable?', a: 'Yes. Instance methods can use both instance and static variables; only static methods are restricted.' },
        { q: 'Do I always need this?', a: r`Only when a local name hides an instance variable, or to pass the current object somewhere. Otherwise ⟦name⟧ already means the instance variable.` },
      ],
      keyPoints: ['static variables are shared; static methods have no object.', 'Scope: block → method → class.', 'Local names shadow instance variables.', 'this.x means the current object’s x.'],
    },
  },
};

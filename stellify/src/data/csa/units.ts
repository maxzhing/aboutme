import type { CalcUnit } from '../calc/types';

/**
 * AP Computer Science A, organized by the four units of the current College Board course framework,
 * with approximate exam weights and a self-study pace that fits a school year.
 */
export const CSA_UNITS: CalcUnit[] = [
  { n: 1, title: 'Using Objects and Methods', weeks: 6, examWeight: '15–25%', summary: 'How programs run, variables and primitive types, expressions and casting, calling methods (including the Math class), creating objects, and working with Strings.',
    topics: ['Algorithms, programming and compilers', 'Variables and primitive types', 'Expressions, assignment and compound assignment', 'Casting and the range of variables', 'APIs, documentation and method signatures', 'Calling class methods; the Math class', 'Objects, instantiation and references', 'Calling instance methods; String methods'] },
  { n: 2, title: 'Selection and Iteration', weeks: 7, examWeight: '25–35%', summary: 'Boolean expressions, if statements, compound logic and De Morgan’s laws, while and for loops, standard loop and String algorithms, nested loops and informal run-time analysis.',
    topics: ['Boolean expressions and relational operators', 'if, if-else and else-if chains', 'Compound Boolean expressions and short-circuiting', 'Equivalent Boolean expressions; De Morgan’s laws', 'while loops and for loops', 'Standard loop algorithms (sum, count, min, max, digits)', 'String traversal algorithms', 'Nested iteration and statement execution counts'] },
  { n: 3, title: 'Class Creation', weeks: 5, examWeight: '10–18%', summary: 'Designing and writing your own classes: instance variables, constructors, accessor and mutator methods, passing and returning objects, static members, scope and the keyword this.',
    topics: ['Abstraction and program design', 'Anatomy of a class: private data, public methods', 'Constructors', 'Writing methods: accessors and mutators', 'Passing and returning object references', 'Class (static) variables and methods', 'Scope and access', 'The this keyword'] },
  { n: 4, title: 'Data Collections', weeks: 10, examWeight: '30–40%', summary: 'Arrays, ArrayLists and 2D arrays with their standard algorithms, data sets and text files, wrapper classes, searching and sorting, and recursion.',
    topics: ['Ethical and social issues of data collection', 'Arrays: creation, access and traversal', 'Standard array algorithms', 'Text files and data sets', 'Wrapper classes and ArrayList methods', 'ArrayList traversal and algorithms', '2D arrays: creation, traversal and algorithms', 'Linear and binary search', 'Selection, insertion and merge sort', 'Recursion and recursive searching and sorting'] },
];

import type { LessonTutor } from '../types';

const r = String.raw;

/** Tutor layer · Unit 10 (lessons 5–7): Taylor polynomials and power series. */
export const TUTOR10B: Record<string, LessonTutor> = {
  'c10-5': {
    bigIdea: [
      r`Calculators can’t really “know” $e^{0.2}$ or $\cos 1$. They use polynomials, because polynomials only need adding and multiplying. The question is: which polynomial best imitates a function near a point?`,
      r`A tangent line matches the function’s value and slope at one point. A Taylor polynomial goes further: it also matches the second derivative (bending), the third, and so on. Each extra matched derivative makes it hug the curve more closely and for longer.`,
      r`The recipe: the coefficient of $(x - a)^k$ is $\frac{f^{(k)}(a)}{k!}$. And the Lagrange error bound tells you the worst-case error: roughly, the next term you didn’t include, using the largest possible size of the next derivative.`,
    ],
    picture: { title: 'Copying a signature', t: r`To forge a signature (legally, for a class project), first get the starting point right, then the initial direction, then how it curves, then how the curve changes… Each detail you match makes the copy closer, at least near the start. Taylor polynomials copy a function detail by detail.` },
    words: [
      { term: 'Taylor polynomial', means: r`$T_n(x) = \sum_{k=0}^n \frac{f^{(k)}(a)}{k!}(x - a)^k$, matching $f$ and its first $n$ derivatives at $a$.` },
      { term: 'Maclaurin polynomial', means: r`A Taylor polynomial centered at $a = 0$.` },
      { term: 'Center', means: r`The point $a$ where the polynomial matches the function.` },
      { term: 'Lagrange error bound', means: r`$|f(x) - T_n(x)| \le \frac{M}{(n + 1)!}|x - a|^{n+1}$, with $M \ge |f^{(n+1)}|$ between $a$ and $x$.` },
      { term: r`Factorial $k!$`, means: r`$k! = 1 \cdot 2 \cdots k$; $0! = 1$, $2! = 2$, $3! = 6$, $4! = 24$.` },
    ],
    tools: [
      { name: 'Linear approximation', refresher: r`$T_1(x) = f(a) + f'(a)(x - a)$ is the tangent line.`, lesson: 'c4-3' },
      { name: 'Higher derivatives', refresher: r`$\sin \to \cos \to -\sin \to -\cos$; $e^x$ stays $e^x$.`, lesson: 'c3-5' },
      { name: 'Exponent arithmetic', refresher: r`$(0.5)^3 = 0.125$, $(0.1)^3 = 0.001$.`, lesson: 'c0-5' },
    ],
    why: [
      [r`Every derivative of $e^x$ is $e^x$, which is 1 at 0, so the coefficients are $\frac{1}{0!}, \frac{1}{1!}, \frac{1}{2!}$.`, r`Plug in $0.2$; the answer 1.22 is extremely close to the true $1.2214$.`],
      [r`With degree $n = 2$, the error uses the third derivative’s bound $M = 12$, the $(n + 1)! = 3! = 6$, and the distance from the center, $0.5$, cubed.`, r`$\frac{12}{6} = 2$ and $0.5^3 = 0.125$, so the worst-case error is 0.25.`],
    ],
    walk: {
      'c10-5-1': [r`For $e^x$ at 0: $f(0) = f'(0) = f''(0) = 1$.`, r`$T_2(x) = 1 + x + \frac{x^2}{2!} = 1 + x + \frac{x^2}{2}$.`, r`$T_2(0.2) = 1 + 0.2 + \frac{0.04}{2} = 1.22$.`],
      'c10-5-2': [r`Derivatives of $\sin x$: $\cos x$, $-\sin x$, $-\cos x$. So $f'''(0) = -\cos 0 = -1$.`, r`Coefficient of $x^3$: $\frac{f'''(0)}{3!} = \frac{-1}{6}$.`, r`Answer: $-\frac{1}{6}$.`],
      'c10-5-3': [r`$T_2(x) = f(2) + f'(2)(x - 2) + \frac{f''(2)}{2!}(x - 2)^2$.`, r`$= 1 + 3(x - 2) - 2(x - 2)^2$ (since $\frac{-4}{2} = -2$).`, r`At $x = 2.4$: $1 + 3(0.4) - 2(0.16) = 1 + 1.2 - 0.32 = 1.88$.`],
      'c10-5-4': [r`Derivatives of $\ln(1 + x)$ at 0: $f = 0$, $f' = 1$, $f'' = -1$, $f''' = 2$.`, r`$T_3(x) = x - \frac{x^2}{2} + \frac{2x^3}{6} = x - \frac{x^2}{2} + \frac{x^3}{3}$.`, r`$T_3(0.1) = 0.1 - 0.005 + 0.000333 \approx 0.0953$.`],
      'c10-5-5': [r`Degree $n = 2$, so use the third derivative: $M = 12$.`, r`Distance from center: $|1.5 - 1| = 0.5$.`, r`Bound $= \frac{12}{3!}(0.5)^3 = 2 \times 0.125 = 0.25$.`],
      'c10-5-6': [r`Derivatives of $\cos x$ at 0 cycle: $1, 0, -1, 0, 1$.`, r`$T_4(x) = 1 - \frac{x^2}{2!} + \frac{x^4}{4!} = 1 - \frac{x^2}{2} + \frac{x^4}{24}$.`, r`$T_4(1) = 1 - \frac{1}{2} + \frac{1}{24} = \frac{13}{24} \approx 0.5417$ (true $\cos 1 \approx 0.5403$).`],
    },
    teach: {
      plan: [r`Graph $e^x$ with its tangent line, then add the $\frac{x^2}{2}$ term and watch the fit improve.`, r`Explain the coefficient formula: why divide by $k!$ (differentiating $x^k$ $k$ times gives $k!$).`, r`Build $T_2$ for $e^x$ and $T_4$ for $\cos x$.`, r`Approximate a value and compare with a calculator.`, r`Teach the Lagrange error bound as “the next term, worst case”.`],
      questions: [
        { q: 'Why divide by k!?', a: r`So the $k$-th derivative of the polynomial matches: differentiating $\frac{c}{k!}x^k$ $k$ times leaves exactly $c$.` },
        { q: 'Is a higher degree always better?', a: 'Near the center, yes. Far from the center, a Taylor polynomial can still be poor, and for some functions it never works beyond a certain distance.' },
        { q: 'What is M in the error bound?', a: r`The biggest the $(n + 1)$-th derivative gets (in absolute value) between the center and $x$. Problems usually give it.` },
      ],
      keyPoints: ['Coefficient of (x − a)ᵏ is f⁽ᵏ⁾(a)/k!.', 'More terms ⇒ better approximation near the center.', 'Lagrange: |error| ≤ M|x − a|ⁿ⁺¹/(n + 1)!.', 'Maclaurin = centered at 0.'],
    },
  },
  'c10-6': {
    bigIdea: [
      r`A power series is a Taylor polynomial that never stops: $\sum c_n(x - a)^n$. It is a function, but a strange one: for some $x$ the infinite sum settles to a number, for others it blows up.`,
      r`It turns out the good $x$-values always form an interval centered at $a$. Its half-width is the radius of convergence $R$. Inside the interval ($|x - a| < R$) the series converges; outside it diverges.`,
      r`To find $R$, use the ratio test with $x$ still in it, and solve “limit $< 1$” for $x$. The two endpoints are special: there the ratio test gives exactly 1, so you must test each endpoint separately by plugging it in and using another test.`,
    ],
    picture: { title: 'A Wi-Fi signal', t: r`A router’s signal works inside a certain radius and fails outside it. Right at the edge, it might work or not, and you have to check each spot. A power series is the same: it converges within distance $R$ of its center, diverges beyond, and the edges must be tested one by one.` },
    words: [
      { term: 'Power series', means: r`$\sum_{n=0}^\infty c_n(x - a)^n$, centered at $a$.` },
      { term: r`Radius of convergence $R$`, means: r`The series converges for $|x - a| < R$ and diverges for $|x - a| > R$.` },
      { term: 'Interval of convergence', means: 'All x where the series converges, including any endpoints that work.' },
      { term: 'Endpoints', means: r`$x = a - R$ and $x = a + R$; each must be tested separately.` },
    ],
    tools: [
      { name: 'Ratio test', refresher: r`Converges when $\lim\left|\frac{a_{n+1}}{a_n}\right| < 1$.`, lesson: 'c10-4' },
      { name: 'p-series and AST', refresher: 'Endpoint series are often harmonic, alternating harmonic, or p-series.', lesson: 'c10-3' },
      { name: 'Absolute value inequalities', refresher: r`$|x - 2| < 1$ means $1 < x < 3$.`, lesson: 'c0-2' },
    ],
    why: [
      [r`The ratio of consecutive terms is $\frac{|x|}{3}$; the ratio test needs that below 1.`, r`$|x| < 3$: the series works within 3 of the center 0.`],
      [r`The ratio $\frac{n}{n + 1}|x - 2| \to |x - 2|$; below 1 gives the open interval.`, r`At the endpoints the ratio test is useless, so plug them in: $x = 3$ gives $\sum\frac{1}{n}$ and $x = 1$ gives $\sum\frac{(-1)^n}{n}$.`, r`Include only the endpoint that converges.`],
    ],
    walk: {
      'c10-6-1': [r`It is geometric with ratio $\frac{x}{3}$.`, r`Converges when $\left|\frac{x}{3}\right| < 1$, i.e. $|x| < 3$.`, r`$R = 3$.`],
      'c10-6-2': [r`Ratio test: $\left|\frac{(x - 2)^{n+1}/(n + 1)}{(x - 2)^n/n}\right| = \frac{n}{n + 1}|x - 2| \to |x - 2| < 1$, so $1 < x < 3$.`, r`$x = 3$: $\sum\frac{1}{n}$, harmonic: diverges. Exclude 3.`, r`$x = 1$: $\sum\frac{(-1)^n}{n}$, alternating harmonic: converges. Include 1.`, r`Interval: $[1, 3)$. Choice C.`],
      'c10-6-3': [r`Ratio: $\frac{(n + 1)|x|^{n+1}}{n|x|^n} = \frac{n + 1}{n}|x| \to |x|$.`, r`Need $|x| < 1$.`, r`$R = 1$.`],
      'c10-6-4': [r`Ratio: $\frac{|x|^{n+1}/(n + 1)!}{|x|^n/n!} = \frac{|x|}{n + 1}$.`, r`For ANY fixed $x$, this goes to 0 as $n \to \infty$, which is less than 1.`, r`It converges for every $x$: $R = \infty$. (It is the series for $e^x$!)`],
      'c10-6-5': [r`Ratio: $\frac{2^{n+1}|x|^{n+1}/(n + 1)}{2^n|x|^n/n} = \frac{2n}{n + 1}|x| \to 2|x|$.`, r`Need $2|x| < 1$, so $|x| < \frac{1}{2}$.`, r`$R = \frac{1}{2}$.`],
      'c10-6-6': [r`Ratio: $\frac{|x + 1|^{n+1}}{4^{n+1}\sqrt{n + 1}}\cdot\frac{4^n\sqrt{n}}{|x + 1|^n} = \frac{|x + 1|}{4}\sqrt{\frac{n}{n + 1}} \to \frac{|x + 1|}{4}$.`, r`Need $|x + 1| < 4$: radius $R = 4$, centered at $-1$.`, r`The interval runs from $-5$ to $3$ (endpoints may or may not be included, but they don’t change the length).`, r`Length $= 2R = 8$.`],
    },
    teach: {
      plan: [r`Show a power series as an “infinite polynomial” and test a few $x$ values on a calculator.`, r`Use the Wi-Fi picture for the radius of convergence.`, r`Run the ratio test with $x$ inside it on $\sum\frac{x^n}{3^n}$.`, r`Do a full interval of convergence with endpoint testing.`, r`Write the four-step checklist.`],
      questions: [
        { q: 'Why do endpoints need separate testing?', a: 'At the endpoints, the ratio test limit equals exactly 1, which is inconclusive. You must plug them in and use another test.' },
        { q: 'Can R be 0 or infinity?', a: r`Yes. $R = 0$ means it only works at the center; $R = \infty$ means it works everywhere (like the series for $e^x$).` },
        { q: 'Is the interval always centered at a?', a: r`Yes, the convergence region is always centered at the series’ center $a$; only the endpoints can differ.` },
      ],
      keyPoints: ['Ratio test with x gives |x − a| < R.', 'Test each endpoint separately with another test.', 'Interval of convergence is centered at a.', 'R can be 0, a positive number, or ∞.'],
    },
  },
  'c10-7': {
    bigIdea: [
      r`A handful of famous functions have power series you should know by heart: $e^x$, $\sin x$, $\cos x$, $\frac{1}{1 - x}$, $\ln(1 + x)$ and $\arctan x$. They are like the multiplication table of series.`,
      r`From these six you can build almost any series you need without taking a single derivative: substitute something for $x$ (like $-x^2$ into $e^x$), multiply by a power of $x$, or differentiate or integrate term by term.`,
      r`Series are also problem-solving tools. Hard limits become easy when you replace functions by their series. Famous sums become recognizable (like $\sum\frac{2^n}{n!} = e^2$). And a series’ coefficients reveal all the derivatives at the center: $f^{(n)}(0) = n! \cdot c_n$.`,
    ],
    picture: { title: 'A recipe book', t: r`Instead of inventing every dish from scratch, a good cook starts from a few base recipes (stock, dough, sauce) and modifies them. The six known series are your base recipes; substitution, multiplication, differentiation and integration are the modifications.` },
    words: [
      { term: 'Maclaurin series', means: r`A power series centered at 0: $\sum\frac{f^{(n)}(0)}{n!}x^n$.` },
      { term: 'Substitution', means: r`Replace $x$ by an expression: $e^{-x^2} = 1 - x^2 + \frac{x^4}{2!} - \cdots$.` },
      { term: 'Term-by-term', means: 'Differentiating or integrating each term of a series separately.' },
      { term: r`Coefficient $c_n$`, means: r`The number in front of $x^n$; $c_n = \frac{f^{(n)}(0)}{n!}$.` },
    ],
    tools: [
      { name: 'Taylor coefficients', refresher: r`$c_k = \frac{f^{(k)}(a)}{k!}$.`, lesson: 'c10-5' },
      { name: 'Geometric series', refresher: r`$\frac{1}{1 - x} = 1 + x + x^2 + \cdots$ for $|x| < 1$.`, lesson: 'c10-1' },
      { name: 'Special limits', refresher: r`$\frac{1 - \cos x}{x^2} \to \frac{1}{2}$, now proved with series.`, lesson: 'c1-5' },
    ],
    why: [
      [r`Replace $\cos x$ by its series; the 1’s cancel, leaving terms that all contain at least $x^2$.`, r`Divide by $x^2$ term by term; every term except $\frac{1}{2}$ still has an $x$, so they vanish as $x \to 0$.`],
      [r`Substitute $x^2$ into $e^u = 1 + u + \frac{u^2}{2!} + \cdots$; the $x^4$ term comes from $\frac{u^2}{2!} = \frac{x^4}{2}$.`, r`The coefficient is $\frac{f^{(4)}(0)}{4!}$, so multiply back by $4! = 24$.`],
    ],
    walk: {
      'c10-7-1': [r`$\cos x = 1 - \frac{x^2}{2} + \frac{x^4}{24} - \cdots$, so $1 - \cos x = \frac{x^2}{2} - \frac{x^4}{24} + \cdots$.`, r`Divide by $x^2$: $\frac{1}{2} - \frac{x^2}{24} + \cdots$.`, r`As $x \to 0$: $\frac{1}{2}$.`],
      'c10-7-2': [r`$\sin x = x - \frac{x^3}{6} + \frac{x^5}{120} - \cdots$, so $\sin x - x = -\frac{x^3}{6} + \frac{x^5}{120} - \cdots$.`, r`Divide by $x^3$: $-\frac{1}{6} + \frac{x^2}{120} - \cdots$.`, r`As $x \to 0$: $-\frac{1}{6}$.`],
      'c10-7-3': [r`Start from $e^u = 1 + u + \frac{u^2}{2} + \cdots$ and substitute $u = -x^2$: $1 - x^2 + \frac{x^4}{2} - \cdots$.`, r`Multiply by $x$: $x - x^3 + \frac{x^5}{2} - \cdots$.`, r`The coefficient of $x^5$ is $\frac{1}{2}$.`],
      'c10-7-4': [r`Compare with $e^x = \sum\frac{x^n}{n!}$.`, r`$\frac{(-1)^n}{n!}$ is $\frac{x^n}{n!}$ with $x = -1$.`, r`So the sum is $e^{-1} = \frac{1}{e} \approx 0.368$.`],
      'c10-7-5': [r`Compare with $e^x = \sum\frac{x^n}{n!}$.`, r`This is $x = 2$.`, r`$e^2 \approx 7.389$.`],
      'c10-7-6': [r`Compare with $\cos x = \sum\frac{(-1)^n x^{2n}}{(2n)!}$.`, r`Here $x^{2n} = \pi^{2n}$, so $x = \pi$.`, r`$\cos\pi = -1$.`],
      'c10-7-7': [r`$e^{x^2} = 1 + x^2 + \frac{(x^2)^2}{2!} + \cdots = 1 + x^2 + \frac{x^4}{2} + \cdots$.`, r`The coefficient of $x^4$ is $c_4 = \frac{1}{2}$.`, r`$c_4 = \frac{f^{(4)}(0)}{4!}$, so $f^{(4)}(0) = 24 \cdot \frac{1}{2} = 12$.`],
    },
    teach: {
      plan: [r`Write the six key series on the board and point out patterns (factorials, alternating signs, odd/even powers).`, r`Build $e^{-x^2}$ by substitution and $x\cos x$ by multiplication.`, r`Differentiate $\frac{1}{1 - x}$ term by term to get $\frac{1}{(1 - x)^2}$.`, r`Use series to solve $\lim\frac{\sin x - x}{x^3}$.`, r`Recognize a few famous sums, and read a derivative from a coefficient.`],
      questions: [
        { q: 'Do I really need to memorize six series?', a: 'Yes, they appear on every BC exam. Notice patterns: sin has odd powers, cos has even powers, both alternate and use factorials.' },
        { q: 'Why can I substitute into a series?', a: r`A series is an identity for every $x$ in its interval, so replacing $x$ by $-x^2$ keeps it true (as long as $-x^2$ is still in the interval).` },
        { q: 'How does a coefficient give a derivative?', a: r`By the Taylor formula $c_n = \frac{f^{(n)}(0)}{n!}$; multiply by $n!$ to get the derivative.` },
      ],
      keyPoints: ['Know eˣ, sin x, cos x, 1/(1 − x), ln(1 + x), arctan x.', 'Build new series by substituting, multiplying, differentiating, integrating.', 'Series turn hard limits into easy ones.', 'f⁽ⁿ⁾(0) = n! · cₙ.'],
    },
  },
};

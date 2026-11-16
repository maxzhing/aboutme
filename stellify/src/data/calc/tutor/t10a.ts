import type { LessonTutor } from '../types';

const r = String.raw;

/** Tutor layer · Unit 10 (lessons 1–4): series and convergence tests. */
export const TUTOR10A: Record<string, LessonTutor> = {
  'c10-1': {
    bigIdea: [
      r`Walk halfway to a wall, then half of what is left, then half again: $\frac{1}{2} + \frac{1}{4} + \frac{1}{8} + \cdots$. You take infinitely many steps, yet you never pass the wall: the total is exactly 1. Adding infinitely many numbers and getting a finite answer is what a convergent series is.`,
      r`A sequence is a list of numbers $a_1, a_2, a_3, \ldots$. A series is what you get when you add them up. To make sense of an infinite sum, look at the partial sums $S_N$ (the sum of the first $N$ terms). If they settle down to a number, the series converges to that number; otherwise it diverges.`,
      r`Geometric series (each term is the previous one times the same ratio $r$) are the stars: they converge exactly when $|r| < 1$, to $\frac{\text{first term}}{1 - r}$. And one quick test applies to every series: if the terms do not shrink to 0, the sum can’t possibly settle down, so it diverges.`,
    ],
    picture: { title: 'Pouring water into a glass', t: r`Pour half a glass, then a quarter, then an eighth… The glass fills up but never overflows: the amounts add to exactly one glass. But if you kept pouring a whole glass each time (terms not shrinking), it would overflow forever: divergence.` },
    words: [
      { term: 'Sequence', means: r`An ordered list $a_1, a_2, a_3, \ldots$.` },
      { term: 'Series', means: r`The sum $a_1 + a_2 + a_3 + \cdots$, written $\sum a_n$.` },
      { term: r`Partial sum $S_N$`, means: r`The sum of the first $N$ terms.` },
      { term: 'Converges / diverges', means: 'The partial sums approach a number / do not.' },
      { term: 'Geometric series', means: r`$\sum ar^n$: each term is the previous times $r$.` },
      { term: 'Telescoping series', means: 'A series whose partial sums collapse because terms cancel in pairs.' },
    ],
    tools: [
      { name: 'Limits at infinity', refresher: r`$\frac{3n^2 + 1}{n^2 - 5} \to 3$ (ratio of leading coefficients).`, lesson: 'c1-7' },
      { name: 'Fractions', refresher: r`$\frac{5}{3/2} = \frac{10}{3}$; $\frac{27}{99} = \frac{3}{11}$.`, lesson: 'c0-1' },
      { name: 'Partial fractions', refresher: r`$\frac{1}{n(n + 1)} = \frac{1}{n} - \frac{1}{n + 1}$.`, lesson: 'c6-7' },
    ],
    why: [
      [r`Identify the first term (at $n = 0$, it is $5$) and the ratio between terms ($-\frac{1}{2}$). $|r| < 1$, so it converges.`, r`Use first term over $(1 - r)$: $1 - (-\frac{1}{2}) = \frac{3}{2}$.`],
      [r`Splitting each term into a difference makes neighbors cancel: $(1 - \frac{1}{2}) + (\frac{1}{2} - \frac{1}{3}) + \cdots$.`, r`Everything in the middle cancels, leaving $1 - \frac{1}{N + 1}$, which goes to 1.`],
    ],
    walk: {
      'c10-1-1': [r`This is a limit of a sequence; treat $n$ like $x \to \infty$.`, r`Top and bottom both have degree 2; divide by $n^2$: $\frac{3 + 1/n^2}{1 - 5/n^2}$.`, r`As $n \to \infty$: $\frac{3}{1} = 3$.`],
      'c10-1-2': [r`Geometric: first term ($n = 0$) is $1$; ratio $r = \frac{1}{3}$.`, r`$|r| < 1$, so it converges.`, r`Sum $= \frac{1}{1 - 1/3} = \frac{1}{2/3} = \frac{3}{2}$.`],
      'c10-1-3': [r`First term 5, ratio $-\frac{1}{2}$ (signs alternate).`, r`$|r| = \frac{1}{2} < 1$: converges.`, r`$\frac{5}{1 + 1/2} = \frac{5}{3/2} = \frac{10}{3} \approx 3.333$.`],
      'c10-1-4': [r`The nth-term test: check what the terms approach.`, r`$\frac{n}{n + 1} \to 1$ (try $n = 1000$: $0.999$).`, r`Terms approach 1, not 0, so the sum keeps growing: it diverges. Choice B.`],
      'c10-1-5': [r`$0.272727\ldots = 0.27 + 0.0027 + 0.000027 + \cdots$.`, r`Geometric with first term $\frac{27}{100}$ and ratio $\frac{1}{100}$.`, r`Sum $= \frac{27/100}{1 - 1/100} = \frac{27/100}{99/100} = \frac{27}{99} = \frac{3}{11}$.`],
      'c10-1-6': [r`Split: $\frac{1}{n(n + 1)} = \frac{1}{n} - \frac{1}{n + 1}$.`, r`$S_N = \left(1 - \frac{1}{2}\right) + \left(\frac{1}{2} - \frac{1}{3}\right) + \cdots + \left(\frac{1}{N} - \frac{1}{N + 1}\right) = 1 - \frac{1}{N + 1}$.`, r`As $N \to \infty$, $\frac{1}{N + 1} \to 0$, so the sum is $1$.`],
    },
    teach: {
      plan: [r`Tell the walking-to-the-wall story and draw a square divided into halves, quarters, eighths.`, r`Define sequence, series and partial sums; compute a few partial sums of $\frac{1}{2^n}$.`, r`Derive the geometric sum formula and when it works.`, r`Teach the nth-term test and its big warning.`, r`Show a telescoping series collapsing.`],
      questions: [
        { q: 'How can infinitely many positive numbers add to something finite?', a: 'If they shrink fast enough, each new term adds less and less, and the total approaches a ceiling it never crosses, like 1/2 + 1/4 + 1/8 + … → 1.' },
        { q: 'If the terms go to 0, does the series converge?', a: r`Not necessarily! The harmonic series $1 + \frac{1}{2} + \frac{1}{3} + \cdots$ has terms going to 0 but still grows without bound.` },
        { q: 'Where does a/(1 − r) come from?', a: r`$S = a + ar + ar^2 + \cdots$ and $rS = ar + ar^2 + \cdots$. Subtract: $S - rS = a$, so $S = \frac{a}{1 - r}$.` },
      ],
      keyPoints: ['A series converges if its partial sums approach a number.', 'Geometric: Σarⁿ = a/(1 − r) when |r| < 1.', 'Terms not → 0 ⇒ diverges (nth-term test).', 'Terms → 0 alone does not prove convergence.'],
    },
  },
  'c10-2': {
    bigIdea: [
      r`Most series can’t be summed exactly, but we can still decide whether they converge. The idea is comparison: relate the series to something we already understand.`,
      r`Our measuring sticks are the p-series $\sum \frac{1}{n^p}$. They converge when $p > 1$ (the terms shrink fast enough) and diverge when $p \le 1$. Why? The integral test: a series of positive, decreasing terms behaves like the integral of the same function, and we already know $\int_1^\infty \frac{dx}{x^p}$ converges exactly when $p > 1$.`,
      r`Comparison tests: if your terms are smaller than a convergent series’ terms, your series converges too. If they are bigger than a divergent series’ terms, yours diverges. The limit comparison test is the practical version: if your terms behave like $\frac{1}{n^p}$ for large $n$ (their ratio approaches a positive number), your series does what that p-series does.`,
    ],
    picture: { title: 'Comparing piles of coins', t: r`If your pile always has fewer coins than a pile that fits in a box, yours fits in the box too. If yours always has more coins than a pile that overflows every box, yours overflows too. But being smaller than an overflowing pile tells you nothing.` },
    words: [
      { term: 'p-series', means: r`$\sum \frac{1}{n^p}$: converges if $p > 1$, diverges if $p \le 1$.` },
      { term: 'Harmonic series', means: r`$\sum \frac{1}{n}$, the p-series with $p = 1$; it diverges.` },
      { term: 'Integral test', means: r`For positive, continuous, decreasing $f$: $\sum f(n)$ and $\int_1^\infty f(x)\,dx$ both converge or both diverge.` },
      { term: 'Direct comparison test', means: r`$0 \le a_n \le b_n$: $\sum b_n$ converges ⇒ $\sum a_n$ converges; $\sum a_n$ diverges ⇒ $\sum b_n$ diverges.` },
      { term: 'Limit comparison test', means: r`If $\frac{a_n}{b_n} \to c$ with $0 < c < \infty$, both series do the same thing.` },
    ],
    tools: [
      { name: 'Improper integrals', refresher: r`$\int_1^\infty \frac{dx}{x^p}$ converges iff $p > 1$.`, lesson: 'c6-8' },
      { name: 'Dominant terms', refresher: r`$\frac{2n + 1}{n^2 + 3}$ behaves like $\frac{2}{n}$ for large $n$.`, lesson: 'c1-7' },
      { name: 'u-substitution', refresher: r`$\int xe^{-x^2}dx = -\frac{1}{2}e^{-x^2}$.`, lesson: 'c6-5' },
    ],
    why: [
      [r`Making the bottom bigger makes the fraction smaller, so each term is below $\frac{1}{n^2}$, a convergent p-series ($p = 2$).`, r`Smaller than something that converges: it converges too.`],
      [r`For large $n$, the dominant terms give $\frac{2n}{n^2} = \frac{2}{n}$, so compare with $\frac{1}{n}$. The ratio approaches 2.`, r`A finite positive limit means both series behave the same, and $\sum\frac{1}{n}$ diverges.`],
    ],
    walk: {
      'c10-2-1': [r`It is a p-series with $p = 2$.`, r`$p > 1$ means the terms shrink fast enough.`, r`It converges (in fact to $\frac{\pi^2}{6}$). Choice A.`],
      'c10-2-2': [r`$\frac{1}{\sqrt{n}} = \frac{1}{n^{1/2}}$, a p-series with $p = \frac{1}{2}$.`, r`$p \le 1$: the terms shrink too slowly.`, r`It diverges. Choice B.`],
      'c10-2-3': [r`Compare term by term: $n^2 + 5 > n^2$, so $\frac{1}{n^2 + 5} < \frac{1}{n^2}$.`, r`$\sum\frac{1}{n^2}$ converges.`, r`Smaller than a convergent series: converges by direct comparison. Choice C.`],
      'c10-2-4': [r`Dominant behavior: $\frac{2n}{n^2} = \frac{2}{n}$; compare with $b_n = \frac{1}{n}$.`, r`$\frac{a_n}{b_n} = \frac{(2n + 1)n}{n^2 + 3} = \frac{2n^2 + n}{n^2 + 3} \to 2$.`, r`$0 < 2 < \infty$, and $\sum\frac{1}{n}$ diverges, so this diverges too. Choice B.`],
      'c10-2-5': [r`It is a p-series with $p = \frac{k + 1}{3}$.`, r`It converges when $p > 1$: $\frac{k + 1}{3} > 1$, so $k > 2$.`, r`The smallest positive integer is $k = 3$ (giving $p = \frac{4}{3}$).`],
      'c10-2-6': [r`The terms $ne^{-n^2}$ come from $f(x) = xe^{-x^2}$ (positive and decreasing for $x \ge 1$).`, r`$\int_1^b xe^{-x^2}dx = \left[-\frac{1}{2}e^{-x^2}\right]_1^b = -\frac{1}{2}e^{-b^2} + \frac{1}{2e}$.`, r`As $b \to \infty$: $\frac{1}{2e} \approx 0.184$. Finite, so the series converges too (but its sum is not 0.184).`],
      'c10-2-7': [r`$\sum_{n=1}^\infty \frac{1}{n^2} = 1 + \sum_{n=2}^\infty \frac{1}{n^2}$.`, r`So $\sum_{n=2}^\infty = \frac{\pi^2}{6} - 1$.`, r`$\approx 1.645 - 1 = 0.645$.`],
    },
    teach: {
      plan: [r`Show the harmonic series grows forever by grouping: $\frac{1}{3} + \frac{1}{4} > \frac{1}{2}$, $\frac{1}{5} + \cdots + \frac{1}{8} > \frac{1}{2}$, …`, r`Introduce p-series and connect them to improper integrals with a picture of rectangles under a curve.`, r`Teach direct comparison with the coin piles.`, r`Teach limit comparison using dominant terms.`, r`Make a “which test?” chart.`],
      questions: [
        { q: 'Why does 1/n diverge if its terms go to 0?', a: 'Group the terms: 1/3 + 1/4 > 1/2, the next four > 1/2, the next eight > 1/2, and so on. You can collect infinitely many halves, so the sum is infinite.' },
        { q: 'Does the integral tell me the sum of the series?', a: 'No, only whether it converges. The integral and the sum are usually different numbers.' },
        { q: 'How do I choose what to compare with?', a: r`Keep only the highest powers on top and bottom; the result $\frac{c}{n^p}$ tells you which p-series to use.` },
      ],
      keyPoints: ['Σ1/nᵖ converges iff p > 1.', 'Integral test: positive, continuous, decreasing terms.', 'Smaller than convergent ⇒ converges; bigger than divergent ⇒ diverges.', 'Limit comparison with the dominant-term p-series.'],
    },
  },
  'c10-3': {
    bigIdea: [
      r`When signs alternate (plus, minus, plus, minus…), the terms partly cancel. Picture walking forward 1 step, back $\frac{1}{2}$, forward $\frac{1}{3}$, back $\frac{1}{4}$… You zigzag, each swing smaller than the last, homing in on a single spot.`,
      r`That is the alternating series test: if the sizes of the terms decrease and go to 0, an alternating series converges. This is much easier than for positive series: even $1 - \frac{1}{2} + \frac{1}{3} - \cdots$ converges (to $\ln 2$), although $1 + \frac{1}{2} + \frac{1}{3} + \cdots$ does not.`,
      r`Bonus: since each partial sum overshoots or undershoots the target by less than the next step, the error after stopping is at most the first term you left out. That gives a simple, guaranteed accuracy estimate.`,
    ],
    picture: { title: 'A pendulum settling down', t: r`A pendulum swings right, left, right, left, each swing a little shorter, until it rests at the bottom. An alternating series is a pendulum of partial sums settling on its sum. The next swing is always bigger than how far you are from the rest point.` },
    words: [
      { term: 'Alternating series', means: r`A series whose terms alternate in sign, like $\sum (-1)^n b_n$ with $b_n > 0$.` },
      { term: 'Alternating series test (AST)', means: r`If $b_n$ decreases to 0, $\sum (-1)^n b_n$ converges.` },
      { term: 'Error bound', means: r`$|S - S_N| \le b_{N+1}$: at most the first omitted term.` },
      { term: 'Absolute / conditional convergence', means: r`Converges even with all signs positive / converges only because of the alternating signs.` },
    ],
    tools: [
      { name: 'p-series', refresher: r`$\sum\frac{1}{n}$ diverges; $\sum\frac{1}{n^2}$ converges.`, lesson: 'c10-2' },
      { name: 'Solving inequalities', refresher: r`$\frac{1}{N + 1} < 0.01$ means $N + 1 > 100$.`, lesson: 'c0-2' },
      { name: 'arctan and ln values', refresher: r`$\arctan 1 = \frac{\pi}{4}$, $\ln 2 \approx 0.693$.`, lesson: 'c0-7' },
    ],
    why: [
      [r`The series passes the AST ($\frac{1}{n^2}$ decreases to 0), so the error after 4 terms is at most the 5th term’s size.`, r`$\frac{1}{25} = 0.04$.`],
      [r`The error after $N$ terms is at most $b_{N+1} = \frac{1}{N + 1}$; make that less than 0.01.`, r`Solve the inequality: $N + 1 > 100$, so the smallest whole $N$ is 100.`],
    ],
    walk: {
      'c10-3-1': [r`AST: $b_n = \frac{1}{n}$ decreases to 0, so the alternating series converges.`, r`Absolute values: $\sum\frac{1}{n}$, the harmonic series, diverges.`, r`Converges, but only thanks to the signs: conditionally. Choice B.`],
      'c10-3-2': [r`$b_n = \frac{1}{n^2}$ decreases to 0, so the error bound applies.`, r`Using 4 terms, the first omitted term is $b_5 = \frac{1}{25}$.`, r`Error $\le 0.04$.`],
      'c10-3-3': [r`This is a famous sum: $1 - \frac{1}{2} + \frac{1}{3} - \frac{1}{4} + \cdots = \ln 2$.`, r`(It comes from the series for $\ln(1 + x)$ at $x = 1$, Lesson 7.)`, r`$\ln 2 \approx 0.693$.`],
      'c10-3-4': [r`Error after $N$ terms $\le \frac{1}{N + 1}$.`, r`Need $\frac{1}{N + 1} < 0.01$, i.e. $N + 1 > 100$.`, r`$N = 99$ gives exactly 0.01 (not less), so $N = 100$.`],
      'c10-3-5': [r`This is the arctangent series $x - \frac{x^3}{3} + \frac{x^5}{5} - \cdots$ at $x = 1$.`, r`So it equals $\arctan 1$.`, r`$= \frac{\pi}{4} \approx 0.785$.`],
      'c10-3-6': [r`Check absolute values first: $\sum\frac{1}{n^2}$.`, r`That is a p-series with $p = 2 > 1$: it converges.`, r`So the series converges absolutely. Choice A.`],
    },
    teach: {
      plan: [r`Act out the zigzag walk: forward 1, back ½, forward ⅓…`, r`State the AST and its two conditions.`, r`Show partial sums of $1 - \frac{1}{2} + \frac{1}{3} - \cdots$ bouncing around $\ln 2$.`, r`Teach the error bound and find how many terms are needed.`, r`Explain absolute vs conditional convergence with two examples.`],
      questions: [
        { q: 'Why is the error less than the next term?', a: 'The partial sums jump back and forth across the true sum, each jump the size of the next term, so you are never farther away than the next jump.' },
        { q: 'Does every alternating series converge?', a: r`No. The term sizes must shrink to 0. $1 - 2 + 3 - 4 + \cdots$ diverges.` },
        { q: 'What does conditional convergence mean?', a: 'The series converges only because the signs alternate; with all positive signs it would diverge.' },
      ],
      keyPoints: ['AST: sizes decreasing to 0 ⇒ converges.', 'Error ≤ first omitted term.', 'Check Σ|aₙ| for absolute convergence.', 'Conditional: converges, but not absolutely.'],
    },
  },
  'c10-4': {
    bigIdea: [
      r`The ratio test asks a simple question: in the long run, how does each term compare to the one before it? Compute $\left|\frac{a_{n+1}}{a_n}\right|$ and take its limit $L$.`,
      r`If $L < 1$, the terms eventually shrink by a steady factor, like a geometric series with ratio less than 1: the series converges (absolutely). If $L > 1$, the terms eventually grow: it diverges. If $L = 1$, the test can’t tell; try another test.`,
      r`The ratio test shines with factorials and powers like $2^n$, because the ratios simplify beautifully: $\frac{(n + 1)!}{n!} = n + 1$ and $\frac{2^{n+1}}{2^n} = 2$. It is also the main tool for power series in Lesson 6.`,
    ],
    picture: { title: 'A shrinking photocopy', t: r`Photocopy a picture at 50% size, then copy the copy at 50%, and so on. The pictures shrink geometrically, and laid end to end they have finite total length. The ratio test checks whether a series eventually “copies itself” at less than 100%.` },
    words: [
      { term: 'Ratio test', means: r`$L = \lim\left|\frac{a_{n+1}}{a_n}\right|$: $L < 1$ converges absolutely, $L > 1$ diverges, $L = 1$ inconclusive.` },
      { term: r`Factorial $n!$`, means: r`$n! = 1 \cdot 2 \cdot 3 \cdots n$; $\frac{(n + 1)!}{n!} = n + 1$.` },
      { term: 'Absolutely convergent', means: r`$\sum |a_n|$ converges; then $\sum a_n$ converges too.` },
      { term: 'Inconclusive', means: 'The test gives no information; use a different test.' },
    ],
    tools: [
      { name: 'Geometric series', refresher: r`$\sum ar^n$ converges iff $|r| < 1$.`, lesson: 'c10-1' },
      { name: 'Limits of ratios', refresher: r`$\frac{n + 1}{2n} \to \frac{1}{2}$.`, lesson: 'c1-7' },
      { name: 'Alternating series test', refresher: r`For $\sum\frac{(-1)^n}{\sqrt{n}}$.`, lesson: 'c10-3' },
    ],
    why: [
      [r`Write the next term over the current term and flip the division into multiplication; the powers of 2 cancel down to a single $\frac{1}{2}$.`, r`The ratio approaches $\frac{1}{2} < 1$: eventually each term is about half the previous one, so it converges.`],
      [r`Factorials cancel: $\frac{(n + 1)!}{n!} = n + 1$, and powers of 10 leave one factor of 10.`, r`The ratio grows without bound, so the terms explode: diverges.`],
    ],
    walk: {
      'c10-4-1': [r`$a_n = \frac{n}{2^n}$, $a_{n+1} = \frac{n + 1}{2^{n+1}}$.`, r`$\frac{a_{n+1}}{a_n} = \frac{n + 1}{2^{n+1}}\cdot\frac{2^n}{n} = \frac{n + 1}{2n}$.`, r`As $n \to \infty$: $\frac{1}{2}$.`],
      'c10-4-2': [r`$\frac{a_{n+1}}{a_n} = \frac{(n + 1)!}{10^{n+1}}\cdot\frac{10^n}{n!} = \frac{n + 1}{10}$.`, r`This grows without bound: $L = \infty$.`, r`$L > 1$: diverges. Choice B. (Factorials eventually beat any power.)`],
      'c10-4-3': [r`$\frac{a_{n+1}}{a_n} = \frac{1/(n + 1)!}{1/n!} = \frac{n!}{(n + 1)!} = \frac{1}{n + 1}$.`, r`As $n \to \infty$: $0$.`, r`$L = 0 < 1$, so $\sum\frac{1}{n!}$ converges (to $e$, it turns out).`],
      'c10-4-4': [r`Known result: $\sum_{n=1}^\infty nx^n = \frac{x}{(1 - x)^2}$ for $|x| < 1$ (differentiate the geometric series and multiply by $x$).`, r`With $x = \frac{1}{2}$: $\frac{1/2}{(1/2)^2} = \frac{1/2}{1/4}$.`, r`$= 2$.`],
      'c10-4-5': [r`AST: $\frac{1}{\sqrt{n}}$ decreases to 0, so it converges.`, r`Absolute values: $\sum\frac{1}{\sqrt{n}}$ is a p-series with $p = \frac{1}{2}$: diverges.`, r`So it converges conditionally. Choice B. (The ratio test gives $L = 1$ here, which is inconclusive.)`],
      'c10-4-6': [r`Known result: $\sum n^2x^n = \frac{x(1 + x)}{(1 - x)^3}$ for $|x| < 1$.`, r`With $x = \frac{1}{3}$: top $\frac{1}{3}\cdot\frac{4}{3} = \frac{4}{9}$; bottom $\left(\frac{2}{3}\right)^3 = \frac{8}{27}$.`, r`$\frac{4/9}{8/27} = \frac{4}{9}\cdot\frac{27}{8} = \frac{3}{2}$.`],
    },
    teach: {
      plan: [r`Compare a geometric series’ constant ratio with a series whose ratio settles toward a number.`, r`State the ratio test and its three outcomes.`, r`Practice simplifying ratios with factorials and powers.`, r`Show that p-series always give $L = 1$ (inconclusive).`, r`Classify series as absolutely convergent, conditionally convergent or divergent.`],
      questions: [
        { q: 'Why does L = 1 tell us nothing?', a: r`Both $\sum\frac{1}{n}$ (diverges) and $\sum\frac{1}{n^2}$ (converges) give $L = 1$, so that value can’t decide.` },
        { q: 'When should I reach for the ratio test?', a: r`When you see factorials, powers like $3^n$, or products of them with powers of $n$.` },
        { q: 'Does absolute convergence imply convergence?', a: 'Yes. If the series converges even with all terms made positive, the original (with some negatives) converges too.' },
      ],
      keyPoints: ['L = lim |aₙ₊₁/aₙ|.', 'L < 1 converges absolutely; L > 1 diverges; L = 1 inconclusive.', 'Use it for factorials and exponentials.', 'Absolute convergence ⇒ convergence.'],
    },
  },
};

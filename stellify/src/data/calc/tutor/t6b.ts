import type { LessonTutor } from '../types';

const r = String.raw;

/** Tutor layer · Unit 6 (lessons 5–8): integration techniques and improper integrals. */
export const TUTOR6B: Record<string, LessonTutor> = {
  'c6-5': {
    bigIdea: [
      r`The chain rule makes derivatives of nested functions: $\frac{d}{dx}(x^2 + 1)^4 = 4(x^2 + 1)^3 \cdot 2x$. So when you see an integral like $\int 2x(x^2 + 1)^3\,dx$, it is the chain rule’s fingerprint: a function of an inside, multiplied by the inside’s derivative.`,
      r`u-substitution makes that fingerprint obvious. Name the inside $u = x^2 + 1$. Then its derivative piece $2x\,dx$ becomes $du$. The whole integral turns into $\int u^3\,du$, which is easy. At the end, put $x$ back in.`,
      r`For a definite integral, you can change the limits to $u$-values and never go back to $x$. The two big habits: everything must be rewritten in $u$ (no leftover $x$), and if a constant is missing, multiply and divide by it.`,
    ],
    picture: { title: 'Renaming to simplify', t: r`If a recipe says “double the amount of (flour + sugar)”, you could call (flour + sugar) “dry mix” and just say “double the dry mix”. Renaming a complicated chunk as $u$ makes the integral look simple, just like renaming makes the recipe easier.` },
    words: [
      { term: 'u-substitution', means: r`Replacing an inside expression with $u$ and $dx$ with $\frac{du}{u'(x)}$ to simplify an integral.` },
      { term: r`$du$`, means: r`The differential of $u$: $du = u'(x)\,dx$.` },
      { term: 'Changing the limits', means: r`For definite integrals, replace $x = a$ and $x = b$ by $u(a)$ and $u(b)$.` },
      { term: r`$\int \frac{f'}{f}$`, means: r`$= \ln|f| + C$: a common substitution pattern.` },
    ],
    tools: [
      { name: 'Chain rule', refresher: r`u-substitution is the chain rule read backwards.`, lesson: 'c3-1' },
      { name: 'Antiderivative table', refresher: r`$\int u^n\,du$, $\int e^u\,du$, $\int \frac{du}{u}$, $\int \cos u\,du$.`, lesson: 'c6-4' },
      { name: 'Trig values and log rules', refresher: r`$\cos\frac{\pi}{4} = \frac{\sqrt{2}}{2}$; $-\ln\frac{\sqrt{2}}{2} = \frac{1}{2}\ln 2$.`, lesson: 'c0-7' },
    ],
    why: [
      [r`$x^2 + 1$ is inside the power, and its derivative $2x$ is sitting right outside: the perfect setup for $u$.`, r`Now the integral is a simple power of $u$. Integrate, then substitute $x^2 + 1$ back for $u$.`],
      [r`The inside of the exponential is $x^2$, whose derivative $2x$ almost matches the $x$ in front (we need a factor 2). Changing the limits: $x = 0$ gives $u = 0$ and $x = 1$ gives $u = 1$.`, r`$x\,dx = \frac{1}{2}du$, so the $\frac{1}{2}$ comes out front; then integrate $e^u$.`],
    ],
    walk: {
      'c6-5-1': [r`Let $u = x^2 + 1$, so $du = 2x\,dx$: the $2x\,dx$ in the integral is exactly $du$.`, r`New limits: $x = 0 \to u = 1$; $x = 1 \to u = 2$. The integral becomes $\int_1^2 u^3\,du$.`, r`$\left[\frac{u^4}{4}\right]_1^2 = \frac{16}{4} - \frac{1}{4} = \frac{15}{4} = 3.75$.`],
      'c6-5-2': [r`Let $u = \sin x$, so $du = \cos x\,dx$.`, r`Limits: $x = 0 \to u = 0$; $x = \frac{\pi}{2} \to u = 1$. Integral: $\int_0^1 u\,du$.`, r`$\left[\frac{u^2}{2}\right]_0^1 = \frac{1}{2}$.`],
      'c6-5-3': [r`Let $u = x^2$, $du = 2x\,dx$, so $x\,dx = \frac{1}{2}du$.`, r`Limits: 0 to 1 stay 0 to 1. Integral: $\frac{1}{2}\int_0^1 e^u\,du$.`, r`$\frac{1}{2}(e^1 - e^0) = \frac{e - 1}{2} \approx 0.859$.`],
      'c6-5-4': [r`Let $u = \ln x$; then $du = \frac{1}{x}dx$, which matches the $\frac{dx}{x}$ in the integral.`, r`Limits: $x = 1 \to u = 0$; $x = e \to u = 1$. Integral: $\int_0^1 u\,du$.`, r`$= \frac{1}{2}$.`],
      'c6-5-5': [r`Let $u = 2x + 1$, $du = 2\,dx$, so $dx = \frac{1}{2}du$.`, r`Limits: $x = 0 \to u = 1$; $x = 1 \to u = 3$. Integral: $\frac{1}{2}\int_1^3 \frac{du}{u}$.`, r`$\frac{1}{2}(\ln 3 - \ln 1) = \frac{1}{2}\ln 3 \approx 0.549$.`],
      'c6-5-6': [r`Write $\tan x = \frac{\sin x}{\cos x}$. Let $u = \cos x$, $du = -\sin x\,dx$, so $\sin x\,dx = -du$.`, r`Antiderivative: $-\int\frac{du}{u} = -\ln|u| = -\ln|\cos x|$.`, r`From 0 to $\frac{\pi}{4}$: $-\ln\frac{\sqrt{2}}{2} + \ln 1 = -\ln\frac{\sqrt{2}}{2}$.`, r`$-\ln\frac{\sqrt{2}}{2} = \ln\sqrt{2} = \frac{1}{2}\ln 2 \approx 0.347$.`],
    },
    teach: {
      plan: [r`Differentiate $(x^2 + 1)^4$ with the chain rule, then ask your student to reverse it.`, r`Teach the four steps: choose $u$, find $du$, rewrite everything, integrate and substitute back.`, r`Show the “missing constant” fix with $\int xe^{x^2}dx$.`, r`Do a definite integral with changed limits.`, r`Practice spotting $u$ on 5 quick integrals without solving them.`],
      questions: [
        { q: 'How do I choose u?', a: 'Look for an inside function (in a power, root, exponent, or trig function) whose derivative also appears, up to a constant.' },
        { q: 'What if there is leftover x after substituting?', a: 'Then either u was a poor choice, or you need to solve u for x and substitute that too. All x must go.' },
        { q: 'Do I have to change the limits?', a: 'Either change the limits to u-values, or substitute back to x before plugging in the original limits. Never mix the two.' },
      ],
      keyPoints: ['u = inside function; du = u′(x) dx.', 'Rewrite the whole integral in u.', 'Fix missing constants by multiplying and dividing.', 'Definite integrals: change the limits.'],
    },
  },
  'c6-6': {
    bigIdea: [
      r`Some integrals are products where substitution doesn’t help, like $\int xe^x\,dx$. Integration by parts undoes the product rule. It trades the integral you have for another one that is hopefully easier.`,
      r`The formula: $\int u\,dv = uv - \int v\,du$. You split the integrand into two parts: $u$, which you will differentiate, and $dv$, which you will integrate. The goal is for $u$ to get simpler when differentiated (like $x$ becoming 1).`,
      r`A handy order for choosing $u$ is LIATE: Logarithms, Inverse trig, Algebraic (powers of $x$), Trig, Exponentials. Pick $u$ as whichever comes first in that list. Sometimes you apply parts twice, and sometimes the original integral comes back, and you solve for it like an equation.`,
    ],
    picture: { title: 'Trading cards', t: r`Parts is a trade: you give up your hard integral $\int u\,dv$ and receive $uv$ plus a new integral $\int v\,du$. A good trade makes the new integral easier, like trading one hard card for one easy card and a bonus.` },
    words: [
      { term: 'Integration by parts', means: r`$\int u\,dv = uv - \int v\,du$.` },
      { term: r`$u$ and $dv$`, means: r`$u$: the part you differentiate (to get $du$). $dv$: the part you integrate (to get $v$).` },
      { term: 'LIATE', means: 'Priority list for choosing u: Logs, Inverse trig, Algebraic, Trig, Exponential.' },
      { term: 'Tabular method', means: 'A shortcut table for repeated parts when u is a polynomial.' },
    ],
    tools: [
      { name: 'Product rule', refresher: r`$(uv)' = u'v + uv'$; parts is this rule integrated and rearranged.`, lesson: 'c2-5' },
      { name: 'Basic antiderivatives', refresher: r`$\int e^x = e^x$, $\int \sin x = -\cos x$, $\int x = \frac{x^2}{2}$.`, lesson: 'c6-4' },
      { name: 'Solving equations', refresher: r`If $I = A - I$, then $2I = A$ and $I = \frac{A}{2}$.`, lesson: 'c0-2' },
    ],
    why: [
      [r`LIATE: $x$ (algebraic) comes before $e^x$ (exponential), so $u = x$. Differentiating $x$ gives 1, which makes the new integral simple.`, r`Apply the formula: $uv - \int v\,du$, and the remaining integral is just $\int e^x\,dx$.`],
      [r`There is only one factor, $\ln x$, and we can’t integrate it directly, so let $u = \ln x$ and $dv = dx$ (the hidden “1”).`, r`$v\,du = x \cdot \frac{1}{x}dx = dx$, an easy integral.`],
    ],
    walk: {
      'c6-6-1': [r`$u = x$ ($du = dx$), $dv = e^x\,dx$ ($v = e^x$).`, r`$\int xe^x\,dx = xe^x - \int e^x\,dx = xe^x - e^x$.`, r`From 0 to 1: $(e - e) - (0 - 1) = 0 + 1 = 1$.`],
      'c6-6-2': [r`$u = \ln x$ ($du = \frac{dx}{x}$), $dv = dx$ ($v = x$).`, r`$\int \ln x\,dx = x\ln x - \int 1\,dx = x\ln x - x$.`, r`From 1 to $e$: $(e \cdot 1 - e) - (0 - 1) = 0 + 1 = 1$.`],
      'c6-6-3': [r`$u = x$, $dv = \sin x\,dx$, so $du = dx$, $v = -\cos x$.`, r`$\int x\sin x\,dx = -x\cos x + \int\cos x\,dx = -x\cos x + \sin x$.`, r`From 0 to $\pi$: $(-\pi\cos\pi + \sin\pi) - (0 + 0) = \pi$.`, r`$\approx 3.142$.`],
      'c6-6-4': [r`$u = x^2$, $dv = e^x dx$: $\int x^2e^x = x^2e^x - \int 2xe^x\,dx$.`, r`Parts again on $\int 2xe^x\,dx = 2(xe^x - e^x)$.`, r`Total: $x^2e^x - 2xe^x + 2e^x = e^x(x^2 - 2x + 2)$.`, r`From 0 to 1: $e(1 - 2 + 2) - 1(2) = e - 2 \approx 0.718$.`],
      'c6-6-5': [r`LIATE: log first, so $u = \ln x$ ($du = \frac{dx}{x}$), $dv = x\,dx$ ($v = \frac{x^2}{2}$).`, r`$\int x\ln x\,dx = \frac{x^2}{2}\ln x - \int \frac{x^2}{2}\cdot\frac{1}{x}dx = \frac{x^2}{2}\ln x - \frac{x^2}{4}$.`, r`At $e$: $\frac{e^2}{2} - \frac{e^2}{4} = \frac{e^2}{4}$. At 1: $0 - \frac{1}{4}$.`, r`$\frac{e^2}{4} + \frac{1}{4} = \frac{e^2 + 1}{4} \approx 2.097$.`],
      'c6-6-6': [r`Let $I = \int e^x\sin x\,dx$. Parts with $u = \sin x$, $dv = e^x dx$: $I = e^x\sin x - \int e^x\cos x\,dx$.`, r`Parts again with $u = \cos x$: $\int e^x\cos x\,dx = e^x\cos x + \int e^x\sin x\,dx = e^x\cos x + I$.`, r`So $I = e^x\sin x - e^x\cos x - I$, giving $2I = e^x(\sin x - \cos x)$ and $I = \frac{e^x(\sin x - \cos x)}{2}$.`, r`From 0 to $\pi$: $\frac{e^\pi(0 + 1)}{2} - \frac{1(0 - 1)}{2} = \frac{e^\pi + 1}{2} \approx 12.070$.`],
    },
    teach: {
      plan: [r`Derive the formula from the product rule: integrate $(uv)' = u'v + uv'$ and rearrange.`, r`Teach LIATE for choosing $u$.`, r`Work $\int xe^x\,dx$ and $\int \ln x\,dx$.`, r`Show repeated parts on $x^2e^x$ (and the tabular shortcut).`, r`Show the “loop” trick on $e^x\sin x$.`],
      questions: [
        { q: 'What if I pick the wrong u?', a: 'The new integral will be harder than the original. Stop and swap your choice. LIATE prevents most bad choices.' },
        { q: r`Where is the $dv$ in $\int \ln x\,dx$?`, a: r`It is the invisible $1 \cdot dx$. Let $dv = dx$, so $v = x$.` },
        { q: 'What if the original integral reappears?', a: 'Great! Call it I, move it to one side, and solve for I algebraically.' },
      ],
      keyPoints: ['∫u dv = uv − ∫v du.', 'Choose u by LIATE; dv must be integrable.', 'Repeat parts for polynomials times eˣ or trig.', 'If the integral loops back, solve for it.'],
    },
  },
  'c6-7': {
    bigIdea: [
      r`Fractions of polynomials (rational functions) have their own toolbox. The idea: break a complicated fraction into simple pieces that you already know how to integrate, like $\frac{1}{x - a}$ (which gives a logarithm) or $\frac{1}{x^2 + 1}$ (which gives arctangent).`,
      r`Partial fractions is like un-adding fractions. You know $\frac{1}{x - 1} - \frac{1}{x} = \frac{1}{x(x - 1)}$. Partial fractions runs that backwards: starting from $\frac{1}{x(x - 1)}$, it finds the simple pieces. Then each piece integrates to a log.`,
      r`Two helper moves: if the top’s degree is at least the bottom’s, do long division first (like turning an improper fraction $\frac{7}{3}$ into $2\frac{1}{3}$). If the bottom is a quadratic that won’t factor, complete the square to reach the arctangent form.`,
    ],
    picture: { title: 'Taking apart LEGO', t: r`A finished LEGO model (one big fraction) is hard to work with. Pop it apart into standard bricks (simple fractions), and each brick has a known instruction (its integral). Partial fractions is the disassembly.` },
    words: [
      { term: 'Rational function', means: r`A fraction of polynomials, like $\frac{3x + 1}{x(x + 1)}$.` },
      { term: 'Partial fractions', means: r`Splitting a fraction into simpler ones: $\frac{A}{x - a} + \frac{B}{x - b}$.` },
      { term: 'Cover-up method', means: r`Find $A$ by covering $(x - a)$ and plugging $x = a$ into what remains.` },
      { term: 'Long division', means: 'Dividing polynomials to write an improper fraction as a polynomial plus a proper fraction.' },
      { term: 'Completing the square', means: r`Rewriting $x^2 + 2x + 2$ as $(x + 1)^2 + 1$.` },
    ],
    tools: [
      { name: 'Factoring', refresher: r`$x^2 - 1 = (x - 1)(x + 1)$; $x^2 - 3x + 2 = (x - 1)(x - 2)$.`, lesson: 'c0-5' },
      { name: 'Log rules', refresher: r`$\ln a - \ln b = \ln\frac{a}{b}$.`, lesson: 'c0-7' },
      { name: 'arctan antiderivative', refresher: r`$\int\frac{du}{1 + u^2} = \arctan u + C$.`, lesson: 'c6-4' },
      { name: 'u-substitution', refresher: r`$\int\frac{dx}{x - a} = \ln|x - a| + C$.`, lesson: 'c6-5' },
    ],
    why: [
      [r`Factor the bottom and split into $\frac{A}{x - 1} + \frac{B}{x + 1}$. Cover-up: covering $(x - 1)$ and plugging $x = 1$ gives $A = \frac{1}{2}$; covering $(x + 1)$ and plugging $x = -1$ gives $B = -\frac{1}{2}$.`, r`Each piece integrates to a log; combine the two logs into one with the log rule.`],
      [r`The bottom doesn’t factor, so complete the square: take half of 2 (which is 1), square it (1), and rewrite.`, r`It now matches $\frac{1}{u^2 + 1}$ with $u = x + 1$, the arctangent pattern.`],
    ],
    walk: {
      'c6-7-1': [r`From the example: $\frac{1}{x^2 - 1} = \frac{1/2}{x - 1} - \frac{1/2}{x + 1}$.`, r`Antiderivative: $\frac{1}{2}\ln|x - 1| - \frac{1}{2}\ln|x + 1| = \frac{1}{2}\ln\left|\frac{x - 1}{x + 1}\right|$.`, r`At 3: $\frac{1}{2}\ln\frac{2}{4} = \frac{1}{2}\ln\frac{1}{2}$. At 2: $\frac{1}{2}\ln\frac{1}{3}$.`, r`Difference: $\frac{1}{2}\ln\frac{1/2}{1/3} = \frac{1}{2}\ln\frac{3}{2} \approx 0.2027$.`],
      'c6-7-2': [r`Top degree 2 ≥ bottom degree 1: divide. $x^2 + 1 = (x + 1)(x - 1) + 2$, so $\frac{x^2 + 1}{x + 1} = x - 1 + \frac{2}{x + 1}$.`, r`Antiderivative: $\frac{x^2}{2} - x + 2\ln(x + 1)$.`, r`From 0 to 1: $\left(\frac{1}{2} - 1 + 2\ln 2\right) - 0 = -\frac{1}{2} + 2\ln 2$.`, r`$\approx -0.5 + 1.386 = 0.886$.`],
      'c6-7-3': [r`Complete the square: $x^2 + 2x + 2 = (x + 1)^2 + 1$.`, r`Antiderivative: $\arctan(x + 1)$.`, r`From 0 to 1: $\arctan 2 - \arctan 1 = \arctan 2 - \frac{\pi}{4} \approx 1.107 - 0.785 = 0.322$.`],
      'c6-7-4': [r`Split: $\frac{3x + 1}{x(x + 1)} = \frac{A}{x} + \frac{B}{x + 1}$, so $3x + 1 = A(x + 1) + Bx$.`, r`$x = 0$: $1 = A$. $x = -1$: $-2 = -B$, so $B = 2$.`, r`Antiderivative: $\ln x + 2\ln(x + 1)$. At 2: $\ln 2 + 2\ln 3$. At 1: $0 + 2\ln 2$.`, r`Difference: $2\ln 3 - \ln 2 \approx 2.197 - 0.693 = 1.504$.`],
      'c6-7-5': [r`Top and bottom have the same degree: rewrite $\frac{x}{x + 1} = \frac{(x + 1) - 1}{x + 1} = 1 - \frac{1}{x + 1}$.`, r`Antiderivative: $x - \ln(x + 1)$.`, r`From 0 to 1: $(1 - \ln 2) - 0 \approx 0.307$.`],
      'c6-7-6': [r`Split: $\frac{1}{(x - 1)(x - 2)} = \frac{A}{x - 1} + \frac{B}{x - 2}$. Cover-up: $A = \frac{1}{1 - 2} = -1$, $B = \frac{1}{2 - 1} = 1$.`, r`Antiderivative: $\ln|x - 2| - \ln|x - 1| = \ln\left|\frac{x - 2}{x - 1}\right|$.`, r`At 4: $\ln\frac{2}{3}$. At 3: $\ln\frac{1}{2}$.`, r`$\ln\frac{2}{3} - \ln\frac{1}{2} = \ln\frac{4}{3} \approx 0.288$.`],
    },
    teach: {
      plan: [r`Add $\frac{1}{x - 1} - \frac{1}{x}$ forwards, then show partial fractions reverses it.`, r`Teach the cover-up method for distinct linear factors.`, r`Show long division for “top-heavy” fractions.`, r`Complete the square for $x^2 + 2x + 2$ and connect to arctan.`, r`Give a decision flowchart: divide if needed → factor bottom → partial fractions or complete the square.`],
      questions: [
        { q: 'Why does the cover-up method work?', a: 'Multiplying both sides by (x − a) and setting x = a makes every other piece vanish, leaving just A.' },
        { q: 'When do I need long division?', a: 'When the degree of the top is greater than or equal to the degree of the bottom.' },
        { q: 'What if the bottom can’t be factored?', a: 'Complete the square to get (x − h)² + k², which integrates to an arctangent.' },
      ],
      keyPoints: ['Divide first if the top’s degree ≥ the bottom’s.', 'Distinct linear factors: A/(x − a) + B/(x − b); cover-up finds A and B.', 'Each linear piece integrates to a log.', 'Irreducible quadratics: complete the square → arctan.'],
    },
  },
  'c6-8': {
    bigIdea: [
      r`Can an infinitely long region have a finite area? Surprisingly, yes! The region under $\frac{1}{x^2}$ from 1 to infinity has area exactly 1. But the region under $\frac{1}{x}$ from 1 to infinity has infinite area. The difference is how fast the function shrinks.`,
      r`We can’t plug in infinity, so we sneak up on it: compute the integral up to a large number $b$, then let $b \to \infty$. If the result approaches a finite number, the integral converges to that number; if not, it diverges.`,
      r`The same trick handles functions that blow up at an endpoint, like $\frac{1}{\sqrt{x}}$ at 0: integrate from a small $c$ instead of 0, then let $c \to 0^+$. These “improper integrals” are the bridge to infinite series in Unit 10.`,
    ],
    picture: { title: 'Paint that never runs out', t: r`Imagine painting the region under $\frac{1}{x^2}$ forever to the right. The strip gets thinner so fast that a single can of paint (area 1) covers all of it. Under $\frac{1}{x}$, the strip thins too slowly and no amount of paint is enough.` },
    words: [
      { term: 'Improper integral', means: 'An integral with an infinite limit or an integrand that blows up in the interval.' },
      { term: 'Converges', means: 'The limit is a finite number.' },
      { term: 'Diverges', means: 'The limit is infinite or does not exist.' },
      { term: 'p-integral', means: r`$\int_1^\infty \frac{dx}{x^p}$: converges if $p > 1$, diverges if $p \le 1$.` },
    ],
    tools: [
      { name: 'Limits at infinity', refresher: r`$\frac{1}{b} \to 0$, $e^{-b} \to 0$, $\arctan b \to \frac{\pi}{2}$, $\ln b \to \infty$.`, lesson: 'c1-7' },
      { name: 'L’Hôpital’s rule', refresher: r`$be^{-b} = \frac{b}{e^b} \to 0$.`, lesson: 'c4-4' },
      { name: 'Integration by parts', refresher: r`$\int xe^{-x}\,dx = -xe^{-x} - e^{-x}$.`, lesson: 'c6-6' },
    ],
    why: [
      [r`Replace $\infty$ with $b$ so the integral is ordinary, evaluate, then take the limit as $b$ grows.`, r`$\frac{1}{b} \to 0$, so the area settles at exactly 1: it converges.`],
      [r`The antiderivative $\ln x$ grows forever (slowly, but without bound).`, r`An infinite limit means the area is infinite: the integral diverges.`],
    ],
    walk: {
      'c6-8-1': [r`Write $\lim\limits_{b \to \infty}\int_1^b x^{-2}\,dx$.`, r`Antiderivative: $-\frac{1}{x}$. So $\left[-\frac{1}{x}\right]_1^b = -\frac{1}{b} + 1$.`, r`As $b \to \infty$, $\frac{1}{b} \to 0$: the limit is $1$.`],
      'c6-8-2': [r`$\lim\limits_{b \to \infty}\int_1^b \frac{dx}{x} = \lim\limits_{b \to \infty}(\ln b - \ln 1)$.`, r`$\ln b$ grows without bound.`, r`The integral diverges to $\infty$.`],
      'c6-8-3': [r`Antiderivative of $e^{-2x}$: $-\frac{1}{2}e^{-2x}$ (u-sub with $u = -2x$).`, r`$\left[-\frac{1}{2}e^{-2x}\right]_0^b = -\frac{1}{2}e^{-2b} + \frac{1}{2}$.`, r`$e^{-2b} \to 0$, so the limit is $\frac{1}{2}$.`],
      'c6-8-4': [r`$\frac{1}{\sqrt{x}}$ blows up at $x = 0$, so start at $c$ and let $c \to 0^+$.`, r`Antiderivative: $x^{-1/2} \to 2x^{1/2} = 2\sqrt{x}$.`, r`$[2\sqrt{x}]_c^1 = 2 - 2\sqrt{c} \to 2 - 0 = 2$. Converges to 2.`],
      'c6-8-5': [r`Antiderivative: $\arctan x$.`, r`$\lim\limits_{b \to \infty}(\arctan b - \arctan 0) = \lim\limits_{b \to \infty}\arctan b$.`, r`As $b \to \infty$, $\arctan b$ approaches $\frac{\pi}{2}$ (angles approaching 90°). Answer $\frac{\pi}{2} \approx 1.571$.`],
      'c6-8-6': [r`By parts ($u = x$, $dv = e^{-x}dx$): $\int xe^{-x}\,dx = -xe^{-x} - e^{-x}$.`, r`$[-xe^{-x} - e^{-x}]_0^b = (-be^{-b} - e^{-b}) - (0 - 1)$.`, r`$be^{-b} = \frac{b}{e^b} \to 0$ (L’Hôpital: $\frac{1}{e^b} \to 0$), and $e^{-b} \to 0$.`, r`Total: $0 - 0 + 1 = 1$.`],
    },
    teach: {
      plan: [r`Ask: can an infinitely long region have finite area? Show $\frac{1}{x^2}$ vs $\frac{1}{x}$ graphs.`, r`Teach the limit definition: replace infinity with $b$.`, r`Compute both examples and compare.`, r`Show the second kind: an integrand blowing up at an endpoint.`, r`State the p-integral rule as a summary.`],
      questions: [
        { q: 'How can infinite length have finite area?', a: 'If the height shrinks fast enough, the extra area added further out gets so small that the total stays below a fixed number, like 1/2 + 1/4 + 1/8 + … never passes 1.' },
        { q: 'Do I really need to write the limit?', a: 'Yes. On free-response questions, evaluating at ∞ directly loses points. Write lim as b → ∞.' },
        { q: r`Why does $\frac{1}{x}$ diverge but $\frac{1}{x^2}$ converge?`, a: r`$\frac{1}{x^2}$ shrinks much faster. The p-rule says $\int_1^\infty \frac{dx}{x^p}$ converges exactly when $p > 1$.` },
      ],
      keyPoints: ['Replace ∞ (or the bad endpoint) with a variable and take a limit.', 'Finite limit → converges; otherwise diverges.', '∫₁^∞ 1/xᵖ dx converges iff p > 1.', 'Watch for hidden blow-ups inside the interval.'],
    },
  },
};

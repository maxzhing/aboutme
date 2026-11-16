import type { LessonTutor } from '../types';

const r = String.raw;

/** Tutor layer · Unit 8: putting integrals to work. */
export const TUTOR8: Record<string, LessonTutor> = {
  'c8-1': {
    bigIdea: [
      r`To average a list of test scores, you add them up and divide by how many there are. To average a function over an interval, you do the same thing in a continuous way: “add up” all its values with an integral, then divide by the length of the interval. That is $f_{avg} = \frac{1}{b - a}\int_a^b f(x)\,dx$.`,
      r`Picture it: the average value is the height of a rectangle with the same width and the same area as the region under the curve. Flatten the bumpy region into a rectangle without losing any area, and its height is the average.`,
      r`For motion, the integral of velocity gives displacement: how far you end up from where you started (backwards travel cancels). For total distance, every bit of travel counts, so you integrate the speed $|v|$, splitting wherever the particle turns around.`,
    ],
    picture: { title: 'Leveling a sandbox', t: r`A sandbox has bumpy sand. Rake it perfectly flat without adding or removing any sand. The flat height is the average value of the bumpy surface: same amount of sand (area), spread evenly.` },
    words: [
      { term: 'Average value', means: r`$\frac{1}{b - a}\int_a^b f(x)\,dx$: the height of the equal-area rectangle.` },
      { term: 'Displacement', means: r`$\int_a^b v(t)\,dt$: net change in position (can be negative).` },
      { term: 'Total distance', means: r`$\int_a^b |v(t)|\,dt$: all travel counted as positive.` },
      { term: 'MVT for integrals', means: r`A continuous $f$ actually equals its average value at some $c$ in $[a, b]$.` },
    ],
    tools: [
      { name: 'FTC', refresher: r`$\int_a^b f = F(b) - F(a)$.`, lesson: 'c6-2' },
      { name: 'Net change', refresher: r`End = start + $\int$ rate.`, lesson: 'c6-3' },
      { name: 'Sign of velocity', refresher: 'Factor v(t) to see where the particle moves left or right.', lesson: 'c4-1' },
    ],
    why: [
      [r`The integral gives the total area (9); dividing by the width 3 spreads it into a rectangle.`, r`The height of that rectangle is the average value.`],
      [r`Distance counts backward motion as positive, so first find where $v$ is negative: $t^2 < 4$ means $t < 2$.`, r`On $[0, 2]$ use $-v = 4 - t^2$ (to make it positive); on $[2, 3]$ use $v$ itself. Add the pieces.`],
    ],
    walk: {
      'c8-1-1': [r`Average value $= \frac{1}{3 - 0}\int_0^3 x^2\,dx$.`, r`$\int_0^3 x^2\,dx = \left[\frac{x^3}{3}\right]_0^3 = 9$.`, r`$\frac{9}{3} = 3$.`],
      'c8-1-2': [r`$\frac{1}{\pi - 0}\int_0^\pi \sin x\,dx$.`, r`$\int_0^\pi \sin x\,dx = 2$ (one arch of sine).`, r`$\frac{2}{\pi} \approx 0.637$.`],
      'c8-1-3': [r`Displacement $= \int_0^1 (2t - 4)\,dt$.`, r`Antiderivative $t^2 - 4t$: at 1 it is $-3$, at 0 it is 0.`, r`Displacement $-3$: the particle ends 3 units to the left of its start.`],
      'c8-1-4': [r`$v(t) = t^2 - 4 < 0$ for $t < 2$, $> 0$ for $t > 2$. Split at 2.`, r`$\int_0^2 (4 - t^2)\,dt = 8 - \frac{8}{3} = \frac{16}{3}$.`, r`$\int_2^3 (t^2 - 4)\,dt = \left(9 - 12\right) - \left(\frac{8}{3} - 8\right) = -3 + \frac{16}{3} = \frac{7}{3}$.`, r`Total: $\frac{23}{3} \approx 7.667$.`],
      'c8-1-5': [r`Average value $= \frac{1}{b - a}\int_a^b f$.`, r`Width: $7 - 2 = 5$.`, r`$\frac{50}{5} = 10$.`],
      'c8-1-6': [r`Average value of $x^2$ on $[0, 2]$: $\frac{1}{2}\int_0^2 x^2\,dx = \frac{1}{2}\cdot\frac{8}{3} = \frac{4}{3}$.`, r`Find $c$ where $f(c)$ equals it: $c^2 = \frac{4}{3}$.`, r`$c = \frac{2}{\sqrt{3}} \approx 1.155$, inside $[0, 2]$ ✓.`],
    },
    teach: {
      plan: [r`Average three test scores; then ask how to average infinitely many values.`, r`Show the equal-area rectangle picture.`, r`Compute the average of $x^2$ on $[0, 3]$.`, r`Contrast displacement and total distance on a number line.`, r`Do the split-at-the-turnaround distance problem.`],
      questions: [
        { q: 'Average value or average rate of change?', a: r`Average value of $f$ uses an integral. Average rate of change of $f$ is $\frac{f(b) - f(a)}{b - a}$, a slope. Different questions!` },
        { q: 'Why can displacement be negative?', a: 'It measures where you end up relative to the start, and ending up to the left is negative.' },
        { q: 'How do I know where to split for distance?', a: r`Solve $v(t) = 0$ and check where the sign changes inside the interval.` },
      ],
      keyPoints: ['Average value = (1/(b − a)) ∫ f.', 'Displacement = ∫ v; distance = ∫ |v|.', 'Split distance integrals where v changes sign.', 'MVT for integrals: f(c) = average value for some c.'],
    },
  },
  'c8-2': {
    bigIdea: [
      r`The area between two curves is just “area under the top curve minus area under the bottom curve”. With one integral: $\int_a^b (\text{top} - \text{bottom})\,dx$. Think of thin vertical strips: each has height top − bottom and width $dx$.`,
      r`The limits $a$ and $b$ are usually where the curves cross, so finding intersections is the first job: set the two functions equal and solve.`,
      r`Sometimes vertical strips are awkward, for example if the region is bounded by $x = y^2$ (a sideways parabola). Then use horizontal strips: integrate (right curve − left curve) with respect to $y$. And if the curves swap places inside the interval, split the integral where they cross.`,
    ],
    picture: { title: 'Slicing bread between two crusts', t: r`Cut a loaf into thin vertical slices. Each slice’s height is (top crust − bottom crust). Add up all the slice areas and you have the whole slice of bread between the crusts.` },
    words: [
      { term: 'Area between curves', means: r`$\int_a^b [\text{top}(x) - \text{bottom}(x)]\,dx$.` },
      { term: 'Points of intersection', means: 'Where two curves meet; found by setting them equal.' },
      { term: 'Integrating in y', means: r`$\int_c^d [\text{right}(y) - \text{left}(y)]\,dy$ using horizontal strips.` },
      { term: 'Region', means: 'The enclosed shape whose area we want.' },
    ],
    tools: [
      { name: 'Solving equations', refresher: r`$x = x^2$ gives $x(x - 1) = 0$; $y^2 = y + 2$ gives $(y - 2)(y + 1) = 0$.`, lesson: 'c0-5' },
      { name: 'FTC', refresher: r`Antiderivatives of powers, sine and cosine.`, lesson: 'c6-2' },
      { name: 'Graphs of basic functions', refresher: 'Sketch to see which curve is on top.', lesson: 'c0-6' },
    ],
    why: [
      [r`Set $x = x^2$ to find the crossing points 0 and 1. Test $x = 0.5$: $0.5 > 0.25$, so $y = x$ is on top.`, r`Integrate top minus bottom between the crossings.`],
      [r`Solve $y^2 = y + 2$ for the $y$-limits. The line $x = y + 2$ is to the right (test $y = 0$: $2 > 0$).`, r`Integrate right minus left in $y$.`],
    ],
    walk: {
      'c8-2-1': [r`Intersections: $x = x^2$ gives $x = 0, 1$.`, r`On $(0, 1)$, $x$ is above $x^2$.`, r`$\int_0^1 (x - x^2)\,dx = \frac{1}{2} - \frac{1}{3} = \frac{1}{6}$.`],
      'c8-2-2': [r`The parabola meets the axis where $4 - x^2 = 0$: $x = \pm 2$.`, r`Top: $4 - x^2$; bottom: $y = 0$.`, r`$\int_{-2}^2 (4 - x^2)\,dx = \left[4x - \frac{x^3}{3}\right]_{-2}^2 = \left(8 - \frac{8}{3}\right) - \left(-8 + \frac{8}{3}\right) = \frac{32}{3}$.`],
      'c8-2-3': [r`Intersections: $2x = x^2$ gives $x = 0, 2$.`, r`Test $x = 1$: $2 > 1$, so $y = 2x$ is on top.`, r`$\int_0^2 (2x - x^2)\,dx = 4 - \frac{8}{3} = \frac{4}{3} \approx 1.333$.`],
      'c8-2-4': [r`The region is bounded by a sideways parabola, so use horizontal strips (in $y$).`, r`Intersections: $y^2 = y + 2$ gives $y = -1$ and $y = 2$. Right curve: $x = y + 2$; left: $x = y^2$.`, r`$\int_{-1}^2 (y + 2 - y^2)\,dy = \left[\frac{y^2}{2} + 2y - \frac{y^3}{3}\right]_{-1}^2$.`, r`$= \left(2 + 4 - \frac{8}{3}\right) - \left(\frac{1}{2} - 2 + \frac{1}{3}\right) = \frac{10}{3} + \frac{7}{6} = \frac{9}{2}$.`],
      'c8-2-5': [r`On $[0, \frac{\pi}{4}]$, $\cos x \ge \sin x$ (they meet at $\frac{\pi}{4}$).`, r`$\int_0^{\pi/4} (\cos x - \sin x)\,dx = [\sin x + \cos x]_0^{\pi/4}$.`, r`$\left(\frac{\sqrt{2}}{2} + \frac{\sqrt{2}}{2}\right) - (0 + 1) = \sqrt{2} - 1 \approx 0.414$.`],
      'c8-2-6': [r`Intersections: $x^3 = x$ gives $x = -1, 0, 1$. Two separate pieces.`, r`On $[0, 1]$: $x \ge x^3$ (test 0.5). On $[-1, 0]$: $x^3 \ge x$ (test $-0.5$). The top curve swaps!`, r`The two pieces are mirror images, so total $= 2\int_0^1 (x - x^3)\,dx = 2\left(\frac{1}{2} - \frac{1}{4}\right) = \frac{1}{2}$.`],
    },
    teach: {
      plan: [r`Sketch two curves and shade the region between them.`, r`Draw one thin vertical strip: height = top − bottom.`, r`Find intersections, then integrate. Do $y = x$ and $y = x^2$.`, r`Show a region that is easier with horizontal strips.`, r`Show curves that cross in the middle and why you must split.`],
      questions: [
        { q: 'How do I know which curve is on top?', a: 'Pick a test x between the intersections and compare the two y-values.' },
        { q: 'When should I integrate with respect to y?', a: 'When the region is bounded on the left and right by curves easily written as x = …, or when using x would need several integrals.' },
        { q: 'What if I get a negative area?', a: 'You subtracted in the wrong order (bottom − top). Area is always positive.' },
      ],
      keyPoints: ['Area = ∫(top − bottom) dx.', 'Limits come from the intersections.', 'Horizontal strips: ∫(right − left) dy.', 'Split where the curves cross.'],
    },
  },
  'c8-3': {
    bigIdea: [
      r`How do you find the volume of a strange 3D shape? Slice it like a loaf of bread. If you know the area of each slice, the volume is the sum of (slice area × slice thickness): $V = \int_a^b A(x)\,dx$.`,
      r`In these problems, a flat region in the $xy$-plane is the base, and on top of each thin strip of the base stands a shape: a square, a semicircle, a triangle. The strip’s length (top curve minus bottom curve) is the side $s$ of that shape.`,
      r`So the recipe is: find $s(x)$ from the base, plug it into the right area formula ($s^2$ for squares, $\frac{\pi}{8}s^2$ for semicircles, $\frac{\sqrt{3}}{4}s^2$ for equilateral triangles), and integrate.`,
    ],
    picture: { title: 'A stack of crackers', t: r`Stack square crackers of different sizes along a line, smallest to largest. The volume of the stack is the sum of each cracker’s area times its thickness. Make the crackers infinitely thin and the sum becomes an integral.` },
    words: [
      { term: 'Cross section', means: 'The flat shape you see when you slice a solid.' },
      { term: r`$A(x)$`, means: r`The area of the cross section at position $x$.` },
      { term: 'Base', means: 'The flat region the solid stands on.' },
      { term: r`Side length $s$`, means: r`The width of the base at $x$: top minus bottom.` },
    ],
    tools: [
      { name: 'Area formulas', refresher: r`Square $s^2$; semicircle with diameter $s$: $\frac{1}{2}\pi\left(\frac{s}{2}\right)^2 = \frac{\pi}{8}s^2$; equilateral triangle $\frac{\sqrt{3}}{4}s^2$.` },
      { name: 'Area between curves', refresher: r`$s$ is top − bottom, just like strip heights.`, lesson: 'c8-2' },
      { name: 'Expanding squares', refresher: r`$(1 - x^2)^2 = 1 - 2x^2 + x^4$.`, lesson: 'c0-5' },
    ],
    why: [
      [r`The base strip at $x$ goes from $y = 0$ up to $y = \sqrt{x}$, so it has length $\sqrt{x}$; a square on it has area $(\sqrt{x})^2 = x$.`, r`Volume = integral of the cross-section areas over the base’s $x$-range.`],
      [r`Strip length $1 - x^2$ is the side of the equilateral triangle; use its area formula.`, r`Expand and integrate from $-1$ to 1: $\int(1 - 2x^2 + x^4) = 2 - \frac{4}{3} + \frac{2}{5} = \frac{16}{15}$.`],
    ],
    walk: {
      'c8-3-1': [r`Side: $s = \sqrt{x} - 0 = \sqrt{x}$.`, r`Square area: $A(x) = s^2 = x$.`, r`$V = \int_0^4 x\,dx = \frac{16}{2} = 8$.`],
      'c8-3-2': [r`Side (diameter): $s = 2\sqrt{x}$.`, r`Semicircle area: $\frac{\pi}{8}s^2 = \frac{\pi}{8}(4x) = \frac{\pi x}{2}$.`, r`$V = \int_0^2 \frac{\pi x}{2}\,dx = \frac{\pi}{2} \cdot 2 = \pi \approx 3.142$.`],
      'c8-3-3': [r`Side: $s = x$.`, r`Square area: $x^2$.`, r`$V = \int_0^2 x^2\,dx = \frac{8}{3} \approx 2.667$.`],
      'c8-3-4': [r`Base from $x = -2$ to 2 (where $4 - x^2 = 0$); side $s = 4 - x^2$.`, r`$A = (4 - x^2)^2 = 16 - 8x^2 + x^4$.`, r`By symmetry, $V = 2\int_0^2 (16 - 8x^2 + x^4)\,dx = 2\left(32 - \frac{64}{3} + \frac{32}{5}\right)$.`, r`$= 2 \cdot \frac{480 - 320 + 96}{15} = \frac{512}{15} \approx 34.133$.`],
      'c8-3-5': [r`Side $s = 1 - x^2$ on $[-1, 1]$.`, r`Triangle area: $\frac{\sqrt{3}}{4}(1 - x^2)^2$.`, r`$\int_{-1}^1 (1 - x^2)^2\,dx = \frac{16}{15}$, so $V = \frac{\sqrt{3}}{4} \cdot \frac{16}{15} = \frac{4\sqrt{3}}{15} \approx 0.4619$.`],
      'c8-3-6': [r`Side $s = e^{-x}$; square area $e^{-2x}$.`, r`$V = \int_0^1 e^{-2x}\,dx = \left[-\frac{1}{2}e^{-2x}\right]_0^1$.`, r`$= -\frac{1}{2}e^{-2} + \frac{1}{2} = \frac{1 - e^{-2}}{2} \approx 0.432$.`],
    },
    teach: {
      plan: [r`Slice a loaf of bread (or draw it) to explain $V = \int A(x)\,dx$.`, r`Draw a base region and stand a square on one strip.`, r`Find $s(x)$, then $A(x)$, then integrate. Do the $\sqrt{x}$ example.`, r`Review the area formulas for common shapes.`, r`Do a semicircle problem, watching the diameter vs radius trap.`],
      questions: [
        { q: 'What is s for a semicircle?', a: r`The diameter. So the radius is $\frac{s}{2}$ and the area is $\frac{1}{2}\pi\left(\frac{s}{2}\right)^2 = \frac{\pi}{8}s^2$.` },
        { q: 'What if slices are perpendicular to the y-axis?', a: r`Then $s$ is right curve minus left curve, written in $y$, and you integrate $dy$.` },
        { q: 'Why is volume an integral of area?', a: 'Each thin slice is approximately a flat plate: volume = area × thickness. Adding infinitely thin plates is an integral.' },
      ],
      keyPoints: ['V = ∫ A(x) dx.', 's = top − bottom of the base at x.', 'Use the right area formula for the cross-section shape.', 'Semicircles: s is the diameter.'],
    },
  },
  'c8-4': {
    bigIdea: [
      r`Spin a flat region around a line and it sweeps out a 3D solid, like a pottery wheel turning clay. Slice that solid perpendicular to the axis and each slice is a circle (a disc), so its area is $\pi R^2$. Volume $= \pi\int R^2\,dx$.`,
      r`If the region does not touch the axis, each slice is a disc with a hole: a washer. Its area is the big circle minus the hole: $\pi(R^2 - r^2)$, with $R$ the outer radius and $r$ the inner radius.`,
      r`Everything depends on writing the radius correctly: it is the DISTANCE from the axis of rotation to the curve. For the $x$-axis that is just $y$; for the line $y = 1$ it is $1 - y$ (or $y - 1$); for the $y$-axis you integrate with respect to $y$ and the radius is $x$.`,
    ],
    picture: { title: 'A pottery wheel', t: r`Draw a curve on a card and spin the card fast around one edge: you see a vase. Every horizontal slice of the vase is a circle whose radius is how far the curve was from the spinning edge. Add up those circles and you get the vase’s volume.` },
    words: [
      { term: 'Solid of revolution', means: 'A 3D shape made by rotating a region around a line.' },
      { term: 'Disc method', means: r`$V = \pi\int R(x)^2\,dx$.` },
      { term: 'Washer method', means: r`$V = \pi\int [R(x)^2 - r(x)^2]\,dx$.` },
      { term: 'Outer / inner radius', means: 'Distance from the axis to the far curve / to the near curve.' },
      { term: 'Axis of rotation', means: 'The line the region spins around.' },
    ],
    tools: [
      { name: 'Cross-section volumes', refresher: r`$V = \int A\,dx$, now with $A = \pi R^2$.`, lesson: 'c8-3' },
      { name: 'Area between curves', refresher: 'Identify top and bottom curves and intersections.', lesson: 'c8-2' },
      { name: 'u-substitution', refresher: r`$\int e^{2x}dx = \frac{1}{2}e^{2x}$.`, lesson: 'c6-5' },
    ],
    why: [
      [r`The region touches the $x$-axis, so each slice is a full disc with radius equal to the curve’s height $\sqrt{x}$.`, r`$\pi R^2 = \pi x$; integrate from 0 to 4.`],
      [r`Rotating the region between two curves leaves a hole: outer radius to the far curve ($x$), inner to the near curve ($x^2$).`, r`Square each radius separately and subtract, then integrate.`],
    ],
    walk: {
      'c8-4-1': [r`Disc radius: $R = \sqrt{x}$, so $R^2 = x$.`, r`$V = \pi\int_0^4 x\,dx = \pi \cdot 8$.`, r`$8\pi \approx 25.133$.`],
      'c8-4-2': [r`Disc radius: $R = x^2$, so $R^2 = x^4$.`, r`$V = \pi\int_0^1 x^4\,dx = \pi \cdot \frac{1}{5}$.`, r`$\frac{\pi}{5} \approx 0.628$.`],
      'c8-4-3': [r`Washers: $R = x$ (far), $r = x^2$ (near), between $x = 0$ and 1.`, r`$V = \pi\int_0^1 (x^2 - x^4)\,dx = \pi\left(\frac{1}{3} - \frac{1}{5}\right)$.`, r`$= \frac{2\pi}{15} \approx 0.419$.`],
      'c8-4-4': [r`Rotating around the $y$-axis: slice horizontally, integrate in $y$ from 0 to 1.`, r`Radius = distance from the $y$-axis to the curve = $x = \sqrt{y}$.`, r`$V = \pi\int_0^1 (\sqrt{y})^2\,dy = \pi\int_0^1 y\,dy = \frac{\pi}{2} \approx 1.571$.`],
      'c8-4-5': [r`Axis $y = 1$ is the top of the region, so slices are discs.`, r`Radius = distance from $y = 1$ down to the curve: $1 - x^2$, for $x$ from $-1$ to 1.`, r`$V = \pi\int_{-1}^1 (1 - x^2)^2\,dx = \pi \cdot \frac{16}{15} \approx 3.351$.`],
      'c8-4-6': [r`Disc radius $R = e^x$, so $R^2 = e^{2x}$.`, r`$V = \pi\int_0^1 e^{2x}\,dx = \pi\left[\frac{e^{2x}}{2}\right]_0^1 = \frac{\pi(e^2 - 1)}{2}$.`, r`$\approx 10.036$.`],
    },
    teach: {
      plan: [r`Spin a card with a curve drawn on it (or imagine a pottery wheel).`, r`Show that each slice is a disc and derive $V = \pi\int R^2\,dx$.`, r`Introduce washers for regions that don’t touch the axis.`, r`Practice writing radii for different axes ($x$-axis, $y = 1$, $y$-axis).`, r`Warn about $(R - r)^2$ vs $R^2 - r^2$.`],
      questions: [
        { q: 'Disc or washer?', a: 'If the region touches the axis along the whole interval, discs. If there is a gap between the region and the axis, washers.' },
        { q: 'How do I find the radius around a line like y = 1?', a: r`Distance from the line to the curve: $|1 - f(x)|$. Draw it to see which is bigger.` },
        { q: 'Why can’t I subtract the radii first?', a: r`Areas subtract, not radii: a washer’s area is $\pi R^2 - \pi r^2$, which is not $\pi(R - r)^2$.` },
      ],
      keyPoints: ['Disc: V = π∫R².', 'Washer: V = π∫(R² − r²).', 'Radius = distance from the axis to the curve.', 'Horizontal axis → dx; vertical axis → dy.'],
    },
  },
  'c8-5': {
    bigIdea: [
      r`How long is a curvy road? Break it into tiny pieces. Each piece is almost a straight line, the hypotenuse of a tiny right triangle with horizontal side $dx$ and vertical side $dy$. Its length is $\sqrt{dx^2 + dy^2}$ by the Pythagorean theorem.`,
      r`Factor out $dx$: $\sqrt{1 + \left(\frac{dy}{dx}\right)^2}\,dx$. Adding up all the tiny pieces gives the arc length formula: $L = \int_a^b \sqrt{1 + [f'(x)]^2}\,dx$.`,
      r`Most arc length integrals can’t be done by hand, so the calculator section uses them. The ones that can be done by hand are built so that $1 + (f')^2$ is a perfect square, making the square root disappear.`,
    ],
    picture: { title: 'Measuring a river with a string', t: r`To measure a winding river on a map, lay a string along it and then straighten the string against a ruler. Each tiny bit of string covers a tiny straight hypotenuse: horizontal step $dx$, vertical step $dy$. Arc length adds those hypotenuses.` },
    words: [
      { term: 'Arc length', means: 'The length of a curve between two points.' },
      { term: 'Arc length formula', means: r`$L = \int_a^b \sqrt{1 + [f'(x)]^2}\,dx$.` },
      { term: 'Perfect square', means: r`An expression equal to something squared, like $\left(\frac{x^2}{2} + \frac{1}{2x^2}\right)^2$.` },
    ],
    tools: [
      { name: 'Pythagorean theorem', refresher: r`Hypotenuse $= \sqrt{a^2 + b^2}$.` },
      { name: 'Derivatives', refresher: r`$(\ln\cos x)' = -\tan x$; $\left(\frac{2}{3}x^{3/2}\right)' = x^{1/2}$.`, lesson: 'c3-1' },
      { name: 'Trig identity', refresher: r`$1 + \tan^2 x = \sec^2 x$.`, lesson: 'c0-8' },
      { name: 'u-substitution', refresher: r`$\int\sqrt{1 + x}\,dx = \frac{2}{3}(1 + x)^{3/2}$.`, lesson: 'c6-5' },
    ],
    why: [
      [r`The formula needs $(y')^2$; here it simplifies nicely to $x$, so $1 + (y')^2 = 1 + x$.`, r`$\sqrt{1 + x}$ integrates with the power rule (substitution $u = 1 + x$).`],
      [r`$(y')^2 = \tan^2 x$, and the identity $1 + \tan^2 x = \sec^2 x$ makes the square root clean: $\sqrt{\sec^2 x} = \sec x$.`, r`The antiderivative of $\sec x$ is $\ln|\sec x + \tan x|$.`],
    ],
    walk: {
      'c8-5-1': [r`$y' = \frac{2}{3}\cdot\frac{3}{2}x^{1/2} = \sqrt{x}$, so $1 + (y')^2 = 1 + x$.`, r`$L = \int_0^3 \sqrt{1 + x}\,dx = \left[\frac{2}{3}(1 + x)^{3/2}\right]_0^3$.`, r`$\frac{2}{3}(8) - \frac{2}{3}(1) = \frac{14}{3} \approx 4.667$.`],
      'c8-5-2': [r`$y' = 3$, so $1 + (y')^2 = 10$.`, r`$L = \int_0^4 \sqrt{10}\,dx = 4\sqrt{10}$.`, r`$\approx 12.649$. (Check: it is a straight line from $(0, 0)$ to $(4, 12)$; distance $\sqrt{16 + 144} = \sqrt{160} = 4\sqrt{10}$ ✓.)`],
      'c8-5-3': [r`$y' = 2x$, so $1 + (y')^2 = 1 + 4x^2$.`, r`$L = \int_0^1 \sqrt{1 + 4x^2}\,dx$, which needs a calculator.`, r`$\approx 1.479$.`],
      'c8-5-4': [r`$y' = \frac{-\sin x}{\cos x} = -\tan x$, so $1 + (y')^2 = 1 + \tan^2 x = \sec^2 x$.`, r`$L = \int_0^{\pi/4}\sec x\,dx = \left[\ln|\sec x + \tan x|\right]_0^{\pi/4}$.`, r`$\ln(\sqrt{2} + 1) - \ln(1 + 0) \approx 0.881$.`],
      'c8-5-5': [r`A tiny piece of curve is a hypotenuse with legs $dx$ and $dy = f'(x)dx$.`, r`Length $\sqrt{dx^2 + (f'dx)^2} = \sqrt{1 + [f'(x)]^2}\,dx$.`, r`So choice C. (A squares $f$ instead of $f'$, a classic mistake.)`],
      'c8-5-6': [r`$y' = \frac{x^2}{2} - \frac{1}{2x^2}$. Squaring: $(y')^2 = \frac{x^4}{4} - \frac{1}{2} + \frac{1}{4x^4}$.`, r`$1 + (y')^2 = \frac{x^4}{4} + \frac{1}{2} + \frac{1}{4x^4} = \left(\frac{x^2}{2} + \frac{1}{2x^2}\right)^2$: a perfect square!`, r`$L = \int_1^2\left(\frac{x^2}{2} + \frac{1}{2x^2}\right)dx = \left[\frac{x^3}{6} - \frac{1}{2x}\right]_1^2$.`, r`$\left(\frac{8}{6} - \frac{1}{4}\right) - \left(\frac{1}{6} - \frac{1}{2}\right) = \frac{13}{12} + \frac{1}{3} = \frac{17}{12} \approx 1.4167$.`],
    },
    teach: {
      plan: [r`Measure a curve on paper with a string to show what arc length means.`, r`Draw the tiny triangle and derive the formula with the Pythagorean theorem.`, r`Do the straight-line example and check it with the distance formula.`, r`Do $\frac{2}{3}x^{3/2}$ by hand.`, r`Explain that most arc lengths are calculator problems.`],
      questions: [
        { q: 'Why is there a 1 in the formula?', a: r`It comes from factoring $dx^2$ out of $dx^2 + dy^2$: $dx^2(1 + (dy/dx)^2)$.` },
        { q: 'Can I always do arc length by hand?', a: 'Rarely. Only specially designed functions simplify. On the exam, set it up and use the calculator.' },
        { q: 'Is it f or f′ inside the root?', a: r`$f'$, the derivative, squared: $\sqrt{1 + [f'(x)]^2}$.` },
      ],
      keyPoints: ['L = ∫√(1 + (f′)²) dx.', 'It comes from the Pythagorean theorem on tiny pieces.', 'By hand only when 1 + (f′)² is a perfect square.', 'Square the derivative, not the function.'],
    },
  },
};

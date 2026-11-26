import type { CalcLesson, CalcProblem, LessonTutor } from '../calc/types';
import { near } from '../calc/types';

const r = String.raw;
const P = (id: string, level: 1 | 2 | 3, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, hint, solution, ...extra });

const spend = (mpc: number) => 1 / (1 - mpc);
const tax = (mpc: number) => -mpc / (1 - mpc);

const ADAS = r`~~~
Price level                100   110   120   130   140
Real GDP demanded (AD)     900   850   800   750   700
Real GDP supplied (SRAS)   650   725   800   875   950
Potential GDP (LRAS):      850
(real GDP in billions of dollars)
~~~`;
const PL = [100, 110, 120, 130, 140], AD = [900, 850, 800, 750, 700], SRAS = [650, 725, 800, 875, 950];
const POT = 850;
/** the table comes from these lines: AD: Y = 1,400 − 5P; SRAS: Y = −100 + 7.5P */
const adY = (p: number) => 1400 - 5 * p, srasY = (p: number) => -100 + 7.5 * p;

/** AP Macroeconomics Unit 3. Original lessons and problems. */
export const MACRO_B: CalcLesson[] = [
  {
    id: 'ma3-1', unit: 3, n: 1, title: 'Aggregate demand and the multipliers',
    intro: 'Aggregate demand is the total spending on a country’s output at each price level. A change in spending ripples through the economy: one person’s spending is another person’s income, which they spend again. Today you learn why the AD curve slopes down, what shifts it, and how the multipliers measure the ripples.',
    goals: ['Explain why the aggregate demand curve slopes downward', 'Identify changes in C, I, G and Xn that shift AD', 'Compute MPC, MPS and the spending and tax multipliers', 'Compute the maximum change in real GDP from a change in spending or taxes'],
    notes: [
      { k: 'p', t: r`**Aggregate demand (AD)** shows the quantity of real GDP demanded at each price level. It slopes downward because of the **wealth (real balances) effect** (a lower price level makes money go further), the **interest rate effect** (lower prices reduce money demand and interest rates, encouraging investment) and the **exchange rate effect** (cheaper domestic goods raise net exports).` },
      { k: 'list', items: [r`AD shifts when C, I, G or Xn changes for any reason other than the price level.`, r`C: consumer confidence, wealth, household taxes and debt. I: business expectations, interest rates, business taxes. G: government purchases. Xn: foreign incomes, exchange rates, tastes for exports.`] },
      { k: 'formula', t: r`MPC + MPS = 1 \qquad \text{spending multiplier} = \frac{1}{1 - MPC} = \frac{1}{MPS}` },
      { k: 'formula', t: r`\text{tax multiplier} = -\frac{MPC}{MPS}` },
      { k: 'rule', title: 'Using the multipliers', t: r`Maximum change in real GDP = initial change in spending × spending multiplier, or change in taxes × tax multiplier. If government spending and taxes change by the same amount, real GDP changes by that same amount (the balanced-budget multiplier is 1).` },
      { k: 'warn', t: r`The tax multiplier is one smaller in size than the spending multiplier, because people save part of a tax cut before spending the rest. Also, a change in the price level moves along AD; it never shifts AD.` },
    ],
    examples: [
      { q: r`The MPC is 0.8. Government spending increases by \$50 billion. What is the maximum change in real GDP?`, steps: [r`Spending multiplier $= \frac{1}{1 - 0.8} = \frac{1}{0.2} = 5$.`, r`Maximum change $= 50 \times 5 = \$250$ billion.`], a: '+\\$250 billion' },
      { q: r`With the same MPC of 0.8, the government cuts taxes by \$50 billion instead. What is the maximum change in real GDP?`, steps: [r`Tax multiplier $= -\frac{0.8}{0.2} = -4$. A tax cut is a change of $-50$.`, r`Change in real GDP $= -4 \times (-50) = +\$200$ billion, less than the spending increase because \$10 billion of the tax cut is saved before any of it is spent.`], a: '+\\$200 billion' },
    ],
    practice: [
      P('ma3-1-1', 1, r`The MPC is 0.75. What is the spending multiplier?`, ['4'], '1 ÷ (1 − MPC).', [r`$\frac{1}{1 - 0.75} = \frac{1}{0.25} = 4$.`], { check: () => near(spend(0.75), 4) }),
      P('ma3-1-2', 1, r`The MPS is 0.1. What is the spending multiplier?`, ['10'], 'The multiplier is 1 ÷ MPS.', [r`$\frac{1}{0.1} = 10$.`], { check: () => near(spend(0.9), 10) }),
      P('ma3-1-3', 2, r`The MPC is 0.75 and investment spending rises by \$20 billion. What is the maximum increase in real GDP, in billions of dollars?`, ['80'], 'Initial change × spending multiplier.', [r`Multiplier = 4, so $20 \times 4 = 80$.`], { check: () => near(20 * spend(0.75), 80) }),
      P('ma3-1-4', 2, r`The MPC is 0.9 and the government raises taxes by \$10 billion. What is the maximum change in real GDP, in billions of dollars? (Use a negative number for a decrease.)`, ['-90'], 'Tax multiplier = −MPC ÷ MPS.', [r`Tax multiplier $= -\frac{0.9}{0.1} = -9$.`, r`$-9 \times 10 = -90$.`], { check: () => near(tax(0.9) * 10, -90) }),
      P('ma3-1-5', 1, r`Which of the following shifts aggregate demand to the right?`, 1, 'Which choice changes C, I, G or Xn without being a price-level change?', [r`Higher consumer confidence raises consumption at every price level, shifting AD right.`], { choices: ['An increase in the price level', 'An increase in consumer confidence', 'An increase in personal income taxes', 'A decrease in incomes in other countries'] }),
      P('ma3-1-6', 3, r`The MPC is 0.8. The government increases spending by \$30 billion and raises taxes by \$30 billion. What is the maximum change in real GDP, in billions of dollars?`, ['30'], 'Add the effect of each change.', [r`Spending: $30 \times 5 = 150$. Taxes: $30 \times (-4) = -120$.`, r`Total $= 150 - 120 = 30$: the balanced-budget multiplier is 1.`], { check: () => near(30 * spend(0.8) + 30 * tax(0.8), 30) }),
    ],
    remember: ['AD slopes down: wealth, interest rate and exchange rate effects.', 'Spending multiplier = 1/MPS; tax multiplier = −MPC/MPS.', 'Equal changes in G and T change real GDP by that same amount.'],
    checkIn: 'Next: aggregate supply, and putting AD and AS together.',
  },
  {
    id: 'ma3-2', unit: 3, n: 2, title: 'Aggregate supply and macroeconomic equilibrium',
    intro: 'Aggregate supply shows how much firms produce at each price level. In the short run, wages are slow to change, so output rises when prices rise. In the long run, output returns to what the economy’s resources allow. Putting AD and AS together shows where the economy stands: in a recession, overheating, or at full employment.',
    goals: ['Explain why SRAS slopes upward and LRAS is vertical', 'Identify what shifts SRAS', 'Find short-run equilibrium and compare it with potential output', 'Identify recessionary and inflationary output gaps'],
    notes: [
      { k: 'p', t: r`**Short-run aggregate supply (SRAS)** slopes upward because wages and other input prices are **sticky**: when output prices rise but wages have not caught up, producing more is profitable.` },
      { k: 'p', t: r`**Long-run aggregate supply (LRAS)** is vertical at **potential (full-employment) output**. Once all prices and wages adjust, output depends only on resources and technology, just like a point on the PPC.` },
      { k: 'list', items: [r`SRAS shifts left when input prices (wages, oil) rise, productivity falls, business taxes rise or regulations increase, and when expected inflation rises.`, r`SRAS shifts right for the opposite changes.`, r`LRAS shifts right with economic growth: more resources, human capital or better technology.`] },
      { k: 'rule', title: 'Output gaps', t: r`Short-run equilibrium is where AD crosses SRAS. If real GDP is below potential, there is a **recessionary (negative) output gap** and unemployment is above the natural rate. If real GDP is above potential, there is an **inflationary (positive) output gap** and unemployment is below the natural rate.` },
      { k: 'warn', t: r`Long-run equilibrium needs all three curves (AD, SRAS and LRAS) to meet at one point. If AD and SRAS cross anywhere else, the economy is only in short-run equilibrium.` },
      { k: 'p', t: r`Data used today:
${ADAS}` },
    ],
    examples: [
      { q: r`Using the table, find the short-run equilibrium.`, steps: [r`AD equals SRAS at a price level of 120, where both are 800.`, r`Potential GDP is 850, so the economy is producing less than it could.`], a: 'Price level 120, real GDP \\$800 billion' },
      { q: r`What kind of output gap is there, and how large is it?`, steps: [r`Gap = actual − potential $= 800 - 850 = -50$.`, r`A recessionary gap of \$50 billion: unemployment is above the natural rate.`], a: 'Recessionary gap of \\$50 billion' },
    ],
    practice: [
      P('ma3-2-1', 1, r`Using the table, what is the short-run equilibrium price level?`, ['120'], 'Find the column where AD and SRAS match.', [r`At a price level of 120, AD = SRAS = 800.`], { check: () => PL[AD.findIndex((d, i) => d === SRAS[i])] === 120 }),
      P('ma3-2-2', 1, r`Using the table, what is the output gap, in billions of dollars? (Use a negative number for a recessionary gap.)`, ['-50'], 'Equilibrium real GDP minus potential.', [r`$800 - 850 = -50$.`], { check: () => AD[2] - POT === -50 }),
      P('ma3-2-3', 2, r`Oil prices rise sharply. In the short run, what happens to the price level and real GDP?`, 1, 'Oil is an input: which curve shifts?', [r`Higher input costs shift SRAS left: the price level rises and real GDP falls (stagflation).`], { choices: ['The price level rises and real GDP rises', 'The price level rises and real GDP falls', 'The price level falls and real GDP falls', 'The price level falls and real GDP rises'] }),
      P('ma3-2-4', 1, r`The long-run aggregate supply curve is vertical because in the long run`, 1, 'What is sticky in the short run but not in the long run?', [r`Once wages and other input prices fully adjust, a higher price level no longer makes extra production profitable, so output stays at potential.`], { choices: ['the price level never changes', 'wages and other input prices fully adjust to the price level', 'aggregate demand cannot change', 'unemployment is always zero'] }),
      P('ma3-2-5', 2, r`If real GDP is above potential output, the unemployment rate is`, 2, 'Producing more than normal takes more workers than normal.', [r`An inflationary gap means firms hire beyond normal levels, so unemployment is below the natural rate.`], { choices: ['above the natural rate', 'equal to the natural rate', 'below the natural rate', 'zero'] }),
      P('ma3-2-6', 3, r`Starting from the table, AD increases by \$125 billion at every price level. What is the new short-run equilibrium real GDP, in billions of dollars?`, ['875'], 'Add 125 to every AD number and look for a match with SRAS.', [r`New AD: 1,025, 975, 925, 875, 825.`, r`At a price level of 130, new AD = 875 = SRAS. Real GDP is 875, above potential: an inflationary gap of 25.`], { check: () => AD[3] + 125 === SRAS[3] && SRAS[3] === 875 }),
    ],
    remember: ['SRAS slopes up (sticky wages); LRAS is vertical at potential.', 'Real GDP < potential: recessionary gap; > potential: inflationary gap.', 'Input prices and productivity shift SRAS.'],
    checkIn: 'Next: what happens after a shock, and how the economy can fix itself in the long run.',
  },
  {
    id: 'ma3-3', unit: 3, n: 3, title: 'Shocks and long-run self-adjustment',
    intro: 'What happens when the economy is hit by a shock and the government does nothing? In the short run, output and prices move. In the long run, wages and other input prices adjust and the economy drifts back to full employment. Today you trace demand and supply shocks and self-correction in the AD-AS model.',
    goals: ['Distinguish demand shocks from supply shocks', 'Identify demand-pull inflation, cost-push inflation and stagflation', 'Explain how wage adjustment closes an output gap', 'Find the long-run equilibrium after a shock'],
    notes: [
      { k: 'list', items: [r`**Negative demand shock** (AD left): price level ↓, real GDP ↓, unemployment ↑.`, r`**Positive demand shock** (AD right): price level ↑, real GDP ↑: **demand-pull inflation**.`, r`**Negative supply shock** (SRAS left): price level ↑, real GDP ↓: **cost-push inflation** and **stagflation**.`, r`**Positive supply shock** (SRAS right): price level ↓, real GDP ↑.`] },
      { k: 'rule', title: 'Self-adjustment', t: r`In a recessionary gap, high unemployment eventually pushes nominal wages down, SRAS shifts right, and real GDP returns to potential at a lower price level. In an inflationary gap, tight labor markets push wages up, SRAS shifts left, and real GDP returns to potential at a higher price level.` },
      { k: 'p', t: r`In the long run, real GDP returns to potential no matter what happened to AD. Only the price level is permanently different. That is exactly what a vertical LRAS curve says.` },
      { k: 'warn', t: r`Self-adjustment can be slow, especially in recessions, because wages rarely fall quickly. That delay is the main argument for using fiscal and monetary policy.` },
      { k: 'p', t: r`In this lesson the AD-AS table from the last lesson comes from two equations, where P is the price level and Y is real GDP in billions: AD: $Y = 1{,}400 - 5P$; SRAS: $Y = -100 + 7.5P$; potential GDP = 850.` },
    ],
    examples: [
      { q: r`Consumers become pessimistic and cut spending. What happens in the short run, and in the long run with no policy?`, steps: [r`Short run: AD shifts left, so the price level and real GDP fall and unemployment rises: a recessionary gap.`, r`Long run: wages fall, SRAS shifts right, and real GDP returns to potential at an even lower price level.`], a: 'Back to potential at a lower price level' },
      { q: r`Oil prices spike. Describe the short run and the long run with no policy.`, steps: [r`SRAS shifts left: the price level rises and real GDP falls, which is stagflation.`, r`The high unemployment slowly pushes wages and input prices back down, SRAS shifts back right, and the economy returns to potential.`], a: 'Stagflation, then a slow recovery' },
    ],
    practice: [
      P('ma3-3-1', 1, r`The economy is at full employment when AD increases. In the short run,`, 0, 'Move up along SRAS.', [r`AD shifts right along the upward-sloping SRAS: the price level rises and real GDP rises above potential.`], { choices: ['the price level rises and real GDP rises above potential', 'the price level falls and real GDP falls', 'the price level rises and real GDP stays at potential', 'the price level is unchanged and real GDP rises'] }),
      P('ma3-3-2', 2, r`Continuing the previous question, with no policy action what happens in the long run?`, 1, 'What do workers do when labor is scarce and prices have risen?', [r`Wages rise, SRAS shifts left, and real GDP returns to potential at a higher price level.`], { choices: ['SRAS shifts right and the price level falls', 'SRAS shifts left; real GDP returns to potential at a higher price level', 'LRAS shifts right to the new level of real GDP', 'AD shifts back to the left on its own'] }),
      P('ma3-3-3', 1, r`Stagflation is most likely to be caused by`, 2, 'Stagflation = higher prices and lower output at the same time.', [r`Only a leftward shift of SRAS raises the price level while lowering real GDP.`], { choices: ['an increase in aggregate demand', 'a decrease in aggregate demand', 'a decrease in short-run aggregate supply', 'an increase in long-run aggregate supply'] }),
      P('ma3-3-4', 2, r`An economy is in a recessionary gap and the government takes no action. Self-adjustment works through`, 1, 'What happens to wages when unemployment is high?', [r`High unemployment lowers nominal wages, which shifts SRAS right until real GDP reaches potential.`], { choices: ['rising nominal wages, which shift SRAS left', 'falling nominal wages, which shift SRAS right', 'rising government spending, which shifts AD right', 'a falling LRAS curve'] }),
      P('ma3-3-5', 3, r`Using the equations in the notes, wages fall until SRAS crosses AD at potential GDP (850). What is the long-run equilibrium price level?`, ['110'], 'In the long run, AD meets LRAS. Use the AD equation with Y = 850.', [r`$850 = 1{,}400 - 5P$ gives $5P = 550$.`, r`$P = 110$, lower than the short-run price level of 120.`], { check: () => adY(110) === POT && srasY(120) === adY(120) }),
      P('ma3-3-6', 3, r`Using the equations in the notes, by how much must SRAS shift right (in billions of dollars of real GDP at each price level) to reach that long-run equilibrium?`, ['125'], 'Compare where the old SRAS is at P = 110 with the 850 needed.', [r`Old SRAS at $P = 110$: $-100 + 7.5 \times 110 = 725$.`, r`It must reach 850 there: a shift of $850 - 725 = 125$.`], { check: () => POT - srasY(110) === 125 }),
    ],
    remember: ['Demand shocks move P and Y the same way; supply shocks move them opposite ways.', 'Recessionary gap → wages fall → SRAS right; inflationary gap → wages rise → SRAS left.', 'In the long run, real GDP returns to potential; only the price level changes.'],
    checkIn: 'Next: fiscal policy, the government’s way to close gaps faster.',
  },
  {
    id: 'ma3-4', unit: 3, n: 4, title: 'Fiscal policy and automatic stabilizers',
    intro: 'When the economy is in a recession or overheating, the government can change its spending and taxes to push aggregate demand back toward full employment. That is fiscal policy. Today you learn which way to push, how big a push the multipliers require, and the stabilizers that work without any new law.',
    goals: ['Choose expansionary or contractionary fiscal policy for an output gap', 'Compute the change in government spending or taxes needed to close a gap', 'Explain how automatic stabilizers work', 'Describe the limits of fiscal policy, including time lags'],
    notes: [
      { k: 'list', items: [r`**Expansionary fiscal policy** (for a recessionary gap): increase government spending or cut taxes. AD shifts right.`, r`**Contractionary fiscal policy** (for an inflationary gap): cut government spending or raise taxes. AD shifts left.`] },
      { k: 'formula', t: r`\text{needed } \Delta G = \frac{\text{output gap to close}}{\text{spending multiplier}} \qquad \text{needed } \Delta T = \frac{\text{output gap to close}}{\text{tax multiplier}}` },
      { k: 'rule', title: 'Automatic stabilizers', t: r`Progressive income taxes and transfer payments such as unemployment insurance change automatically with the business cycle. In a recession, tax collections fall and transfers rise, supporting spending; in a boom, the reverse cools spending. No new law is needed.` },
      { k: 'p', t: r`**Discretionary** fiscal policy needs Congress and the President to act, which brings time lags: recognizing the problem, passing a law, and the spending actually reaching the economy. Running a budget deficit means government spending (including transfers) exceeds tax revenue.` },
      { k: 'warn', t: r`The change needed is the gap divided by the multiplier, not the gap itself. And for a recessionary gap, the needed change in taxes is negative (a tax cut).` },
    ],
    examples: [
      { q: r`There is a recessionary gap of \$200 billion and the MPC is 0.75. By how much should government spending change to close it?`, steps: [r`Spending multiplier $= \frac{1}{0.25} = 4$.`, r`$\Delta G = \frac{200}{4} = +\$50$ billion.`], a: 'Increase G by \\$50 billion' },
      { q: r`For the same gap, by how much should taxes change instead?`, steps: [r`Tax multiplier $= -\frac{0.75}{0.25} = -3$.`, r`$\Delta T = \frac{200}{-3} \approx -66.7$: cut taxes by about \$66.7 billion. A bigger tax cut is needed because part of it is saved.`], a: 'Cut taxes by about \\$66.7 billion' },
    ],
    practice: [
      P('ma3-4-1', 1, r`To close a recessionary gap, the government should`, 2, 'Which way should AD move?', [r`AD must shift right: raise spending or cut taxes.`], { choices: ['decrease government spending', 'increase taxes', 'increase spending or decrease taxes', 'increase the reserve requirement'] }),
      P('ma3-4-2', 2, r`There is an inflationary gap of \$100 billion and the MPC is 0.8. By how much should government spending change, in billions of dollars? (Use a negative number for a decrease.)`, ['-20'], 'Gap ÷ spending multiplier, in the right direction.', [r`Multiplier $= \frac{1}{0.2} = 5$.`, r`AD must fall by 100: $\Delta G = -\frac{100}{5} = -20$.`], { check: () => near(-100 / spend(0.8), -20) }),
      P('ma3-4-3', 2, r`There is a recessionary gap of \$120 billion and the MPC is 0.75. By how much should taxes change, in billions of dollars? (Use a negative number for a tax cut.)`, ['-40'], 'Gap ÷ tax multiplier.', [r`Tax multiplier $= -3$.`, r`$\Delta T = \frac{120}{-3} = -40$: a \$40 billion tax cut.`], { check: () => near(120 / tax(0.75), -40) }),
      P('ma3-4-4', 1, r`Which of the following is an automatic stabilizer?`, 1, 'Which one happens without any new decision?', [r`Unemployment insurance payments rise automatically when people lose jobs.`], { choices: ['A new highway bill passed by Congress', 'Unemployment insurance payments', 'An open-market purchase of bonds', 'A one-time tax rebate'] }),
      P('ma3-4-5', 2, r`During a recession, with no new laws passed, what happens automatically to tax revenues and transfer payments?`, 1, 'Incomes fall and more people lose jobs.', [r`Lower incomes mean lower tax collections; more unemployed people receive benefits, so transfers rise.`], { choices: ['Tax revenues rise; transfer payments fall', 'Tax revenues fall; transfer payments rise', 'Both rise', 'Both fall'] }),
      P('ma3-4-6', 3, r`The MPC is 0.9 and there is a recessionary gap of \$500 billion. The government raises spending by \$20 billion. How large is the remaining gap, in billions of dollars?`, ['300'], 'How much of the gap does the \\$20 billion close?', [r`Multiplier $= \frac{1}{0.1} = 10$, so \$20 billion closes $20 \times 10 = 200$.`, r`Remaining gap $= 500 - 200 = 300$.`], { check: () => near(500 - 20 * spend(0.9), 300) }),
    ],
    remember: ['Recessionary gap: raise G or cut T; inflationary gap: the reverse.', 'Needed change = gap ÷ multiplier.', 'Automatic stabilizers: progressive taxes and transfers.'],
    checkIn: 'Unit 3 done. Next unit: money, banks, interest rates and the Federal Reserve.',
  },
];

/** Tutor layer for Unit 3. */
export const MACRO_B_TUTOR: Record<string, LessonTutor> = {
  'ma3-1': {
    bigIdea: [
      r`Aggregate demand is everyone’s spending on everything a country makes, added together: households, businesses, government and foreigners. When the overall price level is lower, people can afford more, interest rates tend to fall, and our goods look cheaper to other countries, so the AD curve slopes down.`,
      r`Spending has a ripple effect. If the government pays a builder \$100, the builder spends some of it at a store, the store owner spends some of that, and so on. Each round is smaller because people save part of what they get. The multiplier adds up all the rounds.`,
      r`The fraction people spend from each extra dollar is the MPC. If they spend 80 cents of every dollar, the rounds add up to 5 times the first \$100. A tax cut ripples less, because the first round is partly saved before anyone spends it.`,
    ],
    picture: { title: 'The pizza party ripple', t: r`The school spends \$100 on pizza. The pizzeria owner spends \$80 of it on new shoes. The shoe seller spends \$64 on a haircut, and on it goes. Add all the rounds: \$100 + \$80 + \$64 + … = \$500. That is a multiplier of 5.` },
    words: [
      { term: 'Aggregate demand (AD)', means: 'Total spending on a country’s real output at each price level.' },
      { term: 'MPC / MPS', means: 'Fraction of extra income spent / saved; they add to 1.' },
      { term: 'Spending multiplier', means: '1 ÷ MPS: how many times bigger the total effect is than the first change in spending.' },
      { term: 'Tax multiplier', means: '−MPC ÷ MPS: the effect of a change in taxes.' },
      { term: 'Wealth effect', means: 'A lower price level makes people’s money and savings buy more, so they spend more.' },
    ],
    tools: [
      { name: 'Fractions and decimals', refresher: '1 ÷ 0.2 = 5; 1 ÷ 0.25 = 4.', lesson: 'c0-1' },
      { name: 'Shifting curves', refresher: 'Price changes move along a curve; other changes shift it.', lesson: 'ma1-2' },
    ],
    why: [
      [r`The MPS is the leak in each round; dividing 1 by it adds up all the rounds.`, r`Multiply the first change by that total to get the full effect.`],
      [r`The tax multiplier starts one round later, because the first dollar of a tax cut is partly saved.`, r`That is why the same \$50 billion moves GDP by 200 instead of 250.`],
    ],
    walk: {
      'ma3-1-1': [r`MPS = 1 − 0.75 = 0.25.`, r`Multiplier = 1 ÷ 0.25.`, r`= 4.`],
      'ma3-1-2': [r`The multiplier is 1 ÷ MPS.`, r`1 ÷ 0.1.`, r`= 10.`],
      'ma3-1-3': [r`Multiplier with MPC 0.75: 4.`, r`Initial change: \$20 billion of investment.`, r`20 × 4 = \$80 billion.`],
      'ma3-1-4': [r`MPS = 0.1; tax multiplier = −0.9 ÷ 0.1 = −9.`, r`Taxes rise by 10.`, r`−9 × 10 = −\$90 billion.`],
      'ma3-1-5': [r`A change in the price level moves along AD, so that option is out.`, r`Higher taxes and lower foreign incomes reduce spending (left shifts).`, r`Higher confidence raises consumption: choice B.`],
      'ma3-1-6': [r`Spending multiplier 5: +30 × 5 = +150.`, r`Tax multiplier −4: +30 × (−4) = −120.`, r`Net: +30, the balanced-budget multiplier of 1.`],
    },
    teach: {
      plan: [r`List the four parts of AD: C, I, G, Xn.`, r`Explain the three reasons AD slopes down.`, r`Tell the pizza-party ripple story and add up the rounds.`, r`Derive 1 ÷ MPS and compute a multiplier effect.`, r`Show why the tax multiplier is smaller, then do a balanced-budget example.`],
      questions: [
        { q: 'Why does the multiplier get bigger when the MPC is bigger?', a: 'More of each dollar is spent in every round, so the ripples last longer.' },
        { q: 'Does a higher price level shift AD left?', a: 'No. It moves along AD to a smaller quantity of real GDP demanded.' },
        { q: 'Why is the tax multiplier smaller than the spending multiplier?', a: 'Government spending is spent in full in the first round; a tax cut is partly saved before the first round of spending.' },
      ],
      keyPoints: ['AD = C + I + G + Xn at each price level.', 'Spending multiplier = 1/MPS.', 'Tax multiplier = −MPC/MPS.', 'Balanced-budget multiplier = 1.'],
    },
  },
  'ma3-2': {
    bigIdea: [
      r`Aggregate supply answers: if prices across the economy rise, will firms make more? In the short run, yes. Workers’ wages are set by contracts and habits, so they lag behind. When a firm’s prices rise but its wages don’t, producing more becomes profitable.`,
      r`In the long run, wages catch up. Then a higher price level doesn’t make anyone better off, and the economy produces what its workers, machines and technology allow: potential output. That is why long-run aggregate supply is a vertical line.`,
      r`Where AD crosses SRAS, the economy is in short-run equilibrium. If that output is below potential, factories and workers are idle: a recessionary gap. If it is above potential, the economy is running too hot: an inflationary gap.`,
    ],
    picture: { title: 'The lemonade stand in summer', t: r`If lemonade prices jump this week but you pay your helper the same \$10 an hour, you open longer hours. Next summer your helper asks for a raise to match, and the extra profit disappears. Short run: you produce more. Long run: you are back to normal.` },
    words: [
      { term: 'SRAS', means: 'Short-run aggregate supply: upward sloping because wages are sticky.' },
      { term: 'LRAS', means: 'Long-run aggregate supply: vertical at potential output.' },
      { term: 'Potential output', means: 'Real GDP when unemployment is at its natural rate.' },
      { term: 'Recessionary gap', means: 'Real GDP below potential.' },
      { term: 'Inflationary gap', means: 'Real GDP above potential.' },
    ],
    tools: [
      { name: 'The PPC', refresher: 'LRAS is the AD-AS version of producing on the PPC.', lesson: 'ma1-1' },
      { name: 'Equilibrium', refresher: 'Find where the two curves give the same quantity.', lesson: 'ma1-2' },
    ],
    why: [
      [r`Equilibrium is where buyers’ total spending matches what firms produce.`, r`Comparing it with potential tells you whether resources are idle.`],
      [r`The gap is actual output minus potential output.`, r`A negative gap means output is too low and unemployment too high.`],
    ],
    walk: {
      'ma3-2-1': [r`Look for the price level where AD and SRAS are equal.`, r`At 120, AD = 800 and SRAS = 800.`, r`Price level 120.`],
      'ma3-2-2': [r`Equilibrium real GDP: 800. Potential: 850.`, r`800 − 850.`, r`= −50: a recessionary gap.`],
      'ma3-2-3': [r`Oil is an input, so SRAS shifts left.`, r`Moving up along AD: the price level rises and real GDP falls.`, r`Choice B (stagflation).`],
      'ma3-2-4': [r`SRAS slopes up only because wages lag.`, r`When wages fully adjust, higher prices give no reason to produce more.`, r`Choice B.`],
      'ma3-2-5': [r`Above potential means producing more than the normal workforce can.`, r`Firms hire extra workers, so fewer people are unemployed than normal.`, r`Below the natural rate (choice C).`],
      'ma3-2-6': [r`Add 125 to each AD value: 1,025, 975, 925, 875, 825.`, r`Compare with SRAS: at 130 both are 875.`, r`New real GDP = 875, an inflationary gap of 25.`],
    },
    teach: {
      plan: [r`Tell the lemonade-stand story for sticky wages.`, r`Draw SRAS and LRAS and explain their shapes.`, r`Add AD and find the short-run equilibrium.`, r`Label a recessionary gap and an inflationary gap.`, r`List three things that shift SRAS.`],
      questions: [
        { q: 'Why is LRAS vertical?', a: 'In the long run, wages and prices fully adjust, so output depends only on resources and technology.' },
        { q: 'If AD = SRAS at a point left of LRAS, what is unemployment like?', a: 'Above the natural rate: there is a recessionary gap.' },
        { q: 'What happens to SRAS if oil prices fall?', a: 'It shifts right: costs fall, so firms supply more at each price level.' },
      ],
      keyPoints: ['SRAS slopes up because wages are sticky.', 'LRAS is vertical at potential output.', 'Gap = actual − potential real GDP.', 'Input prices shift SRAS.'],
    },
  },
  'ma3-3': {
    bigIdea: [
      r`A shock is a sudden change. A demand shock (people stop spending, or start spending more) moves AD. A supply shock (an oil price spike, a drought, a new technology) moves SRAS. Demand shocks push prices and output the same direction; supply shocks push them in opposite directions.`,
      r`The scariest is a negative supply shock, which raises prices and lowers output at the same time: stagflation. There is no painless fix, because pushing output up also pushes prices up more.`,
      r`If nobody acts, the economy slowly fixes itself. In a recession, people out of work eventually accept lower wages; costs fall, SRAS shifts right, and output climbs back to potential. In a boom, wages rise and SRAS shifts left. Either way the economy ends up at potential; only prices are different.`,
    ],
    picture: { title: 'A rubber band', t: r`Stretch a rubber band and it snaps back, but slowly if it’s cold. The economy is like that: shocks pull output away from potential, and wage changes pull it back, slowly when wages are stiff.` },
    words: [
      { term: 'Demand-pull inflation', means: 'Rising prices caused by AD increasing.' },
      { term: 'Cost-push inflation', means: 'Rising prices caused by SRAS decreasing.' },
      { term: 'Stagflation', means: 'Inflation and rising unemployment at the same time.' },
      { term: 'Self-adjustment', means: 'Wages and input prices change until real GDP returns to potential.' },
    ],
    tools: [
      { name: 'Solving a linear equation', refresher: 'Set Y = 850 and solve for P.', lesson: 'c0-2' },
      { name: 'AD-AS equilibrium', refresher: 'Find where curves cross; compare with LRAS.', lesson: 'ma3-2' },
    ],
    why: [
      [r`Less spending at every price level shifts AD left along SRAS.`, r`High unemployment lowers wages, which lowers costs and shifts SRAS right until output reaches potential.`],
      [r`An input-cost jump shifts SRAS left: prices up, output down.`, r`The unemployment it creates eventually pushes costs down again.`],
    ],
    walk: {
      'ma3-3-1': [r`AD shifts right along an upward-sloping SRAS.`, r`Both the price level and real GDP rise; real GDP goes past potential.`, r`Choice A.`],
      'ma3-3-2': [r`Unemployment is now below normal, so workers demand higher wages.`, r`Higher wages raise costs: SRAS shifts left.`, r`Real GDP returns to potential at an even higher price level (choice B).`],
      'ma3-3-3': [r`Stagflation means prices up, output down.`, r`AD shifts move them the same way, so it must be SRAS.`, r`SRAS decreases (choice C).`],
      'ma3-3-4': [r`High unemployment weakens workers’ bargaining power.`, r`Nominal wages fall, lowering costs.`, r`SRAS shifts right (choice B).`],
      'ma3-3-5': [r`Long-run equilibrium is on LRAS, so Y = 850.`, r`AD: 850 = 1,400 − 5P, so 5P = 550.`, r`P = 110.`],
      'ma3-3-6': [r`The old SRAS gives Y = −100 + 7.5 × 110 = 725 at P = 110.`, r`The new SRAS must give 850 there.`, r`Shift = 850 − 725 = 125.`],
    },
    teach: {
      plan: [r`Sort four events into AD or SRAS shocks.`, r`Show demand-pull vs cost-push inflation on graphs.`, r`Explain stagflation and why it is hard to fix.`, r`Walk a recessionary gap through wage adjustment back to potential.`, r`Solve for the long-run price level using the equations.`],
      questions: [
        { q: 'After a demand shock and full self-adjustment, what has changed?', a: 'Only the price level. Real GDP is back at potential.' },
        { q: 'Why is self-adjustment slow in recessions?', a: 'Nominal wages are sticky downward; workers and employers resist pay cuts.' },
        { q: 'How can you tell a supply shock from a demand shock on the news?', a: 'If prices and output move in opposite directions, it is a supply shock.' },
      ],
      keyPoints: ['Demand shocks: P and Y move together.', 'Supply shocks: P and Y move in opposite directions.', 'Wages adjust to close gaps in the long run.', 'Long run: real GDP at potential.'],
    },
  },
  'ma3-4': {
    bigIdea: [
      r`If the economy is stuck in a recession, the government doesn’t have to wait for wages to fall. It can add spending itself, or cut taxes so households spend more. Both shift AD to the right. If the economy is overheating, it does the reverse.`,
      r`Thanks to the multiplier, the government doesn’t need to fill the whole gap itself. With a multiplier of 4, \$50 billion of new spending can close a \$200 billion gap. Divide the gap by the multiplier to find the right dose.`,
      r`Some fiscal policy runs on autopilot. When people lose jobs, they pay less tax and collect unemployment benefits automatically, which cushions the fall in spending. These automatic stabilizers act faster than any new law.`,
    ],
    picture: { title: 'A thermostat', t: r`When the room is cold (recession), the heater turns on (more spending, lower taxes). When it’s too hot (inflation), the air conditioner kicks in (less spending, higher taxes). Automatic stabilizers are the thermostat doing it without anyone touching the dial.` },
    words: [
      { term: 'Fiscal policy', means: 'Changes in government spending and taxes to influence the economy.' },
      { term: 'Expansionary / contractionary', means: 'Policy that increases / decreases AD.' },
      { term: 'Automatic stabilizer', means: 'A tax or transfer that changes with the economy without new laws.' },
      { term: 'Budget deficit', means: 'Government spending and transfers greater than tax revenue in a year.' },
      { term: 'Time lags', means: 'Delays in recognizing problems, passing laws and seeing effects.' },
    ],
    tools: [
      { name: 'The multipliers', refresher: 'Spending 1/MPS; tax −MPC/MPS.', lesson: 'ma3-1' },
      { name: 'Output gaps', refresher: 'Gap = actual − potential real GDP.', lesson: 'ma3-2' },
    ],
    why: [
      [r`Each dollar of G is multiplied by 4 on its way through the economy.`, r`So only a quarter of the gap needs to be spent directly.`],
      [r`The tax multiplier is −3, so a tax cut is less powerful per dollar.`, r`Dividing the gap by −3 gives a negative ΔT: a larger tax cut than the spending increase.`],
    ],
    walk: {
      'ma3-4-1': [r`A recessionary gap means AD is too low.`, r`To shift AD right: spend more or tax less.`, r`Choice C. (The reserve requirement is monetary policy.)`],
      'ma3-4-2': [r`Inflationary gap: AD must fall by 100.`, r`Spending multiplier with MPC 0.8: 5.`, r`ΔG = −100 ÷ 5 = −20.`],
      'ma3-4-3': [r`Recessionary gap: AD must rise by 120.`, r`Tax multiplier with MPC 0.75: −3.`, r`ΔT = 120 ÷ (−3) = −40, a tax cut.`],
      'ma3-4-4': [r`An automatic stabilizer works without a new decision.`, r`Unemployment benefits rise automatically as people lose jobs.`, r`Choice B.`],
      'ma3-4-5': [r`In a recession incomes fall, so income tax collections fall.`, r`More people qualify for benefits, so transfers rise.`, r`Choice B.`],
      'ma3-4-6': [r`Multiplier with MPC 0.9: 10.`, r`\$20 billion × 10 = \$200 billion of the gap closed.`, r`500 − 200 = 300 left.`],
    },
    teach: {
      plan: [r`Use the thermostat picture to introduce fiscal policy.`, r`Match each gap with the right policy direction.`, r`Compute the needed ΔG with the spending multiplier.`, r`Compute the needed ΔT with the tax multiplier and compare.`, r`Explain automatic stabilizers and time lags.`],
      questions: [
        { q: 'Why is a smaller change in G needed than the size of the gap?', a: 'The multiplier enlarges each dollar of new spending.' },
        { q: 'Why does a tax cut need to be bigger than a spending increase to close the same gap?', a: 'People save part of a tax cut, so its multiplier is smaller.' },
        { q: 'Give one automatic stabilizer and explain how it works in a boom.', a: 'Progressive income taxes: as incomes rise, people pay a larger share in taxes, which slows spending.' },
      ],
      keyPoints: ['Recession: raise G or cut T.', 'Inflation: cut G or raise T.', 'Needed change = gap ÷ multiplier.', 'Automatic stabilizers soften the cycle without new laws.'],
    },
  },
};

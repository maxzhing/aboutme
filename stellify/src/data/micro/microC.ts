import type { CalcLesson, CalcProblem, LessonTutor } from '../calc/types';

const r = String.raw;
const P = (id: string, level: 1 | 2 | 3, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, hint, solution, ...extra });

const LABOR = r`~~~
Workers           1    2    3    4    5
Marginal product 10    9    7    5    3
~~~`;
const MPL = [10, 9, 7, 5, 3];
const MONO = r`~~~
Workers                  1    2    3    4    5
Wage needed to hire     10   12   14   16   18
MRP                     30   26   22   18   14
~~~`;
const WAGE = [10, 12, 14, 16, 18], MRP = [30, 26, 22, 18, 14];
const MFC = (n: number) => n * WAGE[n - 1] - (n - 1) * (WAGE[n - 2] ?? 0);

/** AP Microeconomics Units 5–6. Original lessons and problems. */
export const MICRO_C: CalcLesson[] = [
  {
    id: 'mi5-1', unit: 5, n: 1, title: 'Factor demand and marginal revenue product',
    intro: 'In factor markets the roles flip: firms are the buyers, and households sell their labor. How many workers should a firm hire? The same marginal logic applies: hire while an extra worker adds at least as much revenue as he or she costs.',
    goals: ['Explain derived demand', 'Compute marginal revenue product (MRP)', 'Find the profit-maximizing number of workers in a competitive labor market', 'Identify what shifts labor demand and supply'],
    notes: [
      { k: 'p', t: r`Demand for labor is a **derived demand**: firms want workers because consumers want the products they make.` },
      { k: 'formula', t: r`MRP = MP \times MR \qquad (\text{in a competitive product market}, MR = P)` },
      { k: 'rule', title: 'Hiring rule', t: r`Hire workers until MRP = MRC (marginal resource cost). In a perfectly competitive labor market, the firm is a wage taker, so MRC = the wage: hire every worker whose MRP ≥ wage.` },
      { k: 'list', items: [r`Labor demand shifts with the product’s price, worker productivity, and the prices of other inputs.`, r`Labor supply shifts with population, preferences for work vs leisure, and the wages in other jobs.`] },
      { k: 'p', t: r`Data used today (product price \$4):
${LABOR}` },
    ],
    examples: [
      { q: r`With a product price of \$4, find each worker’s MRP and the number hired at a wage of \$20.`, steps: [r`MRP = MP × 4: 40, 36, 28, 20, 12.`, r`Hire while MRP ≥ 20: workers 1–4 (the 4th exactly breaks even). Hire 4.`], a: '4 workers' },
      { q: r`The product price rises to \$6. What happens to the demand for labor?`, steps: [r`Each MRP rises (MP × 6), so every worker is worth more to the firm.`, r`Labor demand shifts right; more workers are hired at the same wage.`], a: 'Increases' },
    ],
    practice: [
      P('mi5-1-1', 1, r`Using the table with a product price of \$4, what is the MRP of the 3rd worker?`, ['28'], 'MP × P.', [r`$7 \times 4 = 28$.`], { check: () => MPL[2] * 4 === 28 }),
      P('mi5-1-2', 1, r`With a product price of \$4 and a wage of \$20, how many workers does the firm hire?`, ['4'], 'Hire while MRP ≥ wage.', [r`MRP: 40, 36, 28, 20, 12. Workers 1–4 have MRP ≥ 20.`], { check: () => MPL.map((m) => m * 4).filter((v) => v >= 20).length === 4 }),
      P('mi5-1-3', 2, r`If the product price rises to \$6, what is the MRP of the 4th worker?`, ['30'], 'Same MP, new price.', [r`$5 \times 6 = 30$.`], { check: () => MPL[3] * 6 === 30 }),
      P('mi5-1-4', 1, r`The demand for labor is called a derived demand because`, 2, 'Why do firms want workers?', [r`Firms hire workers to produce goods that consumers demand.`], { choices: ['it is set by the government', 'workers decide how much to work', 'it depends on the demand for the products workers make', 'it is always perfectly elastic'] }),
      P('mi5-1-5', 2, r`Which would increase a firm’s demand for workers?`, 0, 'What raises MRP?', [r`Higher productivity raises MP, so MRP rises at every quantity of labor.`], { choices: ['An increase in workers’ productivity', 'An increase in the wage', 'A decrease in the price of the product', 'A decrease in the number of buyers of the product'] }),
      P('mi5-1-6', 3, r`With a product price of \$4 and a wage of \$25, how many workers does the firm hire?`, ['3'], 'Which MRPs are at least 25?', [r`MRP: 40, 36, 28, 20, 12. Only the first three are ≥ 25.`], { check: () => MPL.map((m) => m * 4).filter((v) => v >= 25).length === 3 }),
    ],
    remember: ['Labor demand is derived demand.', 'MRP = MP × MR (= MP × P in competition).', 'Hire until MRP = MRC; MRC = wage in a competitive labor market.'],
    checkIn: 'Next: choosing the cheapest mix of labor and capital, and labor markets with a single employer.',
  },
  {
    id: 'mi5-2', unit: 5, n: 2, title: 'Least-cost input combinations and monopsony',
    intro: 'Firms choose not only how many workers to hire but how to combine workers and machines. And in some towns there is essentially one employer, which changes the labor market dramatically. Today you learn the least-cost rule and the monopsony model.',
    goals: ['Apply the least-cost rule MP/price across inputs', 'Compute marginal factor cost when a firm must raise wages to hire', 'Find the monopsonist’s employment and wage', 'Compare monopsony with a competitive labor market'],
    notes: [
      { k: 'formula', t: r`\text{least cost: } \frac{MP_L}{w} = \frac{MP_K}{r}` },
      { k: 'p', t: r`If labor gives more extra output per dollar than capital, the firm should use more labor and less capital until the ratios are equal. Profit maximization goes further: MRP_L = w and MRP_K = r.` },
      { k: 'rule', title: 'Monopsony', t: r`A monopsony is the only buyer of labor in a market. It faces the upward-sloping market labor supply, so to hire one more worker it must raise the wage for **all** workers. Its marginal factor cost (MFC) is therefore greater than the wage.` },
      { k: 'p', t: r`The monopsonist hires where MRP = MFC, then pays the lowest wage on the supply curve for that many workers. Compared with a competitive market, it hires fewer workers and pays a lower wage.` },
      { k: 'p', t: r`Data used today:
${MONO}` },
    ],
    examples: [
      { q: r`$MP_L = 30$, $w = \$10$; $MP_K = 40$, $r = \$20$. Is the firm using the least-cost combination?`, steps: [r`Labor: $\frac{30}{10} = 3$ units per dollar. Capital: $\frac{40}{20} = 2$.`, r`Not equal: labor is the better deal, so use more labor and less capital.`], a: 'No; use more labor' },
      { q: r`Using the table, find the marginal factor cost of the 3rd worker.`, steps: [r`Total labor cost: 2 workers at \$12 = \$24; 3 workers at \$14 = \$42.`, r`MFC $= 42 - 24 = 18$, more than the \$14 wage.`], a: '18' },
    ],
    practice: [
      P('mi5-2-1', 1, r`$MP_L = 30$, $w = \$10$, $MP_K = 40$, $r = \$20$. To minimize cost, the firm should`, 0, 'Compare MP per dollar.', [r`Labor gives 3 per dollar and capital 2, so shift toward labor.`], { choices: ['use more labor and less capital', 'use more capital and less labor', 'keep the current combination', 'reduce both inputs equally'] }),
      P('mi5-2-2', 2, r`A firm uses the least-cost combination with $MP_L = 24$, $w = \$8$ and $r = \$12$. What is $MP_K$?`, ['36'], 'Set the ratios equal.', [r`$\frac{24}{8} = 3 = \frac{MP_K}{12}$, so $MP_K = 36$.`], { check: () => (24 / 8) * 12 === 36 }),
      P('mi5-2-3', 2, r`Using the monopsony table, what is the marginal factor cost of the 3rd worker?`, ['18'], 'Change in total labor cost.', [r`$3 \times 14 - 2 \times 12 = 42 - 24 = 18$.`], { check: () => MFC(3) === 18 }),
      P('mi5-2-4', 2, r`Using the monopsony table, what wage does the profit-maximizing monopsonist pay?`, ['14'], 'Hire while MRP ≥ MFC, then read the wage from the supply row.', [r`MFC: 10, 14, 18, 22, 26. MRP ≥ MFC for workers 1–3 (22 ≥ 18) but not the 4th (18 < 22): hire 3.`, r`The wage needed to hire 3 workers is \$14.`], { check: () => { let n = 0; for (let i = 1; i <= 5; i++) if (MRP[i - 1] >= MFC(i)) n = i; return WAGE[n - 1] === 14; } }),
      P('mi5-2-5', 1, r`Compared with a perfectly competitive labor market, a monopsony`, 3, 'MFC lies above the supply curve.', [r`Hiring where MRP = MFC (above supply) means fewer workers, and the wage comes from the supply curve, so it is lower.`], { choices: ['hires more workers at a lower wage', 'hires more workers at a higher wage', 'hires the same number at a lower wage', 'hires fewer workers at a lower wage'] }),
      P('mi5-2-6', 3, r`If the market in the table were perfectly competitive (each worker hired while MRP ≥ the wage), how many workers would be hired?`, ['4'], 'Compare MRP with the wage row, not with MFC.', [r`Worker 4: MRP 18 ≥ wage 16, hired. Worker 5: MRP 14 < 18, not hired. So 4 workers at a wage of \$16, versus 3 at \$14 under monopsony.`], { check: () => { let n = 0; for (let i = 1; i <= 5; i++) if (MRP[i - 1] >= WAGE[i - 1]) n = i; return n === 4; } }),
    ],
    remember: ['Least cost: MP_L/w = MP_K/r.', 'Monopsony: MFC > wage because the wage rises for everyone.', 'Monopsony hires fewer workers at a lower wage than competition.'],
    checkIn: 'Unit 5 done. Last unit: when markets fail, and what government can do.',
  },
  {
    id: 'mi6-1', unit: 6, n: 1, title: 'Externalities and public goods',
    intro: 'Markets are efficient when all costs and benefits are felt by buyers and sellers. When a factory’s smoke harms neighbors, or a vaccine protects people who did not buy it, the market gets the quantity wrong. Today you learn externalities, public goods, and the policies that correct them.',
    goals: ['Distinguish private, external and social costs and benefits', 'Show why negative externalities cause overproduction and positive ones underproduction', 'Find the socially optimal quantity and the corrective tax or subsidy', 'Classify goods as private, public, common-resource or club goods'],
    notes: [
      { k: 'formula', t: r`MSC = MPC + MEC \qquad MSB = MPB + MEB` },
      { k: 'list', items: [r`**Negative externality** (pollution): MSC > MPC. The market produces **too much**; a per-unit tax equal to the marginal external cost (a Pigouvian tax) fixes it.`, r`**Positive externality** (education, vaccines): MSB > MPB. The market produces **too little**; a per-unit subsidy equal to the marginal external benefit fixes it.`, r`The socially optimal quantity is where MSB = MSC. Producing anywhere else creates deadweight loss.`] },
      { k: 'rule', title: 'Public goods', t: r`Nonrival (one person’s use does not reduce another’s) and nonexcludable (people cannot be prevented from using it), such as national defense. Because of the **free-rider problem**, private markets underprovide them, so governments often provide them.` },
      { k: 'p', t: r`Common resources (fish in the ocean) are rival but nonexcludable, and are overused: the tragedy of the commons. Club goods (streaming services) are excludable but nonrival.` },
      { k: 'warn', t: r`With a negative externality, the market quantity is where MPB = MPC, which is larger than the optimal quantity where MSB = MSC. Students often reverse the direction.` },
    ],
    examples: [
      { q: r`MPB: $P = 100 - Q$. MPC: $P = 20 + Q$. Each unit causes \$20 of pollution damage. Find the market and socially optimal quantities.`, steps: [r`Market: $100 - Q = 20 + Q$ gives $Q = 40$.`, r`MSC $= 40 + Q$: $100 - Q = 40 + Q$ gives $Q = 30$. The market overproduces by 10.`], a: 'Market 40, optimal 30' },
      { q: r`What is the deadweight loss of the market outcome, and what tax corrects it?`, steps: [r`DWL $= \frac{1}{2} \times 20 \times (40 - 30) = 100$.`, r`A \$20 per-unit tax (equal to the marginal external cost) moves output to 30.`], a: 'DWL 100; \\$20 tax' },
    ],
    practice: [
      P('mi6-1-1', 1, r`When production creates a negative externality, the unregulated market`, 1, 'Compare private and social costs.', [r`Producers ignore the external cost, so the market quantity exceeds the socially optimal quantity.`], { choices: ['produces the socially optimal quantity', 'produces more than the socially optimal quantity', 'produces less than the socially optimal quantity', 'charges a price above marginal social cost'] }),
      P('mi6-1-2', 1, r`Each unit a factory produces causes \$10 of pollution damage to neighbors. What per-unit tax would make the factory account for this cost, in dollars?`, ['10'], 'Pigouvian tax = marginal external cost.', [r`A \$10 per-unit tax makes the private cost equal the social cost.`], { check: () => 10 === 10 }),
      P('mi6-1-3', 1, r`Which is the best example of a public good?`, 2, 'Nonrival and nonexcludable.', [r`Once a lighthouse shines, every ship benefits and none can be excluded.`], { choices: ['A slice of pizza', 'A streaming subscription', 'A lighthouse', 'Fish in the ocean'] }),
      P('mi6-1-4', 2, r`MPB: $P = 100 - Q$. MPC: $P = 20 + Q$. Marginal external cost: \$20 per unit. What is the socially optimal quantity?`, ['30'], 'Set MPB equal to MSC = MPC + 20.', [r`$100 - Q = 40 + Q$ gives $Q = 30$.`], { check: () => 100 - 30 === 40 + 30 }),
      P('mi6-1-5', 2, r`For the same market, what is the deadweight loss of the unregulated outcome?`, ['100'], 'Triangle between MSC and MSB from the optimal to the market quantity.', [r`Market Q = 40, optimal Q = 30. DWL $= \frac{1}{2} \times 20 \times 10 = 100$.`], { check: () => 0.5 * 20 * (40 - 30) === 100 }),
      P('mi6-1-6', 3, r`Education: MPB: $P = 80 - Q$; marginal external benefit \$10 per unit; MC: $P = 20 + Q$. What is the socially optimal quantity?`, ['35'], 'MSB = MPB + 10.', [r`Market: $80 - Q = 20 + Q$ gives 30. Social: $90 - Q = 20 + Q$ gives 35.`, r`A \$10 per-unit subsidy would raise output from 30 to 35.`], { check: () => 90 - 35 === 20 + 35 && 80 - 30 === 20 + 30 }),
    ],
    remember: ['Negative externality → too much; tax = MEC.', 'Positive externality → too little; subsidy = MEB.', 'Public goods: nonrival + nonexcludable → free riders.'],
    checkIn: 'Last lesson: how government policies affect efficiency and equity.',
  },
  {
    id: 'mi6-2', unit: 6, n: 2, title: 'Government intervention and inequality',
    intro: 'Governments regulate monopolies, tax incomes and redistribute money, trying to make markets both efficient and fair. Today you learn how to measure inequality with the Lorenz curve and Gini coefficient, how tax systems are classified, and how regulation changes a monopoly’s behavior.',
    goals: ['Read a Lorenz curve and interpret the Gini coefficient', 'Classify taxes as progressive, proportional or regressive', 'Compute average tax rates', 'Analyze the effects of regulation and lump-sum taxes on a monopoly'],
    notes: [
      { k: 'p', t: r`The **Lorenz curve** plots the cumulative share of income earned by the poorest x% of households. The 45° line is perfect equality; the more the curve sags below it, the more unequal the income distribution.` },
      { k: 'formula', t: r`\text{Gini} = \frac{\text{area between equality line and Lorenz curve}}{\text{total area under the equality line}}` },
      { k: 'list', items: [r`**Progressive tax:** the average tax rate rises with income.`, r`**Proportional (flat) tax:** the same rate for everyone.`, r`**Regressive tax:** the average tax rate falls as income rises (sales taxes often are).`] },
      { k: 'rule', title: 'Regulating a natural monopoly', t: r`Setting P = MC gives the socially optimal (allocatively efficient) quantity, but may cause losses. Setting P = ATC gives a fair return (zero economic profit).` },
      { k: 'p', t: r`A lump-sum tax on a monopoly is a fixed cost: it lowers profit but does not change MC, so price and quantity stay the same. A per-unit tax raises MC, raising price and lowering quantity.` },
      { k: 'warn', t: r`Policies often trade off efficiency against equity: redistribution can reduce inequality but may also reduce incentives to work or invest.` },
    ],
    examples: [
      { q: r`The area between the equality line and the Lorenz curve is 0.15, and the total area under the equality line is 0.5. Find the Gini coefficient.`, steps: [r`Gini = 0.15 ÷ 0.5.`, r`= 0.3.`], a: '0.3' },
      { q: r`A tax takes 10% of a \$20,000 income and 8% of a \$100,000 income. Classify it.`, steps: [r`The average tax rate falls as income rises.`, r`It is regressive.`], a: 'Regressive' },
    ],
    practice: [
      P('mi6-2-1', 1, r`A Gini coefficient of 0 means`, 0, 'Where is the Lorenz curve?', [r`The Lorenz curve lies on the equality line: income is perfectly equally distributed.`], { choices: ['perfect equality of income', 'perfect inequality of income', 'no income at all', 'half the population earns all income'] }),
      P('mi6-2-2', 1, r`A tax collects \$2,000 from someone earning \$20,000 and \$8,000 from someone earning \$100,000. This tax is`, 2, 'Compare average tax rates.', [r`Rates: 10% and 8%. The rate falls as income rises: regressive.`], { choices: ['progressive', 'proportional', 'regressive', 'a lump-sum tax'] }),
      P('mi6-2-3', 2, r`The area between the equality line and the Lorenz curve is 0.15; the total area under the equality line is 0.5. What is the Gini coefficient?`, ['0.3'], 'Divide the two areas.', [r`$\frac{0.15}{0.5} = 0.3$.`], { check: () => Math.abs(0.15 / 0.5 - 0.3) < 1e-9 }),
      P('mi6-2-4', 2, r`A government imposes a lump-sum tax on a profit-maximizing monopoly. What happens?`, 1, 'Does the tax change marginal cost?', [r`A lump-sum tax is a fixed cost: MC and MR are unchanged, so price and quantity stay the same while profit falls.`], { choices: ['Price rises and quantity falls', 'Profit falls; price and quantity are unchanged', 'Price falls and quantity rises', 'The monopoly shuts down immediately'] }),
      P('mi6-2-5', 2, r`A natural monopoly faces demand $P = 100 - Q$ and constant MC = \$20. If regulators set the socially optimal price, what quantity is produced?`, ['80'], 'Socially optimal: P = MC.', [r`$100 - Q = 20$ gives $Q = 80$.`], { check: () => 100 - 80 === 20 }),
      P('mi6-2-6', 3, r`A tax system charges 10% on the first \$10,000 of income and 30% on income above \$10,000. What is the average tax rate (in percent) for someone earning \$40,000?`, ['25'], 'Compute the total tax, then divide by income.', [r`Tax $= 0.10 \times 10{,}000 + 0.30 \times 30{,}000 = 1{,}000 + 9{,}000 = 10{,}000$.`, r`Average rate $= \frac{10{,}000}{40{,}000} = 25\%$ (progressive: below the 30% marginal rate).`], { check: () => (0.1 * 10000 + 0.3 * 30000) / 40000 === 0.25 }),
    ],
    remember: ['Lorenz curve: farther from the 45° line = more unequal; Gini 0 to 1.', 'Progressive: average rate rises with income; regressive: falls.', 'Lump-sum tax: no change in P or Q; P = MC regulation: efficient quantity.'],
    checkIn: 'You have finished AP Microeconomics! Take the Unit 6 review, then mix reviews from all units before the exam.',
  },
];

/** Tutor layer for Units 5–6. */
export const MICRO_C_TUTOR: Record<string, LessonTutor> = {
  'mi5-1': {
    bigIdea: [
      r`Up to now firms sold things and households bought them. In factor markets it is the other way around: firms buy labor, land and capital, and households sell them. A bakery hires bakers only because people want bread: the demand for workers is derived from the demand for products.`,
      r`How many workers should the bakery hire? Ask what one more worker adds. They add some loaves (marginal product), and each loaf sells for a price, so they add revenue: marginal revenue product. If that is at least their wage, hire them.`,
      r`Keep hiring until the next worker would bring in less than they cost. Anything that makes workers more valuable (higher productivity, a higher product price) raises the demand for labor.`,
    ],
    picture: { title: 'Hiring for a lemonade stand', t: r`A second helper lets you sell 9 more cups an hour at \$4 a cup: \$36 of extra revenue. If you pay helpers \$20 an hour, hire them. The fifth helper only adds 3 cups (\$12) because the stand is crowded, which is less than \$20, so don’t hire them.` },
    words: [
      { term: 'Factor market', means: 'A market for inputs: labor, land, capital, entrepreneurship.' },
      { term: 'Derived demand', means: 'Demand for an input that comes from demand for the product it makes.' },
      { term: 'Marginal revenue product (MRP)', means: 'The extra revenue from one more unit of an input: MP × MR.' },
      { term: 'Marginal resource cost (MRC)', means: 'The extra cost of one more unit of an input (the wage in a competitive labor market).' },
      { term: 'Wage taker', means: 'A firm too small to affect the market wage.' },
    ],
    tools: [
      { name: 'Marginal product and diminishing returns', refresher: 'Each extra worker eventually adds less output.', lesson: 'mi3-1' },
      { name: 'MR = MC logic', refresher: 'Do more while marginal benefit ≥ marginal cost.', lesson: 'mi3-2' },
    ],
    why: [
      [r`MRP converts extra output into extra dollars by multiplying by the price.`, r`Comparing MRP with the wage tells you whether each worker pays for themselves.`],
      [r`MRP = MP × P, so a higher price raises MRP for every worker.`, r`Higher MRP at every quantity means the whole labor demand curve shifts right.`],
    ],
    walk: {
      'mi5-1-1': [r`The 3rd worker’s MP is 7.`, r`MRP = MP × P = 7 × 4.`, r`= 28.`],
      'mi5-1-2': [r`MRPs: 40, 36, 28, 20, 12.`, r`Hire while MRP ≥ 20: workers 1, 2, 3, 4.`, r`4 workers.`],
      'mi5-1-3': [r`MP of the 4th worker is 5.`, r`New price \$6: 5 × 6.`, r`= 30.`],
      'mi5-1-4': [r`Firms want workers only to produce goods people buy.`, r`So labor demand depends on product demand.`, r`Choice C.`],
      'mi5-1-5': [r`More productive workers have higher MP.`, r`Higher MP raises MRP at every quantity, shifting labor demand right.`, r`Choice A. (A wage increase moves along the demand curve.)`],
      'mi5-1-6': [r`MRPs: 40, 36, 28, 20, 12.`, r`Those at least \$25: 40, 36, 28.`, r`3 workers.`],
    },
    teach: {
      plan: [r`Flip the circular flow: firms buy, households sell in factor markets.`, r`Explain derived demand with the bakery.`, r`Compute MRP from an MP table and a price.`, r`Find the hiring point at a given wage.`, r`Change the price or productivity and see labor demand shift.`],
      questions: [
        { q: 'Why does MRP fall as more workers are hired?', a: 'Because of diminishing marginal returns: each extra worker adds less output.' },
        { q: 'Does a higher wage shift labor demand?', a: 'No. It moves along the demand curve, so fewer workers are hired. Shifts come from product price, productivity, or other input prices.' },
        { q: 'What is MRC?', a: 'The extra cost of hiring one more worker. In a competitive labor market it equals the wage.' },
      ],
      keyPoints: ['Labor demand is derived from product demand.', 'MRP = MP × MR.', 'Hire until MRP = MRC (= wage in competition).', 'Product price and productivity shift labor demand.'],
    },
  },
  'mi5-2': {
    bigIdea: [
      r`A business can often make things with more people or more machines. Which mix is cheapest? Compare what each input adds per dollar. If a dollar spent on workers produces more than a dollar spent on machines, shift spending toward workers until each dollar is equally productive.`,
      r`Now imagine a town with just one big employer: a monopsony, the only buyer of labor. To attract one more worker, it must raise the wage, and it has to pay that higher wage to everyone already working there. So hiring one more person costs much more than that person’s wage.`,
      r`Because extra workers are so expensive, the monopsony hires fewer people than a competitive market would and pays them less. It is the mirror image of a monopoly, which sells less at a higher price.`,
    ],
    picture: { title: 'The only factory in town', t: r`If the factory pays \$12 and needs a third worker who will only come for \$14, it must raise everyone’s wage to \$14. Hiring that worker costs \$14 plus \$2 extra for each of the first two: \$18. So the factory thinks twice before hiring.` },
    words: [
      { term: 'Least-cost rule', means: r`Use inputs so that $\frac{MP_L}{w} = \frac{MP_K}{r}$.` },
      { term: 'Monopsony', means: 'A market with a single buyer of a factor, such as one employer.' },
      { term: 'Marginal factor cost (MFC)', means: 'The extra cost of hiring one more unit of a factor.' },
      { term: 'Wage maker', means: 'A firm whose hiring affects the wage it must pay.' },
    ],
    tools: [
      { name: 'MRP and the hiring rule', refresher: 'Hire until MRP = MRC.', lesson: 'mi5-1' },
      { name: 'MU per dollar', refresher: 'The least-cost rule is the input version of the utility-maximizing rule.', lesson: 'mi1-3' },
    ],
    why: [
      [r`Dividing MP by the input’s price measures extra output per dollar.`, r`If one input gives more per dollar, shifting money toward it lowers cost.`],
      [r`MFC is the change in the total wage bill from hiring one more worker.`, r`It exceeds the wage because the raise applies to every worker already hired.`],
    ],
    walk: {
      'mi5-2-1': [r`Labor: 30 ÷ 10 = 3 units per dollar.`, r`Capital: 40 ÷ 20 = 2 units per dollar.`, r`Labor is cheaper per unit of output: use more labor (choice A).`],
      'mi5-2-2': [r`Least cost: MP_L / w = MP_K / r.`, r`24 ÷ 8 = 3, so MP_K ÷ 12 = 3.`, r`MP_K = 36.`],
      'mi5-2-3': [r`Total cost with 2 workers: 2 × 12 = 24.`, r`With 3 workers: 3 × 14 = 42.`, r`MFC = 42 − 24 = 18.`],
      'mi5-2-4': [r`MFC row: 10, 14, 18, 22, 26. Compare with MRP: 30, 26, 22, 18, 14.`, r`MRP ≥ MFC for workers 1–3 (22 ≥ 18); the 4th has 18 < 22. Hire 3.`, r`Pay the supply wage for 3 workers: \$14.`],
      'mi5-2-5': [r`Because MFC lies above the wage, the monopsony stops hiring earlier.`, r`It pays only the wage needed for that smaller number of workers.`, r`Fewer workers, lower wage (choice D).`],
      'mi5-2-6': [r`In a competitive market each worker’s cost is just the wage.`, r`Hire while MRP ≥ wage: worker 4 (18 ≥ 16) yes; worker 5 (14 < 18) no.`, r`4 workers at \$16, more workers and a higher wage than under monopsony.`],
    },
    teach: {
      plan: [r`Compare output per dollar for workers and machines.`, r`State the least-cost rule and solve for a missing value.`, r`Tell the one-factory-town story and build the MFC column.`, r`Find the monopsony’s employment and wage.`, r`Compare with the competitive outcome.`],
      questions: [
        { q: 'Why is MFC greater than the wage for a monopsony?', a: 'To hire one more worker it must raise the wage for all workers, so the extra cost includes those raises.' },
        { q: 'Where does the monopsony’s wage come from?', a: 'From the labor supply curve at the number of workers it hires, the lowest wage that attracts that many.' },
        { q: 'How can a minimum wage raise employment under monopsony?', a: 'A minimum wage set between the monopsony wage and the competitive wage makes MFC flat at that wage, so the firm hires more.' },
      ],
      keyPoints: ['Least cost: MP_L/w = MP_K/r.', 'Monopsony: single buyer of labor.', 'MFC > wage; hire where MRP = MFC.', 'Fewer workers and lower wages than competition.'],
    },
  },
  'mi6-1': {
    bigIdea: [
      r`Markets work well when the people making a deal feel all of its costs and benefits. But a factory’s smoke harms neighbors who were never part of the deal. That cost spills over onto outsiders: a negative externality. Because the factory ignores it, it produces too much.`,
      r`Some spillovers are good. When you get vaccinated, you also protect people around you. You don’t get paid for that benefit, so fewer people get vaccinated than would be best for society: a positive externality and underproduction.`,
      r`The fix is to make decision-makers feel the full cost or benefit: tax the polluter by the damage per unit, or subsidize the vaccine by the extra benefit per unit. Some goods, like national defense, cannot be sold to individuals at all, because you cannot exclude anyone. People free-ride, so governments provide them.`,
    ],
    picture: { title: 'Loud music at 2 a.m.', t: r`Your neighbor enjoys loud music late at night but doesn’t pay for your lost sleep. Because they ignore your cost, they play it more than is best for the building. If they had to pay you \$10 per hour of noise, they would turn it down to the right amount.` },
    words: [
      { term: 'Externality', means: 'A cost or benefit that falls on people outside a transaction.' },
      { term: 'MSC / MSB', means: 'Marginal social cost / benefit: private plus external.' },
      { term: 'Pigouvian tax', means: 'A per-unit tax equal to the marginal external cost.' },
      { term: 'Public good', means: 'A good that is nonrival and nonexcludable.' },
      { term: 'Free-rider problem', means: 'People enjoy a good without paying, so markets underprovide it.' },
    ],
    tools: [
      { name: 'Deadweight loss', refresher: 'A triangle of surplus lost when quantity is not optimal.', lesson: 'mi2-3' },
      { name: 'Per-unit taxes', refresher: 'A tax shifts supply up by its amount.', lesson: 'mi2-3' },
    ],
    why: [
      [r`The market ignores pollution, so it uses the private cost curve.`, r`Society counts the extra \$20 per unit, which moves the cost curve up and lowers the best quantity.`],
      [r`The DWL triangle covers the units from 30 to 40, each of which costs society more than it is worth.`, r`A tax equal to the external cost makes the private cost match the social cost.`],
    ],
    walk: {
      'mi6-1-1': [r`Producers count only their private cost.`, r`The external cost makes the true cost higher, so the best quantity is lower.`, r`The market produces too much (choice B).`],
      'mi6-1-2': [r`The external damage is \$10 per unit.`, r`A Pigouvian tax equals that damage.`, r`\$10.`],
      'mi6-1-3': [r`Check each: pizza is rival and excludable; a subscription is excludable; fish are rival.`, r`A lighthouse’s light serves every ship and cannot be withheld.`, r`Lighthouse (choice C).`],
      'mi6-1-4': [r`MSC = MPC + MEC = 20 + Q + 20 = 40 + Q.`, r`Set MSB (= MPB here) equal to MSC: 100 − Q = 40 + Q.`, r`Q = 30.`],
      'mi6-1-5': [r`Market quantity: 100 − Q = 20 + Q → 40. Optimal: 30.`, r`The gap between MSC and MSB at Q = 40 is 20.`, r`DWL = ½ × 10 × 20 = 100.`],
      'mi6-1-6': [r`MSB = MPB + 10 = 90 − Q.`, r`Set MSB = MC: 90 − Q = 20 + Q → Q = 35.`, r`The market (30) underproduces; a \$10 subsidy fixes it.`],
    },
    teach: {
      plan: [r`Tell the loud-music story to introduce externalities.`, r`Draw MPC and MSC for pollution and find both quantities.`, r`Shade the deadweight loss and add a Pigouvian tax.`, r`Repeat for a positive externality with a subsidy.`, r`Classify goods in a 2 × 2 table (rival/excludable).`],
      questions: [
        { q: 'Why doesn’t the market fix pollution on its own?', a: 'The polluter does not pay for the damage, so it has no reason to reduce it.' },
        { q: 'Is the goal zero pollution?', a: 'No. The goal is the quantity where marginal social benefit equals marginal social cost, which usually still involves some pollution.' },
        { q: 'Why can’t a company sell national defense?', a: 'It is nonexcludable: everyone is protected whether they pay or not, so people would free-ride.' },
      ],
      keyPoints: ['MSC = MPC + MEC; MSB = MPB + MEB.', 'Negative externality → overproduction → tax.', 'Positive externality → underproduction → subsidy.', 'Public goods are nonrival and nonexcludable.'],
    },
  },
  'mi6-2': {
    bigIdea: [
      r`Markets can be efficient but still leave some people very rich and others very poor. Economists measure inequality with the Lorenz curve: line everyone up from poorest to richest and plot what share of all income each slice earns. Perfect equality is a straight 45° line; the more the curve sags, the more unequal the society.`,
      r`The Gini coefficient turns that sag into one number between 0 (perfect equality) and 1 (one person has everything).`,
      r`Governments use taxes and transfers to change the distribution. A progressive tax takes a larger share from higher incomes; a regressive tax takes a larger share from lower incomes. They also regulate monopolies, choosing between the most efficient price (P = MC) and a fair-return price (P = ATC). Almost every policy balances efficiency against fairness.`,
    ],
    picture: { title: 'Sharing a pizza in a class', t: r`If 10 students share a pizza equally, each gets a tenth: perfect equality, Gini 0. If one student takes 7 slices and the rest share 3, the Lorenz curve sags far below the line and the Gini is high.` },
    words: [
      { term: 'Lorenz curve', means: 'A graph of cumulative income share against cumulative share of households.' },
      { term: 'Gini coefficient', means: 'A measure of inequality from 0 (equal) to 1 (most unequal).' },
      { term: 'Progressive / regressive tax', means: 'Average tax rate rises / falls as income rises.' },
      { term: 'Average vs marginal tax rate', means: 'Total tax ÷ income vs the rate on the last dollar earned.' },
      { term: 'Lump-sum tax', means: 'A fixed amount that does not depend on output or income.' },
    ],
    tools: [
      { name: 'Monopoly model', refresher: 'MR = MC for quantity, demand for price.', lesson: 'mi4-1' },
      { name: 'Percentages', refresher: r`Average rate $= \frac{\text{tax}}{\text{income}} \times 100\%$.`, lesson: 'c0-1' },
    ],
    why: [
      [r`The Gini coefficient is a ratio of two areas.`, r`0.15 ÷ 0.5 = 0.3.`],
      [r`Classify a tax by comparing average rates across incomes.`, r`10% for the lower income and 8% for the higher income means the rate falls with income: regressive.`],
    ],
    walk: {
      'mi6-2-1': [r`Gini 0 means the Lorenz curve lies on the 45° line.`, r`Every share of households earns the same share of income.`, r`Perfect equality (choice A).`],
      'mi6-2-2': [r`Average rates: 2,000 ÷ 20,000 = 10%; 8,000 ÷ 100,000 = 8%.`, r`The rate falls as income rises.`, r`Regressive (choice C).`],
      'mi6-2-3': [r`Gini = area between line and curve ÷ total area under the line.`, r`0.15 ÷ 0.5.`, r`= 0.3.`],
      'mi6-2-4': [r`A lump-sum tax is fixed: it doesn’t change with output.`, r`So MC and MR are unchanged, and so are the profit-maximizing Q and P.`, r`Only profit falls (choice B).`],
      'mi6-2-5': [r`Socially optimal regulation sets P = MC.`, r`100 − Q = 20.`, r`Q = 80.`],
      'mi6-2-6': [r`Tax on the first \$10,000: 10% → \$1,000. On the remaining \$30,000: 30% → \$9,000.`, r`Total tax: \$10,000.`, r`Average rate: 10,000 ÷ 40,000 = 25%.`],
    },
    teach: {
      plan: [r`Use the pizza-sharing story to draw a Lorenz curve.`, r`Compute a Gini coefficient from two areas.`, r`Classify three taxes as progressive, proportional or regressive.`, r`Compute an average tax rate with brackets.`, r`Compare regulating a monopoly at P = MC and P = ATC, and a lump-sum vs per-unit tax.`],
      questions: [
        { q: 'Is a higher Gini always bad?', a: 'It means more inequality. Whether that is bad involves values; economists measure it, and societies decide how much redistribution they want.' },
        { q: 'Why is a sales tax often regressive?', a: 'Lower-income households spend a larger share of their income, so the tax takes a larger share of their income.' },
        { q: 'Why might regulators choose P = ATC instead of P = MC?', a: 'At P = MC a natural monopoly may lose money and need a subsidy; P = ATC lets it break even.' },
      ],
      keyPoints: ['Lorenz curve and Gini measure inequality.', 'Progressive: average rate rises with income.', 'Lump-sum tax changes profit, not P or Q.', 'Policies balance efficiency and equity.'],
    },
  },
};

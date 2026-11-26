import type { CalcLesson, CalcProblem, LessonTutor } from '../calc/types';
import { near } from '../calc/types';

const r = String.raw;
const P = (id: string, level: 1 | 2 | 3, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, hint, solution, ...extra });

const SRPC = r`~~~
Unemployment rate (%)   3    4    5    6    7
Inflation rate (%)      6    4    3    2   1.5
Natural rate of unemployment: 5%
~~~`;
const UR = [3, 4, 5, 6, 7], INF = [6, 4, 3, 2, 1.5], NATURAL = 5;
const BUDGET = r`~~~
(trillions of dollars)
Year   Spending + transfers   Tax revenue
1             4.0                 3.5
2             4.2                 3.9
3             4.3                 4.4
National debt at the start of year 1: 20.0
~~~`;
const SPEND = [4.0, 4.2, 4.3], TAX = [3.5, 3.9, 4.4];
const BOP = r`~~~
U.S. transactions with the rest of the world (billions of dollars)
Exports of goods and services       250
Imports of goods and services       320
Net investment income from abroad    20
Net transfers                       -10
~~~`;
const BP = { X: 250, M: 320, INC: 20, TR: -10 };
const CA = BP.X - BP.M + BP.INC + BP.TR;

/** AP Macroeconomics Units 5–6. Original lessons and problems. */
export const MACRO_D: CalcLesson[] = [
  {
    id: 'ma5-1', unit: 5, n: 1, title: 'Policy in the short run and the Phillips curve',
    intro: 'Policymakers face tradeoffs. In the short run, pushing unemployment down tends to push inflation up. The Phillips curve shows that tradeoff, and also why it disappears in the long run. Today you combine fiscal and monetary policy and connect the AD-AS model to the Phillips curve.',
    goals: ['Combine fiscal and monetary policy to close an output gap', 'Read the short-run and long-run Phillips curves', 'Show how AD and SRAS shifts appear on the Phillips curve', 'Explain why the long-run Phillips curve is vertical'],
    notes: [
      { k: 'rule', title: 'The policy mix', t: r`For a recessionary gap, use expansionary fiscal policy (raise G, cut taxes) and/or expansionary monetary policy (buy bonds, lower rates). For an inflationary gap, use the contractionary versions. Both kinds of policy shift AD.` },
      { k: 'p', t: r`The **short-run Phillips curve (SRPC)** slopes downward: in the short run, lower unemployment comes with higher inflation, and higher unemployment with lower inflation.` },
      { k: 'list', items: [r`AD increases → move **up and left along** the SRPC (inflation ↑, unemployment ↓).`, r`AD decreases → move **down and right along** the SRPC.`, r`SRAS decreases or expected inflation rises → the SRPC **shifts right (up)**: a worse tradeoff.`, r`SRAS increases or expected inflation falls → the SRPC **shifts left (down)**.`] },
      { k: 'rule', title: 'Long-run Phillips curve', t: r`The **long-run Phillips curve (LRPC)** is vertical at the natural rate of unemployment, just as LRAS is vertical at potential output. In the long run, unemployment returns to the natural rate whatever the inflation rate.` },
      { k: 'warn', t: r`A change in AD moves the economy **along** the SRPC; it does not shift it. Only supply shocks and changes in expected inflation shift the SRPC.` },
      { k: 'p', t: r`Data used today (points on one SRPC):
${SRPC}` },
    ],
    examples: [
      { q: r`The economy is at 5% unemployment and 3% inflation. AD increases. Where does it move on the SRPC in the table?`, steps: [r`Higher AD means more output and fewer unemployed, with higher prices: move up and left along the SRPC, for example to 4% unemployment and 4% inflation.`, r`Unemployment is now below the natural rate, which matches an inflationary gap in the AD-AS model.`], a: '4% unemployment, 4% inflation' },
      { q: r`A large oil price shock hits. How does it appear on the Phillips curve?`, steps: [r`In AD-AS, SRAS shifts left: the price level rises and real GDP falls.`, r`On the Phillips curve, the SRPC shifts right: inflation and unemployment both rise.`], a: 'The SRPC shifts right' },
    ],
    practice: [
      P('ma5-1-1', 1, r`The long-run Phillips curve is vertical at`, 1, 'Where does unemployment end up in the long run?', [r`In the long run, unemployment returns to the natural rate, whatever the inflation rate.`], { choices: ['0% inflation', 'the natural rate of unemployment', '0% unemployment', 'the target inflation rate'] }),
      P('ma5-1-2', 1, r`Using the table, AD increases and unemployment falls to 4%. What is the inflation rate, in percent?`, ['4'], 'Read along the SRPC.', [r`At 4% unemployment the SRPC shows 4% inflation.`], { check: () => INF[UR.indexOf(4)] === 4 }),
      P('ma5-1-3', 2, r`A decrease in aggregate demand shows up on the Phillips curve as`, 0, 'AD changes move along the SRPC.', [r`Less AD means lower inflation and higher unemployment: a move down and to the right along the SRPC.`], { choices: ['a movement down and to the right along the SRPC', 'a movement up and to the left along the SRPC', 'a rightward shift of the SRPC', 'a rightward shift of the LRPC'] }),
      P('ma5-1-4', 2, r`The economy has an inflationary gap. Which combination of policies is most appropriate?`, 2, 'Both policies should shift AD to the left.', [r`Raising taxes is contractionary fiscal policy and selling bonds is contractionary monetary policy.`], { choices: ['Increase government spending and buy bonds', 'Cut taxes and lower the discount rate', 'Raise taxes and sell bonds', 'Cut government spending and lower the reserve requirement'] }),
      P('ma5-1-5', 2, r`An increase in expected inflation`, 0, 'Workers ask for higher wages, which affects SRAS.', [r`Higher expected inflation raises wages and costs, shifting SRAS left and the SRPC up (to the right).`], { choices: ['shifts the SRPC up (to the right)', 'shifts the SRPC down (to the left)', 'moves the economy along the SRPC', 'shifts the LRPC to the right'] }),
      P('ma5-1-6', 2, r`Using the table, the economy is at 3% unemployment. With no policy action, what will the unemployment rate be in the long run, in percent?`, ['5'], 'Where is the LRPC?', [r`In the long run, unemployment returns to the natural rate: 5%. (Expected inflation rises and the SRPC shifts right.)`], { check: () => NATURAL === 5 && UR.includes(NATURAL) }),
    ],
    remember: ['AD changes move along the SRPC; supply shocks and expectations shift it.', 'The LRPC is vertical at the natural rate of unemployment.', 'Policy mix: use fiscal and monetary policy in the same direction to close a gap.'],
    checkIn: 'Next: what happens to prices when the money supply grows fast.',
  },
  {
    id: 'ma5-2', unit: 5, n: 2, title: 'Money growth and inflation',
    intro: 'Why have prices in some countries doubled every month? Because their governments created money far faster than their economies grew. Today you learn the equation of exchange and the quantity theory of money, which link money growth to inflation in the long run.',
    goals: ['State the equation of exchange MV = PY', 'Compute velocity and nominal GDP', 'Use the quantity theory to predict long-run inflation', 'Explain why money is neutral in the long run'],
    notes: [
      { k: 'formula', t: r`M \times V = P \times Y` },
      { k: 'list', items: [r`$M$: money supply. $V$: velocity, the number of times a dollar is spent in a year.`, r`$P$: price level. $Y$: real output. $P \times Y$ is nominal GDP.`] },
      { k: 'rule', title: 'Quantity theory of money', t: r`If velocity is stable and real output is fixed at potential in the long run, a change in the money supply causes a proportional change in the price level. In growth rates: $\%\Delta M + \%\Delta V \approx \%\Delta P + \%\Delta Y$.` },
      { k: 'p', t: r`**Monetary neutrality:** in the long run, changes in the money supply change only nominal variables (prices and nominal wages), not real GDP or unemployment.` },
      { k: 'warn', t: r`$MV = PY$ is always true by definition. The quantity theory adds the assumptions (stable V, output at potential). Hyperinflation happens when a government pays its bills by creating money much faster than output grows.` },
    ],
    examples: [
      { q: r`The money supply is \$2 trillion and nominal GDP is \$10 trillion. What is velocity?`, steps: [r`$V = \frac{PY}{M} = \frac{10}{2}$.`, r`$= 5$: each dollar is spent about 5 times a year.`], a: '5' },
      { q: r`Velocity is constant, real GDP grows 3% and the money supply grows 8%. About how fast do prices rise?`, steps: [r`$\%\Delta M + \%\Delta V \approx \%\Delta P + \%\Delta Y$: $8 + 0 \approx \%\Delta P + 3$.`, r`$\%\Delta P \approx 5\%$.`], a: 'About 5%' },
    ],
    practice: [
      P('ma5-2-1', 1, r`The money supply is \$4 trillion and velocity is 5. What is nominal GDP, in trillions of dollars?`, ['20'], 'Nominal GDP = M × V.', [r`$4 \times 5 = 20$.`], { check: () => 4 * 5 === 20 }),
      P('ma5-2-2', 1, r`Nominal GDP is \$18 trillion and the money supply is \$3 trillion. What is velocity?`, ['6'], 'V = nominal GDP ÷ M.', [r`$\frac{18}{3} = 6$.`], { check: () => 18 / 3 === 6 }),
      P('ma5-2-3', 2, r`Velocity and real output are constant and the money supply rises by 10%. By what percent does the price level rise?`, ['10'], 'With V and Y fixed, P moves with M.', [r`$\%\Delta P = \%\Delta M = 10\%$.`], { check: () => { const price = (m: number) => (m * 5) / 500; return near(((price(110) - price(100)) / price(100)) * 100, 10); } }),
      P('ma5-2-4', 2, r`Velocity is constant, real GDP grows 2% and the money supply grows 7%. What is the approximate inflation rate, in percent?`, ['5'], '%ΔM + %ΔV ≈ %ΔP + %ΔY.', [r`$7 + 0 = \%\Delta P + 2$, so $\%\Delta P \approx 5\%$.`], { check: () => 7 + 0 - 2 === 5 }),
      P('ma5-2-5', 2, r`According to the quantity theory of money, in the long run an increase in the money supply affects`, 1, 'Money is neutral in the long run.', [r`With V stable and Y at potential, more money only raises the price level.`], { choices: ['real GDP only', 'the price level only', 'both real GDP and unemployment', 'the natural rate of unemployment'] }),
      P('ma5-2-6', 3, r`The money supply is \$2 trillion, velocity is 6, and the price level (as a ratio to the base year) is 1.5. What is real GDP, in trillions of dollars?`, ['8'], 'Solve MV = PY for Y.', [r`$Y = \frac{MV}{P} = \frac{2 \times 6}{1.5} = \frac{12}{1.5} = 8$.`], { check: () => near((2 * 6) / 1.5, 8) }),
    ],
    remember: ['MV = PY; PY is nominal GDP.', 'Stable V and Y at potential: money growth ≈ inflation + real growth.', 'Money is neutral in the long run.'],
    checkIn: 'Next: deficits, the national debt and crowding out.',
  },
  {
    id: 'ma5-3', unit: 5, n: 3, title: 'Deficits, debt and crowding out',
    intro: 'When the government spends more than it collects in taxes, it borrows. Today you learn the difference between a budget deficit and the national debt, and why heavy government borrowing can raise interest rates and crowd out private investment, slowing long-run growth.',
    goals: ['Distinguish a budget deficit from the national debt', 'Compute deficits, surpluses and the change in debt', 'Explain crowding out with the loanable funds market', 'Connect crowding out to long-run economic growth'],
    notes: [
      { k: 'formula', t: r`\text{budget deficit} = (\text{government spending} + \text{transfers}) - \text{tax revenue}` },
      { k: 'p', t: r`The **national debt** is the total of all past borrowing. Each year’s deficit adds to it; each surplus subtracts from it.` },
      { k: 'rule', title: 'Crowding out', t: r`Deficit spending increases the demand for loanable funds, which raises the real interest rate and reduces private investment. Less investment means a smaller capital stock in the future, so long-run growth can slow (LRAS shifts right more slowly).` },
      { k: 'list', items: [r`In AP models, crowding out is partial: AD still rises from the extra government spending, but by less than the full multiplier effect.`, r`Other costs of a large debt: interest payments use up part of the budget, and future taxpayers bear the burden.`] },
      { k: 'warn', t: r`A deficit is a flow (one year); the debt is a stock (the running total). A shrinking deficit still increases the debt, as long as there is a deficit.` },
      { k: 'p', t: r`Data used today:
${BUDGET}` },
    ],
    examples: [
      { q: r`Using the table, what is the budget balance in year 1?`, steps: [r`$4.0 - 3.5 = 0.5$.`, r`A \$0.5 trillion deficit, which adds \$0.5 trillion to the debt.`], a: '\\$0.5 trillion deficit' },
      { q: r`The government increases deficit spending by \$100 billion. What happens in the loanable funds market?`, steps: [r`The government borrows more: demand for loanable funds increases, raising the real interest rate.`, r`The higher rate reduces private investment (crowding out), so the capital stock grows more slowly.`], a: 'Real interest rate rises; investment falls' },
    ],
    practice: [
      P('ma5-3-1', 1, r`Using the table, what is the budget deficit in year 2, in trillions of dollars?`, ['0.3'], 'Spending plus transfers minus tax revenue.', [r`$4.2 - 3.9 = 0.3$.`], { check: () => near(SPEND[1] - TAX[1], 0.3) }),
      P('ma5-3-2', 2, r`Using the table, what is the national debt at the end of year 3, in trillions of dollars?`, ['20.7'], 'Add deficits and subtract surpluses.', [r`Deficits of 0.5 and 0.3, then a surplus of 0.1.`, r`$20.0 + 0.5 + 0.3 - 0.1 = 20.7$.`], { check: () => near(20 + SPEND.reduce((s, g, i) => s + g - TAX[i], 0), 20.7) }),
      P('ma5-3-3', 1, r`Using the table, in year 3 the government has`, 1, 'Compare tax revenue with spending.', [r`Tax revenue (4.4) exceeds spending (4.3), so there is a surplus of 0.1 trillion.`], { choices: ['a budget deficit of \\$0.1 trillion', 'a budget surplus of \\$0.1 trillion', 'a balanced budget', 'a national debt of \\$0.1 trillion'] }),
      P('ma5-3-4', 2, r`Crowding out occurs when`, 0, 'Think about the loanable funds market.', [r`Government borrowing raises real interest rates, which reduces private investment.`], { choices: ['government borrowing raises real interest rates and reduces private investment', 'government spending lowers the price level', 'the Fed buys bonds and lowers interest rates', 'tax cuts increase consumption'] }),
      P('ma5-3-5', 2, r`In the long run, crowding out tends to`, 1, 'What happens to the capital stock?', [r`Less private investment means less new capital, which slows the growth of potential output.`], { choices: ['speed up economic growth by increasing capital', 'slow economic growth by reducing capital formation', 'have no effect on economic growth', 'shift the long-run Phillips curve to the left'] }),
      P('ma5-3-6', 3, r`Before a new deficit, firms borrow \$400 billion at a 4% real interest rate. The government then borrows \$100 billion, and the real interest rate rises to 5%, where total borrowing is \$450 billion. How much private investment was crowded out, in billions of dollars?`, ['50'], 'Private borrowing after = total − government.', [r`Private borrowing at 5%: $450 - 100 = 350$.`, r`Crowded out: $400 - 350 = 50$.`], { check: () => 400 - (450 - 100) === 50 }),
    ],
    remember: ['Deficit = one year’s shortfall; debt = the running total.', 'Deficits raise the real interest rate and crowd out investment.', 'Less investment slows long-run growth.'],
    checkIn: 'Next: what makes economies grow over decades.',
  },
  {
    id: 'ma5-4', unit: 5, n: 4, title: 'Economic growth',
    intro: 'Why are some countries rich and others poor? Over decades, small differences in growth rates add up to huge differences in living standards. Today you learn how growth is measured, the rule of 70, what causes long-run growth, and which policies promote it.',
    goals: ['Define growth as an increase in real GDP per capita', 'Compute growth rates and use the rule of 70', 'Identify the sources of growth: physical capital, human capital, technology and natural resources', 'Show growth with the PPC and LRAS'],
    notes: [
      { k: 'formula', t: r`\text{growth rate} = \frac{\text{real GDP}_{\text{new}} - \text{real GDP}_{\text{old}}}{\text{real GDP}_{\text{old}}} \times 100` },
      { k: 'formula', t: r`\text{years to double} \approx \frac{70}{\text{growth rate in percent}}` },
      { k: 'list', items: [r`**Physical capital:** machines, buildings, roads and other infrastructure.`, r`**Human capital:** education, training and skills.`, r`**Technology:** better ways to combine resources.`, r`**Natural resources** and strong institutions (property rights, rule of law).`, r`**Productivity** = output per worker (or per hour). It is the main driver of rising living standards.`] },
      { k: 'rule', title: 'Showing growth', t: r`Economic growth shifts the PPC outward and the LRAS curve to the right.` },
      { k: 'p', t: r`Policies that promote growth include investment tax credits, spending on education and research, building infrastructure, and encouraging saving (which lowers real interest rates and supports investment).` },
      { k: 'warn', t: r`Living standards are measured by **real GDP per capita**, not total nominal GDP. Population growth or inflation can raise total GDP without anyone being better off.` },
    ],
    examples: [
      { q: r`Real GDP grows from \$500 billion to \$520 billion. What is the growth rate?`, steps: [r`Change: $520 - 500 = 20$.`, r`$\frac{20}{500} \times 100 = 4\%$.`], a: '4%' },
      { q: r`An economy grows 2% a year. About how long does it take real GDP to double?`, steps: [r`Rule of 70: $\frac{70}{2}$.`, r`About 35 years.`], a: 'About 35 years' },
    ],
    practice: [
      P('ma5-4-1', 1, r`Real GDP grows from \$800 billion to \$824 billion. What is the growth rate, in percent?`, ['3'], '(new − old) ÷ old × 100.', [r`$\frac{24}{800} \times 100 = 3\%$.`], { check: () => near(((824 - 800) / 800) * 100, 3) }),
      P('ma5-4-2', 1, r`An economy grows 7% a year. About how many years does it take real GDP to double?`, ['10'], 'Rule of 70.', [r`$\frac{70}{7} = 10$ years.`], { check: () => 70 / 7 === 10 }),
      P('ma5-4-3', 2, r`Real GDP is \$600 billion and the population is 20 million. What is real GDP per capita, in dollars?`, ['30000'], 'Divide real GDP by population.', [r`$\frac{600{,}000{,}000{,}000}{20{,}000{,}000} = 30{,}000$.`], { check: () => 600e9 / 20e6 === 30000 }),
      P('ma5-4-4', 2, r`Which policy is most likely to increase long-run economic growth?`, 1, 'Which choice builds a production input?', [r`Education and training build human capital, which raises productivity and potential output.`], { choices: ['A one-time increase in transfer payments', 'More spending on education and job training', 'A decrease in the money supply', 'An increase in tariffs on imports'] }),
      P('ma5-4-5', 2, r`Long-run economic growth is shown by`, 1, 'Growth raises potential output.', [r`Higher potential output shifts the LRAS curve to the right (and the PPC outward).`], { choices: ['a movement along the PPC', 'a rightward shift of the LRAS curve', 'a leftward shift of the SRAS curve', 'a movement from inside the PPC to a point on it'] }),
      P('ma5-4-6', 3, r`Real GDP per capita is \$10,000 and grows 3.5% a year. About how many years until it reaches \$40,000?`, ['40'], 'How many doublings take 10,000 to 40,000?', [r`Doubling time: $\frac{70}{3.5} = 20$ years.`, r`10,000 → 20,000 → 40,000 is two doublings: about 40 years.`], { check: () => 2 * (70 / 3.5) === 40 && Math.abs(10000 * 1.035 ** 40 - 40000) < 0.05 * 40000 }),
    ],
    remember: ['Growth = rising real GDP per capita.', 'Rule of 70: years to double ≈ 70 ÷ growth rate.', 'Capital, human capital and technology shift LRAS right.'],
    checkIn: 'Unit 5 done. Last unit: the open economy, trade and currencies.',
  },
  {
    id: 'ma6-1', unit: 6, n: 1, title: 'The balance of payments',
    intro: 'Every transaction between a country and the rest of the world is recorded in its balance of payments. Today you learn the current account and the financial account, how to classify transactions, and why the two accounts must add up to zero.',
    goals: ['Distinguish the current account from the financial (capital) account', 'Classify international transactions', 'Compute the current account balance', 'Explain why a current account deficit is matched by a financial account surplus'],
    notes: [
      { k: 'list', items: [r`**Current account:** trade in goods and services (net exports), net investment income from abroad, and net transfers such as money sent to relatives.`, r`**Financial account** (called the capital and financial account in some materials): purchases and sales of assets, such as stocks, bonds, real estate and factories.`] },
      { k: 'formula', t: r`\text{current account balance} = \text{net exports} + \text{net income} + \text{net transfers}` },
      { k: 'rule', title: 'The accounts balance', t: r`Current account + financial account = 0. When a country imports more than it exports, foreigners end up holding its currency, which they use to buy its assets. So a current account deficit is matched by a financial account surplus of the same size.` },
      { k: 'p', t: r`Examples for the United States: buying foreign goods is a current account debit. A foreign investor buying U.S. government bonds is a financial account inflow (credit). A U.S. company building a factory abroad is a financial account outflow (debit).` },
      { k: 'warn', t: r`The trade balance (exports − imports) is only one part of the current account. Don’t forget income and transfers.` },
      { k: 'p', t: r`Data used today:
${BOP}` },
    ],
    examples: [
      { q: r`Using the table, compute the current account balance.`, steps: [r`Net exports $= 250 - 320 = -70$.`, r`Current account $= -70 + 20 + (-10) = -60$ billion.`], a: '−\\$60 billion' },
      { q: r`What must the financial account balance be?`, steps: [r`Current account + financial account = 0.`, r`Financial account $= +60$ billion: foreigners bought \$60 billion more of U.S. assets than Americans bought abroad.`], a: '+\\$60 billion' },
    ],
    practice: [
      P('ma6-1-1', 1, r`Using the table, what is the balance of trade (net exports), in billions of dollars?`, ['-70'], 'Exports minus imports.', [r`$250 - 320 = -70$.`], { check: () => BP.X - BP.M === -70 }),
      P('ma6-1-2', 2, r`Using the table, what is the current account balance, in billions of dollars?`, ['-60'], 'Net exports + net income + net transfers.', [r`$-70 + 20 - 10 = -60$.`], { check: () => CA === -60 }),
      P('ma6-1-3', 2, r`Using the table, what is the financial account balance, in billions of dollars?`, ['60'], 'The two accounts sum to zero.', [r`$0 - (-60) = 60$.`], { check: () => -CA === 60 }),
      P('ma6-1-4', 1, r`A Japanese investor buys U.S. government bonds. How is this recorded in the U.S. balance of payments?`, 1, 'Bonds are assets, not goods.', [r`An asset purchase by a foreigner is a financial account inflow (credit) for the United States.`], { choices: ['As a debit in the U.S. current account', 'As a credit (inflow) in the U.S. financial account', 'As a U.S. export of goods', 'As a decrease in U.S. net exports'] }),
      P('ma6-1-5', 2, r`A U.S. resident sends money to a relative living in Mexico. In which U.S. account is this recorded?`, 0, 'Is anything bought, or is it a gift?', [r`A gift of money across borders is a transfer, which belongs in the current account.`], { choices: ['The current account (net transfers)', 'The financial account', 'Net exports of goods', 'It is not recorded'] }),
      P('ma6-1-6', 2, r`If a country has a current account surplus, its financial account must`, 1, 'The two accounts add to zero.', [r`A current account surplus is matched by a financial account deficit of the same size.`], { choices: ['also be in surplus', 'be in deficit by the same amount', 'be exactly zero', 'be in deficit by twice as much'] }),
    ],
    remember: ['Current account: goods, services, income, transfers.', 'Financial account: buying and selling assets.', 'Current account + financial account = 0.'],
    checkIn: 'Last lesson: exchange rates and the foreign exchange market.',
  },
  {
    id: 'ma6-2', unit: 6, n: 2, title: 'Exchange rates and the foreign exchange market',
    intro: 'To buy something from another country, you usually need its currency. An exchange rate is the price of one currency in terms of another, and it rises and falls with supply and demand. Today you learn to read the foreign exchange market and predict how interest rates, incomes, prices and tastes move currencies, trade and capital flows.',
    goals: ['Convert prices between currencies', 'Identify appreciation and depreciation', 'Predict currency changes from interest rates, incomes, price levels and tastes', 'Connect exchange rates to net exports and capital flows'],
    notes: [
      { k: 'p', t: r`In the **market for U.S. dollars**, demand comes from foreigners who want U.S. goods, services and assets. Supply comes from Americans who want foreign goods, services and assets (they sell dollars to get foreign currency).` },
      { k: 'rule', title: 'Appreciation and depreciation', t: r`A currency **appreciates** when it buys more of another currency. That makes the country’s exports more expensive abroad and its imports cheaper, so net exports fall. **Depreciation** does the opposite and raises net exports.` },
      { k: 'list', items: [r`**Relative interest rates:** higher U.S. real interest rates attract foreign savers → demand for dollars ↑ → dollar appreciates (financial capital flows in).`, r`**Relative incomes:** higher U.S. incomes → Americans buy more imports → supply of dollars ↑ → dollar depreciates.`, r`**Relative price levels:** higher U.S. inflation makes U.S. goods less attractive → dollar depreciates.`, r`**Tastes:** more foreign demand for U.S. goods → demand for dollars ↑ → dollar appreciates.`] },
      { k: 'formula', t: r`\text{price in euros} = \text{price in dollars} \times \frac{\text{euros}}{\text{dollar}}` },
      { k: 'p', t: r`Policy links: expansionary monetary policy lowers U.S. interest rates → the dollar depreciates → net exports rise, which adds to AD. Contractionary monetary policy does the reverse.` },
      { k: 'warn', t: r`Every exchange rate has two sides. If the dollar appreciates against the euro, the euro depreciates against the dollar. Always label the price on the vertical axis (for example, euros per dollar).` },
    ],
    examples: [
      { q: r`One dollar trades for 0.9 euro. How many euros does a \$50 shirt cost?`, steps: [r`$50 \times 0.9$.`, r`$= 45$ euros.`], a: '45 euros' },
      { q: r`U.S. real interest rates rise relative to those in Europe. What happens to the dollar and to U.S. net exports?`, steps: [r`European savers want U.S. assets, so demand for dollars increases and the dollar appreciates against the euro.`, r`U.S. goods become more expensive for Europeans, so U.S. net exports fall.`], a: 'Dollar appreciates; net exports fall' },
    ],
    practice: [
      P('ma6-2-1', 1, r`One dollar trades for 150 yen. How many yen does a \$20 book cost?`, ['3000'], 'Multiply by yen per dollar.', [r`$20 \times 150 = 3{,}000$ yen.`], { check: () => 20 * 150 === 3000 }),
      P('ma6-2-2', 1, r`The exchange rate changes from 0.9 euro per dollar to 1.0 euro per dollar. Which is true?`, 1, 'Does a dollar buy more or fewer euros now?', [r`Each dollar now buys more euros, so the dollar appreciated (and the euro depreciated).`], { choices: ['The dollar depreciated against the euro', 'The dollar appreciated against the euro', 'The euro appreciated against the dollar', 'Neither currency changed in value'] }),
      P('ma6-2-3', 2, r`One euro trades for 1.25 dollars. How many euros does one dollar buy?`, ['0.8'], 'Take the reciprocal.', [r`$\frac{1}{1.25} = 0.8$ euro per dollar.`], { check: () => near(1 / 1.25, 0.8) }),
      P('ma6-2-4', 2, r`U.S. real interest rates rise relative to other countries’ rates. What happens to the value of the dollar and to U.S. net exports?`, 0, 'Follow the financial capital.', [r`Foreigners demand dollars to buy U.S. assets, so the dollar appreciates, making U.S. exports pricier: net exports fall.`], { choices: ['The dollar appreciates; net exports fall', 'The dollar appreciates; net exports rise', 'The dollar depreciates; net exports fall', 'The dollar depreciates; net exports rise'] }),
      P('ma6-2-5', 2, r`U.S. incomes rise sharply while incomes abroad do not change. What happens in the foreign exchange market for dollars?`, 1, 'Richer Americans buy more imports. What must they do first?', [r`To buy imports, Americans sell dollars for foreign currency: the supply of dollars increases and the dollar depreciates.`], { choices: ['Demand for dollars increases; the dollar appreciates', 'Supply of dollars increases; the dollar depreciates', 'Supply of dollars decreases; the dollar appreciates', 'Demand for dollars decreases; the dollar appreciates'] }),
      P('ma6-2-6', 3, r`A European car costs 30,000 euros. The exchange rate changes from 1.10 to 1.20 dollars per euro. By how many dollars does the car’s price rise for an American buyer?`, ['3000'], 'Compute the dollar price at each rate.', [r`Before: $30{,}000 \times 1.10 = 33{,}000$. After: $30{,}000 \times 1.20 = 36{,}000$.`, r`The price rises by \$3,000: the euro appreciated, so European goods cost Americans more.`], { check: () => near(30000 * 1.2 - 30000 * 1.1, 3000) }),
    ],
    remember: ['Appreciation → exports pricier → net exports fall.', 'Higher real interest rates → capital inflow → appreciation.', 'Higher incomes or inflation at home → depreciation.'],
    checkIn: 'You have finished AP Macroeconomics! Take the Unit 6 review, then mix reviews from all units before the exam.',
  },
];

/** Tutor layer for Units 5–6. */
export const MACRO_D_TUTOR: Record<string, LessonTutor> = {
  'ma5-1': {
    bigIdea: [
      r`When the economy needs a push, fiscal and monetary policy can work together. In a recession, the government can spend more or cut taxes while the Fed lowers interest rates; both push AD to the right.`,
      r`But there’s a tradeoff in the short run. Pushing AD up lowers unemployment and raises inflation at the same time. Plot inflation against unemployment and you get a downward-sloping line: the short-run Phillips curve.`,
      r`In the long run the tradeoff disappears. Once workers expect higher inflation, they demand higher wages, and unemployment drifts back to its natural rate. So the long-run Phillips curve is vertical, the same idea as a vertical LRAS curve.`,
    ],
    picture: { title: 'A seesaw that resets', t: r`In the short run, inflation and unemployment sit on a seesaw: push one down and the other goes up. But if you keep pushing unemployment down, people get used to the higher inflation, and the seesaw resets with unemployment back at its natural level.` },
    words: [
      { term: 'Short-run Phillips curve (SRPC)', means: 'The short-run tradeoff between inflation and unemployment.' },
      { term: 'Long-run Phillips curve (LRPC)', means: 'Vertical at the natural rate of unemployment.' },
      { term: 'Expected inflation', means: 'The inflation people build into wages and prices; higher expectations shift the SRPC up.' },
      { term: 'Policy mix', means: 'Using fiscal and monetary policy together.' },
    ],
    tools: [
      { name: 'AD-AS shocks', refresher: 'AD shifts move P and Y together; SRAS shifts move them oppositely.', lesson: 'ma3-3' },
      { name: 'Natural rate of unemployment', refresher: 'Frictional + structural unemployment.', lesson: 'ma2-2' },
    ],
    why: [
      [r`More AD means more output (fewer unemployed) and a higher price level (more inflation).`, r`Unemployment below the natural rate is the Phillips-curve version of an inflationary gap.`],
      [r`An oil shock raises costs, so SRAS shifts left.`, r`Higher inflation and higher unemployment together mean the whole SRPC moved right.`],
    ],
    walk: {
      'ma5-1-1': [r`In the long run, unemployment returns to its natural rate.`, r`That happens at any inflation rate.`, r`Vertical at the natural rate (choice B).`],
      'ma5-1-2': [r`Find 4% in the unemployment row.`, r`Read the inflation rate below it.`, r`4%.`],
      'ma5-1-3': [r`Less AD: lower inflation and higher unemployment.`, r`AD changes move along the SRPC, not shift it.`, r`Down and to the right along the SRPC (choice A).`],
      'ma5-1-4': [r`An inflationary gap needs AD to fall.`, r`Raising taxes is contractionary fiscal policy; selling bonds is contractionary monetary policy.`, r`Choice C.`],
      'ma5-1-5': [r`Expected inflation goes into wage demands.`, r`Higher wages shift SRAS left, which shifts the SRPC up.`, r`Choice A.`],
      'ma5-1-6': [r`3% is below the natural rate of 5%.`, r`As people expect more inflation, the SRPC shifts right.`, r`Unemployment returns to 5%.`],
    },
    teach: {
      plan: [r`Match each output gap with a fiscal-and-monetary policy mix.`, r`Draw the SRPC and plot two points from the table.`, r`Show an AD increase as a move along the SRPC.`, r`Show a supply shock as a shift of the SRPC.`, r`Add the vertical LRPC and explain why it’s vertical.`],
      questions: [
        { q: 'Does an increase in AD shift the SRPC?', a: 'No. It moves the economy up and to the left along the SRPC.' },
        { q: 'What shifts the SRPC?', a: 'Supply shocks (SRAS shifts) and changes in expected inflation.' },
        { q: 'How does the LRPC relate to LRAS?', a: 'Both are vertical at full employment: LRAS at potential output, LRPC at the natural rate of unemployment.' },
      ],
      keyPoints: ['Policy mix: same direction for both policies.', 'AD changes move along the SRPC.', 'Supply shocks and expectations shift the SRPC.', 'LRPC is vertical at the natural rate.'],
    },
  },
  'ma5-2': {
    bigIdea: [
      r`Imagine every dollar in the economy. Each one gets spent several times a year as it moves from person to person. Multiply the number of dollars by how often each is spent, and you get total spending, which must equal the value of everything bought: prices times real output. That is MV = PY.`,
      r`Now suppose the government doubles the number of dollars but the economy can’t make any more stuff and people spend at the same pace. The extra dollars chase the same goods, so prices double. That is the quantity theory of money.`,
      r`In the long run, printing money changes only prices, not how much the economy really produces. Economists say money is “neutral” in the long run.`,
    ],
    picture: { title: 'Monopoly money', t: r`If everyone at a board game suddenly got twice as much money but the properties stayed the same, people would just bid prices up. Nobody would be richer; the numbers would just be bigger.` },
    words: [
      { term: 'Equation of exchange', means: 'MV = PY.' },
      { term: 'Velocity (V)', means: 'How many times a dollar is spent per year.' },
      { term: 'Quantity theory of money', means: 'With stable V and Y, money growth causes proportional inflation.' },
      { term: 'Monetary neutrality', means: 'In the long run, money affects only nominal variables.' },
      { term: 'Hyperinflation', means: 'Extremely rapid inflation, usually from creating money too fast.' },
    ],
    tools: [
      { name: 'Rearranging an equation', refresher: 'Solve MV = PY for any one letter by dividing.', lesson: 'c0-2' },
      { name: 'Nominal vs real GDP', refresher: 'P × Y is nominal GDP.', lesson: 'ma2-3' },
    ],
    why: [
      [r`P × Y is nominal GDP, so velocity is nominal GDP divided by the money supply.`, r`A velocity of 5 means the average dollar changes hands 5 times a year.`],
      [r`The growth-rate version of MV = PY adds percent changes.`, r`Money growth not used up by real growth shows up as inflation.`],
    ],
    walk: {
      'ma5-2-1': [r`Nominal GDP = M × V.`, r`4 × 5.`, r`= \$20 trillion.`],
      'ma5-2-2': [r`V = nominal GDP ÷ M.`, r`18 ÷ 3.`, r`= 6.`],
      'ma5-2-3': [r`With V and Y fixed, only P can respond to M.`, r`M rises 10%.`, r`The price level rises 10%.`],
      'ma5-2-4': [r`%ΔM + %ΔV ≈ %ΔP + %ΔY.`, r`7 + 0 = %ΔP + 2.`, r`%ΔP ≈ 5%.`],
      'ma5-2-5': [r`Money is neutral in the long run.`, r`Real GDP is fixed at potential, so only P changes.`, r`The price level only (choice B).`],
      'ma5-2-6': [r`MV = 2 × 6 = 12 (nominal GDP).`, r`Y = MV ÷ P = 12 ÷ 1.5.`, r`= 8 trillion.`],
    },
    teach: {
      plan: [r`Explain velocity by following one dollar through several purchases.`, r`Write MV = PY and show that PY is nominal GDP.`, r`Tell the board-game story for the quantity theory.`, r`Solve for V, nominal GDP and real GDP.`, r`Use growth rates to predict inflation.`],
      questions: [
        { q: 'If the money supply grows 5% and real GDP grows 5% with stable velocity, what happens to prices?', a: 'They stay about the same: all the new money is used by the extra output.' },
        { q: 'Why does printing money cause hyperinflation?', a: 'When money grows much faster than output, more dollars chase the same goods, so prices soar.' },
        { q: 'Is MV = PY always true?', a: 'Yes, it is an identity. The quantity theory adds assumptions that V is stable and Y is at potential.' },
      ],
      keyPoints: ['MV = PY.', 'V = nominal GDP ÷ M.', 'Money growth ≈ inflation + real growth (stable V).', 'Money is neutral in the long run.'],
    },
  },
  'ma5-3': {
    bigIdea: [
      r`A budget deficit is like spending more than your paycheck this month and putting the rest on a credit card. The national debt is the total balance on that card from all the months put together.`,
      r`When the government borrows, it competes with businesses for the same pool of savings. More demand for borrowing pushes up the real interest rate, and some business projects stop being worth it.`,
      r`Fewer new factories and machines today means less capacity to produce tomorrow. So heavy borrowing can slow long-run growth even if it boosts spending in the short run. That is crowding out.`,
    ],
    picture: { title: 'Two shoppers, one sale', t: r`A store has a limited stock of discounted laptops. If a huge buyer (the government) arrives and buys many of them, the price rises and some regular shoppers (businesses) go home without one.` },
    words: [
      { term: 'Budget deficit', means: 'Spending plus transfers greater than tax revenue in one year.' },
      { term: 'Budget surplus', means: 'Tax revenue greater than spending plus transfers.' },
      { term: 'National debt', means: 'The accumulated total of past deficits minus surpluses.' },
      { term: 'Crowding out', means: 'Government borrowing raises interest rates and reduces private investment.' },
    ],
    tools: [
      { name: 'Loanable funds', refresher: 'Government borrowing increases demand for loanable funds.', lesson: 'ma4-4' },
      { name: 'Fiscal policy', refresher: 'Expansionary fiscal policy often means running a deficit.', lesson: 'ma3-4' },
    ],
    why: [
      [r`Subtract tax revenue from spending.`, r`A positive result is a deficit, which is added to the debt.`],
      [r`Government borrowing is extra demand for loanable funds.`, r`A higher real interest rate discourages private investment, slowing the growth of capital.`],
    ],
    walk: {
      'ma5-3-1': [r`Year 2: spending 4.2, taxes 3.9.`, r`4.2 − 3.9.`, r`= 0.3 trillion deficit.`],
      'ma5-3-2': [r`Year balances: −0.5, −0.3, +0.1 (a surplus in year 3).`, r`Debt rises by the deficits and falls by the surplus.`, r`20.0 + 0.5 + 0.3 − 0.1 = 20.7.`],
      'ma5-3-3': [r`Year 3: taxes 4.4, spending 4.3.`, r`Taxes exceed spending by 0.1.`, r`A surplus of 0.1 trillion (choice B).`],
      'ma5-3-4': [r`Crowding out is about borrowing and interest rates.`, r`Government borrowing raises rates, discouraging private investment.`, r`Choice A.`],
      'ma5-3-5': [r`Less investment means fewer new machines and buildings.`, r`That slows the growth of potential output.`, r`Choice B.`],
      'ma5-3-6': [r`After the deficit, total borrowing is 450 and the government takes 100.`, r`Private borrowing: 450 − 100 = 350.`, r`Crowded out: 400 − 350 = 50.`],
    },
    teach: {
      plan: [r`Use the credit-card picture to separate deficit and debt.`, r`Compute deficits, a surplus and the debt from the table.`, r`Show crowding out on a loanable funds graph.`, r`Connect lower investment to slower growth.`, r`Discuss the short-run vs long-run tradeoff of deficit spending.`],
      questions: [
        { q: 'If the deficit shrinks from 0.5 to 0.3 trillion, does the debt fall?', a: 'No. It still rises, just more slowly, because there is still a deficit.' },
        { q: 'Why does government borrowing raise interest rates?', a: 'It increases the demand for loanable funds.' },
        { q: 'Why might crowding out matter more in the long run?', a: 'Lower investment reduces the capital stock, which slows the growth of potential output.' },
      ],
      keyPoints: ['Deficit = yearly flow; debt = total stock.', 'Deficits increase demand for loanable funds.', 'Higher real rates crowd out investment.', 'Less capital slows growth.'],
    },
  },
  'ma5-4': {
    bigIdea: [
      r`Over a year or two, the business cycle matters most. Over decades, growth matters far more. A country growing 2% a year doubles its output in about 35 years; one growing 7% doubles in about 10. Small differences become huge.`,
      r`Growth comes from producing more with each hour of work: better machines (physical capital), better-trained workers (human capital), and better ideas (technology). Natural resources and stable rules (property rights, the rule of law) help too.`,
      r`Growth shows up as the PPC moving outward and the LRAS curve moving right. Governments can encourage it by supporting education, research, infrastructure and saving.`,
    ],
    picture: { title: 'A snowball rolling downhill', t: r`A snowball picks up more snow the bigger it gets. Growth compounds the same way: 3% of a bigger economy is a bigger number each year. That’s why the rule of 70 works.` },
    words: [
      { term: 'Economic growth', means: 'A sustained increase in real GDP per capita.' },
      { term: 'Rule of 70', means: 'Years to double ≈ 70 ÷ growth rate (percent).' },
      { term: 'Productivity', means: 'Output per worker or per hour of work.' },
      { term: 'Human capital', means: 'Knowledge and skills of workers.' },
      { term: 'Physical capital', means: 'Machines, tools, buildings and infrastructure.' },
    ],
    tools: [
      { name: 'Percent change', refresher: '(new − old) ÷ old × 100.', lesson: 'c0-1' },
      { name: 'Exponential growth', refresher: 'Repeated percent growth is exponential.', lesson: 'c0-7' },
      { name: 'PPC shifts', refresher: 'More resources or technology shift the PPC outward.', lesson: 'ma1-1' },
    ],
    why: [
      [r`A growth rate is a percent change.`, r`Divide the change by the starting value.`],
      [r`Compound growth doubles in a fixed time.`, r`70 ÷ the growth rate is a handy approximation.`],
    ],
    walk: {
      'ma5-4-1': [r`Change: 824 − 800 = 24.`, r`24 ÷ 800 = 0.03.`, r`× 100 = 3%.`],
      'ma5-4-2': [r`Rule of 70: years ≈ 70 ÷ growth rate.`, r`70 ÷ 7.`, r`= 10 years.`],
      'ma5-4-3': [r`Real GDP per capita = real GDP ÷ population.`, r`600,000,000,000 ÷ 20,000,000.`, r`= \$30,000.`],
      'ma5-4-4': [r`Long-run growth needs more capital, skills or technology.`, r`Education and training build human capital.`, r`Choice B.`],
      'ma5-4-5': [r`Growth increases potential output.`, r`Potential output is where LRAS sits.`, r`LRAS shifts right (choice B).`],
      'ma5-4-6': [r`Doubling time: 70 ÷ 3.5 = 20 years.`, r`10,000 → 20,000 → 40,000 is two doublings.`, r`2 × 20 = about 40 years.`],
    },
    teach: {
      plan: [r`Compare two countries growing at 2% and 7% with the rule of 70.`, r`List the sources of growth with an example of each.`, r`Compute a growth rate and real GDP per capita.`, r`Show growth as an outward PPC shift and a rightward LRAS shift.`, r`Name three policies that promote growth.`],
      questions: [
        { q: 'Why use real GDP per capita to measure living standards?', a: 'It removes inflation and accounts for population, showing output per person.' },
        { q: 'Does expansionary fiscal policy in a recession cause long-run growth?', a: 'Not by itself; it shifts AD. Long-run growth needs LRAS to shift through more capital, skills or technology.' },
        { q: 'Why does the rule of 70 work?', a: 'Compound growth doubles in a fixed time, about 70 divided by the percent growth rate.' },
      ],
      keyPoints: ['Growth = rising real GDP per capita.', 'Rule of 70.', 'Capital, human capital and technology drive growth.', 'Growth shifts LRAS right.'],
    },
  },
  'ma6-1': {
    bigIdea: [
      r`Every time a country trades with the world, money flows one way and something flows back: goods, services or assets. The balance of payments keeps a record of all of it.`,
      r`It has two main parts. The current account tracks goods and services, plus income from investments abroad and gifts sent across borders. The financial account tracks buying and selling of assets like stocks, bonds and factories.`,
      r`The two parts must balance. If Americans buy more from the world than they sell, the extra dollars end up with foreigners, and they use them to buy American assets. So a current account deficit comes with an equal financial account surplus.`,
    ],
    picture: { title: 'A school store and its suppliers', t: r`If your school store buys \$100 more from suppliers than it sells to them, the suppliers end up holding \$100 of the store’s money or IOUs. The store’s “current account” deficit is matched by its suppliers holding the store’s assets.` },
    words: [
      { term: 'Balance of payments', means: 'The record of all transactions between a country and the rest of the world.' },
      { term: 'Current account', means: 'Trade in goods and services, net income and net transfers.' },
      { term: 'Financial account', means: 'International purchases and sales of assets.' },
      { term: 'Trade balance', means: 'Exports minus imports of goods and services.' },
    ],
    tools: [
      { name: 'Signed numbers', refresher: 'Deficits are negative; add carefully.', lesson: 'c0-1' },
      { name: 'Net exports in GDP', refresher: 'Xn = exports − imports.', lesson: 'ma2-1' },
    ],
    why: [
      [r`Start with the trade balance, the largest part of the current account.`, r`Then add net income and net transfers.`],
      [r`The two accounts must sum to zero.`, r`So the financial account is the opposite of the current account.`],
    ],
    walk: {
      'ma6-1-1': [r`Trade balance = exports − imports.`, r`250 − 320.`, r`= −70.`],
      'ma6-1-2': [r`Current account = net exports + net income + net transfers.`, r`−70 + 20 + (−10).`, r`= −60.`],
      'ma6-1-3': [r`Current account + financial account = 0.`, r`−60 + FA = 0.`, r`FA = +60.`],
      'ma6-1-4': [r`A bond is an asset, so this is in the financial account.`, r`Money flows into the U.S. as a foreigner buys a U.S. asset.`, r`A financial account inflow (choice B).`],
      'ma6-1-5': [r`Nothing is bought; it is a gift of money.`, r`Gifts across borders are transfers.`, r`Current account (choice A).`],
      'ma6-1-6': [r`The two accounts add to zero.`, r`A surplus in one means a deficit of the same size in the other.`, r`Choice B.`],
    },
    teach: {
      plan: [r`Use the school-store story to show why the accounts balance.`, r`Sort five transactions into the current or financial account.`, r`Compute the current account from a table.`, r`Find the financial account balance.`, r`Explain the difference between the trade balance and the current account.`],
      questions: [
        { q: 'Is a foreigner buying a U.S. company’s stock in the current account?', a: 'No. It is an asset purchase, so it goes in the financial account.' },
        { q: 'Why must the two accounts add up to zero?', a: 'Every dollar spent abroad on goods either comes back to buy goods or is used to buy assets.' },
        { q: 'Is the trade balance the same as the current account?', a: 'No. The current account also includes net income and net transfers.' },
      ],
      keyPoints: ['Current account: goods, services, income, transfers.', 'Financial account: assets.', 'CA + FA = 0.'],
    },
  },
  'ma6-2': {
    bigIdea: [
      r`An exchange rate is just a price: the price of one currency in another. Like any price, it’s set by supply and demand. Foreigners who want U.S. goods or assets demand dollars; Americans who want foreign goods or assets supply dollars.`,
      r`When the dollar appreciates (gets stronger), each dollar buys more foreign currency. Trips abroad and imports get cheaper for Americans, but U.S. exports get more expensive for foreigners, so net exports fall.`,
      r`What moves currencies? Higher interest rates attract foreign savers and strengthen a currency. Higher incomes at home mean more imports, which weakens it. Higher inflation at home weakens it too. Every policy you have learned (fiscal and monetary) ripples into the exchange rate.`,
    ],
    picture: { title: 'A trip to Japan', t: r`If \$1 buys 150 yen, a 3,000-yen bowl of ramen costs you \$20. If the dollar strengthens to 200 yen, the same ramen costs only \$15. Great for American tourists, but Japanese shoppers now pay more for American goods.` },
    words: [
      { term: 'Exchange rate', means: 'The price of one currency in terms of another.' },
      { term: 'Appreciation', means: 'A currency buys more of another currency.' },
      { term: 'Depreciation', means: 'A currency buys less of another currency.' },
      { term: 'Foreign exchange market', means: 'Where currencies are bought and sold.' },
      { term: 'Capital inflow', means: 'Foreign savings coming into a country to buy its assets.' },
    ],
    tools: [
      { name: 'Supply and demand', refresher: 'Shift a curve and find the new price.', lesson: 'ma1-2' },
      { name: 'Real interest rates', refresher: 'Higher real rates attract savers.', lesson: 'ma4-1' },
      { name: 'Reciprocals', refresher: '1 ÷ (dollars per euro) = euros per dollar.', lesson: 'c0-1' },
    ],
    why: [
      [r`Multiply dollars by euros per dollar to convert.`, r`The dollars cancel, leaving euros.`],
      [r`Higher U.S. rates make U.S. assets attractive, so foreigners buy dollars.`, r`A stronger dollar makes U.S. goods more expensive abroad.`],
    ],
    walk: {
      'ma6-2-1': [r`Price in yen = price in dollars × yen per dollar.`, r`20 × 150.`, r`= 3,000 yen.`],
      'ma6-2-2': [r`Before, \$1 bought 0.9 euro; now it buys 1.0 euro.`, r`A dollar buys more, so it got stronger.`, r`The dollar appreciated (choice B).`],
      'ma6-2-3': [r`1 euro = 1.25 dollars.`, r`So 1 dollar = 1 ÷ 1.25 euros.`, r`= 0.8 euro.`],
      'ma6-2-4': [r`Higher U.S. real rates attract foreign savers, who need dollars.`, r`Demand for dollars rises: the dollar appreciates.`, r`U.S. goods get pricier abroad: net exports fall (choice A).`],
      'ma6-2-5': [r`Richer Americans buy more imports.`, r`To pay, they sell dollars for foreign currency: the supply of dollars increases.`, r`The dollar depreciates (choice B).`],
      'ma6-2-6': [r`Before: 30,000 × 1.10 = \$33,000.`, r`After: 30,000 × 1.20 = \$36,000.`, r`The price rises by \$3,000.`],
    },
    teach: {
      plan: [r`Tell the ramen story to explain appreciation.`, r`Convert prices between currencies.`, r`Draw the market for dollars and label who demands and supplies.`, r`Shift the curves for interest rates, incomes and inflation.`, r`Connect the exchange rate to net exports and to monetary policy.`],
      questions: [
        { q: 'If the dollar appreciates against the euro, what happens to the euro?', a: 'It depreciates against the dollar.' },
        { q: 'How does expansionary monetary policy affect net exports?', a: 'Lower interest rates reduce demand for dollars, the dollar depreciates, and net exports rise.' },
        { q: 'Why do higher incomes at home weaken a currency?', a: 'People buy more imports, so they supply more of their currency to get foreign currency.' },
      ],
      keyPoints: ['Exchange rates are set by supply and demand.', 'Appreciation lowers net exports.', 'Higher real rates → appreciation.', 'Higher incomes or inflation → depreciation.'],
    },
  },
};

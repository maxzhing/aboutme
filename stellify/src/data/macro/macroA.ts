import type { CalcLesson, CalcProblem, LessonTutor } from '../calc/types';
import { near } from '../calc/types';

const r = String.raw;
const P = (id: string, level: 1 | 2 | 3, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, hint, solution, ...extra });

const PPC = r`~~~
Point      A    B    C    D
Robots     0   10   20   30
Pizzas    60   54   42   20
~~~`;
const ROBOTS = [0, 10, 20, 30], PIZZAS = [60, 54, 42, 20];
const TRADE = r`~~~
Maximum output using all resources
            Wheat (tons)   Cloth (bolts)
Arland           40             20
Belmar           30             30
~~~`;
const MARKET = r`~~~
Price ($)            2    3    4    5    6
Quantity demanded   90   75   60   45   30
Quantity supplied   30   45   60   75   90
~~~`;
const PRICES = [2, 3, 4, 5, 6], QD = [90, 75, 60, 45, 30], QS = [30, 45, 60, 75, 90];
const NIPA = r`~~~
(billions of dollars)
Consumption               800
Investment                200
Government purchases      300
Exports                   100
Imports                   150
Transfer payments         120
~~~`;
const GDP = { C: 800, I: 200, G: 300, X: 100, M: 150, TR: 120 };
const LABOR = r`~~~
Working-age population    200 million
Employed                  114 million
Unemployed                  6 million
~~~`;
const BASKET = r`~~~
Basket: 10 burgers and 5 movie tickets
                 Base year (2020)   2024
Burger price          $5             $6
Ticket price         $10            $12
~~~`;
const basket = (b: number, t: number) => 10 * b + 5 * t;

/** AP Macroeconomics Units 1–2. Original lessons and problems. */
export const MACRO_A: CalcLesson[] = [
  {
    id: 'ma1-1', unit: 1, n: 1, title: 'Scarcity, the PPC and comparative advantage',
    intro: 'Macroeconomics studies a whole economy: its total output, its jobs, its prices and its growth. It starts from the same fact as all of economics. Resources are limited, so every choice gives something up. Today you learn the production possibilities curve, what it says about recessions and growth, and why countries trade.',
    goals: ['Explain scarcity and the four factors of production', 'Compute opportunity cost from a production possibilities curve', 'Distinguish a point inside the PPC from a shift of the PPC', 'Use comparative advantage to find terms of trade that benefit both countries'],
    notes: [
      { k: 'p', t: r`**Scarcity**: wants are unlimited but resources are limited. The four factors of production are land (natural resources), labor, capital (tools, machines, buildings) and entrepreneurship. Microeconomics studies single markets; macroeconomics studies the economy as a whole.` },
      { k: 'rule', title: 'Production possibilities curve (PPC)', t: r`Points on the curve use all resources efficiently. Points inside mean some resources are unemployed, as in a recession. Points outside cannot be reached with today’s resources and technology.` },
      { k: 'formula', t: r`\text{opportunity cost of 1 unit of X} = \frac{\text{units of Y given up}}{\text{units of X gained}}` },
      { k: 'list', items: [r`The PPC shifts **outward** (economic growth) with more resources, more human capital or better technology.`, r`It shifts **inward** when resources are lost, for example in a war or natural disaster.`, r`A recession moves the economy to a point **inside** the curve. It does not shift the curve.`, r`A curve bowed out from the origin shows increasing opportunity cost: resources are not equally good at making both goods.`] },
      { k: 'p', t: r`A country has a **comparative advantage** in the good it can make at a lower opportunity cost. If each country specializes by comparative advantage and trades at terms between the two opportunity costs, both can consume beyond their own PPCs.` },
      { k: 'warn', t: r`Absolute advantage (making more of a good) does not decide who should specialize. Comparative advantage (the lower opportunity cost) does.` },
      { k: 'p', t: r`Data used today:
${PPC}
${TRADE}` },
    ],
    examples: [
      { q: r`Using the PPC table, what is the opportunity cost of moving from point B to point C?`, steps: [r`Robots rise from 10 to 20 (10 more); pizzas fall from 54 to 42 (12 fewer).`, r`The opportunity cost of those 10 robots is 12 pizzas, or 1.2 pizzas per robot.`], a: '12 pizzas (1.2 per robot)' },
      { q: r`Using the trade table, which country should specialize in cloth?`, steps: [r`Arland: 1 bolt of cloth costs $\frac{40}{20} = 2$ tons of wheat. Belmar: 1 bolt costs $\frac{30}{30} = 1$ ton.`, r`Belmar gives up less, so Belmar has the comparative advantage in cloth and Arland in wheat.`], a: 'Belmar' },
    ],
    practice: [
      P('ma1-1-1', 1, r`Using the PPC table, how many pizzas must be given up to move from point C to point D?`, ['22'], 'Subtract the pizza amounts at C and D.', [r`$42 - 20 = 22$ pizzas.`], { check: () => PIZZAS[2] - PIZZAS[3] === 22 }),
      P('ma1-1-2', 1, r`During a recession, many factories sit idle and unemployment rises. On the country’s PPC, this is shown as`, 0, 'Are resources lost, or just unused?', [r`The resources still exist but are not being used, so the economy produces at a point inside its PPC.`], { choices: ['a movement from a point on the curve to a point inside it', 'an outward shift of the PPC', 'an inward shift of the PPC', 'a movement along the curve toward more capital goods'] }),
      P('ma1-1-3', 2, r`Using the PPC table, what is the opportunity cost of each robot, in pizzas, when moving from point C to point D?`, ['2.2'], 'Pizzas given up ÷ robots gained.', [r`$\frac{42 - 20}{30 - 20} = \frac{22}{10} = 2.2$ pizzas per robot.`, r`From B to C it was only 1.2: the opportunity cost rises, which is why the PPC is bowed out.`], { check: () => near((PIZZAS[2] - PIZZAS[3]) / (ROBOTS[3] - ROBOTS[2]), 2.2) }),
      P('ma1-1-4', 2, r`Using the trade table, what is Arland’s opportunity cost of 1 bolt of cloth, in tons of wheat?`, ['2'], 'Divide Arland’s maximum wheat by its maximum cloth.', [r`$\frac{40}{20} = 2$ tons of wheat per bolt of cloth.`], { check: () => 40 / 20 === 2 }),
      P('ma1-1-5', 2, r`Using the trade table, which country has the comparative advantage in wheat?`, 0, 'Compare the cloth given up for 1 ton of wheat.', [r`Arland gives up $\frac{20}{40} = 0.5$ bolt of cloth per ton of wheat; Belmar gives up $\frac{30}{30} = 1$. Arland’s cost is lower.`], { choices: ['Arland', 'Belmar', 'Both countries equally', 'Neither country'] }),
      P('ma1-1-6', 3, r`Using the trade table, which terms of trade would benefit both countries if Belmar specializes in cloth and Arland in wheat?`, 1, 'The price of cloth must lie between the two countries’ opportunity costs.', [r`Cloth costs Belmar 1 ton of wheat and costs Arland 2 tons. Any price between 1 and 2 tons per bolt helps both, such as 1.5.`], { choices: ['1 bolt of cloth for 0.5 ton of wheat', '1 bolt of cloth for 1.5 tons of wheat', '1 bolt of cloth for 2.5 tons of wheat', '1 bolt of cloth for 3 tons of wheat'] }),
    ],
    remember: ['Scarcity forces choices; every choice has an opportunity cost.', 'Inside the PPC = unemployed resources; growth shifts the PPC outward.', 'Specialize by comparative advantage (the lower opportunity cost).'],
    checkIn: 'Next: supply and demand, the model you will reuse for money, loanable funds and currencies.',
  },
  {
    id: 'ma1-2', unit: 1, n: 2, title: 'Supply, demand and market equilibrium',
    intro: 'Prices coordinate millions of choices without anyone in charge. Supply and demand explain how. In macroeconomics you will use this same model for the money market, the loanable funds market and foreign currencies, so learning to shift curves correctly now pays off all year.',
    goals: ['State the laws of demand and supply', 'Distinguish a change in quantity demanded from a change in demand', 'Find equilibrium price and quantity, shortages and surpluses', 'Predict how shifts in demand or supply change equilibrium'],
    notes: [
      { k: 'list', items: [r`**Law of demand:** when price rises, quantity demanded falls.`, r`**Law of supply:** when price rises, quantity supplied rises.`] },
      { k: 'rule', title: 'Movement vs shift', t: r`A change in the good’s own price moves along a curve. A change in anything else shifts the curve. Demand shifters: tastes, income (normal or inferior goods), prices of substitutes and complements, expectations, number of buyers. Supply shifters: input costs, technology, taxes and subsidies, expectations, number of sellers.` },
      { k: 'formula', t: r`\text{equilibrium: } Q_d = Q_s` },
      { k: 'p', t: r`Below the equilibrium price there is a **shortage** ($Q_d > Q_s$), which pushes the price up. Above it there is a **surplus** ($Q_s > Q_d$), which pushes the price down.` },
      { k: 'warn', t: r`A higher price does not “decrease demand”; it decreases the quantity demanded. Only a non-price factor shifts the demand curve.` },
      { k: 'p', t: r`Data used today:
${MARKET}` },
    ],
    examples: [
      { q: r`Using the table, find the equilibrium price and quantity.`, steps: [r`Look for the price where quantity demanded equals quantity supplied: at \$4 both are 60.`, r`Equilibrium price \$4, equilibrium quantity 60.`], a: '\\$4 and 60 units' },
      { q: r`What happens if the price is \$3?`, steps: [r`Quantity demanded is 75 and quantity supplied is 45: a shortage of 30.`, r`Buyers compete for the scarce units, which pushes the price up toward \$4.`], a: 'Shortage of 30' },
    ],
    practice: [
      P('ma1-2-1', 1, r`Using the table, what is the equilibrium price, in dollars?`, ['4'], 'Find where the two quantity rows match.', [r`At \$4, quantity demanded and quantity supplied are both 60.`], { check: () => PRICES[QD.findIndex((d, i) => d === QS[i])] === 4 }),
      P('ma1-2-2', 1, r`Using the table, how large is the surplus at a price of \$6?`, ['60'], 'Quantity supplied minus quantity demanded.', [r`$90 - 30 = 60$ units.`], { check: () => QS[4] - QD[4] === 60 }),
      P('ma1-2-3', 2, r`Incomes rise and the good is a normal good. What happens to its equilibrium price and quantity?`, 0, 'Which curve shifts, and which way?', [r`Higher income increases demand for a normal good: the demand curve shifts right, so price and quantity both rise.`], { choices: ['Both increase', 'Both decrease', 'Price rises, quantity falls', 'Price falls, quantity rises'] }),
      P('ma1-2-4', 2, r`A new technology lowers the cost of producing the good. What happens to the equilibrium?`, 1, 'Lower costs affect sellers.', [r`Supply increases (shifts right): the price falls and the quantity rises.`], { choices: ['Price rises, quantity falls', 'Price falls, quantity rises', 'Price and quantity both rise', 'Price and quantity both fall'] }),
      P('ma1-2-5', 2, r`The price of a complement to the good rises. What happens to the market for the good?`, 1, 'Complements are used together.', [r`When a complement gets pricier, people buy less of it and less of the good used with it: demand for the good decreases.`], { choices: ['Demand increases', 'Demand decreases', 'Quantity demanded increases but demand is unchanged', 'Supply decreases'] }),
      P('ma1-2-6', 3, r`Demand rises to $Q_d = 150 - 15P$ while supply is $Q_s = 15P$. What is the new equilibrium quantity?`, ['75'], 'Set the two equal and solve for P first.', [r`$150 - 15P = 15P$ gives $30P = 150$, so $P = 5$.`, r`$Q = 15 \times 5 = 75$.`], { check: () => 150 - 15 * 5 === 15 * 5 && 15 * 5 === 75 }),
    ],
    remember: ['Own price → move along a curve; anything else → shift.', 'Below equilibrium: shortage; above: surplus.', 'Demand up → P and Q up; supply up → P down, Q up.'],
    checkIn: 'Unit 1 done. Next: how to measure an entire economy with GDP.',
  },
  {
    id: 'ma2-1', unit: 2, n: 1, title: 'The circular flow and GDP',
    intro: 'How big is an economy? Gross domestic product adds up the market value of everything a country produces in a year. Today you learn the circular flow that links households and firms, how to compute GDP from spending, what GDP leaves out, and why it is an imperfect measure of well-being.',
    goals: ['Describe the circular flow of income and spending', 'Define GDP and decide what counts in it', 'Compute GDP with the expenditure approach C + I + G + Xn', 'Explain the limitations of GDP'],
    notes: [
      { k: 'p', t: r`In the **circular flow**, households sell land, labor and capital to firms in factor markets and earn income (wages, rent, interest, profit). They spend that income on goods and services in product markets. So total spending in an economy equals total income. Government, banks and foreign trade add further loops.` },
      { k: 'rule', title: 'Gross domestic product', t: r`GDP is the market value of all **final** goods and services produced **within a country’s borders** in a given period, usually a year.` },
      { k: 'formula', t: r`GDP = C + I + G + X_n \qquad X_n = \text{exports} - \text{imports}` },
      { k: 'list', items: [r`**Not counted:** intermediate goods (counting them would double count), used goods (produced in an earlier year), transfer payments such as Social Security (nothing is produced), purely financial transactions such as buying stocks, nonmarket work (cooking at home) and the underground economy.`, r`**Investment (I)** means business spending on capital, new home construction and changes in inventories, not buying stocks.`] },
      { k: 'warn', t: r`GDP measures output, not happiness. It ignores leisure, pollution, inequality and unpaid work. To compare living standards, use real GDP per person (per capita).` },
      { k: 'p', t: r`Data used today:
${NIPA}` },
    ],
    examples: [
      { q: r`Using the table, compute GDP.`, steps: [r`Leave out transfer payments: they pay people without buying any new output.`, r`$GDP = 800 + 200 + 300 + (100 - 150) = 1{,}250$ billion.`], a: '\\$1,250 billion' },
      { q: r`A miller sells \$2 of flour to a baker, who sells the bread for \$5. How much is added to GDP?`, steps: [r`The flour is an intermediate good, so count only the final bread.`, r`GDP rises by \$5: \$2 of value added by the miller plus \$3 by the baker.`], a: '\\$5' },
    ],
    practice: [
      P('ma2-1-1', 1, r`Using the table, what is GDP, in billions of dollars?`, ['1250'], 'C + I + G + (exports − imports); skip transfers.', [r`$800 + 200 + 300 + (100 - 150) = 1{,}250$.`], { check: () => GDP.C + GDP.I + GDP.G + GDP.X - GDP.M === 1250 }),
      P('ma2-1-2', 1, r`Using the table, what are net exports, in billions of dollars?`, ['-50'], 'Exports minus imports.', [r`$100 - 150 = -50$: a trade deficit.`], { check: () => GDP.X - GDP.M === -50 }),
      P('ma2-1-3', 1, r`Which is included in this year’s U.S. GDP?`, 2, 'Is it new, final, and produced in the U.S. this year?', [r`A new house built this year is new production (it counts as investment). The others are a used good, a transfer payment and a financial transaction.`], { choices: ['A used car bought from a neighbor', 'A Social Security check', 'A new house built in the U.S. this year', 'Shares of stock bought in a company'] }),
      P('ma2-1-4', 2, r`A U.S. consumer buys a laptop that was produced in China. How does this affect U.S. GDP?`, 1, 'Where does the purchase appear in C + I + G + Xn?', [r`Consumption rises by the laptop’s price, but imports rise by the same amount, so U.S. GDP is unchanged. (It counts in China’s GDP.)`], { choices: ['GDP increases by the laptop’s price', 'GDP is unchanged, because consumption and imports rise by the same amount', 'GDP decreases by the laptop’s price', 'GDP increases by twice the laptop’s price'] }),
      P('ma2-1-5', 2, r`A farmer sells wheat to a miller for \$1. The miller sells flour to a baker for \$3. The baker sells bread to consumers for \$6. How much is added to GDP, in dollars?`, ['6'], 'Count only the final good, or add up the value added at each stage.', [r`Value added: \$1 + \$2 + \$3 = \$6, the same as the price of the final bread.`], { check: () => 1 + (3 - 1) + (6 - 3) === 6 }),
      P('ma2-1-6', 3, r`GDP is \$2,000 billion, consumption is \$1,200 billion, government purchases are \$400 billion, exports are \$150 billion and imports are \$250 billion. What is investment, in billions of dollars?`, ['500'], 'Solve GDP = C + I + G + Xn for I.', [r`$2{,}000 = 1{,}200 + I + 400 + (150 - 250)$.`, r`$2{,}000 = 1{,}500 + I$, so $I = 500$.`], { check: () => 2000 - 1200 - 400 - (150 - 250) === 500 }),
    ],
    remember: ['GDP: final goods and services, produced within the borders, this period.', 'GDP = C + I + G + Xn.', 'Exclude intermediate goods, used goods, transfers and financial deals.'],
    checkIn: 'Next: who counts as unemployed, and the ups and downs of the business cycle.',
  },
  {
    id: 'ma2-2', unit: 2, n: 2, title: 'Unemployment and the business cycle',
    intro: 'Losing a job is one of the hardest things that can happen to a family, and the unemployment rate is one of the most watched numbers in the country. Today you learn how it is measured, the three types of unemployment, what “full employment” really means, and how the economy rises and falls through the business cycle.',
    goals: ['Classify people as employed, unemployed or not in the labor force', 'Compute the unemployment rate and the labor force participation rate', 'Distinguish frictional, structural and cyclical unemployment', 'Identify the phases of the business cycle'],
    notes: [
      { k: 'list', items: [r`**Employed:** did any paid work in the survey week.`, r`**Unemployed:** has no job but actively looked for one in the past four weeks.`, r`**Not in the labor force:** retirees, full-time students not looking for work, and discouraged workers who have given up looking.`] },
      { k: 'formula', t: r`\text{unemployment rate} = \frac{\text{unemployed}}{\text{labor force}} \times 100 \qquad \text{labor force} = \text{employed} + \text{unemployed}` },
      { k: 'formula', t: r`\text{labor force participation rate} = \frac{\text{labor force}}{\text{working-age population}} \times 100` },
      { k: 'list', items: [r`**Frictional:** between jobs or searching for a first job.`, r`**Structural:** workers’ skills or locations do not match the available jobs, often because of new technology.`, r`**Cyclical:** caused by a recession, when spending falls and firms cut jobs.`] },
      { k: 'rule', title: 'Full employment', t: r`The natural rate of unemployment = frictional + structural. The economy is at full employment when cyclical unemployment is zero, which happens when real GDP equals potential GDP. Unemployment is never zero.` },
      { k: 'p', t: r`The **business cycle** has four phases: expansion (real GDP rising), peak, contraction or recession (real GDP falling, cyclical unemployment rising) and trough. Over time, the trend of real GDP rises.` },
      { k: 'warn', t: r`Discouraged workers are not counted as unemployed. If people give up looking, the unemployment rate can fall even though nobody found a job.` },
      { k: 'p', t: r`Data used today:
${LABOR}` },
    ],
    examples: [
      { q: r`Using the data, compute the unemployment rate.`, steps: [r`Labor force = employed + unemployed = 114 + 6 = 120 million.`, r`Unemployment rate $= \frac{6}{120} \times 100 = 5\%$.`], a: '5%' },
      { q: r`A factory replaces its assembly workers with robots, and the workers lack the skills for the new jobs in town. What type of unemployment is this?`, steps: [r`Jobs exist, but the workers’ skills do not match them.`, r`That is structural unemployment.`], a: 'Structural' },
    ],
    practice: [
      P('ma2-2-1', 1, r`Using the data, what is the unemployment rate, in percent?`, ['5'], 'Unemployed ÷ labor force.', [r`$\frac{6}{114 + 6} \times 100 = 5\%$.`], { check: () => (6 / 120) * 100 === 5 }),
      P('ma2-2-2', 1, r`Using the data, what is the labor force participation rate, in percent?`, ['60'], 'Labor force ÷ working-age population.', [r`$\frac{120}{200} \times 100 = 60\%$.`], { check: () => (120 / 200) * 100 === 60 }),
      P('ma2-2-3', 2, r`Starting from the data, 2 million unemployed people give up looking and become discouraged workers. What is the new unemployment rate, in percent, rounded to one decimal place?`, ['3.4', '3.39'], 'Discouraged workers leave both the unemployed count and the labor force.', [r`Unemployed: 4 million. Labor force: 118 million.`, r`$\frac{4}{118} \times 100 \approx 3.4\%$: the rate fell although nobody found a job.`], { check: () => Math.round((4 / 118) * 1000) / 10 === 3.4 }),
      P('ma2-2-4', 1, r`A new college graduate is searching for a first job. She is`, 0, 'Is she between jobs, mismatched, or hurt by a recession?', [r`She is searching for a good match: frictional unemployment.`], { choices: ['frictionally unemployed', 'structurally unemployed', 'cyclically unemployed', 'not in the labor force'] }),
      P('ma2-2-5', 1, r`Which type of unemployment rises during a recession?`, 2, 'The name comes from the business cycle.', [r`Cyclical unemployment rises when spending falls during a contraction.`], { choices: ['Frictional', 'Structural', 'Cyclical', 'Seasonal'] }),
      P('ma2-2-6', 2, r`The economy is at full employment when`, 1, 'The natural rate still includes some unemployment.', [r`Full employment means only frictional and structural unemployment remain: cyclical unemployment is zero.`], { choices: ['the unemployment rate is zero', 'cyclical unemployment is zero', 'frictional unemployment is zero', 'structural and cyclical unemployment are both zero'] }),
    ],
    remember: ['Labor force = employed + unemployed (actively looking).', 'Natural rate = frictional + structural; full employment means no cyclical unemployment.', 'Business cycle: expansion, peak, contraction, trough.'],
    checkIn: 'Next: measuring inflation and separating real growth from rising prices.',
  },
  {
    id: 'ma2-3', unit: 2, n: 3, title: 'Inflation, price indexes and real GDP',
    intro: 'A movie ticket cost about a dollar in 1970. Are movies really ten times better now, or did money lose value? Today you learn how economists measure the price level with the CPI and the GDP deflator, compute inflation, turn nominal numbers into real ones, and decide who wins and loses from inflation.',
    goals: ['Compute a price index and an inflation rate', 'Compute real GDP using the GDP deflator', 'Compare nominal and real changes in wages and output', 'Explain who is helped and hurt by unanticipated inflation'],
    notes: [
      { k: 'formula', t: r`\text{price index} = \frac{\text{cost of the basket in the current year}}{\text{cost of the basket in the base year}} \times 100` },
      { k: 'formula', t: r`\text{inflation rate} = \frac{\text{index}_{\text{new}} - \text{index}_{\text{old}}}{\text{index}_{\text{old}}} \times 100` },
      { k: 'formula', t: r`\text{real GDP} = \frac{\text{nominal GDP}}{\text{GDP deflator}} \times 100` },
      { k: 'list', items: [r`**Nominal** values use current prices; **real** values remove the effect of price changes.`, r`**Deflation** is a falling price level; **disinflation** is a falling (but still positive) inflation rate.`, r`Percent change in a real value ≈ percent change in the nominal value − the inflation rate.`] },
      { k: 'rule', title: 'Who gains and loses', t: r`Unanticipated inflation hurts lenders, savers and people on fixed incomes, and helps borrowers with fixed-rate loans (they repay with dollars worth less). Inflation also brings menu costs (changing prices) and shoe-leather costs (effort to avoid holding cash).` },
      { k: 'warn', t: r`The CPI tends to overstate increases in the cost of living: people substitute away from goods that got pricier, new products appear, and quality improves.` },
      { k: 'p', t: r`Data used today:
${BASKET}` },
    ],
    examples: [
      { q: r`Using the basket, compute the 2024 price index (base year 2020).`, steps: [r`Base-year cost: $10 \times 5 + 5 \times 10 = 100$. 2024 cost: $10 \times 6 + 5 \times 12 = 120$.`, r`Index $= \frac{120}{100} \times 100 = 120$: prices rose 20% since 2020.`], a: '120' },
      { q: r`Nominal GDP is \$1,500 billion and the GDP deflator is 125. Find real GDP.`, steps: [r`Real GDP $= \frac{1{,}500}{125} \times 100$.`, r`$= 1{,}200$ billion in base-year dollars.`], a: '\\$1,200 billion' },
    ],
    practice: [
      P('ma2-3-1', 1, r`Using the basket, what is the 2024 price index?`, ['120'], 'Cost in 2024 ÷ cost in 2020 × 100.', [r`$\frac{10 \times 6 + 5 \times 12}{10 \times 5 + 5 \times 10} \times 100 = \frac{120}{100} \times 100 = 120$.`], { check: () => (basket(6, 12) / basket(5, 10)) * 100 === 120 }),
      P('ma2-3-2', 1, r`The CPI rises from 120 to 126. What is the inflation rate, in percent?`, ['5'], 'Change ÷ old value × 100.', [r`$\frac{126 - 120}{120} \times 100 = 5\%$.`], { check: () => ((126 - 120) / 120) * 100 === 5 }),
      P('ma2-3-3', 2, r`Nominal GDP is \$2,200 billion and the GDP deflator is 110. What is real GDP, in billions of dollars?`, ['2000'], 'Divide by the deflator, multiply by 100.', [r`$\frac{2{,}200}{110} \times 100 = 2{,}000$.`], { check: () => near((2200 / 110) * 100, 2000) }),
      P('ma2-3-4', 2, r`Your wage rises from \$20 to \$21 per hour while prices rise 8%. What happened to your real wage?`, 2, 'Compare the percent change in your wage with inflation.', [r`Your nominal wage rose 5% but prices rose 8%, so your real wage fell by about 3%.`], { choices: ['It rose by about 5%', 'It rose by about 3%', 'It fell by about 3%', 'It did not change'] }),
      P('ma2-3-5', 2, r`Inflation turns out much higher than anyone expected. Who is hurt?`, 1, 'Who is repaid in dollars that buy less?', [r`A bank that lent at a fixed rate is repaid in dollars with less purchasing power, so it loses. Fixed-rate borrowers gain.`], { choices: ['A borrower with a fixed-rate loan', 'A bank that made fixed-rate loans', 'A worker whose wage rises automatically with prices', 'A homeowner with a fixed-rate mortgage'] }),
      P('ma2-3-6', 3, r`Nominal GDP rises from \$1,000 billion (deflator 100) to \$1,155 billion (deflator 105). By what percent did real GDP grow?`, ['10'], 'Turn the second year into real GDP first.', [r`Real GDP in year 2: $\frac{1{,}155}{105} \times 100 = 1{,}100$. Year 1 real GDP is 1,000.`, r`Growth $= \frac{1{,}100 - 1{,}000}{1{,}000} \times 100 = 10\%$.`], { check: () => near(((1155 / 105) * 100 - 1000) / 1000 * 100, 10) }),
    ],
    remember: ['Index = current cost ÷ base cost × 100.', 'Real GDP = nominal ÷ deflator × 100.', 'Unexpected inflation helps borrowers and hurts lenders.'],
    checkIn: 'Unit 2 done. Next unit: the aggregate demand–aggregate supply model, the heart of AP Macro.',
  },
];

/** Tutor layer for Units 1–2. */
export const MACRO_A_TUTOR: Record<string, LessonTutor> = {
  'ma1-1': {
    bigIdea: [
      r`Macroeconomics zooms out from one market to a whole country: how much it makes, how many people have jobs, how fast prices rise. But it starts from the same fact as all economics: we cannot have everything. Land, workers, machines and ideas are limited, so making more of one thing means making less of something else.`,
      r`A production possibilities curve draws that tradeoff. Points on the curve use everything fully. Points inside mean workers or factories are sitting idle, which is exactly what a recession looks like. The curve itself moves out only when the country gets more resources or better technology: that is economic growth.`,
      r`Countries, like people, gain by specializing in what they give up the least to make (their comparative advantage) and trading for the rest. Both sides can end up with more than they could make alone.`,
    ],
    picture: { title: 'A class bake sale', t: r`Your class has 10 volunteers for one afternoon. Everyone baking cookies is someone not making posters. If 3 volunteers stay home sick, you are inside your PPC: with them you could have more of both. If someone brings a faster oven, the whole curve moves out.` },
    words: [
      { term: 'Scarcity', means: 'Limited resources compared with unlimited wants.' },
      { term: 'Factors of production', means: 'Land, labor, capital and entrepreneurship.' },
      { term: 'Production possibilities curve', means: 'All the combinations of two goods an economy can make with its resources fully used.' },
      { term: 'Opportunity cost', means: 'The value of the next best thing given up.' },
      { term: 'Comparative advantage', means: 'Making a good at a lower opportunity cost than someone else.' },
      { term: 'Economic growth', means: 'An increase in the economy’s ability to produce: the PPC shifts outward.' },
    ],
    tools: [
      { name: 'Dividing to get a rate', refresher: 'Opportunity cost per unit = what you give up ÷ what you gain.', lesson: 'c0-1' },
      { name: 'The Micro version', refresher: 'Comparative advantage with more practice on terms of trade.', lesson: 'mi1-2' },
    ],
    why: [
      [r`Moving along the curve trades one good for the other, so read both changes.`, r`The pizzas lost are the price of the robots gained; dividing gives the cost of one robot.`],
      [r`Each country’s cost of cloth is the wheat it gives up for one bolt.`, r`The country that gives up less should make the good.`],
    ],
    walk: {
      'ma1-1-1': [r`At C the economy makes 42 pizzas; at D it makes 20.`, r`Moving from C to D means giving up 42 − 20.`, r`22 pizzas.`],
      'ma1-1-2': [r`In a recession the factories and workers still exist.`, r`They are just not being used, so output of both goods is lower than possible.`, r`That is a point inside the PPC (choice A).`],
      'ma1-1-3': [r`From C to D: robots rise by 10, pizzas fall by 22.`, r`Cost per robot = 22 ÷ 10.`, r`= 2.2 pizzas, higher than the 1.2 from B to C: increasing opportunity cost.`],
      'ma1-1-4': [r`Arland can make 40 wheat or 20 cloth.`, r`So 20 cloth costs 40 wheat, and 1 cloth costs 40 ÷ 20.`, r`= 2 tons of wheat.`],
      'ma1-1-5': [r`Arland: 1 wheat costs 20 ÷ 40 = 0.5 cloth.`, r`Belmar: 1 wheat costs 30 ÷ 30 = 1 cloth.`, r`Arland’s cost is lower, so Arland (choice A).`],
      'ma1-1-6': [r`Belmar’s cost of a bolt of cloth is 1 ton of wheat; Arland’s is 2 tons.`, r`Belmar will sell cloth only for more than 1 ton; Arland will buy only for less than 2.`, r`1.5 tons per bolt lies between them (choice B).`],
    },
    teach: {
      plan: [r`Start with the bake-sale story to explain scarcity and opportunity cost.`, r`Draw a PPC and mark points on, inside and outside it.`, r`Compute the opportunity cost of moving between two points, then the next two, to show increasing cost.`, r`Show a recession (inside point) and growth (outward shift).`, r`Use the Arland–Belmar table to find comparative advantage and a fair trade.`],
      questions: [
        { q: 'Does a recession shift the PPC inward?', a: 'No. The resources are still there; they are just unemployed. The economy moves to a point inside the curve.' },
        { q: 'Can a country with an absolute advantage in both goods still gain from trade?', a: 'Yes. Trade depends on comparative advantage, and every country has a comparative advantage in something.' },
        { q: 'What shifts the PPC outward?', a: 'More resources, more human capital, or better technology.' },
      ],
      keyPoints: ['Scarcity means every choice has an opportunity cost.', 'Inside the PPC = unemployment; outward shift = growth.', 'Specialize by comparative advantage and trade at terms between the two costs.'],
    },
  },
  'ma1-2': {
    bigIdea: [
      r`Nobody tells a farmer how much corn to grow or tells you how many tacos to buy. Prices do it. When something is scarce, its price rises, which tells buyers to use less and sellers to make more. Supply and demand describe how that happens.`,
      r`Demand shows how much buyers want at each price; supply shows how much sellers offer. Where they cross, the amount people want to buy equals the amount offered: the equilibrium.`,
      r`The trick that matters all year is telling a movement from a shift. If only the good’s own price changes, slide along the curve. If anything else changes (income, tastes, costs, technology), the whole curve moves. In macro you will use the same reasoning for money, loans and currencies.`,
    ],
    picture: { title: 'Concert tickets', t: r`If a band sells tickets for \$20 but thousands more fans want them than there are seats, a shortage appears, and resellers charge more. If the band charges \$500, seats go empty: a surplus. The price that fills the arena with no one turned away is the equilibrium.` },
    words: [
      { term: 'Demand', means: 'The quantities buyers are willing and able to buy at each price.' },
      { term: 'Supply', means: 'The quantities sellers are willing and able to sell at each price.' },
      { term: 'Equilibrium', means: 'The price where quantity demanded equals quantity supplied.' },
      { term: 'Shortage / surplus', means: 'Quantity demanded is more / less than quantity supplied.' },
      { term: 'Normal good', means: 'A good people buy more of when their income rises.' },
    ],
    tools: [
      { name: 'Solving a linear equation', refresher: 'Get the variable on one side, then divide.', lesson: 'c0-2' },
      { name: 'The Micro version', refresher: 'The same model with elasticity and surplus.', lesson: 'mi2-1' },
    ],
    why: [
      [r`Equilibrium is where buyers and sellers agree on the quantity.`, r`At that price nothing pushes the price up or down.`],
      [r`At \$3 buyers want more than sellers offer.`, r`Unhappy buyers bid the price up, which reduces the shortage until it disappears.`],
    ],
    walk: {
      'ma1-2-1': [r`Scan the two rows for matching numbers.`, r`At \$4, demanded = 60 and supplied = 60.`, r`Equilibrium price is \$4.`],
      'ma1-2-2': [r`At \$6, supplied = 90 and demanded = 30.`, r`Surplus = 90 − 30.`, r`= 60 units.`],
      'ma1-2-3': [r`Income is not the good’s own price, so a curve shifts.`, r`More income raises demand for a normal good: demand shifts right.`, r`Moving up along supply: price and quantity both rise (choice A).`],
      'ma1-2-4': [r`Lower production costs help sellers.`, r`Supply shifts right.`, r`Moving down along demand: price falls, quantity rises (choice B).`],
      'ma1-2-5': [r`Complements go together, like peanut butter and jelly.`, r`If one gets more expensive, people buy less of both.`, r`Demand for the good decreases (choice B).`],
      'ma1-2-6': [r`Set demand equal to supply: 150 − 15P = 15P.`, r`Add 15P: 150 = 30P, so P = 5.`, r`Q = 15 × 5 = 75.`],
    },
    teach: {
      plan: [r`Use the concert story to explain shortages and surpluses.`, r`Find equilibrium in the table.`, r`Separate movements from shifts with three quick examples.`, r`Shift demand and supply and predict price and quantity.`, r`Solve an equilibrium from equations.`],
      questions: [
        { q: 'Why doesn’t a higher price shift the demand curve?', a: 'The curve already shows what buyers do at every price. A price change just moves to a different point on it.' },
        { q: 'If demand and supply both increase, what must happen?', a: 'Quantity rises for sure; the price change depends on which shift is bigger.' },
        { q: 'Where will you see this model again in AP Macro?', a: 'In the money market, the loanable funds market and the foreign exchange market.' },
      ],
      keyPoints: ['Own price → movement; other factor → shift.', 'Equilibrium: Qd = Qs.', 'Shortages push prices up; surpluses push them down.'],
    },
  },
  'ma2-1': {
    bigIdea: [
      r`Every dollar someone spends is a dollar someone else earns. When you buy lunch, your money becomes the restaurant’s revenue, then the cook’s wages, the landlord’s rent and the owner’s profit. That loop, from households to firms and back, is the circular flow.`,
      r`Because spending equals income, we can measure the size of an economy by adding up all the spending on new, final goods and services made inside the country in a year. That total is GDP, and it splits into four buyers: consumers (C), businesses investing (I), government (G) and foreigners, minus what we buy from them (Xn).`,
      r`The rules for what counts all come from one idea: count each new thing produced once. So skip ingredients (they’re inside the final product), used items (already counted when new), and payments that buy nothing new (Social Security, stocks).`,
    ],
    picture: { title: 'A pizza’s journey', t: r`A farmer grows wheat, a mill makes flour, a pizzeria bakes a \$12 pizza. If you added the wheat, flour and pizza together, you would count the wheat three times. GDP counts just the \$12 pizza, which already includes the wheat and the flour.` },
    words: [
      { term: 'Circular flow', means: 'The loop of money and goods between households and firms.' },
      { term: 'GDP', means: 'Market value of all final goods and services produced within a country in a year.' },
      { term: 'Final vs intermediate good', means: 'Bought by the end user vs used up to make something else.' },
      { term: 'Transfer payment', means: 'Money paid by government with nothing produced in return (e.g. Social Security).' },
      { term: 'Net exports', means: 'Exports minus imports.' },
      { term: 'Value added', means: 'The extra value a firm adds: its sales minus what it paid for inputs.' },
    ],
    tools: [
      { name: 'Signed numbers', refresher: 'Net exports can be negative; add a negative number by subtracting.', lesson: 'c0-1' },
      { name: 'Solving for one unknown', refresher: 'Move the known terms to the other side.', lesson: 'c0-2' },
    ],
    why: [
      [r`Transfers move money around without buying new output, so they are not in GDP.`, r`Add the four kinds of spending; net exports are negative here because imports exceed exports.`],
      [r`Flour inside the bread would be counted twice if we added it separately.`, r`Adding each stage’s value added gives the same total as the final price.`],
    ],
    walk: {
      'ma2-1-1': [r`GDP = C + I + G + (X − M); transfers are left out.`, r`800 + 200 + 300 + (100 − 150).`, r`= 1,300 − 50 = 1,250.`],
      'ma2-1-2': [r`Net exports = exports − imports.`, r`100 − 150.`, r`= −50, a trade deficit.`],
      'ma2-1-3': [r`Ask of each: is it new, final and made here this year?`, r`Used car: old. Social Security: transfer. Stocks: financial. New house: yes.`, r`The new house (choice C).`],
      'ma2-1-4': [r`The purchase adds to C.`, r`But the laptop was made abroad, so it also adds to imports, which are subtracted.`, r`The two cancel: GDP is unchanged (choice B).`],
      'ma2-1-5': [r`Value added: farmer \$1, miller \$3 − \$1 = \$2, baker \$6 − \$3 = \$3.`, r`Total: \$1 + \$2 + \$3.`, r`= \$6, the price of the final bread.`],
      'ma2-1-6': [r`Write GDP = C + I + G + Xn: 2,000 = 1,200 + I + 400 + (150 − 250).`, r`The knowns add to 1,200 + 400 − 100 = 1,500.`, r`I = 2,000 − 1,500 = 500.`],
    },
    teach: {
      plan: [r`Draw the circular flow and follow one dollar around it.`, r`Define GDP word by word: market value, final, within borders, this year.`, r`Sort a list of transactions into “counts” and “doesn’t count”.`, r`Compute GDP from a table using C + I + G + Xn.`, r`Discuss what GDP misses: leisure, pollution, inequality, unpaid work.`],
      questions: [
        { q: 'Why aren’t intermediate goods counted?', a: 'They are already included in the price of the final good; counting them again would double count.' },
        { q: 'Does buying a share of stock count as investment in GDP?', a: 'No. It is a financial transaction. Investment in GDP means new capital goods, new homes and inventory changes.' },
        { q: 'Why is GDP per capita better for comparing living standards?', a: 'It divides output by the number of people, so a big country isn’t automatically “richer”.' },
      ],
      keyPoints: ['Spending = income in the circular flow.', 'GDP = C + I + G + Xn.', 'Count only new, final, domestic production.', 'GDP is not a full measure of well-being.'],
    },
  },
  'ma2-2': {
    bigIdea: [
      r`Being “unemployed” has a precise meaning: you don’t have a job, but you’re actively looking for one. Someone who isn’t looking (a retiree, a full-time student, someone who has given up) isn’t unemployed; they are outside the labor force.`,
      r`Some unemployment is healthy: people quit to find better jobs, graduates search for their first one (frictional). Some comes from big changes, like robots replacing jobs (structural). And some comes from recessions, when spending drops and firms lay people off (cyclical). Only that last kind means the economy is underperforming.`,
      r`The economy moves in waves: expansions, a peak, a contraction (recession) and a trough, then growth again. During a recession, cyclical unemployment rises; at full employment, it is zero, though some unemployment always remains.`,
    ],
    picture: { title: 'A class of 30', t: r`Imagine your class is the working-age population. 18 have jobs, 2 are looking, and 10 are not looking (students, caregivers). The labor force is 20, so the unemployment rate is 2 ÷ 20 = 10%, not 2 ÷ 30.` },
    words: [
      { term: 'Labor force', means: 'Employed plus unemployed people.' },
      { term: 'Unemployment rate', means: 'Unemployed ÷ labor force × 100.' },
      { term: 'Discouraged worker', means: 'Someone who wants a job but has stopped looking; not counted as unemployed.' },
      { term: 'Natural rate of unemployment', means: 'Frictional plus structural unemployment.' },
      { term: 'Business cycle', means: 'Repeating expansions and contractions in real GDP.' },
    ],
    tools: [
      { name: 'Percentages', refresher: 'Part ÷ whole × 100. Pick the right “whole” (the labor force).', lesson: 'c0-1' },
    ],
    why: [
      [r`The rate uses the labor force, not the whole population, so build it first.`, r`Then divide the unemployed by it.`],
      [r`The jobs exist but need different skills.`, r`A skills mismatch is the definition of structural unemployment.`],
    ],
    walk: {
      'ma2-2-1': [r`Labor force = 114 + 6 = 120 million.`, r`Rate = 6 ÷ 120 × 100.`, r`= 5%.`],
      'ma2-2-2': [r`Labor force = 120 million; working-age population = 200 million.`, r`120 ÷ 200 × 100.`, r`= 60%.`],
      'ma2-2-3': [r`Discouraged workers stop counting as unemployed and leave the labor force.`, r`Unemployed: 6 − 2 = 4. Labor force: 120 − 2 = 118.`, r`4 ÷ 118 × 100 ≈ 3.4%.`],
      'ma2-2-4': [r`She is looking, so she is in the labor force and unemployed.`, r`She is searching for a match, not hurt by a recession or a skills gap.`, r`Frictional (choice A).`],
      'ma2-2-5': [r`Recessions are the downturns of the business cycle.`, r`Firms lay off workers when spending falls.`, r`Cyclical (choice C).`],
      'ma2-2-6': [r`Frictional and structural unemployment never disappear.`, r`Full employment means the only missing piece is cyclical.`, r`Cyclical unemployment is zero (choice B).`],
    },
    teach: {
      plan: [r`Use the class-of-30 story to define the labor force.`, r`Compute the unemployment rate and participation rate.`, r`Give an example of each type of unemployment.`, r`Explain the natural rate and full employment.`, r`Sketch the business cycle and label its four phases.`],
      questions: [
        { q: 'Can the unemployment rate fall while things get worse?', a: 'Yes. If unemployed people give up and stop looking, they leave the labor force and the rate falls.' },
        { q: 'Why isn’t the natural rate zero?', a: 'People always change jobs and skills always shift, so frictional and structural unemployment remain.' },
        { q: 'Which type of unemployment does policy try to fix?', a: 'Cyclical unemployment, by bringing real GDP back to potential.' },
      ],
      keyPoints: ['Unemployed means jobless and actively looking.', 'Rate = unemployed ÷ labor force × 100.', 'Natural rate = frictional + structural.', 'Recessions raise cyclical unemployment.'],
    },
  },
  'ma2-3': {
    bigIdea: [
      r`Inflation means the general level of prices is rising, so each dollar buys less. To measure it, economists price the same basket of goods each year. If the basket cost \$100 in the base year and \$120 now, the price index is 120: prices rose 20%.`,
      r`That lets us separate real changes from price changes. If GDP doubled only because prices doubled, nobody got more stuff. Real GDP divides out the price changes so we can see actual production.`,
      r`Surprise inflation moves money between people. A borrower repays a loan with dollars that buy less, so borrowers gain and lenders lose. People on fixed incomes lose too, because their payments don’t rise with prices.`,
    ],
    picture: { title: 'Your allowance', t: r`If your allowance rises from \$20 to \$22 (10% more) but snacks cost 15% more, you can actually buy fewer snacks. Your nominal allowance went up; your real allowance went down.` },
    words: [
      { term: 'Inflation', means: 'A rise in the general price level.' },
      { term: 'CPI', means: 'Consumer price index: the cost of a typical household basket compared with a base year.' },
      { term: 'GDP deflator', means: 'A price index covering everything in GDP: nominal ÷ real × 100.' },
      { term: 'Nominal vs real', means: 'Measured in current prices vs adjusted for price changes.' },
      { term: 'Deflation / disinflation', means: 'Falling prices / slowing (but positive) inflation.' },
    ],
    tools: [
      { name: 'Percent change', refresher: '(new − old) ÷ old × 100.', lesson: 'c0-1' },
    ],
    why: [
      [r`An index compares the same basket at two times, so price both years.`, r`Dividing and multiplying by 100 makes the base year equal 100.`],
      [r`The deflator says prices are 125% of base-year prices.`, r`Dividing by 1.25 removes that price increase, leaving real output.`],
    ],
    walk: {
      'ma2-3-1': [r`2020 basket: 10 × 5 + 5 × 10 = 100.`, r`2024 basket: 10 × 6 + 5 × 12 = 120.`, r`Index = 120 ÷ 100 × 100 = 120.`],
      'ma2-3-2': [r`Change: 126 − 120 = 6.`, r`Divide by the old value: 6 ÷ 120 = 0.05.`, r`× 100 = 5%.`],
      'ma2-3-3': [r`Real GDP = nominal ÷ deflator × 100.`, r`2,200 ÷ 110 = 20.`, r`× 100 = 2,000.`],
      'ma2-3-4': [r`Wage change: (21 − 20) ÷ 20 = 5%.`, r`Prices rose 8%, more than the wage.`, r`Real wage ≈ 5% − 8% = −3%: it fell (choice C).`],
      'ma2-3-5': [r`Higher inflation shrinks the value of each dollar repaid.`, r`Fixed-rate lenders get the same number of dollars, each worth less.`, r`The bank that made fixed-rate loans (choice B).`],
      'ma2-3-6': [r`Year 2 real GDP = 1,155 ÷ 105 × 100 = 1,100.`, r`Year 1 real GDP = 1,000 (deflator 100).`, r`Growth = 100 ÷ 1,000 × 100 = 10%.`],
    },
    teach: {
      plan: [r`Use the allowance story to separate nominal from real.`, r`Build a price index from a two-item basket.`, r`Compute an inflation rate between two index values.`, r`Convert nominal GDP to real GDP with the deflator.`, r`List winners and losers from surprise inflation.`],
      questions: [
        { q: 'If nominal GDP rises 6% and prices rise 6%, did the economy grow?', a: 'No. Real GDP stayed the same; all of the rise was prices.' },
        { q: 'Why does unexpected inflation help borrowers?', a: 'They repay a fixed number of dollars that are now worth less.' },
        { q: 'Why might the CPI overstate inflation?', a: 'People switch to cheaper substitutes, new goods appear, and quality improves, none of which a fixed basket captures well.' },
      ],
      keyPoints: ['Index = current cost ÷ base cost × 100.', 'Inflation rate = percent change in the index.', 'Real = nominal adjusted for prices.', 'Surprise inflation: borrowers win, lenders lose.'],
    },
  },
};

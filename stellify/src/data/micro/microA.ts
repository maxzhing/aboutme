import type { CalcLesson, CalcProblem, LessonTutor } from '../calc/types';
import { near } from '../calc/types';

const r = String.raw;
const P = (id: string, level: 1 | 2 | 3, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, hint, solution, ...extra });

const PPC = r`~~~
Point   Guns   Butter
  A       0      100
  B      10       90
  C      20       70
  D      30       40
  E      40        0
~~~`;

/** AP Microeconomics Units 1–2. Original lessons and problems. */
export const MICRO_A: CalcLesson[] = [
  {
    id: 'mi1-1', unit: 1, n: 1, title: 'Scarcity, opportunity cost and the production possibilities curve',
    intro: 'Economics begins with one fact: we cannot have everything we want. Resources are limited, so every choice gives something up. Today you learn opportunity cost, the factors of production, and the production possibilities curve, the first graph of the course.',
    goals: ['Define scarcity and the four factors of production', 'Calculate opportunity cost', 'Interpret points on, inside and outside a PPC', 'Explain the shape of the PPC and what shifts it'],
    notes: [
      { k: 'p', t: r`**Scarcity**: wants are unlimited but resources are limited. The factors of production are land (natural resources), labor, capital (tools, machines, buildings) and entrepreneurship.` },
      { k: 'rule', title: 'Opportunity cost', t: r`The value of the next best alternative you give up when you make a choice. It includes money you spend and the value of time you could have used another way.` },
      { k: 'p', t: r`A production possibilities curve (PPC) shows the maximum combinations of two goods an economy can produce with its resources and technology. Points **on** the curve are efficient; points **inside** mean unemployed or misused resources; points **outside** are unattainable for now.` },
      { k: 'list', items: [r`A PPC that bows outward shows **increasing** opportunity cost: resources are not equally suited to both goods.`, r`A straight-line PPC shows **constant** opportunity cost.`, r`More resources, better technology or more capital shift the PPC **outward** (economic growth).`] },
      { k: 'formula', t: r`\text{opportunity cost of 1 unit of X} = \frac{\text{units of Y given up}}{\text{units of X gained}}` },
      { k: 'tip', t: r`Economic systems answer what, how and for whom to produce: market economies rely on prices, command economies on government plans, and most real economies are mixed.` },
    ],
    examples: [
      { q: r`Using the table, what is the opportunity cost per gun of moving from point B to point C?
${PPC}`, steps: [r`From B to C, guns rise by 10 and butter falls by 20.`, r`$\frac{20}{10} = 2$ units of butter per gun.`], a: '2 butter per gun' },
      { q: r`What does the rising opportunity cost in the table tell you about the shape of the PPC?`, steps: [r`Per-gun costs: A→B 1, B→C 2, C→D 3, D→E 4 units of butter.`, r`Rising costs mean the PPC bows outward (concave).`], a: 'Bowed outward' },
    ],
    practice: [
      P('mi1-1-1', 1, r`You spend \$50 on a concert ticket and give up 4 hours of work paying \$12 per hour. What is the total opportunity cost of going to the concert, in dollars?`, ['98'], 'Count the money spent and the wages given up.', [r`\$50 + 4 × \$12 = \$98.`], { check: () => 50 + 4 * 12 === 98 }),
      P('mi1-1-2', 1, r`A point inside a country’s PPC indicates that`, 1, 'Could the country produce more of both goods?', [r`Inside the curve, more of both goods could be produced: some resources are unemployed or used inefficiently.`], { choices: ['the country is producing efficiently', 'some resources are unemployed or used inefficiently', 'the combination is unattainable', 'the country has experienced economic growth'] }),
      P('mi1-1-3', 1, r`Using the PPC table from the examples, what is the opportunity cost per gun of moving from point C to point D (in units of butter)?`, ['3'], 'Butter given up ÷ guns gained.', [r`Butter falls 30 (70 → 40) while guns rise 10: 3 per gun.`], { check: () => (70 - 40) / (30 - 20) === 3 }),
      P('mi1-1-4', 2, r`A PPC that is bowed outward from the origin shows that`, 2, 'What happens to the cost of each extra unit?', [r`The opportunity cost of each additional unit rises because resources are not equally suited to producing both goods.`], { choices: ['opportunity cost is constant', 'resources are perfectly adaptable', 'opportunity cost increases as more of a good is produced', 'the economy is inefficient'] }),
      P('mi1-1-5', 2, r`Which event would shift a country’s PPC outward?`, 0, 'What increases the economy’s capacity?', [r`An improvement in technology lets the economy produce more with the same resources, shifting the PPC outward. Reducing unemployment moves a point toward the curve but does not shift it.`], { choices: ['A technological improvement in production', 'A fall in unemployment', 'A decrease in the labor force', 'A shift in production from one good to the other'] }),
      P('mi1-1-6', 3, r`Using the PPC table, what is the opportunity cost per gun of moving from point D to point E (in units of butter)?`, ['4'], 'Compare with earlier moves.', [r`Butter falls 40 (40 → 0) while guns rise 10: 4 per gun, the highest cost yet.`], { check: () => (40 - 0) / (40 - 30) === 4 }),
    ],
    remember: ['Opportunity cost = next best alternative given up.', 'On the PPC: efficient; inside: inefficient; outside: unattainable.', 'Bowed-out PPC: increasing opportunity cost; growth shifts it out.'],
    checkIn: 'Next: why trade makes everyone better off, through comparative advantage.',
  },
  {
    id: 'mi1-2', unit: 1, n: 2, title: 'Comparative advantage and trade',
    intro: 'Why do countries trade, even when one is better at making everything? Because what matters is not who is better, but who gives up less. Today you calculate opportunity costs, find comparative advantage, and identify terms of trade that benefit both sides.',
    goals: ['Distinguish absolute and comparative advantage', 'Compute opportunity costs from output and input data', 'Determine who should specialize in what', 'Identify mutually beneficial terms of trade'],
    notes: [
      { k: 'rule', title: 'Absolute advantage', t: r`Producing more of a good with the same resources (or the same amount with fewer resources).` },
      { k: 'rule', title: 'Comparative advantage', t: r`Producing a good at a **lower opportunity cost** than someone else. Each party should specialize in the good where it has the comparative advantage.` },
      { k: 'p', t: r`**Output problems** give how much each party can make: opportunity cost of X = (amount of Y) ÷ (amount of X). **Input problems** give hours or workers needed per unit: opportunity cost of X = (input for X) ÷ (input for Y). The input formula is flipped.` },
      { k: 'p', t: r`Terms of trade benefit both parties when the price of a good lies **between** the two parties’ opportunity costs for it.` },
      { k: 'warn', t: r`A party can have the absolute advantage in both goods but can never have the comparative advantage in both (unless costs are identical).` },
    ],
    examples: [
      { q: r`In one day Ana can make 10 shirts or 5 hats; Ben can make 6 shirts or 6 hats. Who has the comparative advantage in hats?`, steps: [r`Ana’s opportunity cost of 1 hat: $\frac{10}{5} = 2$ shirts. Ben’s: $\frac{6}{6} = 1$ shirt.`, r`Ben gives up less to make a hat, so Ben has the comparative advantage in hats (and Ana in shirts).`], a: 'Ben' },
      { q: r`What terms of trade for hats would benefit both Ana and Ben?`, steps: [r`Ben’s cost of a hat is 1 shirt; Ana’s is 2 shirts.`, r`Any price between 1 and 2 shirts per hat works, for example 1.5 shirts per hat.`], a: 'Between 1 and 2 shirts per hat' },
    ],
    practice: [
      P('mi1-2-1', 1, r`Ana can make 10 shirts or 5 hats per day. What is her opportunity cost of 1 hat, in shirts?`, ['2'], 'Shirts given up per hat.', [r`$\frac{10}{5} = 2$ shirts.`], { check: () => 10 / 5 === 2 }),
      P('mi1-2-2', 1, r`Ana: 10 shirts or 5 hats. Ben: 6 shirts or 6 hats. Who has the comparative advantage in shirts?`, 0, 'Compare opportunity costs of a shirt.', [r`Ana’s cost of a shirt is 0.5 hat; Ben’s is 1 hat. Ana’s is lower.`], { choices: ['Ana', 'Ben', 'Neither', 'Both'] }),
      P('mi1-2-3', 1, r`Using the same data, who has the absolute advantage in hats?`, 1, 'Who makes more hats?', [r`Ben can make 6 hats; Ana only 5.`], { choices: ['Ana', 'Ben', 'Neither', 'Both'] }),
      P('mi1-2-4', 2, r`Which terms of trade would benefit both Ana and Ben?`, 2, 'The price of a hat must lie between their opportunity costs.', [r`Their costs of a hat are 1 and 2 shirts; 1.5 shirts per hat lies between them.`], { choices: ['1 hat for 0.5 shirt', '1 hat for 3 shirts', '1 hat for 1.5 shirts', '1 hat for 2.5 shirts'] }),
      P('mi1-2-5', 2, r`One worker in Country Y can produce 30 tons of wheat or 10 bolts of cloth. What is Y’s opportunity cost of 1 bolt of cloth, in tons of wheat?`, ['3'], 'Output problem.', [r`$\frac{30}{10} = 3$ tons of wheat.`], { check: () => 30 / 10 === 3 }),
      P('mi1-2-6', 3, r`In Country P it takes 4 hours to make a table and 2 hours to make a chair. What is the opportunity cost of 1 table, in chairs?`, ['2'], 'This is an input problem.', [r`The 4 hours used for one table could make $\frac{4}{2} = 2$ chairs.`], { check: () => 4 / 2 === 2 }),
    ],
    remember: ['Comparative advantage = lower opportunity cost.', 'Output: other ÷ own. Input: own ÷ other.', 'Good terms of trade lie between the two opportunity costs.'],
    checkIn: 'Next: thinking at the margin, the key to every economic decision.',
  },
  {
    id: 'mi1-3', unit: 1, n: 3, title: 'Marginal analysis and consumer choice',
    intro: 'Economists ask not “should I study?” but “should I study one more hour?” Thinking at the margin compares the extra benefit with the extra cost of one more unit. Today you use marginal analysis and learn how consumers spend a budget to get the most satisfaction.',
    goals: ['Use marginal benefit and marginal cost to make decisions', 'Compute marginal utility from total utility', 'Apply the utility-maximizing rule MU/P', 'Explain why sunk costs should be ignored'],
    notes: [
      { k: 'rule', title: 'Marginal decision rule', t: r`Keep doing an activity as long as marginal benefit (MB) ≥ marginal cost (MC). The best amount is where MB = MC.` },
      { k: 'p', t: r`Utility is satisfaction. Marginal utility (MU) is the extra utility from one more unit: the change in total utility. MU usually falls as you consume more (diminishing marginal utility).` },
      { k: 'formula', t: r`\frac{MU_x}{P_x} = \frac{MU_y}{P_y} \quad \text{with the whole budget spent}` },
      { k: 'p', t: r`To maximize utility with a budget, buy the next unit that gives the most marginal utility per dollar, until the budget runs out. At the optimum, MU per dollar is equal across goods.` },
      { k: 'warn', t: r`Sunk costs (already paid and not recoverable) should not affect decisions about the future. Only future marginal benefits and costs matter.` },
    ],
    examples: [
      { q: r`Total utility from slices of pizza: 10, 18, 24, 28. What is the marginal utility of the third slice?`, steps: [r`MU = change in total utility.`, r`24 − 18 = 6.`], a: '6' },
      { q: r`Pizza: MU 30, price \$3. Soda: MU 12, price \$2. Which should the consumer buy more of?`, steps: [r`Pizza: 30 ÷ 3 = 10 utils per dollar. Soda: 12 ÷ 2 = 6.`, r`Pizza gives more per dollar, so buy more pizza (until MU per dollar evens out).`], a: 'Pizza' },
    ],
    practice: [
      P('mi1-3-1', 1, r`The marginal benefit of a third hour of studying is 20 and its marginal cost is 15. Should you study the third hour?`, 0, 'Compare MB with MC.', [r`MB (20) > MC (15), so the hour adds net benefit: study it.`], { choices: ['Yes, because MB exceeds MC', 'No, because MC is positive', 'No, because total benefit is falling', 'It depends on the cost of the first two hours'] }),
      P('mi1-3-2', 1, r`Total utility from 1, 2, 3, 4 cups of coffee is 10, 18, 24, 28. What is the marginal utility of the 3rd cup?`, ['6'], 'Change in total utility.', [r`24 − 18 = 6.`], { check: () => 24 - 18 === 6 }),
      P('mi1-3-3', 1, r`Pizza: MU 30, price \$3. Soda: MU 12, price \$2. To raise total utility, the consumer should buy`, 0, 'Compare MU per dollar.', [r`Pizza gives 10 utils per dollar versus 6 for soda.`], { choices: ['more pizza and less soda', 'more soda and less pizza', 'equal amounts of each', 'nothing more; utility is already maximized'] }),
      P('mi1-3-4', 2, r`A consumer has \$7. Apples cost \$1 and bananas \$2. Marginal utilities for successive apples: 10, 8, 6, 4, 2; for successive bananas: 16, 12, 8, 4. How many bananas maximize total utility?`, ['2'], 'Buy in order of highest MU per dollar.', [r`MU per dollar: apples 10, 8, 6, 4, 2; bananas 8, 6, 4, 2.`, r`Buying in order: apple (10), apple and banana (8), apple and banana (6). That spends \$3 + \$4 = \$7: 3 apples and 2 bananas.`], { check: () => { const A = [10, 8, 6, 4, 2], B = [16, 12, 8, 4]; const tu = (m: number[], n: number) => m.slice(0, n).reduce((s, x) => s + x, 0); let best = -1, bb = -1; for (let a = 0; a <= 5; a++) for (let b = 0; b <= 4; b++) if (a + 2 * b <= 7 && tu(A, a) + tu(B, b) > best) { best = tu(A, a) + tu(B, b); bb = b; } return bb === 2; } }),
      P('mi1-3-5', 2, r`You paid \$40 for a nonrefundable ticket, then learn the event will be dull. How should the \$40 affect your decision to go?`, 3, 'Can you get the money back either way?', [r`The \$40 is a sunk cost: it is spent whether or not you go, so it should not affect the decision.`], { choices: ['You should go so the \\$40 is not wasted', 'You should stay home to avoid losing more than \\$40', 'You should go only if the event costs less than \\$40 more', 'It should not affect the decision at all'] }),
      P('mi1-3-6', 3, r`A consumer maximizes utility buying goods X and Y. $MU_x = 20$, $P_x = \$4$ and $MU_y = 15$. What is $P_y$ in dollars?`, ['3'], 'Set the MU per dollar equal.', [r`$\frac{20}{4} = 5 = \frac{15}{P_y}$, so $P_y = 3$.`], { check: () => near(15 / (20 / 4), 3) }),
    ],
    remember: ['Do more while MB ≥ MC.', 'MU = change in total utility; it diminishes.', 'Optimum: MU/P equal across goods, budget spent; ignore sunk costs.'],
    checkIn: 'Unit 1 done. Next: supply and demand, the most important model in economics.',
  },
  {
    id: 'mi2-1', unit: 2, n: 1, title: 'Demand, supply and market equilibrium',
    intro: 'Prices in competitive markets come from the interaction of buyers and sellers. Today you learn the laws of demand and supply, what shifts each curve, and how to find the equilibrium price and quantity, both on a graph and with equations.',
    goals: ['State the laws of demand and supply', 'Distinguish a change in demand from a change in quantity demanded', 'Identify the determinants that shift each curve', 'Find equilibrium and predict changes, including double shifts'],
    notes: [
      { k: 'rule', title: 'Laws of demand and supply', t: r`Demand: as price rises, quantity demanded falls (downward-sloping curve), because of the substitution and income effects. Supply: as price rises, quantity supplied rises (upward-sloping curve).` },
      { k: 'list', items: [r`**Demand shifters:** tastes, income (normal vs inferior goods), prices of related goods (substitutes, complements), expectations, number of buyers.`, r`**Supply shifters:** input prices, technology, expectations, number of sellers, taxes and subsidies, prices of other goods the firm could produce.`] },
      { k: 'warn', t: r`A change in the good’s **own price** moves along the curve (change in quantity demanded or supplied). Only the other factors **shift** the curve.` },
      { k: 'rule', title: 'Equilibrium', t: r`Where quantity demanded equals quantity supplied. Below it there is a shortage (Qd > Qs) and price rises; above it there is a surplus (Qs > Qd) and price falls.` },
      { k: 'tip', t: r`When both curves shift, one of price or quantity is certain and the other is indeterminate. Draw each shift separately and see which variable they agree on.` },
    ],
    examples: [
      { q: r`$Q_d = 100 - 2P$ and $Q_s = 20 + 2P$. Find the equilibrium price and quantity.`, steps: [r`Set equal: $100 - 2P = 20 + 2P$, so $80 = 4P$ and $P = 20$.`, r`$Q = 100 - 40 = 60$.`], a: 'P = 20, Q = 60' },
      { q: r`The price of coffee rises. What happens to the market for tea (a substitute)?`, steps: [r`Some coffee drinkers switch to tea, so the demand for tea increases (shifts right).`, r`Equilibrium price and quantity of tea both rise.`], a: 'Tea price and quantity rise' },
    ],
    practice: [
      P('mi2-1-1', 1, r`$Q_d = 100 - 2P$ and $Q_s = 20 + 2P$. What is the equilibrium price?`, ['20'], 'Set Qd = Qs.', [r`$100 - 2P = 20 + 2P$ gives $P = 20$.`], { check: () => 100 - 2 * 20 === 20 + 2 * 20 }),
      P('mi2-1-2', 1, r`For the same market, what is the equilibrium quantity?`, ['60'], 'Substitute P = 20.', [r`$100 - 2(20) = 60$.`], { check: () => 100 - 2 * 20 === 60 }),
      P('mi2-1-3', 2, r`For the same market, if the price is \$15, how large is the shortage?`, ['20'], 'Compute Qd and Qs at P = 15.', [r`$Q_d = 70$ and $Q_s = 50$: a shortage of 20 units.`], { check: () => (100 - 2 * 15) - (20 + 2 * 15) === 20 }),
      P('mi2-1-4', 1, r`The price of a substitute for good X rises. What happens to the demand for X?`, 1, 'Buyers switch toward the cheaper good.', [r`X is now relatively cheaper, so demand for X increases (shifts right).`], { choices: ['It decreases', 'It increases', 'It does not change, but quantity demanded rises', 'It becomes perfectly elastic'] }),
      P('mi2-1-5', 2, r`The cost of a key input rises. What happens to equilibrium price and quantity?`, 2, 'Which curve shifts, and which way?', [r`Higher costs decrease supply (shift left): price rises and quantity falls.`], { choices: ['Price falls, quantity rises', 'Both fall', 'Price rises, quantity falls', 'Both rise'] }),
      P('mi2-1-6', 3, r`Demand and supply both increase. What can be concluded?`, 3, 'Draw each shift separately.', [r`Both shifts raise quantity. Demand pushes price up and supply pushes it down, so price is indeterminate.`], { choices: ['Price rises; quantity is indeterminate', 'Price falls; quantity rises', 'Both price and quantity rise', 'Quantity rises; price is indeterminate'] }),
    ],
    remember: ['Own price → movement along; other factors → shift.', 'Equilibrium: Qd = Qs; below it shortage, above it surplus.', 'Double shift: one variable certain, the other indeterminate.'],
    checkIn: 'Next: elasticity, how strongly buyers and sellers respond to price.',
  },
  {
    id: 'mi2-2', unit: 2, n: 2, title: 'Elasticity',
    intro: 'If a store raises its price, will it earn more or less? It depends on how strongly customers react: elasticity. Today you calculate price, income and cross-price elasticities and use the total revenue test, one of the most useful tools in the course.',
    goals: ['Compute price elasticity of demand, including the midpoint method', 'Classify demand as elastic, inelastic or unit elastic', 'Apply the total revenue test', 'Use income and cross-price elasticity to classify goods'],
    notes: [
      { k: 'formula', t: r`E_d = \frac{\%\Delta Q_d}{\%\Delta P} \qquad \text{midpoint: } \%\Delta = \frac{\text{new} - \text{old}}{(\text{new} + \text{old})/2}` },
      { k: 'list', items: [r`$|E_d| > 1$: elastic; $|E_d| < 1$: inelastic; $|E_d| = 1$: unit elastic.`, r`Demand is more elastic with many substitutes, for luxuries, for goods that take a big share of income, and over longer time periods.`] },
      { k: 'rule', title: 'Total revenue test', t: r`Elastic: price and total revenue move in **opposite** directions. Inelastic: they move in the **same** direction. Unit elastic: total revenue does not change.` },
      { k: 'list', items: [r`Income elasticity > 0: normal good (> 1: luxury); < 0: inferior good.`, r`Cross-price elasticity > 0: substitutes; < 0: complements.`] },
      { k: 'warn', t: r`Slope is not elasticity. Along a straight-line demand curve the slope is constant but elasticity changes: elastic at high prices, inelastic at low prices.` },
    ],
    examples: [
      { q: r`Price rises from \$4 to \$6 and quantity falls from 120 to 80. Find the elasticity with the midpoint method.`, steps: [r`$\%\Delta Q = \frac{80 - 120}{100} = -40\%$; $\%\Delta P = \frac{6 - 4}{5} = 40\%$.`, r`$|E_d| = \frac{40}{40} = 1$: unit elastic.`], a: '1' },
      { q: r`Demand is inelastic and the firm raises its price. What happens to total revenue?`, steps: [r`Inelastic: quantity falls by a smaller percentage than price rises.`, r`Total revenue rises (same direction as price).`], a: 'Rises' },
    ],
    practice: [
      P('mi2-2-1', 1, r`Price rises 10% and quantity demanded falls 25%. What is the absolute value of the price elasticity of demand?`, ['2.5'], '%ΔQ ÷ %ΔP.', [r`$25 \div 10 = 2.5$: elastic.`], { check: () => 25 / 10 === 2.5 }),
      P('mi2-2-2', 2, r`Price rises from \$4 to \$6 and quantity falls from 120 to 80. Using the midpoint method, what is $|E_d|$?`, ['1'], 'Use averages as the base.', [r`$\frac{40/100}{2/5} = \frac{0.4}{0.4} = 1$.`], { check: () => near((40 / 100) / (2 / 5), 1) }),
      P('mi2-2-3', 1, r`Demand for a product is elastic. If the firm raises its price, total revenue will`, 1, 'Opposite or same direction?', [r`Elastic: quantity falls by a larger percentage than price rises, so total revenue falls.`], { choices: ['increase', 'decrease', 'stay the same', 'double'] }),
      P('mi2-2-4', 2, r`Income rises 10% and the quantity demanded of a good falls 5%. What is the income elasticity?`, ['-0.5'], 'Keep the sign: it classifies the good.', [r`$\frac{-5}{10} = -0.5$: negative, so it is an inferior good.`], { check: () => -5 / 10 === -0.5 }),
      P('mi2-2-5', 2, r`The price of good B rises 20% and the quantity demanded of good A rises 10%. What is the cross-price elasticity?`, ['0.5'], 'Positive means substitutes.', [r`$\frac{10}{20} = 0.5 > 0$: A and B are substitutes.`], { check: () => 10 / 20 === 0.5 }),
      P('mi2-2-6', 3, r`At \$4, a store sells 120 units; at \$6, it sells 80. By how many dollars does total revenue change when the price rises from \$4 to \$6?`, ['0'], 'Compute both revenues.', [r`$4 \times 120 = 480$ and $6 \times 80 = 480$: no change, as unit elasticity predicts.`], { check: () => 6 * 80 - 4 * 120 === 0 }),
    ],
    remember: ['Ed = %ΔQ/%ΔP; use the midpoint method between two points.', 'Elastic: P and TR opposite; inelastic: same direction.', 'Income: + normal, − inferior. Cross: + substitutes, − complements.'],
    checkIn: 'Next: consumer and producer surplus, and what price controls and taxes do to them.',
  },
  {
    id: 'mi2-3', unit: 2, n: 3, title: 'Surplus, price controls and taxes',
    intro: 'Markets create value for buyers (consumer surplus) and sellers (producer surplus). Government policies such as price ceilings, price floors and taxes change how that value is shared, and usually destroy some of it: deadweight loss. Today you calculate all of these from a graph.',
    goals: ['Compute consumer and producer surplus', 'Analyze price ceilings and floors', 'Find tax revenue, tax incidence and deadweight loss', 'Explain why equilibrium maximizes total surplus'],
    notes: [
      { k: 'p', t: r`**Consumer surplus** (CS) is the area below demand and above the price. **Producer surplus** (PS) is the area above supply and below the price. At equilibrium their sum, total surplus, is as large as possible.` },
      { k: 'list', items: [r`**Price ceiling** (legal maximum) below equilibrium: shortage, deadweight loss.`, r`**Price floor** (legal minimum) above equilibrium: surplus, deadweight loss. A minimum wage is a price floor in the labor market.`] },
      { k: 'rule', title: 'Per-unit tax', t: r`A tax of \$t per unit creates a wedge: buyers pay more, sellers keep less, and quantity falls. Tax revenue = t × new quantity. Deadweight loss = ½ × t × (drop in quantity).` },
      { k: 'p', t: r`Tax incidence: the side of the market that is more **inelastic** bears more of the tax, whichever side legally pays it.` },
      { k: 'tip', t: r`For a world price below the domestic price, imports fill the gap; a tariff raises the domestic price, increases domestic production, reduces imports and creates deadweight loss.` },
    ],
    examples: [
      { q: r`Demand: $P = 100 - Q$. Supply: $P = 20 + Q$. Find equilibrium and consumer surplus.`, steps: [r`$100 - Q = 20 + Q$ gives $Q = 40$, $P = 60$.`, r`CS $= \frac{1}{2} \times 40 \times (100 - 60) = 800$.`], a: 'CS = 800' },
      { q: r`A \$20 per-unit tax is placed on sellers in the same market. Find the new quantity and the tax revenue.`, steps: [r`New supply: $P = 40 + Q$. $100 - Q = 40 + Q$ gives $Q = 30$ (buyers pay 70, sellers keep 50).`, r`Revenue $= 20 \times 30 = 600$.`], a: '600' },
    ],
    practice: [
      P('mi2-3-1', 1, r`Demand: $P = 100 - Q$; supply: $P = 20 + Q$. What is consumer surplus at equilibrium?`, ['800'], 'Triangle above the price, below demand.', [r`$Q = 40$, $P = 60$: CS $= \frac{1}{2}(40)(40) = 800$.`], { check: () => 0.5 * 40 * (100 - 60) === 800 }),
      P('mi2-3-2', 1, r`For the same market, what is producer surplus?`, ['800'], 'Triangle below the price, above supply.', [r`PS $= \frac{1}{2}(40)(60 - 20) = 800$.`], { check: () => 0.5 * 40 * (60 - 20) === 800 }),
      P('mi2-3-3', 2, r`A price ceiling of \$50 is imposed on the same market. How large is the shortage?`, ['20'], 'Find Qd and Qs at P = 50.', [r`Demand: $Q = 100 - 50 = 50$. Supply: $Q = 50 - 20 = 30$. Shortage: 20.`], { check: () => (100 - 50) - (50 - 20) === 20 }),
      P('mi2-3-4', 2, r`A \$20 per-unit tax is placed on the same market. What is the government’s tax revenue?`, ['600'], 'Tax × new quantity.', [r`New quantity 30; revenue $= 20 \times 30 = 600$.`], { check: () => { const q = (100 - 40) / 2; return 20 * q === 600; } }),
      P('mi2-3-5', 2, r`What is the deadweight loss from that \$20 tax?`, ['100'], 'Triangle: base = drop in quantity, height = tax.', [r`$\frac{1}{2} \times 20 \times (40 - 30) = 100$.`], { check: () => 0.5 * 20 * (40 - 30) === 100 }),
      P('mi2-3-6', 3, r`With the \$20 tax, by how many dollars does the price paid by buyers rise above the original equilibrium price?`, ['10'], 'Buyers now pay the price on the demand curve at the new quantity.', [r`At $Q = 30$ buyers pay $100 - 30 = 70$, up \$10 from 60. Sellers keep 50, down \$10: with equal slopes the burden is split evenly.`], { check: () => (100 - 30) - 60 === 10 }),
    ],
    remember: ['CS above price under demand; PS below price above supply.', 'Ceilings → shortages; floors → surpluses; both → DWL.', 'Tax revenue = t × Q; DWL = ½ × t × ΔQ; the inelastic side pays more.'],
    checkIn: 'Unit 2 done. Next: how firms produce and what their costs look like.',
  },
];

/** Tutor layer for Units 1–2. */
export const MICRO_A_TUTOR: Record<string, LessonTutor> = {
  'mi1-1': {
    bigIdea: [
      r`You have one Saturday. You can go to a friend’s party, or work a shift and earn money, but not both. Whatever you choose, you give up the other. That “giving up” is the heart of economics: because time, money and resources are limited (scarcity), every choice has a cost.`,
      r`The cost of a choice is not just the money you pay. It is the value of the best thing you could have done instead: the opportunity cost. Going to the party costs you the paycheck you would have earned.`,
      r`A whole country faces the same trade-off. The production possibilities curve shows the most it can make of two goods. If it wants more of one, it must give up some of the other, and the more it shifts, the more expensive each extra unit gets, because the resources moved over are less and less suited to the new job.`,
    ],
    picture: { title: 'Baking with one oven', t: r`A bakery with one oven can bake bread or cakes. To bake more cakes, it must bake less bread. The first few cakes are cheap (use the cake expert), but soon the bread specialists are making cakes badly, so each extra cake costs more bread. That rising cost bends the PPC outward.` },
    words: [
      { term: 'Scarcity', means: 'Limited resources but unlimited wants, which forces choices.' },
      { term: 'Opportunity cost', means: 'The value of the next best alternative given up.' },
      { term: 'Factors of production', means: 'Land, labor, capital and entrepreneurship.' },
      { term: 'Production possibilities curve (PPC)', means: 'A graph of the maximum combinations of two goods an economy can produce.' },
      { term: 'Efficiency', means: 'Producing on the PPC: no resources wasted or idle.' },
    ],
    tools: [
      { name: 'Reading tables and graphs', refresher: 'Each row of a PPC table is a point on the curve.', lesson: 'c0-3' },
      { name: 'Rates as ratios', refresher: 'Opportunity cost per unit = amount given up ÷ amount gained, like a slope.', lesson: 'c0-4' },
    ],
    why: [
      [r`Opportunity cost compares what you give up (butter) with what you gain (guns) between two points.`, r`Dividing gives the cost of each single gun.`],
      [r`Comparing the per-gun costs along the curve shows whether they rise, stay constant, or fall.`, r`Rising costs make each move steeper, which bends the curve outward.`],
    ],
    walk: {
      'mi1-1-1': [r`Opportunity cost includes what you pay and what you give up.`, r`You pay \$50 and lose 4 × \$12 = \$48 in wages.`, r`Total: \$98.`],
      'mi1-1-2': [r`A point inside the curve means the economy could produce more of both goods.`, r`That only happens when resources are idle or wasted.`, r`Choice B.`],
      'mi1-1-3': [r`From C (20, 70) to D (30, 40): guns +10, butter −30.`, r`30 ÷ 10 = 3.`, r`Each gun costs 3 units of butter.`],
      'mi1-1-4': [r`A bowed-out curve gets steeper as you move along it.`, r`Steeper means each extra unit costs more of the other good.`, r`Increasing opportunity cost: choice C.`],
      'mi1-1-5': [r`Shifting the PPC requires more resources or better technology.`, r`Lower unemployment moves the economy toward its existing curve, not beyond it.`, r`Technology: choice A.`],
      'mi1-1-6': [r`From D (30, 40) to E (40, 0): guns +10, butter −40.`, r`40 ÷ 10 = 4.`, r`The cost keeps rising (1, 2, 3, 4): increasing opportunity cost.`],
    },
    teach: {
      plan: [r`Ask your student what they gave up to be here today: opportunity cost.`, r`List the four factors of production with examples.`, r`Plot the PPC table and label efficient, inefficient and unattainable points.`, r`Compute opportunity costs between points and notice they rise.`, r`Show what shifts the curve outward.`],
      questions: [
        { q: 'Is opportunity cost only about money?', a: 'No. It includes time and anything else you give up: the value of your next best alternative.' },
        { q: 'Why is the PPC curved instead of straight?', a: 'Resources are not equally good at producing everything, so moving them to a new use gets more costly as you go.' },
        { q: 'Does reducing unemployment shift the PPC?', a: 'No. It moves the economy from inside the curve toward the curve. Only more resources or better technology shift it.' },
      ],
      keyPoints: ['Scarcity forces choices; every choice has an opportunity cost.', 'On the PPC = efficient; inside = idle resources; outside = unattainable.', 'Bowed-out PPC = increasing opportunity cost.', 'Growth (resources, technology) shifts the PPC outward.'],
    },
  },
  'mi1-2': {
    bigIdea: [
      r`Imagine a top lawyer who also types faster than her assistant. Should she type her own letters? No: every hour she spends typing is an hour of expensive legal work she gives up. The assistant gives up much less to type. That is comparative advantage: whoever gives up the least should do the task.`,
      r`Absolute advantage is about who is better or faster. Comparative advantage is about who has the lower opportunity cost. Even if one country is better at making everything, both countries gain when each specializes in what it gives up least to produce, and then they trade.`,
      r`For trade to help both sides, the “price” of a good (how much of the other good it trades for) must fall between the two producers’ opportunity costs: better than each could do alone.`,
    ],
    picture: { title: 'Chores between siblings', t: r`Your sister folds laundry twice as fast as you and washes dishes a little faster. She is better at both (absolute advantage), but she gives up less by folding. So she folds, you wash, and the chores finish sooner than if each of you did half of everything.` },
    words: [
      { term: 'Absolute advantage', means: 'Producing more of a good with the same resources.' },
      { term: 'Comparative advantage', means: 'Producing a good at a lower opportunity cost.' },
      { term: 'Specialization', means: 'Focusing on producing the good where you have the comparative advantage.' },
      { term: 'Terms of trade', means: 'The rate at which one good is exchanged for another.' },
      { term: 'Output vs input problem', means: 'Data given as amounts produced vs time or workers needed per unit.' },
    ],
    tools: [
      { name: 'Opportunity cost', refresher: 'What is given up ÷ what is gained.', lesson: 'mi1-1' },
      { name: 'Fractions and ratios', refresher: r`$\frac{10}{5} = 2$ and $\frac{5}{10} = 0.5$ are reciprocals: the cost of one good is the reciprocal of the cost of the other.`, lesson: 'c0-1' },
    ],
    why: [
      [r`Each person’s cost of a hat is the shirts they could have made instead, per hat.`, r`The lower cost wins the comparative advantage, regardless of who makes more.`],
      [r`Each side will only trade if it gets a better deal than producing alone.`, r`So the price of a hat must be more than Ben’s cost (1) and less than Ana’s cost (2).`],
    ],
    walk: {
      'mi1-2-1': [r`Output problem: Ana gives up 10 shirts to make 5 hats.`, r`Per hat: 10 ÷ 5.`, r`2 shirts per hat.`],
      'mi1-2-2': [r`Cost of a shirt: Ana 5 ÷ 10 = 0.5 hat; Ben 6 ÷ 6 = 1 hat.`, r`Ana gives up less per shirt.`, r`Ana has the comparative advantage in shirts (choice A).`],
      'mi1-2-3': [r`Absolute advantage compares raw output.`, r`Hats: Ana 5, Ben 6.`, r`Ben (choice B).`],
      'mi1-2-4': [r`Opportunity costs of a hat: Ben 1 shirt, Ana 2 shirts.`, r`Mutually beneficial prices lie strictly between 1 and 2.`, r`1.5 shirts per hat (choice C).`],
      'mi1-2-5': [r`Output problem: 30 wheat or 10 cloth.`, r`Cost of 1 cloth = wheat given up ÷ cloth gained = 30 ÷ 10.`, r`3 tons of wheat.`],
      'mi1-2-6': [r`Input problem: the data are hours per unit.`, r`A table uses 4 hours, which could make 4 ÷ 2 = 2 chairs.`, r`So 1 table costs 2 chairs (input formula: own input ÷ other input).`],
    },
    teach: {
      plan: [r`Tell the lawyer-and-typist story.`, r`Make an output table for Ana and Ben and compute all four opportunity costs.`, r`Circle who has the lower cost for each good.`, r`Show the trading range between the two costs.`, r`Do an input problem and show why the formula flips.`],
      questions: [
        { q: 'If one country is better at everything, why trade?', a: 'Because comparative advantage depends on opportunity cost, and no one can have the lower opportunity cost in both goods. Specializing and trading still raises total output.' },
        { q: 'How do I keep input and output problems straight?', a: 'Output: “Other Over” (other good ÷ this good). Input: “IOU”, Input = Own Under… or just reason it out: an hour on a table could have made how many chairs?' },
        { q: 'What makes terms of trade fair to both?', a: 'Each side must get the good for less than it would cost to make it themselves, so the price must sit between their opportunity costs.' },
      ],
      keyPoints: ['Comparative advantage = lower opportunity cost.', 'Specialize by comparative advantage, then trade.', 'Output: other ÷ own; input: own ÷ other.', 'Terms of trade must lie between opportunity costs.'],
    },
  },
  'mi1-3': {
    bigIdea: [
      r`Most decisions are not all-or-nothing. You don’t decide whether to eat; you decide whether to eat one more slice. Economists call this thinking at the margin: compare the extra benefit of one more unit with its extra cost.`,
      r`If the extra benefit is bigger, do it. Keep going until the extra benefit has fallen to equal the extra cost. That stopping point is the best amount.`,
      r`Consumers spending a budget use the same idea. Each dollar should go where it buys the most satisfaction. If pizza gives more satisfaction per dollar than soda, shift money toward pizza, until the satisfaction per dollar evens out. And money already spent and gone (a sunk cost) should not change future decisions.`,
    ],
    picture: { title: 'Eating pizza slices', t: r`The first slice is wonderful, the second very good, the fourth just okay, and the sixth makes you feel sick. Each slice adds less satisfaction than the one before (diminishing marginal utility). You stop when one more slice isn’t worth its cost.` },
    words: [
      { term: 'Marginal', means: 'Extra, additional: the change from one more unit.' },
      { term: 'Marginal benefit / marginal cost', means: 'The extra benefit / extra cost of one more unit.' },
      { term: 'Utility', means: 'Satisfaction from consuming a good.' },
      { term: 'Diminishing marginal utility', means: 'Each additional unit adds less satisfaction than the one before.' },
      { term: 'Sunk cost', means: 'A cost already paid that cannot be recovered.' },
    ],
    tools: [
      { name: 'Differences and ratios', refresher: r`Marginal = change: $24 - 18 = 6$. MU per dollar = $\frac{MU}{P}$.`, lesson: 'c0-1' },
      { name: 'Opportunity cost', refresher: 'Spending a dollar on one good means not spending it on another.', lesson: 'mi1-1' },
    ],
    why: [
      [r`Marginal utility is the extra satisfaction from one more unit, so subtract consecutive totals.`, r`The third slice raises total utility from 18 to 24.`],
      [r`Dividing by price compares satisfaction per dollar, which is what a budget-limited consumer cares about.`, r`Moving dollars toward the higher ratio raises total utility.`],
    ],
    walk: {
      'mi1-3-1': [r`Compare MB with MC for the third hour.`, r`20 > 15: the hour adds 5 of net benefit.`, r`Study it (choice A). Past hours are irrelevant to this decision.`],
      'mi1-3-2': [r`MU of the 3rd cup = TU(3) − TU(2).`, r`24 − 18.`, r`= 6.`],
      'mi1-3-3': [r`Pizza: 30 ÷ 3 = 10 utils per dollar. Soda: 12 ÷ 2 = 6.`, r`A dollar moved from soda to pizza raises total utility.`, r`Buy more pizza (choice A).`],
      'mi1-3-4': [r`Compute MU per dollar: apples 10, 8, 6, 4, 2; bananas (÷ 2) 8, 6, 4, 2.`, r`Buy the best per-dollar units first: apple (10), then apple and banana (8 each), then apple and banana (6 each). Spending: 3 apples × \$1 + 2 bananas × \$2 = \$7.`, r`2 bananas (and MU per dollar is equal at 6).`],
      'mi1-3-5': [r`The \$40 is gone whether you go or not.`, r`Only future costs and benefits matter: is the evening worth your time?`, r`It should not affect the decision (choice D).`],
      'mi1-3-6': [r`Utility maximization: $\frac{MU_x}{P_x} = \frac{MU_y}{P_y}$.`, r`$\frac{20}{4} = 5$, so $\frac{15}{P_y} = 5$.`, r`$P_y = 3$.`],
    },
    teach: {
      plan: [r`Ask: would you eat a 10th slice of pizza? Introduce marginal thinking.`, r`Compute marginal utility from a total utility table.`, r`Compare MU per dollar for two goods.`, r`Solve a small budget problem by buying the best per-dollar unit each time.`, r`Discuss a sunk cost example (a nonrefundable ticket).`],
      questions: [
        { q: 'Why not just maximize total benefit?', a: 'Because each unit also costs something. You want the most net benefit, which happens where marginal benefit equals marginal cost.' },
        { q: 'Why divide MU by price?', a: 'Because you are spending dollars. A cheap good with moderate satisfaction can beat an expensive good with high satisfaction per unit.' },
        { q: 'Isn’t ignoring sunk costs wasteful?', a: 'The money is gone either way. Letting it push you into a bad decision only adds a second loss.' },
      ],
      keyPoints: ['Decide at the margin: MB vs MC.', 'MU = change in total utility; it diminishes.', 'Maximize utility by equalizing MU/P with the budget spent.', 'Ignore sunk costs.'],
    },
  },
  'mi2-1': {
    bigIdea: [
      r`When the price of something goes up, people buy less of it; when it goes down, they buy more. That is the law of demand. Sellers react the opposite way: higher prices make them want to sell more. That is the law of supply.`,
      r`Put the two together and the market finds a price where the amount buyers want equals the amount sellers want: equilibrium. If the price is too low, buyers want more than is available (a shortage), and the price gets bid up. If it is too high, unsold goods pile up (a surplus), and the price falls.`,
      r`Be careful with words. A change in the good’s own price moves you along a curve. Anything else (income, tastes, input costs, technology) shifts the whole curve to a new position.`,
    ],
    picture: { title: 'A concert ticket market', t: r`If a band sets tickets too cheap, lines form and tickets resell for more (a shortage pushes the price up). If they set them too high, seats stay empty and they start discounting (a surplus pushes the price down). The price that exactly fills the arena is the equilibrium.` },
    words: [
      { term: 'Quantity demanded', means: 'The amount buyers want at a particular price.' },
      { term: 'Demand (curve)', means: 'The whole relationship between price and quantity demanded.' },
      { term: 'Normal / inferior good', means: 'Demand rises / falls when income rises.' },
      { term: 'Substitutes / complements', means: 'Goods used instead of each other / together.' },
      { term: 'Equilibrium', means: 'The price and quantity where quantity demanded equals quantity supplied.' },
    ],
    tools: [
      { name: 'Solving linear equations', refresher: r`$100 - 2P = 20 + 2P$ → $80 = 4P$ → $P = 20$.`, lesson: 'c0-2' },
      { name: 'Slopes of lines', refresher: 'Demand slopes down; supply slopes up.', lesson: 'c0-4' },
    ],
    why: [
      [r`Equilibrium is where the two equations give the same quantity, so set them equal and solve for the price.`, r`Substitute that price into either equation to get the quantity.`],
      [r`A pricier substitute pushes buyers toward tea at every tea price: a shift in tea’s demand.`, r`Higher demand with unchanged supply raises both price and quantity.`],
    ],
    walk: {
      'mi2-1-1': [r`Set Qd = Qs: $100 - 2P = 20 + 2P$.`, r`Add 2P to both sides and subtract 20: $80 = 4P$.`, r`$P = 20$.`],
      'mi2-1-2': [r`Plug $P = 20$ into either equation.`, r`$Q_d = 100 - 40 = 60$ (and $Q_s = 20 + 40 = 60$ ✓).`, r`Q = 60.`],
      'mi2-1-3': [r`At \$15: $Q_d = 100 - 30 = 70$.`, r`$Q_s = 20 + 30 = 50$.`, r`Buyers want 20 more than sellers offer: shortage of 20.`],
      'mi2-1-4': [r`The substitute got pricier, so X looks relatively cheaper.`, r`More buyers want X at every price: demand for X shifts right.`, r`Choice B.`],
      'mi2-1-5': [r`An input cost increase makes production more expensive at every price: supply shifts left.`, r`Along the unchanged demand curve, price rises and quantity falls.`, r`Choice C.`],
      'mi2-1-6': [r`Demand up: P up, Q up. Supply up: P down, Q up.`, r`Quantity rises either way; price effects conflict.`, r`Quantity rises, price indeterminate (choice D).`],
    },
    teach: {
      plan: [r`Survey your student: how many movie tickets would you buy at \$5, \$10, \$20? Draw demand.`, r`Do the same for sellers and draw supply.`, r`Find equilibrium on the graph and with equations.`, r`Show a shortage and a surplus and how price adjusts.`, r`Practice shifts with the determinant lists, including a double shift.`],
      questions: [
        { q: r`What’s the difference between “demand” and “quantity demanded”?`, a: 'Demand is the whole curve. Quantity demanded is one point on it at one price. A price change moves along the curve; other factors shift it.' },
        { q: 'Why does a shortage raise the price?', a: 'Buyers compete for limited goods, and sellers realize they can charge more, so the price rises until the shortage disappears.' },
        { q: 'How do I handle two shifts at once?', a: 'Draw them separately. Whichever variable both shifts push the same way is certain; the other depends on which shift is larger.' },
      ],
      keyPoints: ['Laws of demand and supply.', 'Own price → movement; other factors → shift.', 'Equilibrium: Qd = Qs; shortages raise price, surpluses lower it.', 'Double shift: one variable indeterminate.'],
    },
  },
  'mi2-2': {
    bigIdea: [
      r`Everyone buys less when prices rise, but how much less? If gas prices jump, people still need to drive to work, so they barely cut back. If one brand of chips gets expensive, people just switch brands. Elasticity measures how sensitive buyers (or sellers) are to price.`,
      r`We compare percentage changes: elasticity = % change in quantity ÷ % change in price. Above 1, buyers react strongly (elastic); below 1, weakly (inelastic).`,
      r`This tells businesses whether raising prices will earn more: if demand is inelastic, a price rise increases total revenue; if elastic, it decreases it. The same idea with income or with other goods’ prices tells us whether goods are normal or inferior, substitutes or complements.`,
    ],
    picture: { title: 'Insulin vs a brand of soda', t: r`If insulin doubles in price, diabetics still buy it: very inelastic. If one brand of soda doubles in price, shoppers grab another brand: very elastic. Necessities with no substitutes are inelastic; luxuries with many substitutes are elastic.` },
    words: [
      { term: 'Price elasticity of demand', means: '% change in quantity demanded ÷ % change in price.' },
      { term: 'Elastic / inelastic', means: 'Elasticity above 1 (strong response) / below 1 (weak response).' },
      { term: 'Midpoint method', means: 'Computing percentage changes using the average of the two values as the base.' },
      { term: 'Total revenue', means: 'Price × quantity sold.' },
      { term: 'Income / cross-price elasticity', means: 'Responsiveness of demand to income / to another good’s price.' },
    ],
    tools: [
      { name: 'Percent change', refresher: r`$\frac{\text{new} - \text{old}}{\text{old}} \times 100\%$; the midpoint version divides by the average.`, lesson: 'c0-1' },
      { name: 'Demand curves', refresher: 'Elasticity describes how quantity responds along the curve.', lesson: 'mi2-1' },
    ],
    why: [
      [r`The midpoint method uses averages so the answer is the same whether price rises or falls.`, r`Equal percentage changes give an elasticity of exactly 1.`],
      [r`Inelastic means quantity barely responds, so the price effect dominates.`, r`Revenue = P × Q rises because P rose by a bigger percentage than Q fell.`],
    ],
    walk: {
      'mi2-2-1': [r`Elasticity = %ΔQ ÷ %ΔP.`, r`25% ÷ 10%.`, r`= 2.5, elastic.`],
      'mi2-2-2': [r`%ΔQ: change 40, average 100 → 40%.`, r`%ΔP: change 2, average 5 → 40%.`, r`40 ÷ 40 = 1: unit elastic.`],
      'mi2-2-3': [r`Elastic: quantity falls by a larger percentage than price rises.`, r`So P × Q falls.`, r`Total revenue decreases (choice B).`],
      'mi2-2-4': [r`Income elasticity = %ΔQ ÷ %Δincome.`, r`−5% ÷ 10% = −0.5.`, r`Negative → inferior good.`],
      'mi2-2-5': [r`Cross-price elasticity = %ΔQ of A ÷ %ΔP of B.`, r`10% ÷ 20% = 0.5.`, r`Positive → substitutes.`],
      'mi2-2-6': [r`TR at \$4: 4 × 120 = 480.`, r`TR at \$6: 6 × 80 = 480.`, r`Change: 0, which matches unit elasticity from the midpoint calculation.`],
    },
    teach: {
      plan: [r`Contrast insulin and a brand of soda to introduce elasticity.`, r`Compute a simple elasticity from percentages.`, r`Do a midpoint calculation step by step.`, r`Fill in a total revenue table to discover the total revenue test.`, r`Classify goods with income and cross-price elasticity signs.`],
      questions: [
        { q: 'Why use the midpoint method?', a: 'Ordinary percent changes give different answers going up versus down. Averages give one answer either way.' },
        { q: 'Is a steep demand curve always inelastic?', a: 'Not exactly. Elasticity changes along a straight line even though the slope does not; but in comparisons on the same axes, steeper curves are less elastic over a range.' },
        { q: 'What does a negative income elasticity mean?', a: 'People buy less as they get richer: an inferior good, like instant noodles replaced by restaurant meals.' },
      ],
      keyPoints: ['Ed = %ΔQ ÷ %ΔP (absolute value).', '> 1 elastic, < 1 inelastic, = 1 unit.', 'Total revenue test: elastic → opposite; inelastic → same.', 'Income: normal + / inferior −; cross: substitutes + / complements −.'],
    },
  },
  'mi2-3': {
    bigIdea: [
      r`If you would have paid \$80 for a concert ticket but it costs \$60, you gain \$20 of value: consumer surplus. If the band would have played for \$40 a ticket but gets \$60, they gain \$20: producer surplus. On a graph, these gains are triangles between the price and the curves.`,
      r`At the market equilibrium, the total of these gains is as large as it can be. Every trade worth making happens.`,
      r`When governments set price ceilings, price floors or taxes, some trades that would have benefited both sides no longer happen. The value of those missing trades is the deadweight loss: a small triangle of value that simply disappears.`,
    ],
    picture: { title: 'Bargains at a garage sale', t: r`A buyer who would pay \$10 for a lamp gets it for \$4 (consumer surplus \$6); the seller, happy to get anything above \$1, gains \$3. If a rule said lamps must sell for at least \$12, that sale would never happen, and \$9 of combined happiness would vanish: deadweight loss.` },
    words: [
      { term: 'Consumer surplus', means: 'The difference between what buyers are willing to pay and what they pay.' },
      { term: 'Producer surplus', means: 'The difference between the price sellers receive and the minimum they would accept.' },
      { term: 'Price ceiling / floor', means: 'A legal maximum / minimum price.' },
      { term: 'Deadweight loss', means: 'Total surplus lost because the quantity traded is not the efficient quantity.' },
      { term: 'Tax incidence', means: 'How the burden of a tax is divided between buyers and sellers.' },
    ],
    tools: [
      { name: 'Area of a triangle', refresher: r`$\frac{1}{2} \times \text{base} \times \text{height}$.` },
      { name: 'Equilibrium', refresher: 'Find P and Q by setting demand equal to supply.', lesson: 'mi2-1' },
    ],
    why: [
      [r`Equilibrium comes first because surplus triangles are measured from the equilibrium price and quantity.`, r`CS is the triangle between the demand curve’s top (100) and the price (60), out to Q = 40.`],
      [r`A tax on sellers raises their required price by \$20 at every quantity, shifting supply up.`, r`Revenue is the tax times the units still sold.`],
    ],
    walk: {
      'mi2-3-1': [r`Equilibrium: $Q = 40$, $P = 60$.`, r`CS triangle: base 40, height $100 - 60 = 40$.`, r`$\frac{1}{2}(40)(40) = 800$.`],
      'mi2-3-2': [r`PS triangle: base 40, height $60 - 20 = 40$.`, r`$\frac{1}{2}(40)(40)$.`, r`= 800.`],
      'mi2-3-3': [r`At the ceiling price \$50, buyers want $100 - 50 = 50$.`, r`Sellers offer $50 - 20 = 30$.`, r`Shortage: 50 − 30 = 20.`],
      'mi2-3-4': [r`Tax shifts supply up by 20: $P = 40 + Q$.`, r`New equilibrium: $100 - Q = 40 + Q$, so $Q = 30$.`, r`Revenue: 20 × 30 = 600.`],
      'mi2-3-5': [r`Quantity fell from 40 to 30: a drop of 10.`, r`DWL triangle: base 10, height 20 (the tax).`, r`$\frac{1}{2}(10)(20) = 100$.`],
      'mi2-3-6': [r`At Q = 30 buyers pay the demand price $100 - 30 = 70$.`, r`Originally they paid 60.`, r`They pay \$10 more per unit (half the tax, because the curves are equally steep).`],
    },
    teach: {
      plan: [r`Use a garage-sale story to explain consumer and producer surplus.`, r`Shade CS and PS on a graph and compute them.`, r`Add a price ceiling and show the shortage and the lost trades.`, r`Add a per-unit tax and find revenue and deadweight loss.`, r`Discuss who bears a tax: the more inelastic side.`],
      questions: [
        { q: 'Why does a binding price ceiling create deadweight loss?', a: 'Fewer units are sold than at equilibrium, so trades that would have benefited both buyers and sellers never happen.' },
        { q: 'Does it matter whether the tax is placed on buyers or sellers?', a: 'No. The outcome is the same; the burden depends on elasticities, not on who writes the check.' },
        { q: 'Is the tax revenue part of the deadweight loss?', a: 'No. Revenue moves surplus to the government; deadweight loss is surplus nobody gets.' },
      ],
      keyPoints: ['CS and PS are triangles measured from the price.', 'Ceilings → shortages; floors → surpluses; both cause DWL.', 'Tax revenue = t × Q; DWL = ½ × t × ΔQ.', 'The more inelastic side bears more of a tax.'],
    },
  },
};

import type { CalcLesson, CalcProblem, LessonTutor } from '../calc/types';
import { near } from '../calc/types';

const r = String.raw;
const P = (id: string, level: 1 | 2 | 3, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, hint, solution, ...extra });

const COSTS = r`~~~
Q     0    1    2    3    4    5
TC   50   80  100  130  180  250
~~~`;
const TC = [50, 80, 100, 130, 180, 250];
const MC = (q: number) => TC[q] - TC[q - 1];
const MATRIX = r`~~~
                    Firm B: High      Firm B: Low
Firm A: High        (50, 50)          (20, 70)
Firm A: Low         (70, 20)          (30, 30)
(payoffs: A’s profit first, then B’s)
~~~`;
const PAY: Record<string, [number, number]> = { HH: [50, 50], HL: [20, 70], LH: [70, 20], LL: [30, 30] };

/** AP Microeconomics Units 3–4. Original lessons and problems. */
export const MICRO_B: CalcLesson[] = [
  {
    id: 'mi3-1', unit: 3, n: 1, title: 'Production and costs',
    intro: 'To understand how firms behave, you first need to know their costs. Today you see why adding workers eventually adds less and less output, and how that shapes a firm’s cost curves: fixed, variable, average and marginal cost.',
    goals: ['Compute marginal product and identify diminishing marginal returns', 'Distinguish fixed and variable costs', 'Compute AFC, AVC, ATC and MC from a table', 'Explain the shapes of the cost curves and economies of scale'],
    notes: [
      { k: 'p', t: r`In the **short run**, at least one input (like the factory) is fixed. Marginal product (MP) is the extra output from one more worker. Eventually MP falls: **diminishing marginal returns**, because workers share a fixed amount of capital.` },
      { k: 'list', items: [r`Fixed cost (FC): does not change with output (rent). It is TC at Q = 0.`, r`Variable cost (VC): rises with output (wages, materials). TC = FC + VC.`, r`AFC = FC/Q, AVC = VC/Q, ATC = TC/Q = AFC + AVC.`, r`Marginal cost: MC = ΔTC/ΔQ.`] },
      { k: 'rule', title: 'MC and the averages', t: r`MC cuts AVC and ATC at their minimum points. When MC is below an average, the average falls; when MC is above it, the average rises.` },
      { k: 'p', t: r`In the **long run**, all inputs can change. Long-run ATC falls with economies of scale, is flat with constant returns, and rises with diseconomies of scale.` },
      { k: 'warn', t: r`AFC always falls as output rises (the same fixed cost is spread over more units), so the gap between ATC and AVC shrinks.` },
    ],
    examples: [
      { q: r`Using the cost table, find the marginal cost of the 4th unit and ATC at Q = 4.
${COSTS}`, steps: [r`MC of the 4th unit $= 180 - 130 = 50$.`, r`ATC $= \frac{180}{4} = 45$.`], a: 'MC 50, ATC 45' },
      { q: r`Total product with 0–4 workers is 0, 10, 25, 36, 44. When do diminishing marginal returns begin?`, steps: [r`MP: 10, 15, 11, 8.`, r`MP first falls with the 3rd worker (15 → 11).`], a: 'With the 3rd worker' },
    ],
    practice: [
      P('mi3-1-1', 1, r`Using the cost table from the examples, what is fixed cost?`, ['50'], 'TC when Q = 0.', [r`At zero output only fixed cost remains: 50.`], { check: () => TC[0] === 50 }),
      P('mi3-1-2', 1, r`Using the cost table, what is the marginal cost of the 4th unit?`, ['50'], 'Find the change in TC.', [r`$180 - 130 = 50$.`], { check: () => MC(4) === 50 }),
      P('mi3-1-3', 1, r`Using the cost table, what is ATC at Q = 4?`, ['45'], 'TC ÷ Q.', [r`$\frac{180}{4} = 45$.`], { check: () => TC[4] / 4 === 45 }),
      P('mi3-1-4', 2, r`Using the cost table, what is AVC at Q = 4?`, ['32.5'], 'VC = TC − FC.', [r`VC $= 180 - 50 = 130$; AVC $= \frac{130}{4} = 32.5$.`], { check: () => (TC[4] - TC[0]) / 4 === 32.5 }),
      P('mi3-1-5', 2, r`The marginal cost curve intersects the average total cost curve`, 2, 'What happens to an average when the marginal is above or below it?', [r`MC pulls ATC down while below it and up while above it, so they meet at ATC’s minimum.`], { choices: ['at the maximum of ATC', 'where ATC equals AFC', 'at the minimum of ATC', 'only in the long run'] }),
      P('mi3-1-6', 3, r`Total product with 0, 1, 2, 3, 4 workers is 0, 10, 25, 36, 44. Which worker is the first to show diminishing marginal returns?`, ['3'], 'Compute each worker’s MP.', [r`MP: 10, 15, 11, 8. MP first falls with the 3rd worker.`], { check: () => { const tp = [0, 10, 25, 36, 44]; const mp = tp.slice(1).map((v, i) => v - tp[i]); return mp.findIndex((m, i) => i > 0 && m < mp[i - 1]) + 1 === 3; } }),
    ],
    remember: ['MP eventually diminishes in the short run.', 'TC = FC + VC; ATC = AFC + AVC; MC = ΔTC/ΔQ.', 'MC crosses AVC and ATC at their minimums.'],
    checkIn: 'Next: how a firm uses these costs to choose the output that maximizes profit.',
  },
  {
    id: 'mi3-2', unit: 3, n: 2, title: 'Profit maximization and the shutdown rule',
    intro: 'Every firm in every market structure follows one rule to maximize profit: produce where marginal revenue equals marginal cost. Today you learn that rule, the difference between accounting and economic profit, and when a losing firm should keep producing or shut down.',
    goals: ['Distinguish accounting profit, economic profit and normal profit', 'Find the profit-maximizing output with MR = MC', 'Compute profit or loss at that output', 'Apply the short-run shutdown rule'],
    notes: [
      { k: 'list', items: [r`Accounting profit = total revenue − explicit costs.`, r`Economic profit = total revenue − explicit costs − implicit costs (opportunity costs like the owner’s forgone salary).`, r`Zero economic profit is **normal profit**: the owner earns exactly what they could elsewhere.`] },
      { k: 'rule', title: 'Profit maximization', t: r`Produce the quantity where MR = MC. With a table, produce every unit whose MR ≥ MC and stop before the first unit with MC > MR.` },
      { k: 'formula', t: r`\text{profit} = TR - TC = (P - ATC) \times Q` },
      { k: 'rule', title: 'Short-run shutdown rule', t: r`Shut down (produce 0) if P < minimum AVC. Then the loss equals fixed cost. If P is above AVC but below ATC, keep producing: the loss is smaller than fixed cost.` },
      { k: 'p', t: r`In the long run, a firm exits if price stays below minimum ATC (it cannot cover all costs).` },
    ],
    examples: [
      { q: r`A price-taking firm faces P = \$60 with this cost table. What output maximizes profit?
${COSTS}`, steps: [r`MC of units 1–5: 30, 20, 30, 50, 70. MR = P = 60.`, r`Units 1–4 have MC ≤ 60; unit 5 costs 70 > 60. Produce 4 units (profit $240 - 180 = 60$).`], a: '4 units' },
      { q: r`Revenue is \$200,000, explicit costs are \$120,000 and the owner gave up a \$60,000 salary. Find accounting and economic profit.`, steps: [r`Accounting: $200{,}000 - 120{,}000 = 80{,}000$.`, r`Economic: $80{,}000 - 60{,}000 = 20{,}000$.`], a: '\\$80,000 and \\$20,000' },
    ],
    practice: [
      P('mi3-2-1', 1, r`Revenue \$200,000; explicit costs \$120,000; the owner gave up a \$60,000 salary. What is economic profit, in dollars?`, ['20000'], 'Subtract explicit and implicit costs.', [r`$200{,}000 - 120{,}000 - 60{,}000 = 20{,}000$.`], { check: () => 200000 - 120000 - 60000 === 20000 }),
      P('mi3-2-2', 1, r`A price-taking firm faces P = \$60 with the cost table above. What quantity maximizes profit?`, ['4'], 'Produce while MR ≥ MC.', [r`MC: 30, 20, 30, 50, 70. The 5th unit’s MC (70) exceeds 60, so produce 4.`], { check: () => { const pr = TC.map((c, q) => 60 * q - c); const best = Math.max(...pr); return pr.filter((v) => v === best).length === 1 && pr.indexOf(best) === 4; } }),
      P('mi3-2-3', 1, r`At that output, what is the firm’s profit?`, ['60'], 'TR − TC.', [r`$60 \times 4 - 180 = 60$.`], { check: () => 60 * 4 - TC[4] === 60 }),
      P('mi3-2-4', 1, r`In the short run, a firm should shut down when`, 3, 'Compare price with the average cost that shutting down avoids.', [r`Shutting down avoids variable costs only, so shut down when price cannot cover average variable cost.`], { choices: ['price is below ATC', 'economic profit is zero', 'MR is below ATC', 'price is below the minimum of AVC'] }),
      P('mi3-2-5', 2, r`With the cost table above, the market price falls to \$22. How many units should the firm produce in the short run?`, ['0'], 'Find minimum AVC (VC = TC − 50).', [r`AVC: 30, 25, 26.67, 32.5, 40. Minimum AVC is 25 > 22.`, r`Price is below minimum AVC, so the firm shuts down: 0 units.`], { check: () => Math.min(...[1, 2, 3, 4, 5].map((q) => (TC[q] - TC[0]) / q)) > 22 }),
      P('mi3-2-6', 3, r`With the cost table above, the price is \$30. The firm produces the profit-maximizing quantity. What is its profit (use a negative number for a loss)?`, ['-40'], 'Find the output, then TR − TC; compare with shutting down.', [r`MC: 30, 20, 30, 50: produce 3 units, where MR = MC (the 4th unit’s MC of 50 exceeds 30).`, r`Profit $= 90 - 130 = -40$. Shutting down would lose 50 (the fixed cost), so producing is better. (Producing 2 gives the same loss, so the answer is −40 either way.)`], { check: () => { let best = -Infinity; for (let q = 0; q <= 5; q++) best = Math.max(best, 30 * q - TC[q]); return best === -40; } }),
    ],
    remember: ['Economic profit subtracts implicit costs too.', 'Maximize profit at MR = MC.', 'Short run: shut down if P < min AVC; long run: exit if P < min ATC.'],
    checkIn: 'Next: perfectly competitive markets in the short run and the long run.',
  },
  {
    id: 'mi3-3', unit: 3, n: 3, title: 'Perfect competition',
    intro: 'Perfect competition is the benchmark market: many small firms selling identical products, free to enter and exit. Each firm is a price taker. Today you see how these markets produce profits or losses in the short run and zero economic profit, with full efficiency, in the long run.',
    goals: ['List the features of perfect competition', 'Explain why the firm’s demand curve is horizontal at the market price', 'Compute short-run profit or loss with ATC', 'Explain long-run adjustment and efficiency'],
    notes: [
      { k: 'list', items: [r`Many buyers and sellers; identical (standardized) products.`, r`Free entry and exit; perfect information.`, r`Each firm is a **price taker**: it can sell any amount at the market price.`] },
      { k: 'rule', title: 'Firm’s demand', t: r`For a perfectly competitive firm, P = MR = AR = demand: a horizontal line at the market price. It produces where P = MC.` },
      { k: 'p', t: r`Short run: if P > ATC the firm earns economic profit; if P < ATC it takes a loss. Long run: profits attract entry (market supply shifts right, price falls); losses cause exit (supply shifts left, price rises), until P = minimum ATC and economic profit is zero.` },
      { k: 'rule', title: 'Efficiency', t: r`In long-run equilibrium, P = MC (allocative efficiency: the right amount is produced) and P = minimum ATC (productive efficiency: produced at lowest cost).` },
      { k: 'tip', t: r`Draw side-by-side graphs: the market (supply and demand) on the left sets the price, which becomes the firm’s horizontal MR line on the right.` },
    ],
    examples: [
      { q: r`A competitive firm sells 100 units at P = \$12 with ATC = \$10. Find its profit.`, steps: [r`Profit per unit: $12 - 10 = 2$.`, r`Total: $2 \times 100 = 200$.`], a: '200' },
      { q: r`Firms in a competitive industry earn economic profits. What happens in the long run?`, steps: [r`New firms enter, shifting market supply right and lowering the price.`, r`Entry continues until price equals minimum ATC and economic profit is zero.`], a: 'Entry until zero profit' },
    ],
    practice: [
      P('mi3-3-1', 1, r`The demand curve facing an individual perfectly competitive firm is`, 0, 'Can the firm change the price?', [r`The firm can sell any amount at the market price, so its demand is horizontal (perfectly elastic).`], { choices: ['horizontal (perfectly elastic)', 'vertical (perfectly inelastic)', 'downward sloping', 'the same as the market demand curve'] }),
      P('mi3-3-2', 1, r`A competitive firm sells 100 units at \$12 each; ATC is \$10. What is its economic profit?`, ['200'], '(P − ATC) × Q.', [r`$(12 - 10) \times 100 = 200$.`], { check: () => (12 - 10) * 100 === 200 }),
      P('mi3-3-3', 2, r`Firms in a perfectly competitive industry are earning economic profits. In the long run,`, 1, 'What do profits attract?', [r`Profits attract entry, increasing market supply and lowering price until profit is zero.`], { choices: ['firms exit and price rises', 'firms enter and price falls', 'price stays the same and profits continue', 'the government sets a price ceiling'] }),
      P('mi3-3-4', 1, r`In a perfectly competitive industry, the minimum ATC of a typical firm is \$8. What is the long-run equilibrium price?`, ['8'], 'Long run: zero economic profit.', [r`Entry and exit drive price to minimum ATC: \$8.`], { check: () => 8 === 8 }),
      P('mi3-3-5', 2, r`Allocative efficiency occurs when`, 2, 'Compare the value of the last unit with its cost.', [r`P measures the value to buyers of the last unit and MC its cost; equality means the right quantity is produced.`], { choices: ['P = minimum ATC', 'MR = ATC', 'P = MC', 'TR = TC'] }),
      P('mi3-3-6', 3, r`A competitive firm faces P = \$15 and produces where MC = \$15 at Q = 40. There, ATC = \$18 and AVC = \$12. What is its economic loss, in dollars (as a positive number)?`, ['120'], '(ATC − P) × Q. Should it keep producing?', [r`Loss $= (18 - 15) \times 40 = 120$.`, r`Since P (15) > AVC (12), it keeps producing in the short run; shutting down would lose the fixed cost, $(18 - 12) \times 40 = 240$.`], { check: () => (18 - 15) * 40 === 120 && (18 - 12) * 40 > 120 }),
    ],
    remember: ['Firm: P = MR = demand (horizontal); produce where P = MC.', 'Profits → entry; losses → exit; long run P = min ATC.', 'Long run is allocatively (P = MC) and productively (min ATC) efficient.'],
    checkIn: 'Unit 3 done. Next: monopoly and other imperfectly competitive markets.',
  },
  {
    id: 'mi4-1', unit: 4, n: 1, title: 'Monopoly and price discrimination',
    intro: 'A monopoly is the only seller of a product with no close substitutes, protected by barriers to entry. Unlike a competitive firm, it chooses its price. Today you see why a monopoly’s marginal revenue is below its price, how it maximizes profit, and why the result is inefficient.',
    goals: ['Explain why MR is less than price for a monopoly', 'Find a monopoly’s profit-maximizing quantity and price', 'Compute monopoly profit and deadweight loss', 'Describe perfect price discrimination and natural monopoly'],
    notes: [
      { k: 'p', t: r`Barriers to entry (control of a resource, patents, government licenses, economies of scale) keep competitors out. A monopoly faces the downward-sloping market demand curve.` },
      { k: 'rule', title: 'MR below demand', t: r`To sell one more unit, a single-price monopoly must lower the price on all units, so MR < P. For linear demand $P = a - bQ$, $MR = a - 2bQ$ (twice as steep).` },
      { k: 'p', t: r`Profit maximization: find Q where MR = MC, then go **up to the demand curve** for the price. A monopoly always produces on the elastic part of demand (where MR > 0).` },
      { k: 'list', items: [r`Compared with competition: higher price, lower quantity, deadweight loss, P > MC (not allocatively efficient).`, r`**Perfect price discrimination**: each buyer pays their maximum, MR = demand, output is the efficient quantity, no deadweight loss, and consumer surplus is zero.`, r`**Natural monopoly**: economies of scale over the whole market. Regulators may set P = MC (efficient) or P = ATC (fair return).`] },
      { k: 'warn', t: r`The monopoly price is read from the demand curve, not from the MR or MC curve.` },
    ],
    examples: [
      { q: r`Demand: $P = 100 - Q$. MC = ATC = 20. Find the monopoly’s quantity, price and profit.`, steps: [r`$MR = 100 - 2Q = 20$ gives $Q = 40$.`, r`Price from demand: $P = 60$. Profit $= (60 - 20) \times 40 = 1600$.`], a: 'Q = 40, P = 60, profit 1600' },
      { q: r`For the same market, find the deadweight loss compared with perfect competition.`, steps: [r`Competition: $P = MC = 20$, so $Q = 80$.`, r`DWL $= \frac{1}{2} \times (60 - 20) \times (80 - 40) = 800$.`], a: '800' },
    ],
    practice: [
      P('mi4-1-1', 1, r`Demand: $P = 100 - Q$; MC = ATC = \$20. What quantity maximizes the monopoly’s profit?`, ['40'], 'MR = 100 − 2Q.', [r`$100 - 2Q = 20$ gives $Q = 40$.`], { check: () => { let best = -1, bq = 0; for (let q = 0; q <= 100; q++) { const pr = (100 - q) * q - 20 * q; if (pr > best) { best = pr; bq = q; } } return bq === 40; } }),
      P('mi4-1-2', 1, r`What price does the monopoly charge?`, ['60'], 'Read the price from demand.', [r`$P = 100 - 40 = 60$.`], { check: () => 100 - 40 === 60 }),
      P('mi4-1-3', 2, r`What is the monopoly’s profit?`, ['1600'], '(P − ATC) × Q.', [r`$(60 - 20) \times 40 = 1600$.`], { check: () => (60 - 20) * 40 === 1600 }),
      P('mi4-1-4', 2, r`What is the deadweight loss of this monopoly compared with perfect competition?`, ['800'], 'Competitive quantity is where P = MC.', [r`Competitive Q = 80. DWL $= \frac{1}{2} \times 40 \times 40 = 800$.`], { check: () => 0.5 * (60 - 20) * (80 - 40) === 800 }),
      P('mi4-1-5', 2, r`If this monopoly could perfectly price discriminate, which would be true?`, 1, 'Each buyer pays their maximum willingness to pay.', [r`MR equals demand, so the firm produces where demand meets MC (Q = 80): no deadweight loss, and consumer surplus is zero.`], { choices: ['Output would fall below 40', 'Output would be 80 and there would be no deadweight loss', 'Consumer surplus would rise', 'Price would equal MC for every buyer'] }),
      P('mi4-1-6', 3, r`A profit-maximizing monopoly always produces where demand is`, 0, 'Where is MR positive?', [r`MR = MC > 0 requires MR > 0, which occurs where demand is elastic.`], { choices: ['elastic', 'inelastic', 'unit elastic', 'perfectly inelastic'] }),
    ],
    remember: ['Monopoly: MR < P; MR is twice as steep as linear demand.', 'Q at MR = MC; price from the demand curve.', 'Higher P, lower Q, DWL; perfect price discrimination removes DWL but not profit.'],
    checkIn: 'Next: markets in between, monopolistic competition and oligopoly.',
  },
  {
    id: 'mi4-2', unit: 4, n: 2, title: 'Monopolistic competition, oligopoly and game theory',
    intro: 'Most real markets are between the extremes. Restaurants and clothing brands are monopolistically competitive: many firms with differentiated products. Airlines and phone carriers are oligopolies: a few firms that must think about each other. Game theory models those strategic choices.',
    goals: ['Describe monopolistic competition in the short and long run', 'Explain excess capacity and why P > MC', 'Describe oligopoly and collusion', 'Find dominant strategies and Nash equilibria in a payoff matrix'],
    notes: [
      { k: 'list', items: [r`**Monopolistic competition:** many firms, differentiated products, easy entry. Each firm has a downward-sloping demand curve.`, r`Long run: entry drives economic profit to zero, so P = ATC, but at a point **above** minimum ATC (excess capacity), and P > MC.`] },
      { k: 'p', t: r`**Oligopoly:** a few large firms, high barriers to entry, and mutual interdependence: each firm’s best choice depends on the others’. Firms may collude (form a cartel) but each has an incentive to cheat.` },
      { k: 'rule', title: 'Game theory', t: r`A **dominant strategy** is best no matter what the other player does. A **Nash equilibrium** is an outcome where neither player can do better by changing only their own strategy.` },
      { k: 'tip', t: r`To find best responses, fix the other player’s choice, compare your payoffs, and mark the higher one. Do this for both players; a cell marked for both is a Nash equilibrium.` },
      { k: 'p', t: r`Payoff matrix used today:
${MATRIX}` },
    ],
    examples: [
      { q: r`In the matrix, does Firm A have a dominant strategy?`, steps: [r`If B chooses High: A gets 50 (High) vs 70 (Low) → Low. If B chooses Low: 20 vs 30 → Low.`, r`Low is best either way: A’s dominant strategy is Low.`], a: 'Yes, Low' },
      { q: r`What is the Nash equilibrium?`, steps: [r`By symmetry, B’s dominant strategy is also Low.`, r`(Low, Low) with payoffs (30, 30). Both would prefer (High, High) at 50 each: a prisoner’s dilemma.`], a: '(Low, Low)' },
    ],
    practice: [
      P('mi4-2-1', 1, r`In the payoff matrix, what is Firm A’s dominant strategy?`, 1, 'Compare A’s payoffs for each of B’s choices.', [r`Low beats High whether B chooses High (70 > 50) or Low (30 > 20).`], { choices: ['High', 'Low', 'A has no dominant strategy', 'Whatever B chooses'] }),
      P('mi4-2-2', 1, r`What is Firm A’s payoff in the Nash equilibrium?`, ['30'], 'Both firms play their dominant strategies.', [r`(Low, Low) gives A a payoff of 30.`], { check: () => { const best = (b: string) => (PAY['H' + b][0] >= PAY['L' + b][0] ? 'H' : 'L'); return best('H') === 'L' && best('L') === 'L' && PAY.LL[0] === 30; } }),
      P('mi4-2-3', 2, r`The firms agree to both charge High. If B keeps the agreement, how much more profit does A earn by cheating (choosing Low)?`, ['20'], 'Compare A’s payoff in (High, High) and (Low, High).', [r`$70 - 50 = 20$: the incentive to cheat that makes cartels unstable.`], { check: () => PAY.LH[0] - PAY.HH[0] === 20 }),
      P('mi4-2-4', 2, r`In long-run equilibrium, a monopolistically competitive firm`, 3, 'Entry removes profit but demand still slopes down.', [r`Entry drives profit to zero (P = ATC), but the tangency is on the downward-sloping part of ATC, so output is below the minimum-ATC level.`], { choices: ['earns positive economic profit', 'produces at minimum ATC', 'charges a price equal to MC', 'earns zero economic profit and has excess capacity'] }),
      P('mi4-2-5', 1, r`Which feature distinguishes monopolistic competition from perfect competition?`, 0, 'Think about the products.', [r`Firms sell differentiated products, giving each some control over price.`], { choices: ['Differentiated products', 'Many firms', 'Free entry and exit', 'Zero economic profit in the long run'] }),
      P('mi4-2-6', 3, r`In a different game, Firm X chooses Up or Down and Firm Y chooses Left or Right. Payoffs (X, Y): (Up, Left) = (8, 4); (Up, Right) = (2, 6); (Down, Left) = (6, 2); (Down, Right) = (4, 5). What is X’s payoff in the Nash equilibrium?`, ['4'], 'Check whether Y has a dominant strategy first.', [r`Y: Right beats Left whether X plays Up (6 > 4) or Down (5 > 2), so Y plays Right.`, r`Against Right, X prefers Down (4 > 2). Nash equilibrium: (Down, Right); X earns 4.`], { check: () => { const g: Record<string, [number, number]> = { UL: [8, 4], UR: [2, 6], DL: [6, 2], DR: [4, 5] }; const nash = Object.keys(g).filter((k) => { const [x, y] = [k[0], k[1]]; const ox = x === 'U' ? 'D' : 'U', oy = y === 'L' ? 'R' : 'L'; return g[k][0] >= g[ox + y][0] && g[k][1] >= g[x + oy][1]; }); return nash.length === 1 && g[nash[0]][0] === 4; } }),
    ],
    remember: ['Monopolistic competition: differentiated products; long-run zero profit with excess capacity.', 'Oligopoly: few firms, interdependence, unstable collusion.', 'Dominant strategy: best regardless; Nash: no one wants to change alone.'],
    checkIn: 'Unit 4 done. Next: factor markets, where firms are the buyers.',
  },
];

/** Tutor layer for Units 3–4. */
export const MICRO_B_TUTOR: Record<string, LessonTutor> = {
  'mi3-1': {
    bigIdea: [
      r`Picture a small sandwich shop with one counter. The first worker makes sandwiches; a second worker helps a lot (one slices, one assembles). But by the fifth worker, people are bumping into each other at the same counter. Each new worker adds less: diminishing marginal returns.`,
      r`Because each extra worker adds less output, each extra sandwich costs more to make. That is why the marginal cost curve eventually rises. Some costs, like rent, are the same no matter how many sandwiches you make (fixed costs); others, like bread and wages, grow with output (variable costs).`,
      r`Dividing costs by output gives averages: cost per sandwich. Marginal cost acts like a test score added to your average: a score below your average pulls it down, a score above pulls it up. So MC crosses the average cost curves at their lowest points.`,
    ],
    picture: { title: 'Your grade average', t: r`If your average is 85 and you score 70 on the next test (marginal below average), your average drops. Score 95 (marginal above), and it rises. The average stops falling exactly when a new score equals it. Marginal cost and average cost behave the same way.` },
    words: [
      { term: 'Marginal product (MP)', means: 'The extra output from one more unit of an input.' },
      { term: 'Diminishing marginal returns', means: 'MP falls as more of a variable input is added to a fixed input.' },
      { term: 'Fixed / variable cost', means: 'Costs that do not / do change with output.' },
      { term: 'Average total cost (ATC)', means: 'TC ÷ Q: cost per unit.' },
      { term: 'Marginal cost (MC)', means: 'The extra cost of producing one more unit: ΔTC ÷ ΔQ.' },
      { term: 'Economies of scale', means: 'Long-run average cost falling as the firm grows.' },
    ],
    tools: [
      { name: 'Marginal thinking', refresher: 'Marginal = the change from one more unit.', lesson: 'mi1-3' },
      { name: 'Averages', refresher: r`Average = total ÷ number: $\frac{180}{4} = 45$.`, lesson: 'c0-1' },
    ],
    why: [
      [r`Marginal cost is the change in total cost from one more unit, so subtract consecutive totals.`, r`ATC is total cost spread over every unit produced.`],
      [r`MP is the change in total product from each extra worker.`, r`Diminishing returns start at the first worker whose MP is lower than the previous one’s.`],
    ],
    walk: {
      'mi3-1-1': [r`Fixed cost is paid even when nothing is produced.`, r`At Q = 0, TC = 50.`, r`FC = 50.`],
      'mi3-1-2': [r`MC of the 4th unit = TC(4) − TC(3).`, r`180 − 130.`, r`= 50.`],
      'mi3-1-3': [r`ATC = TC ÷ Q.`, r`180 ÷ 4.`, r`= 45.`],
      'mi3-1-4': [r`VC = TC − FC = 180 − 50 = 130.`, r`AVC = VC ÷ Q = 130 ÷ 4.`, r`= 32.5.`],
      'mi3-1-5': [r`When MC is below ATC, ATC falls; when above, ATC rises.`, r`The switch happens exactly where MC = ATC.`, r`That is ATC’s minimum (choice C).`],
      'mi3-1-6': [r`MP of each worker: 10 − 0 = 10, 25 − 10 = 15, 36 − 25 = 11, 44 − 36 = 8.`, r`MP rises from 10 to 15, then falls to 11.`, r`The 3rd worker is the first with diminishing returns.`],
    },
    teach: {
      plan: [r`Tell the crowded sandwich-counter story.`, r`Compute MP from a total product table.`, r`Split costs into fixed and variable with real examples.`, r`Fill in AFC, AVC, ATC and MC from the cost table.`, r`Use the grade-average analogy to explain why MC crosses ATC at its minimum.`],
      questions: [
        { q: 'Why do diminishing returns happen?', a: 'In the short run some inputs (space, machines) are fixed. Each extra worker has less of them to work with.' },
        { q: 'Why does AFC keep falling?', a: 'The same fixed cost is spread over more and more units.' },
        { q: 'What is the difference between diminishing returns and diseconomies of scale?', a: 'Diminishing returns are short run (one input fixed). Diseconomies of scale are long run, when the whole firm grows too large to manage efficiently.' },
      ],
      keyPoints: ['MP eventually diminishes in the short run.', 'TC = FC + VC; averages divide by Q.', 'MC = ΔTC/ΔQ, rising because of diminishing returns.', 'MC crosses AVC and ATC at their minimums.'],
    },
  },
  'mi3-2': {
    bigIdea: [
      r`Economists count profit differently from accountants. An accountant subtracts the bills you paid. An economist also subtracts what you gave up, like the salary you could have earned working elsewhere. If economic profit is zero, you are doing exactly as well as your next best option: that is called normal profit.`,
      r`How much should a firm produce? Keep producing one more unit as long as it brings in at least as much revenue as it costs (MR ≥ MC). Stop where they are equal. This MR = MC rule works for every kind of firm.`,
      r`Sometimes even the best output loses money. Should the firm close temporarily? If the price at least covers the variable costs (wages, materials), staying open helps pay part of the rent, so losses are smaller than shutting down. If not, shut down.`,
    ],
    picture: { title: 'A lemonade stand on a slow day', t: r`You already paid for the stand (fixed cost). Each cup costs 30 cents in lemons and sugar (variable cost). If you can sell cups for 40 cents, keep selling: each cup chips away at the stand’s cost. If people will only pay 20 cents, every cup loses money: close up and go home.` },
    words: [
      { term: 'Explicit / implicit cost', means: 'Out-of-pocket payments / opportunity costs of resources the owner already has.' },
      { term: 'Economic profit', means: 'Total revenue minus explicit and implicit costs.' },
      { term: 'Normal profit', means: 'Zero economic profit: earning exactly the opportunity cost.' },
      { term: 'Marginal revenue (MR)', means: 'The extra revenue from selling one more unit.' },
      { term: 'Shutdown point', means: 'The price equal to minimum AVC; below it the firm produces nothing.' },
    ],
    tools: [
      { name: 'Cost table', refresher: 'MC, AVC and ATC from the previous lesson.', lesson: 'mi3-1' },
      { name: 'Marginal decision rule', refresher: 'Do more while marginal benefit ≥ marginal cost.', lesson: 'mi1-3' },
    ],
    why: [
      [r`For a price taker, every unit sells for 60, so MR = 60; compare it with each unit’s MC.`, r`Stop before the first unit whose MC exceeds MR, because that unit would lower profit.`],
      [r`Accounting profit subtracts only the bills paid.`, r`Economic profit also subtracts the owner’s forgone salary, an implicit cost.`],
    ],
    walk: {
      'mi3-2-1': [r`Explicit costs: \$120,000. Implicit cost: the \$60,000 salary given up.`, r`200,000 − 120,000 − 60,000.`, r`Economic profit = \$20,000.`],
      'mi3-2-2': [r`MR = P = 60. MC of units 1–5: 30, 20, 30, 50, 70.`, r`Units 1–4 each have MC ≤ 60; unit 5 would cost 70.`, r`Produce 4.`],
      'mi3-2-3': [r`TR = 60 × 4 = 240.`, r`TC at Q = 4 is 180.`, r`Profit = 60.`],
      'mi3-2-4': [r`Shutting down saves variable costs but not fixed costs.`, r`So produce only if price covers average variable cost.`, r`Shut down when P < min AVC (choice D).`],
      'mi3-2-5': [r`AVC = (TC − 50) ÷ Q: 30, 25, 26.67, 32.5, 40. The minimum is 25.`, r`P = 22 is below 25, so no output covers its variable cost.`, r`Shut down: produce 0.`],
      'mi3-2-6': [r`MR = 30. MC: 30, 20, 30, 50: produce 3 units (the 4th costs 50).`, r`Profit = 30 × 3 − 130 = −40.`, r`Shutting down would lose 50 (fixed cost), so −40 is the best possible.`],
    },
    teach: {
      plan: [r`Compute accounting and economic profit for a small business owner.`, r`Explain MR for a price-taking firm (MR = P).`, r`Walk down the MC column and stop where MC would exceed MR.`, r`Compute profit at that output.`, r`Use the lemonade stand to explain the shutdown rule, then test it at P = 22 and P = 30.`],
      questions: [
        { q: 'Can a firm with zero economic profit be doing well?', a: 'Yes. Zero economic profit means it earns as much as its best alternative, so the owner has no reason to leave.' },
        { q: 'Why produce at all if you are losing money?', a: 'If revenue covers variable costs, staying open pays part of the fixed costs you owe anyway, so the loss is smaller.' },
        { q: 'Does MR = MC maximize profit for monopolies too?', a: 'Yes. Every profit-maximizing firm uses MR = MC; what differs is how MR relates to price.' },
      ],
      keyPoints: ['Economic profit subtracts implicit costs.', 'Produce where MR = MC.', 'Profit = (P − ATC) × Q.', 'Short run: shut down if P < min AVC.'],
    },
  },
  'mi3-3': {
    bigIdea: [
      r`Imagine hundreds of farmers selling identical wheat. No single farmer can charge more than the market price; buyers would just go next door. And charging less would be silly, since they can sell all they want at the market price. Each farmer is a price taker.`,
      r`If wheat farming becomes very profitable, new farmers jump in. More wheat lowers the price until the extra profit is gone. If farmers lose money, some quit, supply falls, and the price recovers. Either way, the long run ends at zero economic profit, with price equal to the lowest possible average cost.`,
      r`That long-run outcome is the efficiency gold standard: goods are made at the lowest possible cost, and exactly as much is produced as people value more than it costs to make.`,
    ],
    picture: { title: 'A farmers’ market with identical apples', t: r`If one stall charges \$3 a pound when everyone else charges \$2, nobody buys from it. If apple stands start earning big profits, more growers show up next week, and prices drift down. The market price is set by everyone together, not by any one stall.` },
    words: [
      { term: 'Price taker', means: 'A firm that must accept the market price.' },
      { term: 'Free entry and exit', means: 'Firms can join or leave the industry easily.' },
      { term: 'Long-run equilibrium', means: 'Price = minimum ATC; zero economic profit.' },
      { term: 'Allocative efficiency', means: 'P = MC: producing the quantity society values most.' },
      { term: 'Productive efficiency', means: 'Producing at minimum ATC: lowest cost per unit.' },
    ],
    tools: [
      { name: 'Profit maximization', refresher: 'MR = MC; profit = (P − ATC) × Q.', lesson: 'mi3-2' },
      { name: 'Supply shifts', refresher: 'Entry shifts market supply right; exit shifts it left.', lesson: 'mi2-1' },
    ],
    why: [
      [r`Profit per unit is the gap between price and average cost.`, r`Multiply by the number of units for total profit.`],
      [r`Economic profit signals that resources earn more here than elsewhere, which attracts new firms.`, r`Entry continues until the signal disappears: zero economic profit at minimum ATC.`],
    ],
    walk: {
      'mi3-3-1': [r`The firm can sell any quantity at the market price, but nothing above it.`, r`So its demand is a flat line at that price.`, r`Horizontal, perfectly elastic (choice A).`],
      'mi3-3-2': [r`Profit per unit: 12 − 10 = 2.`, r`Times 100 units.`, r`= 200.`],
      'mi3-3-3': [r`Economic profit attracts new firms.`, r`Market supply shifts right and price falls.`, r`Choice B.`],
      'mi3-3-4': [r`Long-run entry and exit push price to minimum ATC.`, r`Minimum ATC is \$8.`, r`Long-run price = \$8.`],
      'mi3-3-5': [r`Price is the value of the last unit to buyers; MC is its cost to society.`, r`When they are equal, no more or less should be produced.`, r`P = MC (choice C).`],
      'mi3-3-6': [r`Loss per unit: ATC − P = 18 − 15 = 3.`, r`Total loss: 3 × 40 = 120.`, r`P > AVC (15 > 12), so the firm keeps producing in the short run.`],
    },
    teach: {
      plan: [r`List the four conditions of perfect competition.`, r`Draw the side-by-side market and firm graphs.`, r`Show short-run profit as a rectangle (P − ATC) × Q.`, r`Animate entry: shift market supply right until profit disappears.`, r`Explain both kinds of efficiency in the long run.`],
      questions: [
        { q: 'Why would anyone stay in a market with zero economic profit?', a: 'Zero economic profit still covers all costs, including the owner’s opportunity cost. They earn as much as anywhere else.' },
        { q: 'Why is the firm’s demand horizontal when market demand slopes down?', a: 'The firm is tiny compared with the market; its output cannot change the price.' },
        { q: 'Is perfect competition realistic?', a: 'Few markets meet every condition, but agricultural and commodity markets come close, and it is the benchmark for judging other markets.' },
      ],
      keyPoints: ['Firm demand = P = MR, horizontal.', 'Produce where P = MC.', 'Profits → entry; losses → exit; long run P = min ATC.', 'Long run is allocatively and productively efficient.'],
    },
  },
  'mi4-1': {
    bigIdea: [
      r`A monopoly is the only seller of something people cannot easily replace, protected by barriers that keep competitors out, such as a patent or control of a key resource. Unlike a wheat farmer, a monopoly sets its own price. But it cannot set any price and sell any amount: it still faces the demand curve.`,
      r`Here is the twist: to sell one more unit, the monopoly must lower its price, and not just for that unit but for every unit it sells. So the extra revenue from one more sale is less than the price. That is why marginal revenue lies below demand.`,
      r`The monopoly finds the quantity where MR = MC, then charges the highest price buyers will pay for that quantity (read from the demand curve). Compared with competition, the price is higher, the quantity lower, and some valuable trades never happen: deadweight loss.`,
    ],
    picture: { title: 'The only pizza place in a small town', t: r`If the town’s only pizzeria drops its price from \$12 to \$11 to sell one more pizza, every customer pays \$11, not just the new one. The extra revenue is far less than \$11. So the pizzeria sells fewer pizzas at a higher price than a town full of competing pizzerias would.` },
    words: [
      { term: 'Monopoly', means: 'A single seller of a product with no close substitutes.' },
      { term: 'Barriers to entry', means: 'Obstacles that keep new firms out (patents, licenses, scale, resources).' },
      { term: 'Price maker', means: 'A firm that chooses its price, subject to demand.' },
      { term: 'Price discrimination', means: 'Charging different customers different prices for the same good.' },
      { term: 'Natural monopoly', means: 'A market where one firm can supply everyone at the lowest cost.' },
    ],
    tools: [
      { name: 'Profit maximization', refresher: 'MR = MC, profit = (P − ATC) × Q.', lesson: 'mi3-2' },
      { name: 'Deadweight loss triangles', refresher: r`$\frac{1}{2} \times$ base × height.`, lesson: 'mi2-3' },
      { name: 'Linear equations', refresher: r`$100 - 2Q = 20$ → $Q = 40$.`, lesson: 'c0-2' },
    ],
    why: [
      [r`MR for linear demand has the same intercept and twice the slope, so set it equal to MC.`, r`The price comes from the demand curve at Q = 40, not from MR or MC.`],
      [r`Under competition, output expands until P = MC.`, r`The triangle between demand and MC from 40 to 80 is the lost value.`],
    ],
    walk: {
      'mi4-1-1': [r`Demand P = 100 − Q gives MR = 100 − 2Q.`, r`Set MR = MC: 100 − 2Q = 20.`, r`Q = 40.`],
      'mi4-1-2': [r`Go up from Q = 40 to the demand curve.`, r`P = 100 − 40.`, r`= 60.`],
      'mi4-1-3': [r`Profit per unit = P − ATC = 60 − 20 = 40.`, r`Times 40 units.`, r`= 1600.`],
      'mi4-1-4': [r`Competitive outcome: P = MC = 20 → 100 − Q = 20 → Q = 80.`, r`DWL triangle: base 80 − 40 = 40, height 60 − 20 = 40.`, r`½ × 40 × 40 = 800.`],
      'mi4-1-5': [r`With perfect price discrimination, each extra unit sells at its own demand price: MR = demand.`, r`Output expands to where demand meets MC: Q = 80. No trades are lost, so no DWL; the firm captures all surplus.`, r`Choice B.`],
      'mi4-1-6': [r`The monopoly sets MR = MC, and MC is positive.`, r`So MR must be positive, which happens only on the elastic part of demand.`, r`Elastic (choice A).`],
    },
    teach: {
      plan: [r`Tell the only-pizzeria story and compute MR from a small price table.`, r`Draw demand and MR (twice as steep).`, r`Find Q at MR = MC and P from demand.`, r`Shade profit and deadweight loss.`, r`Contrast with perfect price discrimination and with regulation of a natural monopoly.`],
      questions: [
        { q: 'Why can’t a monopoly charge an infinite price?', a: 'Buyers would buy nothing. The monopoly is still limited by the demand curve.' },
        { q: 'Why is MR below the price?', a: 'Selling one more unit requires a lower price on all units, so the extra revenue is the new price minus the revenue lost on the earlier units.' },
        { q: 'Is price discrimination bad?', a: 'It transfers surplus to the firm, but perfect price discrimination also eliminates deadweight loss. It is efficient but not equitable.' },
      ],
      keyPoints: ['MR < P for a single-price monopoly.', 'Quantity at MR = MC; price from demand.', 'Higher price, lower quantity, deadweight loss.', 'Perfect price discrimination: efficient output, zero consumer surplus.'],
    },
  },
  'mi4-2': {
    bigIdea: [
      r`Most businesses are neither tiny price takers nor lonely monopolies. Your town’s restaurants each offer something a little different (monopolistic competition): each has a few loyal customers, so it has some pricing power, but anyone can open a new restaurant, so long-run profits disappear.`,
      r`Some industries have just a few big players: airlines, phone carriers, cereal makers (oligopoly). Each one’s best move depends on what the others do. If they agree to keep prices high, each is tempted to secretly undercut the others and grab customers.`,
      r`Game theory turns this into a table of payoffs. You find each player’s best response to every choice of the other. If a choice is best no matter what, it is a dominant strategy. Where both players are already making their best responses, nobody wants to change: a Nash equilibrium.`,
    ],
    picture: { title: 'Two gas stations at one corner', t: r`If both charge high prices, both earn good profits. But if one cuts its price, it steals the other’s customers. Fearing that, both cut prices and both earn less. Each acted sensibly, yet both ended up worse off: the prisoner’s dilemma.` },
    words: [
      { term: 'Monopolistic competition', means: 'Many firms selling differentiated products with easy entry.' },
      { term: 'Excess capacity', means: 'Producing less than the output that minimizes ATC.' },
      { term: 'Oligopoly', means: 'A market dominated by a few interdependent firms.' },
      { term: 'Dominant strategy', means: 'A strategy that is best regardless of what the other player does.' },
      { term: 'Nash equilibrium', means: 'An outcome where no player can gain by changing only their own strategy.' },
    ],
    tools: [
      { name: 'Monopoly pricing', refresher: 'Downward-sloping demand means MR < P.', lesson: 'mi4-1' },
      { name: 'Long-run entry', refresher: 'Entry drives economic profit to zero.', lesson: 'mi3-3' },
    ],
    why: [
      [r`Fix B’s choice, then compare A’s two payoffs in that column.`, r`Low wins in both columns, so it is A’s dominant strategy.`],
      [r`B faces the mirror-image payoffs, so Low is dominant for B as well.`, r`When both play Low, neither can gain by switching alone, but both would be better off at (High, High).`],
    ],
    walk: {
      'mi4-2-1': [r`If B plays High: A gets 50 (High) or 70 (Low) → Low.`, r`If B plays Low: A gets 20 (High) or 30 (Low) → Low.`, r`Low is dominant (choice B).`],
      'mi4-2-2': [r`Both firms play their dominant strategy, Low.`, r`Outcome (Low, Low).`, r`A’s payoff: 30.`],
      'mi4-2-3': [r`Keeping the deal: (High, High) gives A 50.`, r`Cheating: (Low, High) gives A 70.`, r`Gain from cheating: 20.`],
      'mi4-2-4': [r`Entry removes economic profit: P = ATC.`, r`Because demand slopes down, the tangency with ATC is to the left of ATC’s minimum.`, r`Zero profit with excess capacity (choice D).`],
      'mi4-2-5': [r`Both structures have many firms, free entry and zero long-run profit.`, r`The difference is the product: identical vs differentiated.`, r`Choice A.`],
      'mi4-2-6': [r`Y: if X plays Up, Right (6) beats Left (4); if Down, Right (5) beats Left (2). Right is dominant for Y.`, r`Knowing Y plays Right, X compares Up (2) and Down (4): Down.`, r`Nash: (Down, Right); X earns 4.`],
    },
    teach: {
      plan: [r`Compare the four market structures in a table.`, r`Show the long-run monopolistic competition graph with excess capacity.`, r`Tell the gas-station story to introduce interdependence.`, r`Find best responses in the payoff matrix by underlining.`, r`Show why collusion is unstable (the gain from cheating).`],
      questions: [
        { q: 'Why don’t monopolistically competitive firms produce at minimum ATC?', a: 'Their demand slopes down, so zero profit occurs where demand touches ATC on its falling part, to the left of the minimum.' },
        { q: 'Is a Nash equilibrium always the best outcome for the players?', a: 'No. In a prisoner’s dilemma, the Nash equilibrium leaves both worse off than if they had cooperated.' },
        { q: 'Why do cartels break down?', a: 'Each member can earn more by cheating while the others keep prices high, so the agreement is hard to enforce.' },
      ],
      keyPoints: ['Monopolistic competition: differentiated products, zero long-run profit, excess capacity.', 'Oligopoly: few interdependent firms.', 'Dominant strategy: best regardless.', 'Nash equilibrium: no one gains by changing alone.'],
    },
  },
};

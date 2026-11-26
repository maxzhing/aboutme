import type { CalcUnit } from '../calc/types';

/** AP Microeconomics, in the six units of the College Board course, with approximate exam weights. */
export const MICRO_UNITS: CalcUnit[] = [
  { n: 1, title: 'Basic Economic Concepts', weeks: 3, examWeight: '12–15%', summary: 'Scarcity and opportunity cost, the production possibilities curve, comparative advantage and trade, and marginal decision-making by consumers.',
    topics: ['Scarcity and resource allocation', 'Economic systems', 'Production possibilities curve', 'Comparative advantage and trade', 'Cost-benefit analysis', 'Marginal analysis and consumer choice (utility maximization)'] },
  { n: 2, title: 'Supply and Demand', weeks: 4, examWeight: '20–25%', summary: 'How competitive markets set prices and quantities, how sensitive buyers and sellers are to price, and what happens when governments intervene.',
    topics: ['Demand and its determinants', 'Supply and its determinants', 'Price elasticity of demand and supply', 'Other elasticities (income, cross-price)', 'Market equilibrium and surplus', 'Market disequilibrium and changes in equilibrium', 'Price controls, taxes and subsidies', 'International trade and public policy'] },
  { n: 3, title: 'Production, Cost, and the Perfect Competition Model', weeks: 5, examWeight: '22–25%', summary: 'How firms turn inputs into output, how their costs behave in the short and long run, how they choose output to maximize profit, and how perfectly competitive markets reach long-run equilibrium.',
    topics: ['The production function and diminishing returns', 'Short-run production costs', 'Long-run production costs and economies of scale', 'Types of profit', 'Profit maximization (MR = MC)', 'Firms’ short-run decisions to produce and shut down', 'Perfect competition in the short and long run'] },
  { n: 4, title: 'Imperfect Competition', weeks: 4, examWeight: '15–22%', summary: 'Monopoly, price discrimination, monopolistic competition and oligopoly, including game theory.',
    topics: ['Introduction to imperfectly competitive markets', 'Monopoly', 'Price discrimination', 'Monopolistic competition', 'Oligopoly and game theory'] },
  { n: 5, title: 'Factor Markets', weeks: 3, examWeight: '10–13%', summary: 'How firms decide how many workers and how much capital to hire, in competitive and monopsonistic markets.',
    topics: ['Introduction to factor markets', 'Changes in factor demand and supply', 'Profit-maximizing behavior in perfectly competitive factor markets', 'Cost-minimizing input combinations', 'Monopsonistic markets'] },
  { n: 6, title: 'Market Failure and the Role of Government', weeks: 3, examWeight: '8–13%', summary: 'When markets fail to reach efficient outcomes (externalities, public goods) and how government policies, taxes and transfers affect efficiency and equity.',
    topics: ['Socially efficient and inefficient market outcomes', 'Externalities', 'Public and private goods', 'The effects of government intervention in different market structures', 'Inequality'] },
];

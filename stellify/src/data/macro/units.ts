import type { CalcUnit } from '../calc/types';

/** AP Macroeconomics, in the six units of the College Board course, with approximate exam weights. */
export const MACRO_UNITS: CalcUnit[] = [
  { n: 1, title: 'Basic Economic Concepts', weeks: 2, examWeight: '5–10%', summary: 'Scarcity, opportunity cost, the production possibilities curve, comparative advantage, and the supply-and-demand model you will reuse all year.',
    topics: ['Scarcity', 'Opportunity cost and the production possibilities curve', 'Comparative advantage and gains from trade', 'Demand', 'Supply', 'Market equilibrium, disequilibrium, and changes in equilibrium'] },
  { n: 2, title: 'Economic Indicators and the Business Cycle', weeks: 3, examWeight: '12–17%', summary: 'How economists measure an economy: GDP, unemployment, inflation and price indexes, real versus nominal values, and the ups and downs of the business cycle.',
    topics: ['The circular flow and GDP', 'Limitations of GDP', 'Unemployment', 'Price indices and inflation', 'Costs of inflation', 'Real vs. nominal GDP', 'Business cycles'] },
  { n: 3, title: 'National Income and Price Determination', weeks: 5, examWeight: '17–27%', summary: 'The aggregate demand–aggregate supply model: multipliers, short-run and long-run equilibrium, shocks and self-adjustment, and fiscal policy.',
    topics: ['Aggregate demand', 'Multipliers', 'Short-run aggregate supply', 'Long-run aggregate supply', 'Equilibrium in the AD-AS model', 'Changes in the AD-AS model in the short run', 'Long-run self-adjustment', 'Fiscal policy', 'Automatic stabilizers'] },
  { n: 4, title: 'Financial Sector', weeks: 4, examWeight: '18–23%', summary: 'Financial assets and interest rates, money and banking, the money multiplier, the money market and monetary policy, and the loanable funds market.',
    topics: ['Financial assets', 'Nominal vs. real interest rates', 'Definition, measurement, and functions of money', 'Banking and the expansion of the money supply', 'The money market', 'Monetary policy', 'The loanable funds market'] },
  { n: 5, title: 'Long-Run Consequences of Stabilization Policies', weeks: 4, examWeight: '20–30%', summary: 'Combining fiscal and monetary policy, the Phillips curve, money growth and inflation, deficits, debt and crowding out, and long-run economic growth.',
    topics: ['Fiscal and monetary policy actions in the short run', 'The Phillips curve', 'Money growth and inflation', 'Government deficits and the national debt', 'Crowding out', 'Economic growth', 'Public policy and economic growth'] },
  { n: 6, title: 'Open Economy—International Trade and Finance', weeks: 3, examWeight: '10–13%', summary: 'The balance of payments, exchange rates and the foreign exchange market, and how policies and interest rates move currencies, net exports and capital flows.',
    topics: ['Balance of payments accounts', 'Exchange rates', 'The foreign exchange market', 'Effect of changes in policies and economic conditions on the foreign exchange market', 'Changes in the foreign exchange market and net exports', 'Real interest rates and international capital flows'] },
];

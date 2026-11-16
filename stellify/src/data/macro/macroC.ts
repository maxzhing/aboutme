import type { CalcLesson, CalcProblem, LessonTutor } from '../calc/types';
import { near } from '../calc/types';

const r = String.raw;
const P = (id: string, level: 1 | 2 | 3, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, hint, solution, ...extra });

const yieldPct = (coupon: number, price: number) => (coupon / price) * 100;
const BANK = r`~~~
First Bank (reserve requirement 10%)
Assets                     | Liabilities
Reserves        $30,000    | Demand deposits  $200,000
Loans          $170,000    |
~~~`;
const DEP = 200000, RES = 30000, RR = 0.1;
const LF = r`~~~
Real interest rate (%)        2     3     4     5     6
Loanable funds demanded     500   450   400   350   300
Loanable funds supplied     300   350   400   450   500
(billions of dollars)
~~~`;
const RATE = [2, 3, 4, 5, 6], LFD = [500, 450, 400, 350, 300], LFS = [300, 350, 400, 450, 500];
const eqRate = (d: number[]) => RATE[d.findIndex((v, i) => v === LFS[i])];

/** AP Macroeconomics Unit 4. Original lessons and problems. */
export const MACRO_C: CalcLesson[] = [
  {
    id: 'ma4-1', unit: 4, n: 1, title: 'Financial assets and interest rates',
    intro: 'Where do people keep their savings, and why do interest rates matter so much? Today you learn the main financial assets (money, bonds and stocks), why bond prices fall when interest rates rise, and the difference between nominal and real interest rates.',
    goals: ['Distinguish money, bonds and stocks and the tradeoff between liquidity and return', 'Explain why bond prices and interest rates move in opposite directions', 'Compute a bond’s yield', 'Compute real interest rates and explain who gains from unexpected inflation'],
    notes: [
      { k: 'list', items: [r`**Liquidity** is how easily an asset can be used to buy things. Money (cash and checking deposits) is the most liquid asset but pays little or no interest.`, r`**Stocks** are shares of ownership in a company. **Bonds** are loans to a company or government that pay interest.`, r`The opportunity cost of holding money is the interest you could have earned on bonds instead.`] },
      { k: 'rule', title: 'Bond prices and interest rates', t: r`When market interest rates rise, existing bonds that pay the old, lower interest are less attractive, so their prices fall. Bond prices and interest rates always move in opposite directions.` },
      { k: 'formula', t: r`\text{yield} = \frac{\text{annual interest payment}}{\text{price of the bond}} \times 100` },
      { k: 'formula', t: r`\text{real interest rate} = \text{nominal interest rate} - \text{inflation rate}` },
      { k: 'warn', t: r`Lenders set the nominal rate using **expected** inflation. If actual inflation turns out higher than expected, the real interest rate is lower than planned: borrowers gain and lenders lose.` },
    ],
    examples: [
      { q: r`A bond pays \$50 a year. What is its yield at a price of \$1,000, and at a price of \$800?`, steps: [r`At \$1,000: $\frac{50}{1{,}000} \times 100 = 5\%$.`, r`At \$800: $\frac{50}{800} \times 100 = 6.25\%$. A lower bond price means a higher interest rate.`], a: '5%, then 6.25%' },
      { q: r`A loan has a 7% nominal rate and the lender expects 3% inflation. Actual inflation is 5%. Find the expected and actual real rates.`, steps: [r`Expected real rate $= 7 - 3 = 4\%$.`, r`Actual real rate $= 7 - 5 = 2\%$: the lender earns less than planned and the borrower gains.`], a: '4% expected, 2% actual' },
    ],
    practice: [
      P('ma4-1-1', 1, r`A bond pays \$60 a year and sells for \$1,200. What is its yield, in percent?`, ['5'], 'Annual payment ÷ price × 100.', [r`$\frac{60}{1{,}200} \times 100 = 5\%$.`], { check: () => near(yieldPct(60, 1200), 5) }),
      P('ma4-1-2', 1, r`The nominal interest rate is 6% and inflation is 2%. What is the real interest rate, in percent?`, ['4'], 'Nominal minus inflation.', [r`$6 - 2 = 4\%$.`], { check: () => 6 - 2 === 4 }),
      P('ma4-1-3', 2, r`If interest rates in the economy rise, the prices of existing bonds`, 1, 'Would you pay full price for a bond paying less than new bonds?', [r`Older bonds pay less than new ones, so buyers will only take them at a lower price.`], { choices: ['rise', 'fall', 'stay the same', 'become more liquid'] }),
      P('ma4-1-4', 1, r`Which asset is the most liquid?`, 3, 'Which can you spend immediately?', [r`Cash can be spent directly; bonds, stocks and houses must be sold first.`], { choices: ['A government bond', 'Shares of stock', 'A house', 'Cash'] }),
      P('ma4-1-5', 2, r`A bank wants a 3% real return on a loan and expects 4% inflation. What nominal interest rate should it charge, in percent?`, ['7'], 'Real = nominal − expected inflation; solve for nominal.', [r`Nominal = real + expected inflation $= 3 + 4 = 7\%$.`], { check: () => 3 + 4 === 7 }),
      P('ma4-1-6', 3, r`Inflation turns out higher than expected after a fixed-rate loan is made. Who benefits?`, 1, 'Compare the actual real rate with the expected one.', [r`The actual real interest rate is lower than expected, so the borrower repays less in real terms.`], { choices: ['The lender, because it is repaid in more valuable dollars', 'The borrower, because the real interest rate is lower than expected', 'Neither, because the nominal rate is fixed', 'Both, because the nominal rate is fixed'] }),
    ],
    remember: ['Money is most liquid; holding it costs the interest you give up.', 'Bond prices and interest rates move in opposite directions.', 'Real rate = nominal rate − inflation.'],
    checkIn: 'Next: what money is, and how banks create it.',
  },
  {
    id: 'ma4-2', unit: 4, n: 2, title: 'Money, banking and the money multiplier',
    intro: 'Most money is not paper bills. It is numbers in bank accounts, and banks create much of it by making loans. Today you learn what money does, how it is measured, and how a fractional reserve banking system can turn one deposit into many dollars of new money.',
    goals: ['State the three functions of money', 'Distinguish M1 and M2', 'Use a bank balance sheet to find required and excess reserves', 'Compute the money multiplier and the maximum change in the money supply'],
    notes: [
      { k: 'list', items: [r`**Medium of exchange:** used to buy things.`, r`**Unit of account:** used to measure and compare prices.`, r`**Store of value:** holds purchasing power over time.`] },
      { k: 'p', t: r`**M1** is the most liquid money: currency in circulation and checkable (demand) deposits. (Since 2020 the Federal Reserve also counts savings deposits in M1.) **M2** is M1 plus near-monies such as small time deposits (CDs) and money market funds.` },
      { k: 'rule', title: 'Fractional reserve banking', t: r`Banks keep a fraction of deposits as reserves and lend out the rest. Required reserves = reserve requirement × deposits. Excess reserves = total reserves − required reserves. A single bank can lend up to its excess reserves.` },
      { k: 'formula', t: r`\text{money multiplier} = \frac{1}{\text{reserve requirement}} \qquad \text{maximum } \Delta M = \text{new excess reserves} \times \text{money multiplier}` },
      { k: 'p', t: r`On a bank’s balance sheet (T-account), assets (reserves, loans, bonds) equal liabilities (deposits) plus owners’ equity.` },
      { k: 'warn', t: r`When someone deposits cash, the money supply does not change at first: currency (in M1) just became a deposit (also in M1). Only the loans that follow create new money. Also note: the U.S. reserve requirement has been 0% since 2020, but the AP course still uses reserve ratios to show how banks create money.` },
      { k: 'p', t: r`Data used today:
${BANK}` },
    ],
    examples: [
      { q: r`Using First Bank’s balance sheet, find its required and excess reserves.`, steps: [r`Required reserves $= 0.10 \times 200{,}000 = 20{,}000$.`, r`Excess reserves $= 30{,}000 - 20{,}000 = 10{,}000$: the most First Bank can lend.`], a: 'Required \\$20,000; excess \\$10,000' },
      { q: r`If First Bank lends all its excess reserves, what is the maximum change in the money supply for the whole banking system?`, steps: [r`Money multiplier $= \frac{1}{0.10} = 10$.`, r`Maximum change $= 10{,}000 \times 10 = \$100{,}000$.`], a: '\\$100,000' },
    ],
    practice: [
      P('ma4-2-1', 1, r`Using dollars to compare the prices of a phone and a bike is an example of which function of money?`, 1, 'Comparing values means measuring them.', [r`Money as a common measure of value is its unit-of-account function.`], { choices: ['Medium of exchange', 'Unit of account', 'Store of value', 'Factor of production'] }),
      P('ma4-2-2', 1, r`The reserve requirement is 20%. What is the money multiplier?`, ['5'], '1 ÷ reserve requirement.', [r`$\frac{1}{0.20} = 5$.`], { check: () => near(1 / 0.2, 5) }),
      P('ma4-2-3', 2, r`Using First Bank’s balance sheet, what are its excess reserves, in dollars?`, ['10000'], 'Total reserves minus required reserves.', [r`$30{,}000 - 0.10 \times 200{,}000 = 10{,}000$.`], { check: () => near(RES - RR * DEP, 10000) }),
      P('ma4-2-4', 2, r`The reserve requirement is 10%. Someone deposits \$5,000 of cash in a bank. What is the maximum increase in the money supply from the new loans the banking system can make, in dollars?`, ['45000'], 'Find the new excess reserves, then use the multiplier.', [r`Required reserves on the deposit: \$500, so excess reserves rise by \$4,500.`, r`$4{,}500 \times 10 = 45{,}000$. (The deposit itself only changed cash into checking money.)`], { check: () => near(5000 * (1 - 0.1) * (1 / 0.1), 45000) }),
      P('ma4-2-5', 2, r`Which is included in M2 but not in M1?`, 2, 'M2 adds near-monies.', [r`Small time deposits (CDs) are near-monies, part of M2 only.`], { choices: ['Currency in circulation', 'Checkable deposits', 'Small time deposits (CDs)', 'Coins'] }),
      P('ma4-2-6', 3, r`The reserve requirement is 25%. A bank has \$400,000 in deposits and \$130,000 in reserves. What is the most this single bank can lend, in dollars?`, ['30000'], 'A single bank can lend its excess reserves.', [r`Required reserves $= 0.25 \times 400{,}000 = 100{,}000$.`, r`Excess reserves $= 130{,}000 - 100{,}000 = 30{,}000$.`], { check: () => near(130000 - 0.25 * 400000, 30000) }),
    ],
    remember: ['Money: medium of exchange, unit of account, store of value.', 'Excess reserves = reserves − required reserves.', 'Money multiplier = 1 ÷ reserve requirement.'],
    checkIn: 'Next: how the Federal Reserve uses all this to steer interest rates.',
  },
  {
    id: 'ma4-3', unit: 4, n: 3, title: 'The money market and monetary policy',
    intro: 'The Federal Reserve, the U.S. central bank, steers the economy by influencing interest rates. Lower rates encourage borrowing and spending; higher rates cool things down. Today you learn the money market graph and the Fed’s tools, both in the ample-reserves system the Fed uses today and in the limited-reserves system you also need to know.',
    goals: ['Explain the demand for and supply of money', 'Describe the Fed’s policy tools under limited and ample reserves', 'Choose expansionary or contractionary monetary policy for a gap', 'Trace monetary policy through interest rates, investment, AD and real GDP'],
    notes: [
      { k: 'p', t: r`In the **money market**, money demand slopes downward against the **nominal** interest rate, because the interest rate is the opportunity cost of holding money. Money demand increases when the price level or real GDP rises (people need more money for transactions). Money supply is vertical, because the Fed controls it.` },
      { k: 'list', items: [r`**Limited reserves:** the Fed uses **open-market operations** (buying bonds adds reserves and lowers interest rates; selling bonds removes reserves and raises them), the **discount rate** and the **reserve requirement**.`, r`**Ample reserves** (today’s system): reserves are plentiful, so the Fed moves the federal funds rate mainly by changing **administered rates**, especially the interest rate on reserve balances (IORB).`] },
      { k: 'rule', title: 'The transmission chain', t: r`Expansionary policy (buy bonds, lower the discount rate, lower the reserve requirement, or lower IORB) → interest rates fall → investment and interest-sensitive consumption rise → AD shifts right → real GDP and the price level rise. Contractionary policy does the reverse.` },
      { k: 'formula', t: r`\text{Fed buys bonds} \Rightarrow \text{reserves} \uparrow \Rightarrow M_s \uparrow \Rightarrow i \downarrow \Rightarrow I \uparrow \Rightarrow AD \uparrow` },
      { k: 'warn', t: r`The Fed sets monetary policy (money and interest rates). Congress and the President set fiscal policy (spending and taxes). Don’t mix the tools. And if the Fed keeps the money supply fixed, an increase in money demand raises the nominal interest rate.` },
    ],
    examples: [
      { q: r`The economy is in a recession. In the limited-reserves framework, what open-market operation should the Fed use, and how does it work?`, steps: [r`Buy government bonds (or lower the discount rate or reserve requirement).`, r`Bank reserves rise, the money supply rises, the interest rate falls, investment rises, AD shifts right and real GDP rises.`], a: 'Buy bonds' },
      { q: r`The Fed buys \$10 million of bonds from commercial banks. The reserve requirement is 20%. What is the maximum increase in the money supply?`, steps: [r`Banks’ excess reserves rise by \$10 million; the money multiplier is $\frac{1}{0.2} = 5$.`, r`Maximum increase $= 10 \times 5 = \$50$ million.`], a: '\\$50 million' },
    ],
    practice: [
      P('ma4-3-1', 1, r`To fight inflation in the limited-reserves framework, the Fed should`, 1, 'It needs to raise interest rates.', [r`Selling bonds pulls reserves out of banks, reducing the money supply and raising interest rates.`], { choices: ['buy government bonds', 'sell government bonds', 'lower the discount rate', 'lower the reserve requirement'] }),
      P('ma4-3-2', 2, r`With ample reserves, the Fed wants to lower the federal funds rate. It should`, 1, 'Banks won’t lend to each other for less than the Fed pays them.', [r`Lowering the interest rate on reserve balances makes holding reserves less attractive, pulling the federal funds rate down.`], { choices: ['raise the interest rate on reserve balances', 'lower the interest rate on reserve balances', 'raise income taxes', 'raise the reserve requirement'] }),
      P('ma4-3-3', 2, r`The Fed buys \$5 million of bonds from commercial banks. The reserve requirement is 10%. What is the maximum increase in the money supply, in millions of dollars?`, ['50'], 'New excess reserves × money multiplier.', [r`Excess reserves rise by \$5 million; the multiplier is 10.`, r`$5 \times 10 = 50$.`], { check: () => near(5 * (1 / 0.1), 50) }),
      P('ma4-3-4', 2, r`Other things equal, an increase in the money supply causes the nominal interest rate to ___ and investment to ___.`, 2, 'Slide down the money demand curve, then think about borrowing.', [r`More money lowers the interest rate; cheaper borrowing raises investment.`], { choices: ['rise; rise', 'rise; fall', 'fall; rise', 'fall; fall'] }),
      P('ma4-3-5', 2, r`The money supply stays the same while real GDP and the price level rise. What happens in the money market?`, 0, 'Which curve shifts?', [r`People need more money for transactions, so money demand increases and the nominal interest rate rises.`], { choices: ['The nominal interest rate rises', 'The nominal interest rate falls', 'The money supply curve shifts right', 'The nominal interest rate does not change'] }),
      P('ma4-3-6', 3, r`The Fed sells \$8 million of bonds to commercial banks. The reserve requirement is 20%. What is the maximum change in the money supply, in millions of dollars? (Use a negative number for a decrease.)`, ['-40'], 'Selling bonds removes reserves.', [r`Reserves fall by \$8 million; the multiplier is 5.`, r`$-8 \times 5 = -40$.`], { check: () => near(-8 * (1 / 0.2), -40) }),
    ],
    remember: ['Money demand slopes down against the nominal interest rate; the Fed sets money supply.', 'Buy bonds / lower rates = expansionary; sell bonds / raise rates = contractionary.', 'Lower rates → more investment → AD right.'],
    checkIn: 'Next: the loanable funds market and the real interest rate.',
  },
  {
    id: 'ma4-4', unit: 4, n: 4, title: 'The loanable funds market',
    intro: 'Savers supply funds; borrowers demand them. The price that balances them is the real interest rate. The money market shows short-run nominal rates; the loanable funds market shows how saving, borrowing and government deficits set the real interest rate. It is the key to crowding out in Unit 5.',
    goals: ['Identify the suppliers and demanders of loanable funds', 'Find the equilibrium real interest rate', 'Predict how changes in saving, investment demand and government borrowing shift the market', 'Explain how government borrowing affects private investment'],
    notes: [
      { k: 'p', t: r`The **supply** of loanable funds comes from saving: households, businesses, government budget surpluses and foreign savers. The **demand** comes from borrowing: firms that invest, households that buy homes, and governments that run deficits.` },
      { k: 'list', items: [r`More private saving → supply increases → real interest rate falls.`, r`Government deficit → demand increases (the government borrows) → real interest rate rises.`, r`Business optimism → demand increases → real interest rate rises.`, r`Inflow of foreign savings → supply increases → real interest rate falls.`] },
      { k: 'formula', t: r`\text{public saving} = T - G \qquad (\text{negative when the government runs a deficit})` },
      { k: 'warn', t: r`The loanable funds graph uses the **real** interest rate; the money market uses the **nominal** rate. AP courses usually show a deficit as an increase in the demand for loanable funds; showing it as a decrease in supply (less public saving) also raises the real interest rate.` },
      { k: 'p', t: r`Data used today:
${LF}` },
    ],
    examples: [
      { q: r`Using the table, find the equilibrium real interest rate and quantity.`, steps: [r`Demand equals supply at 4%, where both are 400.`, r`Equilibrium: real interest rate 4%, \$400 billion of loans.`], a: '4% and \\$400 billion' },
      { q: r`The government borrows an extra \$100 billion at every interest rate. What happens?`, steps: [r`New demand: 600, 550, 500, 450, 400.`, r`It equals supply at 5% (both 450): the real interest rate rises to 5%. Of the 450, the government takes 100, so private borrowing falls from 400 to 350.`], a: 'Real rate rises to 5%' },
    ],
    practice: [
      P('ma4-4-1', 1, r`Using the table, what is the equilibrium real interest rate, in percent?`, ['4'], 'Where demand equals supply.', [r`At 4%, both are 400.`], { check: () => eqRate(LFD) === 4 }),
      P('ma4-4-2', 2, r`The government borrows an extra \$100 billion at every interest rate. What is the new equilibrium real interest rate, in percent?`, ['5'], 'Add 100 to each demand number.', [r`New demand: 600, 550, 500, 450, 400. At 5%, demand = supply = 450.`], { check: () => eqRate(LFD.map((d) => d + 100)) === 5 }),
      P('ma4-4-3', 3, r`In the previous question, by how much does private borrowing for investment fall, in billions of dollars?`, ['50'], 'Total borrowing at the new rate minus what the government takes.', [r`At 5%, total borrowing is 450, of which the government takes 100: private borrowing is 350.`, r`It was 400, so it fell by 50: crowding out.`], { check: () => { const i = RATE.indexOf(eqRate(LFD.map((d) => d + 100))); return 400 - LFD[i] === 50; } }),
      P('ma4-4-4', 1, r`Households decide to save more. In the loanable funds market,`, 0, 'Savers are on the supply side.', [r`More saving increases the supply of loanable funds, lowering the real interest rate.`], { choices: ['supply increases and the real interest rate falls', 'demand increases and the real interest rate rises', 'supply decreases and the real interest rate rises', 'demand decreases and the real interest rate falls'] }),
      P('ma4-4-5', 2, r`Firms become more optimistic about future profits. In the loanable funds market,`, 0, 'Optimistic firms want to invest.', [r`More planned investment increases the demand for loanable funds, raising the real interest rate.`], { choices: ['demand increases and the real interest rate rises', 'supply increases and the real interest rate falls', 'demand decreases and the real interest rate falls', 'supply decreases and the real interest rate rises'] }),
      P('ma4-4-6', 2, r`Tax revenue is \$300 billion and government purchases are \$380 billion. What is public saving, in billions of dollars?`, ['-80'], 'T − G.', [r`$300 - 380 = -80$: a deficit, which adds to the demand for loanable funds.`], { check: () => 300 - 380 === -80 }),
    ],
    remember: ['Savers supply loanable funds; borrowers demand them.', 'Deficits raise the real interest rate.', 'Loanable funds: real rate; money market: nominal rate.'],
    checkIn: 'Unit 4 done. Next unit: long-run consequences of policy, from the Phillips curve to growth.',
  },
];

/** Tutor layer for Unit 4. */
export const MACRO_C_TUTOR: Record<string, LessonTutor> = {
  'ma4-1': {
    bigIdea: [
      r`You can keep savings in different forms. Cash is easy to spend right away but earns nothing. A bond is a loan you make to a company or government that pays you interest. A stock is a small piece of ownership in a company. The easier an asset is to spend, the less it usually pays.`,
      r`Here is the key surprise about bonds: when new bonds start paying higher interest, your old bond paying less becomes less attractive, so its price falls. Bond prices and interest rates always move in opposite directions, like a seesaw.`,
      r`Interest rates have a “real” version too. If a bank charges 7% but prices rise 5%, the bank only gains 2% in buying power. That real interest rate is what really matters to borrowers and lenders.`,
    ],
    picture: { title: 'Your old trading card', t: r`You own a card that pays \$5 a year. Then new cards come out paying \$8. Nobody will pay full price for your \$5 card anymore; you would have to sell it cheaper. That’s exactly what happens to old bonds when interest rates rise.` },
    words: [
      { term: 'Liquidity', means: 'How easily an asset can be used to buy things.' },
      { term: 'Bond', means: 'A loan to a company or government that pays interest.' },
      { term: 'Stock', means: 'A share of ownership in a company.' },
      { term: 'Yield', means: 'Annual interest payment ÷ bond price, as a percent.' },
      { term: 'Real interest rate', means: 'Nominal interest rate minus inflation.' },
    ],
    tools: [
      { name: 'Percentages', refresher: 'Part ÷ whole × 100.', lesson: 'c0-1' },
      { name: 'Inflation', refresher: 'Unexpected inflation helps borrowers.', lesson: 'ma2-3' },
    ],
    why: [
      [r`Yield compares the fixed payment with what you pay for the bond.`, r`A lower price for the same \$50 means a higher percent return: the seesaw.`],
      [r`Real return is what is left after inflation eats into the nominal return.`, r`Higher-than-expected inflation shrinks that real return, which hurts the lender.`],
    ],
    walk: {
      'ma4-1-1': [r`Yield = annual payment ÷ price × 100.`, r`60 ÷ 1,200 = 0.05.`, r`× 100 = 5%.`],
      'ma4-1-2': [r`Real = nominal − inflation.`, r`6 − 2.`, r`= 4%.`],
      'ma4-1-3': [r`New bonds now pay more than old ones.`, r`Buyers will only buy the old bonds at a discount.`, r`Bond prices fall (choice B).`],
      'ma4-1-4': [r`Liquidity means how quickly you can spend it.`, r`Bonds, stocks and houses must be sold first.`, r`Cash (choice D).`],
      'ma4-1-5': [r`Real = nominal − expected inflation, so nominal = real + expected inflation.`, r`3 + 4.`, r`= 7%.`],
      'ma4-1-6': [r`The nominal rate was set using lower expected inflation.`, r`Higher actual inflation makes the real rate lower than planned.`, r`The borrower gains (choice B).`],
    },
    teach: {
      plan: [r`Compare cash, bonds and stocks on liquidity and return.`, r`Tell the trading-card story for bond prices.`, r`Compute a yield at two prices.`, r`Compute real interest rates from nominal rates and inflation.`, r`Explain who wins when inflation is higher than expected.`],
      questions: [
        { q: 'Why does anyone hold money if it pays no interest?', a: 'Because it is liquid: you can use it right away to buy things.' },
        { q: 'If bond prices are rising, what is happening to interest rates?', a: 'They are falling.' },
        { q: 'Who is hurt when inflation is lower than expected?', a: 'Borrowers, because the real interest rate they pay is higher than they planned.' },
      ],
      keyPoints: ['Liquidity vs return tradeoff.', 'Bond prices and interest rates move oppositely.', 'Real rate = nominal − inflation.'],
    },
  },
  'ma4-2': {
    bigIdea: [
      r`Money is anything people accept to buy things, measure prices and save value. Most of it today is not cash but balances in bank accounts.`,
      r`Banks don’t keep all your deposit in a vault. They keep a fraction as reserves and lend the rest. The borrower spends the loan, and the seller deposits it in another bank, which keeps a fraction and lends the rest again. Every loan creates new deposits, which are new money.`,
      r`If banks must keep 10% in reserve, \$1 of new reserves can support up to \$10 of deposits. That is the money multiplier: 1 ÷ reserve requirement. The real-world number is smaller because people hold some cash and banks keep extra reserves.`,
    ],
    picture: { title: 'Passing a ball around a circle', t: r`Imagine \$100 deposited. The bank keeps \$10 and lends \$90. That \$90 lands in another bank, which keeps \$9 and lends \$81, and so on. Add up all the deposits: \$100 + \$90 + \$81 + … = \$1,000.` },
    words: [
      { term: 'Medium of exchange', means: 'Money used to pay for things.' },
      { term: 'Unit of account', means: 'Money used to measure and compare value.' },
      { term: 'Store of value', means: 'Money used to keep purchasing power for later.' },
      { term: 'Required reserves', means: 'Reserve requirement × deposits.' },
      { term: 'Excess reserves', means: 'Reserves above the required amount, which a bank can lend.' },
      { term: 'Money multiplier', means: '1 ÷ reserve requirement.' },
    ],
    tools: [
      { name: 'Percent of a number', refresher: '10% of 200,000 = 0.10 × 200,000 = 20,000.', lesson: 'c0-1' },
      { name: 'The spending multiplier', refresher: 'Same idea: repeated rounds that shrink by a fixed fraction.', lesson: 'ma3-1' },
    ],
    why: [
      [r`The bank must hold 10% of what depositors could withdraw.`, r`Anything above that is free to lend.`],
      [r`Each loan is redeposited and partly lent again.`, r`The rounds add up to the excess reserves times 1 ÷ reserve requirement.`],
    ],
    walk: {
      'ma4-2-1': [r`Comparing a phone’s and a bike’s value means measuring value.`, r`That is the unit-of-account function.`, r`Choice B.`],
      'ma4-2-2': [r`Money multiplier = 1 ÷ reserve requirement.`, r`1 ÷ 0.20.`, r`= 5.`],
      'ma4-2-3': [r`Required: 0.10 × 200,000 = 20,000.`, r`Total reserves: 30,000.`, r`Excess: 30,000 − 20,000 = 10,000.`],
      'ma4-2-4': [r`The bank must keep 10% of \$5,000: \$500.`, r`Excess reserves: \$4,500, multiplied by 10.`, r`Maximum new money: \$45,000.`],
      'ma4-2-5': [r`M1: currency, coins and checkable deposits.`, r`M2 adds near-monies like CDs.`, r`Small time deposits (choice C).`],
      'ma4-2-6': [r`Required reserves: 0.25 × 400,000 = 100,000.`, r`Excess: 130,000 − 100,000 = 30,000.`, r`One bank can lend \$30,000.`],
    },
    teach: {
      plan: [r`List the three functions of money with examples.`, r`Distinguish M1 and M2.`, r`Fill in a T-account and find required and excess reserves.`, r`Pass the deposit around the circle to show money creation.`, r`Compute the money multiplier and the maximum change in money supply.`],
      questions: [
        { q: 'Does depositing cash change the money supply right away?', a: 'No. Cash and deposits are both in M1; the money supply grows only when banks lend the excess reserves.' },
        { q: 'Why is the real-world multiplier smaller than 1 ÷ reserve requirement?', a: 'People hold some cash and banks keep extra reserves, so less is relent each round.' },
        { q: 'How much can one bank lend versus the whole banking system?', a: 'One bank: its excess reserves. The system: excess reserves × money multiplier.' },
      ],
      keyPoints: ['Three functions of money.', 'Excess reserves = reserves − required reserves.', 'Money multiplier = 1/reserve requirement.', 'Loans create new money.'],
    },
  },
  'ma4-3': {
    bigIdea: [
      r`The Federal Reserve is the country’s central bank. Its main job is keeping prices stable and employment high, and its main lever is interest rates.`,
      r`When the Fed lowers interest rates, borrowing gets cheaper. Businesses build more, families buy more cars and houses, and aggregate demand rises. When it raises rates, borrowing slows and the economy cools, which fights inflation.`,
      r`How does the Fed move rates? In the older “limited reserves” world, it bought and sold bonds to change how much money banks had. Today banks have lots of reserves, so the Fed mainly changes the interest it pays banks on their reserves; banks won’t lend to anyone for less than that, so other rates follow.`,
    ],
    picture: { title: 'The gas pedal and the brake', t: r`Monetary policy is like driving. Lowering rates is the gas pedal: spending speeds up. Raising rates is the brake: spending slows. The Fed taps one or the other to keep the economy near the speed limit, full employment with stable prices.` },
    words: [
      { term: 'Federal Reserve (the Fed)', means: 'The U.S. central bank, which conducts monetary policy.' },
      { term: 'Open-market operations', means: 'The Fed buying or selling government bonds.' },
      { term: 'Discount rate', means: 'The interest rate the Fed charges banks for loans.' },
      { term: 'Federal funds rate', means: 'The rate banks charge each other for overnight loans of reserves.' },
      { term: 'Interest on reserve balances (IORB)', means: 'The rate the Fed pays banks on reserves; its main tool with ample reserves.' },
    ],
    tools: [
      { name: 'The money multiplier', refresher: 'Maximum ΔM = new excess reserves × 1/rr.', lesson: 'ma4-2' },
      { name: 'Bond prices and interest rates', refresher: 'They move in opposite directions.', lesson: 'ma4-1' },
    ],
    why: [
      [r`Buying bonds pays banks with new reserves.`, r`More reserves mean more lending, lower rates, more investment and higher AD.`],
      [r`Buying from banks adds to their excess reserves directly.`, r`Those reserves can be multiplied through the banking system.`],
    ],
    walk: {
      'ma4-3-1': [r`To fight inflation, AD must fall, so interest rates must rise.`, r`Selling bonds drains reserves from banks.`, r`Choice B.`],
      'ma4-3-2': [r`With ample reserves, the Fed steers rates with what it pays on reserves.`, r`A lower IORB pulls the federal funds rate down.`, r`Choice B.`],
      'ma4-3-3': [r`Excess reserves rise by \$5 million.`, r`Money multiplier: 1 ÷ 0.10 = 10.`, r`5 × 10 = \$50 million.`],
      'ma4-3-4': [r`More money supply moves down the money demand curve: the interest rate falls.`, r`Cheaper borrowing encourages investment.`, r`Fall; rise (choice C).`],
      'ma4-3-5': [r`More income and higher prices mean people need more money for transactions.`, r`Money demand shifts right while supply stays put.`, r`The nominal interest rate rises (choice A).`],
      'ma4-3-6': [r`Selling bonds removes \$8 million of reserves.`, r`Money multiplier: 1 ÷ 0.20 = 5.`, r`−8 × 5 = −\$40 million.`],
    },
    teach: {
      plan: [r`Draw the money market with downward money demand and vertical money supply.`, r`List the Fed’s tools under limited reserves and under ample reserves.`, r`Trace the chain from buying bonds to higher real GDP.`, r`Match each output gap with the right policy.`, r`Compute the money-supply effect of an open-market operation.`],
      questions: [
        { q: 'Why does money demand slope downward?', a: 'The interest rate is the opportunity cost of holding money; when it is lower, people hold more money.' },
        { q: 'What is the Fed’s main tool with ample reserves?', a: 'Administered rates, especially the interest rate on reserve balances.' },
        { q: 'Is cutting taxes monetary policy?', a: 'No. Taxes and government spending are fiscal policy.' },
      ],
      keyPoints: ['Money market: nominal interest rate.', 'Buy bonds / lower rates = expansionary.', 'Lower rates → investment ↑ → AD ↑.', 'Ample reserves: IORB is the main tool.'],
    },
  },
  'ma4-4': {
    bigIdea: [
      r`Every dollar saved can be lent to someone who wants to borrow, like a company building a factory or a family buying a home. The loanable funds market brings savers and borrowers together, and the real interest rate is the price that balances them.`,
      r`If people save more, there are more funds to lend, so the real interest rate falls. If businesses want to invest more, or the government borrows to pay for a deficit, there is more demand for funds, so the real interest rate rises.`,
      r`When the government borrows a lot, it competes with businesses for the same savings. Higher interest rates make some business projects too expensive. That is crowding out: government borrowing pushes out private investment.`,
    ],
    picture: { title: 'The class lending jar', t: r`Students who save put money in a jar; students who want to borrow take it out and pay interest. If the student council suddenly borrows a lot, the jar gets tight and lenders can charge more, so some students give up their own borrowing plans.` },
    words: [
      { term: 'Loanable funds', means: 'Savings available for borrowers.' },
      { term: 'Real interest rate', means: 'The price of borrowing, adjusted for inflation.' },
      { term: 'Public saving', means: 'Tax revenue minus government spending (T − G).' },
      { term: 'Crowding out', means: 'Government borrowing raises interest rates and reduces private investment.' },
    ],
    tools: [
      { name: 'Supply and demand', refresher: 'Shift a curve, find the new crossing.', lesson: 'ma1-2' },
      { name: 'Real vs nominal rates', refresher: 'Real = nominal − inflation.', lesson: 'ma4-1' },
    ],
    why: [
      [r`The market clears where savers offer exactly what borrowers want.`, r`That rate, 4%, is the equilibrium real interest rate.`],
      [r`Government borrowing adds to demand at every rate.`, r`The higher rate pushes some private borrowers out: private investment falls from 400 to 350.`],
    ],
    walk: {
      'ma4-4-1': [r`Look for matching demand and supply.`, r`At 4%, both are 400.`, r`4%.`],
      'ma4-4-2': [r`Add 100 to each demand: 600, 550, 500, 450, 400.`, r`Compare with supply: at 5% both are 450.`, r`5%.`],
      'ma4-4-3': [r`At 5%, total borrowing is 450 and the government takes 100.`, r`Private borrowing: 350, down from 400.`, r`Crowded out: 50.`],
      'ma4-4-4': [r`Savers supply loanable funds.`, r`More saving shifts supply right.`, r`The real interest rate falls (choice A).`],
      'ma4-4-5': [r`Optimistic firms plan more investment.`, r`They borrow more: demand shifts right.`, r`The real interest rate rises (choice A).`],
      'ma4-4-6': [r`Public saving = T − G.`, r`300 − 380.`, r`= −80, a deficit.`],
    },
    teach: {
      plan: [r`Use the lending-jar story to identify suppliers and demanders.`, r`Find equilibrium in the table.`, r`Shift supply for more saving and demand for more investment.`, r`Add government borrowing and show crowding out with numbers.`, r`Compare this graph with the money market.`],
      questions: [
        { q: 'Which interest rate is on the loanable funds graph?', a: 'The real interest rate.' },
        { q: 'How does a government deficit affect private investment?', a: 'It raises the real interest rate, which reduces private investment: crowding out.' },
        { q: 'What shifts the supply of loanable funds right?', a: 'More saving, by households, businesses, a government surplus, or foreign savers.' },
      ],
      keyPoints: ['Saving supplies funds; borrowing demands them.', 'Deficits raise the real interest rate.', 'Crowding out reduces private investment.'],
    },
  },
};

import type { CalcLesson, CalcProblem, LessonTutor } from '../calc/types';
import { molarMass as M, near } from './lib';

const r = String.raw;
const P = (id: string, level: 1 | 2 | 3, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, hint, solution, ...extra });

const RATES = r`~~~
Trial   [A] (M)   [B] (M)   Initial rate (M/s)
  1      0.10      0.10        2.0 × 10⁻³
  2      0.20      0.10        8.0 × 10⁻³
  3      0.10      0.20        4.0 × 10⁻³
~~~`;

/** AP Chemistry Units 5–6. Original lessons and problems. */
export const CHEM_C: CalcLesson[] = [
  {
    id: 'ch5-1', unit: 5, n: 1, title: 'Rate laws, integrated rate laws and half-life',
    intro: 'Some reactions are over in microseconds; iron rusts for years. Kinetics measures how fast and finds what controls the speed. Today you determine rate laws from experimental data, use integrated rate laws to predict concentrations over time, and work with half-life, which for first-order reactions never changes.',
    goals: ['Determine reaction orders and the rate constant from initial-rate data', 'Use first-, second- and zero-order integrated rate laws', 'Identify the order from which plot is linear', 'Calculate and interpret half-life'],
    notes: [
      { k: 'formula', t: r`\text{rate} = k[A]^m[B]^n` },
      { k: 'rule', title: 'Method of initial rates', t: r`Compare two trials in which only one concentration changes. If doubling [A] multiplies the rate by $2^m$, the order in A is $m$: ×2 → first order, ×4 → second order, no change → zero order. Orders come from **data**, never from the coefficients of the overall equation.` },
      { k: 'list', items: [r`Zero order: $[A] = [A]_0 - kt$; plot of [A] vs t is linear.`, r`First order: $\ln[A] = \ln[A]_0 - kt$; plot of ln[A] vs t is linear; $t_{1/2} = \frac{0.693}{k}$, constant.`, r`Second order: $\frac{1}{[A]} = \frac{1}{[A]_0} + kt$; plot of 1/[A] vs t is linear.`] },
      { k: 'p', t: r`Units of k reveal the overall order: $\text{s}^{-1}$ for first order, $\text{M}^{-1}\text{s}^{-1}$ for second order, $\text{M}\,\text{s}^{-1}$ for zero order. Radioactive decay is first order, which is why half-lives are constant.` },
      { k: 'warn', t: r`After $n$ half-lives, the fraction remaining is $\left(\frac{1}{2}\right)^n$, not $1 - \frac{n}{2}$. Three half-lives leave $\frac{1}{8}$, not none.` },
    ],
    examples: [
      { q: r`Using the data below, find the order in A and in B.

${RATES}`, steps: [r`Trials 1 → 2: [A] doubles, B fixed, rate ×4: second order in A.`, r`Trials 1 → 3: [B] doubles, A fixed, rate ×2: first order in B. Rate $= k[A]^2[B]$.`], a: r`rate $= k[A]^2[B]$` },
      { q: r`A first-order reaction has $k = 0.0231\ \text{min}^{-1}$. Find its half-life.`, steps: [r`$t_{1/2} = \frac{0.693}{k}$.`, r`$\frac{0.693}{0.0231} = 30.0$ min.`], a: '30.0 min' },
    ],
    practice: [
      P('ch5-1-1', 2, r`Using the initial-rate data, what is the overall order of the reaction?

${RATES}`, ['3'], 'Find each order separately, then add.', [r`Second order in A (rate ×4 when [A] doubles) plus first order in B (×2 when [B] doubles): overall order 3.`], { check: () => Math.log2(8 / 2) + Math.log2(4 / 2) === 3 }),
      P('ch5-1-2', 2, r`Using the same data, what is the value of the rate constant k, in $\text{M}^{-2}\text{s}^{-1}$?`, ['2.0', '2'], 'Substitute any trial into rate = k[A]²[B].', [r`Trial 1: $2.0\times 10^{-3} = k(0.10)^2(0.10)$, so $k = \frac{2.0\times 10^{-3}}{1.0\times 10^{-3}} = 2.0$.`], { check: () => near(2e-3 / (0.1 ** 2 * 0.1), 2) }),
      P('ch5-1-3', 1, r`A first-order reaction has rate constant $0.0231\ \text{min}^{-1}$. What is its half-life, in minutes?`, ['30.0', '30'], 't₁/₂ = 0.693/k.', [r`$\frac{0.693}{0.0231} = 30.0$ min.`], { check: () => near(Math.LN2 / 0.0231, 30.0, 2e-3) }),
      P('ch5-1-4', 2, r`What fraction of a first-order reactant remains after three half-lives?`, ['0.125', '1/8'], 'Halve it three times.', [r`$\left(\frac{1}{2}\right)^3 = \frac{1}{8} = 0.125$.`], { check: () => 0.5 ** 3 === 0.125 }),
      P('ch5-1-5', 3, r`For a first-order reaction with $k = 0.0500\ \text{s}^{-1}$ and $[A]_0 = 0.800$ M, what is [A] after 20.0 s, in M? (Three significant figures.)`, ['0.294'], '[A] = [A]₀e^(−kt).', [r`$kt = 0.0500 \times 20.0 = 1.00$, so $[A] = 0.800\,e^{-1.00} = 0.294$ M.`], { check: () => near(0.8 * Math.exp(-1), 0.2943, 2e-3) }),
      P('ch5-1-6', 2, r`For a reaction that is second order in its single reactant A, which plot gives a straight line?`, 2, 'Match the integrated rate law to the plot.', [r`$\frac{1}{[A]} = \frac{1}{[A]_0} + kt$ is linear in t, so a plot of $\frac{1}{[A]}$ versus time is a straight line with slope k.`], { choices: ['[A] versus time', 'ln[A] versus time', '1/[A] versus time', 'ln[A] versus 1/time'] }),
    ],
    remember: ['Orders come from data, not coefficients.', 'Doubling a concentration: ×2 → first, ×4 → second.', 'First order: ln[A] linear, t₁/₂ = 0.693/k.', 'Second order: 1/[A] linear.'],
    checkIn: 'You are ready when you can read orders off a rate table and pick the linear plot without hesitation. Next: why the rate law has the form it does.',
  },
  {
    id: 'ch5-2', unit: 5, n: 2, title: 'Mechanisms, energy profiles and catalysts',
    intro: 'An overall equation hides the real path: a series of simple collisions called elementary steps. The slowest step sets the pace, the way the narrowest point of a road sets traffic speed. Today you derive rate laws from mechanisms, read reaction energy profiles, and explain how catalysts and temperature change rates.',
    goals: ['Identify elementary steps, intermediates and catalysts in a mechanism', 'Derive a rate law from a slow step, including after a fast equilibrium', 'Read activation energy and ΔH from an energy profile', 'Explain rate changes with the collision model and catalysis'],
    notes: [
      { k: 'p', t: r`An **elementary step** is a single collision, so its rate law follows directly from its coefficients: $\text{A} + \text{B} \rightarrow$ products has rate $= k[\text{A}][\text{B}]$. Only for elementary steps may you read orders from coefficients.` },
      { k: 'rule', title: 'Rate-determining step', t: r`The overall rate law equals the rate law of the slowest step. If the slow step contains an intermediate, replace it using a preceding fast equilibrium.` },
      { k: 'list', items: [r`An **intermediate** is produced in one step and consumed in a later one.`, r`A **catalyst** is consumed in an early step and regenerated later; it provides a new pathway with lower activation energy and is not used up.`] },
      { k: 'p', t: r`On an energy profile, the **activation energy** is the climb from reactants to the transition state (peak). $\Delta H$ is products minus reactants. For the reverse reaction, $E_{a,\text{rev}} = E_{a,\text{fwd}} - \Delta H$.` },
      { k: 'tip', t: r`Raising temperature increases the fraction of collisions with enough energy to exceed $E_a$ (and the collision frequency), so the rate rises. A catalyst lowers $E_a$ but does not change $\Delta H$ or the equilibrium constant.` },
    ],
    examples: [
      { q: r`Mechanism: step 1 $\text{NO}_2 + \text{NO}_2 \rightarrow \text{NO}_3 + \text{NO}$ (slow); step 2 $\text{NO}_3 + \text{CO} \rightarrow \text{NO}_2 + \text{CO}_2$ (fast). Find the rate law.`, steps: [r`The slow step sets the rate: rate $= k[\text{NO}_2]^2$.`, r`$\text{NO}_3$ is an intermediate; CO does not appear in the rate law because it reacts after the slow step.`], a: r`rate $= k[\text{NO}_2]^2$` },
      { q: r`A reaction has $E_a = 120$ kJ/mol and $\Delta H = -40$ kJ/mol. Find the reverse activation energy.`, steps: [r`$E_{a,\text{rev}} = E_{a,\text{fwd}} - \Delta H$.`, r`$120 - (-40) = 160$ kJ/mol.`], a: '160 kJ/mol' },
    ],
    practice: [
      P('ch5-2-1', 2, r`Step 1: $\text{NO}_2 + \text{NO}_2 \rightarrow \text{NO}_3 + \text{NO}$ (slow). Step 2: $\text{NO}_3 + \text{CO} \rightarrow \text{NO}_2 + \text{CO}_2$ (fast). Which rate law is consistent with this mechanism?`, 0, 'The slow step decides.', [r`Rate $= k[\text{NO}_2]^2$ from the slow first step; CO enters only after it.`], { choices: [r`rate $= k[\text{NO}_2]^2$`, r`rate $= k[\text{NO}_2][\text{CO}]$`, r`rate $= k[\text{NO}_3][\text{CO}]$`, r`rate $= k[\text{CO}]$`] }),
      P('ch5-2-2', 1, r`In the mechanism above, which species is an intermediate?`, 2, 'Made in one step, used in a later one.', [r`$\text{NO}_3$ forms in step 1 and is consumed in step 2.`], { choices: [r`$\text{NO}_2$`, r`$\text{CO}$`, r`$\text{NO}_3$`, r`$\text{CO}_2$`] }),
      P('ch5-2-3', 2, r`A reaction has a forward activation energy of 120 kJ/mol and $\Delta H = -40$ kJ/mol. What is the activation energy of the reverse reaction, in kJ/mol?`, ['160'], 'E_a,rev = E_a,fwd − ΔH.', [r`$120 - (-40) = 160$ kJ/mol.`], { check: () => 120 - -40 === 160 }),
      P('ch5-2-4', 3, r`Mechanism: $2\text{NO} \rightleftharpoons \text{N}_2\text{O}_2$ (fast equilibrium), then $\text{N}_2\text{O}_2 + \text{O}_2 \rightarrow 2\text{NO}_2$ (slow). Which rate law follows?`, 3, 'Replace the intermediate using the fast equilibrium.', [r`Slow step: rate $= k_2[\text{N}_2\text{O}_2][\text{O}_2]$. From the equilibrium, $[\text{N}_2\text{O}_2] = K[\text{NO}]^2$. So rate $= k[\text{NO}]^2[\text{O}_2]$.`], { choices: [r`rate $= k[\text{N}_2\text{O}_2][\text{O}_2]$`, r`rate $= k[\text{NO}][\text{O}_2]$`, r`rate $= k[\text{NO}]^2$`, r`rate $= k[\text{NO}]^2[\text{O}_2]$`] }),
      P('ch5-2-5', 2, r`Which statement about a catalyst is correct?`, 1, 'What does a catalyst change, and what does it not?', [r`A catalyst offers a lower-energy pathway and is regenerated; it does not change ΔH, the equilibrium constant or the position of equilibrium.`], { choices: ['It increases the equilibrium constant of the reaction', 'It lowers the activation energy and is regenerated by the end of the mechanism', 'It makes the reaction more exothermic', 'It is consumed completely in the first step'] }),
      P('ch5-2-6', 3, r`Raising the temperature of a reaction by 10 °C doubles its rate. Which is the best explanation according to the collision model?`, 0, 'Think about the energy distribution of collisions.', [r`A higher temperature shifts the distribution of molecular energies so a much larger fraction of collisions have energy at least equal to $E_a$; the increase in collision frequency alone is far too small to double the rate.`], { choices: ['A substantially larger fraction of collisions have enough energy to overcome the activation energy', 'The activation energy decreases as the temperature rises', 'The reaction becomes more exothermic at higher temperature', 'Molecules collide with more favorable orientations at higher temperature'] }),
    ],
    remember: ['Elementary steps: rate law from coefficients.', 'The slow step sets the overall rate law.', 'Intermediates are made then used; catalysts are used then remade.', 'E_a,rev = E_a,fwd − ΔH.'],
    checkIn: 'You are ready when you can derive a rate law from any two-step mechanism. Next: the energy that reactions give off or take in.',
  },
  {
    id: 'ch6-1', unit: 6, n: 1, title: 'Heat, calorimetry and phase changes',
    intro: 'Every reaction moves energy, and calorimetry is how we measure it: let the energy flow into water and watch the thermometer. Today you use q = mcΔT, solve thermal-equilibrium problems, calculate enthalpies of reaction from calorimetry, and handle the energy of phase changes, where temperature does not change at all.',
    goals: ['Use q = mcΔT with correct signs', 'Solve heat-transfer problems where two objects reach the same final temperature', 'Find ΔH of reaction from coffee-cup calorimetry data', 'Calculate the energy of phase changes and interpret heating curves'],
    notes: [
      { k: 'formula', t: r`q = mc\Delta T` },
      { k: 'rule', title: 'Signs', t: r`$q > 0$: the system absorbs heat (endothermic). $q < 0$: it releases heat (exothermic). In a calorimeter, $q_{\text{reaction}} = -q_{\text{solution}}$: if the water warms up, the reaction released heat and $\Delta H$ is negative.` },
      { k: 'p', t: r`When a hot object is placed in cool water, heat flows until both reach the same temperature: heat lost by the object = heat gained by the water, $m_1c_1(T_1 - T_f) = m_2c_2(T_f - T_2)$.` },
      { k: 'p', t: r`During a phase change, energy goes into overcoming intermolecular forces, not into raising temperature, so a **heating curve** has flat plateaus at the melting and boiling points. $q = n\Delta H_{\text{fus}}$ or $q = n\Delta H_{\text{vap}}$.` },
      { k: 'warn', t: r`$\Delta H$ for a reaction is per mole of the reaction as written. After finding q in joules, divide by the moles that reacted and convert to kJ, then attach the sign.` },
    ],
    examples: [
      { q: r`How much heat is needed to warm 50.0 g of water from 20.0 °C to 45.0 °C? ($c = 4.18$ J/(g·°C))`, steps: [r`$\Delta T = 25.0$ °C.`, r`$q = 50.0 \times 4.18 \times 25.0 = 5225$ J $\approx 5.23$ kJ.`], a: '5.23 kJ' },
      { q: r`How much energy melts 36.0 g of ice at 0 °C? ($\Delta H_{\text{fus}} = 6.01$ kJ/mol)`, steps: [r`$\frac{36.0}{18.02} = 2.00$ mol.`, r`$2.00 \times 6.01 = 12.0$ kJ.`], a: '12.0 kJ' },
    ],
    practice: [
      P('ch6-1-1', 1, r`How much heat, in joules, is needed to warm 50.0 g of water from 20.0 °C to 45.0 °C? ($c = 4.18$ J/(g·°C))`, ['5225', '5230'], 'q = mcΔT.', [r`$50.0 \times 4.18 \times 25.0 = 5225$ J.`], { check: () => near(50 * 4.18 * 25, 5225) }),
      P('ch6-1-2', 3, r`A 100.0 g piece of metal ($c = 0.450$ J/(g·°C)) at 95.0 °C is placed in 200.0 g of water at 20.0 °C. What is the final temperature, in °C? (Three significant figures.)`, ['23.8'], 'Heat lost by metal = heat gained by water.', [r`$100.0(0.450)(95.0 - T) = 200.0(4.18)(T - 20.0)$.`, r`$4275 - 45T = 836T - 16720$, so $881T = 20995$ and $T = 23.8$ °C.`], { check: () => near((100 * 0.45 * 95 + 200 * 4.18 * 20) / (100 * 0.45 + 200 * 4.18), 23.83, 2e-3) }),
      P('ch6-1-3', 3, r`50.0 mL of 1.00 M HCl and 50.0 mL of 1.00 M NaOH are mixed in a calorimeter; the temperature rises 6.80 °C. Assume 100.0 g of solution with $c = 4.18$ J/(g·°C). What is $\Delta H$ of neutralization, in kJ/mol? (Three significant figures.)`, ['-56.8'], 'q_solution, then flip the sign, divide by moles of water formed.', [r`$q_{\text{soln}} = 100.0(4.18)(6.80) = 2842$ J, so $q_{\text{rxn}} = -2842$ J.`, r`Moles $= 0.0500$; $\Delta H = \frac{-2.842\text{ kJ}}{0.0500} = -56.8$ kJ/mol.`], { check: () => near(-(100 * 4.18 * 6.8) / 0.05 / 1000, -56.8, 2e-3) }),
      P('ch6-1-4', 2, r`How much energy, in kJ, is required to melt 36.0 g of ice at 0 °C? ($\Delta H_{\text{fus}} = 6.01$ kJ/mol)`, ['12.0', '12'], 'Moles × ΔH_fus.', [r`$\frac{36.0}{18.02} = 2.00$ mol; $2.00 \times 6.01 = 12.0$ kJ.`], { check: () => near((36 / M('H2O')) * 6.01, 12.0, 2e-3) }),
      P('ch6-1-5', 2, r`When ammonium nitrate dissolves in water in a coffee-cup calorimeter, the temperature of the solution drops. Which is true?`, 2, 'The thermometer measures the surroundings.', [r`The solution (surroundings) lost heat to the dissolving process, so the process absorbed heat: endothermic, $\Delta H > 0$.`], { choices: ['The process is exothermic, and ΔH < 0', 'No heat is exchanged because no bonds form', 'The process is endothermic, and ΔH > 0', 'The process releases heat to the water'] }),
      P('ch6-1-6', 3, r`On the heating curve of water, the temperature stays at 100 °C while heat is added. What is the added energy doing?`, 1, 'Phase change: forces between molecules.', [r`At the boiling point, energy overcomes the hydrogen bonds and other attractions between water molecules, converting liquid to gas without increasing their average kinetic energy.`], { choices: ['Breaking the O–H covalent bonds within water molecules', 'Overcoming the intermolecular forces between water molecules', 'Increasing the average kinetic energy of the water molecules', 'Being lost to the surroundings without affecting the water'] }),
    ],
    remember: ['q = mcΔT; ΔT in °C or K.', 'Water warms → reaction exothermic → ΔH < 0.', 'Heat lost = heat gained at thermal equilibrium.', 'Phase changes: q = nΔH, temperature constant.'],
    checkIn: 'You are ready when you can get the sign of ΔH right every time from what the thermometer did. Next: calculating ΔH without a calorimeter.',
  },
  {
    id: 'ch6-2', unit: 6, n: 2, title: 'Enthalpy of reaction: formation, bond enthalpies and Hess’s law',
    intro: 'You cannot run every reaction in a calorimeter, but you can still predict its enthalpy change. Today you use three tools: standard enthalpies of formation, bond enthalpies, and Hess’s law, which says the enthalpy change is the same no matter which path you take.',
    goals: ['Calculate ΔH°rxn from enthalpies of formation', 'Estimate ΔH from bond enthalpies', 'Combine equations with Hess’s law, reversing and scaling as needed', 'Use ΔH to find the heat released by a given mass'],
    notes: [
      { k: 'formula', t: r`\Delta H^\circ_{\text{rxn}} = \sum n\,\Delta H^\circ_f(\text{products}) - \sum n\,\Delta H^\circ_f(\text{reactants})` },
      { k: 'p', t: r`$\Delta H^\circ_f$ of an element in its standard state (such as $\text{O}_2(g)$ or C(graphite)) is zero.` },
      { k: 'formula', t: r`\Delta H \approx \sum(\text{bonds broken}) - \sum(\text{bonds formed})` },
      { k: 'rule', title: 'Hess’s law', t: r`If equations add up to the target equation, their $\Delta H$ values add up too. Reversing an equation changes the sign of $\Delta H$; multiplying it by a factor multiplies $\Delta H$ by the same factor.` },
      { k: 'warn', t: r`Breaking bonds always **requires** energy (endothermic); forming bonds **releases** it. The bond-enthalpy formula is broken minus formed, the reverse of the formation formula.` },
    ],
    examples: [
      { q: r`Find $\Delta H^\circ$ for $\text{CH}_4 + 2\text{O}_2 \rightarrow \text{CO}_2 + 2\text{H}_2\text{O}(l)$ given $\Delta H^\circ_f$: $\text{CH}_4$ −74.8, $\text{CO}_2$ −393.5, $\text{H}_2\text{O}(l)$ −285.8 kJ/mol.`, steps: [r`Products: $-393.5 + 2(-285.8) = -965.1$. Reactants: $-74.8 + 0$.`, r`$\Delta H^\circ = -965.1 - (-74.8) = -890.3$ kJ.`], a: '−890.3 kJ' },
      { q: r`Estimate $\Delta H$ for $\text{H}_2 + \text{Cl}_2 \rightarrow 2\text{HCl}$ (H–H 436, Cl–Cl 242, H–Cl 431 kJ/mol).`, steps: [r`Broken: $436 + 242 = 678$. Formed: $2(431) = 862$.`, r`$\Delta H = 678 - 862 = -184$ kJ.`], a: '−184 kJ' },
    ],
    practice: [
      P('ch6-2-1', 2, r`Using $\Delta H^\circ_f$ values (kJ/mol) $\text{CH}_4$ −74.8, $\text{CO}_2$ −393.5, $\text{H}_2\text{O}(l)$ −285.8, find $\Delta H^\circ$ for $\text{CH}_4 + 2\text{O}_2 \rightarrow \text{CO}_2 + 2\text{H}_2\text{O}(l)$, in kJ.`, ['-890.3', '-890'], 'Products minus reactants; O₂ is zero.', [r`$[-393.5 + 2(-285.8)] - [-74.8] = -890.3$ kJ.`], { check: () => near(-393.5 + 2 * -285.8 + 74.8, -890.3) }),
      P('ch6-2-2', 2, r`Using bond enthalpies H–H 436, Cl–Cl 242 and H–Cl 431 kJ/mol, estimate $\Delta H$ for $\text{H}_2 + \text{Cl}_2 \rightarrow 2\text{HCl}$, in kJ.`, ['-184'], 'Broken minus formed.', [r`$(436 + 242) - 2(431) = -184$ kJ.`], { check: () => 436 + 242 - 2 * 431 === -184 }),
      P('ch6-2-3', 3, r`Given $\text{C} + \text{O}_2 \rightarrow \text{CO}_2$, $\Delta H = -393.5$ kJ, and $\text{CO} + \frac{1}{2}\text{O}_2 \rightarrow \text{CO}_2$, $\Delta H = -283.0$ kJ, find $\Delta H$ for $\text{C} + \frac{1}{2}\text{O}_2 \rightarrow \text{CO}$, in kJ.`, ['-110.5'], 'Keep the first, reverse the second, add.', [r`Reverse the second: $\text{CO}_2 \rightarrow \text{CO} + \frac{1}{2}\text{O}_2$, $+283.0$. Adding: $-393.5 + 283.0 = -110.5$ kJ.`], { check: () => near(-393.5 + 283, -110.5) }),
      P('ch6-2-4', 3, r`Using $\Delta H^\circ = -890.3$ kJ per mole of $\text{CH}_4$ burned, how much heat, in kJ, is released when 8.00 g of $\text{CH}_4$ burns? (Three significant figures; give a positive number.)`, ['444'], 'Grams → moles → × 890.3.', [r`$\frac{8.00}{16.04} = 0.499$ mol; $0.499 \times 890.3 = 444$ kJ released.`], { check: () => near((8 / M('CH4')) * 890.3, 444, 2e-3) }),
      P('ch6-2-5', 1, r`Which statement about bond energies is correct?`, 0, 'Pulling atoms apart costs energy.', [r`Breaking any bond requires an input of energy; forming bonds releases energy.`], { choices: ['Breaking a chemical bond always requires energy', 'Breaking a chemical bond always releases energy', 'Forming a chemical bond always requires energy', 'Only ionic bonds require energy to break'] }),
      P('ch6-2-6', 2, r`For $\text{N}_2 + 2\text{O}_2 \rightarrow 2\text{NO}_2$, $\Delta H = +66.4$ kJ. What is $\Delta H$, in kJ, for $\text{NO}_2 \rightarrow \frac{1}{2}\text{N}_2 + \text{O}_2$?`, ['-33.2'], 'Reverse (flip sign) and halve.', [r`Reversed: $-66.4$ kJ; halved: $-33.2$ kJ.`], { check: () => near(-66.4 / 2, -33.2) }),
    ],
    remember: ['ΔH° = Σ products − Σ reactants (formation).', 'ΔH ≈ bonds broken − bonds formed.', 'Reverse: flip the sign. Scale: multiply ΔH.', 'Elements in standard states have ΔH°f = 0.'],
    checkIn: 'You are ready when you can combine three equations into a target with Hess’s law. Next: reactions that run both ways.',
  },
];

export const CHEM_C_TUTOR: Record<string, LessonTutor> = {
  'ch5-1': {
    bigIdea: ['A rate law says how strongly each concentration speeds up a reaction.', 'Orders are found by experiment: change one concentration and watch the rate.', 'Integrated rate laws turn a rate into a prediction of concentration at any time.'],
    picture: { title: 'Popcorn in a pot', t: 'Kernels pop at a rate proportional to how many unpopped ones remain: first-order behavior. Half the kernels pop in the first minute, half of the rest in the next, and so on: a constant half-life.' },
    words: [{ term: 'order', means: 'The exponent of a concentration in the rate law.' }, { term: 'rate constant', means: 'The k in the rate law; it depends on temperature, not concentration.' }, { term: 'half-life', means: 'The time for a reactant’s concentration to fall to half.' }],
    tools: [{ name: 'Logarithms', refresher: 'ln(e^x) = x; ln(1/2) = −0.693.' }],
    why: [['Change only [A] to isolate its effect.', 'Change only [B] to isolate its effect.'], ['First-order half-life is constant.', 'Divide 0.693 by k.']],
    walk: {
      'ch5-1-1': [r`Trials 1 and 2: [A] doubles, rate goes from $2.0\times 10^{-3}$ to $8.0\times 10^{-3}$, ×4: second order in A.`, r`Trials 1 and 3: [B] doubles, rate ×2: first order in B.`, r`Overall order $= 2 + 1 = 3$.`],
      'ch5-1-2': [r`Rate $= k[A]^2[B]$.`, r`Trial 1: $2.0\times 10^{-3} = k(0.10)^2(0.10) = k(1.0\times 10^{-3})$.`, r`$k = 2.0\ \text{M}^{-2}\text{s}^{-1}$.`],
      'ch5-1-3': [r`For first order, $t_{1/2} = \frac{\ln 2}{k} = \frac{0.693}{k}$.`, r`$\frac{0.693}{0.0231\ \text{min}^{-1}}$.`, r`$t_{1/2} = 30.0$ min.`],
      'ch5-1-4': [r`Each half-life leaves half of what was there.`, r`After 1: $\frac{1}{2}$; after 2: $\frac{1}{4}$; after 3: $\frac{1}{8}$.`, r`$\frac{1}{8} = 0.125$.`],
      'ch5-1-5': [r`First order: $[A] = [A]_0 e^{-kt}$.`, r`$kt = 0.0500 \times 20.0 = 1.00$.`, r`$[A] = 0.800 \times e^{-1} = 0.294$ M.`],
      'ch5-1-6': [r`Second order: $\frac{1}{[A]} = kt + \frac{1}{[A]_0}$.`, r`That has the form $y = mx + b$ with $y = \frac{1}{[A]}$, $x = t$.`, r`So $\frac{1}{[A]}$ versus time is linear: choice C.`],
    },
    teach: { plan: ['Show the method of initial rates with a table.', 'Find k with units.', 'Introduce the three integrated laws and their plots.', 'Do a half-life calculation.'], questions: [{ q: 'Why can’t we read orders from the balanced equation?', a: 'The overall equation hides the mechanism; only experiments (or elementary steps) reveal how rate depends on concentration.' }, { q: 'Does k change when concentration changes?', a: 'No. k depends on temperature (and catalysts), not on concentrations.' }], keyPoints: ['Orders from data.', 'Linear plot identifies order.', 't₁/₂ = 0.693/k for first order.'] },
  },
  'ch5-2': {
    bigIdea: ['Reactions happen in elementary steps, single collisions with rate laws read from their coefficients.', 'The slowest step limits the overall rate.', 'Temperature and catalysts change rates by changing how many collisions succeed.'],
    picture: { title: 'A highway with one narrow bridge', t: 'Cars move fast on open road but crawl over a one-lane bridge. How many cars arrive per hour depends on the bridge: the slow step.' },
    words: [{ term: 'intermediate', means: 'Formed in one step, used up in a later step.' }, { term: 'transition state', means: 'The highest-energy arrangement along the reaction path.' }, { term: 'activation energy', means: 'The energy needed to reach the transition state.' }],
    tools: [{ name: 'Rate laws', refresher: 'Rate = k[A]^m[B]^n.', lesson: 'ch5-1' }],
    why: [['The slow step sets the overall rate.', 'Species after the slow step do not appear in the rate law.'], ['Reverse activation energy is measured from the products.', 'Subtracting a negative ΔH adds its size.']],
    walk: {
      'ch5-2-1': [r`Identify the slow step: step 1, $\text{NO}_2 + \text{NO}_2$.`, r`It is elementary, so rate $= k[\text{NO}_2]^2$.`, r`CO only reacts in the fast step, so it does not appear: choice A.`],
      'ch5-2-2': [r`Track each species: $\text{NO}_3$ is produced in step 1.`, r`It is consumed in step 2 and is absent from the overall equation.`, r`That makes $\text{NO}_3$ the intermediate: choice C.`],
      'ch5-2-3': [r`Products sit 40 kJ/mol below reactants (exothermic).`, r`The reverse climb goes from products to the same peak: $120 + 40$.`, r`$E_{a,\text{rev}} = 160$ kJ/mol.`],
      'ch5-2-4': [r`Slow step: rate $= k_2[\text{N}_2\text{O}_2][\text{O}_2]$, but $\text{N}_2\text{O}_2$ is an intermediate.`, r`Fast equilibrium: $K = \frac{[\text{N}_2\text{O}_2]}{[\text{NO}]^2}$, so $[\text{N}_2\text{O}_2] = K[\text{NO}]^2$.`, r`Substitute: rate $= k_2K[\text{NO}]^2[\text{O}_2] = k[\text{NO}]^2[\text{O}_2]$, choice D.`],
      'ch5-2-5': [r`A catalyst changes the pathway, lowering $E_a$.`, r`It is regenerated, and it does not change ΔH or K.`, r`Only choice B is correct.`],
      'ch5-2-6': [r`A 10 °C rise increases collision frequency only a few percent.`, r`But it substantially increases the fraction of molecules with energy ≥ $E_a$.`, r`That larger fraction of successful collisions explains the doubling: choice A.`],
    },
    teach: { plan: ['Show a two-step mechanism and add the steps.', 'Find the rate law from the slow step.', 'Handle a fast pre-equilibrium.', 'Draw an energy profile with and without a catalyst.'], questions: [{ q: 'Can a mechanism be proven correct?', a: 'No. A mechanism consistent with the rate law is plausible; data can rule mechanisms out but not prove one.' }, { q: 'Why doesn’t a catalyst change K?', a: 'It lowers the barrier equally for the forward and reverse reactions, so both speed up by the same factor.' }], keyPoints: ['Slow step → rate law.', 'Replace intermediates via fast equilibria.', 'Catalysts lower E_a, not ΔH or K.'] },
  },
  'ch6-1': {
    bigIdea: ['Heat flows from hot to cold until temperatures match.', 'In a calorimeter, the water’s temperature change reveals the reaction’s energy change, with the opposite sign.', 'During phase changes energy rearranges molecules instead of speeding them up.'],
    picture: { title: 'Hot pan in a sink', t: 'Drop a hot pan into a sink of cool water: the pan cools, the water warms, and they meet at a temperature in between. The water’s gain equals the pan’s loss.' },
    words: [{ term: 'specific heat', means: 'Energy to raise 1 g of a substance by 1 °C.' }, { term: 'calorimeter', means: 'A device that measures heat by a temperature change.' }, { term: 'enthalpy of fusion', means: 'Energy to melt one mole of a solid at its melting point.' }],
    tools: [{ name: 'Moles from grams', refresher: 'n = m/M.', lesson: 'ch1-1' }],
    why: [['ΔT is final minus initial.', 'Multiply mass, specific heat and ΔT.'], ['Phase changes use moles and ΔH.', 'Multiply moles by ΔH_fus.']],
    walk: {
      'ch6-1-1': [r`$\Delta T = 45.0 - 20.0 = 25.0$ °C.`, r`$q = mc\Delta T = 50.0 \times 4.18 \times 25.0$.`, r`$q = 5225$ J.`],
      'ch6-1-2': [r`Heat lost by metal = heat gained by water: $100.0(0.450)(95.0 - T) = 200.0(4.18)(T - 20.0)$.`, r`$45(95.0 - T) = 836(T - 20.0)$ → $4275 - 45T = 836T - 16720$.`, r`$881T = 20995$, $T = 23.8$ °C. The water's large heat capacity keeps the final temperature close to 20 °C.`],
      'ch6-1-3': [r`$q_{\text{soln}} = 100.0 \times 4.18 \times 6.80 = 2842$ J; the solution gained heat.`, r`So the reaction released it: $q_{\text{rxn}} = -2842$ J $= -2.842$ kJ.`, r`Moles of water formed $= 0.0500$; $\Delta H = \frac{-2.842}{0.0500} = -56.8$ kJ/mol.`],
      'ch6-1-4': [r`Moles of ice $= \frac{36.0}{18.02} = 2.00$.`, r`Melting: $q = n\Delta H_{\text{fus}}$.`, r`$2.00 \times 6.01 = 12.0$ kJ.`],
      'ch6-1-5': [r`The thermometer is in the solution (the surroundings).`, r`It cooled, so the surroundings lost heat to the dissolving process.`, r`The process absorbed heat: endothermic, ΔH > 0, choice C.`],
      'ch6-1-6': [r`A flat stretch on a heating curve is a phase change.`, r`Energy is separating molecules (overcoming intermolecular forces), not speeding them up.`, r`No covalent bonds break: choice B.`],
    },
    teach: { plan: ['Do one q = mcΔT calculation.', 'Solve a hot-metal-in-water problem.', 'Run a coffee-cup calorimetry example with signs.', 'Read a heating curve.'], questions: [{ q: 'Why is ΔH negative when the water warms?', a: 'The water gained heat from the reaction, so the reaction lost it: exothermic.' }, { q: 'Why doesn’t temperature rise while boiling?', a: 'Energy goes into separating molecules, not into increasing their kinetic energy.' }], keyPoints: ['q = mcΔT.', 'q_rxn = −q_soln.', 'Plateaus: q = nΔH.'] },
  },
  'ch6-2': {
    bigIdea: ['Enthalpy is a state function: only the start and end matter.', 'So ΔH can be built from tables (formation, bond enthalpies) or from other reactions (Hess’s law).', 'Bonds broken cost energy; bonds formed release it.'],
    picture: { title: 'Climbing a hill by different trails', t: 'Whether you take the steep trail or the switchbacks, your change in altitude from the parking lot to the summit is the same. ΔH works the same way.' },
    words: [{ term: 'standard enthalpy of formation', means: 'ΔH to form one mole of a compound from its elements in standard states.' }, { term: 'bond enthalpy', means: 'Energy to break one mole of a given bond in the gas phase.' }, { term: 'state function', means: 'A quantity that depends only on the current state, not the path.' }],
    tools: [{ name: 'Calorimetry signs', refresher: 'Exothermic: ΔH < 0.', lesson: 'ch6-1' }],
    why: [['Sum formation enthalpies times coefficients.', 'Subtract reactants from products.'], ['Add all bonds broken.', 'Subtract all bonds formed.']],
    walk: {
      'ch6-2-1': [r`Products: $-393.5 + 2(-285.8) = -965.1$ kJ.`, r`Reactants: $-74.8 + 2(0) = -74.8$ kJ ($\text{O}_2$ is an element).`, r`$-965.1 - (-74.8) = -890.3$ kJ.`],
      'ch6-2-2': [r`Broken: one H–H and one Cl–Cl: $436 + 242 = 678$.`, r`Formed: two H–Cl: $2 \times 431 = 862$.`, r`$678 - 862 = -184$ kJ.`],
      'ch6-2-3': [r`Target has C on the left and CO on the right.`, r`Keep equation 1; reverse equation 2 so CO is a product ($+283.0$).`, r`Add: $\text{CO}_2$ and $\frac{1}{2}\text{O}_2$ cancel; $\Delta H = -393.5 + 283.0 = -110.5$ kJ.`],
      'ch6-2-4': [r`$M(\text{CH}_4) = 16.04$; $\frac{8.00}{16.04} = 0.499$ mol.`, r`Each mole releases 890.3 kJ.`, r`$0.499 \times 890.3 = 444$ kJ released.`],
      'ch6-2-5': [r`Atoms in a bond are held at an energy minimum.`, r`Separating them means climbing out of that well, which requires energy.`, r`So breaking a bond always requires energy: choice A.`],
      'ch6-2-6': [r`Reverse the given equation: $\Delta H = -66.4$ kJ.`, r`The target is half of that reversed equation.`, r`$\Delta H = -33.2$ kJ.`],
    },
    teach: { plan: ['Compute one ΔH° from a formation table.', 'Estimate the same kind of reaction from bond enthalpies.', 'Solve a Hess’s law puzzle by matching target species.', 'Convert ΔH to heat for a given mass.'], questions: [{ q: 'Why do bond-enthalpy estimates differ from formation results?', a: 'Bond enthalpies are averages over many molecules and assume the gas phase.' }, { q: 'Why is ΔH°f of O₂ zero?', a: 'Forming an element in its standard state from itself involves no change.' }], keyPoints: ['Products − reactants for formation.', 'Broken − formed for bonds.', 'Flip sign to reverse; scale to multiply.'] },
  },
};

import type { Frq, FrqStep } from '../calc/frq';
import { F, R_L, molarMass as M, near } from './lib';

const r = String.raw;
const S = (prompt: string, answer: string[], hint: string, explain: string, formula?: string, check?: () => boolean): FrqStep => ({ prompt, answer, hint, explain, formula, check });

/**
 * Guided free-response workouts for AP Chemistry, modeled on the exam's long (10-point) and short (4-point) questions.
 * Original questions. Every numeric step is checked independently.
 */
export const CHEM_FRQS: Frq[] = [
  { id: 'chem-frq-1', units: [1, 3, 4], title: 'Antacid analysis: stoichiometry, gas and titration', calculator: true,
    setup: r`A student analyzes an antacid tablet whose only active ingredient is calcium carbonate. The tablet (1.250 g) is dropped into 100.0 mL of 0.500 M HCl: $\text{CaCO}_3(s) + 2\text{HCl}(aq) \rightarrow \text{CaCl}_2(aq) + \text{H}_2\text{O}(l) + \text{CO}_2(g)$. The $\text{CO}_2$ is collected at 298 K and a pressure of 0.980 atm, and the excess HCl is titrated with 0.250 M NaOH.`,
    parts: [
      { label: 'a', q: 'The excess HCl requires 116.0 mL of NaOH. How many moles of CaCO₃ were in the tablet?', steps: [
        S('Moles of HCl added at the start.', ['0.0500', '0.05'], 'M × V in liters.', r`$0.500\ \text{M} \times 0.1000\ \text{L} = 0.0500$ mol HCl.

This is everything that went into the beaker. Some of it reacted with the tablet and the rest was left over for the NaOH. Writing this number first keeps the back-titration logic straight.`, 'molarity', () => near(0.5 * 0.1, 0.05)),
        S('Moles of HCl left over (neutralized by the NaOH).', ['0.0290', '0.029'], 'NaOH reacts 1 : 1 with HCl.', r`$0.250 \times 0.1160 = 0.0290$ mol NaOH, so 0.0290 mol HCl was left after the tablet reacted.

This is a back-titration: we never titrate the tablet directly. Instead we measure what the tablet did not use up and subtract it from what we added.`, 'molarity', () => near(0.25 * 0.116, 0.029)),
        S('Moles of CaCO₃ in the tablet.', ['0.0105'], 'HCl used = added − left over; then the 2 : 1 ratio.', r`HCl that reacted with the tablet: $0.0500 - 0.0290 = 0.0210$ mol. The equation uses 2 HCl per $\text{CaCO}_3$, so $\text{CaCO}_3 = \frac{0.0210}{2} = 0.0105$ mol.

The 2 : 1 ratio is the step most often missed: one carbonate ion accepts two protons.`, 'moles', () => near((0.05 - 0.029) / 2, 0.0105)),
      ], write: r`"HCl added: 0.0500 mol. HCl in excess = NaOH used = 0.0290 mol. HCl reacted = 0.0210 mol, so CaCO₃ = 0.0210/2 = 0.0105 mol." Show each subtraction and the mole ratio.`, trap: 'Using a 1 : 1 ratio between HCl and CaCO₃, which doubles the answer.' },
      { label: 'b', q: 'Calculate the mass percent of CaCO₃ in the tablet.', steps: [
        S('Mass of CaCO₃, in grams.', ['1.051', '1.05'], 'Moles × 100.09 g/mol.', r`$0.0105 \times 100.09 = 1.051$ g.

Molar mass of $\text{CaCO}_3$: $40.08 + 12.01 + 3(16.00) = 100.09$ g/mol. Converting back to grams lets us compare with the tablet's measured mass.`, 'moles', () => near(0.0105 * M('CaCO3'), 1.051, 1e-3)),
        S('Mass percent of CaCO₃ in the 1.250 g tablet.', ['84.1'], 'Part ÷ whole × 100.', r`$\frac{1.051}{1.250}\times 100 = 84.1\%$.

The rest of the tablet (about 16%) is binders and flavoring that do not react with acid, which is why the percent is less than 100.`, undefined, () => near((100 * 0.0105 * M('CaCO3')) / 1.25, 84.1, 1e-3)),
      ], write: r`"Mass CaCO₃ = 0.0105 mol × 100.09 g/mol = 1.051 g; percent = 1.051/1.250 × 100 = 84.1%."`, trap: 'Dividing by the mass of CaCO₃ instead of the whole tablet.' },
      { label: 'c', q: 'What volume of CO₂ should be collected at 298 K and 0.980 atm?', steps: [
        S('Volume of CO₂, in liters.', ['0.262'], 'One CO₂ per CaCO₃; V = nRT/P.', r`$n_{\text{CO}_2} = 0.0105$ mol (1 : 1 with $\text{CaCO}_3$). $V = \frac{(0.0105)(0.08206)(298)}{0.980} = 0.262$ L.

The pressure is 0.980 atm, not 1, so the gas occupies slightly more than it would at 1 atm. Temperature is already in kelvins.`, 'ideal-gas', () => near((0.0105 * R_L * 298) / 0.98, 0.262, 2e-3)),
      ], write: r`"$V = \frac{nRT}{P} = \frac{(0.0105)(0.08206)(298)}{0.980} = 0.262$ L." Substitute every value with units.`, trap: 'Using 22.4 L/mol, which applies only at 273 K and 1 atm.' },
    ] },
  { id: 'chem-frq-2', units: [5], title: 'Kinetics: rate law, mechanism and half-life', calculator: true,
    setup: r`The reaction $2\text{NO}(g) + \text{O}_2(g) \rightarrow 2\text{NO}_2(g)$ is studied at constant temperature.

~~~
Trial  [NO] (M)   [O₂] (M)   Initial rate (M/s)
  1     0.010      0.010       2.5 × 10⁻⁵
  2     0.020      0.010       1.0 × 10⁻⁴
  3     0.010      0.020       5.0 × 10⁻⁵
~~~`,
    parts: [
      { label: 'a', q: 'Determine the rate law and the rate constant.', steps: [
        S('Order with respect to NO.', ['2'], 'Compare trials 1 and 2.', r`From trial 1 to trial 2, [NO] doubles while $[\text{O}_2]$ is fixed, and the rate goes from $2.5\times 10^{-5}$ to $1.0\times 10^{-4}$: a factor of 4. Since $2^m = 4$, the order in NO is 2.

Always pick two trials where only one concentration changes; otherwise you cannot tell which reactant caused the change.`, undefined, () => Math.log2(1e-4 / 2.5e-5) === 2),
        S('Order with respect to O₂.', ['1'], 'Compare trials 1 and 3.', r`From trial 1 to trial 3, $[\text{O}_2]$ doubles while [NO] is fixed, and the rate doubles. Since $2^n = 2$, the order in $\text{O}_2$ is 1. The rate law is rate $= k[\text{NO}]^2[\text{O}_2]$.

The orders happen to match the coefficients here, but that is a coincidence of this reaction: orders must come from data.`, undefined, () => Math.log2(5e-5 / 2.5e-5) === 1),
        S('Value of k, in M⁻²s⁻¹.', ['25'], 'Substitute trial 1.', r`$2.5\times 10^{-5} = k(0.010)^2(0.010) = k(1.0\times 10^{-6})$, so $k = 25\ \text{M}^{-2}\text{s}^{-1}$.

Check the units: rate (M/s) divided by $\text{M}^3$ gives $\text{M}^{-2}\text{s}^{-1}$, as expected for an overall third-order reaction.`, undefined, () => near(2.5e-5 / 1e-6, 25)),
      ], write: r`"Trials 1→2: [NO] ×2, rate ×4, second order in NO. Trials 1→3: [O₂] ×2, rate ×2, first order in O₂. Rate = k[NO]²[O₂]; k = 25 M⁻²s⁻¹."`, trap: 'Writing the orders from the balanced equation without citing the data.' },
      { label: 'b', q: 'A proposed mechanism is: (1) 2NO ⇌ N₂O₂ (fast equilibrium); (2) N₂O₂ + O₂ → 2NO₂ (slow). Is it consistent with the rate law?', steps: [
        S('Is the mechanism consistent with rate = k[NO]²[O₂]? (yes or no)', ['yes', 'y'], 'Slow step, then replace the intermediate.', r`Yes. The slow step gives rate $= k_2[\text{N}_2\text{O}_2][\text{O}_2]$. $\text{N}_2\text{O}_2$ is an intermediate, so use the fast equilibrium: $K = \frac{[\text{N}_2\text{O}_2]}{[\text{NO}]^2}$, so $[\text{N}_2\text{O}_2] = K[\text{NO}]^2$. Substituting gives rate $= k_2K[\text{NO}]^2[\text{O}_2]$, which matches.

The steps also add up to the overall equation, the other requirement for a valid mechanism.`),
      ], write: r`"Rate = k₂[N₂O₂][O₂]; from the fast equilibrium [N₂O₂] = K[NO]², so rate = k₂K[NO]²[O₂], consistent with the experimental rate law. The steps sum to the overall reaction."`, trap: 'Leaving the intermediate N₂O₂ in the final rate law.' },
      { label: 'c', q: 'In a separate experiment with a large excess of O₂, the reaction behaves as second order in NO alone with k′ = 0.50 M⁻¹s⁻¹. Starting from [NO] = 0.040 M, find the first half-life.', steps: [
        S('Half-life, in seconds.', ['50'], 'Second order: t₁/₂ = 1/(k[A]₀).', r`$t_{1/2} = \frac{1}{k'[\text{NO}]_0} = \frac{1}{(0.50)(0.040)} = 50$ s.

With $\text{O}_2$ in huge excess its concentration barely changes, so it is folded into k′ (a pseudo-second-order rate law). Unlike a first-order half-life, this one doubles each time [NO] halves.`, 'first-order', () => 1 / (0.5 * 0.04) === 50),
      ], write: r`"Second order in NO: $t_{1/2} = \frac{1}{k'[\text{NO}]_0} = \frac{1}{(0.50)(0.040)} = 50$ s."`, trap: 'Using 0.693/k, the first-order formula.' },
    ] },
  { id: 'chem-frq-3', units: [7, 8], title: 'Weak acid, buffer and titration', calculator: true,
    setup: r`Benzoic acid, $\text{HC}_7\text{H}_5\text{O}_2$ (abbreviated HBz), is a weak monoprotic acid with $K_a = 6.3\times 10^{-5}$. A student titrates 40.0 mL of 0.100 M HBz with 0.100 M NaOH.`,
    parts: [
      { label: 'a', q: 'Calculate the initial pH of the 0.100 M HBz solution.', steps: [
        S('[H₃O⁺] at the start, in M. (Type it like 2.51e-3.)', ['2.51e-3'], 'Assume x is small next to C, so x ≈ √(Ka·C).', r`$x = \sqrt{(6.3\times 10^{-5})(0.100)} = 2.51\times 10^{-3}$ M.

Check the approximation: $\frac{2.51\times 10^{-3}}{0.100} = 2.5\%$, below 5%, so neglecting x in the denominator is justified.`, undefined, () => near(Math.sqrt(6.3e-6), 2.51e-3, 3e-3)),
        S('Initial pH. (Two decimal places.)', ['2.60'], 'pH is −log of the [H₃O⁺] you just found.', r`$\text{pH} = -\log(2.51\times 10^{-3}) = 2.60$.

For a pH, the digits after the decimal point match the significant figures of the concentration, so three-figure data would support 2.600; the question asks for two places, and 2.60 is what you report. A 0.100 M strong acid would have pH 1.00; the much higher pH shows how little a weak acid ionizes.`, undefined, () => near(-Math.log10(Math.sqrt(6.3e-6)), 2.60, 2e-3)),
      ], write: r`"$K_a = \frac{x^2}{0.100 - x} \approx \frac{x^2}{0.100}$; $x = 2.51\times 10^{-3}$ M (2.5% of 0.100, so valid); pH = 2.60."`, trap: 'Treating benzoic acid as strong and reporting pH 1.00.' },
      { label: 'b', q: 'Calculate the pH after 20.0 mL of NaOH has been added.', steps: [
        S('pH after 20.0 mL of NaOH. (Two decimal places.)', ['4.20', '4.2'], 'Half the acid has been neutralized.', r`Moles HBz: $0.0400 \times 0.100 = 0.00400$; moles $\text{OH}^-$: $0.0200 \times 0.100 = 0.00200$, exactly half. After reaction, HBz and $\text{Bz}^-$ are each 0.00200 mol, so this is the half-equivalence point and $\text{pH} = \text{p}K_a = -\log(6.3\times 10^{-5}) = 4.20$.

The solution is now a buffer at its point of maximum capacity.`, 'hh', () => near(-Math.log10(6.3e-5), 4.20, 2e-3)),
      ], write: r`"0.00200 mol OH⁻ converts half of 0.00400 mol HBz; [HBz] = [Bz⁻], so pH = pKa = 4.20."`, trap: 'Computing the pH of the NaOH alone, ignoring that it is consumed.' },
      { label: 'c', q: 'Calculate the pH at the equivalence point.', steps: [
        S('Concentration of Bz⁻ at equivalence, in M.', ['0.0500', '0.05'], '40.0 mL NaOH added; total volume 80.0 mL.', r`At equivalence, 40.0 mL of NaOH has been added: 0.00400 mol $\text{Bz}^-$ in 80.0 mL, so $[\text{Bz}^-] = \frac{0.00400}{0.0800} = 0.0500$ M.

Do not forget the dilution: the 40.0 mL of acid and the 40.0 mL of base add to 80.0 mL, so the volume doubled and the concentration is half of 0.100 M.`, 'molarity', () => near(0.004 / 0.08, 0.05)),
        S('pH at the equivalence point. (Two decimal places.)', ['8.45'], 'Kb = Kw/Ka; [OH⁻] = √(Kb·C).', r`$K_b = \frac{1.0\times 10^{-14}}{6.3\times 10^{-5}} = 1.59\times 10^{-10}$; $[\text{OH}^-] = \sqrt{(1.59\times 10^{-10})(0.0500)} = 2.82\times 10^{-6}$ M; pOH $= 5.55$; pH $= 8.45$.

The equivalence point is basic because the conjugate base $\text{Bz}^-$ reacts with water to form $\text{OH}^-$: this is why phenolphthalein is the right indicator.`, undefined, () => near(14 + Math.log10(Math.sqrt((1e-14 / 6.3e-5) * 0.05)), 8.45, 2e-3)),
      ], write: r`"At equivalence, [Bz⁻] = 0.0500 M; Kb = 1.59 × 10⁻¹⁰; [OH⁻] = 2.82 × 10⁻⁶ M; pH = 8.45."`, trap: 'Saying the equivalence pH is 7.00. That is only true for strong acid–strong base titrations.' },
    ] },
  { id: 'chem-frq-4', units: [6], title: 'Calorimetry and Hess’s law (short answer)', calculator: true,
    setup: r`When 0.250 g of magnesium ribbon reacts completely with 100.0 mL of excess 1.0 M HCl in a coffee-cup calorimeter, the temperature rises from 21.0 °C to 32.5 °C. Assume the solution has a mass of 100.0 g and a specific heat of 4.18 J/(g·°C).`,
    parts: [
      { label: 'a', q: 'Calculate ΔH for Mg + 2HCl → MgCl₂ + H₂, in kJ per mole of Mg.', steps: [
        S('Heat absorbed by the solution, in J.', ['4807', '4810'], 'q = mcΔT, with m the mass of the whole solution.', r`$q = (100.0)(4.18)(32.5 - 21.0) = (100.0)(4.18)(11.5) = 4807$ J.

Use the mass of the whole solution (100.0 g), not the 0.250 g of magnesium. The solution gained this heat from the reaction, so the reaction lost the same amount: $q_\text{rxn} = -4807$ J.`, 'q-mcdt', () => near(100 * 4.18 * 11.5, 4807)),
        S('ΔH, in kJ/mol of Mg. (Three significant figures.)', ['-467'], 'Flip the sign; divide by moles of Mg.', r`Moles Mg $= \frac{0.250}{24.30} = 0.01029$. $\Delta H = \frac{-4.807\text{ kJ}}{0.01029\text{ mol}} = -467$ kJ/mol.

The negative sign records that the reaction released heat. Divide by moles of Mg because the question asks per mole of Mg, the limiting reactant (HCl is in excess).`, 'q-mcdt', () => near(-4.807 / (0.25 / M('Mg')), -467, 2e-3)),

      ], write: r`"q_soln = (100.0 g)(4.18 J/g·°C)(11.5 °C) = 4.81 kJ; q_rxn = −4.81 kJ; ΔH = −4.81 kJ / 0.01029 mol = −467 kJ/mol."`, trap: 'Reporting a positive ΔH because the solution’s q was positive.' },
      { label: 'b', q: r`In a second experiment, the student finds $\text{MgO}(s) + 2\text{HCl}(aq) \rightarrow \text{MgCl}_2(aq) + \text{H}_2\text{O}(l)$, $\Delta H = -146$ kJ/mol. Given $\text{H}_2(g) + \frac{1}{2}\text{O}_2(g) \rightarrow \text{H}_2\text{O}(l)$, $\Delta H = -285.8$ kJ/mol, use Hess’s law with your result from part (a) to find $\Delta H^\circ_f$ of MgO(s), the enthalpy of $\text{Mg}(s) + \frac{1}{2}\text{O}_2(g) \rightarrow \text{MgO}(s)$.`, steps: [
        S('The MgO reaction must be reversed so that MgO ends up as a product. What is ΔH of the reversed reaction, in kJ?', ['146', '+146'], 'Reversing a reaction keeps the size of ΔH and flips its sign.', r`Reversed: $\text{MgCl}_2(aq) + \text{H}_2\text{O}(l) \rightarrow \text{MgO}(s) + 2\text{HCl}(aq)$, $\Delta H = +146$ kJ.

Why reverse it: in the target, MgO is a product, but in the measured reaction it is a reactant. Reversing also moves $\text{MgCl}_2$ and $\text{H}_2\text{O}$ to the reactant side, where they can cancel against the other two equations.`, undefined, () => -(-146) === 146),
        S(r`Add (a) as written, the reversed MgO reaction and the water reaction. What is $\Delta H^\circ_f$ of MgO, in kJ/mol? (Three significant figures.)`, ['-607'], 'Add the three ΔH values; first check that MgCl₂, H₂O, H₂ and HCl all cancel.', r`$\text{Mg} + 2\text{HCl} \rightarrow \text{MgCl}_2 + \text{H}_2$ ($-467$), $\text{MgCl}_2 + \text{H}_2\text{O} \rightarrow \text{MgO} + 2\text{HCl}$ ($+146$), $\text{H}_2 + \frac{1}{2}\text{O}_2 \rightarrow \text{H}_2\text{O}$ ($-285.8$).

Cancel: 2HCl, $\text{MgCl}_2$, $\text{H}_2$ and $\text{H}_2\text{O}$ each appear once on each side. What is left is $\text{Mg} + \frac{1}{2}\text{O}_2 \rightarrow \text{MgO}$, and $\Delta H = -467 + 146 - 285.8 = -606.8 \approx -607$ kJ/mol. The accepted value is −601.6 kJ/mol; the difference comes from heat lost by the coffee cup and rounding in the measured values.`, undefined, () => near(-4.807 / (0.25 / M('Mg')) + 146 - 285.8, -607, 2e-3)),
      ], write: r`Write all three equations with their ΔH values, show which species cancel, and add: "$\Delta H^\circ_f(\text{MgO}) = (-467) + (+146) + (-285.8) = -607$ kJ/mol." An answer with no equations shown usually earns only part of the credit.`, trap: 'Adding −146 instead of +146: the MgO reaction has to be reversed, so its sign flips.' },
    ] },
  { id: 'chem-frq-5', units: [9], title: 'Galvanic cell and electrolysis (short answer)', calculator: true,
    setup: r`A galvanic cell is built from a zinc electrode in 1.0 M $\text{Zn}(\text{NO}_3)_2$ and a silver electrode in 1.0 M $\text{AgNO}_3$. Standard reduction potentials: $\text{Ag}^+ + e^- \rightarrow \text{Ag}$, +0.80 V; $\text{Zn}^{2+} + 2e^- \rightarrow \text{Zn}$, −0.76 V.`,
    parts: [
      { label: 'a', q: 'Calculate E°cell and ΔG° for the cell reaction.', steps: [
        S('E°cell, in V.', ['1.56'], 'Cathode − anode; do not double the silver potential.', r`Silver has the higher reduction potential, so $\text{Ag}^+$ is reduced (cathode) and Zn is oxidized (anode). $E^\circ = 0.80 - (-0.76) = 1.56$ V.

The balanced reaction is $\text{Zn} + 2\text{Ag}^+ \rightarrow \text{Zn}^{2+} + 2\text{Ag}$, but the coefficient 2 does not change $E^\circ$, an intensive property.`, 'cell', () => near(0.8 + 0.76, 1.56)),
        S('ΔG°, in kJ. (Three significant figures.)', ['-301'], 'n = 2 electrons.', r`$\Delta G^\circ = -nFE^\circ = -(2)(96485)(1.56) = -301{,}000$ J $= -301$ kJ.

Two electrons move per Zn atom oxidized ($\text{Zn} \to \text{Zn}^{2+} + 2e^-$), and the 2 in front of Ag⁺ does not double n again; using n = 1 would halve the answer. Negative ΔG° matches a positive E°: the cell runs on its own.`, 'cell', () => near((-2 * F * 1.56) / 1000, -301, 2e-3)),
      ], write: r`"Cathode: Ag⁺ + e⁻ → Ag; anode: Zn → Zn²⁺ + 2e⁻. E° = 0.80 − (−0.76) = 1.56 V. ΔG° = −(2)(96,485)(1.56) = −301 kJ."`, trap: 'Doubling 0.80 V because two Ag⁺ are needed per Zn.' },
      { label: 'b', q: 'The cell runs at a constant 0.150 A for 2.00 hours. What mass of silver is deposited?', steps: [
        S('Mass of Ag deposited, in grams. (Three significant figures.)', ['1.21'], 'q = It → mol e⁻ → mol Ag (1 : 1).', r`$q = 0.150 \times 7200 = 1080$ C; $\frac{1080}{96485} = 0.01119$ mol $e^-$ = 0.01119 mol Ag; $0.01119 \times 107.87 = 1.21$ g.

Silver needs one electron per atom, so moles of Ag equal moles of electrons.`, 'faraday', () => near(((0.15 * 7200) / F) * 107.87, 1.207, 2e-3)),
      ], write: r`"q = (0.150 A)(7200 s) = 1080 C; mol e⁻ = 1080/96,485 = 0.0112; mass Ag = 0.0112 × 107.87 = 1.21 g."`, trap: 'Forgetting to convert 2.00 hours into 7200 seconds.' },
    ] },
];

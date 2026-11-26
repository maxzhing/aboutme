import type { CalcLesson, CalcProblem, LessonTutor } from '../calc/types';
import { MASS, NA, molarMass as M, near } from './lib';

const r = String.raw;
const P = (id: string, level: 1 | 2 | 3, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, hint, solution, ...extra });

/** AP Chemistry Units 1–2. Original lessons and problems; masses from the AP periodic table. */
export const CHEM_A: CalcLesson[] = [
  {
    id: 'ch1-1', unit: 1, n: 1, title: 'Moles, molar mass and composition',
    intro: 'Atoms are far too small to count one by one, so chemists count them by weighing. The mole is the bridge: it turns grams you can measure into numbers of particles you can reason about. Today you learn to move between grams, moles and particles, to find the percent of each element in a compound, to work out an empirical formula, and to read a mass spectrum.',
    goals: ['Convert between mass, moles and number of particles', 'Calculate molar mass and percent composition', 'Find an empirical formula (and a hydrate’s formula) from mass data', 'Calculate an average atomic mass from a mass spectrum'],
    notes: [
      { k: 'list', items: [r`One **mole** is $6.022\times 10^{23}$ particles (Avogadro's number), just as one dozen is 12.`, r`The **molar mass** $M$ of a substance is the mass of one mole, in g/mol. Add the atomic masses: $M(\text{H}_2\text{O}) = 2(1.008) + 16.00 = 18.02$ g/mol.`, r`Moles connect everything: grams $\xrightarrow{\div M}$ moles $\xrightarrow{\times N_A}$ particles.`] },
      { k: 'formula', t: r`n = \frac{m}{M}\qquad N = n\,N_A` },
      { k: 'rule', title: 'Percent composition', t: r`Mass percent of an element $= \frac{(\text{atoms of it per formula})\times(\text{its atomic mass})}{\text{molar mass of the compound}}\times 100\%$.` },
      { k: 'rule', title: 'Empirical formula in four steps', t: r`(1) Assume 100 g, so percents become grams. (2) Convert each element's grams to moles. (3) Divide every mole amount by the smallest. (4) If the ratios are not whole numbers, multiply them all by a small integer (2, 3, …).` },
      { k: 'p', t: r`A **mass spectrum** shows each isotope of an element as a peak at its mass, with height proportional to its abundance. The average atomic mass is the weighted average: $\sum(\text{isotope mass})\times(\text{fractional abundance})$.` },
      { k: 'warn', t: r`In "moles of atoms", count every atom: one mole of $\text{CO}_2$ contains **two** moles of O atoms. Read the question for which particle it counts.` },
    ],
    examples: [
      { q: r`How many moles are in 25.0 g of calcium carbonate, $\text{CaCO}_3$?`, steps: [r`Molar mass: $40.08 + 12.01 + 3(16.00) = 100.09$ g/mol.`, r`$n = \frac{25.0\text{ g}}{100.09\text{ g/mol}} = 0.250$ mol.`], a: '0.250 mol' },
      { q: r`A compound is 40.0% C, 6.71% H and 53.3% O by mass. Find its empirical formula.`, steps: [r`In 100 g: 40.0 g C, 6.71 g H, 53.3 g O.`, r`Moles: $\frac{40.0}{12.01} = 3.33$ C, $\frac{6.71}{1.008} = 6.66$ H, $\frac{53.3}{16.00} = 3.33$ O.`, r`Divide by 3.33: C 1, H 2, O 1. Empirical formula $\text{CH}_2\text{O}$.`], a: r`$\text{CH}_2\text{O}$` },
    ],
    practice: [
      P('ch1-1-1', 1, r`What is the molar mass of calcium nitrate, $\text{Ca(NO}_3)_2$, in g/mol?`, ['164.1'], 'The subscript 2 outside the parentheses doubles everything inside.', [r`$40.08 + 2(14.01) + 6(16.00) = 164.1$ g/mol.`], { check: () => near(M('Ca(NO3)2'), 164.1, 1e-4) }),
      P('ch1-1-2', 2, r`How many oxygen **atoms** are in 10.0 g of $\text{CO}_2$? (Type it like 2.74e23.)`, ['2.74e23'], 'grams → moles of CO₂ → moles of O atoms → atoms.', [r`$\frac{10.0}{44.01} = 0.2272$ mol $\text{CO}_2$, which has $2(0.2272) = 0.4544$ mol O.`, r`$0.4544\times 6.022\times 10^{23} = 2.74\times 10^{23}$ O atoms.`], { check: () => near(2 * (10 / M('CO2')) * NA, 2.74e23, 5e-3) }),
      P('ch1-1-3', 2, r`What is the mass percent of nitrogen in ammonium nitrate, $\text{NH}_4\text{NO}_3$? (Give the percent, e.g. 35.0.)`, ['35.0'], 'There are two N atoms per formula unit.', [r`$M = 2(14.01) + 4(1.008) + 3(16.00) = 80.05$ g/mol.`, r`$\frac{2(14.01)}{80.05}\times 100 = 35.0\%$.`], { check: () => near((100 * 2 * MASS.N) / M('NH4NO3'), 35.0, 1e-3) }),
      P('ch1-1-4', 3, r`A 5.00 g sample of the hydrate $\text{CuSO}_4\cdot x\text{H}_2\text{O}$ is heated until all the water is gone, leaving 3.20 g of $\text{CuSO}_4$. What is $x$?`, ['5'], 'Moles of water lost ÷ moles of CuSO₄ left.', [r`Water lost: $5.00 - 3.20 = 1.80$ g, so $\frac{1.80}{18.02} = 0.0999$ mol.`, r`$\text{CuSO}_4$: $\frac{3.20}{159.61} = 0.0200$ mol. Ratio $\frac{0.0999}{0.0200} = 4.98 \approx 5$.`], { check: () => Math.round((1.8 / M('H2O')) / (3.2 / M('CuSO4'))) === 5 }),
      P('ch1-1-5', 2, r`The mass spectrum of an element shows two peaks: mass 69 with 60.1% abundance and mass 71 with 39.9% abundance. Which element is it?`, 1, 'Weighted average, then match to the periodic table.', [r`$69(0.601) + 71(0.399) = 69.80$ amu, which matches gallium (69.72).`], { choices: ['Zinc (65.38)', 'Gallium (69.72)', 'Germanium (72.63)', 'Arsenic (74.92)'] }),
      P('ch1-1-6', 3, r`A 10.00 g mixture of NaCl and KCl contains 5.25 g of chlorine. What mass of NaCl, in grams, is in the mixture? (Two decimal places.)`, ['3.77'], 'Let x = grams of NaCl. Write the chlorine from each salt in terms of x.', [r`Fraction Cl in NaCl: $\frac{35.45}{58.44} = 0.6066$. In KCl: $\frac{35.45}{74.55} = 0.4755$.`, r`$0.6066x + 0.4755(10.00 - x) = 5.25$, so $0.1311x = 0.495$ and $x = 3.77$ g.`], { check: () => near((5.25 - (10 * 35.45) / M('KCl')) / (35.45 / M('NaCl') - 35.45 / M('KCl')), 3.77, 2e-3) }),
    ],
    remember: ['Grams ÷ molar mass = moles; moles × 6.022×10²³ = particles.', 'Percent composition: (atoms × atomic mass) ÷ molar mass × 100.', 'Empirical formula: assume 100 g, to moles, divide by the smallest, clear fractions.', 'Average atomic mass is a weighted average of the isotopes in the mass spectrum.'],
    checkIn: 'You are ready when you can turn any mass into moles and particles without notes, and set up an empirical-formula table in under two minutes. Next: what is inside the atom, and why the periodic table looks the way it does.',
  },
  {
    id: 'ch1-2', unit: 1, n: 2, title: 'Electron configurations, PES and periodic trends',
    intro: 'Why does sodium lose one electron so easily, while neon refuses to react at all? The answer is how electrons are arranged and how strongly the nucleus pulls on them. Today you write electron configurations, read photoelectron spectra (PES), and explain periodic trends with Coulomb’s law, the way AP free-response answers require.',
    goals: ['Write electron configurations for atoms and ions', 'Read a photoelectron spectrum: peak position and height', 'Explain trends in radius, ionization energy and electronegativity with Coulomb’s law', 'Count valence and unpaired electrons'],
    notes: [
      { k: 'p', t: r`Electrons fill subshells in order of energy: $1s, 2s, 2p, 3s, 3p, 4s, 3d, 4p, \ldots$ Each $s$ holds 2, each $p$ holds 6, each $d$ holds 10. Iron is $1s^2 2s^2 2p^6 3s^2 3p^6 4s^2 3d^6$, or $[\text{Ar}]\,4s^2 3d^6$.` },
      { k: 'rule', title: 'Coulomb’s law: the reason behind every trend', t: r`The attraction between the nucleus and an electron grows with the nuclear charge and shrinks with distance: $F \propto \frac{q_1q_2}{r^2}$. Inner electrons **shield** outer ones, so what matters is the effective nuclear charge and the distance of the electron's shell.` },
      { k: 'list', items: [r`**Across a period:** more protons, same shell, little extra shielding, so the pull grows. Radius shrinks; ionization energy and electronegativity rise.`, r`**Down a group:** a new shell each row, farther from the nucleus and more shielded. Radius grows; ionization energy falls.`, r`**Ions:** cations lose electrons (smaller); anions gain them (larger). In an isoelectronic series, more protons means smaller.`] },
      { k: 'rule', title: 'Photoelectron spectroscopy (PES)', t: r`Each peak is one subshell. Its position is the **binding energy** (farther left = held more tightly = closer to the nucleus). Its **height** is proportional to the number of electrons in that subshell.` },
      { k: 'warn', t: r`Transition metals lose their $4s$ electrons **before** their $3d$ electrons: $\text{Fe}^{3+}$ is $[\text{Ar}]\,3d^5$, not $[\text{Ar}]\,4s^2 3d^3$.` },
      { k: 'tip', t: r`Two classic exceptions to the ionization-energy trend: $B < Be$ (boron's electron comes from a higher-energy $2p$ subshell) and $O < N$ (oxygen's fourth $p$ electron is paired and repelled by its partner).` },
    ],
    examples: [
      { q: r`Write the configurations of Fe and $\text{Fe}^{3+}$.`, steps: [r`Fe has 26 electrons: $[\text{Ar}]\,4s^2 3d^6$.`, r`Remove three electrons, the two $4s$ first, then one $3d$: $\text{Fe}^{3+}$ is $[\text{Ar}]\,3d^5$.`], a: r`$[\text{Ar}]4s^23d^6$; $[\text{Ar}]3d^5$` },
      { q: r`A PES shows five peaks with relative heights 2 : 2 : 6 : 2 : 1, from left to right. Identify the element.`, steps: [r`Read the heights as electron counts: $1s^2 2s^2 2p^6 3s^2 3p^1$.`, r`Total electrons $= 13$: aluminum.`], a: 'Aluminum' },
    ],
    practice: [
      P('ch1-2-1', 1, r`How many unpaired electrons does a ground-state sulfur atom have?`, ['2'], 'S is [Ne] 3s² 3p⁴. Fill the three p orbitals one at a time first.', [r`$3p^4$: three orbitals get one electron each, then the fourth pairs up, leaving 2 unpaired.`], { check: () => { const p = 4; return (p <= 3 ? p : 6 - p) === 2; } }),
      P('ch1-2-2', 2, r`Which atom has the largest first ionization energy?`, 2, 'Across period 2 IE rises, with dips at B and O.', [r`N has a half-filled $2p^3$ subshell; O's fourth $2p$ electron is paired and easier to remove. Among B, C, N and O, N is highest.`], { choices: ['B', 'C', 'N', 'O'] }),
      P('ch1-2-3', 2, r`Which ion has the largest radius?`, 0, 'All four have 18 electrons. Compare protons.', [r`$\text{S}^{2-}$, $\text{Cl}^-$, $\text{K}^+$ and $\text{Ca}^{2+}$ are isoelectronic. S has the fewest protons (16) pulling on the same 18 electrons, so its ion is largest.`], { choices: [r`$\text{S}^{2-}$`, r`$\text{Cl}^-$`, r`$\text{K}^+$`, r`$\text{Ca}^{2+}$`] }),
      P('ch1-2-4', 1, r`How many valence electrons does an arsenic atom have?`, ['5'], 'As is in group 15: count the outermost s and p electrons.', [r`$[\text{Ar}]\,4s^2 3d^{10} 4p^3$: the $n = 4$ shell holds $2 + 3 = 5$ valence electrons.`], { check: () => 2 + 3 === 5 }),
      P('ch1-2-5', 3, r`Which best explains why the first ionization energy of Mg is greater than that of Al?`, 3, 'Where does each atom’s outermost electron sit?', [r`Al's electron is removed from a $3p$ subshell, which is higher in energy and slightly more shielded than Mg's $3s$ electron, so it takes less energy to remove.`], { choices: ['Al has more protons, so its electrons are held less tightly', 'Mg has a larger atomic radius than Al', 'Mg’s valence electrons are paired, which makes them easier to remove', 'Al’s outermost electron is in a 3p subshell, higher in energy and more shielded than Mg’s 3s electrons'] }),
      P('ch1-2-6', 2, r`In a PES of potassium, which peak has the greatest binding energy, and what is its relative height?`, 1, 'Binding energy is greatest for the innermost electrons.', [r`The $1s$ electrons are closest to the nucleus, so they have the largest binding energy. The peak height is 2, for the two electrons in $1s$.`], { choices: ['4s, height 1', '1s, height 2', '3p, height 6', '2p, height 6'] }),
    ],
    remember: ['Fill 1s 2s 2p 3s 3p 4s 3d; ions of transition metals lose 4s first.', 'Coulomb’s law: more protons and smaller distance mean a stronger pull.', 'Across a period: smaller, higher IE and EN. Down a group: bigger, lower IE.', 'PES: left = tighter (inner) electrons; height = number of electrons.'],
    checkIn: 'You are ready when you can explain any trend in one sentence that names the number of protons, the shell (distance) and shielding. Next: how atoms bond.',
  },
  {
    id: 'ch2-1', unit: 2, n: 1, title: 'Ionic, metallic and covalent bonding',
    intro: 'Table salt shatters, copper bends, and diamond scratches glass. Each behaves the way it does because of how its atoms are held together. Today you sort bonds into ionic, covalent and metallic, use Coulomb’s law to compare lattice energies, read a potential energy curve, and explain alloys.',
    goals: ['Classify a bond as ionic, polar covalent, nonpolar covalent or metallic', 'Compare lattice energies with charge and ion size', 'Read bond length and bond energy from a potential energy diagram', 'Explain the properties of ionic solids, metals and alloys'],
    notes: [
      { k: 'list', items: [r`**Ionic:** a metal cation and a nonmetal anion held by electrostatic attraction in a lattice.`, r`**Covalent:** nonmetals sharing electron pairs. Unequal sharing (different electronegativities) makes it polar.`, r`**Metallic:** cations in a "sea" of delocalized valence electrons, which is why metals conduct and bend.`] },
      { k: 'rule', title: 'Lattice energy and Coulomb’s law', t: r`The attraction between ions is proportional to $\frac{q_+q_-}{r}$ (energy). Larger charges and smaller ions give a larger lattice energy and a higher melting point. Charge usually matters more than size.` },
      { k: 'p', t: r`A **potential energy curve** plots energy against the distance between two nuclei. Far apart the energy is 0. As they approach, attraction lowers the energy to a minimum: that distance is the **bond length**, and the depth of the well is the **bond energy**. Closer still, the nuclei repel and the energy shoots up.` },
      { k: 'list', items: [r`**Substitutional alloy:** atoms of similar size replace each other (brass: Zn in Cu).`, r`**Interstitial alloy:** small atoms fill the gaps between larger ones (steel: C in Fe), making the metal harder and less malleable.`] },
      { k: 'warn', t: r`Ionic solids do not conduct electricity as solids (the ions are locked in place); they conduct when melted or dissolved, when the ions can move.` },
    ],
    examples: [
      { q: r`Which has the higher lattice energy, NaF or MgO?`, steps: [r`Charges: $\text{Na}^+\text{F}^-$ is $1\times 1$; $\text{Mg}^{2+}\text{O}^{2-}$ is $2\times 2 = 4$.`, r`The ions are similar in size, so the fourfold charge product dominates: MgO has the higher lattice energy.`], a: 'MgO' },
      { q: r`On a potential energy curve for $\text{H}_2$, the minimum is at 74 pm and $-436$ kJ/mol. State the bond length and bond energy.`, steps: [r`The distance at the minimum is the bond length: 74 pm.`, r`The depth of the well is the energy needed to separate the atoms: 436 kJ/mol.`], a: '74 pm; 436 kJ/mol' },
    ],
    practice: [
      P('ch2-1-1', 2, r`Which compound has the largest lattice energy?`, 2, 'Charge product first, then size.', [r`MgO and CaO both have charges $2\times 2$; $\text{Mg}^{2+}$ is smaller than $\text{Ca}^{2+}$, so MgO wins. NaCl and KBr only have $1\times 1$.`], { choices: ['NaCl', 'KBr', 'MgO', 'CaO'] }),
      P('ch2-1-2', 2, r`At the same distance between ion centers, by what factor is the attraction between $\text{Mg}^{2+}$ and $\text{O}^{2-}$ greater than between $\text{Na}^+$ and $\text{Cl}^-$?`, ['4'], 'Coulomb’s law: proportional to the product of the charges.', [r`$\frac{2\times 2}{1\times 1} = 4$.`], { check: () => (2 * 2) / (1 * 1) === 4 }),
      P('ch2-1-3', 3, r`If both ion charges double and the distance between them also doubles, by what factor does the Coulombic force change?`, ['1'], 'F ∝ q₁q₂ / r².', [r`Charges: $2\times 2 = 4$ times larger. Distance squared: $2^2 = 4$ times larger. $\frac{4}{4} = 1$: no change.`], { check: () => (2 * 2) / 2 ** 2 === 1 }),
      P('ch2-1-4', 2, r`Steel is iron with a small amount of carbon. Which best describes steel?`, 1, 'Compare the sizes of C and Fe atoms.', [r`Carbon atoms are much smaller than iron atoms, so they fit in the gaps: an interstitial alloy. The carbon blocks layers from sliding, so steel is harder than iron.`], { choices: ['A substitutional alloy, softer than pure iron', 'An interstitial alloy, harder than pure iron', 'An ionic solid of Fe²⁺ and C⁴⁻', 'A network covalent solid'] }),
      P('ch2-1-5', 1, r`Which substance conducts electricity as a solid?`, 0, 'You need charges that can move.', [r`Copper has delocalized electrons that move freely. Solid NaCl's ions are fixed, and $\text{SiO}_2$ and $\text{I}_2$ have no free charges.`], { choices: ['Cu', 'NaCl', r`$\text{SiO}_2$`, r`$\text{I}_2$`] }),
      P('ch2-1-6', 3, r`On a potential energy diagram, the curve for HCl has its minimum at a larger distance and a shallower depth than the curve for HF. What does this show?`, 3, 'Read position as length and depth as strength.', [r`A minimum farther right means a longer bond; a shallower well means less energy is needed to break it. So H–Cl is longer and weaker than H–F.`], { choices: ['H–Cl is shorter and stronger than H–F', 'H–Cl is shorter and weaker than H–F', 'H–Cl is longer and stronger than H–F', 'H–Cl is longer and weaker than H–F'] }),
    ],
    remember: ['Ionic: metal + nonmetal; covalent: shared pairs; metallic: sea of electrons.', 'Lattice energy grows with ion charges and shrinks with ion size.', 'Potential energy minimum: distance = bond length, depth = bond energy.', 'Interstitial alloys (small atoms in gaps) are harder; substitutional alloys swap similar-size atoms.'],
    checkIn: 'You are ready when you can justify a melting-point comparison with charges and sizes, and read any potential energy curve. Next: drawing molecules and predicting their shapes.',
  },
  {
    id: 'ch2-2', unit: 2, n: 2, title: 'Lewis structures, resonance and VSEPR',
    intro: 'A molecular formula tells you which atoms are present; a Lewis structure tells you how they are connected and where every electron is. From there, VSEPR predicts the 3-D shape, and the shape decides whether the molecule is polar. Today you draw Lewis structures, use formal charge and resonance, and predict geometry, hybridization and polarity.',
    goals: ['Draw Lewis structures and count valence electrons for molecules and ions', 'Use formal charge to choose the best structure; recognize resonance', 'Predict electron and molecular geometry with VSEPR', 'Give hybridization, sigma and pi bonds, and decide polarity'],
    notes: [
      { k: 'rule', title: 'Lewis structure steps', t: r`(1) Count valence electrons (add one per negative charge, subtract one per positive). (2) Connect atoms with single bonds, least electronegative atom in the center. (3) Complete octets on outer atoms. (4) Put leftovers on the central atom. (5) If the center lacks an octet, turn lone pairs into double bonds.` },
      { k: 'formula', t: r`\text{formal charge} = (\text{valence } e^-) - (\text{nonbonding } e^-) - \tfrac{1}{2}(\text{bonding } e^-)` },
      { k: 'p', t: r`The best structure has formal charges closest to zero, with any negative charge on the more electronegative atom. When several equally good structures differ only in where a double bond sits, the real molecule is a blend of them: **resonance**. The bonds in a resonance hybrid are equal, with a bond order between the options (in $\text{NO}_3^-$, $\frac{4}{3}$).` },
      { k: 'list', items: [r`Electron domains (bonds count once each, plus lone pairs): 2 linear ($sp$), 3 trigonal planar ($sp^2$), 4 tetrahedral ($sp^3$), 5 trigonal bipyramidal, 6 octahedral.`, r`Lone pairs change the molecular shape: 4 domains with 1 lone pair is trigonal pyramidal ($\text{NH}_3$); with 2 is bent ($\text{H}_2\text{O}$).`, r`Every single bond is one $\sigma$ bond; a double bond is $1\sigma + 1\pi$; a triple bond is $1\sigma + 2\pi$.`] },
      { k: 'warn', t: r`A molecule with polar bonds can still be nonpolar if its shape makes the bond dipoles cancel ($\text{CO}_2$, $\text{CCl}_4$, $\text{BF}_3$).` },
    ],
    examples: [
      { q: r`Count the valence electrons and give the shape of $\text{XeF}_4$.`, steps: [r`Valence electrons: $8 + 4(7) = 36$. Four Xe–F bonds use 8; the F atoms take 24; 4 remain as two lone pairs on Xe.`, r`Xe has 6 electron domains (octahedral) with 2 lone pairs opposite each other: square planar.`], a: 'Square planar' },
      { q: r`Find the formal charge on each atom in the structure of $\text{CO}_2$ with two C=O double bonds.`, steps: [r`C: $4 - 0 - \frac{8}{2} = 0$.`, r`Each O: $6 - 4 - \frac{4}{2} = 0$. All zero: this is the best structure.`], a: 'All formal charges are 0' },
    ],
    practice: [
      P('ch2-2-1', 1, r`How many valence electrons are in the sulfate ion, $\text{SO}_4^{2-}$?`, ['32'], 'S and O each have 6; add 2 for the charge.', [r`$6 + 4(6) + 2 = 32$.`], { check: () => 6 + 4 * 6 + 2 === 32 }),
      P('ch2-2-2', 3, r`In the Lewis structure of $\text{SO}_4^{2-}$ with two S=O double bonds and two S–O single bonds, what is the formal charge on sulfur?`, ['0'], 'S has 6 bonds (12 bonding electrons) and no lone pairs.', [r`$6 - 0 - \frac{12}{2} = 0$.`], { check: () => 6 - 0 - 12 / 2 === 0 }),
      P('ch2-2-3', 2, r`What is the average N–O bond order in the nitrate ion, $\text{NO}_3^-$? (Fraction or two decimals.)`, ['4/3', '1.33'], 'Three resonance structures share one double bond among three N–O bonds.', [r`Total bonds: $2 + 1 + 1 = 4$ shared by 3 positions, so $\frac{4}{3}$.`], { check: () => near(4 / 3, 1.333, 1e-3) }),
      P('ch2-2-4', 2, r`What is the hybridization of nitrogen in $\text{NH}_3$?`, 2, 'Count electron domains, including lone pairs.', [r`N has 3 bonds and 1 lone pair: 4 domains, so $sp^3$ (the molecule is trigonal pyramidal).`], { choices: [r`$sp$`, r`$sp^2$`, r`$sp^3$`, r`$sp^3d$`] }),
      P('ch2-2-5', 2, r`How many $\pi$ bonds are in a molecule of HCN?`, ['2'], 'H–C is single; C≡N is triple.', [r`A triple bond is $1\sigma + 2\pi$. So HCN has 2 $\pi$ bonds (and 2 $\sigma$ bonds).`], { check: () => 3 - 1 === 2 }),
      P('ch2-2-6', 3, r`Which molecule is polar?`, 3, 'Polar bonds plus a shape where they do not cancel.', [r`$\text{CO}_2$ (linear), $\text{CCl}_4$ (tetrahedral) and $\text{BF}_3$ (trigonal planar) are symmetric, so their dipoles cancel. $\text{NH}_3$ is trigonal pyramidal; its dipoles add up.`], { choices: [r`$\text{CO}_2$`, r`$\text{CCl}_4$`, r`$\text{BF}_3$`, r`$\text{NH}_3$`] }),
    ],
    remember: ['Count valence electrons first; adjust for charge.', 'Formal charge = valence − lone-pair electrons − ½ bonding electrons; aim for zeros.', 'Domains → electron geometry; lone pairs → molecular shape.', 'Polar bonds + an asymmetric shape = polar molecule.'],
    checkIn: 'You are ready when you can go from a formula to Lewis structure, shape, hybridization and polarity in one pass. Next: the forces between molecules.',
  },
];

export const CHEM_A_TUTOR: Record<string, LessonTutor> = {
  'ch1-1': {
    bigIdea: [
      'You cannot count atoms, but you can weigh them. If you know how much one mole weighs, a balance becomes an atom counter.',
      'The molar mass is that conversion factor: grams per mole. Divide grams by it to get moles; multiply moles by Avogadro’s number to get particles.',
      'Composition questions are the same idea in reverse: from grams of each element, get moles of each, and the mole ratio is the formula.',
    ],
    picture: { title: 'Buying nails by the pound', t: 'A hardware store does not count nails; it weighs them. If 100 nails weigh 1 pound, then 5 pounds is 500 nails. Molar mass is the “weight of 100 nails” for atoms, scaled up to 6.022×10²³ of them.' },
    words: [
      { term: 'mole', means: '6.022×10²³ particles: a chemist’s “dozen”.' },
      { term: 'molar mass', means: 'The mass of one mole of a substance, in grams per mole.' },
      { term: 'empirical formula', means: 'The simplest whole-number ratio of atoms in a compound.' },
      { term: 'isotope', means: 'Atoms of the same element with different numbers of neutrons, so different masses.' },
    ],
    tools: [{ name: 'Unit conversion', refresher: 'Multiply by a ratio equal to 1 (like 1 mol / 44.01 g) so the units you do not want cancel.' }],
    why: [
      ['The molar mass is the conversion factor between grams and moles, so it comes first.', 'Dividing by g/mol cancels grams and leaves moles.'],
      ['Percents are easiest as grams if the sample is exactly 100 g.', 'Formulas count atoms, so you need moles, not grams.', 'Dividing by the smallest turns the moles into the simplest whole-number ratio.'],
    ],
    walk: {
      'ch1-1-1': [r`Read the formula: one Ca, and two copies of $\text{NO}_3$, so 2 N and 6 O.`, r`Add: $40.08 + 2(14.01) + 6(16.00) = 40.08 + 28.02 + 96.00$.`, r`$= 164.1$ g/mol.`],
      'ch1-1-2': [r`Grams to moles of $\text{CO}_2$: $M = 12.01 + 2(16.00) = 44.01$, so $\frac{10.0}{44.01} = 0.2272$ mol.`, r`Each $\text{CO}_2$ has 2 O atoms, so moles of O $= 0.4544$.`, r`Particles: $0.4544\times 6.022\times 10^{23} = 2.74\times 10^{23}$ O atoms.`],
      'ch1-1-3': [r`Molar mass of $\text{NH}_4\text{NO}_3$: 2 N, 4 H, 3 O, so $28.02 + 4.032 + 48.00 = 80.05$ g/mol.`, r`Mass of N in one mole: $2(14.01) = 28.02$ g.`, r`Percent: $\frac{28.02}{80.05}\times 100 = 35.0\%$.`],
      'ch1-1-4': [r`The mass lost on heating is water: $5.00 - 3.20 = 1.80$ g, which is $\frac{1.80}{18.02} = 0.0999$ mol.`, r`The solid left is $\text{CuSO}_4$, $M = 63.55 + 32.06 + 64.00 = 159.61$: $\frac{3.20}{159.61} = 0.0200$ mol.`, r`Water per $\text{CuSO}_4$: $\frac{0.0999}{0.0200} = 4.98$, so $x = 5$ ($\text{CuSO}_4\cdot 5\text{H}_2\text{O}$).`],
      'ch1-1-5': [r`Turn percents into fractions: 0.601 and 0.399.`, r`Weighted average: $69(0.601) + 71(0.399) = 41.47 + 28.33 = 69.80$.`, r`The closest atomic mass is gallium's, 69.72: the answer is B.`],
      'ch1-1-6': [r`Let $x$ = grams of NaCl, so KCl is $10.00 - x$ grams.`, r`Chlorine from each: NaCl is $\frac{35.45}{58.44} = 60.66\%$ Cl; KCl is $\frac{35.45}{74.55} = 47.55\%$ Cl. So $0.6066x + 0.4755(10.00 - x) = 5.25$.`, r`Expand: $0.6066x + 4.755 - 0.4755x = 5.25$, so $0.1311x = 0.495$ and $x = 3.77$ g NaCl.`],
    },
    teach: {
      plan: ['Show a mole as a counting unit, like a dozen.', 'Model grams → moles → particles with one example.', 'Do percent composition by thinking about one mole of the compound.', 'Run the 100 g empirical-formula table and the hydrate problem.'],
      questions: [
        { q: 'Why assume 100 g for an empirical formula?', a: 'It turns each percent directly into grams. Any mass would work; 100 just makes the arithmetic easy.' },
        { q: 'Why is the average atomic mass not a whole number?', a: 'It is a weighted average of isotopes with different masses, so it falls between them.' },
      ],
      keyPoints: ['Moles are the bridge between grams and particles.', 'Count atoms inside formulas, including subscripts outside parentheses.', 'Formulas come from mole ratios, never mass ratios.'],
    },
  },
  'ch1-2': {
    bigIdea: [
      'Electrons are arranged in shells and subshells, and the arrangement decides how an atom behaves.',
      'Every trend is Coulomb’s law: a stronger pull (more protons, closer shell, less shielding) means a smaller atom that holds its electrons more tightly.',
      'PES is the experimental proof: it measures how tightly each group of electrons is held and how many there are.',
    ],
    picture: { title: 'Magnets and distance', t: 'A strong magnet grabs a paper clip held close but barely tugs on one across the table. Protons are the magnet, electrons the clips, and inner electrons act like a sheet of cardboard that weakens the pull on the outer ones.' },
    words: [
      { term: 'effective nuclear charge', means: 'The pull an outer electron actually feels after inner electrons shield it.' },
      { term: 'ionization energy', means: 'The energy needed to remove an electron from a gaseous atom.' },
      { term: 'binding energy', means: 'In PES, how tightly an electron is held; higher means closer to the nucleus.' },
      { term: 'isoelectronic', means: 'Having the same number of electrons.' },
    ],
    tools: [{ name: 'Moles and particles', refresher: 'Counting electrons is counting particles: the atomic number tells you how many a neutral atom has.', lesson: 'ch1-1' }],
    why: [
      ['The neutral atom fills subshells in energy order.', 'Ions of transition metals empty the outermost (n = 4) shell first.'],
      ['Peak height is proportional to the number of electrons in the subshell.', 'The total number of electrons in a neutral atom is the atomic number.'],
    ],
    walk: {
      'ch1-2-1': [r`Sulfur: $[\text{Ne}]\,3s^2 3p^4$.`, r`Hund's rule: the 3 $p$ orbitals each get one electron before any pairs, so 3 singles, then the 4th pairs with one.`, r`That leaves 2 unpaired electrons.`],
      'ch1-2-2': [r`Across period 2 the pull grows, so IE generally rises: B < C < N.`, r`O breaks the trend: its fourth $2p$ electron shares an orbital and is repelled by its partner, so it is easier to remove than N's.`, r`So N is the largest; the answer is C.`],
      'ch1-2-3': [r`Count electrons: $\text{S}^{2-}$ 18, $\text{Cl}^-$ 18, $\text{K}^+$ 18, $\text{Ca}^{2+}$ 18. Same electrons, so compare protons.`, r`Fewer protons means a weaker pull on the same 18 electrons, so a bigger ion.`, r`S has 16 protons, the fewest, so $\text{S}^{2-}$ is largest (choice A).`],
      'ch1-2-4': [r`Arsenic is element 33, in group 15.`, r`Configuration: $[\text{Ar}]\,4s^2 3d^{10} 4p^3$; the valence shell is $n = 4$.`, r`$4s^2 + 4p^3 = 5$ valence electrons (the $3d$ electrons are inner).`],
      'ch1-2-5': [r`Mg: $[\text{Ne}]\,3s^2$. Al: $[\text{Ne}]\,3s^2 3p^1$.`, r`The electron removed from Al is in $3p$, higher in energy and partly shielded by the $3s$ pair.`, r`So it costs less energy than removing a $3s$ electron from Mg: choice D.`],
      'ch1-2-6': [r`Potassium: $1s^2 2s^2 2p^6 3s^2 3p^6 4s^1$.`, r`The innermost electrons ($1s$) feel almost the full nuclear charge at the smallest distance, so they have the largest binding energy.`, r`There are 2 of them, so the peak height is 2: choice B.`],
    },
    teach: {
      plan: ['Build configurations for a few atoms on the board.', 'Introduce Coulomb’s law as the one reason behind every trend.', 'Read a PES together: position, then height.', 'Explain the B/Be and O/N exceptions.'],
      questions: [
        { q: 'Why do transition metals lose 4s before 3d electrons?', a: 'Once the atom is ionized, the 4s electrons are the outermost and highest in energy, so they leave first.' },
        { q: 'Why is a cation smaller than its atom?', a: 'It lost electrons (often a whole shell), and the remaining electrons are pulled in by the same number of protons.' },
      ],
      keyPoints: ['Every trend answer names protons, distance (shell) and shielding.', 'PES position = binding energy; height = electron count.', 'Isoelectronic: more protons, smaller ion.'],
    },
  },
  'ch2-1': {
    bigIdea: [
      'Bonds are electrostatic attractions. What differs is who holds the electrons: transferred (ionic), shared (covalent) or pooled (metallic).',
      'The strength of ionic attractions follows Coulomb’s law, so charges and sizes predict melting points and lattice energies.',
      'The potential energy curve shows the balance: atoms settle at the distance where the energy is lowest.',
    ],
    picture: { title: 'Two magnets on a table', t: 'Slide two magnets toward each other: they pull together until their cases touch, then you cannot push them closer. The resting distance is the bond length, and the effort to pull them apart is the bond energy.' },
    words: [
      { term: 'lattice energy', means: 'The energy released when gaseous ions form one mole of an ionic solid (or needed to separate it).' },
      { term: 'bond length', means: 'The distance between nuclei at the energy minimum.' },
      { term: 'alloy', means: 'A metal mixture: substitutional (similar sizes) or interstitial (small atoms in gaps).' },
    ],
    tools: [{ name: 'Coulomb’s law and periodic trends', refresher: 'Bigger charges and smaller distances mean stronger attraction.', lesson: 'ch1-2' }],
    why: [
      ['Coulomb’s law depends on the product of the charges.', 'With similar sizes, the charge product decides.'],
      ['The bottom of the curve is the most stable separation.', 'The energy needed to climb out of the well and separate the atoms is the bond energy.'],
    ],
    walk: {
      'ch2-1-1': [r`Charge products: NaCl $1\times 1$, KBr $1\times 1$, MgO $2\times 2$, CaO $2\times 2$.`, r`MgO and CaO lead. Between them, $\text{Mg}^{2+}$ is smaller than $\text{Ca}^{2+}$ (one shell fewer), so its ions sit closer.`, r`Closer and same charges: MgO has the largest lattice energy, choice C.`],
      'ch2-1-2': [r`Coulomb’s law: $F \propto \frac{q_1q_2}{r^2}$, with $r$ the same in both cases.`, r`$q_1q_2$: Mg/O is $2\times 2 = 4$; Na/Cl is $1\times 1 = 1$.`, r`Ratio: $4$.`],
      'ch2-1-3': [r`New charge product: $(2q)(2q) = 4q^2$, four times larger.`, r`New distance squared: $(2r)^2 = 4r^2$, four times larger, which divides the force by 4.`, r`Net factor: $\frac{4}{4} = 1$.`],
      'ch2-1-4': [r`Carbon atoms are much smaller than iron atoms.`, r`Small atoms in the spaces between larger ones make an interstitial alloy.`, r`They pin the layers of iron, so steel is harder: choice B.`],
      'ch2-1-5': [r`Conduction needs mobile charged particles.`, r`Solid NaCl: ions locked in the lattice. $\text{SiO}_2$: covalent network, no free charges. $\text{I}_2$: neutral molecules.`, r`Copper: delocalized electrons move freely, so the answer is A.`],
      'ch2-1-6': [r`The minimum's position (distance) is the bond length; farther right means longer.`, r`The depth is the bond energy; shallower means weaker.`, r`So H–Cl is longer and weaker than H–F: choice D.`],
    },
    teach: {
      plan: ['Sort examples into ionic, covalent and metallic.', 'Rank lattice energies with charge, then size.', 'Draw a potential energy curve and label it.', 'Compare substitutional and interstitial alloys.'],
      questions: [
        { q: 'Why does charge usually matter more than size for lattice energy?', a: 'Charges multiply (2×2 = 4 times stronger), while sizes of similar ions differ by only a small fraction.' },
        { q: 'Why does the curve rise sharply at very short distances?', a: 'The nuclei (and inner electrons) repel each other strongly when pushed too close.' },
      ],
      keyPoints: ['Lattice energy: charges first, then size.', 'Curve minimum = bond length and bond energy.', 'Metals conduct because of delocalized electrons.'],
    },
  },
  'ch2-2': {
    bigIdea: [
      'A Lewis structure is a map of every valence electron: who is bonded to whom, and where the lone pairs sit.',
      'Electron domains push each other as far apart as possible. That repulsion (VSEPR) sets the 3-D shape.',
      'Shape decides polarity: polar bonds only make a polar molecule if they do not cancel.',
    ],
    picture: { title: 'Balloons tied together', t: 'Tie two balloons at their knots and they point opposite ways; three make a flat triangle; four make a tetrahedron. Electron domains arrange themselves the same way, and lone pairs are fatter balloons that squeeze the others.' },
    words: [
      { term: 'formal charge', means: 'A bookkeeping charge for each atom in a Lewis structure; the best structure keeps them near zero.' },
      { term: 'resonance', means: 'When two or more valid Lewis structures differ only in electron placement; the real molecule is their average.' },
      { term: 'hybridization', means: 'The mix of orbitals an atom uses for its domains: 2 → sp, 3 → sp², 4 → sp³.' },
      { term: 'σ and π bonds', means: 'Every bond has one σ; extra bonds in a double or triple bond are π.' },
    ],
    tools: [{ name: 'Valence electrons', refresher: 'Group number (main groups) gives the valence electrons: C 4, N 5, O 6, halogens 7.', lesson: 'ch1-2' }],
    why: [
      ['The total valence electrons limits every Lewis structure.', 'Six domains with two lone pairs placed opposite each other leave a flat square of atoms.'],
      ['Formal charge compares the electrons an atom “owns” in the drawing to its valence electrons.', 'All zeros means this is the best structure.'],
    ],
    walk: {
      'ch2-2-1': [r`S and each O are in group 16: 6 valence electrons each.`, r`$6 + 4(6) = 30$.`, r`The 2− charge adds 2 electrons: 32.`],
      'ch2-2-2': [r`Sulfur has 2 double bonds and 2 single bonds: 6 bonds, so 12 bonding electrons, and no lone pairs.`, r`Formal charge $= 6 - 0 - \frac{12}{2}$.`, r`$= 0$. (The two singly bonded O atoms carry $-1$ each, matching the ion's 2− charge.)`],
      'ch2-2-3': [r`Nitrate has one N=O and two N–O in any one resonance structure.`, r`Count bonds: $2 + 1 + 1 = 4$ bonds spread over 3 N–O positions.`, r`Average bond order $= \frac{4}{3} \approx 1.33$.`],
      'ch2-2-4': [r`N in $\text{NH}_3$: three N–H bonds and one lone pair.`, r`That is 4 electron domains, which need 4 hybrid orbitals.`, r`Four domains means $sp^3$: choice C.`],
      'ch2-2-5': [r`Lewis structure: H–C≡N, with a lone pair on N.`, r`H–C is a single bond: 1 $\sigma$. C≡N is a triple bond: 1 $\sigma$ + 2 $\pi$.`, r`Total $\pi$ bonds: 2.`],
      'ch2-2-6': [r`All four have polar bonds, so look at shape.`, r`$\text{CO}_2$ linear, $\text{CCl}_4$ tetrahedral with identical atoms, $\text{BF}_3$ trigonal planar: dipoles cancel.`, r`$\text{NH}_3$ is trigonal pyramidal (the lone pair breaks the symmetry), so it is polar: choice D.`],
    },
    teach: {
      plan: ['Draw one Lewis structure step by step.', 'Compute formal charges to pick between two drawings.', 'Show resonance with nitrate and compute the bond order.', 'Use the domain table to predict shape, hybridization and polarity.'],
      questions: [
        { q: 'Does resonance mean the molecule flips between structures?', a: 'No. The real molecule is a single blend; all equivalent bonds are identical.' },
        { q: 'Why is CO₂ nonpolar if C=O bonds are polar?', a: 'The two dipoles point in opposite directions on a straight line and cancel.' },
      ],
      keyPoints: ['Count valence electrons first.', 'Domains decide geometry; lone pairs decide the name of the shape.', 'Polarity needs polar bonds AND an asymmetric shape.'],
    },
  },
};

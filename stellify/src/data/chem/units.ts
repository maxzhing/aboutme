import type { CalcUnit } from '../calc/types';

/** AP Chemistry, in the nine units of the College Board course, with the exam weights it publishes. */
export const CHEM_UNITS: CalcUnit[] = [
  { n: 1, title: 'Atomic Structure and Properties', weeks: 3, examWeight: '7–9%', summary: 'Moles and molar mass, mass spectra, composition of substances and mixtures, electron configurations, photoelectron spectroscopy and periodic trends.',
    topics: ['Moles and molar mass', 'Mass spectra of elements', 'Elemental composition of pure substances', 'Composition of mixtures', 'Atomic structure and electron configuration', 'Photoelectron spectroscopy', 'Periodic trends', 'Valence electrons and ionic compounds'] },
  { n: 2, title: 'Compound Structure and Properties', weeks: 2, examWeight: '7–9%', summary: 'Ionic, covalent and metallic bonding, Coulomb’s law and potential energy, Lewis diagrams, formal charge, resonance, VSEPR and hybridization.',
    topics: ['Types of chemical bonds', 'Intramolecular force and potential energy', 'Structure of ionic solids', 'Structure of metals and alloys', 'Lewis diagrams', 'Resonance and formal charge', 'VSEPR and bond hybridization'] },
  { n: 3, title: 'Properties of Substances and Mixtures', weeks: 4, examWeight: '18–22%', summary: 'Intermolecular forces, solids and liquids, the ideal gas law, kinetic molecular theory, solutions, separation, and how light interacts with matter.',
    topics: ['Intermolecular forces', 'Properties of solids', 'Ideal gas law', 'Kinetic molecular theory', 'Deviation from ideal gas law', 'Solutions and mixtures', 'Separation of solutions and mixtures', 'Spectroscopy and the electromagnetic spectrum', 'Beer–Lambert law'] },
  { n: 4, title: 'Chemical Reactions', weeks: 2, examWeight: '7–9%', summary: 'Net ionic equations, physical and chemical change, stoichiometry, titration, and the three reaction types: acid–base, redox and precipitation.',
    topics: ['Introduction for reactions', 'Net ionic equations', 'Physical and chemical changes', 'Stoichiometry', 'Introduction to titration', 'Types of chemical reactions', 'Oxidation–reduction (redox) reactions'] },
  { n: 5, title: 'Kinetics', weeks: 3, examWeight: '7–9%', summary: 'Reaction rates, rate laws, integrated rate laws and half-life, elementary steps, the collision model, energy profiles, mechanisms and catalysis.',
    topics: ['Reaction rates', 'Introduction to rate law', 'Concentration changes over time', 'Elementary reactions', 'Collision model', 'Reaction energy profile', 'Reaction mechanisms and rate laws', 'Catalysis'] },
  { n: 6, title: 'Thermochemistry', weeks: 2, examWeight: '7–9%', summary: 'Heat transfer, calorimetry, phase changes, enthalpy of reaction, bond enthalpies, enthalpies of formation and Hess’s law.',
    topics: ['Endothermic and exothermic processes', 'Energy diagrams', 'Heat transfer and thermal equilibrium', 'Heat capacity and calorimetry', 'Energy of phase changes', 'Bond enthalpies', 'Enthalpy of formation', 'Hess’s law'] },
  { n: 7, title: 'Equilibrium', weeks: 3, examWeight: '7–9%', summary: 'Reversible reactions, Q and K, ICE tables, Le Châtelier’s principle, solubility equilibria (Ksp) and the common-ion effect.',
    topics: ['Introduction to equilibrium', 'Reaction quotient and equilibrium constant', 'Calculating the equilibrium constant', 'Properties of the equilibrium constant', 'Calculating equilibrium concentrations', 'Le Châtelier’s principle', 'Solubility equilibria', 'Common-ion effect'] },
  { n: 8, title: 'Acids and Bases', weeks: 3, examWeight: '11–15%', summary: 'pH and pOH, strong and weak acids and bases, Ka and Kb, buffers and the Henderson–Hasselbalch equation, titration curves and indicators.',
    topics: ['Introduction to acids and bases', 'pH and pOH of strong acids and bases', 'Weak acid and base equilibria', 'Acid–base reactions and buffers', 'Acid–base titrations', 'Molecular structure of acids and bases', 'pH and pKa', 'Properties of buffers', 'Henderson–Hasselbalch equation'] },
  { n: 9, title: 'Applications of Thermodynamics', weeks: 3, examWeight: '7–9%', summary: 'Entropy, Gibbs free energy and thermodynamic favorability, free energy and equilibrium, galvanic and electrolytic cells, cell potential and Faraday’s law.',
    topics: ['Introduction to entropy', 'Absolute entropy and entropy change', 'Gibbs free energy and thermodynamic favorability', 'Thermodynamic and kinetic control', 'Free energy and equilibrium', 'Galvanic and electrolytic cells', 'Cell potential and free energy', 'Electrolysis and Faraday’s law'] },
];

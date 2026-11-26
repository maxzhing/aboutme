/** Numbers and helpers for checking AP Chemistry answers independently of the worked solutions. */

/** Atomic masses as printed on the AP Chemistry periodic table (g/mol). */
export const MASS: Record<string, number> = {
  H: 1.008, He: 4.00, Li: 6.94, Be: 9.01, B: 10.81, C: 12.01, N: 14.01, O: 16.00, F: 19.00, Ne: 20.18,
  Na: 22.99, Mg: 24.30, Al: 26.98, Si: 28.09, P: 30.97, S: 32.06, Cl: 35.45, Ar: 39.95, K: 39.10, Ca: 40.08,
  Cr: 52.00, Mn: 54.94, Fe: 55.85, Co: 58.93, Ni: 58.69, Cu: 63.55, Zn: 65.38, Br: 79.90, Ag: 107.87, I: 126.90, Ba: 137.33, Pb: 207.2,
};
export const R_L = 0.08206; // L·atm/(mol·K)
export const R_J = 8.314; // J/(mol·K)
export const F = 96485; // C/mol e⁻
export const NA = 6.022e23;
export const H_PLANCK = 6.626e-34;
export const C_LIGHT = 2.998e8;

/** molar mass of a formula such as Ca(NO3)2 or CuSO4·5H2O */
export function molarMass(formula: string): number {
  return formula.split(/[·.]/).reduce((sum, part) => {
    const m = part.match(/^(\d+)(.*)$/);
    return sum + (m ? Number(m[1]) * mm(m[2]) : mm(part));
  }, 0);
}
function mm(f: string): number {
  let i = 0;
  const group = (): number => {
    let total = 0;
    while (i < f.length && f[i] !== ')') {
      let v: number;
      if (f[i] === '(') { i++; v = group(); i++; }
      else { const m = f.slice(i).match(/^[A-Z][a-z]?/); if (!m || MASS[m[0]] === undefined) throw new Error(`unknown element in ${f}`); v = MASS[m[0]]; i += m[0].length; }
      const n = f.slice(i).match(/^\d+/); if (n) i += n[0].length;
      total += v * (n ? Number(n[0]) : 1);
    }
    return total;
  };
  return group();
}
export const near = (a: number, b: number, rel = 2e-3) => Math.abs(a - b) <= rel * Math.max(Math.abs(b), 1e-300);
export const log10 = Math.log10;
/** positive root of x² + bx + c = 0 (for equilibrium ICE tables) */
export const posRoot = (b: number, c: number) => (-b + Math.sqrt(b * b - 4 * c)) / 2;

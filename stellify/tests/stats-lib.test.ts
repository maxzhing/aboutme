import { describe, expect, it } from 'vitest';
import { binomCdf, binomPdf, chi2Cdf, invNorm, median, normCdf, quartiles, regression, sd, tCdf, tStar } from '@/data/stats/lib';

/**
 * The AP Statistics answers are verified with a small built-in statistics library. These reference
 * values come from SciPy (scipy.stats), so the library itself is checked, not just the answers.
 */
describe('statistics library agrees with SciPy', () => {
  const close = (got: number, want: number, tol = 2e-7) => expect(Math.abs(got - want)).toBeLessThanOrEqual(tol);
  it('normal', () => {
    close(normCdf(1.25), 0.8943502263331446);
    close(invNorm(0.9), 1.2815515655446004, 1e-6);
  });
  it('t', () => {
    close(tCdf(2, 24), 0.9715300750317042);
    close(tCdf(-1.5, 3), 0.11529193262241147);
    close(tStar(0.95, 15), 2.131449545559776, 1e-6);
    close(tStar(0.95, 18), 2.1009220402410382, 1e-6);
  });
  it('chi-square', () => {
    close(chi2Cdf(4.2, 5), 0.47900504656859483);
    close(chi2Cdf(100 / 11, 1), 0.9974311684729645);
    close(chi2Cdf(30, 20), 0.9301463393005901);
  });
  it('binomial', () => {
    close(binomPdf(10, 0.3, 3), 0.2668279319999998);
    close(binomCdf(10, 0.3, 3), 0.6496107184000002);
  });
  it('AP-style summaries and regression', () => {
    const hw = [12, 15, 15, 18, 20, 22, 25, 25, 25, 31, 48];
    expect(median(hw)).toBe(22);
    expect(quartiles(hw)).toEqual([15, 25]); // the AP method: medians of the halves, leaving out the median
    expect(quartiles([1, 2, 3, 4, 5, 6])).toEqual([2, 5]);
    close(sd([2, 4, 4, 4, 5, 5, 7, 9]), 2.138089935299395);
    const fit = regression([1, 2, 3, 4, 5], [62, 68, 71, 79, 85]);
    close(fit.b, 5.7, 1e-9);
    close(fit.a, 55.9, 1e-9);
    close(fit.r, 0.9922426389474777, 1e-9);
  });
});

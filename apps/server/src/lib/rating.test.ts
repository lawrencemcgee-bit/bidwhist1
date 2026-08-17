import { describe, expect, it } from 'vitest';
import { eloUpdate, expectedScore } from './rating.js';

describe('rating', () => {
  it('expectedScore is 0.5 for equal ratings', () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5);
  });

  it('expectedScore favors the higher-rated player', () => {
    expect(expectedScore(1600, 1200)).toBeGreaterThan(0.5);
    expect(expectedScore(1200, 1600)).toBeLessThan(0.5);
  });

  it('eloUpdate rewards a win and punishes a loss', () => {
    const expected = expectedScore(1200, 1200);
    const afterWin = eloUpdate(1200, expected, 1);
    const afterLoss = eloUpdate(1200, expected, 0);
    expect(afterWin).toBeGreaterThan(1200);
    expect(afterLoss).toBeLessThan(1200);
    expect(afterWin - 1200).toBe(1200 - afterLoss);
  });

  it('upset win gains more than a favored win', () => {
    const favoredExpected = expectedScore(1600, 1200);
    const upsetExpected = expectedScore(1200, 1600);
    expect(eloUpdate(1200, upsetExpected, 1) - 1200).toBeGreaterThan(
      eloUpdate(1600, favoredExpected, 1) - 1600,
    );
  });

  it('returns integers', () => {
    expect(Number.isInteger(eloUpdate(1200, 0.37, 1))).toBe(true);
  });
});

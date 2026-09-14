import { describe, expect, it } from 'vitest';

import { inflateRdForInactivity, updateGlicko2 } from './Glicko2.js';

describe('updateGlicko2', () => {
  it('matches the published single-game win example', () => {
    const result = updateGlicko2(
      { rating: 1500, rd: 200, volatility: 0.06 },
      { rating: 1400, rd: 30, volatility: 0.06 },
      1,
    );

    expect(result.rating).toBeCloseTo(1563.56, 2);
    expect(result.rd).toBeCloseTo(175.4, 2);
    expect(result.volatility).toBeCloseTo(0.059999, 5);
  });

  it('returns symmetric inverse changes for a draw', () => {
    const white = updateGlicko2(
      { rating: 1500, rd: 100, volatility: 0.06 },
      { rating: 1500, rd: 100, volatility: 0.06 },
      0.5,
    );
    const black = updateGlicko2(
      { rating: 1500, rd: 100, volatility: 0.06 },
      { rating: 1500, rd: 100, volatility: 0.06 },
      0.5,
    );

    expect(white.rating).toBe(black.rating);
    expect(white.rd).toBeCloseTo(black.rd, 8);
    expect(white.rating).toBeCloseTo(1500, 8);
  });

  it('rejects invalid outcomes and non-finite values', () => {
    expect(() =>
      updateGlicko2(
        { rating: Number.NaN, rd: 100, volatility: 0.06 },
        { rating: 1500, rd: 100, volatility: 0.06 },
        1,
      ),
    ).toThrow('finite');
    expect(() =>
      updateGlicko2(
        { rating: 1500, rd: 100, volatility: 0.06 },
        { rating: 1500, rd: 100, volatility: 0.06 },
        2,
      ),
    ).toThrow('score');
  });

  it('increases rating deviation once for one inactive rating period', () => {
    const result = inflateRdForInactivity(
      { rating: 1500, rd: 100, volatility: 0.06 },
      7 * 24 * 60 * 60 * 1000,
    );

    expect(result.rating).toBe(1500);
    expect(result.rd).toBeCloseTo(Math.sqrt(100 ** 2 + (0.06 * 173.7178) ** 2), 5);
    expect(result.volatility).toBe(0.06);
  });

  it('caps inactivity growth at the maximum rating deviation', () => {
    expect(
      inflateRdForInactivity({ rating: 1500, rd: 349, volatility: 0.5 }, 52 * 7 * 24 * 60 * 60 * 1000).rd,
    ).toBe(350);
  });
});

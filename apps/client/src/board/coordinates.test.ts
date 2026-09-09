import { describe, expect, it } from 'vitest';

import { squareToWorld, worldToSquare } from './coordinates';

describe('board coordinates', () => {
  it('maps the board corners to world coordinates', () => {
    expect(squareToWorld('a1')).toEqual([-3.5, 0, 3.5]);
    expect(squareToWorld('h8')).toEqual([3.5, 0, -3.5]);
  });

  it('maps world coordinates back to squares', () => {
    expect(worldToSquare(-3.5, 3.5)).toBe('a1');
    expect(worldToSquare(3.5, -3.5)).toBe('h8');
    expect(worldToSquare(4.1, 0)).toBeNull();
  });
});

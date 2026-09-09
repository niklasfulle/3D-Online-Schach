import { describe, expect, it } from 'vitest';

import { STARTING_FEN, createInitialGameState } from './index';

describe('chess core foundation', () => {
  it('creates the standard initial game state', () => {
    expect(createInitialGameState()).toEqual({
      fen: STARTING_FEN,
      activeColor: 'white',
      moveNumber: 1,
    });
  });
});

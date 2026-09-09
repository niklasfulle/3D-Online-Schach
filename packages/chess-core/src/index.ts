import type { Color, Square } from '@chess3d/shared';

export interface GameState {
  fen: string;
  activeColor: Color;
  moveNumber: number;
}

export interface Move {
  from: Square;
  to: Square;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function createInitialGameState(): GameState {
  return {
    fen: STARTING_FEN,
    activeColor: 'white',
    moveNumber: 1,
  };
}

import { describe, expect, it } from 'vitest';

import { STARTING_FEN } from '@chess3d/chess-core';

import { pieceRotationY, piecesFromFen } from './pieces';

describe('piecesFromFen', () => {
  it('creates all 32 pieces with six distinct piece types', () => {
    const pieces = piecesFromFen(STARTING_FEN);

    expect(pieces).toHaveLength(32);
    expect(new Set(pieces.map((piece) => piece.type))).toEqual(
      new Set(['pawn', 'rook', 'knight', 'bishop', 'queen', 'king']),
    );
  });

  it('places a moved pawn on e4 instead of e2', () => {
    const pieces = piecesFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');

    expect(pieces.some((piece) => piece.square === 'e2')).toBe(false);
    expect(pieces).toContainEqual({ color: 'white', square: 'e4', type: 'pawn' });
  });
});

describe('pieceRotationY', () => {
  it('turns both knights toward the opposing side of the board', () => {
    expect(pieceRotationY('knight', 'white')).toBe(Math.PI);
    expect(pieceRotationY('knight', 'black')).toBe(0);
  });

  it('keeps the existing orientation for symmetric pieces', () => {
    expect(pieceRotationY('king', 'white')).toBe(0);
    expect(pieceRotationY('king', 'black')).toBe(Math.PI);
  });
});

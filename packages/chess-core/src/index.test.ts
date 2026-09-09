import { describe, expect, it } from 'vitest';

import { ChessGame, STARTING_FEN, createInitialGameState } from './index';

describe('chess core', () => {
  it('creates the standard initial game state', () => {
    expect(createInitialGameState()).toEqual({
      fen: STARTING_FEN,
      activeColor: 'white',
      moveNumber: 1,
      status: 'active',
    });
  });

  it('returns twenty legal moves from the starting position', () => {
    expect(new ChessGame().legalMoves()).toHaveLength(20);
  });

  it('plays a legal move and records SAN notation', () => {
    const game = new ChessGame();

    const move = game.move({ from: 'e2', to: 'e4' });

    expect(move.san).toBe('e4');
    expect(game.getState().activeColor).toBe('black');
    expect(game.history()).toHaveLength(1);
  });

  it('detects checkmate', () => {
    const game = new ChessGame();

    game.move({ from: 'f2', to: 'f3' });
    game.move({ from: 'e7', to: 'e5' });
    game.move({ from: 'g2', to: 'g4' });
    game.move({ from: 'd8', to: 'h4' });

    expect(game.getState().status).toBe('checkmate');
    expect(game.isGameOver()).toBe(true);
  });

  it('supports castling and promotion', () => {
    const castling = new ChessGame('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    castling.move({ from: 'e1', to: 'g1' });
    expect(castling.history()[0].san).toBe('O-O');

    const promotion = new ChessGame('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
    promotion.move({ from: 'a7', to: 'a8', promotion: 'q' });
    expect(promotion.history()[0].san).toBe('a8=Q+');
  });

  it('covers en passant and basic piece movement', () => {
    const enPassant = new ChessGame('rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3');
    expect(enPassant.legalMoves('e5').some((move) => move.to === 'd6')).toBe(true);

    const knight = new ChessGame('8/8/8/3N4/8/8/8/4K2k w - - 0 1');
    const bishop = new ChessGame('8/8/8/3B4/8/8/8/4K2k w - - 0 1');
    const rook = new ChessGame('8/8/8/3R4/8/8/8/4K2k w - - 0 1');
    const queen = new ChessGame('8/8/8/3Q4/8/8/8/4K2k w - - 0 1');
    const king = new ChessGame('8/8/8/3K4/8/8/8/4k3 w - - 0 1');

    expect(knight.legalMoves('d5').some((move) => move.to === 'f6')).toBe(true);
    expect(bishop.legalMoves('d5').some((move) => move.to === 'h1')).toBe(true);
    expect(rook.legalMoves('d5').some((move) => move.to === 'd8')).toBe(true);
    expect(queen.legalMoves('d5').some((move) => move.to === 'h5')).toBe(true);
    expect(king.legalMoves('d5').some((move) => move.to === 'e6')).toBe(true);
  });

  it('detects stalemate and draw by material or move count', () => {
    expect(new ChessGame('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1').getState().status).toBe('stalemate');
    expect(new ChessGame('8/8/8/8/8/8/8/K6k w - - 0 1').getState().status).toBe('draw');
    expect(new ChessGame('8/8/8/8/8/8/R7/K6k w - - 100 51').getState().status).toBe('draw');
  });
});

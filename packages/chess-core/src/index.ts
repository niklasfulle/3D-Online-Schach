import { Chess, type Move as ChessMove, type Square as ChessSquare } from 'chess.js';

import type { Color, Square } from '@chess3d/shared';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PromotionPiece = 'q' | 'r' | 'b' | 'n';
export type GameStatus = 'active' | 'check' | 'checkmate' | 'stalemate' | 'draw';

export interface GameState {
  fen: string;
  activeColor: Color;
  moveNumber: number;
  status: GameStatus;
}

export interface Move {
  from: Square;
  to: Square;
  promotion?: PromotionPiece;
}

export interface MoveRecord extends Move {
  san: string;
  color: Color;
  piece: PieceType;
  captured?: PieceType;
}

export type PgnHeaders = Record<string, string>;

export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function toColor(color: 'w' | 'b'): Color {
  return color === 'w' ? 'white' : 'black';
}

function toSquare(square: string): Square {
  return square as Square;
}

function toRecord(move: ChessMove): MoveRecord {
  return {
    from: toSquare(move.from),
    to: toSquare(move.to),
    promotion: move.promotion as PromotionPiece | undefined,
    san: move.san,
    color: toColor(move.color),
    piece: move.piece,
    captured: move.captured,
  };
}

export class ChessGame {
  private readonly chess: Chess;

  constructor(fen = STARTING_FEN) {
    this.chess = new Chess(fen);
  }

  static fromPgn(pgn: string): ChessGame {
    const game = new ChessGame();
    game.chess.loadPgn(pgn);
    return game;
  }

  toPgn(headers: PgnHeaders = {}): string {
    for (const [key, value] of Object.entries(headers)) this.chess.header(key, value);
    return this.chess.pgn();
  }

  getState(): GameState {
    const [, , , , , fullMoveNumber] = this.chess.fen().split(' ');

    return {
      fen: this.chess.fen(),
      activeColor: toColor(this.chess.turn()),
      moveNumber: Number(fullMoveNumber),
      status: this.getStatus(),
    };
  }

  getStatus(): GameStatus {
    if (this.chess.isCheckmate()) return 'checkmate';
    if (this.chess.isStalemate()) return 'stalemate';
    if (this.chess.isDraw()) return 'draw';
    if (this.chess.isCheck()) return 'check';
    return 'active';
  }

  legalMoves(from?: Square): MoveRecord[] {
    const moves = from
      ? this.chess.moves({ square: from as ChessSquare, verbose: true })
      : this.chess.moves({ verbose: true });

    return moves.map(toRecord);
  }

  move(move: Move): MoveRecord {
    const playedMove = this.chess.move({
      from: move.from as ChessSquare,
      to: move.to as ChessSquare,
      promotion: move.promotion,
    });

    return toRecord(playedMove);
  }

  history(): MoveRecord[] {
    return this.chess.history({ verbose: true }).map(toRecord);
  }

  isGameOver(): boolean {
    return this.chess.isGameOver();
  }
}

export function createInitialGameState(): GameState {
  return new ChessGame().getState();
}

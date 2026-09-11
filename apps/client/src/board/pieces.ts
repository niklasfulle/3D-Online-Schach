import type { Square } from '@chess3d/shared';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type PieceColor = 'white' | 'black';

export interface PieceDefinition {
  color: PieceColor;
  square: Square;
  type: PieceType;
}

const PIECE_TYPES: Record<string, PieceType> = {
  b: 'bishop',
  k: 'king',
  n: 'knight',
  p: 'pawn',
  q: 'queen',
  r: 'rook',
};

export function pieceRotationY(type: PieceType, color: PieceColor): number {
  const colorRotation = color === 'black' ? Math.PI : 0;
  return type === 'knight' ? (colorRotation + Math.PI) % (Math.PI * 2) : colorRotation;
}

export function piecesFromFen(fen: string): PieceDefinition[] {
  const board = fen.split(' ')[0];
  const fenRanks = board?.split('/');
  if (fenRanks?.length !== 8) throw new Error('Invalid FEN board');

  return fenRanks.flatMap((fenRank, rankIndex) => {
    const rank = 8 - rankIndex;
    const pieces: PieceDefinition[] = [];
    let fileIndex = 0;

    for (const symbol of fenRank) {
      const emptySquares = Number(symbol);
      if (Number.isInteger(emptySquares) && emptySquares > 0) {
        fileIndex += emptySquares;
        continue;
      }

      const type = PIECE_TYPES[symbol.toLowerCase()];
      const file = FILES[fileIndex];
      if (!type || !file) throw new Error('Invalid FEN piece placement');

      pieces.push({
        color: symbol === symbol.toUpperCase() ? 'white' : 'black',
        square: `${file}${rank}` as Square,
        type,
      });
      fileIndex += 1;
    }

    if (fileIndex !== 8) throw new Error('Invalid FEN rank width');
    return pieces;
  });
}

import type { Square } from '@chess3d/shared';

export const BOARD_SIZE = 8;
export const TILE_SIZE = 1;

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

export type WorldPosition = readonly [x: number, y: number, z: number];

export function squareToWorld(square: Square, y = 0): WorldPosition {
  const file = FILES.indexOf(square[0] as (typeof FILES)[number]);
  const rank = Number(square[1]) - 1;

  if (file < 0 || rank < 0 || rank >= BOARD_SIZE) {
    throw new Error(`Invalid chess square: ${square}`);
  }

  return [(file - 3.5) * TILE_SIZE, y, (3.5 - rank) * TILE_SIZE];
}

export function worldToSquare(x: number, z: number): Square | null {
  const file = Math.floor(x / TILE_SIZE + 4);
  const rank = Math.floor(4 - z / TILE_SIZE) + 1;

  if (file < 0 || file >= BOARD_SIZE || rank < 1 || rank > BOARD_SIZE) {
    return null;
  }

  return `${FILES[file]}${rank}` as Square;
}

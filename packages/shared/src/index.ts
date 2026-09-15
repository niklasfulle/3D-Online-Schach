export type Color = 'white' | 'black';
export { APP_VERSION } from './version.js';
export type GameStatus = 'waiting' | 'active' | 'finished';
export type GameMode = 'casual' | 'ranked' | 'correspondence';
export type UserRole = 'user' | 'admin' | 'spectator';
export type Square =
  `${'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'}${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;

export interface TimeControl {
  initialMs: number;
  incrementMs: number;
  unlimited?: boolean;
}

export interface MoveRequest {
  gameId: string;
  from: Square;
  to: Square;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export interface GameSummary {
  id: string;
  code: string;
  status: GameStatus;
  mode?: GameMode;
  opponentType?: 'human' | 'stockfish';
  engineLevel?: number;
  whitePlayerId?: string;
  blackPlayerId?: string;
  timeControl: TimeControl;
  whiteRemainingMs: number;
  blackRemainingMs: number;
  expiresAt?: number;
  startedAt?: number;
  turnStartedAt?: number;
  finishedAt?: number;
  result?: 'white' | 'black' | 'draw';
}

export interface TimedMove {
  from: Square;
  to: Square;
  promotion?: 'q' | 'r' | 'b' | 'n';
  san: string;
  color: Color;
  piece: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  captured?: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  elapsedMs: number;
}

export interface WebSocketEventMap {
  'game:create': undefined;
  'game:join': { code: string };
  'game:start': GameSummary;
  'move:request': MoveRequest;
  'move:accepted': MoveRequest & { fen: string; elapsedMs: number };
  'move:rejected': { reason: string };
  'game:state': GameSummary & { fen: string };
  'game:ended': { gameId: string; result: 'white' | 'black' | 'draw' };
}

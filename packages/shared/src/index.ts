export type Color = 'white' | 'black';
export type GameStatus = 'waiting' | 'active' | 'finished';
export type GameMode = 'casual' | 'ranked';
export type Square =
  `${'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'}${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;

export interface TimeControl {
  initialMs: number;
  incrementMs: number;
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
  whitePlayerId?: string;
  blackPlayerId?: string;
  timeControl: TimeControl;
  whiteRemainingMs: number;
  blackRemainingMs: number;
  turnStartedAt?: number;
  result?: 'white' | 'black' | 'draw';
}

export interface WebSocketEventMap {
  'game:create': undefined;
  'game:join': { code: string };
  'game:start': GameSummary;
  'move:request': MoveRequest;
  'move:accepted': MoveRequest & { fen: string };
  'move:rejected': { reason: string };
  'game:state': GameSummary & { fen: string };
  'game:ended': { gameId: string; result: 'white' | 'black' | 'draw' };
}

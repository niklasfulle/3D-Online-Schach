export type Color = 'white' | 'black';
export type GameStatus = 'waiting' | 'active' | 'finished';
export type Square =
  `${'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'}${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;

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
  whitePlayerId?: string;
  blackPlayerId?: string;
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

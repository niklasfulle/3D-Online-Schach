import { randomInt } from 'node:crypto';

import type { GameSummary } from '@chess3d/shared';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

export class GameManager {
  private readonly games = new Map<string, GameSummary>();

  createGame(whitePlayerId: string): GameSummary {
    let code = this.createCode();
    while (this.games.has(code)) code = this.createCode();

    const game: GameSummary = {
      id: crypto.randomUUID(),
      code,
      status: 'waiting',
      whitePlayerId,
    };
    this.games.set(code, game);
    return game;
  }

  joinGame(code: string, blackPlayerId: string): GameSummary {
    const game = this.getGame(code);
    if (!game) throw new Error('Game not found');
    if (game.status !== 'waiting') throw new Error('Game is not waiting for a player');
    if (game.whitePlayerId === blackPlayerId) throw new Error('Player is already in this game');

    const joinedGame: GameSummary = {
      ...game,
      blackPlayerId,
      status: 'active',
    };
    this.games.set(game.code, joinedGame);
    return joinedGame;
  }

  getGame(code: string): GameSummary | undefined {
    return this.games.get(code.toUpperCase());
  }

  private createCode(): string {
    return Array.from(
      { length: CODE_LENGTH },
      () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)],
    ).join('');
  }
}

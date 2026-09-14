import { describe, expect, it, vi } from 'vitest';

import { ChessGame } from '@chess3d/chess-core';
import { PrismaGamePersistence } from './PrismaGamePersistence.js';

const baseSummary = {
  id: 'game-1',
  code: 'ABC123',
  mode: 'casual' as const,
  status: 'active' as const,
  whitePlayerId: 'alice',
  blackPlayerId: 'bob',
  timeControl: { initialMs: 300_000, incrementMs: 1_000 },
  whiteRemainingMs: 300_000,
  blackRemainingMs: 300_000,
  result: undefined,
  turnStartedAt: Date.parse('2026-09-11T12:00:00.000Z'),
};

function createClient(): any {
  const client: any = {
    user: {
      findUnique: vi.fn(async () => undefined),
      update: vi.fn(async () => undefined),
      upsert: vi.fn(async ({ where }: { where: { username: string } }) => ({ id: where.username })),
    },
    game: { upsert: vi.fn(), findUnique: vi.fn() },
    move: { upsert: vi.fn() },
  };
  client.$transaction = vi.fn(async (callback: (transaction: any) => Promise<unknown>) => callback(client));
  return client;
}

describe('PrismaGamePersistence', () => {
  it('saves a game and resolves the winner only for decisive results', async () => {
    const client = createClient();
    const persistence = new PrismaGamePersistence(client);
    await persistence.saveGame({ ...baseSummary, result: 'white' }, 'fen-white');
    expect(client.game.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'game-1' },
        create: expect.objectContaining({
          whitePlayerId: 'alice',
          blackPlayerId: 'bob',
          winnerId: 'alice',
        }),
      }),
    );

    await persistence.saveGame(
      { ...baseSummary, status: 'finished', result: 'draw', turnStartedAt: undefined },
      'fen-draw',
    );
    expect(client.game.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          winnerId: undefined,
          startedAt: undefined,
          finishedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('saves moves after the game snapshot', async () => {
    const client = createClient();
    const persistence = new PrismaGamePersistence(client);
    const move = new ChessGame().move({ from: 'e2', to: 'e4' });
    await persistence.saveMove(baseSummary, move, new ChessGame().getState().fen, 1);
    expect(client.game.upsert).toHaveBeenCalledOnce();
    expect(client.move.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { gameId_moveNumber: { gameId: 'game-1', moveNumber: 1 } },
        create: expect.objectContaining({ from: 'e2', to: 'e4', san: 'e4', playerId: 'alice' }),
      }),
    );
  });

  it('preserves existing user ids instead of creating users named after those ids', async () => {
    const client = createClient();
    client.user.findUnique = vi.fn(async ({ where }: { where: { id: string } }) =>
      where.id === 'user-1' ? { id: 'user-1' } : undefined,
    );
    const persistence = new PrismaGamePersistence(client);

    await persistence.saveGame(
      { ...baseSummary, whitePlayerId: 'user-1', blackPlayerId: undefined },
      'fen-existing-user',
    );

    expect(client.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' } }),
    );
    expect(client.user.upsert).not.toHaveBeenCalled();
    expect(client.game.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ whitePlayerId: 'user-1', blackPlayerId: undefined }),
      }),
    );
  });

  it('loads a persisted history, normalizes unknown values, and handles missing games', async () => {
    const client = createClient();
    const persistence = new PrismaGamePersistence(client);
    client.game.findUnique = vi.fn(async () => null);
    await expect(persistence.loadHistory('missing')).resolves.toBeUndefined();

    client.game.findUnique = vi.fn(async () => ({
      id: 'game-1',
      code: 'ABC123',
      mode: 'unknown',
      status: 'unknown',
      initialFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      currentFen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      whiteTimeMs: 300_000,
      blackTimeMs: 300_000,
      incrementMs: 1_000,
      result: null,
      startedAt: null,
      whitePlayer: { username: 'alice' },
      blackPlayer: { username: 'bob' },
      moves: [{ from: 'e2', to: 'e4', promotion: null, moveNumber: 1 }],
    }));
    const history = await persistence.loadHistory('abc123');
    expect(history?.game.mode).toBe('casual');
    expect(history?.game.status).toBe('finished');
    expect(history?.game.result).toBeUndefined();
    expect(history?.moves[0].san).toBe('e4');
    expect(history?.pgn).toContain('1. e4');
    expect(client.game.findUnique).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { code: 'ABC123' } }),
    );
  });

  it('rolls back the game snapshot when atomic rating persistence fails', async () => {
    const client = createClient();
    const recorder = {
      recordGame: vi.fn(),
      recordGameInTransaction: vi.fn(async () => {
        throw new Error('rating write failed');
      }),
    };
    const persistence = new PrismaGamePersistence(client, recorder);

    await expect(
      persistence.saveGame(
        {
          ...baseSummary,
          mode: 'ranked',
          status: 'finished',
          result: 'white',
          finishedAt: Date.parse('2026-09-11T12:05:00.000Z'),
        },
        'fen-finished',
      ),
    ).rejects.toThrow('rating write failed');
    expect(client.$transaction).toHaveBeenCalledOnce();
    expect(recorder.recordGame).not.toHaveBeenCalled();
  });
});

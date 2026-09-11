import { describe, expect, it, vi } from 'vitest';

import type { GameSummary } from '@chess3d/shared';

import {
  EXPIRED_GAME_CLEANUP_INTERVAL_MS,
  ExpiredGamesWorker,
  type ExpiredGameCleanup,
} from './ExpiredGamesWorker.js';

function game(code: string): GameSummary {
  return {
    id: code,
    code,
    mode: 'casual',
    status: 'waiting',
    whitePlayerId: 'white',
    timeControl: { initialMs: 300_000, incrementMs: 0 },
    whiteRemainingMs: 300_000,
    blackRemainingMs: 300_000,
  };
}

function cleanup(overrides: Partial<ExpiredGameCleanup> = {}): ExpiredGameCleanup {
  return {
    getExpiredWaitingGames: () => [game('ABC123'), game('DEF456')],
    removeExpiredGame: vi.fn(() => true),
    flushPersistence: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('ExpiredGamesWorker', () => {
  it('removes every expired game and flushes persistence once', async () => {
    const manager = cleanup();
    const worker = new ExpiredGamesWorker(manager);

    await expect(worker.runOnce()).resolves.toBe(2);
    expect(manager.removeExpiredGame).toHaveBeenCalledWith('ABC123');
    expect(manager.removeExpiredGame).toHaveBeenCalledWith('DEF456');
    expect(manager.flushPersistence).toHaveBeenCalledOnce();
  });

  it('does not flush when no expired game can be removed', async () => {
    const manager = cleanup({
      getExpiredWaitingGames: () => [],
      removeExpiredGame: () => false,
    });
    const worker = new ExpiredGamesWorker(manager);

    await expect(worker.runOnce()).resolves.toBe(0);
    expect(manager.flushPersistence).not.toHaveBeenCalled();
  });

  it('starts only one interval and stops it again', () => {
    const manager = cleanup();
    const schedule = vi.fn().mockReturnValue('timer');
    const cancel = vi.fn();
    const worker = new ExpiredGamesWorker(manager, {
      schedule,
      cancel,
      intervalMs: 1234,
    });

    worker.start();
    worker.start();
    worker.stop();
    worker.stop();

    expect(schedule).toHaveBeenCalledOnce();
    expect(schedule).toHaveBeenCalledWith(expect.any(Function), 1234);
    expect(cancel).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledWith('timer');
  });

  it('uses the production interval by default', () => {
    const manager = cleanup();
    const schedule = vi.fn().mockReturnValue('timer');
    const worker = new ExpiredGamesWorker(manager, { schedule });

    worker.start();

    expect(schedule).toHaveBeenCalledWith(expect.any(Function), EXPIRED_GAME_CLEANUP_INTERVAL_MS);
  });

  it('does not overlap cleanup runs', async () => {
    let resolveFlush: (() => void) | undefined;
    const flushPersistence = vi.fn(() => new Promise<void>((resolve) => (resolveFlush = resolve)));
    const manager = cleanup({ flushPersistence });
    const worker = new ExpiredGamesWorker(manager);

    const firstRun = worker.runOnce();
    await vi.waitFor(() => expect(flushPersistence).toHaveBeenCalledOnce());
    await expect(worker.runOnce()).resolves.toBe(0);

    resolveFlush?.();
    await expect(firstRun).resolves.toBe(2);
  });
});

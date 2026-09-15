import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

import { describe, expect, it, vi } from 'vitest';

import {
  StockfishEngine,
  stockfishEngineOptionsFromEnv,
  type StockfishProcess,
} from './StockfishEngine.js';

class FakeStockfishProcess extends EventEmitter implements StockfishProcess {
  readonly stdout = new PassThrough();
  readonly stderr = new PassThrough();
  readonly commands: string[] = [];
  readonly stdin = {
    write: (chunk: string) => {
      for (const command of chunk.trim().split('\n')) {
        this.commands.push(command);
        if (command === 'uci') {
          this.stdout.write('option name Skill Level type spin default 20 min 0 max 20\nuciok\n');
        } else if (command === 'isready') {
          this.stdout.write('readyok\n');
        } else if (command.startsWith('go ') && this.respondToSearch) {
          this.stdout.write('bestmove e7e5\n');
        }
      }
      return true;
    },
  };
  readonly kill = vi.fn(() => true);

  constructor(private readonly respondToSearch = true) {
    super();
  }
}

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('StockfishEngine UCI adapter', () => {
  it('initializes the worker, configures the requested skill and parses UCI moves', async () => {
    const process = new FakeStockfishProcess();
    const spawn = vi.fn(() => process);
    const engine = new StockfishEngine({ spawnProcess: spawn, enginePath: 'stockfish-test.js' });

    const move = await engine.getBestMove(
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      0,
    );

    expect(spawn).toHaveBeenCalledOnce();
    expect(process.commands).toContain('setoption name Skill Level value 0');
    expect(process.commands).toContain(
      'position fen rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    );
    expect(move).toEqual({ from: 'e7', to: 'e5' });
    await engine.close();
    expect(process.kill).toHaveBeenCalledOnce();
  });

  it('supports the strongest level 20 and promotion notation', async () => {
    const process = new FakeStockfishProcess();
    process.stdin.write = (chunk: string) => {
      for (const command of chunk.trim().split('\n')) {
        process.commands.push(command);
        if (command === 'uci') {
          process.stdout.write('option name Skill Level type spin default 20 min 0 max 20\nuciok\n');
        } else if (command === 'isready') {
          process.stdout.write('readyok\n');
        } else if (command.startsWith('go ')) {
          process.stdout.write('bestmove a2a1q\n');
        }
      }
      return true;
    };
    const engine = new StockfishEngine({ spawnProcess: () => process, enginePath: 'stockfish-test.js' });

    await expect(engine.getBestMove(STARTING_FEN, 20)).resolves.toEqual({
      from: 'a2',
      to: 'a1',
      promotion: 'q',
    });
    expect(process.commands).toContain('setoption name Skill Level value 20');
    await engine.close();
  });

  it.each(Array.from({ length: 21 }, (_, level) => level))(
    'sends skill level %i to the Stockfish worker',
    async (level) => {
      const process = new FakeStockfishProcess();
      const engine = new StockfishEngine({
        spawnProcess: () => process,
        enginePath: 'stockfish-test.js',
      });

      await engine.getBestMove(STARTING_FEN, level);

      expect(process.commands).toContain(`setoption name Skill Level value ${level}`);
      await engine.close();
    },
  );

  it('rejects values outside Stockfish skill levels 0–20 without starting a worker', async () => {
    const spawn = vi.fn();
    const engine = new StockfishEngine({ spawnProcess: spawn, enginePath: 'stockfish-test.js' });

    await expect(engine.getBestMove('fen', 21)).rejects.toThrow(
      'Engine level must be between 0 and 20',
    );
    expect(spawn).not.toHaveBeenCalled();
  });

  it('rejects an invalid chess position before starting a worker', async () => {
    const spawn = vi.fn();
    const engine = new StockfishEngine({ spawnProcess: spawn, enginePath: 'stockfish-test.js' });

    await expect(engine.getBestMove('not-a-fen', 8)).rejects.toThrow('Invalid FEN position');
    expect(spawn).not.toHaveBeenCalled();
  });

  it('kills a worker that does not answer a search before its timeout', async () => {
    const process = new FakeStockfishProcess(false);
    const engine = new StockfishEngine({
      spawnProcess: () => process,
      enginePath: 'stockfish-test.js',
      responseTimeoutMs: 20,
    });

    await expect(engine.getBestMove(STARTING_FEN, 8)).rejects.toThrow(
      'Stockfish did not respond',
    );
    expect(process.kill).toHaveBeenCalledOnce();
    await engine.close();
  });

  it('runs the configured worker count in parallel and rejects work beyond its queue limit', async () => {
    const workers: FakeStockfishProcess[] = [];
    const engine = new StockfishEngine({
      workerCount: 2,
      maxQueuedRequests: 0,
      enginePath: 'stockfish-test.js',
      spawnProcess: () => {
        const process = new FakeStockfishProcess();
        workers.push(process);
        return process;
      },
    } as never);

    try {
      const first = engine.getBestMove(STARTING_FEN, 8);
      const second = engine.getBestMove(STARTING_FEN, 8);

      await expect(engine.getBestMove(STARTING_FEN, 8)).rejects.toThrow('at capacity');
      await expect(Promise.all([first, second])).resolves.toEqual([
        { from: 'e7', to: 'e5' },
        { from: 'e7', to: 'e5' },
      ]);
      expect(workers).toHaveLength(2);
    } finally {
      await engine.close();
    }
  });

  it('restarts a crashed worker for the next valid request', async () => {
    const workers: FakeStockfishProcess[] = [];
    const engine = new StockfishEngine({
      enginePath: 'stockfish-test.js',
      spawnProcess: () => {
        const process = new FakeStockfishProcess(workers.length > 0);
        workers.push(process);
        return process;
      },
    });

    const firstRequest = engine.getBestMove(STARTING_FEN, 8);
    await vi.waitFor(() => expect(workers[0]?.commands).toContain('go movetime 750'));
    workers[0].emit('exit', 1, null);
    await expect(firstRequest).rejects.toThrow('Stockfish worker exited (1)');

    await expect(engine.getBestMove(STARTING_FEN, 8)).resolves.toEqual({
      from: 'e7',
      to: 'e5',
    });
    expect(workers).toHaveLength(2);
    await engine.close();
  });

  it('reads bounded worker and search limits from server environment', () => {
    expect(
      stockfishEngineOptionsFromEnv({
        STOCKFISH_WORKER_COUNT: '2',
        STOCKFISH_MAX_QUEUED_REQUESTS: '8',
        STOCKFISH_SEARCH_TIME_MS: '1200',
        STOCKFISH_RESPONSE_TIMEOUT_MS: '6000',
      }),
    ).toEqual({
      workerCount: 2,
      maxQueuedRequests: 8,
      searchTimeMs: 1200,
      responseTimeoutMs: 6000,
    });
  });

  it('rejects engine environment values beyond safe resource bounds', () => {
    expect(() => stockfishEngineOptionsFromEnv({ STOCKFISH_WORKER_COUNT: '5' })).toThrow(
      'STOCKFISH_WORKER_COUNT must be an integer between 1 and 4',
    );
    expect(() =>
      stockfishEngineOptionsFromEnv({
        STOCKFISH_SEARCH_TIME_MS: '1000',
        STOCKFISH_RESPONSE_TIMEOUT_MS: '1000',
      }),
    ).toThrow('STOCKFISH_RESPONSE_TIMEOUT_MS must exceed STOCKFISH_SEARCH_TIME_MS');
  });

  it('does not restart the worker after it has been closed', async () => {
    const spawn = vi.fn();
    const engine = new StockfishEngine({ spawnProcess: spawn, enginePath: 'stockfish-test.js' });
    await engine.close();

    await expect(engine.getBestMove('fen', 8)).rejects.toThrow('Stockfish worker was closed');
    expect(spawn).not.toHaveBeenCalled();
  });
});

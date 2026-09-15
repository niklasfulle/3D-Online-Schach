import { spawn, type SpawnOptions } from 'node:child_process';
import { createInterface, type Interface as ReadLineInterface } from 'node:readline';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { Readable } from 'node:stream';

import { ChessGame, type Move } from '@chess3d/chess-core';

const ENGINE_LEVEL_MIN = 0;
const ENGINE_LEVEL_MAX = 20;
const DEFAULT_SEARCH_TIME_MS = 750;
const DEFAULT_RESPONSE_TIMEOUT_MS = 20_000;
const DEFAULT_WORKER_COUNT = 1;
const DEFAULT_MAX_QUEUED_REQUESTS = 16;
const MAX_WORKER_COUNT = 4;
const MAX_QUEUED_REQUESTS = 128;
const UCI_BINARY = 'stockfish-18-lite-single.js';

export interface StockfishProcess {
  stdin: { write(data: string): boolean };
  stdout: Readable;
  stderr: Readable;
  once(event: 'error', listener: (error: Error) => void): this;
  once(
    event: 'exit',
    listener: (code: number | null, signal: NodeJS.Signals | null) => void,
  ): this;
  kill(signal?: NodeJS.Signals): boolean;
}

export type SpawnStockfish = (
  command: string,
  args: string[],
  options: SpawnOptions,
) => StockfishProcess;

export interface StockfishEngineOptions {
  workerCount?: number;
  maxQueuedRequests?: number;
  searchTimeMs?: number;
  responseTimeoutMs?: number;
  enginePath?: string;
  spawnProcess?: SpawnStockfish;
}

interface EngineRequest {
  fen: string;
  level: number;
  resolve: (move: Move) => void;
  reject: (error: Error) => void;
}

interface WorkerSlot {
  worker: StockfishUciWorker;
  busy: boolean;
}

interface Waiter {
  promise: Promise<string>;
  matches: (line: string) => boolean;
  resolve: (line: string) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const require = createRequire(import.meta.url);
const packageEntry = require.resolve('stockfish');
const defaultEnginePath = join(dirname(packageEntry), 'bin', UCI_BINARY);

export class StockfishEngine {
  private closed = false;
  private readonly workers: WorkerSlot[];
  private readonly queue: EngineRequest[] = [];
  private readonly maxQueuedRequests: number;

  constructor(private readonly options: StockfishEngineOptions = {}) {
    const workerCount = options.workerCount ?? DEFAULT_WORKER_COUNT;
    if (!Number.isInteger(workerCount) || workerCount < 1 || workerCount > MAX_WORKER_COUNT) {
      throw new Error(`Stockfish worker count must be between 1 and ${MAX_WORKER_COUNT}`);
    }

    this.maxQueuedRequests = options.maxQueuedRequests ?? DEFAULT_MAX_QUEUED_REQUESTS;
    if (
      !Number.isInteger(this.maxQueuedRequests) ||
      this.maxQueuedRequests < 0 ||
      this.maxQueuedRequests > MAX_QUEUED_REQUESTS
    ) {
      throw new Error(`Stockfish queue limit must be between 0 and ${MAX_QUEUED_REQUESTS}`);
    }
    this.workers = Array.from({ length: workerCount }, () => ({
      worker: new StockfishUciWorker(options),
      busy: false,
    }));
  }

  async getBestMove(fen: string, level: number): Promise<Move> {
    if (this.closed) return Promise.reject(new Error('Stockfish worker was closed'));
    validateEngineLevel(level);
    validatePosition(fen);

    return new Promise<Move>((resolve, reject) => {
      const idleWorker = this.workers.some(({ busy }) => !busy);
      if (!idleWorker && this.queue.length >= this.maxQueuedRequests) {
        reject(new Error('Stockfish engine is at capacity'));
        return;
      }
      this.queue.push({ fen, level, resolve, reject });
      this.processQueue();
    });
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    for (const request of this.queue.splice(0)) {
      request.reject(new Error('Stockfish worker was closed'));
    }
    await Promise.all(this.workers.map(({ worker }) => worker.close()));
  }

  private processQueue(): void {
    if (this.closed) return;

    for (const slot of this.workers) {
      if (slot.busy) continue;
      const request = this.queue.shift();
      if (!request) return;

      slot.busy = true;
      void slot.worker
        .getBestMove(request.fen, request.level)
        .then(request.resolve, request.reject)
        .finally(() => {
          slot.busy = false;
          this.processQueue();
        });
    }
  }
}

export function stockfishEngineOptionsFromEnv(
  env: NodeJS.ProcessEnv,
): Pick<StockfishEngineOptions, 'workerCount' | 'maxQueuedRequests' | 'searchTimeMs' | 'responseTimeoutMs'> {
  const options = {
    workerCount: readIntegerEnv(env, 'STOCKFISH_WORKER_COUNT', DEFAULT_WORKER_COUNT, 1, MAX_WORKER_COUNT),
    maxQueuedRequests: readIntegerEnv(
      env,
      'STOCKFISH_MAX_QUEUED_REQUESTS',
      DEFAULT_MAX_QUEUED_REQUESTS,
      0,
      MAX_QUEUED_REQUESTS,
    ),
    searchTimeMs: readIntegerEnv(env, 'STOCKFISH_SEARCH_TIME_MS', DEFAULT_SEARCH_TIME_MS, 50, 5_000),
    responseTimeoutMs: readIntegerEnv(
      env,
      'STOCKFISH_RESPONSE_TIMEOUT_MS',
      DEFAULT_RESPONSE_TIMEOUT_MS,
      100,
      30_000,
    ),
  };
  if (options.responseTimeoutMs <= options.searchTimeMs) {
    throw new Error('STOCKFISH_RESPONSE_TIMEOUT_MS must exceed STOCKFISH_SEARCH_TIME_MS');
  }
  return options;
}

class StockfishUciWorker {
  private closed = false;
  private child: StockfishProcess | undefined;
  private lines: ReadLineInterface | undefined;
  private startup: Promise<void> | undefined;
  private readonly waiters = new Set<Waiter>();
  private readonly spawnProcess: SpawnStockfish;

  constructor(private readonly options: StockfishEngineOptions) {
    this.spawnProcess = options.spawnProcess ?? (spawn as unknown as SpawnStockfish);
  }

  async getBestMove(fen: string, level: number): Promise<Move> {
    if (this.closed) throw new Error('Stockfish worker was closed');
    await this.start();
    const child = this.child;
    if (!child) throw new Error('Stockfish worker is not running');

    try {
      child.stdin.write(`setoption name Skill Level value ${level}\n`);
      child.stdin.write('ucinewgame\n');
      await this.sendAndWait('isready', (line) => line === 'readyok');
      child.stdin.write(`position fen ${fen}\n`);
      const bestMove = await this.sendAndWait(
        `go movetime ${this.options.searchTimeMs ?? DEFAULT_SEARCH_TIME_MS}`,
        (line) => line.startsWith('bestmove '),
      );
      return parseUciMove(bestMove);
    } catch (error) {
      this.failWorker(child, error instanceof Error ? error : new Error('Stockfish search failed'));
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    const child = this.child;
    this.child = undefined;
    this.startup = undefined;
    this.lines?.close();
    this.lines = undefined;
    this.rejectWaiters(new Error('Stockfish worker was closed'));
    if (!child) return;
    try {
      child.stdin.write('quit\n');
    } finally {
      child.kill();
    }
  }

  private async start(): Promise<void> {
    if (this.closed) throw new Error('Stockfish worker was closed');
    if (this.startup) return this.startup;
    const child = this.spawnProcess(
      process.execPath,
      [this.options.enginePath ?? defaultEnginePath],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );
    this.child = child;
    child.stderr.resume();
    this.lines = createInterface({ input: child.stdout });
    this.lines.on('line', (line) => this.receiveLine(line));
    child.once('error', (error) => this.failWorker(child, error));
    child.once('exit', (code, signal) => {
      this.failWorker(child, new Error(`Stockfish worker exited (${code ?? signal ?? 'unknown'})`));
    });

    this.startup = (async () => {
      const handshakeLines: string[] = [];
      await this.sendAndWait('uci', (line) => {
        if (line === 'uciok') return true;
        handshakeLines.push(line);
        return false;
      });
      const options = [
        ...handshakeLines.join('\n').matchAll(
          /option name Skill Level type spin[^\n]*min (\d+) max (\d+)/g,
        ),
      ];
      const range = options[0];
      if (!range || Number(range[1]) > ENGINE_LEVEL_MIN || Number(range[2]) < ENGINE_LEVEL_MAX) {
        throw new Error('Stockfish worker does not support skill levels 0–20');
      }
      child.stdin.write('setoption name Threads value 1\n');
      await this.sendAndWait('isready', (line) => line === 'readyok');
    })().catch((error: unknown) => {
      this.failWorker(child, error instanceof Error ? error : new Error('Unable to start Stockfish'));
      throw error;
    });

    return this.startup;
  }

  private sendAndWait(command: string, matches: (line: string) => boolean): Promise<string> {
    const waiter = this.createWaiter(matches);
    try {
      if (!this.child) throw new Error('Stockfish worker is not running');
      this.child.stdin.write(`${command}\n`);
    } catch (error) {
      this.removeWaiter(waiter);
      waiter.reject(error instanceof Error ? error : new Error('Unable to send Stockfish command'));
    }
    return waiter.promise;
  }

  private createWaiter(matches: (line: string) => boolean): Waiter {
    let resolveWaiter!: (line: string) => void;
    let rejectWaiter!: (error: Error) => void;
    const promise = new Promise<string>((resolve, reject) => {
      resolveWaiter = resolve;
      rejectWaiter = reject;
    });
    void promise.catch(() => undefined);
    const waiter: Waiter = {
      promise,
      matches,
      resolve: resolveWaiter,
      reject: rejectWaiter,
      timer: setTimeout(() => {
        this.removeWaiter(waiter);
        waiter.reject(new Error('Stockfish did not respond before the worker timeout'));
      }, this.options.responseTimeoutMs ?? DEFAULT_RESPONSE_TIMEOUT_MS),
    };
    this.waiters.add(waiter);
    return waiter;
  }

  private receiveLine(line: string): void {
    for (const waiter of this.waiters) {
      if (!waiter.matches(line)) continue;
      this.removeWaiter(waiter);
      waiter.resolve(line);
    }
  }

  private removeWaiter(waiter: Waiter): void {
    clearTimeout(waiter.timer);
    this.waiters.delete(waiter);
  }

  private rejectWaiters(error: Error): void {
    for (const waiter of this.waiters) {
      this.removeWaiter(waiter);
      waiter.reject(error);
    }
  }

  private failWorker(child: StockfishProcess, error: Error): void {
    if (this.child !== child) return;
    this.child = undefined;
    this.startup = undefined;
    this.lines?.close();
    this.lines = undefined;
    this.rejectWaiters(error);
    try {
      child.kill();
    } catch {
      // The worker may already have exited.
    }
  }
}

function validateEngineLevel(level: number): void {
  if (!Number.isInteger(level) || level < ENGINE_LEVEL_MIN || level > ENGINE_LEVEL_MAX) {
    throw new Error('Engine level must be between 0 and 20');
  }
}

function validatePosition(fen: string): void {
  if (!fen.trim()) throw new Error('A FEN position is required');
  let game: ChessGame;
  try {
    game = new ChessGame(fen);
  } catch (error) {
    throw new Error('Invalid FEN position', { cause: error });
  }
  if (game.isGameOver()) throw new Error('Stockfish cannot move from a finished position');
}

function readIntegerEnv(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const rawValue = env[name];
  if (rawValue === undefined || rawValue === '') return fallback;
  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

function parseUciMove(line: string): Move {
  const match = /^bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?(?:\s|$)/.exec(line);
  if (!match) throw new Error(`Stockfish returned an invalid move: ${line}`);
  return {
    from: match[1] as Move['from'],
    to: match[2] as Move['to'],
    ...(match[3] ? { promotion: match[3] as NonNullable<Move['promotion']> } : {}),
  };
}

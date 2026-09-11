import type { GameSummary } from '@chess3d/shared';

export const EXPIRED_GAME_CLEANUP_INTERVAL_MS = 60_000;

export interface ExpiredGameCleanup {
  getExpiredWaitingGames(): GameSummary[];
  removeExpiredGame(code: string): boolean;
  flushPersistence(): Promise<void>;
}

type TimerHandle = ReturnType<typeof setInterval>;

export interface ExpiredGamesWorkerOptions {
  intervalMs?: number;
  schedule?: (callback: () => void, intervalMs: number) => TimerHandle;
  cancel?: (timer: TimerHandle) => void;
  onError?: (error: unknown) => void;
}

export class ExpiredGamesWorker {
  private readonly intervalMs: number;
  private readonly schedule: NonNullable<ExpiredGamesWorkerOptions['schedule']>;
  private readonly cancel: NonNullable<ExpiredGamesWorkerOptions['cancel']>;
  private readonly onError: NonNullable<ExpiredGamesWorkerOptions['onError']>;
  private timer: TimerHandle | undefined;
  private cleanupInProgress = false;

  constructor(
    private readonly gameCleanup: ExpiredGameCleanup,
    options: ExpiredGamesWorkerOptions = {},
  ) {
    this.intervalMs = options.intervalMs ?? EXPIRED_GAME_CLEANUP_INTERVAL_MS;
    this.schedule =
      options.schedule ?? ((callback, intervalMs) => setInterval(callback, intervalMs));
    this.cancel = options.cancel ?? ((timer) => clearInterval(timer));
    this.onError = options.onError ?? (() => undefined);
  }

  start(): void {
    if (this.timer !== undefined) return;

    this.timer = this.schedule(() => {
      void this.runOnce().catch((error: unknown) => this.onError(error));
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer === undefined) return;

    this.cancel(this.timer);
    this.timer = undefined;
  }

  async runOnce(): Promise<number> {
    if (this.cleanupInProgress) return 0;

    this.cleanupInProgress = true;
    try {
      const expiredGames = this.gameCleanup.getExpiredWaitingGames();
      let removedGames = 0;
      for (const game of expiredGames) {
        if (this.gameCleanup.removeExpiredGame(game.code)) removedGames += 1;
      }

      if (removedGames > 0) await this.gameCleanup.flushPersistence();
      return removedGames;
    } finally {
      this.cleanupInProgress = false;
    }
  }
}

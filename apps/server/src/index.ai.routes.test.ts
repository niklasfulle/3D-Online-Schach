import { afterEach, describe, expect, it, vi } from 'vitest';

import { GameManager } from './game/GameManager.js';
import type { AuthProvider } from './auth/AuthService.js';
import { buildApp } from './index.js';

describe('Stockfish game route', () => {
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('requires authentication and creates unranked games for every valid level', async () => {
    app = buildApp(new GameManager());
    expect((await app.inject({ method: 'POST', url: '/games/ai', payload: { engineLevel: 0 } })).statusCode).toBe(401);
    await app.close();

    const authProvider = {
      authenticate: vi.fn(async () => ({ id: 'player-1', username: 'alice', rating: 1200 })),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    } as unknown as AuthProvider;
    app = buildApp(new GameManager(), { authProvider });

    for (let engineLevel = 0; engineLevel <= 20; engineLevel += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/games/ai',
        payload: { engineLevel },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        mode: 'casual',
        opponentType: 'stockfish',
        engineLevel,
        status: 'active',
      });
    }
  });

  it('rejects non-integer or out-of-range engine levels', async () => {
    const authProvider = {
      authenticate: vi.fn(async () => ({ id: 'player-1', username: 'alice', rating: 1200 })),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    } as unknown as AuthProvider;
    app = buildApp(new GameManager(), { authProvider });

    for (const engineLevel of [-1, 1.5, 21]) {
      const response = await app.inject({ method: 'POST', url: '/games/ai', payload: { engineLevel } });
      expect(response.statusCode).toBe(400);
    }
  });
});

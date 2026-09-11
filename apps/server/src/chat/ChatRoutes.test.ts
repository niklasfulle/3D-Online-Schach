import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../index.js';
import { GameManager } from '../game/GameManager.js';
import type { AuthProvider } from '../auth/AuthService.js';
import type { ChatProvider } from './ChatService.js';

const user = { id: 'user-1', username: 'alice', rating: 1200 };
const opponent = { id: 'user-2', username: 'bob', rating: 1200 };

describe('game chat API', () => {
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('loads and sends messages only for game participants', async () => {
    const manager = new GameManager();
    const authProvider = createAuthProvider(user);
    const chatProvider: ChatProvider & {
      list: ReturnType<typeof vi.fn>;
      send: ReturnType<typeof vi.fn>;
    } = {
      list: vi.fn(async () => []),
      send: vi.fn(async (_gameId, senderId, message) => ({
        id: 'message-1',
        senderId,
        senderUsername: 'alice',
        message,
        createdAt: '2026-09-11T12:00:00.000Z',
      })),
    };
    app = buildApp(manager, authProvider, undefined, undefined, chatProvider);
    const game = manager.createGame(user.id);
    manager.joinGame(game.code, opponent.id);

    expect((await app.inject({ method: 'GET', url: `/games/${game.code}/chat` })).statusCode).toBe(
      200,
    );
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/games/${game.code}/chat`,
          payload: { message: 'Hallo' },
        })
      ).statusCode,
    ).toBe(201);
    expect(chatProvider.send).toHaveBeenCalledWith(game.id, user.id, 'Hallo');

    authProvider.authenticate = vi.fn(async () => undefined);
    expect((await app.inject({ method: 'GET', url: `/games/${game.code}/chat` })).statusCode).toBe(
      401,
    );
  });
});

function createAuthProvider(authenticatedUser: typeof user | undefined): AuthProvider {
  return {
    register: vi.fn(),
    login: vi.fn(),
    authenticate: vi.fn(async () => authenticatedUser),
    logout: vi.fn(),
  };
}

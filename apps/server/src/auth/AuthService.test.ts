import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../index.js';
import { GameManager } from '../game/GameManager.js';
import { hashPassword, type AuthProvider, type AuthResult, verifyPassword } from './AuthService.js';

describe('authentication', () => {
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('hashes passwords and rejects wrong credentials', async () => {
    const hash = await hashPassword('correct horse battery staple');

    expect(hash).not.toContain('correct horse battery staple');
    await expect(verifyPassword('correct horse battery staple', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong password', hash)).resolves.toBe(false);
  });

  it('sets an HttpOnly session cookie after login', async () => {
    const user = { id: 'user-1', username: 'alice', rating: 1200 };
    const result: AuthResult = { user, sessionToken: 'session-token' };
    const authProvider: AuthProvider = {
      register: vi.fn(async () => result),
      login: vi.fn(async () => result),
      authenticate: vi.fn(async () => user),
      logout: vi.fn(async () => undefined),
    };
    app = buildApp(new GameManager(), authProvider);

    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'alice', password: 'password123' },
    });

    expect(login.statusCode).toBe(200);
    expect(login.headers['set-cookie']).toContain('chess3d_session=session-token');
    expect(login.headers['set-cookie']).toContain('HttpOnly');
    expect(login.json()).toEqual({ user });
  });
});

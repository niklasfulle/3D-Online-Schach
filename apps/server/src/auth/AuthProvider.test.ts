import { describe, expect, it, vi } from 'vitest';

import {
  AuthError,
  PrismaAuthProvider,
  hashPassword,
  hashToken,
  verifyPassword,
} from './AuthService.js';

const now = new Date('2026-09-11T12:00:00.000Z');

function createClient(): any {
  return {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
  };
}

const user = {
  id: 'user-1',
  username: 'alice',
  email: 'alice@example.test',
  rating: 1200,
  role: 'user' as const,
};

describe('PrismaAuthProvider', () => {
  it('registers a normalized user and creates a session', async () => {
    const client = createClient();
    client.user.findFirst = vi.fn(async () => null);
    client.user.create = vi.fn(async () => user);
    client.session.create = vi.fn(async () => undefined);

    const result = await new PrismaAuthProvider(client, () => now).register({
      username: ' Alice ',
      email: ' ALICE@EXAMPLE.TEST ',
      password: 'password123',
    });

    expect(result.user).toEqual(user);
    expect(result.sessionToken).toHaveLength(64);
    expect(client.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ username: 'alice', email: 'alice@example.test' }),
      }),
    );
    expect(client.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: user.id, createdAt: now }),
      }),
    );
  });

  it('rejects invalid and duplicate registrations', async () => {
    const client = createClient();
    const provider = new PrismaAuthProvider(client, () => now);

    await expect(provider.register({ username: 'a', password: 'short' })).rejects.toMatchObject({
      statusCode: 400,
    });
    client.user.findFirst = vi.fn(async () => user);
    await expect(
      provider.register({ username: 'alice', password: 'password123' }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('logs in, updates presence, and rejects invalid credentials', async () => {
    const client = createClient();
    const passwordHash = await hashPassword('password123');
    client.user.findUnique = vi.fn(async () => ({ ...user, passwordHash }));
    client.user.update = vi.fn(async () => undefined);
    client.session.create = vi.fn(async () => undefined);
    const provider = new PrismaAuthProvider(client, () => now);

    const result = await provider.login({ username: ' ALICE ', password: 'password123' });
    expect(result.user).toEqual(user);
    expect(client.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { lastOnline: now },
    });

    await expect(provider.login({ username: '', password: '' })).rejects.toMatchObject({
      statusCode: 401,
    });
    client.user.findUnique = vi.fn(async () => null);
    await expect(
      provider.login({ username: 'nobody', password: 'password123' }),
    ).rejects.toBeInstanceOf(AuthError);
  });

  it('maps persisted roles into the auth session user', async () => {
    const client = createClient();
    client.user.findUnique = vi.fn(async () => ({
      ...user,
      role: 'ADMIN',
      passwordHash: await hashPassword('password123'),
    }));
    client.user.update = vi.fn(async () => undefined);
    client.session.create = vi.fn(async () => undefined);

    const result = await new PrismaAuthProvider(client, () => now).login({
      username: 'alice',
      password: 'password123',
    });

    expect(result.user.role).toBe('admin');
  });

  it('authenticates active sessions, removes expired sessions, and logs out', async () => {
    const client = createClient();
    const provider = new PrismaAuthProvider(client, () => now);
    expect(await provider.authenticate(undefined)).toBeUndefined();

    client.session.findUnique = vi.fn(async () => null);
    expect(await provider.authenticate('missing')).toBeUndefined();

    client.session.findUnique = vi.fn(async () => ({
      id: 'session-1',
      expiresAt: new Date('2026-09-10T12:00:00.000Z'),
      user,
    }));
    await expect(provider.authenticate('expired')).resolves.toBeUndefined();
    expect(client.session.delete).toHaveBeenCalledWith({ where: { id: 'session-1' } });

    client.session.findUnique = vi.fn(async () => ({
      id: 'session-2',
      expiresAt: new Date('2026-09-12T12:00:00.000Z'),
      user,
    }));
    client.session.update = vi.fn(async () => undefined);
    client.user.update = vi.fn(async () => undefined);
    await expect(provider.authenticate('active')).resolves.toEqual(user);
    expect(client.session.update).toHaveBeenCalledWith({
      where: { id: 'session-2' },
      data: { lastSeenAt: now },
    });
    await provider.logout(undefined);
    await provider.logout('active');
    expect(client.session.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash: hashToken('active') },
    });
  });
});

describe('password helpers', () => {
  it('rejects malformed hashes', async () => {
    await expect(verifyPassword('password123', 'invalid')).resolves.toBe(false);
  });
});

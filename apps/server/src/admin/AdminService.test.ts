import { describe, expect, it, vi } from 'vitest';

import { PrismaAdminProvider } from './AdminService.js';

const lastOnline = new Date('2026-09-11T12:00:00.000Z');

function createClient(): any {
  return { user: { findMany: vi.fn(), update: vi.fn() } };
}

describe('PrismaAdminProvider', () => {
  it('lists users with normalized roles and timestamps', async () => {
    const client = createClient();
    client.user.findMany = vi.fn(async () => [
      {
        id: 'user-1',
        username: 'alice',
        email: 'alice@example.test',
        rating: 1200,
        role: 'ADMIN',
        lastOnline,
      },
      {
        id: 'user-2',
        username: 'bob',
        email: null,
        rating: 1100,
        role: 'SPECTATOR',
        lastOnline: null,
      },
    ]);

    await expect(new PrismaAdminProvider(client).listUsers()).resolves.toEqual([
      {
        id: 'user-1',
        username: 'alice',
        email: 'alice@example.test',
        rating: 1200,
        role: 'admin',
        lastOnline: lastOnline.toISOString(),
      },
      {
        id: 'user-2',
        username: 'bob',
        email: undefined,
        rating: 1100,
        role: 'spectator',
        lastOnline: undefined,
      },
    ]);
    expect(client.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { username: 'asc' } }),
    );
  });

  it('updates a user role and returns the updated user', async () => {
    const client = createClient();
    client.user.update = vi.fn(async () => ({
      id: 'user-1',
      username: 'alice',
      email: null,
      rating: 1200,
      role: 'SPECTATOR',
      lastOnline: null,
    }));

    await expect(
      new PrismaAdminProvider(client).updateRole('user-1', 'spectator'),
    ).resolves.toEqual(expect.objectContaining({ id: 'user-1', role: 'spectator' }));
    expect(client.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' }, data: { role: 'SPECTATOR' } }),
    );
  });

  it('returns undefined when the user no longer exists', async () => {
    const client = createClient();
    client.user.update = vi.fn(async () => {
      throw { code: 'P2025' };
    });

    await expect(
      new PrismaAdminProvider(client).updateRole('missing', 'user'),
    ).resolves.toBeUndefined();
  });
});

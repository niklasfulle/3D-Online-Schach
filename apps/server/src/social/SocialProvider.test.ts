import { describe, expect, it, vi } from 'vitest';

import { PrismaSocialProvider, SocialError } from './SocialService.js';

const now = new Date('2026-09-11T12:00:00.000Z');
const alice = { id: 'user-1', username: 'alice', rating: 1200, lastOnline: now };
const bob = {
  id: 'user-2',
  username: 'bob',
  rating: 1300,
  lastOnline: new Date(now.getTime() - 1_000),
};

function createClient(): any {
  return {
    user: { findMany: vi.fn(), findUnique: vi.fn() },
    friendRequest: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

function request(status = 'pending') {
  return {
    id: 'request-1',
    status,
    createdAt: now,
    sender: alice,
    receiver: bob,
    senderId: alice.id,
    receiverId: bob.id,
  };
}

describe('PrismaSocialProvider', () => {
  it('searches normalized users and handles short queries', async () => {
    const client = createClient();
    client.user.findMany = vi.fn(async () => [bob]);
    const provider = new PrismaSocialProvider(client, () => now);

    await expect(provider.searchUsers(alice.id, ' bo ')).resolves.toEqual([
      { id: bob.id, username: bob.username, rating: bob.rating, online: true },
    ]);
    expect(client.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { not: alice.id } }) }),
    );
    await expect(provider.searchUsers(alice.id, 'b')).resolves.toEqual([]);
  });

  it('builds friends, incoming requests, and outgoing requests', async () => {
    const client = createClient();
    client.friendRequest.findMany = vi.fn(async () => [request('accepted'), request('pending')]);
    const provider = new PrismaSocialProvider(client, () => now);

    await expect(provider.getFriendsOverview(alice.id)).resolves.toEqual({
      friends: [{ id: bob.id, username: bob.username, rating: bob.rating, online: true }],
      incomingRequests: [],
      outgoingRequests: [expect.objectContaining({ status: 'pending' })],
    });
  });

  it('creates a request and reopens a rejected request', async () => {
    const client = createClient();
    client.user.findUnique = vi.fn(async () => bob);
    client.friendRequest.findFirst = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(request('rejected'));
    client.friendRequest.create = vi.fn(async () => request());
    client.friendRequest.update = vi.fn(async () => request());
    const provider = new PrismaSocialProvider(client, () => now);

    await expect(provider.sendRequest(alice.id, ' BOB ')).resolves.toMatchObject({
      id: 'request-1',
      status: 'pending',
    });
    await provider.sendRequest(alice.id, 'bob');
    expect(client.friendRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'request-1' } }),
    );
  });

  it('rejects invalid friend request actions', async () => {
    const client = createClient();
    const provider = new PrismaSocialProvider(client, () => now);
    client.user.findUnique = vi.fn(async () => null);
    await expect(provider.sendRequest(alice.id, 'nobody')).rejects.toMatchObject({
      statusCode: 404,
    });
    client.user.findUnique = vi.fn(async () => alice);
    await expect(provider.sendRequest(alice.id, 'alice')).rejects.toMatchObject({
      statusCode: 400,
    });

    client.user.findUnique = vi.fn(async () => bob);
    client.friendRequest.findFirst = vi.fn(async () => request('accepted'));
    await expect(provider.sendRequest(alice.id, 'bob')).rejects.toMatchObject({ statusCode: 409 });
    client.friendRequest.findFirst = vi.fn(async () => ({
      ...request(),
      senderId: bob.id,
      receiverId: alice.id,
    }));
    await expect(provider.sendRequest(alice.id, 'bob')).rejects.toMatchObject({ statusCode: 409 });

    client.friendRequest.findUnique = vi.fn(async () => null);
    await expect(provider.respondToRequest(alice.id, 'missing', 'accept')).rejects.toMatchObject({
      statusCode: 404,
    });
    client.friendRequest.findUnique = vi.fn(async () => request());
    await expect(provider.respondToRequest(bob.id, 'request-1', 'cancel')).rejects.toMatchObject({
      statusCode: 403,
    });
    await expect(provider.respondToRequest(alice.id, 'request-1', 'accept')).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('accepts, rejects, and cancels pending requests', async () => {
    const client = createClient();
    client.friendRequest.findUnique = vi.fn(async () => request());
    client.friendRequest.update = vi.fn(async ({ data }: { data: { status: string } }) =>
      request(data.status),
    );
    const provider = new PrismaSocialProvider(client, () => now);

    await expect(provider.respondToRequest(bob.id, 'request-1', 'accept')).resolves.toMatchObject({
      status: 'accepted',
    });
    await expect(provider.respondToRequest(bob.id, 'request-1', 'reject')).resolves.toMatchObject({
      status: 'rejected',
    });
    await expect(provider.respondToRequest(alice.id, 'request-1', 'cancel')).resolves.toMatchObject(
      {
        status: 'cancelled',
      },
    );
  });

  it('maps unknown request statuses to pending and marks stale users offline', async () => {
    const client = createClient();
    const stale = { ...bob, lastOnline: new Date(now.getTime() - 90_001) };
    client.user.findMany = vi.fn(async () => [stale]);
    client.friendRequest.findMany = vi.fn(async () => [{ ...request('unknown'), receiver: stale }]);
    const provider = new PrismaSocialProvider(client, () => now);

    await expect(provider.searchUsers(alice.id, 'bo')).resolves.toEqual([
      { id: bob.id, username: bob.username, rating: bob.rating, online: false },
    ]);
    await expect(provider.getFriendsOverview(alice.id)).resolves.toMatchObject({
      outgoingRequests: [expect.objectContaining({ status: 'pending' })],
    });
    expect(new SocialError('test').statusCode).toBe(400);
  });
});

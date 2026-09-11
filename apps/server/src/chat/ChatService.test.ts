import { describe, expect, it, vi } from 'vitest';

import { ChatError, PrismaChatProvider } from './ChatService.js';

const now = new Date('2026-09-11T12:00:00.000Z');

function createClient(): any {
  return {
    chatMessage: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  };
}

describe('PrismaChatProvider', () => {
  it('lists messages in chronological order with sender details', async () => {
    const client = createClient();
    client.chatMessage.findMany = vi.fn(async () => [
      {
        id: 'message-1',
        gameId: 'game-1',
        senderId: 'user-1',
        message: 'Viel Erfolg!',
        createdAt: now,
        sender: { username: 'alice' },
      },
    ]);
    const provider = new PrismaChatProvider(client, () => now);

    await expect(provider.list('game-1')).resolves.toEqual([
      {
        id: 'message-1',
        senderId: 'user-1',
        senderUsername: 'alice',
        message: 'Viel Erfolg!',
        createdAt: now.toISOString(),
      },
    ]);
    expect(client.chatMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { gameId: 'game-1' }, orderBy: { createdAt: 'asc' } }),
    );
  });

  it('trims messages and rejects blank or oversized content', async () => {
    const client = createClient();
    client.chatMessage.create = vi.fn(async ({ data }: { data: any }) => ({
      id: 'message-2',
      ...data,
      createdAt: now,
      sender: { username: 'alice' },
    }));
    const provider = new PrismaChatProvider(client, () => now);

    await expect(provider.send('game-1', 'user-1', ' Hallo! ')).resolves.toMatchObject({
      message: 'Hallo!',
    });
    await expect(provider.send('game-1', 'user-1', '   ')).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(provider.send('game-1', 'user-1', 'x'.repeat(501))).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(new ChatError('test').statusCode).toBe(400);
  });
});

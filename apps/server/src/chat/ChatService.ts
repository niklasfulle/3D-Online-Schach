import type { PrismaClient } from '@prisma/client';

export interface ChatMessageView {
  id: string;
  senderId: string;
  senderUsername: string;
  message: string;
  createdAt: string;
}

export interface ChatProvider {
  list(gameId: string): Promise<ChatMessageView[]>;
  send(gameId: string, senderId: string, message: string): Promise<ChatMessageView>;
}

export class ChatError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
  }
}

export class PrismaChatProvider implements ChatProvider {
  constructor(
    private readonly client: PrismaClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(gameId: string): Promise<ChatMessageView[]> {
    const messages = await this.client.chatMessage.findMany({
      where: { gameId },
      include: { sender: true },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    return messages.map((message) => this.toView(message));
  }

  async send(gameId: string, senderId: string, message: string): Promise<ChatMessageView> {
    const normalizedMessage = message.trim();
    if (!normalizedMessage) throw new ChatError('Message is required');
    if (normalizedMessage.length > 500) throw new ChatError('Message is too long');

    const created = await this.client.chatMessage.create({
      data: { gameId, senderId, message: normalizedMessage },
      include: { sender: true },
    });
    return this.toView(created);
  }

  private toView(message: {
    id: string;
    senderId: string;
    message: string;
    createdAt: Date;
    sender: { username: string };
  }): ChatMessageView {
    return {
      id: message.id,
      senderId: message.senderId,
      senderUsername: message.sender.username,
      message: message.message,
      createdAt: message.createdAt.toISOString(),
    };
  }
}

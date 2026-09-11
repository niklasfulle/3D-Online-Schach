import type { PrismaClient } from '@prisma/client';

const ONLINE_WINDOW_MS = 90_000;

export interface SocialUser {
  id: string;
  username: string;
  rating: number;
  online: boolean;
}

export interface FriendRequestView {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: string;
  sender: SocialUser;
  receiver: SocialUser;
}

export interface FriendsOverview {
  friends: SocialUser[];
  incomingRequests: FriendRequestView[];
  outgoingRequests: FriendRequestView[];
}

export interface SocialProvider {
  searchUsers(userId: string, query: string): Promise<SocialUser[]>;
  getFriendsOverview(userId: string): Promise<FriendsOverview>;
  sendRequest(userId: string, username: string): Promise<FriendRequestView>;
  respondToRequest(
    userId: string,
    requestId: string,
    action: 'accept' | 'reject' | 'cancel',
  ): Promise<FriendRequestView>;
}

export class SocialError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
  }
}

export class PrismaSocialProvider implements SocialProvider {
  constructor(
    private readonly client: PrismaClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async searchUsers(userId: string, query: string): Promise<SocialUser[]> {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length < 2) return [];
    const users = await this.client.user.findMany({
      where: {
        id: { not: userId },
        username: { contains: normalizedQuery, mode: 'insensitive' },
      },
      orderBy: { username: 'asc' },
      take: 20,
    });
    return users.map((user) => this.toUser(user));
  }

  async getFriendsOverview(userId: string): Promise<FriendsOverview> {
    const requests = await this.client.friendRequest.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: { receiver: true, sender: true },
      orderBy: { createdAt: 'desc' },
    });
    const views = requests.map((request) => this.toRequest(request));

    return {
      friends: views
        .filter((request) => request.status === 'accepted')
        .map((request) => (request.sender.id === userId ? request.receiver : request.sender)),
      incomingRequests: views.filter(
        (request) => request.receiver.id === userId && request.status === 'pending',
      ),
      outgoingRequests: views.filter(
        (request) => request.sender.id === userId && request.status === 'pending',
      ),
    };
  }

  async sendRequest(userId: string, username: string): Promise<FriendRequestView> {
    const normalizedUsername = username.trim().toLowerCase();
    const receiver = await this.client.user.findUnique({ where: { username: normalizedUsername } });
    if (!receiver) throw new SocialError('User not found', 404);
    if (receiver.id === userId) throw new SocialError('You cannot add yourself');

    const existing = await this.client.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: receiver.id },
          { senderId: receiver.id, receiverId: userId },
        ],
      },
      include: { receiver: true, sender: true },
    });
    if (existing?.status === 'accepted') throw new SocialError('Users are already friends', 409);
    if (existing?.status === 'pending') {
      throw new SocialError(
        existing.senderId === userId
          ? 'Friend request is already pending'
          : 'This user already sent you a friend request',
        409,
      );
    }

    const request = existing
      ? await this.client.friendRequest.update({
          where: { id: existing.id },
          data: {
            senderId: userId,
            receiverId: receiver.id,
            status: 'pending',
            respondedAt: null,
            createdAt: this.now(),
          },
          include: { receiver: true, sender: true },
        })
      : await this.client.friendRequest.create({
          data: { senderId: userId, receiverId: receiver.id },
          include: { receiver: true, sender: true },
        });
    return this.toRequest(request);
  }

  async respondToRequest(
    userId: string,
    requestId: string,
    action: 'accept' | 'reject' | 'cancel',
  ): Promise<FriendRequestView> {
    const request = await this.client.friendRequest.findUnique({
      where: { id: requestId },
      include: { receiver: true, sender: true },
    });
    if (!request || request.status !== 'pending')
      throw new SocialError('Friend request not found', 404);
    if (action === 'cancel' && request.senderId !== userId) {
      throw new SocialError('Only the sender can cancel this request', 403);
    }
    if (action !== 'cancel' && request.receiverId !== userId) {
      throw new SocialError('Only the receiver can respond to this request', 403);
    }

    const updated = await this.client.friendRequest.update({
      where: { id: request.id },
      data: {
        status: requestStatusForAction(action),
        respondedAt: this.now(),
      },
      include: { receiver: true, sender: true },
    });
    return this.toRequest(updated);
  }

  private toUser(user: { id: string; username: string; rating: number; lastOnline: Date | null }) {
    return {
      id: user.id,
      username: user.username,
      rating: user.rating,
      online:
        user.lastOnline !== null &&
        this.now().getTime() - user.lastOnline.getTime() <= ONLINE_WINDOW_MS,
    } satisfies SocialUser;
  }

  private toRequest(request: {
    id: string;
    status: string;
    createdAt: Date;
    sender: { id: string; username: string; rating: number; lastOnline: Date | null };
    receiver: { id: string; username: string; rating: number; lastOnline: Date | null };
  }): FriendRequestView {
    const status = toRequestStatus(request.status);
    return {
      id: request.id,
      status,
      createdAt: request.createdAt.toISOString(),
      sender: this.toUser(request.sender),
      receiver: this.toUser(request.receiver),
    };
  }
}

function requestStatusForAction(action: 'accept' | 'reject' | 'cancel'): string {
  if (action === 'accept') return 'accepted';
  if (action === 'reject') return 'rejected';
  return 'cancelled';
}

function toRequestStatus(status: string): FriendRequestView['status'] {
  if (status === 'accepted' || status === 'rejected' || status === 'cancelled') return status;
  return 'pending';
}

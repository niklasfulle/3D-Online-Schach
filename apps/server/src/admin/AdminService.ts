import { UserRole as PrismaUserRole, type PrismaClient } from '@prisma/client';

import type { UserRole } from '@chess3d/shared';

export interface AdminUserView {
  id: string;
  username: string;
  email?: string;
  rating: number;
  role: UserRole;
  lastOnline?: string;
}

export interface AdminProvider {
  listUsers(): Promise<AdminUserView[]>;
  updateRole(userId: string, role: UserRole): Promise<AdminUserView | undefined>;
}

export class AdminError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 503,
  ) {
    super(message);
  }
}

export class PrismaAdminProvider implements AdminProvider {
  constructor(private readonly client: PrismaClient) {}

  async listUsers(): Promise<AdminUserView[]> {
    const users = await this.client.user.findMany({
      orderBy: { username: 'asc' },
      select: {
        id: true,
        username: true,
        email: true,
        rating: true,
        role: true,
        lastOnline: true,
      },
    });
    return users.map(toAdminUserView);
  }

  async updateRole(userId: string, role: UserRole): Promise<AdminUserView | undefined> {
    try {
      const user = await this.client.user.update({
        where: { id: userId },
        data: { role: toPrismaRole(role) },
        select: {
          id: true,
          username: true,
          email: true,
          rating: true,
          role: true,
          lastOnline: true,
        },
      });
      return toAdminUserView(user);
    } catch (error) {
      if (isPrismaNotFound(error)) return undefined;
      throw error;
    }
  }
}

function toAdminUserView(user: {
  id: string;
  username: string;
  email: string | null;
  rating: number;
  role: PrismaUserRole | string;
  lastOnline: Date | null;
}): AdminUserView {
  return {
    id: user.id,
    username: user.username,
    email: user.email ?? undefined,
    rating: user.rating,
    role: toUserRole(user.role),
    lastOnline: user.lastOnline?.toISOString(),
  };
}

function toUserRole(role: PrismaUserRole | string): UserRole {
  if (String(role).toLowerCase() === 'admin') return 'admin';
  if (String(role).toLowerCase() === 'spectator') return 'spectator';
  return 'user';
}

function toPrismaRole(role: UserRole): PrismaUserRole {
  if (role === 'admin') return PrismaUserRole.ADMIN;
  if (role === 'spectator') return PrismaUserRole.SPECTATOR;
  return PrismaUserRole.USER;
}

function isPrismaNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025';
}
